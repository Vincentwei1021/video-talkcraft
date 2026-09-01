import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT, RADII, SHADOW_EVIDENCE } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";
import { SHOTS } from "@kbsrc/shots";

// kscene-s04 · 口播成片 S04「video-talkcraft · 78 张配方卡」逐镜参数化卡
// 已知边界：数字滚动落点踩「七十八」词锚（NumberRoll ≤26 帧到终值）、扇形卡错峰、
// 相机路径全部 FIXED——改文案/终值后节拍仍按原配音词锚走。
// 默认值渲染与原成片 PromoScene(Shell+Scene04) 逐像素一致。

const FPS = 30;
const IDX = 3; // s04
const { shot, lead, tail, total } = shotTiming(IDX);

// —— KouboShot 同款包装（KScale/Envelope 未导出，按原样复制）——
const SCALE = 960 / 1920;
const KScale: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: "0 0" }}>
      {children}
    </div>
  </AbsoluteFill>
);
const Envelope: React.FC<{ lead: number; tail: number; total: number; children: React.ReactNode }> =
  ({ lead: l, tail: tl, total: tt, children }) => {
    const frame = useCurrentFrame();
    let opacity = 1;
    if (l > 0) opacity *= interpolate(frame, [0, l], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
    if (tl > 0) opacity *= interpolate(frame, [tt - tl, tt], [1, 0], { extrapolateLeft: "clamp", easing: Easing.inOut(Easing.quad) });
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  };

// —— PromoScenes 顶部缓动 kit（逐字同式复制）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const rise = (p: number, y = 34): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * y}px) scale(${0.97 + 0.03 * p})` });
const cardBox: React.CSSProperties = { background: "#fff", border: `1px solid ${C.hairline}`, borderRadius: RADII.card };
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);

// 词级锚点：视觉节拍 = 字级时间戳 + 48ms 混音补偿（与成片 beats.json 同源）
const AV = 0.048;
const A = (si: number, q: string, occ = 0) => atChar(si, q, occ) + AV;
const ST = (n: number) => SHOTS[n - 1].start;

interface Props {
  headPre?: string;
  headAccent?: string;
  cardPrefix?: string;
  fanText?: string;
  fanTopText?: string;
  countTo?: number;
  countCaption?: string;
  countSub?: string;
  bgColor?: string;
  inkColor?: string;
  accentColor?: string;
  headSize?: number;
  countSize?: number;
  posX?: number;
  posY?: number;
}

// Scene04：扇形卡逐张入场 + 数字滚动落在「七十八」出口；数字未到词锚完全不可见
const KSceneS04: React.FC<Props> = ({
  headPre = "把常用动效做成一套",
  headAccent = "视觉词汇",
  cardPrefix = "CARD",
  fanText = "motion recipe",
  fanTopText = "video-talkcraft",
  countTo = 78,
  countCaption = "张动效配方卡",
  countSub = "每张都有可直接播放的 demo",
  bgColor = "#ffffff",
  inkColor = "#1d1d1f",
  accentColor = "#0066cc",
  headSize = 66,
  countSize = 166,
  posX = 145,
  posY = 180,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / FPS;

  const rollEnd = A(4, "七十八") - ST(4) + 0.42;
  const rollP = tw(t, rollEnd - 0.85, 0.85, power2Out);
  const n = Math.round(countTo * rollP);
  const capP = tw(t, rollEnd - 0.3, 0.4, power2Out);

  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: inkColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                {/* 原 left:145,right:145 → width 1630，随 posX/posY 整体平移 */}
                <div style={{ position: "absolute", left: posX, top: posY, width: 1630 }}>
                  <div style={{ fontSize: headSize, fontWeight: 600, ...rise(ease(t, 0.2, 0.55), 18) }}>{headPre}<span style={{ color: accentColor }}>{headAccent}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 170, marginTop: 75 }}>
                    <div style={{ position: "relative", width: 620, height: 420 }}>{Array.from({ length: 7 }).map((_, i) => {
                      const p = ease(t, 0.35 + i * 0.12, 0.7 + i * 0.12);
                      return <div key={i} style={{ position: "absolute", left: 70 + i * 36, top: 35 + i * 12, width: 400, height: 270, ...cardBox, boxShadow: i === 6 ? SHADOW_EVIDENCE : "none", transform: `rotate(${-10 + i * 3.1}deg) translateY(${(1 - p) * 60}px)`, opacity: p, background: i === 6 ? C.dark : "#fff", color: i === 6 ? "#fff" : inkColor, padding: 34 }}>
                        <div style={{ fontFamily: FONT.mono, fontSize: 22, letterSpacing: 0.6, fontWeight: 600, color: i === 6 ? "#8cc7ff" : accentColor }}>{cardPrefix} {String(i + 72).padStart(2, "0")}</div>
                        <div style={{ fontSize: 42, fontWeight: 600, marginTop: 80 }}>{i === 6 ? fanTopText : fanText}</div>
                      </div>;
                    })}</div>
                    {/* 数字未到「七十八」词锚完全不可见（禁提前灰显占位） */}
                    <div style={{ width: 400 }}>
                      <div style={{ fontSize: countSize, fontWeight: 600, color: accentColor, lineHeight: 0.85, fontVariantNumeric: "tabular-nums", opacity: tw(t, rollEnd - 0.95, 0.15, power1Out) }}>{n}</div>
                      <div style={{ fontSize: 46, fontWeight: 600, marginTop: 25, opacity: capP, transform: `translateY(${(1 - capP) * 14}px)` }}>{countCaption}</div>
                      <div style={{ fontSize: 28, color: C.dim, marginTop: 14, opacity: capP }}>{countSub}</div>
                    </div>
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
  id: "kscene-s04",
  name: "video-talkcraft · 78 张配方卡",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#0066cc",
  component: KSceneS04 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "headPre", label: "大标题 · 前段", default: "把常用动效做成一套" },
    { type: "text", key: "headAccent", label: "大标题 · 强调词", default: "视觉词汇" },
    { type: "text", key: "cardPrefix", label: "扇形卡眉题前缀", default: "CARD" },
    { type: "text", key: "fanText", label: "扇形卡标题（前 6 张）", default: "motion recipe" },
    { type: "text", key: "fanTopText", label: "扇形卡标题（顶张深色卡）", default: "video-talkcraft" },
    { type: "number", key: "countTo", label: "数字滚动终值", default: 78, min: 0, step: 1 },
    { type: "text", key: "countCaption", label: "数字下标题", default: "张动效配方卡" },
    { type: "text", key: "countSub", label: "数字下副行", default: "每张都有可直接播放的 demo" },
    { type: "color", key: "bgColor", label: "底色", default: "#ffffff" },
    { type: "color", key: "inkColor", label: "正文墨色", default: "#1d1d1f" },
    { type: "color", key: "accentColor", label: "强调色（强调词/眉题/大数字）", default: "#0066cc" },
    { type: "slider", key: "headSize", label: "大标题字号", default: 66, min: 40, max: 100, step: 1, unit: "px" },
    { type: "slider", key: "countSize", label: "大数字字号", default: 166, min: 90, max: 240, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 145, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 180, step: 1, unit: "px" },
  ],
};
