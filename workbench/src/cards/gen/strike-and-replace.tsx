import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power1Out, power2Out, power3Out, tw } from "../shared";

// strike-and-replace · 划线纠错替换 —— 参数化版（源出 tplcards/strike-and-replace.tsx）
// 命门：快斩三拍——划线 0.15s 一瞬间到底（>0.4s 读作"慢慢涂"），+0.1s 立换，然后定格让观众读。
// 隐形尺子把 from/to 里更长的一串撑住容器 ⇒ 换值零位移。语义色只上那条划掉线。
const FPS = 30;

const FIXED = {
  strikeDur: 0.15,   // 划线时长 s：一瞬间的快斩
  swapLag: 0.10,     // 交换相对划线结束的延迟 s：斩完立刻换，不留犹豫
  swapDur: 0.25,     // 交换时长 s（旧值淡出 + 新值升入）
  toRise: 8,         // 新值从下方多少 px 升入（约字号 20%）
};

interface Props {
  pre?: string;
  from?: string;
  to?: string;
  post?: string;
  strikeColor?: string;
  ink?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
  keepStrike?: boolean;
}

const StrikeAndReplace: React.FC<Props> = ({
  pre = "上下文窗口是",
  from = "128K",
  to = "1M",
  post = "，一年翻了八倍",
  strikeColor = "#e0452c",
  ink = "#1d1d1f",
  fontSize = 32,
  posX = 432,
  posY = 270,
  lead = 0.35,
  keepStrike = true,
}) => {
  const t = useCurrentFrame() / FPS;

  // ① 划线：一瞬间快斩到底（power3.out 冲出去收住）
  const strikeX = tw(t, lead, FIXED.strikeDur, power3Out);

  // ② 交换：斩完立刻换——旧值淡出、新值从 y+8 淡入回落（同位叠放 ⇒ 替换感）
  const swapAt = lead + FIXED.strikeDur + FIXED.swapLag;
  const fromOpacity = 1 - tw(t, swapAt, FIXED.swapDur, power1Out);
  const toP = tw(t, swapAt, FIXED.swapDur, power2Out);
  const toY = lerp(FIXED.toRise, 0, toP);
  const strikeOpacity = keepStrike ? 1 : fromOpacity;

  // 尺子：from / to 里更长的那一串
  const longer = from.length >= to.length ? from : to;

  // 两个值都以槽的中线为锚（translateX(-50%)），短值在预留宽度里居中
  const wordBase: React.CSSProperties = {
    position: "absolute", left: "50%", top: 0,
    whiteSpace: "nowrap", willChange: "transform, opacity",
    color: ink,   // 旧值/新值都保持墨色——语义色只上那条线
  };

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 演示语境：主持人列（不属于本卡动效） */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>
      <div
        style={{
          position: "absolute", left: posX, top: posY, transform: "translateY(-50%)",
          fontSize, fontWeight: 700, lineHeight: 1.5,
          whiteSpace: "nowrap",   // 单行：替换槽后面必须还有字，才看得出"零位移"
          color: ink,
        }}
      >
        {pre}
        {/* 替换槽：宽度由"隐形尺子"撑住——旧字与新字都绝对定位在它里面，占同一个位置 */}
        <span style={{ position: "relative", display: "inline-block", verticalAlign: "baseline" }}>
          <span style={{ visibility: "hidden", whiteSpace: "nowrap" }}>{longer}</span>
          <span style={{ ...wordBase, opacity: fromOpacity, transform: "translateX(-50%)" }}>
            {from}
            {/* 划掉线：唯一的语义色。origin left + scaleX 0→1。挂在旧值上 ⇒ 旧值淡出时线跟着走 */}
            <span
              style={{
                position: "absolute", left: 0, top: "50%",
                height: fontSize * (3 / 32),    // = 字号 8%，随字号等比
                width: "100%",
                background: strikeColor, borderRadius: 2,
                transformOrigin: "left center", willChange: "transform",
                opacity: strikeOpacity,
                transform: `translateY(-50%) scaleX(${strikeX})`,
              }}
            />
          </span>
          <span style={{ ...wordBase, opacity: toP, transform: `translateX(-50%) translateY(${toY}px)` }}>
            {to}
          </span>
        </span>
        {post}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "strike-and-replace",
  name: "划线纠错替换",
  category: "强调标注",
  durationInFrames: 98,
  accent: "#e0452c",
  component: StrikeAndReplace as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "pre", label: "句首（槽前文案）", default: "上下文窗口是" },
    { type: "text", key: "from", label: "旧值（被划掉）", default: "128K" },
    { type: "text", key: "to", label: "新值（替换后）", default: "1M" },
    { type: "text", key: "post", label: "句尾（槽后文案）", default: "，一年翻了八倍" },
    { type: "slider", key: "fontSize", label: "句子字号", default: 32, min: 22, max: 48, step: 1, unit: "px" },
    { type: "color", key: "strikeColor", label: "划线色", default: "#e0452c" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "number", key: "posX", label: "句子左缘 X", default: 432, min: 0, max: 900, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "句子中心 Y", default: 270, min: 0, max: 540, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.35, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "boolean", key: "keepStrike", label: "划线留在屏上", default: true },
  ],
};
