import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, clamp01, lerp } from "../shared";

// tracking-in · 字距收拢 —— 参数化版（源出 tplcards/tracking-in.tsx）
// 一条 spring（damping 18 / stiffness 90）同时驱动 letter-spacing 0.5em → −0.03em
// 与 blur → 0；opacity 另走一条 0.5s 线性淡入（源码就是分开的）。
// 命门：字距与模糊必须同一条 spring。分开成两条缓动，"散开的字聚焦成一块"就散了。
// spring 配置 / 字距端点 / 淡入时长保持 FIXED，不暴露。
// 整屏让位给一句大标题的卡（不放主持人）：靠留白成立。
const FPS = 30;

const FIXED = {
  springDur: 1.00,     // spring 走完到 <1e-4 的时长 s（damping 18 / stiffness 90 @30fps）
  fadeDur: 0.50,       // 淡入时长 s，线性、不跟 spring
  startTracking: 0.5,  // 起始字距 em（源码值原样）
  endTracking: -0.03,  // 终态字距 em（源码值原样：略收紧，不是 0）
  blurRatio: 9 / 72,   // 起始模糊恒为字号 1/8（72px ⇒ 9）
};

// Remotion spring 的解析解（欠阻尼分支，from 0 → to 1，初速 0）：
//   ζ = damping / (2√(stiffness·mass))，ω₀ = √(stiffness/mass)，ω₁ = ω₀√(1−ζ²)
//   x(t) = 1 − e^(−ζω₀t)·[ (ζω₀/ω₁)·sin(ω₁t) + cos(ω₁t) ]
function remotionSpring(damping: number, stiffness: number, mass: number) {
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const omega0 = Math.sqrt(stiffness / mass);
  if (zeta >= 1) {                                  // 临界/过阻尼分支（本卡不走，留着以便改参数）
    return (t: number) => 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
  }
  const omega1 = omega0 * Math.sqrt(1 - zeta * zeta);
  const decay = zeta * omega0;
  return (t: number) =>
    1 - Math.exp(-decay * t) * ((decay / omega1) * Math.sin(omega1 * t) + Math.cos(omega1 * t));
}
const SPRING = remotionSpring(18, 90, 1);

interface Props {
  text?: string;
  textColor?: string;
  fontSize?: number;
  lead?: number;
}

const TrackingIn: React.FC<Props> = ({
  text = "认知决定上限",
  textColor = "#171717",
  fontSize = 72,
  lead = 0.3,
}) => {
  const t = useCurrentFrame() / FPS;

  // 轨① 字距 + 模糊：同一条 spring 驱动（进度 → 秒 → spring 位置）
  const s = SPRING(clamp01((t - lead) / FIXED.springDur) * FIXED.springDur);
  const tracking = lerp(FIXED.startTracking, FIXED.endTracking, s);
  const blur = fontSize * FIXED.blurRatio * (1 - s);

  // 轨② 淡入：0.5s 线性，与 spring 无关（源码是两个独立 interpolate）
  const opacity = clamp01((t - lead) / FIXED.fadeDur);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      {/* 动效本体：整行大字，nowrap 是硬要求（字距 0.5em 时整句比终态宽 50%）。
          白底显式给出：字距收拢靠"空"才读得出来 */}
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center", background: "#ffffff",
      }}>
        <span style={{
          fontSize, fontWeight: 700, lineHeight: 1.2,
          color: textColor, whiteSpace: "nowrap",
          opacity,
          letterSpacing: `${tracking.toFixed(4)}em`,
          filter: `blur(${Math.max(0, blur).toFixed(3)}px)`,
        }}>
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "tracking-in",
  name: "字距收拢",
  category: "字幕花字",
  durationInFrames: 90,
  accent: "#171717",
  component: TrackingIn as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "text", label: "标题文案", default: "认知决定上限" },
    { type: "color", key: "textColor", label: "文字色", default: "#171717" },
    { type: "slider", key: "fontSize", label: "字号", default: 72, min: 40, max: 110, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
