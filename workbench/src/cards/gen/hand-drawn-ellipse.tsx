import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// hand-drawn-ellipse · 手绘圈重点 —— 参数化版（源出 tplcards/hand-drawn-ellipse.tsx）
// 命门：圈到位之后短语才 punch；画完干净静置。draw/punch 节奏保持 FIXED。
// ★ 椭圆 path 是 demo 运行时量 DOM 固化的（960×540 设计坐标）：位置随 posX/posY 整体平移，
//   但不随 fontSize / 短语长度重排——改文案后如需对位请微调 posX/posY。
const FPS = 30;

const FIXED = {
  draw: 0.50,       // 画圈耗时 s：起笔快收笔缓
  punchGap: 0.06,   // 圈画完到 punch 之间的呼吸
  punchScale: 1.06, // punch 幅度
  punchDur: 0.22,
};

// demo 运行时 ellipsePath(inkBoxOf(word), CONFIG) 的输出（原样照抄）
const ELLIPSE = {
  len: 471.44,
  d: "M 87.36 276.83 C 86.25 277.69 82.76 280.26 80.69 281.96 C 78.63 283.66 76.87 285.31 74.99 287.03 C 73.1 288.75 70.44 290.53 69.41 292.28 C 68.38 294.03 68.07 295.87 68.79 297.55 C 69.51 299.22 71.78 300.78 73.72 302.33 C 75.67 303.88 77.77 305.41 80.48 306.84 C 83.2 308.27 85.99 309.8 90.01 310.9 C 94.04 312 99.4 312.8 104.63 313.44 C 109.86 314.09 115.87 314.33 121.39 314.77 C 126.92 315.2 132.14 315.71 137.77 316.04 C 143.41 316.37 149.21 316.76 155.19 316.74 C 161.17 316.72 167.51 316.31 173.65 315.9 C 179.79 315.49 185.82 314.88 192.02 314.3 C 198.21 313.72 204.75 313.27 210.82 312.43 C 216.9 311.59 223.26 310.56 228.47 309.26 C 233.68 307.97 237.96 306.25 242.07 304.66 C 246.18 303.08 249.63 301.4 253.14 299.74 C 256.64 298.08 260.5 296.45 263.1 294.72 C 265.69 292.99 267.6 291.15 268.7 289.38 C 269.79 287.61 269.38 285.86 269.65 284.11 C 269.92 282.37 270.31 280.66 270.33 278.9 C 270.36 277.14 270.98 275.24 269.81 273.56 C 268.64 271.88 266.27 270.25 263.32 268.84 C 260.37 267.43 256.08 266.27 252.12 265.08 C 248.16 263.89 244.21 262.67 239.58 261.69 C 234.96 260.7 229.97 259.7 224.36 259.18 C 218.75 258.65 212.11 258.59 205.92 258.54 C 199.73 258.5 193.39 258.79 187.19 258.89 C 180.99 259 174.96 258.93 168.72 259.16 C 162.48 259.4 155.92 259.67 149.73 260.3 C 143.54 260.92 137.5 261.96 131.58 262.93 C 125.65 263.9 119.96 264.99 114.18 266.13 C 108.4 267.26 102.05 268.35 96.9 269.75 C 91.74 271.15 86.83 272.82 83.23 274.54 C 79.64 276.26 77.59 278.23 75.32 280.07 C 73.04 281.91 71.26 283.73 69.59 285.56 C 67.92 287.39 66.03 290.14 65.32 291.06",
};

const n = (v: number) => Math.round(v * 100) / 100;

interface Props {
  leadText?: string;
  ringWord?: string;
  strokeColor?: string;
  ink?: string;
  fontSize?: number;
  strokeWidth?: number;
  posX?: number;
  posY?: number;
  startDelay?: number;
}

const HandDrawnEllipse: React.FC<Props> = ({
  leadText = "要求可以再高一点，但对自己",
  ringWord = "更松弛一点",
  strokeColor = "#e8720c",
  ink = "#1d1d1f",
  fontSize = 28,
  strokeWidth = 3.2,
  posX = 100,
  posY = 0,
  startDelay = 0.42,
}) => {
  const t = useCurrentFrame() / FPS;

  // 一笔：单条 path、恒定线宽，dasharray 描画（起笔快收笔缓）
  const v = tw(t, startDelay, FIXED.draw, power2Out);
  const L = ELLIPSE.len;

  // 命门：圈到位之后（+punchGap）短语才 punch 一拍（scale 1.06→1，power3.out）
  const punchAt = startDelay + FIXED.draw + FIXED.punchGap;
  const scale = t < punchAt
    ? 1
    : lerp(FIXED.punchScale, 1, tw(t, punchAt, FIXED.punchDur, power3Out));

  // 行距要给圈留地方：圈的上下沿会外扩，行距太密圈会咬到上一行
  const lineStyle: React.CSSProperties = {
    fontSize, lineHeight: 2.4, fontWeight: 400, whiteSpace: "nowrap",
  };

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <div
        style={{
          position: "absolute", left: posX, right: 410,
          top: `calc(50% + ${posY}px)`, transform: "translateY(-50%)",
          color: ink,
        }}
      >
        <div style={{ ...lineStyle, color: "#8a8a8a" }}>{leadText}</div>
        <div style={lineStyle}>
          {/* 被圈的短语单独 inline-block —— punch 只作用在它自己身上 */}
          <span
            style={{
              display: "inline-block", fontWeight: 600, willChange: "transform",
              transform: `scale(${scale})`, transformOrigin: "50% 55%",
            }}
          >
            {ringWord}
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>
      {/* 圈层（动效本体）盖在文字之上；随文字块平移 */}
      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} viewBox="0 0 960 540">
        <g transform={`translate(${posX - 100} ${posY})`}>
          <path
            d={ELLIPSE.d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={`${n(L)} ${n(L + 4)}`}
            strokeDashoffset={n(Math.max(0, L * (1 - v)))}
          />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "hand-drawn-ellipse",
  name: "手绘圈重点",
  category: "强调标注",
  durationInFrames: 102,
  accent: "#e8720c",
  component: HandDrawnEllipse as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "leadText", label: "引导行", default: "要求可以再高一点，但对自己" },
    { type: "text", key: "ringWord", label: "被圈短语", default: "更松弛一点" },
    { type: "color", key: "strokeColor", label: "圈线颜色", default: "#e8720c" },
    { type: "color", key: "ink", label: "文字色", default: "#1d1d1f" },
    { type: "slider", key: "fontSize", label: "正文字号", default: 28, min: 20, max: 40, step: 1, unit: "px" },
    { type: "slider", key: "strokeWidth", label: "圈线宽", default: 3.2, min: 2, max: 6, step: 0.1, unit: "px" },
    { type: "number", key: "posX", label: "文字块 X", default: 100, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "垂直偏移", default: 0, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.42, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
