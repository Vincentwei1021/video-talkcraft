import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette } from "../shared";

// typewriter-reveal · 打字机档案戳 —— 参数化版（源出 tplcards/typewriter-reveal.tsx）
// 逐字符敲出（间隔带随机抖动）→ 句尾光标闪 3 次 → 移交第二行 → 收尾常驻方波闪烁。
// 命门节奏（charMs/jitterMs/闪烁周期与次数/行间延迟）保持 FIXED，不暴露：
//   charMs 30~80 像真打字，>100 像 loading；jitterMs = 0 = 匀速 = 一眼 CSS 教程。
const FPS = 30;

const FIXED = {
  charMs: 55,        // 每字符基准间隔 ms
  jitterMs: 20,      // 间隔随机抖动 ±ms
  blinkPeriod: 0.5,  // 光标闪烁周期 s（行业默认 500ms）
  blinkTimes: 3,     // 句尾闪几次再敲下一行
  line2Delay: 0.4,   // 第二行相对第一行敲完的延迟 s
};
// gsap to{duration:0.01, repeat:-1, repeatDelay:0.25, yoyo} ⇒ 周期 2×(0.01+0.25)=0.52s 方波
const LOOP_PERIOD = 2 * (0.01 + FIXED.blinkPeriod / 2);

// 逐字符时刻表（remotion.random 同 seed 同值，纯函数可回放）
const charTimes = (text: string, seed: string, at: number) => {
  let t = at;
  return Array.from(text).map((_, i) => {
    t += (FIXED.charMs + (random(`${seed}-${i}`) * 2 - 1) * FIXED.jitterMs) / 1000;
    return t;
  });
};

// 全卡时刻链：行1 敲出 → 句尾闪 → 移交 → 行2 敲出 → 常驻闪烁起点
const buildTimeline = (line1: string, line2: string, startDelay: number) => {
  const times1 = charTimes(line1, "tw-l1", startDelay);
  const t1End = times1.length > 0 ? times1[times1.length - 1] : startDelay;
  const blinkAt = t1End + 0.08;                                    // 句尾闪烁起点
  const blinkEnd = blinkAt + FIXED.blinkTimes * FIXED.blinkPeriod; // 闪 3 次
  const t2Start = blinkEnd + FIXED.line2Delay;                     // 光标移交第二行
  const times2 = charTimes(line2, "tw-l2", t2Start);
  const t2End = times2.length > 0 ? times2[times2.length - 1] : t2Start;
  const loopAt = t2End + 0.1; // 收尾常驻闪烁起点 = 有限动画结束点
  return { times1, blinkAt, t2Start, times2, loopAt };
};

// 句尾方波闪烁：每周期先灭半拍再亮半拍
const blinkOpacity = (t: number, at: number, times: number) => {
  if (t < at) return 1;
  const end = at + times * FIXED.blinkPeriod;
  if (t >= end) return 1;
  const phase = (t - at) % FIXED.blinkPeriod;
  return phase < FIXED.blinkPeriod / 2 ? 0 : 1;
};

const DEFAULT_LINE1 = "北京 · 2008年8月8日";
const DEFAULT_LINE2 = "奥运会开幕当晚，全球40亿人正在注视";
const DEFAULT_START_DELAY = 0.4;

// 卡片默认时长照抄模板 meta 计算逻辑：有限动画结束点 + 2s idle 展示
const DEFAULT_TIMELINE = buildTimeline(DEFAULT_LINE1, DEFAULT_LINE2, DEFAULT_START_DELAY);
const DURATION_IN_FRAMES = Math.round((DEFAULT_TIMELINE.loopAt + 2.0) * FPS);

interface Props {
  line1?: string;
  line2?: string;
  ink?: string;
  subColor?: string;
  fontSize1?: number;
  fontSize2?: number;
  posX?: number;
  posY?: number;
  startDelay?: number;
}

const TypewriterReveal: React.FC<Props> = ({
  line1 = DEFAULT_LINE1,
  line2 = DEFAULT_LINE2,
  ink = "#1d1d1f",
  subColor = "#8a8a8a",
  fontSize1 = 36,
  fontSize2 = 18,
  posX = 460.8, // 原模板 left: 48% @960 舞台 = 460.8px
  posY = 112,   // 原模板 bottom: 112px（自画面底边起算）
  startDelay = DEFAULT_START_DELAY,
}) => {
  const t = useCurrentFrame() / FPS;
  const tl = React.useMemo(
    () => buildTimeline(line1, line2, startDelay),
    [line1, line2, startDelay],
  );

  // 已敲出的字符数 = 时刻表里 ≤ t 的项数
  const n1 = tl.times1.filter((x) => t >= x).length;
  const n2 = tl.times2.filter((x) => t >= x).length;

  // 第一行光标：敲字期间常亮 → 句尾闪 3 次 → 移交第二行后消失
  const cur1Visible = t < tl.t2Start;
  const cur1Opacity = blinkOpacity(t, tl.blinkAt, FIXED.blinkTimes);

  // 第二行光标：移交后出现常亮；敲完后常驻方波闪烁（先灭半拍再亮半拍）
  const cur2Visible = t >= tl.t2Start;
  let cur2Opacity = 1;
  if (t >= tl.loopAt) {
    const phase = (t - tl.loopAt) % LOOP_PERIOD;
    cur2Opacity = phase < LOOP_PERIOD / 2 ? 0 : 1;
  }

  const cursorStyle = (
    bg: string, visible: boolean, opacity: number,
  ): React.CSSProperties => ({
    display: visible ? "inline-block" : "none",
    width: "0.62em", height: "1.05em", background: bg,
    verticalAlign: "text-bottom", marginLeft: 2,
    opacity,
  });

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      {/* 演示语境：主持人占左侧一列，打字机档案戳落在右侧白区下方 */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>
      <div style={{
        position: "absolute", left: posX, bottom: posY,
        fontFamily: 'Menlo, Consolas, "Courier New", monospace', color: ink,
      }}>
        <div style={{ fontSize: fontSize1, fontWeight: 700, letterSpacing: 2 }}>
          <span>{Array.from(line1).slice(0, n1).join("")}</span>
          <span style={cursorStyle(ink, cur1Visible, cur1Opacity)} />
        </div>
        <div style={{ fontSize: fontSize2, marginTop: 12, color: subColor, letterSpacing: 1 }}>
          <span>{Array.from(line2).slice(0, n2).join("")}</span>
          <span style={cursorStyle(subColor, cur2Visible, cur2Opacity)} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "typewriter-reveal",
  name: "打字机档案戳",
  category: "字幕花字",
  durationInFrames: DURATION_IN_FRAMES,
  accent: "#1d1d1f",
  component: TypewriterReveal as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "line1", label: "第一行（档案戳）", default: DEFAULT_LINE1 },
    { type: "text", key: "line2", label: "第二行（注释）", default: DEFAULT_LINE2 },
    { type: "slider", key: "fontSize1", label: "第一行字号", default: 36, min: 20, max: 64, step: 1, unit: "px" },
    { type: "slider", key: "fontSize2", label: "第二行字号", default: 18, min: 12, max: 40, step: 1, unit: "px" },
    { type: "color", key: "ink", label: "第一行墨色", default: "#1d1d1f" },
    { type: "color", key: "subColor", label: "第二行灰色", default: "#8a8a8a" },
    { type: "number", key: "posX", label: "文字块 X", default: 460.8, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "文字块底距", default: 112, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
