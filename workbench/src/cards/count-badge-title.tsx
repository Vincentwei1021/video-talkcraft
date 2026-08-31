import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "./types";
import {
  FONT_STACK, HostSilhouette, lerp, mixHex,
  power1Out, power2Out, power3Out, tw,
} from "./shared";

// count-badge-title · 数字重音标题 —— 参数化版（源出 template/cards/count-badge-title.tsx）
// 命门：三段严格分先后，数字必须先到且单独到——它是这句话的主语。
const FPS = 30;

const FIXED = {
  numScale: 1.6,
  numIn: 0.30,
  hueDur: 0.14,
  restLag: 0.02,
  restIn: 0.22,
  restX: -8,
  l2Lag: 0.10,
  l2In: 0.28,
  l2Rise: 6,
  punchGap: 0.35,
  punchScale: 1.06,
};

interface Props {
  num?: string;
  restText?: string;
  line2?: string;
  accent?: string;
  ink?: string;
  startDelay?: number;
  numSize?: number;
}

const CountBadgeTitle: React.FC<Props> = ({
  num = "3",
  restText = "个方法",
  line2 = "解决问题",
  accent = "#7A5AF8",
  ink = "#1d1d1f",
  startDelay = 0.4,
  numSize = 138,
}) => {
  const t = useCurrentFrame() / FPS;

  const tLand = startDelay + FIXED.numIn;
  const tRest = tLand + FIXED.restLag;
  const tL2 = tRest + FIXED.l2Lag;
  const tPunch = tL2 + FIXED.l2In + FIXED.punchGap;
  const tPunchBack = tPunch + 0.04;

  // ① 数字单独入场：1.6 倍缩到位
  const numInP = tw(t, startDelay, FIXED.numIn, power3Out);
  // ⑤ 收尾补一拍
  let numScale: number;
  if (t < tPunch) numScale = lerp(FIXED.numScale, 1, numInP);
  else if (t < tPunchBack) numScale = lerp(1, FIXED.punchScale, tw(t, tPunch, 0.04, power2Out));
  else numScale = lerp(FIXED.punchScale, 1, tw(t, tPunchBack, 0.13, power3Out));
  // ② 落定换色
  const hueP = tw(t, tLand - FIXED.hueDur * 0.5, FIXED.hueDur, power1Out);
  const numColor = mixHex(ink, accent, hueP);

  // ③ "个方法"被数字推出
  const restP = tw(t, tRest, FIXED.restIn, power3Out);
  const restClip = lerp(100, 0, restP);
  const restX = lerp(FIXED.restX, 0, restP);

  // ④ 第二行错峰跟上
  const l2P = tw(t, tL2, FIXED.l2In, power3Out);

  const restSize = Math.round(numSize * 0.45);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>

      <div style={{ position: "absolute", left: 84, top: 150 }}>
        <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
          <span
            style={{
              fontSize: numSize, fontWeight: 700, lineHeight: 0.92,
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
              transformOrigin: "50% 72%", display: "inline-block",
              opacity: numInP, color: numColor, transform: `scale(${numScale})`,
            }}
          >
            {num}
          </span>
          <span
            style={{
              fontSize: restSize, fontWeight: 600, lineHeight: 1.1,
              marginLeft: 14, display: "inline-block", whiteSpace: "nowrap",
              clipPath: `inset(0 ${restClip}% 0 0)`, transform: `translateX(${restX}px)`,
            }}
          >
            {restText}
          </span>
        </div>
        <div
          style={{
            fontSize: restSize, fontWeight: 600, lineHeight: 1.2,
            marginTop: 10, whiteSpace: "nowrap",
            opacity: l2P, transform: `translateY(${lerp(FIXED.l2Rise, 0, l2P)}px)`,
          }}
        >
          {line2}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const countBadgeTitleCard: CardDef = {
  id: "count-badge-title",
  name: "数字重音标题",
  category: "标题",
  durationInFrames: 112,
  accent: "#7A5AF8",
  component: CountBadgeTitle as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "num", label: "数字", default: "3" },
    { type: "text", key: "restText", label: "数字后缀", default: "个方法" },
    { type: "text", key: "line2", label: "第二行", default: "解决问题" },
    { type: "slider", key: "numSize", label: "数字字号", default: 138, min: 80, max: 200, step: 2, unit: "px" },
    { type: "color", key: "accent", label: "强调色", default: "#7A5AF8" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
