import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "./types";
import { hexToRgb } from "./shared";

// —— 通用环境光效卡：透明叠加层，铺在任意画面之上（放上层轨） ——
// 源自口播工程 Environment 的两种手法，拆成独立可调的卡
const FPS = 30;

/** 呼吸暗角：四周缓慢呼吸的压暗渐晕，防"画面死板" */
const AmbientVignette: React.FC<{
  strength?: number;
  breatheAmp?: number;
  period?: number;
  color?: string;
  centerY?: number;
}> = ({ strength = 0.06, breatheAmp = 0.025, period = 8, color = "#000000", centerY = 42 }) => {
  const t = useCurrentFrame() / FPS;
  const breathe = 0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / Math.max(0.5, period));
  const a = strength + breathe * breatheAmp;
  const [r, g, b] = hexToRgb(color);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(90% 95% at 50% ${centerY}%, transparent 55%, rgba(${r},${g},${b},${a.toFixed(3)}) 100%)`,
      }}
    />
  );
};

export const ambientVignetteCard: CardDef = {
  id: "ambient-vignette",
  name: "呼吸暗角",
  category: "环境光效",
  durationInFrames: 300,
  accent: "#3a3a42",
  component: AmbientVignette as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "slider", key: "strength", label: "压暗强度", default: 0.06, min: 0, max: 0.5, step: 0.01 },
    { type: "slider", key: "breatheAmp", label: "呼吸幅度", default: 0.025, min: 0, max: 0.2, step: 0.005 },
    { type: "slider", key: "period", label: "呼吸周期", default: 8, min: 2, max: 20, step: 0.5, unit: "s" },
    { type: "color", key: "color", label: "渐晕颜色", default: "#000000" },
    { type: "slider", key: "centerY", label: "亮心高度", default: 42, min: 20, max: 80, step: 1, unit: "%" },
  ],
};

/** 周期光扫：一道斜向柔光周期性扫过画面 */
const AmbientSweep: React.FC<{
  color?: string;
  opacity?: number;
  period?: number;
  angle?: number;
  width?: number;
  blend?: string;
}> = ({ color = "#ffffff", opacity = 0.05, period = 12, angle = 112, width = 18, blend = "screen" }) => {
  const t = useCurrentFrame() / FPS;
  const sweep = ((t % Math.max(1, period)) / Math.max(1, period)) * 240 - 70;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        mixBlendMode: blend as React.CSSProperties["mixBlendMode"],
        background: `linear-gradient(${angle}deg, transparent ${sweep - width}%, ${color} ${sweep}%, transparent ${sweep + width}%)`,
      }}
    />
  );
};

export const ambientSweepCard: CardDef = {
  id: "ambient-sweep",
  name: "周期光扫",
  category: "环境光效",
  durationInFrames: 360,
  accent: "#75baff",
  component: AmbientSweep as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "color", key: "color", label: "光色", default: "#ffffff" },
    { type: "slider", key: "opacity", label: "强度", default: 0.05, min: 0, max: 0.4, step: 0.005 },
    { type: "slider", key: "period", label: "扫过周期", default: 12, min: 3, max: 30, step: 0.5, unit: "s" },
    { type: "slider", key: "angle", label: "角度", default: 112, min: 60, max: 150, step: 1 },
    { type: "slider", key: "width", label: "光带宽度", default: 18, min: 4, max: 40, step: 1, unit: "%" },
    {
      type: "select", key: "blend", label: "混合模式", default: "screen",
      options: [
        { value: "screen", label: "screen（提亮）" },
        { value: "multiply", label: "multiply（压色）" },
        { value: "overlay", label: "overlay" },
        { value: "normal", label: "normal" },
      ],
    },
  ],
};
