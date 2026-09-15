import { create } from "zustand";
import type { PipelineState } from "./types";
import { useStore } from "../store";
import { LIVE_CLIP_ID } from "../kb/liveProject";
import { useLiveLoad } from "../kb/liveLoad";

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

/** HMR 重建时接回上一份状态（同 ../store 的 Carried 做法），阶段栏 / 进度轨不闪空 */
const carried = (import.meta.hot?.data as { pipeline?: Pick<PipelineStore, "linked" | "state" | "connected" | "selectedShotId" | "codeError"> } | undefined)?.pipeline;

export const usePipeline = create<PipelineStore>((set) => ({
  linked: carried?.linked ?? false,
  state: carried?.state ?? null,
  connected: carried?.connected ?? false,
  selectedShotId: carried?.selectedShotId ?? null,
  codeError: carried?.codeError ?? null,
  selectShot: (id) => set({ selectedShotId: id }),
  setState: (state, linked) => set({ state, linked }),
  setConnected: (connected) => set({ connected }),
  setCodeError: (codeError) => set({ codeError }),
}));

// kb-main 实时成片卡载入失败（语法错 / 缺导出）→ 同一条右下角提示；载入成功 → 清掉
useLiveLoad.subscribe((s, prev) => {
  if (s.error && s.error !== prev.error) usePipeline.getState().setCodeError(s.error);
  else if (!s.error && prev.error) usePipeline.getState().setCodeError(null);
});
/** 上次载入失败的实时成片卡：重建 lazy 再试（还坏就再次报错、提示回来） */
const retryLiveIfFailed = () => {
  const ll = useLiveLoad.getState();
  if (ll.error) ll.retry();
};

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
let es: EventSource | null = null;
if (import.meta.hot) {
  // 本模块被 HMR 重新执行时，旧的 SSE 连接必须关掉（否则每次接入工程源码一变就多一条长连接，服务端 clients 只增不减）
  import.meta.hot.dispose((data) => {
    es?.close();
    const s = usePipeline.getState();
    data.pipeline = { linked: s.linked, state: s.state, connected: s.connected, selectedShotId: s.selectedShotId, codeError: s.codeError };
  });
}
/** App 挂载时调一次：拉一次全量 + SSE 订阅；断线自动重连（EventSource 自带）。模块重建后 started 归零，需要再调一次（App 的 boot 里做） */
export const connectPipeline = () => {
  if (started) return;
  started = true;
  const apply = (raw: unknown) => {
    const j = raw as { linked?: boolean; state?: PipelineState | null };
    usePipeline.getState().setState(j.state ?? null, Boolean(j.linked));
    if (j.state) syncLiveClip(j.state);
    // 工程文件变了（SSE 推来）：首次转换失败的模块 Vite 不向导入方传播 HMR，只能靠这里触发重试
    retryLiveIfFailed();
  };
  fetch("/api/pipeline").then((r) => (r.ok ? r.json() : null)).then((j) => j && apply(j)).catch(() => {});
  es = new EventSource("/api/pipeline/events");
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
    hot.on("vite:afterUpdate", () => {
      usePipeline.getState().setCodeError(null);
      retryLiveIfFailed();
    });
  }
};
