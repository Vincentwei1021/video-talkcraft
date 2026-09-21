import type { ClipData, ProjectData } from "./types";
import { CARDS } from "./cards/registry";
import { OVERLAP, WIPE_PRE, WIPE_POST, halfAt, kouboPhrases } from "./cards/koubo-units";
import { SHOTS, FPS, TOTAL_FRAMES, darkAt } from "./kb/shots";
import { SFX_CUES } from "./kb/sfx";
import { phrases as skillPhrases } from "./kb/Subtitles";
import { OVERRIDES } from "./kb/params";
import { timing } from "./kb/timing";
import { KSHOT_PREFIX, shotFrames } from "./cards/koubo-skill";
import { KB_COMP, KB_DECOMPOSABLE, KB_FORM, KB_LINKED, KB_MODULES, KB_PROMO, KB_PROJECT_ROOT, KB_TRANSITIONS, WIPE_TIMES, WIPE_SOURCE } from "./kbMeta";
import { MEDIA_ITEMS } from "./mediaManifest";
import { setLatest } from "./hmr";

/** 音效素材清单（去重 + 使用次数），素材库「音效」tab 用 */
export const SFX_FILES: { file: string; count: number }[] = (() => {
  const m = new Map<string, number>();
  for (const c of SFX_CUES as { file: string }[]) {
    const f = c.file.replace(/^sfx\//, ""); // 与素材清单 SFX_ALL 的裸文件名对齐（skill 工程 cue 表可能带 sfx/ 前缀）
    m.set(f, (m.get(f) ?? 0) + 1);
  }
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
export const isKouboProject = (p: ProjectData) => !!KB_PROJECT_ROOT && p.kbProjectRoot === KB_PROJECT_ROOT &&
  p.tracks.some((t) => t.clips.some((c) => c.id.startsWith(KB_ID_PREFIX) && c.id !== "kb-live-main"));

/** 音效轨贪心装箱（同轨不重叠，便于单独挪动）；一 cue 一 clip，rate 透传成卡的变速 */
type Cue = { t: number; file: string; vol: number; dur?: number; rate?: number };
const sfxTracks = (): { id: string; name: string; clips: ClipData[] }[] => {
  const lanes: { end: number; clips: ClipData[] }[] = [];
  (SFX_CUES as Cue[]).forEach((c, ci) => {
    const start = Math.round(c.t * FPS);
    const duration = c.dur ? Math.round(c.dur * FPS) : 90; // 与原 MainVideo 默认时长一致
    let lane = lanes.find((l) => l.end <= start);
    if (!lane) {
      lane = { end: 0, clips: [] };
      lanes.push(lane);
    }
    lane.clips.push({
      ...baseClip(),
      id: kbId("sfx", ci),
      cardId: "audio-clip",
      start,
      duration,
      speed: c.rate ?? 1,
      // skill 正式工程的 cue 表可能已带 `sfx/` 前缀（2026-09-20 定投片实测），别再叠一层成 sfx/sfx/…（音频 404、轨上有块没声）
      props: { file: c.file.startsWith("sfx/") ? c.file : `sfx/${c.file}`, volume: c.vol },
      label: c.file.replace(/^sfx\//, "").replace(/^pk-/, "").replace(/\.mp3$/, ""),
    });
    lane.end = start + duration;
  });
  return lanes.map((lane, i) => ({ id: kbId("track", `sfx${i}`), name: `音效 ${i + 1}`, clips: lane.clips }));
};

/** 配音文件：按工程 public/ 里实际的根级音频解析（模板 MainVideo-example 与 skill 正式工程用 narration.wav，promo 时代叫 full.wav）——
 *  以前写死 full.wav，接入用 narration.wav 的工程时配音块 404、多轨静音、导出也丢人声（2026-09-21 用户实测"原来口播的声音怎么没了"）。 */
const VOICE_CANDIDATES = /^(narration|full|voice|vo)\.(wav|mp3|m4a|aac|flac)$/i;
export const VOICE_FILE: string = (() => {
  const audio = MEDIA_ITEMS.filter((m) => m.kind === "audio" && !m.file.includes("/"));
  const hit = audio.find((m) => VOICE_CANDIDATES.test(m.file)) ?? audio.find((m) => !/^sfx/i.test(m.file));
  return hit?.file ?? "narration.wav";
})();
const voiceTrack = () => ({
  id: kbId("track", "voice"),
  name: "配音",
  clips: [{
    ...baseClip(),
    id: kbId("full", "voice"),
    cardId: "audio-clip",
    start: 0,
    duration: TOTAL_FRAMES,
    props: { file: VOICE_FILE, volume: 1 },
    label: `配音 ${VOICE_FILE}`,
  } as ClipData],
});

/** 镜头标签：镜头起点处那句口播的前 12 字（skill 工程的 SHOTS 没有 label） */
const shotLabel = (shot: { id: string; label: string; start: number }) => {
  if (shot.label && shot.label !== shot.id) return `${shot.id} ${shot.label}`;
  const sc = timing.scenes.find((x) => Math.abs(x.startSec - shot.start) < 0.35) ?? timing.scenes.find((x) => x.startSec >= shot.start);
  const text = (sc?.text ?? "").replace(/\s+/g, "");
  return text ? `${shot.id} ${text.length > 12 ? `${text.slice(0, 12)}…` : text}` : shot.id;
};

/** skill 标准形态（SKILL.md ⑤ 产出的工程）：字幕句 / 幕级覆盖 / 转场标记 / 逐镜 / 幕底 / 配音 / 音效。
 *  画布 = 工程原尺寸（kb-main 同理：嵌套再 CSS 缩放会让工程内 useVideoConfig 读错）；
 *  镜头落位与工程 shotSequence 同规则（起点 − lead，长 lead + 叙事 + tail），逐镜 props 从 overrides.json 起步。 */
const buildSkillProject = (): ProjectData => {
  const shotClips: ClipData[] = SHOTS.map((shot, i) => {
    const f = shotFrames(i);
    return {
      ...baseClip(),
      id: kbId("shot", shot.id),
      cardId: `${KSHOT_PREFIX}${shot.id}`,
      start: Math.max(0, f.from),
      duration: f.total,
      props: { ...(OVERRIDES[shot.id] ?? {}) },
      label: shotLabel(shot),
    };
  });
  const subtitleClips: ClipData[] = skillPhrases().flatMap((p, i) => {
    // 首个满足 frame / FPS >= start 的帧；与成片字幕的秒级窗口一致。
    const start = Math.ceil(p.start * FPS - 1e-7);
    const end = Math.ceil(p.end * FPS - 1e-7);
    if (end <= start) return []; // 窗口内没有可见帧，不能人为多画一帧。
    return [{
      ...baseClip(),
      id: kbId("sub", i),
      cardId: "kskill-subtitle-line",
      start,
      duration: end - start,
      props: { text: p.text, dark: p.dark },
      label: p.text.length > 14 ? `${p.text.slice(0, 14)}…` : p.text,
    }];
  });
  // 转场标记：beats.json 的 tr-* 事件；没有就按镜头边界标
  const marks = KB_TRANSITIONS.length
    ? KB_TRANSITIONS
    : SHOTS.slice(1).map((s) => ({ t: s.start, label: `→ ${s.id}` }));
  const markerClips: ClipData[] = marks.map((m, i) => ({
    ...baseClip(),
    id: kbId("tr", i),
    cardId: "kskill-marker",
    start: Math.max(0, Math.round(m.t * FPS) - 4),
    duration: 8,
    props: { note: m.label },
    label: m.label,
  }));
  const full = (cardId: string, label: string): ClipData => ({ ...baseClip(), id: kbId("full", cardId), cardId, start: 0, duration: TOTAL_FRAMES, label });
  const hasEnv = !!KB_MODULES["Environment"];
  const project: ProjectData = {
    name: "口播成片 · 拆解",
    fps: KB_COMP.fps || FPS,
    width: KB_COMP.width || 1920,
    height: KB_COMP.height || 1080,
    // tracks[0] 为最上层：字幕 > 幕级覆盖 > 转场标记 > 镜头 > 幕底；音频轨在最后
    tracks: [
      { id: kbId("track", "subtitles"), name: "字幕", clips: subtitleClips },
      // 幕级覆盖（黑震切帧 / 落幕压黑）：没有可编辑内容，只为成片一致——系统层，不在时间轨显示（Composition 照常渲染）
      ...(hasEnv ? [{ id: kbId("track", "overlays"), name: "幕级覆盖", system: true, clips: [full("kskill-overlays", "黑震切 / 落幕")] }] : []),
      { id: kbId("track", "transitions"), name: "转场（标记）", clips: markerClips },
      { id: kbId("track", "shots"), name: "动效镜头", clips: shotClips },
      ...(hasEnv ? [{ id: kbId("track", "backdrop"), name: "幕底", clips: [full("kskill-backdrop", "分幕幕底")] }] : []),
      voiceTrack(),
      ...sfxTracks(),
    ],
  };
  return { ...project, kbSeen: project.tracks.flatMap((t) => t.clips.map((c) => c.id)), kbTime: timeMap(project) };
};

/** 每个 kb- 单元上次同步时的 起点:时长——同步时据此分辨"用户挪过"与"盘上真值变了"（syncKouboProject） */
const timeMap = (p: ProjectData): Record<string, string> =>
  Object.fromEntries(p.tracks.flatMap((t) => t.clips.filter((c) => c.id.startsWith(KB_ID_PREFIX)).map((c) => [c.id, `${c.start}:${c.duration}`])));

/** 把口播成片拆解为独立单元。promo 形态：字幕/转场/环境/数字人/23 镜头/配音/82 音效；skill 标准形态：见 buildSkillProject。
 *  已接入却不满足任一契约时抛错——不能默默用 stub 数据拼一份 promo 残骸（2026-09-21 评审 P0-1）；未接入时仍可用 stub 演示 promo 拆解。 */
export const buildKouboProject = (): ProjectData => {
  if (KB_LINKED && !KB_DECOMPOSABLE) throw new Error("接入工程不满足拆解契约（skill / promo 任一形态），不能拆解");
  return {
    ...(KB_FORM === "skill" ? buildSkillProject() : buildPromoProject()),
    kbProjectRoot: KB_PROJECT_ROOT,
  };
};

const buildPromoProject = (): ProjectData => {
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

  const project: ProjectData = {
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
      voiceTrack(),
      ...sfxTracks(),
    ],
  };
  return { ...project, kbSeen: project.tracks.flatMap((t) => t.clips.map((c) => c.id)), kbTime: timeMap(project) };
};

/** 增量同步（实时看板 L1）：按稳定 id 把新鲜拆解合进现有工程——
 *  - 同 id 的 clip：起点 / 时长跟新拆解（时间真值在 shots.json / 时间戳），props / 图层 / 变速 / 标签留用户改过的；
 *    例外：用户在工作台挪过 / 裁过的单元（当前 起点:时长 ≠ 上次同步值 kbTime）保留用户的，除非盘上真值自己也变了（agent 改了 cue / 镜头边界）——
 *    2026-09-21 起同步由文件变化自动触发，不能再把用户刚挪好的音效静默复位（评审 P1-1）；
 *  - 新增的单元补进对应轨（轨不在就新建）；拆解里已没有的 kb- clip 删掉；
 *  - 用户删掉的拆解单元不复活：工程 kbSeen 记着上次见过的 id，"新鲜有、工程没、见过"= 用户删的（2026-09-13 审计）；
 *  - 用户自己加的 clip（uid 前缀）与轨道顺序、隐藏状态一律不动。
 *  已知限制：分割过的 kb- clip 左半仍是 kb- id，同步会把它的时长重置成整段而右半（uid）留着 → 叠放；分割请在同步之后做。 */
export const syncKouboProject = (existing: ProjectData): ProjectData => {
  if (KB_LINKED && !KB_DECOMPOSABLE) return existing; // 契约不全：没有可信的新鲜拆解，绝不动用户工程（评审 P0-1：原先会改写成 stub 残骸且不可撤销）
  const fresh = buildKouboProject();
  if (!isKouboProject(existing)) return fresh;
  // 形态突变保险：新鲜拆解与现有工程一条 kb- 轨都对不上（如 skill ↔ promo 形态切换）——同步等于清空，放弃
  if (!fresh.tracks.some((t) => existing.tracks.some((x) => x.id === t.id))) return existing;
  const lastTime = existing.kbTime ?? {};
  const seen = new Set(existing.kbSeen ?? []);
  const freshClips = new Map<string, { clip: ClipData; trackId: string }>();
  for (const t of fresh.tracks) for (const c of t.clips) freshClips.set(c.id, { clip: c, trackId: t.id });

  const tracks = existing.tracks.map((t) => ({
    ...t,
    // 轨道属性（系统层标记）以新鲜拆解为准——老工程同步时把"幕级覆盖"收成系统层
    ...(fresh.tracks.find((x) => x.id === t.id)?.system !== undefined ? { system: fresh.tracks.find((x) => x.id === t.id)!.system } : {}),
    clips: t.clips
      .filter((c) => !c.id.startsWith(KB_ID_PREFIX) || c.id === "kb-live-main" || freshClips.has(c.id))
      .map((c) => {
        const f = freshClips.get(c.id);
        if (!f) return c;
        freshClips.delete(c.id);
        const last = lastTime[c.id];
        const userMoved = last !== undefined && `${c.start}:${c.duration}` !== last;
        const diskChanged = last !== undefined && `${f.clip.start}:${f.clip.duration}` !== last;
        const timing = userMoved && !diskChanged ? { start: c.start, duration: c.duration } : { start: f.clip.start, duration: f.clip.duration };
        const next = { ...c, ...timing, cardId: f.clip.cardId };
        // 旧拆解把带 `sfx/` 前缀的 cue 叠成了 sfx/sfx/…（音频 404）：同步时顺手修回新鲜拆解的路径，其余 props 仍留用户的
        if (typeof next.props.file === "string" && next.props.file.startsWith("sfx/sfx/")) {
          next.props = { ...next.props, file: f.clip.props.file };
          if (next.label?.startsWith("sfx/")) next.label = f.clip.label;
        }
        // 旧拆解的配音块写死 full.wav：工程里没有这个文件就换成实际解析到的配音文件（音量等其余 props 留用户的）
        if (c.id === kbId("full", "voice") && typeof next.props.file === "string" && next.props.file !== VOICE_FILE && !MEDIA_ITEMS.some((m) => m.file === next.props.file)) {
          next.props = { ...next.props, file: VOICE_FILE };
          if (next.label?.startsWith("配音 ")) next.label = f.clip.label;
        }
        return next;
      }),
  }));
  // 新增单元 → 其在新鲜拆解里所属的轨；轨不存在就按新鲜顺序补建
  for (const { clip, trackId } of freshClips.values()) {
    if (seen.has(clip.id)) continue; // 上次拆解就有、现在工程里没有 = 用户删的
    let t = tracks.find((x) => x.id === trackId);
    if (!t) {
      const ft = fresh.tracks.find((x) => x.id === trackId)!;
      t = { id: ft.id, name: ft.name, ...(ft.system ? { system: true } : {}), clips: [] };
      const at = fresh.tracks.findIndex((x) => x.id === trackId);
      tracks.splice(Math.min(at, tracks.length), 0, t);
    }
    t.clips.push(clip);
  }
  return { ...existing, tracks, kbSeen: fresh.kbSeen, kbTime: fresh.kbTime };
};

/** 拆解自动跟盘（实时看板）：工程是本片的拆解工程、且按盘上真值重拆后有变化 → 返回同步后的工程；否则 null。
 *  比较的是同步结果（用户改过的 props / 图层 / 删除已被 syncKouboProject 保住），所以"没变"就是真没变，调用方不用再判。 */
export const syncedIfChanged = (existing: ProjectData): ProjectData | null => {
  if (!KB_DECOMPOSABLE || !isKouboProject(existing)) return null; // 契约不全 / 不是本片拆解工程：不动（评审 P0-1）
  const next = syncKouboProject(existing);
  const key = (p: ProjectData) => JSON.stringify([p.tracks, p.kbSeen ?? [], p.kbTime ?? {}]);
  return key(next) === key(existing) ? null : next;
};
// 最新实现槽（hmr.ts）：本模块随接入源码 HMR 重执行，单例的 SSE 回调从这里取到带新鲜 SHOTS / SFX_CUES / phrases 的这一份
setLatest("syncedIfChanged", syncedIfChanged);
