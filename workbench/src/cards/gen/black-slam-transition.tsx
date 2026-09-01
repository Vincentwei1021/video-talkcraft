import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, hexToRgb, lerp, linear, power1Out, power2Out, power4Out, tw } from "../shared";

// black-slam-transition · 黑震切转场 —— 参数化版（源出 tplcards/black-slam-transition.tsx）
// 命门：定格一拍 → 零交叠硬切（hardOut）；重音冲顶/回落、入场震一拍三段递减、
//       后拉刹住的时长配比全部保持 FIXED——只放出文案 / 底色 / 重音色 / 起手静置。
const FPS = 30;

const FIXED = {
  holdEnd: 0.90,    // 入场镜收尾停留
  freeze: 0.34,     // 定格时长：全片唯一不动的一拍，是硬切的预备拍
  punch: 0.12,      // 重音冲顶时长（切点前）
  peak: 0.34,       // 重音峰值（白底暗压；深底改白色过曝）
  fall: 0.20,       // 切点后重音回落
  kick: 0.50,       // 入场后拉刹住时长
  kickScale: 1.10,  // 入场起手景别（满亮直切时就已经在动）
  shake: 9,         // 震位幅度 px：三段递减，只在切点一拍发生
};

const power3In = (x: number) => x * x * x * x;
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// 镜头层超出画幅 14%（inset 对称 ⇒ 画面中心不变），震/拉时不漏白边
const SHOT: React.CSSProperties = {
  position: "absolute", inset: "-14%", display: "flex",
  alignItems: "center", justifyContent: "center",
  willChange: "transform, filter, opacity",
};

interface Props {
  textA?: string;
  textB?: string;
  tag?: string;
  bgA?: string;
  bgB?: string;
  flashColor?: string;
  labelColor?: string;
  fontSize?: number;
  lead?: number;
}

const BlackSlamTransition: React.FC<Props> = ({
  textA = "黑震切",
  textB = "满亮直切",
  tag = "定格一拍 → 零交叠硬切 · 入场自带震一拍 + 后拉刹住（全片限一次）",
  bgA = "#ffffff",
  bgB = "#f1f1f4",
  flashColor = "#141418",
  labelColor = "#8a8a8a",
  fontSize = 76,
  lead = 0.8,
}) => {
  const t = useCurrentFrame() / FPS;
  const cut = lead + FIXED.punch;                       // 默认 0.92
  const kickEnd = cut + FIXED.kick;                     // 默认 1.42

  // ── A（出场镜）：前段慢推 + 末段定格（定格是黑震切的预备拍），切点直接消失 ──
  const aScale = lerp(1, 1.06, tw(t, 0, lead - FIXED.freeze, sineInOut));
  const aOpacity = t < cut ? 1 : 0;   // hardOut：不淡出，直接消失

  // ── 重音层：切点前冲顶、切点后回落 ──
  const flashOpacity = t < cut
    ? lerp(0, FIXED.peak, tw(t, lead, FIXED.punch, power3In))
    : lerp(FIXED.peak, 0, tw(t, cut, FIXED.fall, power2Out));

  // ── B（入场镜）：满亮直切 + 震一拍（三段递减）+ 后拉刹住 ──
  const bOpacity = t < cut ? 0 : 1;
  let bX = 0;
  if (t >= cut && t < cut + 0.06) bX = lerp(FIXED.shake, -FIXED.shake * 0.55, tw(t, cut, 0.06, linear));
  else if (t >= cut + 0.06 && t < cut + 0.12) bX = lerp(-FIXED.shake * 0.55, FIXED.shake * 0.28, tw(t, cut + 0.06, 0.06, linear));
  else if (t >= cut + 0.12 && t < cut + 0.20) bX = lerp(FIXED.shake * 0.28, 0, tw(t, cut + 0.12, 0.08, power2Out));
  else if (t >= kickEnd) bX = lerp(0, 10, tw(t, kickEnd, FIXED.holdEnd, sineInOut));   // hold 慢漂
  const bScale = t < kickEnd
    ? lerp(FIXED.kickScale, 1.0, tw(t, cut, FIXED.kick, power4Out))
    : lerp(1.0, 1.03, tw(t, kickEnd, FIXED.holdEnd, sineInOut));

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  const bigStyle: React.CSSProperties = {
    fontSize, fontWeight: 800, color: labelColor,
    letterSpacing: 3, whiteSpace: "nowrap",
  };
  const [fr, fg, fb] = hexToRgb(flashColor);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <div style={{ ...SHOT, background: bgA, opacity: aOpacity, transform: `scale(${aScale})` }}>
        <div style={bigStyle}>{textA}</div>
      </div>
      <div style={{
        ...SHOT, background: bgB,
        opacity: bOpacity, transform: `translate(${bX}px, 0px) scale(${bScale})`,
      }}>
        <div style={bigStyle}>{textB}</div>
      </div>
      {/* 转场重音层：白底"暗压闪"；深底工程把重音色换白即成径向过曝，包络不动 */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6,
        background: `radial-gradient(ellipse at 50% 46%, rgba(${fr},${fg},${fb},1) 0%, rgba(${fr},${fg},${fb},.55) 45%, rgba(${fr},${fg},${fb},.2) 80%)`,
        opacity: flashOpacity,
      }} />
      <div style={{
        position: "absolute", left: 24, top: 20, fontSize: 17, color: "#8a8a8a",
        borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
        borderRadius: 999, padding: "4px 14px", zIndex: 7,
        opacity: tagOpacity,
      }}>
        {tag}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "black-slam-transition",
  name: "黑震切转场",
  category: "转场结构",
  durationInFrames: 82,
  accent: "#141418",
  component: BlackSlamTransition as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "textA", label: "出场镜文字", default: "黑震切" },
    { type: "text", key: "textB", label: "入场镜文字", default: "满亮直切" },
    { type: "text", key: "tag", label: "左上注释标签", default: "定格一拍 → 零交叠硬切 · 入场自带震一拍 + 后拉刹住（全片限一次）" },
    { type: "slider", key: "fontSize", label: "示意大字字号", default: 76, min: 40, max: 110, step: 1, unit: "px" },
    { type: "color", key: "bgA", label: "出场镜底色", default: "#ffffff" },
    { type: "color", key: "bgB", label: "入场镜底色", default: "#f1f1f4" },
    { type: "color", key: "flashColor", label: "重音闪色（白底暗压/深底改白）", default: "#141418" },
    { type: "color", key: "labelColor", label: "示意文字色", default: "#8a8a8a" },
    { type: "slider", key: "lead", label: "起手静置（出场镜停留）", default: 0.8, min: 0.4, max: 1.5, step: 0.05, unit: "s" },
  ],
};
