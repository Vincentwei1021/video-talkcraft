import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import {
  FONT_STACK, HostSilhouette, lerp,
  power2InOut, power2Out, power3Out, tw,
} from "../shared";

// quote-bracket-pull · 引号夹句 —— 参数化版（源出 tplcards/quote-bracket-pull.tsx）
// 两枚引号同帧向内"夹" → 三行错峰淡入 → 荧光笔扫关键短语。
// 命门：引号推入距离/落定不透明度、行错峰 0.09s、荧光笔呼吸与扫速——全部 FIXED；
//       引号字号恒为正文 3.375 倍（32px 正文 ⇒ 108px 引号），随正文字号等比。
const FPS = 30;

const FIXED = {
  markDur: 0.32,     // 引号推入耗时 s
  markOpacity: 0.9,  // 引号落定不透明度：<0.8 读作水印，1.0 抢过正文（引号是符号不是标题）
  markDx: 30,        // 引号横向推入距离 px（左 -30 / 右 +30，反向对称）
  markDy: 14,        // 引号纵向推入距离 px（左 -14 / 右 +14）
  lineDur: 0.30,     // 单行淡入耗时 s
  lineStagger: 0.09, // 行错峰 s：比 quote-card 的 0.15 更密——本卡是"一句话"不是"逐句砸"
  lineRise: 6,       // 行上浮位移 px：只有一点重量，不抢引号的"夹"
  markerGap: 0.10,   // 末行到位 → 荧光笔起扫 的呼吸 s
  markerDur: 0.26,   // 荧光笔扫过耗时 s
};

interface Props {
  line1?: string;
  line2?: string;
  line3Head?: string;
  keyText?: string;
  ink?: string;
  markerColor?: string;
  fontSize?: number;
  lead?: number;
}

const QuoteBracketPull: React.FC<Props> = ({
  line1 = "真正拉开差距的",
  line2 = "从来不是谁更聪明",
  line3Head = "而是谁愿意",
  keyText = "主动去解决问题",
  ink = "#1d1d1f",
  markerColor = "#FFE949",
  fontSize = 32,
  lead = 0.35,
}) => {
  const t = useCurrentFrame() / FPS;
  // 整套引号/荧光笔几何按正文字号等比（k=1 时与源码逐像素一致）
  const k = fontSize / 32;

  // ① 两枚引号从画外向内推入——同帧同曲线（"夹住"是一个动作）
  const markP = tw(t, lead, FIXED.markDur, power3Out);
  const markOpacity = lerp(0, FIXED.markOpacity, markP);
  const openX = lerp(-FIXED.markDx, 0, markP), openY = lerp(-FIXED.markDy, 0, markP);
  const closeX = lerp(FIXED.markDx, 0, markP), closeY = lerp(FIXED.markDy, 0, markP);

  // ② 三行金句错峰淡入上浮（引号走过一半就起字，不空等）
  const linesAt = lead + FIXED.markDur * 0.5;
  const lineDyn = (i: number): React.CSSProperties => {
    const p = tw(t, linesAt + i * FIXED.lineStagger, FIXED.lineDur, power2Out);
    return { opacity: p, transform: `translateY(${lerp(FIXED.lineRise, 0, p)}px)` };
  };

  // ③ 末行到位后荧光笔扫过关键短语
  const markerAt = linesAt + FIXED.lineStagger * 2 + FIXED.lineDur + FIXED.markerGap;
  const markerX = tw(t, markerAt, FIXED.markerDur, power2InOut);

  const lineStyle: React.CSSProperties = {
    fontSize, fontWeight: 600, lineHeight: 1.5, color: ink, whiteSpace: "nowrap",
  };
  // 大引号：尺寸必须压过正文两倍以上才立得住（32px 正文 ⇒ 108px 引号）
  const markStyle: React.CSSProperties = {
    position: "absolute",
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 108 * k, fontWeight: 700, lineHeight: 1,
    color: ink, userSelect: "none",
  };

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      {/* 金句块 + 两枚大引号（符号，不是装饰）；width fit-content——引号"夹"在句子边上 */}
      <div style={{
        position: "absolute", left: "50%", top: "45%",
        transform: "translate(-50%, -50%)", width: "fit-content",
      }}>
        <span style={{
          ...markStyle, left: -42 * k, top: -74 * k,
          opacity: markOpacity, transform: `translate(${openX}px, ${openY}px)`,
        }}>{"“"}</span>
        <div style={{ ...lineStyle, ...lineDyn(0) }}>{line1}</div>
        <div style={{ ...lineStyle, ...lineDyn(1) }}>{line2}</div>
        <div style={{ ...lineStyle, ...lineDyn(2) }}>
          {line3Head}
          <span style={{ position: "relative", display: "inline-block" }}>
            {/* 关键短语的荧光笔下划线（命门：mix-blend multiply 在字下层，不许盖字） */}
            <span style={{
              position: "absolute",
              left: -5 * k, right: -7 * k, bottom: 6 * k, height: 15 * k,
              background: markerColor, opacity: 0.6, mixBlendMode: "multiply",
              borderRadius: "9px 4px 8px 3px / 5px 9px 4px 8px",  // 不规则圆角 = 笔触，不是选区
              transformOrigin: "left center",
              transform: `scaleX(${markerX})`,
            }} />
            {keyText}
          </span>
        </div>
        <span style={{
          ...markStyle, right: -30 * k, bottom: -104 * k,
          opacity: markOpacity, transform: `translate(${closeX}px, ${closeY}px)`,
        }}>{"”"}</span>
      </div>

      {/* 演示语境（不属于动效）：角标主持人——本卡不盖底板，人物全程留在画面里 */}
      <div style={{
        position: "absolute", left: 26, bottom: 22,
        width: 96, height: 96, borderRadius: "50%",
        borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
        overflow: "hidden", background: "#fff",
      }}>
        <HostSilhouette />
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "quote-bracket-pull",
  name: "引号夹句",
  category: "字幕花字",
  durationInFrames: 119,
  accent: "#FFE949",
  component: QuoteBracketPull as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "line1", label: "第一行", default: "真正拉开差距的" },
    { type: "text", key: "line2", label: "第二行", default: "从来不是谁更聪明" },
    { type: "text", key: "line3Head", label: "第三行前半", default: "而是谁愿意" },
    { type: "text", key: "keyText", label: "关键短语（被荧光笔扫）", default: "主动去解决问题" },
    { type: "slider", key: "fontSize", label: "正文字号", default: 32, min: 20, max: 48, step: 1, unit: "px" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "color", key: "markerColor", label: "荧光色", default: "#FFE949" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.35, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
