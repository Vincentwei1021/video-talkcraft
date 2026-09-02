import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power3Out, tw } from "../shared";

// slab-punch-title · 重点放大 —— 参数化版（源出 tplcards/slab-punch-title.tsx）
// 命门：块必须先到位、字后落（punch 是硬切不淡入）；-2.5° 斜切是静态属性。
// 多段节奏配比保持 FIXED；语境级只开放起手静置。
const FPS = 30;

const FIXED = {
  l1Dur: 0.18, // 第一行硬现时长 s
  l1Scale: 1.04, // 第一行起始倍数（>1.08 就读作弹窗，不再是"硬现"）
  slabDur: 0.22, // 色块中心撑开时长 s
  gap: 0.07, // 第一行落定 → 色块起撑的间隔 s（两行之间的呼吸）
  punchDur: 0.167, // 白字 punch 时长 s（5 帧 @30fps）
  punchScale: 1.12, // 白字 punch 起始倍数
};

interface Props {
  line1?: string;
  line2?: string;
  slabColor?: string;
  ink?: string;
  l2Color?: string;
  fontSize?: number;
  posX?: number;
  lead?: number;
}

const SlabPunchTitle: React.FC<Props> = ({
  line1 = "找到",
  line2 = "关键点",
  slabColor = "#e0452c",
  ink = "#1d1d1f",
  l2Color = "#ffffff",
  fontSize = 84,
  posX = 72,
  lead = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  // ① 第一行硬现
  const l1P = tw(t, lead, FIXED.l1Dur, power3Out);
  const l1Scale = lerp(FIXED.l1Scale, 1, l1P);

  // ② 色块从中心撑开
  const slabAt = lead + FIXED.l1Dur + FIXED.gap;
  const bgScaleX = tw(t, slabAt, FIXED.slabDur, power3Out);

  // ③ 块到位那一帧白字落定（punch）——opacity 是硬切（0 帧），不做淡入
  const punchAt = slabAt + FIXED.slabDur;
  const l2Opacity = t < punchAt ? 0 : 1;
  const l2Scale = lerp(FIXED.punchScale, 1, tw(t, punchAt, FIXED.punchDur, power3Out));

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>
      <div style={{ position: "absolute", left: posX, top: "50%", transform: "translateY(-50%)" }}>
        <div
          style={{
            fontSize, fontWeight: 700, lineHeight: 1.06, color: ink,
            whiteSpace: "nowrap", transformOrigin: "0% 50%",
            opacity: l1P, transform: `scale(${l1Scale})`,
          }}
        >
          {line1}
        </div>
        <div style={{ marginTop: 14, marginLeft: -22, transform: "rotate(-2.5deg)", transformOrigin: "0% 50%" }}>
          <span style={{ position: "relative", display: "inline-block", padding: "10px 22px 12px" }}>
            {/* 唯一被 scaleX 的元素，从中心撑开 */}
            <span
              style={{
                position: "absolute", inset: 0,
                background: slabColor, borderRadius: 4,
                transformOrigin: "50% 50%",
                transform: `scaleX(${bgScaleX})`,
              }}
            />
            <span
              style={{
                position: "relative", display: "inline-block",
                fontSize, fontWeight: 700, lineHeight: 1.06, color: l2Color,
                whiteSpace: "nowrap", transformOrigin: "50% 50%",
                opacity: l2Opacity, transform: `scale(${l2Scale})`,
              }}
            >
              {line2}
            </span>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "slab-punch-title",
  name: "重点放大",
  category: "字幕花字",
  durationInFrames: 91,
  accent: "#e0452c",
  component: SlabPunchTitle as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "line1", label: "第一行（硬现）", default: "找到" },
    { type: "text", key: "line2", label: "第二行（块内白字）", default: "关键点" },
    { type: "slider", key: "fontSize", label: "标题字号", default: 84, min: 50, max: 120, step: 1, unit: "px" },
    { type: "color", key: "slabColor", label: "色块强调色", default: "#e0452c" },
    { type: "color", key: "ink", label: "第一行墨色", default: "#1d1d1f" },
    { type: "color", key: "l2Color", label: "块内字色", default: "#ffffff" },
    { type: "number", key: "posX", label: "标题左缘 X", default: 72, min: 0, max: 500, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
