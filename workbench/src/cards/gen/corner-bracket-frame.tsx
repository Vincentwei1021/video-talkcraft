import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// corner-bracket-frame · 对角角框 —— 参数化版（源出 tplcards/corner-bracket-frame.tsx）
// 命门：两个 L 必须同帧同曲线对角进入——对角对称是构图骨架，错峰就散架。
const FPS = 30;

const FIXED = {
  brIn: 0.3,          // 角框进入时长 s
  brTravel: 20,       // 角框沿对角方向的进入位移 px
  lineDur: 0.3,       // 标题单行淡入时长 s
  lineRise: 6,        // 标题上浮 px
  lineStagger: 0.1,   // 两行错峰 s
  linesAt: 0.22,      // 标题起步相对角框起步的延迟 s（框先立住）
  arm: 54,            // L 臂长 px（两臂必须相等——命门）
  stroke: 4,          // L 笔画宽 px
};

interface Props {
  line1?: string;
  line2?: string;
  accent?: string;
  ink?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  frameW?: number;
  frameH?: number;
  lead?: number;
}

const CornerBracketFrame: React.FC<Props> = ({
  line1 = "一条思路",
  line2 = "讲清楚一件事",
  accent = "#0aa3a3",
  ink = "#1d1d1f",
  fontSize = 52,
  posX = 66,
  posY = 152,
  frameW = 450,
  frameH = 200,
  lead = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  // ① 两个 L 同帧进入（同曲线同时长——对角对称）
  const brP = tw(t, lead, FIXED.brIn, power3Out);
  const d = lerp(FIXED.brTravel, 0, brP);
  // ② 标题两行错峰淡入上浮
  const lineAt = lead + FIXED.linesAt;
  const l1P = tw(t, lineAt, FIXED.lineDur, power2Out);
  const l2P = tw(t, lineAt + FIXED.lineStagger, FIXED.lineDur, power2Out);

  const bracketBase: React.CSSProperties = {
    position: "absolute", width: FIXED.arm, height: FIXED.arm,
    borderStyle: "solid", borderColor: accent, boxSizing: "border-box",
    opacity: brP,
  };
  const lineBase: React.CSSProperties = {
    position: "absolute", left: 34,
    fontSize, fontWeight: 700, lineHeight: 1,
    color: ink, letterSpacing: 1, whiteSpace: "nowrap",
  };

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 演示语境：主持人列（不属于本卡动效） */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 448 }}>
        <HostSilhouette />
      </div>
      {/* 取景骨架：不可见方框，只在左上 / 右下两个角画 L */}
      <div style={{ position: "absolute", left: posX, top: posY, width: frameW, height: frameH }}>
        <div
          style={{
            ...bracketBase, left: 0, top: 0,
            borderWidth: `${FIXED.stroke}px 0 0 ${FIXED.stroke}px`,
            transform: `translate(${-d}px, ${-d}px)`,
          }}
        />
        <div
          style={{
            ...bracketBase, right: 0, bottom: 0,
            borderWidth: `0 ${FIXED.stroke}px ${FIXED.stroke}px 0`,
            transform: `translate(${d}px, ${d}px)`,
          }}
        />
        <div style={{ ...lineBase, top: 30, opacity: l1P, transform: `translateY(${lerp(FIXED.lineRise, 0, l1P)}px)` }}>
          {line1}
        </div>
        <div
          style={{
            ...lineBase, top: 30 + fontSize * (74 / 52),
            opacity: l2P, transform: `translateY(${lerp(FIXED.lineRise, 0, l2P)}px)`,
          }}
        >
          {line2}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "corner-bracket-frame",
  name: "对角角框",
  category: "强调标注",
  durationInFrames: 94,
  accent: "#0aa3a3",
  component: CornerBracketFrame as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "line1", label: "标题第一行", default: "一条思路" },
    { type: "text", key: "line2", label: "标题第二行", default: "讲清楚一件事" },
    { type: "slider", key: "fontSize", label: "标题字号", default: 52, min: 32, max: 76, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "角框色", default: "#0aa3a3" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "number", key: "posX", label: "角框区 X", default: 66, min: 0, max: 900, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "角框区 Y", default: 152, min: 0, max: 500, step: 1, unit: "px" },
    { type: "number", key: "frameW", label: "角框区宽", default: 450, min: 200, max: 900, step: 1, unit: "px" },
    { type: "number", key: "frameH", label: "角框区高", default: 200, min: 100, max: 500, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
