import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, linear, power1Out, tw } from "../shared";

// caret-wipe-transition · 光标擦除转场 —— 参数化版（源出 tplcards/caret-wipe-transition.tsx）
// 命门：一个进度量 x 同时驱动新旧场景互补 clipPath 与骑在边界上的光标条；
//       两侧微反差（新场景沉降解糊 / 旧场景上浮失焦）与擦除曲线保持 FIXED——
//       只放出文案 / 方向 / 光标主色 / 两侧底色 / 字号 / 起手静置。
const FPS = 30;
const STAGE_W = 960;

const FIXED = {
  wipe: 1.33,       // 扫完全屏时长 s（≈40 帧 @30fps）
  caretW: 3,        // 光标条宽 px（高 = 屏高 50%，走 CSS）
  caretFade: 0.08,  // 两端各多少进度比例内淡入/淡出（防边帧突现）
  inY: 3,           // 新场景沉降起手 y（+ = 从下方沉上来）
  inBlur: 2,        // 新场景起手模糊 px
  outY: -6,         // 旧场景上浮终点 y
  outBlur: 4,       // 旧场景终点模糊 px
};

const power1In = (x: number) => x * x;

// cubic-bezier(0.65,0,0.35,1)：末尾减速，像敲下最后一列（牛顿迭代解算，与模板同实现）
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return function (p: number) {
    let t = p;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - p;
      if (Math.abs(e) < 1e-6) break;
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = Math.max(0, Math.min(1, t));
    return ((ay * t + by) * t + cy) * t;
  };
}
const EASE = cubicBezier(0.65, 0, 0.35, 1);

// 演示语境（不属于动效）：两镜各自的满幅纹理（只为区分"换了一镜"）——类名加 cwt- 前缀防串卡
const CSS = `
/* 两个镜头同位铺满：擦除靠 clipPath 互补裁切，不靠相机推近。
   上下各溢出 10px 是给两侧 ±6px 的竖向微反差留的余量；
   左右必须严格等于画幅——clipPath 的 inset(%) 按元素自身宽度算。 */
.cwt-shot {
  position: absolute; inset: -10px 0; display: flex;
  align-items: center; justify-content: center;
  will-change: clip-path, transform, filter;
}
/* 两个标签不居中而是各偏一侧：新场景的靠左（最早被露出来的那一带），
   旧场景的靠右（最后才被吃掉的那一带） */
.cwt-s1 {                                     /* 旧场景：横线纸 */
  background-image: repeating-linear-gradient(0deg, #ececef 0 1px, transparent 1px 34px);
  justify-content: flex-end; padding-right: 84px;
}
.cwt-s2 {                                     /* 新场景：点阵 */
  background-image: radial-gradient(#d9d9de 1.6px, transparent 1.7px);
  background-size: 26px 26px;
  justify-content: flex-start; padding-left: 84px;
}
`;

interface Props {
  textA?: string;
  textB?: string;
  tag?: string;
  dir?: string;
  caretColor?: string;
  bgA?: string;
  bgB?: string;
  labelColor?: string;
  fontSize?: number;
  lead?: number;
}

const CaretWipeTransition: React.FC<Props> = ({
  textA = "被退格吃掉",
  textB = "刚被打出来",
  tag = "光标即边界：走过之处是新场景 · 未到之处正被吃掉",
  dir = "right",
  caretColor = "#1d1d1f",
  bgA = "#ffffff",
  bgB = "#f1f1f4",
  labelColor = "#8a8a8a",
  fontSize = 62,
  lead = 0.8,
}) => {
  const t = useCurrentFrame() / FPS;
  const goingRight = dir !== "left";
  const at = lead;

  // 互补裁切：新场景只露光标走过的左带，旧场景只留未到的右带
  const clipOld = (x: number) => (goingRight ? `inset(0 0 0 ${x}%)` : `inset(0 ${100 - x}% 0 0)`);
  const clipNew = (x: number) => (goingRight ? `inset(0 ${100 - x}% 0 0)` : `inset(0 0 0 ${x}%)`);
  const x0 = goingRight ? 0 : 100;
  const x1 = goingRight ? 100 : 0;

  // 进度量 x：一条曲线同时驱动裁切边界与光标
  const x = lerp(x0, x1, tw(t, at, FIXED.wipe, EASE));

  // 新场景：沉降 + 解糊（解糊在 80% 进度前收完，落定那一刻已经是清的）
  const inY = lerp(FIXED.inY, 0, tw(t, at, FIXED.wipe, EASE));
  const inBlur = lerp(FIXED.inBlur, 0, tw(t, at, FIXED.wipe * 0.8, power1Out));
  // 旧场景：上浮 + 失焦（起手延后 10%，让"被吃掉"发生在光标真的开始走之后）
  const outY = lerp(0, FIXED.outY, tw(t, at, FIXED.wipe, linear));
  const outBlur = lerp(0, FIXED.outBlur, tw(t, at + FIXED.wipe * 0.1, FIXED.wipe * 0.9, power1In));

  // 光标条：两端各 8% 进度淡入淡出——不这么做，第一帧和最后一帧会"突现/突灭"
  const fade = FIXED.wipe * FIXED.caretFade;
  const caretOpacity = tw(t, at, fade, linear) * (1 - tw(t, at + FIXED.wipe - fade, fade, linear));

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  const bigStyle: React.CSSProperties = {
    fontSize, fontWeight: 800, color: labelColor,
    letterSpacing: 3, whiteSpace: "nowrap", zIndex: 1,
  };

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div className="cwt-shot cwt-s1" style={{
        backgroundColor: bgA,
        clipPath: clipOld(x),
        transform: `translate(0px, ${outY}px)`,
        filter: `blur(${outBlur}px)`,
      }}>
        <div style={bigStyle}>{textA}</div>
      </div>
      <div className="cwt-shot cwt-s2" style={{
        backgroundColor: bgB,
        clipPath: clipNew(x),
        transform: `translate(0px, ${inY}px)`,
        filter: `blur(${inBlur}px)`,
      }}>
        <div style={bigStyle}>{textB}</div>
      </div>
      {/* 光标条：3px 实色细条，屏高 50%，骑在擦除边界上。白底舞台禁发光。 */}
      <div style={{
        position: "absolute", top: "25%", height: "50%", width: FIXED.caretW,
        background: caretColor, borderRadius: 3,
        zIndex: 8, pointerEvents: "none", willChange: "transform, opacity",
        opacity: caretOpacity,
        transform: `translateX(-50%) translateX(${(x / 100) * STAGE_W}px)`,
      }} />
      <div style={{
        position: "absolute", left: 24, top: 20, fontSize: 17, color: "#8a8a8a",
        borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
        borderRadius: 999, padding: "4px 14px", zIndex: 9,
        opacity: tagOpacity,
      }}>
        {tag}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "caret-wipe-transition",
  name: "光标擦除转场",
  category: "转场结构",
  durationInFrames: 103,
  accent: "#1d1d1f",
  component: CaretWipeTransition as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "textA", label: "旧场景文字（被吃掉侧）", default: "被退格吃掉" },
    { type: "text", key: "textB", label: "新场景文字（新打出侧）", default: "刚被打出来" },
    { type: "text", key: "tag", label: "左上注释标签", default: "光标即边界：走过之处是新场景 · 未到之处正被吃掉" },
    {
      type: "select", key: "dir", label: "擦除方向", default: "right",
      options: [
        { value: "right", label: "从左往右打" },
        { value: "left", label: "反向退格" },
      ],
    },
    { type: "slider", key: "fontSize", label: "示意大字字号", default: 62, min: 36, max: 100, step: 1, unit: "px" },
    { type: "color", key: "caretColor", label: "光标主色", default: "#1d1d1f" },
    { type: "color", key: "bgA", label: "旧场景底色", default: "#ffffff" },
    { type: "color", key: "bgB", label: "新场景底色", default: "#f1f1f4" },
    { type: "color", key: "labelColor", label: "示意文字色", default: "#8a8a8a" },
    { type: "slider", key: "lead", label: "起手静置（出场镜停留）", default: 0.8, min: 0.3, max: 1.5, step: 0.05, unit: "s" },
  ],
};
