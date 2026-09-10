import { create } from "zustand";
import type { PipelineState } from "./types";
import { useStore } from "../store";
import { LIVE_CLIP_ID } from "../kb/liveProject";

/** 实时看板状态：与工程 store 分离（不进撤销栈、不进 localStorage）。
 *  进度轨 / 阶段栏 / 镜头面板只订阅这里的一小片，播放中不重渲染（PlayheadLine 同款纪律）。 */
interface PipelineStore {
  linked: boolean;
  state: PipelineState | null;
  connected: boolean;
  selectedShotId: string | null;
  /** Vite 报的工程代码错误（语法错 / 引用缺失），HMR 成功后清空 */
  codeError: { message: string; file?: string } | null;
  selectShot: (id: string | null) => void;
  setState: (s: PipelineState | null, linked: boolean) => void;
  setConnected: (b: boolean) => void;
  setCodeError: (e: { message: string; file?: string } | null) => void;
}

export const usePipeline = create<PipelineStore>((set) => ({
  linked: false,
  state: null,
  connected: false,
  selectedShotId: null,
  codeError: null,
  selectShot: (id) => set({ selectedShotId: id }),
  setState: (state, linked) => set({ state, linked }),
  setConnected: (connected) => set({ connected }),
  setCodeError: (codeError) => set({ codeError }),
}));

// 选中片段时取消镜头选中（属性面板二者只显示其一）
useStore.subscribe((s, prev) => {
  if (s.selectedClipId && s.selectedClipId !== prev.selectedClipId) usePipeline.getState().selectShot(null);
});

/** 增量同步：shots.json 变了（总时长变）→ 实时成片 clip 的时长跟着变，其余 clip 不动 */
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

let started = false;
/** App 挂载时调一次：拉一次全量 + SSE 订阅；断线自动重连（EventSource 自带） */
export const connectPipeline = () => {
  if (started) return;
  started = true;
  const apply = (raw: unknown) => {
    const j = raw as { linked?: boolean; state?: PipelineState | null };
    usePipeline.getState().setState(j.state ?? null, Boolean(j.linked));
    if (j.state) syncLiveClip(j.state);
  };
  fetch("/api/pipeline").then((r) => (r.ok ? r.json() : null)).then((j) => j && apply(j)).catch(() => {});
  const es = new EventSource("/api/pipeline/events");
  es.onopen = () => usePipeline.getState().setConnected(true);
  es.onerror = () => usePipeline.getState().setConnected(false);
  es.onmessage = (ev) => {
    try {
      apply(JSON.parse(ev.data));
    } catch {
      /* 心跳或坏包：忽略 */
    }
  };
  // 工程代码有错时 Vite 不再盖整页（server.hmr.overlay=false），这里接住事件在角落提示
  const hot = import.meta.hot;
  if (hot) {
    hot.on("vite:error", (e: { err?: { message?: string; id?: string; loc?: { file?: string; line?: number } } }) => {
      const err = e?.err ?? {};
      const file = err.loc?.file ? `${err.loc.file}${err.loc.line ? `:${err.loc.line}` : ""}` : err.id;
      usePipeline.getState().setCodeError({ message: String(err.message ?? "工程代码错误").split("\n")[0].slice(0, 300), file });
    });
    hot.on("vite:afterUpdate", () => usePipeline.getState().setCodeError(null));
  }
};
