import { useStore } from "./store";
import { CARDS } from "./cards/registry";
import { defaultsOf } from "./cards/types";
import { KSHOT_PREFIX } from "./cards/koubo-skill";
import { isKouboProject } from "./kouboImport";
import { KB_SKILL } from "./kbMeta";
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
if (import.meta.hot) import.meta.hot.dispose(() => { unsub?.(); clearTimeout(timer); });
export const startOverridesSync = () => {
  if (!KB_SKILL || unsub) return;
  unsub = useStore.subscribe((s, prev) => {
    if (s.project === prev.project || !isKouboProject(s.project)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const json = JSON.stringify(collect(s.project));
      if (json === last) return;
      last = json;
      fetch("/api/pipeline/overrides", { method: "POST", headers: { "Content-Type": "application/json" }, body: json }).catch(() => {});
    }, 600);
  });
};
