import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, tw } from "../shared";

// line-by-line-slide · 逐行滑入 —— 参数化版（源出 tplcards/line-by-line-slide.tsx）
// 命门：入场缓出/出场缓入方向相反；位移先停、淡入后停；出场错峰是入场的一半。
// 入出场时长/错峰/位移配比保持 FIXED；语境级开放起手静置与读完停留。本卡为纯文字卡，无主持人。
const FPS = 30;

const FIXED = {
  enterDur: 0.9, // 每行淡入时长 s（源码 enterDur 27 ÷ 30）
  enterTravel: 0.4667, // 每行位移时长 s（源码 enterTravel 14 ÷ 30）= enterDur 的 52%
  enterStagger: 0.1333, // 入场行间错峰 s（源码 enterStagger 4 ÷ 30）
  exitDur: 0.6, // 每行淡出时长 s（源码 exitDur 18 ÷ 30）
  exitDelay: 0.2667, // 淡出起 → 横向位移起的延迟 s（源码 exitTravelFrom 8 ÷ 30）
  exitStagger: 0.0667, // 出场行间错峰 s（源码 exitStagger 2 ÷ 30）= 入场的一半
  distanceRatio: 47 / 60, // 横向位移量恒为字号 78%（60px ⇒ 47px）
};

// cubic-bezier 解算器：解 x(t)=p 再取 y(t)（牛顿迭代）——shared 未含，本卡局部定义
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return function (p: number) {
    let u = p;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * u + bx) * u + cx) * u - p;
      if (Math.abs(e) < 1e-6) break;
      const d = (3 * ax * u + 2 * bx) * u + cx;
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    u = Math.max(0, Math.min(1, u));
    return ((ay * u + by) * u + cy) * u;
  };
}
const ENTER_EASE = cubicBezier(0.22, 1, 0.36, 1); // 缓出：冲进来再长距离缓收
const EXIT_EASE = cubicBezier(0.64, 0, 0.78, 0); // 缓入：先粘住再加速甩走

const DEFAULT_LINES = "第一，把问题写下来\n第二，只留一个变量\n第三，跑最小实验";

interface Props {
  lines?: string;
  ink?: string;
  fontSize?: number;
  lead?: number;
  hold?: number;
}

const LineByLineSlide: React.FC<Props> = ({
  lines = DEFAULT_LINES,
  ink = "#171717",
  fontSize = 60,
  lead = 0.3,
  hold = 1.4,
}) => {
  const t = useCurrentFrame() / FPS;

  // 3~4 行中文要点。行数上限 4：再多则首行早已淡出、"一叠"这个整体读不出来
  const list = lines.split("\n").filter((s) => s.length > 0);
  const distance = Math.round(fontSize * FIXED.distanceRatio);

  // 出场永远不早于入场结束：最后一行入场结束 + hold
  const enterEnd = lead + FIXED.enterDur + (list.length - 1) * FIXED.enterStagger;
  const exitStart = enterEnd + hold;

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 整叠居中但行与行仍左对齐（共享左端才读作"一叠"） */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span
          style={{
            display: "inline-block", // 收缩到最长行的宽度，共享左端由此成立
            textAlign: "left",
            fontSize, fontWeight: 600,
            lineHeight: 1.35, // 拉丁值 1.1 会让中文行与行粘住
            color: ink,
            letterSpacing: "-0.03em",
          }}
        >
          {list.map((line, i) => {
            const at = lead + i * FIXED.enterStagger;
            const out = exitStart + i * FIXED.exitStagger;
            // 入场轨① 淡入走满 enterDur；出场轨① 淡出立刻起（入场必已结束，顺序接力）
            const opacity = t < out
              ? tw(t, at, FIXED.enterDur, ENTER_EASE)
              : 1 - tw(t, out, FIXED.exitDur, EXIT_EASE);
            // 入场轨② 位移只占前 enterTravel；出场轨② 位移延迟 exitDelay 才动
            const x = t < out + FIXED.exitDelay
              ? lerp(-distance, 0, tw(t, at, FIXED.enterTravel, ENTER_EASE))
              : lerp(0, distance,
                  tw(t, out + FIXED.exitDelay, FIXED.exitDur - FIXED.exitDelay, EXIT_EASE));
            return (
              <span
                key={i}
                style={{
                  display: "block", // 每一行：唯一被 transform 的元素（左端为轴，位移只走横向）
                  transformOrigin: "0% 50%",
                  whiteSpace: "nowrap",
                  willChange: "transform, opacity",
                  opacity,
                  transform: `translateX(${x}px)`,
                }}
              >
                {line}
              </span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "line-by-line-slide",
  name: "逐行滑入",
  category: "字幕花字",
  durationInFrames: 120,
  accent: "#171717",
  component: LineByLineSlide as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "lines", label: "要点（每行一条，至多 4 行）", default: DEFAULT_LINES },
    { type: "slider", key: "fontSize", label: "行字号", default: 60, min: 36, max: 90, step: 1, unit: "px" },
    { type: "color", key: "ink", label: "墨色", default: "#171717" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "hold", label: "读完停留", default: 1.4, min: 0.4, max: 4, step: 0.1, unit: "s" },
  ],
};
