import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, tw } from "../shared";

// per-character-rise · 逐字升起 —— 参数化版（源出 tplcards/per-character-rise.tsx）
// 纯文字卡（不放主持人）：整屏交给这一句，"一股气顶上来"。
// 命门：位移 0.33s / 淡入 0.70s 两条不同缓动 + 逐字错峰 1 帧——全部 FIXED；
//       起始下沉恒为字号 44%（72px ⇒ 32px），随字号等比。
const FPS = 30;

const FIXED = {
  dur: 0.70,           // 淡入时长 s（源码 charDurationFrames 21 ÷ 30）
  travel: 0.3333,      // 位移时长 s（源码 charTravelFrames 10 ÷ 30）= dur 的 48%
  stagger: 0.0333,     // 逐字错峰 s（源码 staggerFrames 1 ÷ 30）
  riseRatio: 32 / 72,  // 起始下沉 ÷ 字号（比例恒为 44%）
};

// GSAP core 不带 CustomEase：自己解 cubic-bezier 的 x(t)=p 再取 y(t)（照抄 demo 解算器）
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return function (p: number) {
    let t = p;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - p;
      if (Math.abs(e) < 1e-6) break;
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = Math.max(0, Math.min(1, t));
    return ((ay * t + by) * t + cy) * t;
  };
}
const FADE_EASE   = cubicBezier(0.2, 0.8, 0.2, 1);      // 淡入：起手快、尾段长缓收
const TRAVEL_EASE = cubicBezier(0.2, 0.8, 0.6, 0.85);   // 位移：冲一下就滑到位（源码专用曲线）

interface Props {
  text?: string;
  ink?: string;
  fontSize?: number;
  lead?: number;
}

const PerCharacterRise: React.FC<Props> = ({
  text = "先想清楚，再动手",
  ink = "#171717",
  fontSize = 72,
  lead = 0.30,
}) => {
  const t = useCurrentFrame() / FPS;
  const rise = fontSize * FIXED.riseRatio;

  // Array.from 按码点切字：中文即逐汉字（标点也算一个字，跟着升起是对的）
  const chars = Array.from(text);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      {/* 整句在舞台正中；nowrap 是硬要求 */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        whiteSpace: "nowrap",
      }}>
        <span style={{
          fontSize,                    // 纯文字整屏（本卡起始下沉恒为字号 44%）
          fontWeight: 600,
          lineHeight: 1.25,
          color: ink,                  // 源码墨色，不是纯黑
          letterSpacing: "-0.05em",    // 源码值：整句略收紧
        }}>
          {chars.map((ch, i) => {
            const at = lead + i * FIXED.stagger;
            // 轨① 淡入：走满 dur（比位移长一倍，位移先停、淡入后停）
            const fadeP = tw(t, at, FIXED.dur, FADE_EASE);
            // 轨② 升起位移：只占前 travel，另一条缓动
            const y = lerp(rise, 0, tw(t, at, FIXED.travel, TRAVEL_EASE));
            return (
              <span key={i} style={{
                display: "inline-block",
                whiteSpace: "pre",
                backfaceVisibility: "hidden",
                transformOrigin: "50% 55%",   // 重心略偏下，升起收尾时字不往上飘
                opacity: fadeP,
                transform: `translateY(${y}px)`,
              }}>{ch}</span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "per-character-rise",
  name: "逐字升起",
  category: "字幕花字",
  durationInFrames: 85,
  accent: "#171717",
  component: PerCharacterRise as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "text", label: "整句文案（6~10 字）", default: "先想清楚，再动手" },
    { type: "slider", key: "fontSize", label: "字号", default: 72, min: 40, max: 110, step: 1, unit: "px" },
    { type: "color", key: "ink", label: "墨色", default: "#171717" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
