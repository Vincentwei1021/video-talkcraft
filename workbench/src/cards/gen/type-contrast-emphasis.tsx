import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// type-contrast-emphasis · 字体对比重音 —— 参数化版（源出 tplcards/type-contrast-emphasis.tsx）
// 命门：所有词共一条基线（baseline），大字从基线往上长；运动刻意做轻——不弹跳、不过冲。
// 词级入场时长/上滑量/倾斜角/放大倍数保持 FIXED；分词与语音时刻属语境（必须抄真实语速），经 textarea 开放。
const FPS = 30;

const FIXED = {
  wordIn: 0.1, // 普通词轻 pop 时长 s：>0.2s 跟不上语速
  wordFromScale: 0.95, // 普通词起始倍数：只做"落笔"的一下，不做弹跳
  accentIn: 0.15, // 重音词入场时长 s：字大所以给多 50ms，仍要轻
  accentFromScale: 0.92, // 重音词起始倍数（配合上滑，读作"顶上来"）
  accentRise: 14, // 重音词从基线下方多少 px 上滑回落（约字号的 30%）
  obliqueDeg: -7, // 衬线词倾斜角：中文无真斜体，显式 skewX 才各端一致
  serifScale: 1.6, // 通道① 字形：衬线斜体放大倍数
  colorScale: 1.5, // 通道② 色彩：换强调色，放大量级略收
};

const SERIF_STACK =
  '"Songti SC", "STSong", "Source Han Serif SC", "Noto Serif CJK SC", ' +
  'Georgia, "Playfair Display", serif';

type Word = { w: string; beat: number; emph?: "serif" | "color" };

/** 每行一词："词 | 语音时刻s | 可选通道(serif/color)" */
const parseWords = (src: string): Word[] =>
  src
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split("|").map((s) => s.trim());
      const beat = Number(parts[1]) || 0;
      const ch = parts[2];
      const emph = ch === "serif" || ch === "color" ? ch : undefined;
      return { w: parts[0] ?? "", beat, emph };
    });

const DEFAULT_WORDS =
  "能留住人的 | 0.00\n不是 | 0.72\n流量 | 1.02 | serif\n是 | 1.36\n信任 | 1.52 | color";

interface Props {
  words?: string;
  accent?: string;
  ink?: string;
  fontSize?: number;
  startDelay?: number;
}

const TypeContrastEmphasis: React.FC<Props> = ({
  words = DEFAULT_WORDS,
  accent = "#0066cc",
  ink = "#1d1d1f",
  fontSize = 32,
  startDelay = 0.15,
}) => {
  const t = useCurrentFrame() / FPS;
  const list = parseWords(words);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>
      <div
        style={{
          position: "absolute", left: "48%", right: "3%", top: "50%",
          transform: "translateY(-50%)", pointerEvents: "none",
        }}
      >
        {/* 命门：所有词共一条基线，大字从基线往上长，基线一动就散 */}
        <div
          style={{
            display: "flex", flexWrap: "wrap", alignItems: "baseline",
            justifyContent: "flex-start", gap: "10px 12px",
          }}
        >
          {list.map((item, i) => {
            const at = startDelay + item.beat; // 该词的语音时刻
            let anim: React.CSSProperties;
            if (!item.emph) {
              // 普通词：极轻的 pop，无回弹——它的本分是把句子铺出来，不抢重音
              const p = tw(t, at, FIXED.wordIn, power2Out);
              anim = {
                opacity: p,
                transform: `scale(${lerp(FIXED.wordFromScale, 1, p)})`,
              };
            } else {
              // 重音词：气质已由样式换掉（衬线斜体放大 / 强调色放大），
              // 运动只做"从基线下方上滑回落 + 轻放大淡入"，power3.out 收得干净
              const skew = item.emph === "serif" ? FIXED.obliqueDeg : 0;
              const p = tw(t, at, FIXED.accentIn, power3Out);
              anim = {
                opacity: p,
                transform:
                  `translateY(${lerp(FIXED.accentRise, 0, p)}px)` +
                  ` scale(${lerp(FIXED.accentFromScale, 1, p)}) skewX(${skew}deg)`,
              };
            }
            const base: React.CSSProperties = {
              display: "inline-block",
              fontFamily: FONT_STACK,
              fontSize,
              fontWeight: 600, // 中字：给重音词留出字重落差
              lineHeight: 1.3,
              color: ink,
              transformOrigin: "50% 100%", // 缩放锚在基线：轻 pop 不推基线
            };
            if (item.emph === "serif") {
              base.fontFamily = SERIF_STACK;
              base.fontSize = fontSize * FIXED.serifScale;
              base.marginRight = 4; // 倾斜后右上角外探，多留一点位防压相邻字
            } else if (item.emph === "color") {
              base.fontSize = fontSize * FIXED.colorScale;
              base.fontWeight = 800;
              base.color = accent;
            }
            return (
              <span key={i} style={{ ...base, ...anim }}>
                {item.w}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "type-contrast-emphasis",
  name: "字体对比重音",
  category: "字幕花字",
  durationInFrames: 67,
  accent: "#0066cc",
  component: TypeContrastEmphasis as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "textarea",
      key: "words",
      label: "分词与语音时刻（词 | 秒 | serif/color）",
      default: DEFAULT_WORDS,
    },
    { type: "slider", key: "fontSize", label: "正文字号", default: 32, min: 20, max: 56, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "强调色（色彩通道）", default: "#0066cc" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.15, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
