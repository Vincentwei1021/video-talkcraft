import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import {
  FONT_STACK, HostSilhouette, lerp,
  power1Out, power2InOut, power2Out, power3Out, tw,
} from "../shared";

// outline-box-title · 描边框标题 —— 参数化版（源出 tplcards/outline-box-title.tsx）
// 命门：描边框 power2.inOut 近匀速"机器画的框选"；chip 几乎接上不留空拍；
//       chevron 错峰 0.08s、起始 0.25 不是 0——这些节奏配比全部 FIXED。
const FPS = 30;

const FIXED = {
  boxDur: 0.42,       // 描边框画一圈的时长 s（power2.inOut = 机器感）
  chipDur: 0.2,       // chip scaleX 展开时长 s
  chipGap: 0.04,      // chip 相对框闭合的延迟 s（几乎接上，别留空拍）
  chipTxtLag: 0.1,    // chip 内白字相对 chip 的滞后 s
  chipTxtDur: 0.16,   // chip 白字淡入时长 s
  chevGap: 0.06,      // chevron 相对 chip 到位的延迟 s
  chevDur: 0.16,      // 单枚 chevron 点亮时长 s
  chevStagger: 0.08,  // chevron 之间的错峰 s
  chevDim: 0.25,      // chevron 起始 opacity（不是 0——它们本来"在那儿"，只是暗）
  chevSlide: 4,       // chevron 点亮时的 x 位移 px
  chevOffsetY: 218,   // chevron 行相对文字块顶部的纵向偏移 px（386 - 168）
};

// 描边框路径总长（demo 用 getTotalLength 实测；4 直边 + 4 圆角弧 ≈ 880.5）
const BOX_LEN = 880.5;

interface Props {
  titleText?: string;
  chipText?: string;
  accent?: string;
  ink?: string;
  titleFontSize?: number;
  chipFontSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
}

const OutlineBoxTitle: React.FC<Props> = ({
  titleText = "核心观点",
  chipText = "在这里",
  accent = "#7A5AF8",
  ink = "#1d1d1f",
  titleFontSize = 56,
  chipFontSize = 40,
  posX = 96,
  posY = 168,
  lead = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  // ① 框选：一笔画一圈，近匀速
  const boxP = tw(t, lead, FIXED.boxDur, power2InOut);
  const dashOffset = BOX_LEN * (1 - boxP);

  // ② chip 展开 + 白字滞后
  const chipAt = lead + FIXED.boxDur + FIXED.chipGap;
  const chipScaleX = tw(t, chipAt, FIXED.chipDur, power3Out);
  const chipTxtOpacity = tw(t, chipAt + FIXED.chipTxtLag, FIXED.chipTxtDur, power1Out);

  // ③ chevron 依次点亮
  const chevAt = chipAt + FIXED.chipDur + FIXED.chevGap;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 448 }}>
        <HostSilhouette />
      </div>

      <div style={{ position: "absolute", left: posX, top: posY }}>
        <div style={{ position: "relative", width: 356, height: 104 }}>
          <div style={{
            position: "absolute", left: 30, top: 22,
            fontSize: titleFontSize, fontWeight: 700, lineHeight: 1,
            color: ink, letterSpacing: 2, whiteSpace: "nowrap",
          }}>
            {titleText}
          </div>
          {/* 描边框：从左上顺时针一圈的圆角矩形路径（起点在上边中偏左，一笔精确闭合） */}
          <svg
            viewBox="0 0 356 104"
            style={{ position: "absolute", left: 0, top: 0, width: 356, height: 104, overflow: "visible" }}
          >
            <path
              d="M 34 2 H 342 A 14 14 0 0 1 354 16 V 88 A 14 14 0 0 1 342 102
                 H 14 A 14 14 0 0 1 2 88 V 16 A 14 14 0 0 1 14 2 Z"
              fill="none" stroke={accent} strokeWidth={4}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={BOX_LEN}
              strokeDashoffset={dashOffset}
            />
          </svg>
        </div>

        <div style={{ position: "relative", marginTop: 22, height: 66, width: 260 }}>
          <div style={{
            position: "absolute", inset: 0, background: accent,
            borderRadius: 12, transformOrigin: "left center",
            transform: `scaleX(${chipScaleX})`,
          }} />
          <div style={{
            position: "absolute", left: 26, top: 13,
            fontSize: chipFontSize, fontWeight: 700, lineHeight: 1,
            color: "#ffffff", letterSpacing: 2, whiteSpace: "nowrap",
            opacity: chipTxtOpacity,
          }}>
            {chipText}
          </div>
        </div>
      </div>

      <div style={{
        position: "absolute", left: posX, top: posY + FIXED.chevOffsetY,
        display: "flex", gap: 10,
      }}>
        {[0, 1, 2].map((i) => {
          const p = tw(t, chevAt + i * FIXED.chevStagger, FIXED.chevDur, power2Out);
          return (
            <svg key={i} viewBox="0 0 26 34" style={{
              width: 26, height: 34,
              opacity: lerp(FIXED.chevDim, 1, p),
              transform: `translateX(${lerp(FIXED.chevSlide, 0, p)}px)`,
            }}>
              <path
                d="M 7 5 L 19 17 L 7 29"
                fill="none" stroke={accent} strokeWidth={5}
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "outline-box-title",
  name: "描边框标题",
  category: "字幕花字",
  durationInFrames: 103,
  accent: "#7A5AF8",
  component: OutlineBoxTitle as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "titleText", label: "框内标题", default: "核心观点" },
    { type: "text", key: "chipText", label: "chip 文案", default: "在这里" },
    { type: "slider", key: "titleFontSize", label: "标题字号", default: 56, min: 32, max: 80, step: 1, unit: "px" },
    { type: "slider", key: "chipFontSize", label: "chip 字号", default: 40, min: 24, max: 60, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "语义色", default: "#7A5AF8" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "number", key: "posX", label: "文字块 X", default: 96, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "文字块 Y", default: 168, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
