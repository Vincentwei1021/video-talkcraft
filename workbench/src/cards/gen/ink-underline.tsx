import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, power1Out, tw } from "../shared";

// ink-underline · 墨迹下划线 —— 参数化版（源出 tplcards/ink-underline.tsx）
// 命门：变宽缎带沿脊线生长（起笔压 → 收笔提）+ 静态毛边；画完静置不做 line boil。
// 原模板的 BOXES 是 demo 运行时实测值；参数化版按「全角字符 1em / 半角 0.5em」
// 从文案推导落点——默认文案（全 CJK）下推导结果与实测值逐像素一致。
const FPS = 30;

interface MarkCfg {
  dur: number;
  thickness: number;
  pressure: number;
  release: number;
  wobble: number;
  baselineGap: number;
  overhang: number;
}

const FIXED = {
  samples: 40,   // 脊线采样点数（<20 会看出折线）
  grain: 0.5,    // 边缘颗粒强度（0 = 矢量光边；≥1 咬断收笔端）
  marks: [
    { dur: 0.50, thickness: 10, pressure: 1, release: 0.15, wobble: 1.1, baselineGap: 6, overhang: 8 },
    { dur: 0.42, thickness: 10.5, pressure: 1, release: 0.15, wobble: -0.9, baselineGap: 6, overhang: 9 },
  ] as MarkCfg[],
};

type Pt = [number, number];
const n2 = (v: number) => Math.round(v * 100) / 100;

// ② 脊线：三次贝塞尔，两个控制点上下反偏 wobble（30% 处上凸、70% 处下凹）
function sampleCubic(p0: Pt, c1: Pt, c2: Pt, p3: Pt, count: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1), u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    pts.push([a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
              a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]]);
  }
  return pts;
}
function spineOf(box: { x: number; right: number; baseline: number }, o: MarkCfg): Pt[] {
  const x0 = box.x - o.overhang, x1 = box.right + o.overhang;
  const y = box.baseline + o.baselineGap, w = o.wobble;
  return sampleCubic([x0, y], [x0 + (x1 - x0) * 0.3, y + w],
                     [x0 + (x1 - x0) * 0.7, y - w], [x1, y + w * 0.6], FIXED.samples);
}

// ③ 变宽缎带：半宽随 t 从 pressure 收到 release；左岸正走、右岸倒走闭合
const halfWidth = (o: MarkCfg, t: number) =>
  (o.thickness / 2) * (o.pressure + (o.release - o.pressure) * t);
const normalAt = (pts: Pt[], i: number): Pt => {
  const a = pts[i - 1] || pts[i], b = pts[i + 1] || pts[i];
  const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1;
  return [-ty / len, tx / len];
};
const curveSegs = (pts: Pt[]) => pts.slice(0, -1).map((p1, i) => {
  const p0 = pts[i - 1] || p1, p2 = pts[i + 1], p3 = pts[i + 2] || p2;
  return `C ${n2(p1[0] + (p2[0] - p0[0]) / 6)} ${n2(p1[1] + (p2[1] - p0[1]) / 6)}, ` +
         `${n2(p2[0] - (p3[0] - p1[0]) / 6)} ${n2(p2[1] - (p3[1] - p1[1]) / 6)}, ${n2(p2[0])} ${n2(p2[1])}`;
}).join(" ");

function ribbon(spine: Pt[], o: MarkCfg, progress: number): string {
  const drawn = Math.max(2, Math.round(progress * (spine.length - 1)) + 1);
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < drawn; i++) {
    const half = halfWidth(o, i / (spine.length - 1));
    const nm = normalAt(spine, i);
    left.push([spine[i][0] + nm[0] * half, spine[i][1] + nm[1] * half]);
    right.push([spine[i][0] - nm[0] * half, spine[i][1] - nm[1] * half]);
  }
  const back = right.reverse();
  return `M ${n2(left[0][0])} ${n2(left[0][1])} ${curveSegs(left)} ` +
         `L ${n2(back[0][0])} ${n2(back[0][1])} ${curveSegs(back)} Z`;
}

// 文案宽度估算：全角 1em / 半角 0.5em（默认全 CJK 文案下与 demo 实测逐像素一致）
const emWidth = (s: string) => {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) <= 0xff ? 0.5 : 1;
  return w;
};

interface Props {
  line1Pre?: string;
  line1Key?: string;
  line1Post?: string;
  line2Pre?: string;
  line2Key?: string;
  line2Post?: string;
  inkColor?: string;
  ink?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  startDelay?: number;
  gapBetween?: number;
  inkOpacity?: number;
}

const InkUnderline: React.FC<Props> = ({
  line1Pre = "很多人以为这轮涨价是因为",
  line1Key = "成本上涨",
  line1Post = "，",
  line2Pre = "其实真正的变量是",
  line2Key = "渠道结构",
  line2Post = "。",
  inkColor = "#6f7f35",
  ink = "#1d1d1f",
  fontSize = 30,
  posX = 420,
  posY = 270,
  startDelay = 0.55,
  gapBetween = 0.75,
  inkOpacity = 0.85,
}) => {
  const t = useCurrentFrame() / FPS;

  // 从文案推导每条墨线的落点盒（对应原模板运行时实测的 BOXES）
  const lineH = fontSize * 1.95;
  const blockTop = posY - lineH;                    // 两行整块垂直居中于 posY
  const baselineInLine = (fontSize * 4) / 3;        // 半行距 + 字面 ascent（30px 时 = 40，与实测一致）
  const boxFor = (lineIdx: number, pre: string, key: string) => {
    const x = posX + emWidth(pre) * fontSize;
    return {
      x,
      right: x + emWidth(key) * fontSize,
      baseline: blockTop + lineIdx * lineH + baselineInLine,
    };
  };
  const boxes = [boxFor(0, line1Pre, line1Key), boxFor(1, line2Pre, line2Key)];

  // 每条墨线：t0 起 opacity 置 inkOpacity，progress 0→1 每帧重算 ribbon
  let t0 = startDelay;
  const strokes = FIXED.marks.map((m, idx) => {
    const at = t0;
    t0 += m.dur + gapBetween;
    const v = tw(t, at, m.dur, power1Out);
    return {
      d: ribbon(spineOf(boxes[idx], m), m, v),
      opacity: t >= at ? inkOpacity : 0,
      fid: `iu-grain-${idx}`,
      seed: 17 + idx * 61,
      scale: m.thickness * 0.5 * FIXED.grain,
    };
  });

  const sayLine: React.CSSProperties = {
    fontSize, lineHeight: 1.95, fontWeight: 500, whiteSpace: "nowrap",
  };

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 演示语境：主持人列（不属于本卡动效） */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>
      <div style={{ position: "absolute", left: posX, top: posY, transform: "translateY(-50%)", color: ink }}>
        <div style={sayLine}>
          {line1Pre}
          <span style={{ fontWeight: 700 }}>{line1Key}</span>
          {line1Post}
        </div>
        <div style={sayLine}>
          {line2Pre}
          <span style={{ fontWeight: 700 }}>{line2Key}</span>
          {line2Post}
        </div>
      </div>
      {/* 墨迹层（动效本体）盖在文字之上；ribbon 是填充路径不是描边路径 */}
      <svg
        viewBox="0 0 960 540"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        {/* ④ 边缘颗粒：静态 turbulence 位移（毛边是形状，不随时间变——不是沸腾） */}
        <defs>
          {strokes.map((s) => (
            <filter key={s.fid} id={s.fid} x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={s.seed} result="g" />
              <feDisplacementMap in="SourceGraphic" in2="g" scale={s.scale} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          ))}
        </defs>
        {strokes.map((s) => (
          <path key={s.fid} d={s.d} fill={inkColor} opacity={s.opacity}
                filter={FIXED.grain > 0 ? `url(#${s.fid})` : undefined} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "ink-underline",
  name: "墨迹下划线",
  category: "强调标注",
  durationInFrames: 109,
  accent: "#6f7f35",
  component: InkUnderline as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "line1Pre", label: "第一行·前文", default: "很多人以为这轮涨价是因为" },
    { type: "text", key: "line1Key", label: "第一行·被画线词", default: "成本上涨" },
    { type: "text", key: "line1Post", label: "第一行·后文", default: "，" },
    { type: "text", key: "line2Pre", label: "第二行·前文", default: "其实真正的变量是" },
    { type: "text", key: "line2Key", label: "第二行·被画线词", default: "渠道结构" },
    { type: "text", key: "line2Post", label: "第二行·后文", default: "。" },
    { type: "slider", key: "fontSize", label: "正文字号", default: 30, min: 20, max: 44, step: 1, unit: "px" },
    { type: "color", key: "inkColor", label: "墨迹色", default: "#6f7f35" },
    { type: "color", key: "ink", label: "文字色", default: "#1d1d1f" },
    { type: "number", key: "posX", label: "文字块左缘 X", default: 420, min: 0, max: 900, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "文字块中心 Y", default: 270, min: 0, max: 540, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.55, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "gapBetween", label: "两条线间隔", default: 0.75, min: 0.2, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "inkOpacity", label: "墨的透水度", default: 0.85, min: 0.6, max: 1, step: 0.05 },
  ],
};
