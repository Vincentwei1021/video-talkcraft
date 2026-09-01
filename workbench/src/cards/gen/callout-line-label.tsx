import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, clamp01, lerp, power1Out, power2Out, power3Out, tw } from "../shared";

// callout-line-label · 标注引出线 —— 参数化版（源出 tplcards/callout-line-label.tsx）
// 命门：圆点 pop → 折线生长 → 标签展开三拍有先后；双标注错峰（stagger）保持 FIXED。
// 目标点 target1/target2 可移动：折线拐点与标签随目标整体平移（几何保持一致）。
const FPS = 30;

const FIXED = {
  dotR: 7,        // 圆点半径 px
  dotIn: 0.2,     // 圆点 pop 时长 s（back.out）
  lineDraw: 0.4,  // 折线描画时长 s
  labelIn: 0.25,  // 标签遮罩展开时长 s；文字再滞后 0.1s
  out: 0.5,       // 反向收回总时长 s
  stagger: 0.8,   // 第二个标注的延迟 s（多标注必须错峰）
};

// 每个 callout 的基准几何（默认位形）：target = 圆点位置；points = 折线拐点与终点；标签贴终点
const BASE = [
  {
    target: { x: 422, y: 114 },                 // 摄像头模组
    points: [{ x: 380, y: 156 }, { x: 258, y: 156 }],
    label: { x: 84, y: 128, from: "right" as const },
  },
  {
    target: { x: 588, y: 300 },                 // 侧键/边框
    points: [{ x: 648, y: 240 }, { x: 760, y: 240 }],
    label: { x: 772, y: 214, from: "left" as const },
  },
];

const power2In = (x: number) => x * x * x;
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// 折线总长（代替 getTotalLength）
const polyLen = (pts: { x: number; y: number }[]) => {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
};

interface Props {
  label1Title?: string;
  label1Sub?: string;
  label2Title?: string;
  label2Sub?: string;
  color?: string;
  ink?: string;
  labelFontSize?: number;
  target1X?: number;
  target1Y?: number;
  target2X?: number;
  target2Y?: number;
  phoneX?: number;
  phoneY?: number;
  startDelay?: number;
  hold?: number;
}

const CalloutLineLabel: React.FC<Props> = ({
  label1Title = "1 英寸大底主摄",
  label1Sub = "同价位唯一",
  label2Title = "钛合金中框",
  label2Sub = "整机减重 19g",
  color = "#d8383a",
  ink = "#1d1d1f",
  labelFontSize = 17,
  target1X = 422,
  target1Y = 114,
  target2X = 588,
  target2Y = 300,
  phoneX = 380,
  phoneY = 70,
  startDelay = 0.6,
  hold = 1.6,
}) => {
  const t = useCurrentFrame() / FPS;

  // 目标点移动时，折线与标签随之整体平移（保持折线角度与标签贴线关系）
  const deltas = [
    { dx: target1X - BASE[0].target.x, dy: target1Y - BASE[0].target.y },
    { dx: target2X - BASE[1].target.x, dy: target2Y - BASE[1].target.y },
  ];
  const callouts = BASE.map((c, i) => ({
    target: { x: c.target.x + deltas[i].dx, y: c.target.y + deltas[i].dy },
    points: c.points.map((p) => ({ x: p.x + deltas[i].dx, y: p.y + deltas[i].dy })),
    label: { x: c.label.x + deltas[i].dx, y: c.label.y + deltas[i].dy, from: c.label.from },
    lines: i === 0 ? [label1Title, label1Sub] : [label2Title, label2Sub],
  }));

  const outAt = startDelay + FIXED.stagger + FIXED.dotIn + FIXED.lineDraw + FIXED.labelIn + 0.1 + hold;

  const grayBorder = { borderStyle: "solid", borderColor: "#d8d8dc" } as const;

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 演示语境（不属于动效）：被标注的产品图占位，白底 + 灰阶线框 */}
      <div
        style={{
          position: "absolute", left: phoneX, top: phoneY,
          width: 200, height: 400, borderRadius: 30, background: "#ffffff",
          borderWidth: 2, boxSizing: "border-box", ...grayBorder,
        }}
      >
        <div
          style={{
            position: "absolute", inset: 10, borderRadius: 22, background: "#f5f5f7",
            borderWidth: 1, borderStyle: "solid", borderColor: "#ececef", boxSizing: "border-box",
          }}
        />
        <div
          style={{
            position: "absolute", left: 20, top: 22, width: 44, height: 44,
            borderRadius: 12, background: "#ffffff",
            borderWidth: 1, boxSizing: "border-box", ...grayBorder,
          }}
        >
          <div
            style={{
              position: "absolute", left: 10, top: 10, width: 18, height: 18,
              borderRadius: "50%", background: "#ececef",
              borderWidth: 1, borderStyle: "solid", borderColor: "#c8c8cc", boxSizing: "border-box",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute", right: -6, top: 120,
            width: 4, height: 56, borderRadius: 3, background: "#d8d8dc",
          }}
        />
      </div>

      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} viewBox="0 0 960 540">
        {callouts.map((c, i) => {
          const t0 = startDelay + i * FIXED.stagger;
          const tOut = outAt + i * 0.15;

          // 1) 圆点 pop（back.out 会过冲，scale 保留过冲、opacity 封顶 1）+ 涟漪
          const dotP = t < tOut + FIXED.out * 0.56
            ? tw(t, t0, FIXED.dotIn, backOut(2.2))
            : 1 - tw(t, tOut + FIXED.out * 0.56, FIXED.out * 0.3, power2In);
          const rippleOn = t >= t0 + 0.05;   // immediateRender: false —— 起步前不画
          const rippleP = tw(t, t0 + 0.05, 0.5, power2Out);

          // 2) 折线生长 → 退场回吸（dashoffset 描画）
          const pts = [c.target, ...c.points];
          const len = polyLen(pts);
          const d = `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
          const tLine = t0 + FIXED.dotIn;   // 圆点亮完线才走：三拍有先后
          const dash = t < tOut + FIXED.out * 0.24
            ? len * (1 - tw(t, tLine, FIXED.lineDraw, power2Out))
            : len * tw(t, tOut + FIXED.out * 0.24, FIXED.out * 0.4, power2In);

          return (
            <g key={i}>
              {rippleOn && (
                <circle cx={c.target.x} cy={c.target.y} r={FIXED.dotR}
                  fill="none" stroke={color} strokeWidth={2}
                  opacity={lerp(0.9, 0, rippleP)}
                  transform={`translate(${c.target.x} ${c.target.y}) scale(${lerp(0.4, 3.2, rippleP)}) translate(${-c.target.x} ${-c.target.y})`} />
              )}
              <circle cx={c.target.x} cy={c.target.y} r={FIXED.dotR}
                fill={color} opacity={clamp01(dotP)}
                transform={`translate(${c.target.x} ${c.target.y}) scale(${dotP}) translate(${-c.target.x} ${-c.target.y})`} />
              <path d={d} fill="none" stroke={color} strokeWidth={2.5}
                strokeDasharray={len} strokeDashoffset={dash} />
            </g>
          );
        })}
      </svg>
      <div>
        {callouts.map((c, i) => {
          const t0 = startDelay + i * FIXED.stagger;
          const tOut = outAt + i * 0.15;
          const tLabel = t0 + FIXED.dotIn + FIXED.lineDraw;

          // 3) 标签：clip-path 从线端方向展开，文字滞后 0.1s 淡入
          const shown = t < tOut
            ? tw(t, tLabel, FIXED.labelIn, power3Out)
            : 1 - tw(t, tOut, FIXED.out * 0.4, power2In);
          // from: "right" = 从右缘向左展开（左 inset 收缩）；"left" 反之
          const clip = c.label.from === "right"
            ? `inset(0 0 0 ${(1 - shown) * 100}%)`
            : `inset(0 ${(1 - shown) * 100}% 0 0)`;
          const txtOp = tw(t, tLabel + 0.1, 0.2, power1Out);

          return (
            <div
              key={i}
              style={{
                position: "absolute", left: c.label.x, top: c.label.y, clipPath: clip,
                padding: "10px 16px", background: "#ffffff",
                borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
                color: ink, borderRadius: 8,
                fontSize: labelFontSize, lineHeight: 1.45, whiteSpace: "nowrap",
              }}
            >
              <b style={{ display: "block", fontSize: labelFontSize + 2, opacity: txtOp }}>{c.lines[0]}</b>
              <small style={{ color: "#8a8a8a", fontSize: labelFontSize - 3, opacity: txtOp }}>{c.lines[1]}</small>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "callout-line-label",
  name: "标注引出线",
  category: "强调标注",
  durationInFrames: 148,
  accent: "#d8383a",
  component: CalloutLineLabel as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "label1Title", label: "标注一 · 主行", default: "1 英寸大底主摄" },
    { type: "text", key: "label1Sub", label: "标注一 · 副行", default: "同价位唯一" },
    { type: "text", key: "label2Title", label: "标注二 · 主行", default: "钛合金中框" },
    { type: "text", key: "label2Sub", label: "标注二 · 副行", default: "整机减重 19g" },
    { type: "color", key: "color", label: "标注色（点/线/涟漪）", default: "#d8383a" },
    { type: "color", key: "ink", label: "标签文字色", default: "#1d1d1f" },
    { type: "slider", key: "labelFontSize", label: "标签字号", default: 17, min: 12, max: 24, step: 1, unit: "px" },
    { type: "number", key: "target1X", label: "标注一目标 X", default: 422, step: 1, unit: "px" },
    { type: "number", key: "target1Y", label: "标注一目标 Y", default: 114, step: 1, unit: "px" },
    { type: "number", key: "target2X", label: "标注二目标 X", default: 588, step: 1, unit: "px" },
    { type: "number", key: "target2Y", label: "标注二目标 Y", default: 300, step: 1, unit: "px" },
    { type: "number", key: "phoneX", label: "产品图 X", default: 380, step: 1, unit: "px" },
    { type: "number", key: "phoneY", label: "产品图 Y", default: 70, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.6, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "hold", label: "就位停留", default: 1.6, min: 0.5, max: 3, step: 0.05, unit: "s" },
  ],
};
