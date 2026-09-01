import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// quote-card · 金句大字卡 —— 参数化版（源出 tplcards/quote-card.tsx）
// 底板整屏盖住人物（遮蔽动作）+ 逐行错峰弹入。
// 命门：底板淡入 0.25s / 行弹入 0.4s / 行错峰 0.15s / 出场下滑 0.3s——全部 FIXED；
//       停留时长（hold）随口播语速可调。
const FPS = 30;

const FIXED = {
  panelIn: 0.25,     // 底色板淡入耗时 s：盖住人物的仪式感
  panelDim: 1,       // 底板不透明度：低于 0.9 文字会和人物打架
  lineIn: 0.4,       // 单行弹入耗时 s（y 30→0 + opacity，power3.out）
  lineStagger: 0.15, // 行间错峰 120~180ms：同时出=没有"逐句砸"的语感
  lineRise: 30,      // 行入场位移 px
  out: 0.3,          // 出场整卡下滑淡出耗时 s
  outDrop: 40,       // 出场下滑距离 px
  linesLag: 0.20,    // 首行相对底板起始的滞后 s（0.35 - 0.15）
  srcLag: 0.95,      // 出处相对底板起始的滞后 s（1.10 - 0.15）
  srcIn: 0.3,        // 出处淡入耗时 s
};

const power2In = (x: number) => x * x * x;

interface Props {
  lines?: string;
  source?: string;
  panelColor?: string;
  textColor?: string;
  kwColor?: string;
  fontSize?: number;
  lead?: number;
  hold?: number;
}

const QuoteCard: React.FC<Props> = ({
  lines = "赚钱这件事\n从来不靠**努力**\n靠的是**认知**\n和你敢不敢选",
  source = "—— 口播金句 · 第 47 期",
  panelColor = "#1d1d1f",
  textColor = "#ffffff",
  kwColor = "#ffd23e",
  fontSize = 42,
  lead = 0.15,
  hold = 2,
}) => {
  const t = useCurrentFrame() / FPS;

  // 时间锚点：底板 → 行 → 出处 → hold → 出场（默认值 = 源码 0.15 / 0.35 / 1.10 / 3.40）
  const linesAt = lead + FIXED.linesLag;
  const srcAt = lead + FIXED.srcLag;
  const outAt = srcAt + FIXED.srcIn + hold;

  // 底板：淡入 → hold → 整卡下滑淡出
  const outP = tw(t, outAt, FIXED.out, power2In);
  const panelOpacity = t < outAt
    ? lerp(0, FIXED.panelDim, tw(t, lead, FIXED.panelIn, power2Out))
    : lerp(FIXED.panelDim, 0, outP);
  const panelY = lerp(0, FIXED.outDrop, outP);

  // 逐行错峰弹入：整行动，行内不再加字级动画
  const lineDyn = (i: number): React.CSSProperties => {
    const p = tw(t, linesAt + i * FIXED.lineStagger, FIXED.lineIn, power3Out);
    return { opacity: p, transform: `translateY(${lerp(FIXED.lineRise, 0, p)}px)` };
  };
  const srcOpacity = tw(t, srcAt, FIXED.srcIn, power2Out);

  // **词** 标记 ⇒ 行内关键词：换色 + 1.2x，不再加字级动画（静态高亮）
  const parseLine = (line: string): React.ReactNode =>
    line.split(/\*\*(.+?)\*\*/g).map((seg, j) =>
      j % 2 === 1
        ? <span key={j} style={{ color: kwColor, fontSize: "1.2em" }}>{seg}</span>
        : seg,
    );

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <HostSilhouette />
      {/* 底板要够实，别让文字和人物打架；深底与舞台白底的明度反差 = "盖住人物"可见 */}
      <div style={{
        position: "absolute", inset: 0, background: panelColor,
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        gap: 26, padding: "0 28px",
        opacity: panelOpacity, transform: `translateY(${panelY}px)`,
      }}>
        {lines.split("\n").map((line, i) => (
          <div key={i} style={{
            fontSize, fontWeight: 800, lineHeight: 1.25,
            color: textColor, letterSpacing: 2, whiteSpace: "nowrap",
            ...lineDyn(i),
          }}>
            {parseLine(line)}
          </div>
        ))}
        <div style={{
          marginTop: 10, fontSize: 16, color: "#8a8a8a", letterSpacing: 4,
          opacity: srcOpacity,
        }}>
          {source}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "quote-card",
  name: "金句大字卡",
  category: "字幕花字",
  durationInFrames: 123,
  accent: "#ffd23e",
  component: QuoteCard as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "lines", label: "金句（每行一句，**词** 高亮）", default: "赚钱这件事\n从来不靠**努力**\n靠的是**认知**\n和你敢不敢选" },
    { type: "text", key: "source", label: "出处", default: "—— 口播金句 · 第 47 期" },
    { type: "slider", key: "fontSize", label: "正文字号", default: 42, min: 28, max: 64, step: 1, unit: "px" },
    { type: "color", key: "panelColor", label: "底板色", default: "#1d1d1f" },
    { type: "color", key: "textColor", label: "文字色", default: "#ffffff" },
    { type: "color", key: "kwColor", label: "关键词色", default: "#ffd23e" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.15, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "hold", label: "停留时长", default: 2, min: 0.5, max: 4, step: 0.1, unit: "s" },
  ],
};
