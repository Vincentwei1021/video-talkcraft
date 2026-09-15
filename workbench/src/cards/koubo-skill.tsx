import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { CardDef, PropField } from "./types";
// skill 标准工程（SKILL.md ⑤ 产出）的拆解单元卡：逐镜（SCENES + SCENE_PARAMS）/ 字幕句（SubtitleLine）/ 幕底（Environment）/ 幕级覆盖（Overlays）/ 转场标记
import { CameraRig } from "../kb/camera";
import { Environment, Overlays } from "../kb/Environment";
import { ParamsProvider } from "../kb/params";
import { SCENES, SCENE_PARAMS } from "../kb/scenes";
import { FPS, SHOTS, TOTAL_FRAMES, type Shot } from "../kb/shots";
import { SubtitleLine } from "../kb/Subtitles";
import { KB_COMP, KB_MODULES, KB_SKILL } from "../kbMeta";

/** 非 skill 形态工程：这组卡不列出（已存工程仍可引用） */
const SKILL_ONLY = !KB_SKILL;

/** 画布 ≠ 工程原尺寸时等比缩进（kb-main 同法）；相等时直通，工程内 useVideoConfig 读到真值 */
const Fit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  if (width === KB_COMP.width && height === KB_COMP.height) return <>{children}</>;
  const scale = Math.min(width / KB_COMP.width, height / KB_COMP.height);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", width: KB_COMP.width, height: KB_COMP.height,
          left: (width - KB_COMP.width * scale) / 2, top: (height - KB_COMP.height * scale) / 2,
          transform: `scale(${scale})`, transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** 与工程 Main 的 Envelope 同构：lead 淡入 / tail 淡出 / hardOut（黑震切）最后 1 帧归零 */
const Envelope: React.FC<{ lead: number; tail: number; total: number; hardOut?: boolean; children: React.ReactNode }> =
  ({ lead, tail, total, hardOut, children }) => {
    const frame = useCurrentFrame();
    let opacity = 1;
    if (lead > 0) opacity *= interpolate(frame, [0, lead], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
    if (hardOut) opacity *= frame >= total - 1 ? 0 : 1;
    else if (tail > 0) opacity *= interpolate(frame, [total - tail, total], [1, 0], { extrapolateLeft: "clamp", easing: Easing.inOut(Easing.quad) });
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  };

/** 镜头落位（与工程 shots.ts 的 shotSequence 同规则）：段起点 Math.round(start·fps)，叙事帧数 = 下一镜起点 − 本镜起点，
 *  Sequence 从 起点 − lead 起、长 lead + 叙事 + tail（lead / tail 是帧；skill 工程每镜自带，缺则 0） */
export const shotFrames = (i: number) => {
  const shot = SHOTS[i];
  const startF = Math.round(shot.start * FPS);
  const nextF = i + 1 < SHOTS.length ? Math.round(SHOTS[i + 1].start * FPS) : TOTAL_FRAMES;
  const lead = shot.lead ?? 0, tail = shot.tail ?? 0;
  const narration = Math.max(1, nextF - startF);
  return { shot, startF, lead, tail, narration, from: startF - lead, total: lead + narration + tail };
};

/** 逐镜：包络 + 运镜 + 场景，片段 props 经 ParamsProvider 注入场景的 useParams（工程 overrides.json 在 Player 里被 props 盖住，渲染时才读它） */
const SkillShot: React.FC<{ shotId: string } & Record<string, unknown>> = ({ shotId, ...props }) => {
  const i = SHOTS.findIndex((s: Shot) => s.id === shotId);
  if (i < 0) return null;
  const { shot, lead, tail, total } = shotFrames(i);
  const Scene = SCENES[shot.id];
  if (!Scene) return null;
  return (
    <Fit>
      <Envelope lead={lead} tail={tail} total={total} hardOut={shot.hardOut}>
        <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
          <ParamsProvider values={props}>
            <Scene shot={shot as unknown as Record<string, unknown>} />
          </ParamsProvider>
        </CameraRig>
      </Envelope>
    </Fit>
  );
};

const FIELD_TYPES = new Set(["text", "textarea", "number", "slider", "color", "select", "boolean"]);
/** 工程 SCENE_PARAMS 里的字段表 → 属性面板控件（形态与 PropField 相同；不合规的条目丢弃，不让整张卡挂） */
const toFields = (raw: unknown): PropField[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is PropField => {
    if (!f || typeof f !== "object") return false;
    const o = f as Record<string, unknown>;
    if (!FIELD_TYPES.has(String(o.type)) || typeof o.key !== "string" || typeof o.label !== "string" || !("default" in o)) return false;
    if (o.type === "select" && !Array.isArray(o.options)) return false;
    if (o.type === "slider" && !(typeof o.min === "number" && typeof o.max === "number" && typeof o.step === "number")) return false;
    return true;
  });
};

export const KSHOT_PREFIX = "kshot-";
/** 逐镜参数化卡（按接入工程的 SHOTS × SCENE_PARAMS 生成；替代宣传片时代手抄的 kscene-sNN） */
export const KSHOT_CARDS: CardDef[] = KB_SKILL
  ? SHOTS.map((shot: Shot, i: number) => {
      const id = shot.id;
      const Comp: React.FC<Record<string, unknown>> = (props) => <SkillShot shotId={id} {...props} />;
      return {
        id: `${KSHOT_PREFIX}${id}`,
        name: `镜头 ${id}`,
        category: "口播镜头",
        durationInFrames: shotFrames(i).total,
        accent: "#4c9aff",
        component: Comp,
        schema: toFields(SCENE_PARAMS[id]),
      };
    })
  : [];

/** 字幕句（工程自己的 SubtitleLine：素排 / 深浅底样式与成片同一份） */
const KSubtitleLine: React.FC<{ text?: string; dark?: boolean }> = ({ text = "", dark = false }) => (
  <Fit><SubtitleLine text={text} dark={dark} /></Fit>
);
export const kskillSubtitleLineCard: CardDef = {
  id: "kskill-subtitle-line",
  name: "字幕句（工程样式）",
  category: "口播拆解",
  hidden: SKILL_ONLY,
  durationInFrames: 60,
  accent: "#ffd60a",
  component: KSubtitleLine as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "text", label: "字幕文本", default: "" },
    { type: "boolean", key: "dark", label: "深底样式（白字黑描边）", default: false },
  ],
};

/** 幕底（工程 Environment：分幕幕底画布，绝对时间驱动，铺满全片、垫在全部镜头之下） */
export const kskillBackdropCard: CardDef = {
  id: "kskill-backdrop",
  name: "幕底（分幕画布）",
  category: "口播拆解",
  hidden: SKILL_ONLY || !KB_MODULES["Environment"],
  durationInFrames: TOTAL_FRAMES,
  accent: "#8e8e93",
  component: (() => <Fit><Environment /></Fit>) as React.ComponentType<Record<string, unknown>>,
  schema: [],
};

/** 幕级覆盖（工程 Overlays：黑震切帧 / 落幕压黑，压在全部镜头之上、字幕之下） */
export const kskillOverlaysCard: CardDef = {
  id: "kskill-overlays",
  name: "幕级覆盖（黑震切 / 落幕）",
  category: "口播拆解",
  hidden: SKILL_ONLY || !KB_MODULES["Environment"],
  durationInFrames: TOTAL_FRAMES,
  accent: "#5e5ce6",
  component: (() => <Fit><Overlays /></Fit>) as React.ComponentType<Record<string, unknown>>,
  schema: [],
};

/** 转场标记：skill 工程的转场（推穿 / 横甩 / 过曝 / 黑震切 / 后拉）烤在相邻镜头的 lead/tail 运镜里，拆不出独立画面——
 *  这张卡只在时间轨上标出切点与式样，不画任何东西；挪它不改成片 */
export const kskillMarkerCard: CardDef = {
  id: "kskill-marker",
  name: "转场标记",
  category: "口播拆解",
  hidden: SKILL_ONLY,
  durationInFrames: 8,
  accent: "#75baff",
  component: (() => null) as React.ComponentType<Record<string, unknown>>,
  schema: [{ type: "text", key: "note", label: "转场（只读标记，随镜头 lead/tail 固定）", default: "" }],
};

export const KSKILL_CARDS: CardDef[] = [...KSHOT_CARDS, kskillSubtitleLineCard, kskillBackdropCard, kskillOverlaysCard, kskillMarkerCard];
