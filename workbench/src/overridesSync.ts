import { useStore } from "./store";
import { create } from "zustand";
import { CARDS } from "./cards/registry";
import { defaultsOf } from "./cards/types";
import { KSHOT_PREFIX } from "./cards/koubo-skill";
import { isKouboProject } from "./kouboImport";
import { KB_PROJECT_ROOT, KB_SKILL } from "./kbMeta";
import type { ProjectData } from "./types";

/** 逐镜参数写回（skill 标准工程，L2 双向编辑的落地形态）：
 *  属性面板改了某个 kshot-* 片段的 props → 600ms 防抖 → 把全部镜头里"与 tsx 默认值不同"的键整表 POST 到 dev server，
 *  落成 <remotion>/overrides.json；成片渲染（render_shots / 工作台导出）读同一份。
 *  只记差值：agent 之后改 tsx 默认值，没被用户动过的键照常生效；用户改过的键以 overrides 为准（契约写在 SKILL.md ⑤）。
 *  非拆解工程（实时看板 / 演示工程）不写——否则切到别的工程会把文件清空。 */
const collect = (p: ProjectData): Record<string, Record<string, unknown>> => {
  const map: Record<string, Record<string, unknown>> = {};
  for (const t of p.tracks)
    for (const c of t.clips) {
      if (!c.cardId.startsWith(KSHOT_PREFIX)) continue;
      const card = CARDS[c.cardId];
      if (!card) continue;
      const def = defaultsOf(card);
      const shotId = c.cardId.slice(KSHOT_PREFIX.length);
      for (const [k, v] of Object.entries(c.props)) {
        if (!(k in def) || JSON.stringify(v) === JSON.stringify(def[k])) continue;
        (map[shotId] ??= {})[k] = v;
      }
    }
  return map;
};

let timer: ReturnType<typeof setTimeout> | undefined;
let last: string | null = null;
let unsub: (() => void) | null = null;
let pending: string | null = null;
let inFlight = false;
let stopped = false;
let controller: AbortController | null = null;
let retryDelay = 1000;
export const useOverridesSave = create<{ error: string | null }>(() => ({ error: null }));
const error = (message: string | null) => useOverridesSave.setState({ error: message });
const eligible = () => isKouboProject(useStore.getState().project);

/** 串行写入，成功后才记 last；失败保留最新值，带退避自动重试。 */
const flush = async () => {
  if (stopped || inFlight || pending === null || !eligible()) return;
  const json = pending;
  pending = null;
  if (json === last) { error(null); return; }
  inFlight = true;
  controller = new AbortController();
  const request = controller;
  const timeout = setTimeout(() => request.abort(), 10000);
  let failed = false;
  try {
    const response = await fetch("/api/pipeline/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Workbench-Project": encodeURIComponent(KB_PROJECT_ROOT) },
      body: json,
      signal: request.signal,
    });
    if (!response.ok) throw new Error(response.status === 409 ? "接入工程已切换，请刷新工作台" : "参数尚未保存，正在重试…");
    last = json;
    retryDelay = 1000;
    if (!stopped) error(null);
  } catch (e) {
    failed = true;
    last = null; // 响应丢失时服务端可能已写盘；下一次必须重新确认。
    if (!stopped && eligible()) {
      pending = JSON.stringify(collect(useStore.getState().project));
      error(e instanceof Error && e.message.includes("请刷新") ? e.message : "参数尚未保存，正在重试…");
    }
  } finally {
    clearTimeout(timeout);
    inFlight = false;
    controller = null;
    if (!stopped && eligible() && pending !== null) {
      clearTimeout(timer);
      timer = setTimeout(flush, failed ? retryDelay : 0);
      if (failed) retryDelay = Math.min(10000, retryDelay * 2);
    }
  }
};

const enqueue = () => {
  clearTimeout(timer);
  if (!eligible()) {
    pending = null;
    controller?.abort();
    error(null);
    return;
  }
  pending = JSON.stringify(collect(useStore.getState().project));
  timer = setTimeout(flush, 600);
};

if (import.meta.hot) import.meta.hot.dispose(() => {
  stopped = true;
  unsub?.();
  clearTimeout(timer);
  controller?.abort();
});
export const startOverridesSync = () => {
  if (!KB_SKILL || unsub) return;
  unsub = useStore.subscribe((s, prev) => {
    if (s.project !== prev.project) enqueue();
  });
  enqueue(); // 刷新 / HMR 后也补存未落盘的本地编辑。
};
