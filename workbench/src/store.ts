import { create } from "zustand";
import type { ClipData, ProjectData, TrackData } from "./types";
import { uid } from "./types";
import { CARDS } from "./cards/registry";

const STORAGE_KEY = "talkcraft-workbench-project-v1";

// —— 初始演示工程：主轨四张卡顺排 + 上层透明文字轨 ——
const demoProject = (): ProjectData => ({
  name: "未命名工程",
  fps: 30,
  width: 960,
  height: 540,
  tracks: [
    {
      id: uid("track"),
      name: "文字层",
      clips: [
        {
          id: uid("clip"),
          cardId: "text-basic",
          start: 333,
          duration: 60,
          inOffset: 0,
          speed: 1,
          opacity: 1,
          scale: 1,
          x: 0,
          y: -170,
          props: {
            content: "关键结论",
            transparentBg: true,
            fontSize: 44,
            color: "#e8720c",
            anim: "slam",
            delay: 0.5,
          },
        },
      ],
    },
    {
      id: uid("track"),
      name: "主轨",
      clips: [
        { id: uid("clip"), cardId: "impact-open-title", start: 0, duration: 97, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {} },
        { id: uid("clip"), cardId: "chapter-title-card", start: 105, duration: 100, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {} },
        { id: uid("clip"), cardId: "count-badge-title", start: 213, duration: 112, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {} },
        { id: uid("clip"), cardId: "highlighter-sweep", start: 333, duration: 60, inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {} },
      ],
    },
  ],
});

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

/** 工程总时长（帧）：最晚 clip 结束 + 1s 余量，最短 5s */
export const projectDuration = (project: ProjectData): number => {
  let end = 0;
  for (const t of project.tracks)
    for (const c of t.clips) end = Math.max(end, c.start + c.duration);
  return Math.max(150, end + 30);
};

interface WorkbenchState {
  project: ProjectData;
  selectedClipId: string | null;
  playhead: number;
  playing: boolean;
  pxPerFrame: number;
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

  addTrack: () => void;
  removeTrack: (trackId: string) => void;
  toggleTrackHidden: (trackId: string) => void;

  addClip: (cardId: string, trackId?: string, at?: number) => void;
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

export const useStore = create<WorkbenchState>((set, get) => ({
  project: loadInitial(),
  selectedClipId: null,
  playhead: 0,
  playing: false,
  pxPerFrame: 2,
  past: [],
  future: [],

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
    set((s) => ({
      project: mutateProject(s.project, (d) => {
        const t = d.tracks.find((t) => t.id === trackId);
        if (t) t.hidden = !t.hidden;
      }),
    }));
  },

  addClip: (cardId, trackId, at) => {
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
          duration: card.durationInFrames,
          inOffset: 0,
          speed: 1,
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          props: {},
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

// —— 自动保存：project 变化 800ms 后落 localStorage ——
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useStore.subscribe((s, prev) => {
  if (s.project === prev.project) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s.project));
    } catch {
      /* 存储满/隐私模式：忽略 */
    }
  }, 800);
});

export const resetProject = () => {
  useStore.getState().setProject(demoProject());
};
