import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// info-term-card · 名词解释悬浮卡 —— 参数化版（源出 tplcards/info-term-card.tsx）
// 命门：入场过冲回稳才有"弹"感；落位后 y 正弦悬浮 ±6px + 图标微转；原路滑出。
// 滑入/过冲/浮动/滑出的配比保持 FIXED，语境级开放停留时长（念完释义再收）。
const FPS = 30;

const FIXED = {
  slideIn: 0.35,     // 入场耗时 s（power3.out）
  overshootPx: 12,   // 入场过冲距离（约卡宽 3%）：0 就没有"弹"感
  floatPx: 6,        // 悬浮幅度 ±px：>10 像漂走
  floatPeriod: 2.8,  // 悬浮周期 s（一个来回）
  slideOut: 0.25,    // 出场原路滑出
  iconTilt: 8,       // 图标微转角度 °
};

// —— shared 未含的缓动，本卡局部定义 ——
const power2In = (x: number) => x * x * x;
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
// yoyo tween 进度：repeat 次数内往返（GSAP yoyo 语义：偶数趟正放、奇数趟倒放）
const yoyoP = (t: number, t0: number, half: number, plays: number) => {
  if (t <= t0) return 0;
  const cyc = (t - t0) / half;
  if (cyc >= plays) return plays % 2 === 1 ? 1 : 0;
  const k = Math.floor(cyc);
  const p = cyc - k;
  return k % 2 === 1 ? 1 - p : p;
};

// 演示语境（不属于动效）：主持人占位靠左，名词卡从人物对侧滑入（类名加 itc- 前缀防串卡）
const CSS = `
.itc-card {
  position: absolute;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 20px 22px;
  border-radius: 16px;
  border: 1px solid #e0e0e0;
  box-sizing: border-box;
  /* 投影是"悬浮"这层语义的一部分（无投影就没有悬感），只留最低限度的一层 */
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.10);
}
.itc-icon {
  flex: 0 0 auto;
  width: 46px; height: 46px;
  border-radius: 50%;
  background: #f5f5f7;
  border: 1px solid #e0e0e0;
  box-sizing: border-box;
  font-size: 22px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.itc-term { font-weight: 700; margin-bottom: 6px; }
.itc-term small { font-size: 13px; font-weight: 600; color: #8a8a8a; margin-left: 6px; }
.itc-desc { line-height: 1.55; color: #5a5a5f; }  /* 释义两行封顶 */
`;

interface Props {
  term?: string;
  termSmall?: string;
  desc?: string;
  iconChar?: string;
  inkColor?: string;
  cardBg?: string;
  termSize?: number;
  descSize?: number;
  cardW?: number;
  posRight?: number;
  posY?: number;
  hold?: number;
  offX?: number;
}

const InfoTermCard: React.FC<Props> = ({
  term = "量化宽松",
  termSmall = "QE",
  desc = '央行"印钱"买入国债等资产，把流动性压进市场，刺激经济。',
  iconChar = "¥",
  inkColor = "#1d1d1f",
  cardBg = "#ffffff",
  termSize = 20,
  descSize = 14,
  cardW = 330,
  posRight = 56,
  posY = 194.4,
  hold = 3.2,
  offX = 480,
}) => {
  const t = useCurrentFrame() / FPS;

  // —— x：滑入 → 过冲回稳 → 停留后原路滑出 ——
  const outAt = FIXED.slideIn + 0.16 + hold;   // 默认 3.71
  const x = t < FIXED.slideIn
    ? lerp(offX, -FIXED.overshootPx, tw(t, 0, FIXED.slideIn, power3Out))
    : t < outAt
      ? lerp(-FIXED.overshootPx, 0, tw(t, FIXED.slideIn, 0.16, power2Out))
      : lerp(0, offX, tw(t, outAt, FIXED.slideOut, power2In));

  // —— 落位后：y 正弦浮动营造"悬浮"，图标跟着微转 ——
  // 原卡 repeat 3 = 共 4 个半程；hold 拉长时按需补趟数（默认值下 plays 恰为 4，逐像素一致）
  const floatStart = FIXED.slideIn + 0.16 + 0.05;   // 0.56
  const plays = Math.max(4, Math.ceil((outAt + FIXED.slideOut - floatStart) / (FIXED.floatPeriod / 2)));
  const fp = sineInOut(yoyoP(t, floatStart, FIXED.floatPeriod / 2, plays));
  const y = FIXED.floatPx * fp;
  const iconRot = FIXED.iconTilt * fp;

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      {/* 主持人靠左：原卡剪影 margin-left 6%，即"居中位 29%"整体左移 23% */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "-23%", width: "100%" }}>
        <HostSilhouette />
      </div>
      <div
        className="itc-card"
        style={{
          right: posRight, top: posY, width: cardW,
          background: cardBg, color: inkColor,
          transform: `translate(${x}px, ${y}px)`,
        }}
      >
        <div className="itc-icon" style={{ color: inkColor, transform: `rotate(${iconRot}deg)` }}>{iconChar}</div>
        <div>
          <div className="itc-term" style={{ fontSize: termSize }}>{term}<small>{termSmall}</small></div>
          <div className="itc-desc" style={{ fontSize: descSize }}>{desc}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "info-term-card",
  name: "名词解释悬浮卡",
  category: "数据信息图",
  durationInFrames: 197,
  accent: "#1d1d1f",
  component: InfoTermCard as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "term", label: "名词", default: "量化宽松" },
    { type: "text", key: "termSmall", label: "名词缩写（小字）", default: "QE" },
    { type: "textarea", key: "desc", label: "释义（两行封顶）", default: '央行"印钱"买入国债等资产，把流动性压进市场，刺激经济。' },
    { type: "text", key: "iconChar", label: "图标字符", default: "¥" },
    { type: "color", key: "inkColor", label: "墨色（名词/图标）", default: "#1d1d1f" },
    { type: "color", key: "cardBg", label: "卡片底色", default: "#ffffff" },
    { type: "slider", key: "termSize", label: "名词字号", default: 20, min: 14, max: 32, step: 1, unit: "px" },
    { type: "slider", key: "descSize", label: "释义字号", default: 14, min: 11, max: 20, step: 1, unit: "px" },
    { type: "number", key: "cardW", label: "卡片宽度", default: 330, step: 1, unit: "px" },
    { type: "number", key: "posRight", label: "卡片距右缘", default: 56, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "卡片 Y", default: 194.4, step: 1, unit: "px" },
    { type: "slider", key: "hold", label: "停留时长", default: 3.2, min: 1, max: 6, step: 0.1, unit: "s" },
    { type: "number", key: "offX", label: "屏外待命位移（人物在右改 -480）", default: 480, step: 10, unit: "px" },
  ],
};
