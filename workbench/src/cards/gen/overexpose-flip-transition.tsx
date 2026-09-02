import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, hexToRgb, lerp, power1Out, power2Out, tw } from "../shared";

// overexpose-flip-transition · 过曝翻页转场 —— 参数化版（源出 tplcards/overexpose-flip-transition.tsx）
// 命门：出场推向证据物到 1.5x + 重音层以切点为锚的不对称包络（升 0.26s / 落 0.42s）
//       + 入场 from 1.30 从亮心拉出——推/交叠/沉降配比保持 FIXED。
const FPS = 30;

const FIXED = {
  holdEnd: 0.90,   // 入场镜收尾停留
  out: 0.55,       // 出场推时长
  cutLead: 0.10,   // 切点提前量
  overlap: 0.40,   // 交叠（像素淡化）时长 ≈ 12 帧 @30fps
  settle: 0.55,    // 入场沉降时长
  outScale: 1.50,  // 推到 1.5x = "推进证据物"
  outBlur: 4,      // 出场失焦比推穿轻（亮心要看得清）
  inScale: 1.30,   // 入场起手景别（从亮心里被拉出来）
  inBlur: 6,
  peak: 0.10,      // 重音峰值（白底暗压 6~10%；深底改白色过曝 0.42~0.55）
  rise: 0.26,      // 切点前升到峰值
  fall: 0.42,      // 切点后回落
};

const power2In = (x: number) => x * x * x;
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// 镜头层超出画幅 14%（inset 对称 ⇒ 画面中心不变），推近/沉降时不漏白边
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

const OverexposeFlipTransition: React.FC<Props> = ({
  textA = "过曝翻页",
  textB = "从亮心拉出",
  tag = "推到 1.5x + 重音冲顶 · 包络以切点为锚（升 0.26s / 落 0.42s）",
  bgA = "#ffffff",
  bgB = "#f1f1f4",
  flashColor = "#141418",
  labelColor = "#8a8a8a",
  fontSize = 76,
  lead = 0.8,
}) => {
  const t = useCurrentFrame() / FPS;
  const cut = lead + FIXED.out - FIXED.cutLead;         // 默认 1.25
  const settleEnd = cut + FIXED.settle;                 // 默认 1.80

  // ── A（出场镜）：hold 慢推 → 推进证据物 + 轻失焦，交叠期淡出 ──
  const aScale = t < lead
    ? lerp(1, 1.05, tw(t, 0, lead, sineInOut))
    : lerp(1.05, FIXED.outScale, tw(t, lead, FIXED.out, power2In));
  const aBlur = lerp(0, FIXED.outBlur, tw(t, lead, FIXED.out, power2In));
  const aOpacity = 1 - tw(t, cut, FIXED.overlap, power1InOut);

  // ── 重音层：不对称包络以切点为锚——切前 rise 升到峰值、切后 fall 回落 ──
  const flashOpacity = t < cut
    ? lerp(0, FIXED.peak, tw(t, cut - FIXED.rise, FIXED.rise, power2In))
    : lerp(FIXED.peak, 0, tw(t, cut, FIXED.fall, power2Out));

  // ── B（入场镜）：from 1.30 从亮心拉出，交叠期淡入 ──
  const bOpacity = tw(t, cut, FIXED.overlap, power1InOut);
  const bScale = t < settleEnd
    ? lerp(FIXED.inScale, 1.03, tw(t, cut, FIXED.settle, power2Out))
    : lerp(1.03, 1.07, tw(t, settleEnd, FIXED.holdEnd, sineInOut));
  const bBlur = lerp(FIXED.inBlur, 0, tw(t, cut, FIXED.settle, power2Out));

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
      <div style={{
        ...SHOT, background: bgA,
        opacity: aOpacity, transform: `scale(${aScale})`, filter: `blur(${aBlur}px)`,
      }}>
        <div style={bigStyle}>{textA}</div>
      </div>
      <div style={{
        ...SHOT, background: bgB,
        opacity: bOpacity, transform: `scale(${bScale})`, filter: `blur(${bBlur}px)`,
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
  id: "overexpose-flip-transition",
  name: "过曝翻页转场",
  category: "转场结构",
  durationInFrames: 93,
  accent: "#141418",
  component: OverexposeFlipTransition as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "textA", label: "出场镜文字", default: "过曝翻页" },
    { type: "text", key: "textB", label: "入场镜文字", default: "从亮心拉出" },
    { type: "text", key: "tag", label: "左上注释标签", default: "推到 1.5x + 重音冲顶 · 包络以切点为锚（升 0.26s / 落 0.42s）" },
    { type: "slider", key: "fontSize", label: "示意大字字号", default: 76, min: 40, max: 110, step: 1, unit: "px" },
    { type: "color", key: "bgA", label: "出场镜底色", default: "#ffffff" },
    { type: "color", key: "bgB", label: "入场镜底色", default: "#f1f1f4" },
    { type: "color", key: "flashColor", label: "重音闪色（白底暗压/深底改白）", default: "#141418" },
    { type: "color", key: "labelColor", label: "示意文字色", default: "#8a8a8a" },
    { type: "slider", key: "lead", label: "起手静置（出场镜停留）", default: 0.8, min: 0.3, max: 1.5, step: 0.05, unit: "s" },
  ],
};
