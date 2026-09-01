import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, power2Out, power4In, power4Out, tw } from "../shared";

// lower-third-nameplate · 人名条展示牌 —— 参数化版（源出 tplcards/lower-third-nameplate.tsx）
// 命门：色条展开 → 姓名揭示 → 头衔跟进的错峰配比，以及"反向收回、不是淡出"的出场，
// 全部保持 FIXED；语境级只开放起手静置与停留时长。
const FPS = 30;

const FIXED = {
  barDur: 0.3,          // 色条 scaleX 展开时长 s
  nameDur: 0.25,        // 姓名 clip-path 揭示时长 s
  titleLag: 0.15,       // 头衔相对姓名的延迟 s：同时出 = 层次塌
  outDur: 0.3,          // 出场时长 s：反向收回，不是淡出
  nameStartRatio: 0.7,  // 色条走完 70% 时姓名起步
  barOutLag: 0.16,      // 出场序：头衔先收、姓名 +0.08、色条 +0.16 最后收
  nameOutLag: 0.08,
  textOutRatio: 0.7,    // 姓名/头衔收回时长 = outDur × 0.7
};

// shared 未含 power2In（本卡出场用缓入）——局部定义，对照 GSAP 名字
const power2In = (x: number) => x * x * x;

interface Props {
  name?: string;
  title?: string;
  ink?: string;
  barColor?: string;
  titleColor?: string;
  nameSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
  hold?: number;
}

const LowerThirdNameplate: React.FC<Props> = ({
  name = "王砚秋",
  title = "半导体行业分析师 · 从业 14 年",
  ink = "#1d1d1f",
  barColor = "#1d1d1f",
  titleColor = "#8a8a8a",
  nameSize = 42,
  posX = 56,
  posY = 64,
  lead = 0.4,
  hold = 2.0,
}) => {
  const t = useCurrentFrame() / FPS;

  const nameAt = lead + FIXED.barDur * FIXED.nameStartRatio; // 色条走完 70% 时姓名起步
  const titleAt = nameAt + FIXED.titleLag;
  const outAt = lead + FIXED.barDur + hold;

  // 色条：scaleX 展开（power4.out）→ 最后反向收回（power4.in）
  const barScale = t < outAt + FIXED.barOutLag
    ? tw(t, lead, FIXED.barDur, power4Out)
    : 1 - tw(t, outAt + FIXED.barOutLag, FIXED.outDur, power4In);

  // 姓名/头衔：clip-path 从左揭示（shown = 可见比例 0~1）
  const nameShown = t < outAt + FIXED.nameOutLag
    ? tw(t, nameAt, FIXED.nameDur, power2Out)
    : 1 - tw(t, outAt + FIXED.nameOutLag, FIXED.outDur * FIXED.textOutRatio, power2In);
  const titleShown = t < outAt
    ? tw(t, titleAt, FIXED.nameDur, power2Out)
    : 1 - tw(t, outAt, FIXED.outDur * FIXED.textOutRatio, power2In);

  const clip = (shown: number) => `inset(0% ${(1 - shown) * 100}% 0% 0%)`;

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 演示语境：真人出镜访谈画面（不属于动效本体） */}
      <HostSilhouette />

      <div style={{ position: "absolute", left: posX, bottom: posY }}>
        <div
          style={{
            fontSize: nameSize, fontWeight: 800, color: ink,
            lineHeight: 1.15, letterSpacing: 2,
            clipPath: clip(nameShown),
          }}
        >
          {name}
        </div>
        {/* 色条 = 动效本体（scaleX 展开的那根）。默认中性墨色；复用时这里换品牌色 */}
        <div
          style={{
            height: 7, width: "100%", background: barColor, borderRadius: 2,
            margin: "10px 0 10px", transformOrigin: "left center",
            transform: `scaleX(${barScale})`,
          }}
        />
        <div
          style={{
            fontSize: 19, color: titleColor, letterSpacing: 1.5,
            clipPath: clip(titleShown),
          }}
        >
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "lower-third-nameplate",
  name: "人名条展示牌",
  category: "人物互动",
  durationInFrames: 107,
  accent: "#1d1d1f",
  component: LowerThirdNameplate as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "name", label: "姓名", default: "王砚秋" },
    { type: "text", key: "title", label: "头衔", default: "半导体行业分析师 · 从业 14 年" },
    { type: "slider", key: "nameSize", label: "姓名字号", default: 42, min: 28, max: 64, step: 1, unit: "px" },
    { type: "color", key: "barColor", label: "色条颜色", default: "#1d1d1f" },
    { type: "color", key: "ink", label: "姓名墨色", default: "#1d1d1f" },
    { type: "color", key: "titleColor", label: "头衔颜色", default: "#8a8a8a" },
    { type: "number", key: "posX", label: "名条左缘 X", default: 56, min: 0, max: 900, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "名条距底边", default: 64, min: 0, max: 500, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "hold", label: "停留（实拍建议 3~5s）", default: 2.0, min: 0.5, max: 5, step: 0.1, unit: "s" },
  ],
};
