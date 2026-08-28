import timingData from './timing.json';

export type CharStamp = {ch: string; t: number; e: number};
export type SceneTiming = {
  id: string;
  text: string;
  startSec: number;
  durationSec: number;
  chars: CharStamp[];
};

export const timing = timingData as {totalSec: number; scenes: SceneTiming[]};

export const sceneById = (id: string): SceneTiming => {
  const s = timing.scenes.find((sc) => sc.id === id);
  if (!s) throw new Error(`unknown scene ${id}`);
  return s;
};

/**
 * Frame ranges per scene: a scene runs from its narration start until the
 * next scene's narration start (last scene runs to the end of the video).
 */
export const sceneFrameRanges = (
  fps: number,
  totalFrames: number,
): {id: string; from: number; duration: number}[] => {
  return timing.scenes.map((sc, i) => {
    const from = Math.round(sc.startSec * fps);
    const to =
      i + 1 < timing.scenes.length
        ? Math.round(timing.scenes[i + 1].startSec * fps)
        : totalFrames;
    return {id: sc.id, from, duration: to - from};
  });
};

/**
 * Scene-local time (seconds) at which `substr` starts being spoken,
 * straight from the ASR character timestamps. Falls back to 0.
 */
export const tSay = (sceneId: string, substr: string): number => {
  const sc = sceneById(sceneId);
  const idx = sc.text.indexOf(substr);
  if (idx < 0) return 0;
  return Math.max(0, sc.chars[idx].t - sc.startSec);
};

/** Same as tSay but in milliseconds, for anime.js timeline positions. */
export const msSay = (sceneId: string, substr: string): number =>
  tSay(sceneId, substr) * 1000;
