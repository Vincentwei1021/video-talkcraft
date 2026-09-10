import type { ClipData, ProjectData } from "./types";
import { CARDS } from "./cards/registry";
import { OVERLAP, WIPE_PRE, WIPE_POST, halfAt, kouboPhrases } from "./cards/koubo-units";
import { SHOTS, FPS, TOTAL_FRAMES, darkAt } from "./kb/shots";
import { SFX_CUES } from "./kb/sfx";
import { KB_PROMO, WIPE_TIMES, WIPE_SOURCE } from "./kbMeta";

/** 音效素材清单（去重 + 使用次数），素材库「音效」tab 用 */
export const SFX_FILES: { file: string; count: number }[] = (() => {
  const m = new Map<string, number>();
  for (const c of SFX_CUES as { file: string }[]) m.set(c.file, (m.get(c.file) ?? 0) + 1);
  return [...m].map(([file, count]) => ({ file, count })).sort((a, b) => b.count - a.count);
})();

// 换幕时刻表来自接入工程（scripts/gen-index.mjs 生成 kbMeta.ts：优先工程导出的 WIPE_TIMES，
// 其次抓 Environment.tsx 里 ShapeWipes 的 times 字面量，再次 beats.json 里 what 含 wipe/换幕 的 t）。
// 曾经是抄录示例工程的六个硬编码时刻——换工程后转场时间全错（独立评审 P1）。
if (KB_PROMO && WIPE_TIMES.length === 0) {
  console.warn("[kouboImport] 接入工程没有可读的换幕时刻表：在 Environment.tsx 导出 WIPE_TIMES，或在 beats.json 给换幕事件写 what 含 wipe");
}

const baseClip = (): Omit<ClipData, "id" | "cardId" | "start" | "duration"> => ({
  inOffset: 0, speed: 1, opacity: 1, scale: 1, x: 0, y: 0, props: {},
});

/** 拆解单元的稳定 id（`kb-…`）：镜头按 shot.id、音效 / 字幕 / 转场按序号——重拆时同一单元 id 不变，
 *  syncKouboProject 才能把用户改过的 props / 图层 / 位置留住。用户自己加的 clip 是 uid()，前缀不同不受影响。 */
export const KB_ID_PREFIX = "kb-";
const kbId = (kind: string, key: string | number) => `${KB_ID_PREFIX}${kind}-${key}`;
export const isKouboProject = (p: ProjectData) => p.tracks.some((t) => t.clips.some((c) => c.id.startsWith(KB_ID_PREFIX) && c.id !== "kb-live-main"));

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
      id: kbId("shot", shot.id),
      cardId: hasSceneCard ? sceneCardId : "koubo-shot",
      start: Math.max(0, Math.round(shot.start * FPS) - lead),
      duration: lead + narration + tail,
      props: hasSceneCard ? {} : { shotId: shot.id },
      label: `${shot.id} ${shot.label}`,
    };
  });

  // 转场：每次三色扫一个 clip（卡内峰值在 0.32s 处，起点前移对齐）
  const wipeClips: ClipData[] = WIPE_TIMES.map((at, i) => ({
    ...baseClip(),
    id: kbId("wipe", i),
    cardId: "koubo-wipe",
    start: Math.round((at - WIPE_PRE) * FPS),
    duration: Math.ceil((WIPE_PRE + WIPE_POST) * FPS),
    label: `转场 @${at}s${WIPE_SOURCE === "beats" ? "（beats）" : ""}`,
  }));

  // 音效：一 cue 一 clip，贪心装箱进若干音效轨（同轨不重叠，便于单独挪动）
  type Cue = { t: number; file: string; vol: number; dur?: number };
  const sfxLanes: { end: number; clips: ClipData[] }[] = [];
  (SFX_CUES as Cue[]).forEach((c, ci) => {
    const start = Math.round(c.t * FPS);
    const duration = c.dur ? Math.round(c.dur * FPS) : 90; // 与原 MainVideo 默认时长一致
    let lane = sfxLanes.find((l) => l.end <= start);
    if (!lane) {
      lane = { end: 0, clips: [] };
      sfxLanes.push(lane);
    }
    lane.clips.push({
      ...baseClip(),
      id: kbId("sfx", ci),
      cardId: "audio-clip",
      start,
      duration,
      props: { file: `sfx/${c.file}`, volume: c.vol },
      label: c.file.replace(/^pk-/, "").replace(/\.mp3$/, ""),
    });
    lane.end = start + duration;
  });

  // 字幕：一句一 clip（切分与原 phrases() 同构）；展示窗与原逻辑等价——
  // 原句尾多留 0.28s，但后句开始即接管，故裁到下一句起点
  const phrases = kouboPhrases();
  const subtitleClips: ClipData[] = phrases.map((p, i) => {
    const endSec = Math.min(p.end + 0.28, phrases[i + 1]?.start ?? Number.POSITIVE_INFINITY);
    return {
      ...baseClip(),
      id: kbId("sub", i),
      cardId: "koubo-subtitle-line",
      start: Math.round(p.start * FPS),
      duration: Math.max(6, Math.round((endSec - p.start) * FPS)),
      props: { text: p.text, dark: darkAt(p.start), half: halfAt(p.start) },
      label: p.text.length > 14 ? `${p.text.slice(0, 14)}…` : p.text,
    };
  });

  const fullLen = (cardId: string, label: string): ClipData => ({
    ...baseClip(),
    id: kbId("full", cardId),
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
      { id: kbId("track", "subtitles"), name: "字幕", clips: subtitleClips },
      { id: kbId("track", "wipes"), name: "转场", clips: wipeClips },
      { id: kbId("track", "env"), name: "环境", clips: [fullLen("koubo-environment", "口播环境")] },
      { id: kbId("track", "host"), name: "数字人", clips: [fullLen("koubo-host", "数字人 host.webm")] },
      { id: kbId("track", "shots"), name: "动效镜头", clips: shotClips },
      {
        id: kbId("track", "voice"),
        name: "配音",
        clips: [{
          ...baseClip(),
          id: kbId("full", "voice"),
          cardId: "audio-clip",
          start: 0,
          duration: TOTAL_FRAMES,
          props: { file: "full.wav", volume: 1 },
          label: "配音 full.wav",
        }],
      },
      ...sfxLanes.map((lane, i) => ({
        id: kbId("track", `sfx${i}`),
        name: `音效 ${i + 1}`,
        clips: lane.clips,
      })),
    ],
  };
};

/** 增量同步（实时看板 L1）：按稳定 id 把新鲜拆解合进现有工程——
 *  - 同 id 的 clip：起点 / 时长跟新拆解（时间真值在 shots.json / 时间戳），props / 图层 / 变速 / 标签留用户改过的；
 *  - 新增的单元补进对应轨（轨不在就新建）；拆解里已没有的 kb- clip 删掉；
 *  - 用户自己加的 clip（uid 前缀）与轨道顺序、隐藏状态一律不动。 */
export const syncKouboProject = (existing: ProjectData): ProjectData => {
  const fresh = buildKouboProject();
  const freshClips = new Map<string, { clip: ClipData; trackId: string }>();
  for (const t of fresh.tracks) for (const c of t.clips) freshClips.set(c.id, { clip: c, trackId: t.id });

  const tracks = existing.tracks.map((t) => ({
    ...t,
    clips: t.clips
      .filter((c) => !c.id.startsWith(KB_ID_PREFIX) || c.id === "kb-live-main" || freshClips.has(c.id))
      .map((c) => {
        const f = freshClips.get(c.id);
        if (!f) return c;
        freshClips.delete(c.id);
        return { ...c, start: f.clip.start, duration: f.clip.duration, cardId: f.clip.cardId };
      }),
  }));
  // 新增单元 → 其在新鲜拆解里所属的轨；轨不存在就按新鲜顺序补建
  for (const { clip, trackId } of freshClips.values()) {
    let t = tracks.find((x) => x.id === trackId);
    if (!t) {
      const ft = fresh.tracks.find((x) => x.id === trackId)!;
      t = { id: ft.id, name: ft.name, clips: [] };
      const at = fresh.tracks.findIndex((x) => x.id === trackId);
      tracks.splice(Math.min(at, tracks.length), 0, t);
    }
    t.clips.push(clip);
  }
  return { ...existing, tracks };
};
