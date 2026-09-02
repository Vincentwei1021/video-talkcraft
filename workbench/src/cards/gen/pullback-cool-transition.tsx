import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, power1Out, power2Out, tw } from "../shared";

// pullback-cool-transition · 后拉冷却转场 —— 参数化版（源出 tplcards/pullback-cool-transition.tsx）
// 命门：出场"内容沉暗"（相机收住不推不拉，靠内容褪灰失焦交出画面）
//       + 入场全片唯一 scale<1 起步的后拉、节奏最慢——沉暗/交叠/后拉配比保持 FIXED。
const FPS = 30;

const FIXED = {
  holdEnd: 0.90,   // 入场镜收尾停留
  out: 0.50,       // 出场沉暗时长
  cutLead: 0.05,   // 切点提前量（本式最小，交接靠"暗"而不是"快"）
  overlap: 0.55,   // 交叠（像素淡化）时长 ≈ 16 帧 @30fps，本式交叠最长
  settle: 0.90,    // 入场后拉时长：全片最慢
  outDim: 0.18,    // 出场内容褪到多暗（白底=褪灰；深底工程沉入近黑）
  outBlur: 2,      // 出场内容失焦
  inScale: 0.90,   // 入场起手景别：全片唯一 <1
  inBlur: 4,
  inSettle: 0.99,  // 后拉落点：停在 0.99 而不是 1.0，留给 hold 继续推
};

const sineIn = (x: number) => 1 - Math.cos((x * Math.PI) / 2);
const sineOut = (x: number) => Math.sin((x * Math.PI) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// 镜头层超出画幅 14%（inset 对称 ⇒ 画面中心不变），后拉时不漏白边
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
  labelColor?: string;
  fontSize?: number;
  lead?: number;
}

const PullbackCoolTransition: React.FC<Props> = ({
  textA = "后拉冷却",
  textB = "呼吸落定",
  tag = "出场内容沉暗（相机收住）→ 入场从 0.90 后拉 · 全片最慢的一式",
  bgA = "#ffffff",
  bgB = "#f1f1f4",
  labelColor = "#8a8a8a",
  fontSize = 76,
  lead = 0.8,
}) => {
  const t = useCurrentFrame() / FPS;
  const cut = lead + FIXED.out - FIXED.cutLead;         // 默认 1.25
  const settleEnd = cut + FIXED.settle;                 // 默认 2.15

  // ── A（出场镜）：慢漂 → 内容沉暗（相机收住不推不拉），交叠期淡出 ──
  const aScale = t < lead
    ? lerp(1, 1.03, tw(t, 0, lead, sineInOut))
    : lerp(1.03, 1.0, tw(t, lead, FIXED.out, sineOut));   // 相机收住
  const aX = lerp(0, 10, tw(t, 0, lead, sineInOut));
  const aBigOpacity = lerp(1, FIXED.outDim, tw(t, lead, FIXED.out, sineIn));
  const aBigBlur = lerp(0, FIXED.outBlur, tw(t, lead, FIXED.out, sineIn));
  const aOpacity = 1 - tw(t, cut, FIXED.overlap, sineInOut);

  // ── B（入场镜）：全片唯一 scale<1 起步的后拉，交叠期淡入 ──
  const bOpacity = tw(t, cut, FIXED.overlap, sineInOut);
  const bScale = t < settleEnd
    ? lerp(FIXED.inScale, FIXED.inSettle, tw(t, cut, FIXED.settle, power2Out))
    : lerp(FIXED.inSettle, 1.02, tw(t, settleEnd, FIXED.holdEnd, sineInOut));
  const bBlur = lerp(FIXED.inBlur, 0, tw(t, cut, FIXED.settle, power2Out));

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  const bigStyle: React.CSSProperties = {
    fontSize, fontWeight: 800, color: labelColor,
    letterSpacing: 3, whiteSpace: "nowrap",
  };

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <div style={{
        ...SHOT, background: bgA,
        opacity: aOpacity, transform: `translate(${aX}px, 0px) scale(${aScale})`,
      }}>
        <div style={{ ...bigStyle, opacity: aBigOpacity, filter: `blur(${aBigBlur}px)` }}>
          {textA}
        </div>
      </div>
      <div style={{
        ...SHOT, background: bgB,
        opacity: bOpacity, transform: `scale(${bScale})`, filter: `blur(${bBlur}px)`,
      }}>
        <div style={bigStyle}>{textB}</div>
      </div>
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
  id: "pullback-cool-transition",
  name: "后拉冷却转场",
  category: "转场结构",
  durationInFrames: 104,
  accent: "#8a8a8a",
  component: PullbackCoolTransition as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "textA", label: "出场镜文字（被沉暗的内容）", default: "后拉冷却" },
    { type: "text", key: "textB", label: "入场镜文字", default: "呼吸落定" },
    { type: "text", key: "tag", label: "左上注释标签", default: "出场内容沉暗（相机收住）→ 入场从 0.90 后拉 · 全片最慢的一式" },
    { type: "slider", key: "fontSize", label: "示意大字字号", default: 76, min: 40, max: 110, step: 1, unit: "px" },
    { type: "color", key: "bgA", label: "出场镜底色", default: "#ffffff" },
    { type: "color", key: "bgB", label: "入场镜底色", default: "#f1f1f4" },
    { type: "color", key: "labelColor", label: "示意文字色", default: "#8a8a8a" },
    { type: "slider", key: "lead", label: "起手静置（出场镜停留）", default: 0.8, min: 0.3, max: 1.5, step: 0.05, unit: "s" },
  ],
};
