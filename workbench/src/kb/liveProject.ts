import type { ProjectData } from "../types";
import { KB_COMP, KB_LINKED, KB_MAIN, KB_PROJECT, KB_PROJECT_ROOT } from "../kbMeta";
import { TOTAL_FRAMES } from "./shots";

export const LIVE_CLIP_ID = "kb-live-main";
export const LIVE_TRACK_ID = "kb-live-track";

/** 实时看板工程：一条轨、一个 clip = 接入工程的主合成按实时代码渲染；
 *  画布直接用工程原尺寸（Root.tsx 字面量）而不是工作台默认的 960×540——嵌套主合成再 CSS 缩放时，
 *  工程内 useVideoConfig() 读到的是外层画布尺寸，按尺寸算布局的层（幕底 / 长镜头画布等）会偏（2026-09-13 审计 R4）；
 *  Player 在展示层自适应缩放，导出成片也就是原尺寸。进度轨 / 阶段栏另从 pipeline 状态画，不是 clip。 */
export const buildLiveProject = (): ProjectData => {
  return {
    name: `${KB_PROJECT || "接入工程"} · 实时看板`,
    kbProjectRoot: KB_PROJECT_ROOT,
    fps: KB_COMP.fps || 30,
    width: KB_COMP.width || 1920,
    height: KB_COMP.height || 1080,
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
export const isLiveProject = (p: ProjectData) => !!KB_PROJECT_ROOT && p.kbProjectRoot === KB_PROJECT_ROOT &&
  p.tracks.some((t) => t.clips.some((c) => c.id === LIVE_CLIP_ID));
