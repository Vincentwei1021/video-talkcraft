import type { ClipData, ProjectData } from "./types";
import { uid } from "./types";
import { CARDS } from "./cards/registry";
import { OVERLAP, WIPE_PRE, WIPE_POST, halfAt, kouboPhrases } from "./cards/koubo-units";
import { SHOTS, FPS, TOTAL_FRAMES, darkAt } from "@kbsrc/shots";
import { SFX_CUES } from "@kbsrc/sfx";

/** 音效素材清单（去重 + 使用次数），素材库「音效」tab 用 */
export const SFX_FILES: { file: string; count: number }[] = (() => {
  const m = new Map<string, number>();
  for (const c of SFX_CUES as { file: string }[]) m.set(c.file, (m.get(c.file) ?? 0) + 1);
  return [...m].map(([file, count]) => ({ file, count })).sort((a, b) => b.count - a.count);
})();

// 原 Environment.tsx ShapeWipes 的换幕时刻表（源码内联字面量，此处对照抄录）
const WIPE_TIMES = [30.6, 80.32, 112, 139.24, 146.5, 171.74];

const baseClip = (): Omit<ClipData, "id" | "cardId" | "start" | "duration"> => ({
  inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {},
});

/** 把口播成片拆解为独立单元：字幕/转场/环境/数字人/23 镜头/配音/82 音效 */
export const buildKouboProject = (): ProjectData => {
  type ShotT = { id: string; label: string; start: number; end: number };

  // 动效镜头：一 shot 一 clip，落点与原 MainVideo 的 Sequence 完全一致
  const shotClips: ClipData[] = SHOTS.map((shot: ShotT, i: number) => {
    const lead = i === 0 ? 0 : OVERLAP;
    const tail = i === SHOTS.length - 1 ? 0 : OVERLAP;
    const narration = Math.round((shot.end - shot.start) * FPS);
    // 优先用逐镜参数化卡（kscene-sNN，文案/颜色/字号可编辑）；未接入的回退通用镜头卡
    const sceneCardId = `kscene-${shot.id}`;
    const hasSceneCard = !!CARDS[sceneCardId];
    return {
      ...baseClip(),
      id: uid("clip"),
      cardId: hasSceneCard ? sceneCardId : "koubo-shot",
      start: Math.max(0, Math.round(shot.start * FPS) - lead),
      duration: lead + narration + tail,
      props: hasSceneCard ? {} : { shotId: shot.id },
      label: `${shot.id} ${shot.label}`,
    };
  });

  // 转场：每次三色扫一个 clip（卡内峰值在 0.32s 处，起点前移对齐）
  const wipeClips: ClipData[] = WIPE_TIMES.map((at) => ({
    ...baseClip(),
    id: uid("clip"),
    cardId: "koubo-wipe",
    start: Math.round((at - WIPE_PRE) * FPS),
    duration: Math.ceil((WIPE_PRE + WIPE_POST) * FPS),
    label: `转场 @${at}s`,
  }));

  // 音效：一 cue 一 clip，贪心装箱进若干音效轨（同轨不重叠，便于单独挪动）
  type Cue = { t: number; file: string; vol: number; dur?: number };
  const sfxLanes: { end: number; clips: ClipData[] }[] = [];
  for (const c of SFX_CUES as Cue[]) {
    const start = Math.round(c.t * FPS);
    const duration = c.dur ? Math.round(c.dur * FPS) : 90; // 与原 MainVideo 默认时长一致
    let lane = sfxLanes.find((l) => l.end <= start);
    if (!lane) {
      lane = { end: 0, clips: [] };
      sfxLanes.push(lane);
    }
    lane.clips.push({
      ...baseClip(),
      id: uid("clip"),
      cardId: "audio-clip",
      start,
      duration,
      props: { file: `sfx/${c.file}`, volume: c.vol },
      label: c.file.replace(/^pk-/, "").replace(/\.mp3$/, ""),
    });
    lane.end = start + duration;
  }

  // 字幕：一句一 clip（切分与原 phrases() 同构）；展示窗与原逻辑等价——
  // 原句尾多留 0.28s，但后句开始即接管，故裁到下一句起点
  const phrases = kouboPhrases();
  const subtitleClips: ClipData[] = phrases.map((p, i) => {
    const endSec = Math.min(p.end + 0.28, phrases[i + 1]?.start ?? Number.POSITIVE_INFINITY);
    return {
      ...baseClip(),
      id: uid("clip"),
      cardId: "koubo-subtitle-line",
      start: Math.round(p.start * FPS),
      duration: Math.max(6, Math.round((endSec - p.start) * FPS)),
      props: { text: p.text, dark: darkAt(p.start), half: halfAt(p.start) },
      label: p.text.length > 14 ? `${p.text.slice(0, 14)}…` : p.text,
    };
  });

  const fullLen = (cardId: string, label: string): ClipData => ({
    ...baseClip(),
    id: uid("clip"),
    cardId,
    start: 0,
    duration: TOTAL_FRAMES,
    label,
  });

  return {
    name: "口播成片 · 拆解",
    fps: 30,
    width: 960,
    height: 540,
    // tracks[0] 为最上层，对应原片 z 序：字幕 > 转场 > 环境 > 数字人 > 镜头
    tracks: [
      { id: uid("track"), name: "字幕", clips: subtitleClips },
      { id: uid("track"), name: "转场", clips: wipeClips },
      { id: uid("track"), name: "环境", clips: [fullLen("koubo-environment", "口播环境")] },
      { id: uid("track"), name: "数字人", clips: [fullLen("koubo-host", "数字人 host.webm")] },
      { id: uid("track"), name: "动效镜头", clips: shotClips },
      {
        id: uid("track"),
        name: "配音",
        clips: [{
          ...baseClip(),
          id: uid("clip"),
          cardId: "audio-clip",
          start: 0,
          duration: TOTAL_FRAMES,
          props: { file: "full.wav", volume: 1 },
          label: "配音 full.wav",
        }],
      },
      ...sfxLanes.map((lane, i) => ({
        id: uid("track"),
        name: `音效 ${i + 1}`,
        clips: lane.clips,
      })),
    ],
  };
};
