import { create } from "zustand";
import type { PipelineState } from "./types";
import { useStore } from "../store";
import { LIVE_CLIP_ID } from "../kb/liveProject";
import { useLiveLoad } from "../kb/liveLoad";
import { syncedIfChanged } from "../kouboImport";

/** 实时看板状态：与工程 store 分离（不进撤销栈、不进 localStorage）。
 *  进度轨 / 阶段栏 / 镜头面板只订阅这里的一小片，播放中不重渲染（PlayheadLine 同款纪律）。 */
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

// （旧存档兼容）kb-main 成片卡载入失败（语法错 / 缺导出）→ 同一条右下角提示；载入成功 → 清掉。
// 带 title 的接入说明（拆解契约不全）优先级更高，不被它盖掉——缺契约文件时 Main 往往也 import 不到那个文件，两条错其实是同一件事。
useLiveLoad.subscribe((s, prev) => {
  const cur = usePipeline.getState().codeError;
  if (s.error && s.error !== prev.error) {
    if (!cur?.title) usePipeline.getState().setCodeError(s.error);
  } else if (!s.error && prev.error && !cur?.title) usePipeline.getState().setCodeError(null);
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

/** 多轨自动跟盘（2026-09-21 用户：制作中"一开始就是多轨，实时看到音效放到哪、镜头做到哪、字幕什么样"，不是单轨进度台）：
 *  工程文件一变（SSE 推来 shots / scenes / out 的变化，或接入源码 HMR 完成）→ 按稳定 id 把新鲜拆解合进当前多轨工程；
 *  用户改过的 props / 图层 / 删除保留（syncKouboProject 语义），不进撤销栈。400ms 防抖：一次保存常同时触发两路事件。
 *  旧存档里的单轨工程（已下线）与用户自己的工程不受影响（syncedIfChanged 只认本片拆解工程）。 */
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const autoSyncTracks = () => {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    const s = useStore.getState();
    const next = syncedIfChanged(s.project);
    if (next) s.replaceProject(next);
  }, 400);
};

let started = false;
let es: EventSource | null = null;
if (import.meta.hot) {
  // 本模块被 HMR 重新执行时，旧的 SSE 连接必须关掉（否则每次接入工程源码一变就多一条长连接，服务端 clients 只增不减）
  import.meta.hot.dispose((data) => {
    es?.close();
    if (syncTimer) clearTimeout(syncTimer);
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
    autoSyncTracks();
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
      if (usePipeline.getState().codeError?.title) return; // 带 title 的接入说明（拆解契约不全）不被转换错误盖掉——缺契约文件时 Main import 不到它，是同一件事
      const err = e?.err ?? {};
      const file = err.loc?.file ? `${err.loc.file}${err.loc.line ? `:${err.loc.line}` : ""}` : err.id;
      usePipeline.getState().setCodeError({ message: String(err.message ?? "工程代码错误").split("\n")[0].slice(0, 300), file });
    });
    hot.on("vite:afterUpdate", () => {
      if (!usePipeline.getState().codeError?.title) usePipeline.getState().setCodeError(null); // 契约说明要到重启 dev server 才会变，HMR 不清它
      retryLiveIfFailed();
      autoSyncTracks(); // 接入源码（scenes / sfx.ts / Subtitles）改完 → 本模块已随链重建、拿到的是新鲜数据
    });
  }
};
