import { create } from "zustand";
import type { ClipData, ProjectData, TrackData } from "./types";
import { uid } from "./types";
import { CARDS } from "./cards/registry";
import { demoProject } from "./demoProject";
import { KB_PROJECT_ROOT } from "./kbMeta";

export { projectDuration } from "./types";

// 未标记来源的旧存档保留在原 key，不猜测它属于当前哪支视频。
const STORAGE_KEY = `talkcraft-workbench-project-v1${KB_PROJECT_ROOT ? `:${encodeURIComponent(KB_PROJECT_ROOT)}` : ""}`;

const loadInitial = (): ProjectData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as ProjectData;
      if (p && Array.isArray(p.tracks)) return p;
    }
  } catch {
    /* 损坏的存档直接回退到演示工程 */
  }
  return demoProject();
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const findClip = (
  project: ProjectData,
  clipId: string,
): { track: TrackData; clip: ClipData } | null => {
  for (const track of project.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return { track, clip };
  }
  return null;
};

/** 素材库点击预览：卡片走 Player 实时预览，文件走原生 video/img/audio */
export type PreviewItem =
  | { kind: "card"; cardId: string }
  | { kind: "video" | "image" | "audio"; file: string; label: string }
  | null;

interface WorkbenchState {
  project: ProjectData;
  selectedClipId: string | null;
  playhead: number;
  playing: boolean;
  pxPerFrame: number;
  previewItem: PreviewItem;
  past: ProjectData[];
  future: ProjectData[];

  /** 一次编辑手势开始前调用：压入撤销快照 */
  commit: () => void;
  undo: () => void;
  redo: () => void;

  setProject: (p: ProjectData) => void;
  select: (id: string | null) => void;
  setPlayhead: (f: number) => void;
  setPlaying: (b: boolean) => void;
  setZoom: (pxPerFrame: number) => void;
  setPreview: (p: PreviewItem) => void;

  addTrack: () => void;
  removeTrack: (trackId: string) => void;
  toggleTrackHidden: (trackId: string) => void;
  /** 拖拽排序：把轨道移到插入位 toIndex（按原数组下标：0 = 最上层，tracks.length = 最下层） */
  moveTrack: (trackId: string, toIndex: number) => void;

  addClip: (
    cardId: string,
    trackId?: string,
    at?: number,
    extra?: { props?: Record<string, unknown>; label?: string; duration?: number },
  ) => void;
  updateClip: (clipId: string, patch: Partial<ClipData>) => void;
  updateClipProps: (clipId: string, propPatch: Record<string, unknown>) => void;
  removeClip: (clipId: string) => void;
  splitClip: (clipId: string, atFrame: number) => void;
  duplicateClip: (clipId: string) => void;
  moveClipToTrack: (clipId: string, trackId: string) => void;
}

const mutateProject = (
  project: ProjectData,
  fn: (draft: ProjectData) => void,
): ProjectData => {
  const draft = clone(project);
  fn(draft);
  return draft;
};

/** HMR 保命：接入工程的任何源码变化（agent 改 tsx、overrides.json 写回）都会经 kb 适配层 → 卡注册表 → 本模块传播，
 *  Vite 会重新执行本文件、重建 store——不接住就丢选中 / 撤销栈（2026-09-15 实测：改一个镜头参数，属性面板当场清空）。
 *  dispose 时把状态存进 import.meta.hot.data，重建时原样接回；Remotion 渲染（webpack）没有 import.meta.hot，走正常初始化。 */
type Carried = Pick<WorkbenchState, "project" | "selectedClipId" | "playhead" | "pxPerFrame" | "previewItem" | "past" | "future">;
const hotData = import.meta.hot?.data as { store?: Carried; projectRoot?: string } | undefined;
const carried = hotData?.projectRoot === KB_PROJECT_ROOT ? hotData.store : undefined;

export const useStore = create<WorkbenchState>((set, get) => ({
  project: carried?.project ?? loadInitial(),
  selectedClipId: carried?.selectedClipId ?? null,
  playhead: carried?.playhead ?? 0,
  playing: false,
  pxPerFrame: carried?.pxPerFrame ?? 2,
  previewItem: carried?.previewItem ?? null,
  past: carried?.past ?? [],
  future: carried?.future ?? [],

  commit: () =>
    set((s) => ({ past: [...s.past.slice(-49), clone(s.project)], future: [] })),

  undo: () =>
    set((s) => {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return {
        project: prev,
        past: s.past.slice(0, -1),
        future: [clone(s.project), ...s.future.slice(0, 49)],
        selectedClipId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return s;
      const next = s.future[0];
      return {
        project: next,
        past: [...s.past.slice(-49), clone(s.project)],
        future: s.future.slice(1),
        selectedClipId: null,
      };
    }),

  setProject: (p) => {
    get().commit();
    set({ project: p, selectedClipId: null });
  },
  select: (id) => set({ selectedClipId: id }),
  setPlayhead: (f) => set({ playhead: Math.max(0, Math.round(f)) }),
  setPlaying: (b) => set({ playing: b }),
  setZoom: (pxPerFrame) =>
    set({ pxPerFrame: Math.min(10, Math.max(0.3, pxPerFrame)) }),
  setPreview: (p) => set({ previewItem: p }),

  addTrack: () => {
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        d.tracks.unshift({ id: uid("track"), name: `轨道 ${d.tracks.length + 1}`, clips: [] });
      }),
    }));
  },

  removeTrack: (trackId) => {
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        d.tracks = d.tracks.filter((t) => t.id !== trackId);
      }),
      selectedClipId: null,
    }));
  },

  toggleTrackHidden: (trackId) => {
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const t = d.tracks.find((t) => t.id === trackId);
        if (t) t.hidden = !t.hidden;
      }),
    }));
  },

  moveTrack: (trackId, toIndex) => {
    const tracks = get().project.tracks;
    const from = tracks.findIndex((t) => t.id === trackId);
    const to = Math.max(0, Math.min(tracks.length, Math.round(toIndex)));
    // 插到自己前面或紧跟自己后面 = 原位，不记撤销
    if (from < 0 || to === from || to === from + 1) return;
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const [t] = d.tracks.splice(from, 1);
        d.tracks.splice(to > from ? to - 1 : to, 0, t);
      }),
    }));
  },

  addClip: (cardId, trackId, at, extra) => {
    const card = CARDS[cardId];
    if (!card) return;
    get().commit();
    const newId = uid("clip");
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const track =
          d.tracks.find((t) => t.id === trackId) ?? d.tracks[d.tracks.length - 1];
        if (!track) return;
        track.clips.push({
          id: newId,
          cardId,
          start: Math.max(0, Math.round(at ?? s.playhead)),
          duration: extra?.duration ?? card.durationInFrames,
          inOffset: 0,
          speed: 1,
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          props: extra?.props ?? {},
          label: extra?.label,
        });
      }),
      selectedClipId: newId,
    }));
  },

  updateClip: (clipId, patch) =>
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const hit = findClip(d, clipId);
        if (hit) Object.assign(hit.clip, patch);
      }),
    })),

  updateClipProps: (clipId, propPatch) =>
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const hit = findClip(d, clipId);
        if (hit) hit.clip.props = { ...hit.clip.props, ...propPatch };
      }),
    })),

  removeClip: (clipId) => {
    get().commit();
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        for (const t of d.tracks) t.clips = t.clips.filter((c) => c.id !== clipId);
      }),
      selectedClipId:
        s.selectedClipId === clipId ? null : s.selectedClipId,
    }));
  },

  splitClip: (clipId, atFrame) => {
    const hit = findClip(get().project, clipId);
    if (!hit) return;
    const { clip } = hit;
    const local = Math.round(atFrame - clip.start);
    if (local <= 0 || local >= clip.duration) return;
    get().commit();
    const rightId = uid("clip");
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const h = findClip(d, clipId);
        if (!h) return;
        const left = h.clip;
        const right: ClipData = {
          ...clone(left),
          id: rightId,
          start: left.start + local,
          duration: left.duration - local,
          inOffset: left.inOffset + local * left.speed,
        };
        left.duration = local;
        h.track.clips.push(right);
      }),
      selectedClipId: rightId,
    }));
  },

  duplicateClip: (clipId) => {
    const hit = findClip(get().project, clipId);
    if (!hit) return;
    get().commit();
    const newId = uid("clip");
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const h = findClip(d, clipId);
        if (!h) return;
        const copy: ClipData = {
          ...clone(h.clip),
          id: newId,
          start: h.clip.start + h.clip.duration,
        };
        h.track.clips.push(copy);
      }),
      selectedClipId: newId,
    }));
  },

  moveClipToTrack: (clipId, trackId) =>
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const hit = findClip(d, clipId);
        const target = d.tracks.find((t) => t.id === trackId);
        if (!hit || !target || hit.track.id === trackId) return;
        hit.track.clips = hit.track.clips.filter((c) => c.id !== clipId);
        target.clips.push(hit.clip);
      }),
    })),
}));

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    const s = useStore.getState();
    data.store = { project: s.project, selectedClipId: s.selectedClipId, playhead: s.playhead, pxPerFrame: s.pxPerFrame, previewItem: s.previewItem, past: s.past, future: s.future } satisfies Carried;
    data.projectRoot = KB_PROJECT_ROOT;
  });
}

// —— 自动保存：每次改动 800ms 防抖落 localStorage；关页/切后台时立即落盘 ——
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const flushSave = () => {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(useStore.getState().project));
  } catch {
    /* 存储满/隐私模式：忽略 */
  }
};
useStore.subscribe((s, prev) => {
  if (s.project === prev.project) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 800);
});
window.addEventListener("beforeunload", flushSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSave();
});

export const resetProject = () => {
  useStore.getState().setProject(demoProject());
};
