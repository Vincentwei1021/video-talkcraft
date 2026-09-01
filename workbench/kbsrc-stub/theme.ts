// kbsrc 降级 stub：未链接口播成片工程时使用（设计 token 照抄，无外部依赖）
import type { CSSProperties } from "react";
export const C = {
  bg: "#ffffff", bgAlt: "#f5f5f7", ink: "#1d1d1f", dim: "#6e6e73",
  hairline: "#dedee3", accent: "#0066cc", accentSoft: "#dbeeff",
  dark: "#17171b", darkAlt: "#242429", lightInk: "#f5f5f7",
  marker: "#ffe949", positive: "#248a3d", negative: "#d70015",
};
export const FONT = {
  cn: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", sans-serif',
  mono: '"SFMono-Regular", Menlo, Monaco, Consolas, monospace',
  serif: 'Georgia, "Songti SC", serif',
};
export const SHADOW_EVIDENCE = "0 12px 60px rgba(0,0,0,0.22)";
export const RADII = { chip: 12, card: 28, pill: 999 };
export const cardStyle: CSSProperties = { background: "#fff", border: `1px solid ${C.hairline}`, borderRadius: RADII.card };
