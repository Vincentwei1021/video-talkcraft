import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, tw } from "../shared";

// soft-blur-in · 柔焦淡入 —— 参数化版（源出 tplcards/soft-blur-in.tsx）
// 命门：解糊+淡入走满 0.9s，y 位移只占前 0.3s（位移先停、解糊后停——柔性的来源）；
//       逐字错峰只有 1 帧；全卡一条 cubic-bezier(0.22,1,0.36,1)。这些配比保持 FIXED。
// 本卡是纯文字卡（2026-08-25 用户定版）——不放主持人。
const FPS = 30;

const FIXED = {
  dur: 0.90,          // 解糊 + 淡入时长 s（源码 charDurationFrames 27 ÷ 30）
  travel: 0.30,       // y 位移时长 s（源码 charTravelFrames 9 ÷ 30）= dur 的 33%
  stagger: 0.0333,    // 逐字错峰 s（源码 staggerFrames 1 ÷ 30）
  blurRatio: 12 / 72, // 起始模糊恒为字号 1/6（72px ⇒ 12）
  riseRatio: 16 / 72, // 起始下沉恒为字号 ≈22%（72px ⇒ 16）
};

// cubic-bezier(0.22,1,0.36,1)（easeOutQuint 家族）—— 解 x(t)=p 再取 y(t)。
// shared 无 bezier 解算器，本地保留（照抄模板）。
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
const EASE = cubicBezier(0.22, 1, 0.36, 1); // 全卡一条缓动：位移与解糊同族

interface Props {
  text?: string;
  textColor?: string;
  fontSize?: number;
  lead?: number;
}

const SoftBlurIn: React.FC<Props> = ({
  text = "答案往往没那么复杂",
  textColor = "#171717",
  fontSize = 72,
  lead = 0.3,
}) => {
  const t = useCurrentFrame() / FPS;

  // Array.from 按码点切字：中文即逐汉字（emoji/代理对也不会被切坏）
  const chars = Array.from(text);
  const blur = fontSize * FIXED.blurRatio;
  const rise = fontSize * FIXED.riseRatio;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      {/* 演示语境：整句在舞台正中，nowrap 是硬要求 */}
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center", whiteSpace: "nowrap",
      }}>
        <span style={{
          fontSize, fontWeight: 600, lineHeight: 1.25,
          color: textColor, letterSpacing: "-0.05em",
        }}>
          {chars.map((ch, i) => {
            const at = lead + i * FIXED.stagger;
            // 轨① 解糊 + 淡入：走满 dur（本卡的主轨，"柔"全在这条 0.9s 上）
            const pMain = tw(t, at, FIXED.dur, EASE);
            // 轨② 位移：只占前 travel。位移先停、解糊后停
            const pTravel = tw(t, at, FIXED.travel, EASE);
            return (
              <span key={i} style={{
                display: "inline-block", whiteSpace: "pre",
                backfaceVisibility: "hidden", transformOrigin: "50% 55%",
                willChange: "transform, filter, opacity",
                opacity: pMain,
                filter: `blur(${lerp(blur, 0, pMain)}px)`,
                transform: `translateY(${lerp(rise, 0, pTravel)}px)`,
              }}>{ch}</span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "soft-blur-in",
  name: "柔焦淡入",
  category: "字幕花字",
  durationInFrames: 92,
  accent: "#171717",
  component: SoftBlurIn as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "text", label: "标题文案", default: "答案往往没那么复杂" },
    { type: "color", key: "textColor", label: "文字色", default: "#171717" },
    { type: "slider", key: "fontSize", label: "字号", default: 72, min: 40, max: 110, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
