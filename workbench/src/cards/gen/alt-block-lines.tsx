import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, power3Out, tw } from "../shared";

// alt-block-lines · 双色块对句 —— 参数化版（源出 tplcards/alt-block-lines.tsx）
// 命门：文字必须被块"刷"出来（clip 滞后 2 帧跟随块的右缘）。块和字各自淡入 = 两个动效不是一个。
// 展开时长/错峰/字滞后保持 FIXED；语境级只开放起手静置。
const FPS = 30;

const FIXED = {
  dur: 0.26, // 单行展开时长 s（块与字共用）
  rowStagger: 0.12, // 两行错峰 s（>0.25s 读作两个独立动效）
  textLag: 0.067, // 字相对块的滞后 s（2 帧 @30fps）—— 本卡命门
};

interface Props {
  line1?: string;
  line2?: string;
  blockColor?: string;
  ink?: string;
  fontSize?: number;
  posX?: number;
  lead?: number;
}

const AltBlockLines: React.FC<Props> = ({
  line1 = "先做减法",
  line2 = "再做加法",
  blockColor = "#0aa3a3",
  ink = "#1d1d1f",
  fontSize = 66,
  posX = 82,
  lead = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  // 同结构反色：块1 实色 + 白字；块2 白底 + 墨字 + 1px 灰描边
  const rows: { text: string; bg: string; color: string; shadow?: string }[] = [
    { text: line1, bg: blockColor, color: "#ffffff" },
    { text: line2, bg: "#ffffff", color: ink, shadow: "inset 0 0 0 1px #d8d8d8" },
  ];

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>
      <div
        style={{
          position: "absolute", left: posX, top: "50%",
          transform: "translateY(-50%)",
          display: "flex", flexDirection: "column",
          alignItems: "flex-start", // 块左对齐、宽度各自贴合文字
          gap: 16,
        }}
      >
        {rows.map((r, i) => {
          const at = lead + i * FIXED.rowStagger;
          // ① 色块从左展开
          const bgP = tw(t, at, FIXED.dur, power3Out);
          // ② 文字被块的右缘刷出来（同曲线同时长，滞后 2 帧）
          const txtP = tw(t, at + FIXED.textLag, FIXED.dur, power3Out);
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", padding: "11px 24px 13px" }}>
              <span
                style={{
                  position: "absolute", inset: 0, borderRadius: 4,
                  transformOrigin: "0% 50%", // 从左展开
                  willChange: "transform",
                  background: r.bg, boxShadow: r.shadow,
                  transform: `scaleX(${bgP})`,
                }}
              />
              <span
                style={{
                  position: "relative", display: "inline-block",
                  fontSize, fontWeight: 700, lineHeight: 1.08,
                  whiteSpace: "nowrap", willChange: "clip-path",
                  color: r.color,
                  clipPath: `inset(0 ${(1 - txtP) * 100}% 0 0)`,
                }}
              >
                {r.text}
              </span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "alt-block-lines",
  name: "双色块对句",
  category: "字幕花字",
  durationInFrames: 91,
  accent: "#0aa3a3",
  component: AltBlockLines as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "line1", label: "第一句（实色块）", default: "先做减法" },
    { type: "text", key: "line2", label: "第二句（反白块）", default: "再做加法" },
    { type: "slider", key: "fontSize", label: "对句字号", default: 66, min: 40, max: 96, step: 1, unit: "px" },
    { type: "color", key: "blockColor", label: "色块强调色", default: "#0aa3a3" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "number", key: "posX", label: "对句左缘 X", default: 82, min: 0, max: 500, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
