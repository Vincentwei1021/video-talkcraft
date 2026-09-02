import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, power1Out, power2Out, tw } from "../shared";

// particle-weld-transition · 粒子溶接转场 —— 参数化版（源出 tplcards/particle-weld-transition.tsx）
// 命门：出场组与入场组必须同 seed 同方向（都向上）才读作"同一批粒子跨过边界"；
//       碎解/交叠/收拢配比、粒子数、seed 全部保持 FIXED——只放出文案 / 颜色 / 字号 / 起手静置。
//       粒子包围盒随 fontSize 与出场文字长度等比推导（默认值 = 模板实测定值 340×74）。
const FPS = 30;

const FIXED = {
  holdEnd: 0.90,   // 入场镜收尾停留
  out: 0.60,       // 出场碎解时长
  cutLead: 0.12,   // 切点提前量：粒子已经飞起来了才换场
  overlap: 0.50,   // 交叠（像素淡化）时长 ≈ 15 帧 @30fps
  gather: 0.70,    // 入场粒子收拢时长
  count: 18,       // 每组粒子数
  rise: 200,       // 上升位移 px
  sway: 46,        // 横向漂移幅度 px
  seed: 7,         // 两组粒子必须同 seed —— 换了就不是"同一批粒子"
};

const power2In = (x: number) => x * x * x;
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// 确定性伪随机：与模板完全同一公式 ⇒ 同 seed 同值、逐帧稳定，不用 Math.random
const rnd = (s: number) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// 粒子：主体（式名大字）包围盒 → 出场组散开、入场组聚拢（舞台坐标 960×540）
// 模板实测定值：默认 76px 四字 ⇒ 340×74，中心 (480, 268)
const HOME = { x: 480, y: 268, w: 340, h: 74 };

// 镜头层超出画幅 14%（inset 对称 ⇒ 画面中心不变），交叠期两镜同时缩放时不漏白边
const SHOT: React.CSSProperties = {
  position: "absolute", inset: "-14%", display: "flex",
  alignItems: "center", justifyContent: "center",
  willChange: "transform, filter, opacity",
};

interface Props {
  textA?: string;
  textB?: string;
  tag?: string;
  bgA?: string;
  bgB?: string;
  particleColor?: string;
  labelColor?: string;
  fontSize?: number;
  lead?: number;
}

const ParticleWeldTransition: React.FC<Props> = ({
  textA = "粒子溶接",
  textB = "同批粒子成形",
  tag = "主体碎成粒子上飘 → 同 seed 的同一批粒子在新镜位置收拢成形",
  bgA = "#ffffff",
  bgB = "#f1f1f4",
  particleColor = "#1d1d1f",
  labelColor = "#8a8a8a",
  fontSize = 76,
  lead = 0.8,
}) => {
  const t = useCurrentFrame() / FPS;
  const at = lead;                                      // 默认 0.80
  const cut = at + FIXED.out - FIXED.cutLead;           // 默认 1.28
  const gatherEnd = cut + FIXED.gather;                 // 默认 1.98

  // 粒子包围盒随字号 / 出场文字长度等比缩放（默认 = 模板定值，逐像素一致）
  const homeW = HOME.w * (fontSize / 76) * (Math.max(1, textA.length) / 4);
  const homeH = HOME.h * (fontSize / 76);
  const particles = Array.from({ length: FIXED.count }, (_, i) => {
    const r = (k: number) => rnd(FIXED.seed * 1000 + i * 7 + k);
    return {
      r,
      size: 5 + r(4) * 7,
      left: HOME.x - homeW / 2 + r(1) * homeW,
      top: HOME.y - homeH / 2 + r(2) * homeH,
      delay: r(3) * 0.26,
    };
  });

  // ── A（出场镜）：慢推 → tile 交叠淡出；大字碎解（壳）──
  const aScale = lerp(1, 1.02, tw(t, 0, lead, sineInOut));
  const aOpacity = 1 - tw(t, cut, FIXED.overlap, power1InOut);
  const outBigP = tw(t, at, FIXED.out * 0.8, power2In);
  const outBig: React.CSSProperties = {
    opacity: 1 - outBigP,
    transform: `translate(0px, ${lerp(0, -14, outBigP)}px) scale(${lerp(1, 1.03, outBigP)})`,
    filter: `blur(${lerp(0, 3, outBigP)}px)`,
  };

  // ── B（入场镜）：交叠淡入 + scale 1.02→1.0，大字在粒子聚拢末段成形 ──
  const bOpacity = tw(t, cut, FIXED.overlap, power1InOut);
  const bScale = t < gatherEnd
    ? lerp(1.02, 1.0, tw(t, cut, FIXED.overlap, power1InOut))
    : lerp(1.0, 1.04, tw(t, gatherEnd, FIXED.holdEnd, sineInOut));
  const inBigP = tw(t, cut + FIXED.gather - 0.30, 0.42, power2Out);
  const inBig: React.CSSProperties = {
    opacity: inBigP,
    transform: `translate(0px, ${lerp(16, 0, inBigP)}px) scale(${lerp(0.94, 1, inBigP)})`,
  };

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  const bigStyle: React.CSSProperties = {
    fontSize, fontWeight: 800, color: labelColor,
    letterSpacing: 3, whiteSpace: "nowrap",
  };
  const dotBase: React.CSSProperties = {
    position: "absolute", display: "block", borderRadius: 2,
    background: particleColor, willChange: "transform, opacity",
  };

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <div style={{ ...SHOT, background: bgA, opacity: aOpacity, transform: `scale(${aScale})` }}>
        <div style={{ ...bigStyle, ...outBig }}>{textA}</div>
      </div>
      <div style={{ ...SHOT, background: bgB, opacity: bOpacity, transform: `scale(${bScale})` }}>
        <div style={{ ...bigStyle, ...inBig }}>{textB}</div>
      </div>
      {/* 粒子层：层级在镜头之上 ⇒ 粒子跨过切点，边界被"物质"盖住 */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
        {/* 出场组：错峰淡入、向上漂散、飞行中段淡出 */}
        {particles.map((p, i) => {
          const t0 = at + p.delay;
          const peak = 0.4 + p.r(5) * 0.45;
          const fadeIn = tw(t, t0, 0.12, power1Out);
          const fadeOut = tw(t, t0 + FIXED.out * 0.55, 0.30, power1Out);
          const fly = tw(t, t0, FIXED.out + 0.35, power2Out);
          const y = -FIXED.rise * (0.55 + p.r(6) * 0.6) * fly;
          const x = (p.r(7) - 0.5) * 2 * FIXED.sway * fly;
          return (
            <i key={`out-${i}`} style={{
              ...dotBase,
              width: p.size, height: p.size, left: p.left, top: p.top,
              opacity: peak * fadeIn * (1 - fadeOut),
              transform: `translate(${x}px, ${y}px)`,
            }} />
          );
        })}
        {/* 入场组：同 seed 的同一批粒子从下方继续上升（同方向），收拢回主体位置 */}
        {particles.map((p, i) => {
          const d2 = cut - 0.06 + p.r(8) * 0.20;        // 落在 lead 里：切点前后就位
          const peak = 0.4 + p.r(5) * 0.45;
          const fadeIn = tw(t, d2, 0.12, power1Out);
          const fadeOut = tw(t, d2 + FIXED.gather - 0.20, 0.24, power1Out);
          const gather = tw(t, d2, FIXED.gather, power2Out);
          const y = FIXED.rise * (0.5 + p.r(6) * 0.5) * (1 - gather);
          const x = (p.r(7) - 0.5) * 2 * FIXED.sway * (1 - gather);
          return (
            <i key={`in-${i}`} style={{
              ...dotBase,
              width: p.size, height: p.size, left: p.left, top: p.top,
              opacity: t < d2 ? 0 : peak * fadeIn * (1 - fadeOut),
              transform: `translate(${x}px, ${y}px)`,
            }} />
          );
        })}
      </div>
      <div style={{
        position: "absolute", left: 24, top: 20, fontSize: 17, color: "#8a8a8a",
        borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
        borderRadius: 999, padding: "4px 14px", zIndex: 7,
        opacity: tagOpacity,
      }}>
        {tag}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "particle-weld-transition",
  name: "粒子溶接转场",
  category: "转场结构",
  durationInFrames: 98,
  accent: "#1d1d1f",
  component: ParticleWeldTransition as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "textA", label: "出场镜文字（被碎解的主体）", default: "粒子溶接" },
    { type: "text", key: "textB", label: "入场镜文字（收拢成形的主体）", default: "同批粒子成形" },
    { type: "text", key: "tag", label: "左上注释标签", default: "主体碎成粒子上飘 → 同 seed 的同一批粒子在新镜位置收拢成形" },
    { type: "slider", key: "fontSize", label: "示意大字字号", default: 76, min: 40, max: 110, step: 1, unit: "px" },
    { type: "color", key: "bgA", label: "出场镜底色", default: "#ffffff" },
    { type: "color", key: "bgB", label: "入场镜底色", default: "#f1f1f4" },
    { type: "color", key: "particleColor", label: "粒子颜色", default: "#1d1d1f" },
    { type: "color", key: "labelColor", label: "示意文字色", default: "#8a8a8a" },
    { type: "slider", key: "lead", label: "起手静置（出场镜停留）", default: 0.8, min: 0.3, max: 1.5, step: 0.05, unit: "s" },
  ],
};
