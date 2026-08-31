import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "./types";
import {
  FONT_STACK, HostSilhouette, lerp, linear,
  power1Out, power3Out, power4In, power4InOut, tw,
} from "./shared";

// chapter-title-card · 章节标题卡 —— 参数化单章版（源出 template/cards/chapter-title-card.tsx）
// 节拍：色块压入 → 编号落位 → 章节名遮罩揭示 → 小字 → 极缓漂移 hold → 扫出
const FPS = 30;

const FIXED = {
  numIn: 0.4,
  nameIn: 0.35,
  subDelay: 0.1,
  driftPx: 10,
};

interface Props {
  num?: string;
  name?: string;
  sub?: string;
  bg?: string;
  textColor?: string;
  startAt?: number;
  wipeDur?: number;
  hold?: number;
}

const ChapterTitleCard: React.FC<Props> = ({
  num = "01",
  name = "泡沫是怎么吹起来的",
  sub = "CHAPTER 01 · 2006—2008",
  bg = "#1d1d1f",
  textColor = "#ffffff",
  startAt = 0.3,
  wipeDur = 0.3,
  hold = 1.2,
}) => {
  const t = useCurrentFrame() / FPS;
  const at = startAt;

  // 色块扫入 → 扫出（同方向）
  const inP = tw(t, at, wipeDur, power4InOut);
  const outAt = at + wipeDur + FIXED.numIn + FIXED.nameIn + hold;
  const outP = tw(t, outAt, wipeDur, power4In);
  const xPercent = t < outAt ? lerp(-100, 0, inP) : lerp(0, 100, outP);

  // 编号先落位——先立骨架再上名字
  const numP = tw(t, at + wipeDur, FIXED.numIn, power3Out);
  const nameP = tw(t, at + wipeDur + 0.18, FIXED.nameIn, power3Out);
  const subP = tw(t, at + wipeDur + 0.18 + FIXED.subDelay, 0.3, power1Out);
  // hold：整组极缓漂移防卡帧感
  const drift = FIXED.driftPx * tw(t, at + wipeDur, hold + 0.5, linear);

  return (
    <AbsoluteFill style={{ background: "#ffffff", overflow: "hidden", fontFamily: FONT_STACK }}>
      <HostSilhouette />

      <div
        style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center", gap: 34,
          background: bg,
          transform: `translateX(${xPercent}%)`,
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, "Songti SC", serif',
            fontSize: 216, fontWeight: 700, lineHeight: 1, color: textColor,
            opacity: numP,
            transform: `translate(${drift}px, 0px) scale(${lerp(1.3, 1, numP)})`,
          }}
        >
          {num}
        </div>
        <div style={{ transform: `translateX(${drift}px)` }}>
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: 44, fontWeight: 700, letterSpacing: 4, color: textColor,
                clipPath: `inset(0 ${lerp(100, 0, nameP)}% 0 0)`,
              }}
            >
              {name}
            </div>
          </div>
          <div
            style={{
              marginTop: 12, fontSize: 15, letterSpacing: 6, color: `${textColor}99`,
              opacity: subP, transform: `translateX(${lerp(-14, 0, subP)}px)`,
            }}
          >
            {sub}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const chapterTitleCardCard: CardDef = {
  id: "chapter-title-card",
  name: "章节标题卡",
  category: "章节",
  durationInFrames: 100,
  accent: "#55565a",
  component: ChapterTitleCard as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "num", label: "章节编号", default: "01" },
    { type: "text", key: "name", label: "章节名", default: "泡沫是怎么吹起来的" },
    { type: "text", key: "sub", label: "英文小字", default: "CHAPTER 01 · 2006—2008" },
    { type: "color", key: "bg", label: "底色", default: "#1d1d1f" },
    { type: "color", key: "textColor", label: "文字颜色", default: "#ffffff" },
    { type: "slider", key: "startAt", label: "压入时机", default: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "wipeDur", label: "压入/扫出时长", default: 0.3, min: 0.15, max: 0.8, step: 0.05, unit: "s" },
    { type: "slider", key: "hold", label: "停留时长", default: 1.2, min: 0.4, max: 4, step: 0.1, unit: "s" },
  ],
};
