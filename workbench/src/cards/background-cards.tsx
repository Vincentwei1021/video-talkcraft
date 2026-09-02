import React from "react";
import { AbsoluteFill } from "remotion";
import type { CardDef } from "./types";
import { hexToRgb } from "./shared";

// —— 预设背景（design-language.md §1 色板 + §1.1 背景菜单，2026-08-27 用户比选定版）——
// 全部是静态底（"活"由环境层/相机叠加，不在背景卡内做动画）；
// 组件不依赖 useCurrentFrame，素材库缩略图可直接原样渲染。

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** 纯色幕底（canvas / canvas-alt 档，底色交替即章节感） */
const SolidCanvas: React.FC<{ color?: string }> = ({ color = "#ffffff" }) => (
  <AbsoluteFill style={{ background: color }} />
);

const solidCard = (id: string, name: string, color: string, accent: string): CardDef => ({
  id,
  name,
  category: "背景",
  durationInFrames: 300,
  accent,
  component: SolidCanvas as React.ComponentType<Record<string, unknown>>,
  schema: [{ type: "color", key: "color", label: "底色", default: color }],
});

export const bgCanvasLightCard = solidCard("bg-canvas-light", "浅底 · 白", "#ffffff", "#e8e8ea");
export const bgCanvasPaperCard = solidCard("bg-canvas-paper", "浅底 · 羊皮纸", "#f5f5f7", "#d9d9de");
export const bgCanvasDarkCard = solidCard("bg-canvas-dark", "深底 · 近黑", "#1d1d1f", "#3a3a3f");

/** 细网格（浅底）：数据/技术题材幕；文字密集镜头别用（网格跟笔画打架） */
const GridCanvas: React.FC<{
  base?: string;
  lineColor?: string;
  lineAlpha?: number;
  gap?: number;
}> = ({ base = "#f5f6f8", lineColor = "#1d1d1f", lineAlpha = 0.055, gap = 100 }) => {
  const line = rgba(lineColor, lineAlpha);
  const mask = "radial-gradient(120% 100% at 50% 40%, #000 30%, transparent 85%)";
  return (
    <AbsoluteFill style={{ background: base }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
          backgroundSize: `${gap}px ${gap}px`,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
    </AbsoluteFill>
  );
};

export const bgGridCard: CardDef = {
  id: "bg-grid",
  name: "细网格（浅底）",
  category: "背景",
  durationInFrames: 300,
  accent: "#8a94a6",
  component: GridCanvas as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "color", key: "base", label: "底色", default: "#f5f6f8" },
    { type: "slider", key: "gap", label: "格距", default: 100, min: 40, max: 200, step: 10, unit: "px" },
    { type: "slider", key: "lineAlpha", label: "线深浅", default: 0.055, min: 0.02, max: 0.15, step: 0.005 },
  ],
};

/** 彩色 pastel mesh（浅底）：只给片头/片尾整幕——常规幕用等于破单强调色纪律 */
const MeshCanvas: React.FC<{
  base?: string;
  c1?: string;
  c2?: string;
  c3?: string;
  c4?: string;
}> = ({ base = "#fbfbfd", c1 = "#78b4ff", c2 = "#ffaac8", c3 = "#b496ff", c4 = "#96ebd7" }) => (
  <AbsoluteFill
    style={{
      background: [
        `radial-gradient(60% 60% at 16% 12%, ${rgba(c1, 0.42)}, transparent 60%)`,
        `radial-gradient(58% 58% at 86% 10%, ${rgba(c2, 0.38)}, transparent 60%)`,
        `radial-gradient(62% 62% at 88% 88%, ${rgba(c3, 0.3)}, transparent 62%)`,
        `radial-gradient(58% 58% at 12% 90%, ${rgba(c4, 0.32)}, transparent 58%)`,
        base,
      ].join(", "),
    }}
  />
);

export const bgMeshCard: CardDef = {
  id: "bg-mesh",
  name: "pastel mesh（默认）",
  category: "背景",
  durationInFrames: 300,
  accent: "#c9a6ff",
  component: MeshCanvas as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "color", key: "base", label: "底色", default: "#fbfbfd" },
    { type: "color", key: "c1", label: "左上 · 蓝", default: "#78b4ff" },
    { type: "color", key: "c2", label: "右上 · 粉", default: "#ffaac8" },
    { type: "color", key: "c3", label: "右下 · 紫", default: "#b496ff" },
    { type: "color", key: "c4", label: "左下 · 青", default: "#96ebd7" },
  ],
};

/** 居中追光 + vignette（深底）：金句幕/反转幕的舞台感；光斑圆心跟主体落位走 */
const SpotlightCanvas: React.FC<{
  base?: string;
  glow?: string;
  glowAlpha?: number;
  x?: number;
  y?: number;
  vignette?: number;
}> = ({ base = "#131317", glow = "#2997ff", glowAlpha = 0.16, x = 50, y = 42, vignette = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: [
        `radial-gradient(140% 130% at 50% 50%, transparent 55%, rgba(0,0,0,${vignette}) 100%)`,
        `radial-gradient(65% 70% at ${x}% ${y}%, ${rgba(glow, glowAlpha)}, transparent 65%)`,
        base,
      ].join(", "),
    }}
  />
);

export const bgSpotlightCard: CardDef = {
  id: "bg-spotlight",
  name: "居中追光（深底）",
  category: "背景",
  durationInFrames: 300,
  accent: "#2997ff",
  component: SpotlightCanvas as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "color", key: "base", label: "底色", default: "#131317" },
    { type: "color", key: "glow", label: "光色", default: "#2997ff" },
    { type: "slider", key: "glowAlpha", label: "光强", default: 0.16, min: 0, max: 0.5, step: 0.01 },
    { type: "slider", key: "x", label: "光斑 X", default: 50, min: 10, max: 90, step: 1, unit: "%" },
    { type: "slider", key: "y", label: "光斑 Y", default: 42, min: 10, max: 90, step: 1, unit: "%" },
    { type: "slider", key: "vignette", label: "渐晕强度", default: 0.55, min: 0, max: 0.8, step: 0.05 },
  ],
};

// mesh 排第一：skill 默认幕底（2026-09-02 用户定版）
export const BG_CARDS: CardDef[] = [
  bgMeshCard,
  bgCanvasLightCard,
  bgCanvasPaperCard,
  bgCanvasDarkCard,
  bgGridCard,
  bgSpotlightCard,
];
