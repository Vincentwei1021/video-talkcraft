import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// number-slab-pop · 数字弹出 —— 参数化版（源出 tplcards/number-slab-pop.tsx）
// 命门：块先落、数字后弹（同时进读作一张 PNG）；小数+单位从一开始就占位、延后只动 opacity；
// tabular-nums 数字不跳宽。落定/弹出/淡入的时长配比保持 FIXED，语境级只开放起手静置。
const FPS = 30;

const FIXED = {
  slabDrop: 20,   // 色块起始上移 px（从上方落下）
  slabScale: 0.94,// 色块起始缩放
  slabDur: 0.24,  // 色块落定 s
  numScale: 0.72, // 数字起始缩放
  numDur: 0.28,   // 数字弹出 s
  decLag: 0.20,   // 小数 + 单位相对数字弹出起点的延后 s
  decIn: 0.18,    // 小数淡入 s
  capRise: 6,     // 说明行上浮 px
  capIn: 0.24,    // 说明行淡入 s
};

// back.out —— shared 未含，本卡局部定义
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// 演示语境（不属于动效）：主持人占位在右，左侧色块 + 说明行；白底零装饰（类名加 nsp- 前缀防串卡）
const CSS = `
.nsp-host { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.nsp-slab {
  display: inline-block;
  padding: 26px 40px 30px;
  border-radius: 28px;
  transform-origin: 50% 50%;
}
.nsp-num-row {
  display: flex; align-items: baseline;
  white-space: nowrap;                 /* 整数/小数/单位必须同行 */
  font-variant-numeric: tabular-nums;  /* 命门：数字不跳宽 */
  font-weight: 600; line-height: 1; letter-spacing: -0.02em;
  transform-origin: 50% 60%;           /* 重心略偏下：弹出时不往上飘 */
}
.nsp-pct { margin-left: 6px; }
.nsp-cap {
  margin-top: 22px; margin-left: 6px;
  font-size: 20px; font-weight: 400; color: #8a8a8a; letter-spacing: 2px;
}
`;

interface Props {
  intPart?: string;
  decPart?: string;
  unit?: string;
  caption?: string;
  slabColor?: string;
  numColor?: string;
  numSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
}

const NumberSlabPop: React.FC<Props> = ({
  intPart = "23",
  decPart = ".6",
  unit = "%",
  caption = "较去年增长",
  slabColor = "#0066cc",
  numColor = "#ffffff",
  numSize = 96,
  posX = 108,
  posY = 270,
  lead = 0.3,
}) => {
  const t = useCurrentFrame() / FPS;

  // ① 色块先落到位（数字此刻还不在场）
  const slabP = tw(t, lead, FIXED.slabDur, power3Out);
  // ② 块落定后数字整体弹出
  const numAt = lead + FIXED.slabDur;
  const numP = tw(t, numAt, FIXED.numDur, backOut(1.7));
  // ②b 小数 + 单位延后单独淡入（整数先立住，精度是补充）
  const decP = tw(t, numAt + FIXED.decLag, FIXED.decIn, power2Out);
  // ③ 说明行最后淡入上浮
  const capAt = numAt + FIXED.decLag + FIXED.decIn;
  const capP = tw(t, capAt, FIXED.capIn, power2Out);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div style={{ position: "absolute", left: posX, top: posY, transform: "translateY(-50%)" }}>
        <div
          className="nsp-slab"
          style={{
            background: slabColor,
            opacity: slabP,
            transform: `translateY(${lerp(-FIXED.slabDrop, 0, slabP)}px) scale(${lerp(FIXED.slabScale, 1, slabP)})`,
          }}
        >
          <div
            className="nsp-num-row"
            style={{
              color: numColor,
              opacity: Math.min(1, numP),
              transform: `scale(${lerp(FIXED.numScale, 1, numP)})`,
            }}
          >
            <span style={{ fontSize: numSize }}>{intPart}</span>
            <span style={{ fontSize: numSize, opacity: decP }}>{decPart}</span>
            <span className="nsp-pct" style={{ fontSize: numSize * (52 / 96), opacity: decP }}>{unit}</span>
          </div>
        </div>
        <div
          className="nsp-cap"
          style={{
            opacity: capP,
            transform: `translateY(${lerp(FIXED.capRise, 0, capP)}px)`,
          }}
        >
          {caption}
        </div>
      </div>
      <div className="nsp-host"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "number-slab-pop",
  name: "数字弹出",
  category: "数据信息图",
  durationInFrames: 101,
  accent: "#0066cc",
  component: NumberSlabPop as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "intPart", label: "整数部分", default: "23" },
    { type: "text", key: "decPart", label: "小数部分（含点，可留空）", default: ".6" },
    { type: "text", key: "unit", label: "单位", default: "%" },
    { type: "text", key: "caption", label: "说明行", default: "较去年增长" },
    { type: "color", key: "slabColor", label: "色块底色", default: "#0066cc" },
    { type: "color", key: "numColor", label: "数字颜色", default: "#ffffff" },
    { type: "slider", key: "numSize", label: "数字字号", default: 96, min: 56, max: 140, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "色块 X", default: 108, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "色块中心 Y", default: 270, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
