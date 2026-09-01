import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, power1Out, power3Out, tw } from "../shared";

// whip-pan-transition · 横甩转场 —— 参数化版（源出 tplcards/whip-pan-transition.tsx）
// 命门：出场甩出 + blur + 微旋 → 入场从对侧同向滑回 0（= 同一次横扫），刹住 + 二段回稳；
//       甩出/交叠/刹车/回稳的时长与位移配比保持 FIXED——只放出文案 / 底色 / 字号 / 起手静置。
const FPS = 30;

const FIXED = {
  holdEnd: 0.90,   // 入场镜收尾停留
  out: 0.42,       // 出场甩出时长（加速段）
  cutLead: 0.06,   // 切点提前量：甩到最快的那一刻换场
  overlap: 0.30,   // 交叠（像素淡化）时长 ≈ 9 帧 @30fps，甩镜的交叠比推穿短
  brake: 0.35,     // 入场刹车时长：不刹直接停 = 撞墙
  recover: 0.50,   // 二段回稳（只收旋转）
  dist: 560,       // 甩出位移 px（按舞台宽 960 折算 ≈ 0.58 屏宽）
  blur: 8,         // 甩镜失焦
  rot: 1.4,        // 微旋角度 deg：甩镜的"手持感"来源
};

const power3In = (x: number) => x * x * x * x;
const sineOut = (x: number) => Math.sin((x * Math.PI) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// 相机会横甩 560px：镜头层做成超出画幅 14%（inset 对称 ⇒ 画面中心不变），甩镜时不漏白边
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

const WhipPanTransition: React.FC<Props> = ({
  textA = "横甩",
  textB = "同向刹住",
  tag = "向左甩出 → 从右侧同向滑回 · 0.35s 刹住 + 二段回稳",
  bgA = "#ffffff",
  bgB = "#f1f1f4",
  labelColor = "#8a8a8a",
  fontSize = 76,
  lead = 0.8,
}) => {
  const t = useCurrentFrame() / FPS;
  const cut = lead + FIXED.out - FIXED.cutLead;         // 默认 1.16
  const brakeEnd = cut + FIXED.brake;                   // 默认 1.51

  // ── A（出场镜）：hold 慢推 → 向左甩出 + 微旋 + 失焦，切点后淡出 ──
  const aScale = lerp(1, 1.04, tw(t, 0, lead, sineInOut));
  const aX = lerp(0, -FIXED.dist, tw(t, lead, FIXED.out, power3In));
  const aRot = lerp(0, -FIXED.rot, tw(t, lead, FIXED.out, power3In));
  const aBlur = lerp(0, FIXED.blur, tw(t, lead, FIXED.out, power3In));
  const aOpacity = 1 - tw(t, cut, FIXED.overlap, power1Out);

  // ── B（入场镜）：从右侧同向滑回 0，刹住 + 二段回稳（只收旋转）──
  const bOpacity = tw(t, cut, 0.12, power1Out);
  const bX = lerp(FIXED.dist, 0, tw(t, cut, FIXED.brake, power3Out));
  const bBlur = lerp(FIXED.blur, 0, tw(t, cut, FIXED.brake, power3Out));
  const bRot = t < brakeEnd
    ? lerp(FIXED.rot, FIXED.rot * 0.3, tw(t, cut, FIXED.brake, power3Out))
    : lerp(FIXED.rot * 0.3, 0, tw(t, brakeEnd, FIXED.recover, sineOut));
  // 二段回稳只收旋转，scale 交给紧接着的 hold（= 进场即自带运动，不撞墙）
  const bScale = t < brakeEnd
    ? lerp(1.06, 1.02, tw(t, cut, FIXED.brake, power3Out))
    : lerp(1.02, 1.06, tw(t, brakeEnd, FIXED.holdEnd, sineInOut));

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  // 镜头里只有式名大字——这是给人认式子用的标签，不是台词字幕
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
        opacity: aOpacity, filter: `blur(${aBlur}px)`,
        transform: `translate(${aX}px, 0px) rotate(${aRot}deg) scale(${aScale})`,
      }}>
        <div style={bigStyle}>{textA}</div>
      </div>
      <div style={{
        ...SHOT, background: bgB,
        opacity: bOpacity, filter: `blur(${bBlur}px)`,
        transform: `translate(${bX}px, 0px) rotate(${bRot}deg) scale(${bScale})`,
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
  id: "whip-pan-transition",
  name: "横甩转场",
  category: "转场结构",
  durationInFrames: 84,
  accent: "#8a8a8a",
  component: WhipPanTransition as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "textA", label: "出场镜文字", default: "横甩" },
    { type: "text", key: "textB", label: "入场镜文字", default: "同向刹住" },
    { type: "text", key: "tag", label: "左上注释标签", default: "向左甩出 → 从右侧同向滑回 · 0.35s 刹住 + 二段回稳" },
    { type: "slider", key: "fontSize", label: "示意大字字号", default: 76, min: 40, max: 110, step: 1, unit: "px" },
    { type: "color", key: "bgA", label: "出场镜底色", default: "#ffffff" },
    { type: "color", key: "bgB", label: "入场镜底色", default: "#f1f1f4" },
    { type: "color", key: "labelColor", label: "示意文字色", default: "#8a8a8a" },
    { type: "slider", key: "lead", label: "起手静置（出场镜停留）", default: 0.8, min: 0.3, max: 1.5, step: 0.05, unit: "s" },
  ],
};
