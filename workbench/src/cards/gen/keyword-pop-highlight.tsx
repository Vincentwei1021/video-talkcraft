import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power4Out, tw } from "../shared";

// keyword-pop-highlight · 关键词弹出强调 —— 参数化版（源出 tplcards/keyword-pop-highlight.tsx）
// 命门：弹出/回落/抖动的多段节奏配比保持 FIXED；语境级只开放起手静置。
const FPS = 30;

const FIXED = {
  popScale: 1.65, // 关键词最大放大倍数：>1.9 读作搞笑向，<1.3 强调不足
  popIn: 0.18, // 弹出耗时 s：快才有"砸出来"的劲
  settle: 0.22, // 回落到 1.15 的耗时
  restScale: 1.15, // 定格倍数：关键词比正文略大
  shakePx: 7, // 弹出瞬间整屏微震幅度 px
  shakeDur: 0.24, // 整屏抖动总时长 s（6 段各 0.04s）
};

// back.out(2.5)——shared 未含，本卡局部定义
const backOut = (s: number) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};
const BACK_OUT_25 = backOut(2.5);

interface Props {
  textBefore?: string;
  keyword?: string;
  textAfter?: string;
  kwColor?: string;
  blockColor?: string;
  ink?: string;
  fontSize?: number;
  delay?: number;
}

const KeywordPopHighlight: React.FC<Props> = ({
  textBefore = "这家公司一年烧掉",
  keyword = "300个亿",
  textAfter = "，还在疯狂扩张",
  kwColor = "#ffd23e",
  blockColor = "#b33131",
  ink = "#1d1d1f",
  fontSize = 34,
  delay = 0.55,
}) => {
  const t = useCurrentFrame() / FPS;

  // ① 弹出：scale 0→1.65（power4.out）；抖动结束后回落（back.out(2.5)）
  const popP = tw(t, delay, FIXED.popIn, power4Out);
  const settleAt = delay + FIXED.shakeDur;
  const settleP = tw(t, settleAt, FIXED.settle, BACK_OUT_25);
  const scale = t < settleAt
    ? lerp(0, FIXED.popScale, popP)
    : lerp(FIXED.popScale, FIXED.restScale, settleP);
  const rotate = t < settleAt ? lerp(-8, 2, popP) : lerp(2, 0, settleP);
  const opacity = popP;

  // ② 弹出的冲击帧：整个画面 ±shakePx 左右抖 3 个来回（0.04s/次，linear）
  const shakeVals = [0, FIXED.shakePx, -FIXED.shakePx, FIXED.shakePx,
                     -FIXED.shakePx, FIXED.shakePx, 0];
  let shakeX = 0;
  if (t >= delay && t < delay + FIXED.shakeDur) {
    const seg = ((t - delay) / FIXED.shakeDur) * (shakeVals.length - 1);
    const i = Math.min(shakeVals.length - 2, Math.floor(seg));
    shakeX = lerp(shakeVals[i], shakeVals[i + 1], seg - i);
  }

  return (
    <AbsoluteFill style={{ background: "#ffffff", overflow: "hidden" }}>
      {/* 抖的是整个内层画面 */}
      <AbsoluteFill
        style={{
          background: "#ffffff", color: ink, overflow: "hidden",
          fontFamily: FONT_STACK,
          transform: `translateX(${shakeX}px)`,
        }}
      >
        <HostSilhouette />
        <div
          style={{
            position: "absolute", left: 0, right: 0, bottom: "6%",
            display: "flex", justifyContent: "center", pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize, fontWeight: 600, color: ink,
              letterSpacing: 1, whiteSpace: "nowrap",
            }}
          >
            {textBefore}
            <span
              style={{
                display: "inline-block", position: "relative",
                margin: "0 0.36em", // 留出 1.15 倍定格 + skew 的溢出，否则色块压到相邻字
                padding: "0.04em 0.18em",
                fontWeight: 800, color: kwColor,
                transformOrigin: "50% 80%",
                opacity,
                transform: `rotate(${rotate}deg) scale(${scale})`,
              }}
            >
              {/* 色块底（原 .kw::before） */}
              <span
                style={{
                  position: "absolute", inset: 0,
                  background: blockColor, borderRadius: "0.14em",
                  zIndex: -1, transform: "skewX(-6deg)",
                }}
              />
              {keyword}
            </span>
            {textAfter}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "keyword-pop-highlight",
  name: "关键词弹出强调",
  category: "字幕花字",
  durationInFrames: 42,
  accent: "#b33131",
  component: KeywordPopHighlight as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "textBefore", label: "关键词前文", default: "这家公司一年烧掉" },
    { type: "text", key: "keyword", label: "关键词（弹出）", default: "300个亿" },
    { type: "text", key: "textAfter", label: "关键词后文", default: "，还在疯狂扩张" },
    { type: "slider", key: "fontSize", label: "字幕字号", default: 34, min: 22, max: 56, step: 1, unit: "px" },
    { type: "color", key: "kwColor", label: "关键词字色", default: "#ffd23e" },
    { type: "color", key: "blockColor", label: "色块底色", default: "#b33131" },
    { type: "color", key: "ink", label: "正文墨色", default: "#1d1d1f" },
    { type: "slider", key: "delay", label: "起手静置", default: 0.55, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
