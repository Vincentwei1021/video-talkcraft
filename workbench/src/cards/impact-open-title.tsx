import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "./types";
import {
  FONT_STACK, HostSilhouette, lerp, mixHex,
  power1Out, power2Out, power3Out, power4Out, tw,
} from "./shared";

// impact-open-title · 冲击开场 —— 参数化版（源出 template/cards/impact-open-title.tsx）
// 命门：砸只有一次。角框和点阵是衬，必须比标题更慢更淡。
const FPS = 30;

const FIXED = {
  slamDur: 0.20,
  slamScale: 1.08,
  wordDelay: 0.10,
  wordPunch: 0.167,
  wordScale: 1.15,
  cornerDur: 0.30,
  cornerIn: 12,
  dotsGap: 0.10,
  dotsDur: 0.40,
  subDur: 0.28,
  subRise: 8,
};

interface Props {
  lineStart?: string;
  lastWord?: string;
  sub?: string;
  accent?: string;
  ink?: string;
  fontSize?: number;
  lead?: number;
  dotsOpacity?: number;
}

const ImpactOpenTitle: React.FC<Props> = ({
  lineStart = "三秒抓住",
  lastWord = "重点",
  sub = "接下来这三分钟，只讲清楚一件事",
  accent = "#e8720c",
  ink = "#1d1d1f",
  fontSize = 72,
  lead = 0.4,
  dotsOpacity = 0.5,
}) => {
  const t = useCurrentFrame() / FPS;

  // ① 整句一次砸出
  const slamP = tw(t, lead, FIXED.slamDur, power4Out);
  const lineScale = lerp(FIXED.slamScale, 1, slamP);

  // ① 续：末词延后 3 帧换色 + punch
  const wordAt = lead + FIXED.slamDur + FIXED.wordDelay;
  const wordP = tw(t, wordAt, FIXED.wordPunch, power3Out);
  const wordScale = t < wordAt ? 1 : lerp(FIXED.wordScale, 1, wordP);
  const wordColor = t < wordAt ? ink : mixHex(ink, accent, wordP);

  // ② 四角 L 角框与①同帧起，但走得更慢（衬）
  const cornerP = tw(t, lead, FIXED.cornerDur, power2Out);
  const cornerOff = lerp(FIXED.cornerIn, 0, cornerP);

  // ③ 点阵错峰淡入
  const dotsAt = lead + FIXED.cornerDur + FIXED.dotsGap;
  const dotsO = dotsOpacity * tw(t, dotsAt, FIXED.dotsDur, power1Out);

  // ④ 副题最后淡入上浮
  const subP = tw(t, dotsAt + 0.16, FIXED.subDur, power2Out);

  const corners: [React.CSSProperties, number, number][] = [
    [{ left: 30, top: 30, borderRightWidth: 0, borderBottomWidth: 0 }, -1, -1],
    [{ right: 30, top: 30, borderLeftWidth: 0, borderBottomWidth: 0 }, 1, -1],
    [{ left: 30, bottom: 30, borderRightWidth: 0, borderTopWidth: 0 }, -1, 1],
    [{ right: 30, bottom: 30, borderLeftWidth: 0, borderTopWidth: 0 }, 1, 1],
  ];

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>

      <div
        style={{
          position: "absolute", left: 394, top: 84, width: 116, height: 92,
          backgroundImage: `radial-gradient(circle, ${accent} 3px, transparent 3.5px)`,
          backgroundSize: "24px 24px", backgroundPosition: "4px 4px",
          opacity: dotsO,
        }}
      />
      {corners.map(([pos, dx, dy], i) => (
        <div
          key={i}
          style={{
            position: "absolute", width: 46, height: 46,
            borderWidth: 4, borderStyle: "solid", borderColor: accent, zIndex: 5,
            ...pos,
            opacity: cornerP,
            transform: `translate(${dx * cornerOff}px, ${dy * cornerOff}px)`,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute", left: 78, top: 214,
          fontSize, fontWeight: 700, lineHeight: 1.08,
          whiteSpace: "nowrap", transformOrigin: "0% 50%",
          opacity: slamP, transform: `scale(${lineScale})`,
        }}
      >
        {lineStart}
        <span
          style={{
            display: "inline-block", transformOrigin: "0% 50%",
            color: wordColor, transform: `scale(${wordScale})`,
          }}
        >
          {lastWord}
        </span>
      </div>
      <div
        style={{
          position: "absolute", left: 80, top: 214 + fontSize * 1.08 + 28,
          fontSize: 25, fontWeight: 400, lineHeight: 1.4, color: "#8a8a8a",
          whiteSpace: "nowrap",
          opacity: subP, transform: `translateY(${lerp(FIXED.subRise, 0, subP)}px)`,
        }}
      >
        {sub}
      </div>
    </AbsoluteFill>
  );
};

export const impactOpenTitleCard: CardDef = {
  id: "impact-open-title",
  name: "冲击开场",
  category: "标题",
  durationInFrames: 97,
  accent: "#e8720c",
  component: ImpactOpenTitle as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "lineStart", label: "标题前半句", default: "三秒抓住" },
    { type: "text", key: "lastWord", label: "末词（换色重音）", default: "重点" },
    { type: "text", key: "sub", label: "副题", default: "接下来这三分钟，只讲清楚一件事" },
    { type: "slider", key: "fontSize", label: "标题字号", default: 72, min: 40, max: 110, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "强调色", default: "#e8720c" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "dotsOpacity", label: "点阵浓度", default: 0.5, min: 0, max: 0.6, step: 0.05 },
  ],
};
