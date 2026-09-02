import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, linear, mixHex, power2Out, power3Out, tw } from "../shared";

// converging-arrows · 双箭头聚焦 —— 参数化版（源出 tplcards/converging-arrows.tsx）
// 命门①：箭头先到、词后变（不缩放）。命门②：箭尖离词 tipGap 留白，不戳字。
// 两支错峰 0.06s / 三层笔尖配比 / 画杆画须时长均保持 FIXED。
// ★ 关键词盒子 box 是 demo 运行时量 DOM 固化的：随文字块 posX/posY 整体平移，
//   也可用 boxX/boxY/boxW/boxH 单独校准（改文案/字号后箭头要重新对位）。
const FPS = 30;

const FIXED = {
  tiers: [{ w: 4.8, frac: 0.16 }, { w: 3.8, frac: 0.46 }, { w: 2.8, frac: 1 }],
  shaft: 0.26,      // 画杆耗时 s
  headDur: 0.11,    // 箭头须：收笔快扫
  tipGap: 16,       // 命门②：箭尖离关键词盒子多远 px（14~18）
  colorDur: 0.1,    // 关键词换色时长 s：命门①的落点
  arrows: [
    { // 右上来的那支：尖指关键词右上角
      at: 0, corner: "topRight" as const,
      fromDX: 176, fromDY: -132,        // 起笔点相对箭尖的位移（画外方向）
      bow: 24,                          // 杆的弧度（正 = 向外凸）
      headLen: 21, headSpread: 27,
    },
    { // 左下来的那支：错峰 0.06s，更短，弧向相反
      at: 0.06, corner: "bottomLeft" as const,
      fromDX: -124, fromDY: 104,
      bow: -20,
      headLen: 18, headSpread: 25,
    },
  ],
};

const n = (v: number) => Math.round(v * 100) / 100;

type Box = { x: number; y: number; w: number; h: number };
type ArrowSpec = (typeof FIXED.arrows)[number];

// 一支箭头：杆（带弧度的三次贝塞尔）+ 头（两根须，按杆末端切线算，永远朝目标）
function arrowPaths(box: Box, o: ArrowSpec, tipGap: number) {
  const right = box.x + box.w, bottom = box.y + box.h;
  // 箭尖落在目标盒子外的对角方向上，离盒子 tipGap（命门②：留白，不戳字）
  const g = tipGap / Math.SQRT2;
  const tip = o.corner === "topRight" ? [right + g, box.y - g] : [box.x - g, bottom + g];
  const s = [tip[0] + o.fromDX, tip[1] + o.fromDY];
  // 弧度：两个控制点垂直于弦方向偏 bow —— 直线杆读作 UI 引线，不是手画的箭头
  const dx = tip[0] - s[0], dy = tip[1] - s[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;                        // 弦的法向
  const c1 = [s[0] + dx * 0.3 + nx * o.bow, s[1] + dy * 0.3 + ny * o.bow];
  const c2 = [s[0] + dx * 0.68 + nx * o.bow * 0.55, s[1] + dy * 0.68 + ny * o.bow * 0.55];
  const shaftD = `M ${n(s[0])} ${n(s[1])} C ${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(tip[0])} ${n(tip[1])}`;
  // 贝塞尔长度：数值采样（与 getTotalLength 等价，误差 <0.01%）
  let shaftLen = 0;
  let px = s[0], py = s[1];
  for (let i = 1; i <= 256; i++) {
    const u = i / 256, v = 1 - u;
    const qx = v * v * v * s[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * tip[0];
    const qy = v * v * v * s[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * tip[1];
    shaftLen += Math.hypot(qx - px, qy - py);
    px = qx; py = qy;
  }
  // 末端切线（c2→tip）反向 ±headSpread 就是两根须；两须长度略不等 = 手作感
  const ang = Math.atan2(tip[1] - c2[1], tip[0] - c2[0]) + Math.PI;
  const barb = (dev: number, len: number) => [
    n(tip[0] + Math.cos(ang + (dev * Math.PI) / 180) * len),
    n(tip[1] + Math.sin(ang + (dev * Math.PI) / 180) * len),
  ];
  const b1 = barb(o.headSpread, o.headLen), b2 = barb(-o.headSpread - 5, o.headLen - 2.5);
  const headD = `M ${b1[0]} ${b1[1]} L ${n(tip[0])} ${n(tip[1])} L ${b2[0]} ${b2[1]}`;
  const headLen2 = Math.hypot(b1[0] - tip[0], b1[1] - tip[1]) + Math.hypot(b2[0] - tip[0], b2[1] - tip[1]);
  return { shaftD, shaftLen, headD, headLen: headLen2 };
}

// 起笔粗收笔细的一笔：同一 d 叠 N 层线宽，共用一个弧长笔尖（三层绝不互相超车）
const InkStroke: React.FC<{
  d: string; len: number; color: string;
  tiers: { w: number; frac: number }[]; progress: number;
}> = ({ d, len, color, tiers, progress }) => (
  <>
    {tiers.map((tier, i) => {
      const span = len * tier.frac;
      return (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={tier.w}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={`${n(span)} ${n(len + 4)}`}
          strokeDashoffset={n(Math.max(0, span - progress * len))} />
      );
    })}
  </>
);

interface Props {
  leadText?: string;
  preText?: string;
  focusText?: string;
  postText?: string;
  accent?: string;
  ink?: string;
  fontSize?: number;
  focusSize?: number;
  posX?: number;
  posY?: number;
  boxX?: number;
  boxY?: number;
  boxW?: number;
  boxH?: number;
  startDelay?: number;
}

const ConvergingArrows: React.FC<Props> = ({
  leadText = "今天只要你",
  preText = "记住",
  focusText = "这 3 点",
  postText = "就够了",
  accent = "#e8720c",
  ink = "#1d1d1f",
  fontSize = 32,
  focusSize = 40,
  posX = 118,
  posY = 0,
  boxX = 182,
  boxY = 262.4,
  boxW = 130.64,
  boxH = 76,
  startDelay = 0.42,
}) => {
  const t = useCurrentFrame() / FPS;

  // 关键词盒子随文字块 posX/posY 平移，boxX/boxY 供单独校准
  const box: Box = { x: boxX + (posX - 118), y: boxY + posY, w: boxW, h: boxH };
  const arrows = FIXED.arrows.map((a) => arrowPaths(box, a, FIXED.tipGap));
  const allTipsAt = Math.max(
    ...FIXED.arrows.map((a) => startDelay + a.at + FIXED.shaft + FIXED.headDur));

  // 命门①：两支箭尖都到位那一帧，关键词才换成强调色（不缩放）
  const colorP = tw(t, allTipsAt, FIXED.colorDur, linear);
  const wordColor = mixHex(ink, accent, colorP);

  const lineStyle: React.CSSProperties = {
    fontSize, lineHeight: 1.9, fontWeight: 400, whiteSpace: "nowrap",
  };

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 排版留白是本卡的前提：箭头要从对角空白处画进来 */}
      <div
        style={{
          position: "absolute", left: posX,
          top: `calc(50% + ${posY}px)`, transform: "translateY(-50%)",
          color: ink, textAlign: "left",
        }}
      >
        <div style={{ ...lineStyle, color: "#8a8a8a" }}>{leadText}</div>
        <div style={lineStyle}>
          {preText}
          {/* 被夹住的关键词：单独 inline-block（换色只作用在它自己身上） */}
          <span
            style={{
              display: "inline-block", fontSize: focusSize, fontWeight: 600,
              willChange: "color", color: wordColor,
            }}
          >
            {focusText}
          </span>
          {postText}
        </div>
      </div>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>
      {/* 箭头层（动效本体）盖在文字之上 */}
      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} viewBox="0 0 960 540">
        {arrows.map((paths, i) => {
          const at = startDelay + FIXED.arrows[i].at;
          const shaftP = tw(t, at, FIXED.shaft, power3Out);
          // 先杆后头的两笔笔顺（头在杆到位那一刻接上）
          const headP = tw(t, at + FIXED.shaft, FIXED.headDur, power2Out);
          return (
            <g key={i}>
              <InkStroke d={paths.shaftD} len={paths.shaftLen} color={accent}
                tiers={FIXED.tiers} progress={shaftP} />
              <InkStroke d={paths.headD} len={paths.headLen} color={accent}
                tiers={[{ w: FIXED.tiers[1].w, frac: 1 }]} progress={headP} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "converging-arrows",
  name: "双箭头聚焦",
  category: "强调标注",
  durationInFrames: 89,
  accent: "#e8720c",
  component: ConvergingArrows as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "leadText", label: "引导行", default: "今天只要你" },
    { type: "text", key: "preText", label: "关键词前", default: "记住" },
    { type: "text", key: "focusText", label: "关键词（被夹住）", default: "这 3 点" },
    { type: "text", key: "postText", label: "关键词后", default: "就够了" },
    { type: "color", key: "accent", label: "强调色（箭头/换色）", default: "#e8720c" },
    { type: "color", key: "ink", label: "文字色", default: "#1d1d1f" },
    { type: "slider", key: "fontSize", label: "正文字号", default: 32, min: 22, max: 44, step: 1, unit: "px" },
    { type: "slider", key: "focusSize", label: "关键词字号", default: 40, min: 28, max: 56, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "文字块 X", default: 118, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "垂直偏移", default: 0, step: 1, unit: "px" },
    { type: "number", key: "boxX", label: "关键词盒 X", default: 182, step: 0.1, unit: "px" },
    { type: "number", key: "boxY", label: "关键词盒 Y", default: 262.4, step: 0.1, unit: "px" },
    { type: "number", key: "boxW", label: "关键词盒宽", default: 130.64, step: 0.1, unit: "px" },
    { type: "number", key: "boxH", label: "关键词盒高", default: 76, step: 0.1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.42, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
