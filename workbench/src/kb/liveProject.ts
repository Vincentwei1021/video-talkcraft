import type { ProjectData } from "../types";
import { KB_COMP, KB_LINKED, KB_MAIN, KB_PROJECT } from "../kbMeta";
import { TOTAL_FRAMES } from "./shots";

export const LIVE_CLIP_ID = "kb-live-main";
export const LIVE_TRACK_ID = "kb-live-track";

/** 实时看板工程：一条轨、一个 clip = 接入工程的主合成按实时代码渲染（画幅随工程横竖屏），
 *  进度轨 / 阶段栏另从 pipeline 状态画，不是 clip。 */
export const buildLiveProject = (): ProjectData => {
  const portrait = KB_COMP.height > KB_COMP.width;
  return {
    name: `${KB_PROJECT || "接入工程"} · 实时看板`,
    fps: KB_COMP.fps || 30,
    width: portrait ? 540 : 960,
    height: portrait ? 960 : 540,
    tracks: [
      {
        id: LIVE_TRACK_ID,
        name: "成片（实时）",
        clips: [
          {
            id: LIVE_CLIP_ID,
            cardId: "kb-main",
            start: 0,
            duration: Math.max(2, TOTAL_FRAMES),
            inOffset: 0,
            speed: 1,
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
            props: {},
            label: `${KB_PROJECT} · ${KB_MAIN ?? "Main"}`,
          },
        ],
      },
    ],
  };
};

export const canBuildLive = KB_LINKED && KB_MAIN !== null;
export const isLiveProject = (p: ProjectData) => p.tracks.some((t) => t.clips.some((c) => c.id === LIVE_CLIP_ID));
