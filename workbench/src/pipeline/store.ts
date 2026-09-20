import { create } from "zustand";
import type { PipelineState } from "./types";
import { useStore } from "../store";
import { LIVE_CLIP_ID } from "../kb/liveProject";
import { useLiveLoad } from "../kb/liveLoad";
import { syncedIfChanged } from "../kouboImport";
import { getLatest, setLatest, singleton } from "../hmr";

/** 实时看板状态：与工程 store 分离（不进撤销栈、不进 localStorage）。
 *  进度轨 / 阶段栏 / 镜头面板只订阅这里的一小片，播放中不重渲染（PlayheadLine 同款纪律）。
 *  单例（hmr.ts，2026-09-21 评审 P0-2）：本模块随接入源码 HMR 重执行、且不是边界（dispose 从不被调用），
 *  store / SSE 连接 / 防抖定时器 / 订阅都挂 globalThis 复用；SSE 回调经 latest 槽取最新模块实例，拿到的才是新鲜的 SHOTS / SFX_CUES / phrases。 */
interface PipelineStore {
  linked: boolean;
  state: PipelineState | null;
  connected: boolean;
  selectedShotId: string | null;
  /** 右下角提示：Vite 报的工程代码错误（语法错 / 引用缺失，HMR 成功后清空），或接入层的说明（如拆解契约不全，带自定义 title） */
  codeError: { message: string; file?: string; title?: string } | null;
  selectShot: (id: string | null) => void;
  setState: (s: PipelineState | null, linked: boolean) => void;
  setConnected: (b: boolean) => void;
  setCodeError: (e: { message: string; file?: string; title?: string } | null) => void;
}

export const usePipeline = singleton("pipeline", () => create<PipelineStore>((set) => ({
  linked: false,
  state: null,
  connected: false,
  selectedShotId: null,
  codeError: null,
  selectShot: (id) => set({ selectedShotId: id }),
  setState: (state, linked) => set({ state, linked }),
  setConnected: (connected) => set({ connected }),
  setCodeError: (codeError) => set({ codeError }),
})));

// 订阅只装一次（三个 store 都是单例，回调只碰 store，不需要走 latest）
singleton("pipeline:subs", () => {
  // （旧存档兼容）kb-main 成片卡载入失败（语法错 / 缺导出）→ 同一条右下角提示；载入成功 → 清掉。
  // 带 title 的接入说明（拆解契约不全）优先级更高，不被它盖掉——缺契约文件时 Main 往往也 import 不到那个文件，两条错其实是同一件事。
  useLiveLoad.subscribe((s, prev) => {
    const cur = usePipeline.getState().codeError;
    if (s.error && s.error !== prev.error) {
      if (!cur?.title) usePipeline.getState().setCodeError(s.error);
    } else if (!s.error && prev.error && !cur?.title) usePipeline.getState().setCodeError(null);
  });
  // 选中片段时取消镜头选中（属性面板二者只显示其一）
  useStore.subscribe((s, prev) => {
    if (s.selectedClipId && s.selectedClipId !== prev.selectedClipId) usePipeline.getState().selectShot(null);
  });
  return true;
});

/** 上次载入失败的实时成片卡：重建 lazy 再试（还坏就再次报错、提示回来） */
const retryLiveIfFailed = () => {
  const ll = useLiveLoad.getState();
  if (ll.error) ll.retry();
};

/** （旧存档兼容）单轨"成片（实时）"工程 2026-09-21 已下线，但浏览器里可能还存着一份：shots.json 变了（总时长变）→ 那个 clip 的时长跟着变 */
const syncLiveClip = (state: PipelineState) => {
  if (!state.totalFrames) return;
  const s = useStore.getState();
  for (const t of s.project.tracks) {
    const c = t.clips.find((x) => x.id === LIVE_CLIP_ID);
    if (c && c.duration !== state.totalFrames && c.start === 0 && c.inOffset === 0 && c.speed === 1) {
      s.updateClip(c.id, { duration: state.totalFrames });
    }
  }
};

/** 单例连接对象：EventSource 只建一条；防抖定时器也放这里（模块重执行不丢、不重复） */
const conn = singleton<{ es: EventSource | null; syncTimer: ReturnType<typeof setTimeout> | null }>("pipeline:conn", () => ({ es: null, syncTimer: null }));

/** 多轨自动跟盘（2026-09-21 用户：制作中"一开始就是多轨，实时看到音效放到哪、镜头做到哪、字幕什么样"，不是单轨进度台）：
 *  工程文件一变（SSE 推来 shots / scenes / out 的变化，或接入源码 HMR 完成）→ 按稳定 id 把新鲜拆解合进当前多轨工程；
 *  用户改过的 props / 图层 / 删除 / 挪过的时间保留（syncKouboProject 语义），不进撤销栈。400ms 防抖：一次保存常同时触发两路事件。
 *  拆解契约不全时 syncedIfChanged 直接 null（评审 P0-1：否则会把用户多轨工程改写成 stub 残骸）；旧存档里的单轨工程与用户自己的工程不受影响。 */
const autoSyncTracks = () => {
  if (conn.syncTimer) clearTimeout(conn.syncTimer);
  conn.syncTimer = setTimeout(() => {
    conn.syncTimer = null;
    const s = useStore.getState();
    const sync = getLatest<typeof syncedIfChanged>("syncedIfChanged") ?? syncedIfChanged; // 最新模块实例 = 新鲜的 SHOTS / SFX_CUES / phrases
    const next = sync(s.project);
    if (next) s.replaceProject(next);
  }, 400);
};

/** SSE / 首次拉取的处理器。每次模块执行都覆盖注册到 latest 槽，单例连接触发时取最新那份 */
const apply = (raw: unknown) => {
  const j = raw as { linked?: boolean; state?: PipelineState | null };
  usePipeline.getState().setState(j.state ?? null, Boolean(j.linked));
  if (j.state) syncLiveClip(j.state);
  autoSyncTracks();
  // 工程文件变了（SSE 推来）：首次转换失败的模块 Vite 不向导入方传播 HMR，只能靠这里触发重试
  retryLiveIfFailed();
};
setLatest("pipeline:apply", apply);
const applyLatest = (raw: unknown) => (getLatest<typeof apply>("pipeline:apply") ?? apply)(raw);

/** App 挂载时调一次：拉一次全量 + SSE 订阅；断线自动重连（EventSource 自带）。连接是单例：重复调用 / 模块重执行都不会多开一条 */
export const connectPipeline = () => {
  if (conn.es) return;
  fetch("/api/pipeline").then((r) => (r.ok ? r.json() : null)).then((j) => j && applyLatest(j)).catch(() => {});
  const es = new EventSource("/api/pipeline/events");
  conn.es = es;
  es.onopen = () => usePipeline.getState().setConnected(true);
  es.onerror = () => usePipeline.getState().setConnected(false);
  es.onmessage = (ev) => {
    try {
      applyLatest(JSON.parse(ev.data));
    } catch {
      /* 心跳或坏包：忽略 */
    }
  };
};

// Vite 自定义事件：createHotContext 重建本模块的 hot 上下文时会清掉旧实例注册的监听，所以每次执行都重挂（不会重复）。
// 工程代码有错时 Vite 不再盖整页（server.hmr.overlay=false），这里接住事件在角落提示。
const hot = import.meta.hot;
if (hot) {
  hot.on("vite:error", (e: { err?: { message?: string; id?: string; loc?: { file?: string; line?: number } } }) => {
    if (usePipeline.getState().codeError?.title) return; // 带 title 的接入说明（拆解契约不全）不被转换错误盖掉——缺契约文件时 Main import 不到它，是同一件事
    const err = e?.err ?? {};
    const file = err.loc?.file ? `${err.loc.file}${err.loc.line ? `:${err.loc.line}` : ""}` : err.id;
    usePipeline.getState().setCodeError({ message: String(err.message ?? "工程代码错误").split("\n")[0].slice(0, 300), file });
  });
  hot.on("vite:afterUpdate", () => {
    if (!usePipeline.getState().codeError?.title) usePipeline.getState().setCodeError(null); // 契约说明要到重启 dev server 才会变，HMR 不清它
    retryLiveIfFailed();
    autoSyncTracks(); // 接入源码（scenes / sfx.ts / Subtitles）改完 → 本模块已随链重建、latest 槽里是新鲜数据
  });
}
