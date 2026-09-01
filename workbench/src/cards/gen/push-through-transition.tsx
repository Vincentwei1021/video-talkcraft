import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, power1Out, power2Out, tw } from "../shared";

// push-through-transition · 推穿转场 —— 参数化版（源出 tplcards/push-through-transition.tsx）
// 命门：出场加速推 + 入场从模糊高位反向沉降，两侧运动必须同向（都在"往里推"这条轴上）；
//       推/交叠/沉降的时长与景别配比保持 FIXED——只放出文案 / 底色 / 字号 / 起手静置。
const FPS = 30;

const FIXED = {
  holdEnd: 0.90,   // 入场镜收尾停留
  out: 0.55,       // 出场加速推时长 s：从静止直接推=没有预备拍
  cutLead: 0.10,   // 切点提前量：交叠期在出场推到顶之前就开始
  overlap: 0.45,   // 交叠（像素淡化）时长 ≈ 13 帧 @30fps
  settle: 0.60,    // 入场沉降时长
  outScale: 1.35,  // 出场推到多大（"穿过去"的量）
  outBlur: 7,      // 出场末端失焦
  inScale: 1.16,   // 入场起手景别（>1 = 从高位往回沉，与出场同向）
  inBlur: 7,       // 入场起手失焦
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
  labelColor?: string;
  fontSize?: number;
  lead?: number;
}

const PushThroughTransition: React.FC<Props> = ({
  textA = "推穿",
  textB = "同向沉降",
  tag = "出场加速推 → 入场从模糊高位反向沉降 · 两侧同向",
  bgA = "#ffffff",
  bgB = "#f1f1f4",
  labelColor = "#8a8a8a",
  fontSize = 76,
  lead = 0.8,
}) => {
  const t = useCurrentFrame() / FPS;
  const cut = lead + FIXED.out - FIXED.cutLead;         // 默认 1.25
  const settleEnd = cut + FIXED.settle;                 // 默认 1.85

  // ── A（出场镜）：hold 慢推 → 加速推穿 + 失焦，交叠期淡出 ──
  const aScale = t < lead
    ? lerp(1, 1.05, tw(t, 0, lead, sineInOut))
    : lerp(1.05, FIXED.outScale, tw(t, lead, FIXED.out, power2In));
  const aBlur = lerp(0, FIXED.outBlur, tw(t, lead, FIXED.out, power2In));
  const aOpacity = 1 - tw(t, cut, FIXED.overlap, power1InOut);

  // ── B（入场镜）：从模糊高位反向沉降到 1.03（进场即自带运动），交叠期淡入 ──
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
  id: "push-through-transition",
  name: "推穿转场",
  category: "转场结构",
  durationInFrames: 95,
  accent: "#8a8a8a",
  component: PushThroughTransition as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "textA", label: "出场镜文字", default: "推穿" },
    { type: "text", key: "textB", label: "入场镜文字", default: "同向沉降" },
    { type: "text", key: "tag", label: "左上注释标签", default: "出场加速推 → 入场从模糊高位反向沉降 · 两侧同向" },
    { type: "slider", key: "fontSize", label: "示意大字字号", default: 76, min: 40, max: 110, step: 1, unit: "px" },
    { type: "color", key: "bgA", label: "出场镜底色", default: "#ffffff" },
    { type: "color", key: "bgB", label: "入场镜底色", default: "#f1f1f4" },
    { type: "color", key: "labelColor", label: "示意文字色", default: "#8a8a8a" },
    { type: "slider", key: "lead", label: "起手静置（出场镜停留）", default: 0.8, min: 0.3, max: 1.5, step: 0.05, unit: "s" },
  ],
};
