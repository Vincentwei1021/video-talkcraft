import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT, RADII, SHADOW_EVIDENCE } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";

// kscene-s16 · 术语卡进出 —— 口播成片 Scene16 的逐镜参数化卡
// 已知边界：词锚时刻（A(22,'术语卡')）、进出场时长/错峰、相机路径全部 FIXED——
// 改文案后动画节拍仍按原配音的词锚时刻走，不随新文案重排。
const FPS = 30;
const IDX = 15; // s16
const TIMING = shotTiming(IDX);

// —— PromoScenes 顶部 helpers（逐字同式复制）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);

// —— 词锚（FIXED）：视觉节拍 = 字级时间戳 + 47.7ms 混音补偿 ——
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const AT_CARD: number = A(22, "术语卡") - TIMING.shot.start; // 术语卡入场词锚

// —— KouboShot 同构的包装件（koubo-units 未导出，按原样复制）——
const SCALE = 960 / 1920;
const KScale: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: "0 0" }}>
      {children}
    </div>
  </AbsoluteFill>
);
const Envelope: React.FC<{ lead: number; tail: number; total: number; children: React.ReactNode }> =
  ({ lead, tail, total, children }) => {
    const frame = useCurrentFrame();
    let opacity = 1;
    if (lead > 0) opacity *= interpolate(frame, [0, lead], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
    if (tail > 0) opacity *= interpolate(frame, [total - tail, total], [1, 0], { extrapolateLeft: "clamp", easing: Easing.inOut(Easing.quad) });
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  };

interface Props {
  title?: string;
  term?: string;
  desc?: string;
  accentColor?: string;
  inkColor?: string;
  cardBg?: string;
  bgColor?: string;
  titleSize?: number;
  termSize?: number;
  descSize?: number;
  posX?: number;
  posY?: number;
}

const KsceneS16: React.FC<Props> = ({
  title = "专业名词，念完自己走",
  term = "主要视觉任务",
  desc = "一镜只承担一个核心画面任务",
  accentColor = "#0066cc",
  inkColor = "#1d1d1f",
  cardBg = "#ffffff",
  bgColor = "#ffffff",
  titleSize = 62,
  termSize = 60,
  descSize = 44,
  posX = 210,
  posY = 190,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - TIMING.lead) / FPS;

  // —— Scene16 原式（节拍 FIXED）——
  const p = tw(t, AT_CARD, 0.4, power2Out);
  const out = ease(t, 3.55, 4.2);

  return (
    <KScale>
      <Envelope lead={TIMING.lead} tail={TIMING.tail} total={TIMING.total}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={TIMING.shot.path} impulses={TIMING.shot.impulses} durationSec={TIMING.shot.end - TIMING.shot.start} leadFrames={TIMING.lead}>
            <AbsoluteFill style={{ background: bgColor, color: inkColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: 1320 }}>
                  <div style={{ fontSize: titleSize, fontWeight: 600 }}>{title}</div>
                  <div style={{
                    marginTop: 80, width: 1080,
                    background: cardBg, border: `1px solid ${C.hairline}`, borderRadius: RADII.card,
                    padding: "56px 62px",
                    transform: `translateX(${(1 - p) * 220 - out * 180}px) scale(${1 - out * 0.04})`,
                    opacity: p * (1 - out), boxShadow: SHADOW_EVIDENCE,
                  }}>
                    <div style={{ fontSize: termSize, fontWeight: 600, color: accentColor }}>{term}</div>
                    <div style={{ fontSize: descSize, fontWeight: 600, marginTop: 32 }}>{desc}</div>
                  </div>
                </div>
              </Plane>
            </AbsoluteFill>
          </CameraRig>
        </AbsoluteFill>
      </Envelope>
    </KScale>
  );
};

export const card: CardDef = {
  id: "kscene-s16",
  name: "术语卡进出",
  category: "口播镜头",
  durationInFrames: TIMING.total,
  accent: "#0066cc",
  component: KsceneS16 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "镜头标题", default: "专业名词，念完自己走" },
    { type: "text", key: "term", label: "术语（卡内大字）", default: "主要视觉任务" },
    { type: "text", key: "desc", label: "释义（卡内副行）", default: "一镜只承担一个核心画面任务" },
    { type: "color", key: "accentColor", label: "强调色（术语）", default: "#0066cc" },
    { type: "color", key: "inkColor", label: "文字墨色", default: "#1d1d1f" },
    { type: "color", key: "cardBg", label: "术语卡底色", default: "#ffffff" },
    { type: "color", key: "bgColor", label: "画面底色", default: "#ffffff" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 62, min: 36, max: 96, step: 1, unit: "px" },
    { type: "slider", key: "termSize", label: "术语字号", default: 60, min: 36, max: 96, step: 1, unit: "px" },
    { type: "slider", key: "descSize", label: "释义字号", default: 44, min: 24, max: 72, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 210, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 190, step: 1, unit: "px" },
  ],
};
