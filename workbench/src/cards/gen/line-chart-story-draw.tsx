import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import {
  FONT_STACK, HostSilhouette, clamp01, hexToRgb, lerp, power2Out, power3Out, tw,
} from "../shared";

// line-chart-story-draw · 折线分段推演 —— 参数化版（源出 tplcards/line-chart-story-draw.tsx）
// 命门：语音讲到哪段才长哪段——标注先弹、停一拍再生长、段间停顿、虚线最后岔出、
// 色带收尾错峰，这套"讲解节奏"的配比保持 FIXED（起手/每段时长/段间停顿开放为语境节奏）。
// 点位经 "x,y" 逐行 DSL 注入（舞台像素）：拐点=历史末点，标注/弧箭/标签锚点随线端自动跟走。
const FPS = 30;

type Pt = [number, number];

const FIXED = {
  annotPop: 0.25,   // 标注/标签弹出时长 s
  annotHold: 0.35,  // 标注落定后再开始生长的停顿 s
  altGap: 0.4,      // 实线讲完 → 虚线岔出前的停顿 s
  altDur: 0.7,      // 对比虚线生长时长 s
  altDash: "9 7",   // 虚线笔画
  bandFade: 0.3,    // 单条色带淡入时长 s
  bandStagger: 0.3, // 色带之间错峰 s
  bandTop: 112, bandBottom: 396,
  chipDx: 12, chipDy: -30,          // 端点数值 chip 相对线端偏移
  scaleYBase: 396, scaleYStep: 71,  // y 像素 ↔ 数值 的几何映射（网格所系，FIXED）
  histColor: "#a8a8ad",             // 历史段灰阶（语境色）
  // 标注 / 标签 / 弧箭相对锚点（拐点、线端）的偏移——换数据自动跟走
  annotOff: [-88, 64] as Pt,
  annotArc: { from: [-12, 60] as Pt, c: [0, 36] as Pt, to: [-3, 11] as Pt },
  seg1LblOff: [18, 20] as Pt,
  seg1Arc: { from: [28, 18] as Pt, c: [12, 16] as Pt, to: [6, 6] as Pt },
  altLblOff: [10, -40] as Pt,
};

// back.out —— shared 未含，本卡局部定义
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

const toPath = (pts: Pt[]) => pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
const fmt = (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+$)/g, ",");

// 直段折线的总长与"沿线取点"（与 getTotalLength/getPointAtLength 等价）
const polyLen = (pts: Pt[]) => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
};
const pointAt = (pts: Pt[], p: number): Pt => {
  const total = polyLen(pts);
  let target = clamp01(p) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (target <= seg || i === pts.length - 1) {
      const k = seg ? Math.min(1, target / seg) : 1;
      return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)];
    }
    target -= seg;
  }
  return pts[pts.length - 1];
};

// "x,y" 逐行 DSL → 点位表（解析失败回退默认，保证永不炸帧）
const parsePts = (s: string, fallback: Pt[]): Pt[] => {
  const pts = s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/[,|]/).map((n) => Number(n.trim())))
    .filter((v) => v.length >= 2 && v.every((n) => Number.isFinite(n)))
    .map((v) => [v[0], v[1]] as Pt);
  return pts.length >= 2 ? pts : fallback;
};

const DEF = {
  history: "200,354\n256,338\n312,350\n368,310\n424,324\n480,278",
  seg1: "480,278\n536,268\n592,262\n648,248",
  seg2: "648,248\n704,234\n760,216\n816,198",
  alt: "480,278\n560,240\n648,196\n736,152\n816,118",
  xTicks: "256|2020\n368|2022\n480|今年\n648|+3 年\n816|+5 年",
  bands: "312|112|历史同期\n648|200|推演分歧",
};
const FB = {
  history: parsePts(DEF.history, [[200, 354], [480, 278]]),
  seg1: parsePts(DEF.seg1, [[480, 278], [648, 248]]),
  seg2: parsePts(DEF.seg2, [[648, 248], [816, 198]]),
  alt: parsePts(DEF.alt, [[480, 278], [816, 118]]),
};

// 演示语境（不属于动效）：灰阶坐标系 + 主播小窗，零装饰（类名加 lcsd- 前缀防串卡）
const CSS = `
.lcsd-chart { position: absolute; inset: 0; display: block; }
.lcsd-title {
  position: absolute; left: 56px; top: 30px;
  font-size: 21px; font-weight: 700; color: #1d1d1f; letter-spacing: 2px;
}
.lcsd-sub {
  position: absolute; left: 56px; top: 62px;
  font-size: 13px; color: #8a8a8a; letter-spacing: 1px;
}
/* 主播 PiP 小窗（真人出镜画中画占位） */
.lcsd-pip {
  position: absolute;
  left: 22px; bottom: 34px;
  width: 118px; height: 118px;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  overflow: hidden;
  background: #fff;
  z-index: 6;
}
/* —— 动效本体 —— 线端 / 段末标签层：绝对定位，位置由点位表推导 */
.lcsd-labels { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
.lcsd-lbl {
  position: absolute; left: 0; top: 0;
  white-space: nowrap;
  font-weight: 800; line-height: 1;
  padding: 4px 10px;
  background: #ffffff;
  border: 1.5px solid currentColor;
  border-radius: 6px;
  transform-origin: 50% 100%;
}
/* 端点数值标签：跟着线端一起往右移，数字随高度实时变 */
.lcsd-chip {
  position: absolute; left: 0; top: 0;
  padding: 4px 10px;
  background: #ffffff;
  border-radius: 6px;
  font-weight: 800; line-height: 1;
  font-variant-numeric: tabular-nums;
}
`;

interface Props {
  title?: string;
  sub?: string;
  historyPts?: string;
  seg1Pts?: string;
  seg2Pts?: string;
  altPts?: string;
  annotText?: string;
  seg1Label?: string;
  altLabel?: string;
  xTicks?: string;
  bands?: string;
  hotColor?: string;
  altColor?: string;
  vBase?: number;
  vStep?: number;
  labelSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
  segDur?: number;
  segGap?: number;
}

const LineChartStoryDraw: React.FC<Props> = ({
  title = "指数点位 · 五年推演",
  sub = "历史已发生 ｜ 右侧为假设",
  historyPts = DEF.history,
  seg1Pts = DEF.seg1,
  seg2Pts = DEF.seg2,
  altPts = DEF.alt,
  annotText = "这里买入",
  seg1Label = "▲5%",
  altLabel = "涨幅×2",
  xTicks = DEF.xTicks,
  bands = DEF.bands,
  hotColor = "#d8383a",
  altColor = "#1d1d1f",
  vBase = 3000,
  vStep = 400,
  labelSize = 17,
  posX = 0,
  posY = 0,
  lead = 0.6,
  segDur = 0.6,
  segGap = 0.35,
}) => {
  const t = useCurrentFrame() / FPS;

  const history = parsePts(historyPts, FB.history);
  const seg1 = parsePts(seg1Pts, FB.seg1);
  const seg2 = parsePts(seg2Pts, FB.seg2);
  const alt = parsePts(altPts, FB.alt);
  const pivot = history[history.length - 1];       // 拐点 = 历史末点
  const seg1End = seg1[seg1.length - 1];
  const altEnd = alt[alt.length - 1];

  const ticks = xTicks
    .split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => {
      const [x = "0", text = ""] = l.split("|").map((s) => s.trim());
      return { x: Number(x) || 0, text };
    });
  const bandList = bands
    .split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => {
      const [x = "0", w = "0", text = ""] = l.split("|").map((s) => s.trim());
      return { x: Number(x) || 0, w: Number(w) || 0, text };
    });

  // ===== 时序摊平（与模板的 let t 游标一致；起手/段时长/段间停顿为语境节奏）=====
  const annotAt = lead;                                          // 拐点 + 标注
  const growAt0 = annotAt + FIXED.annotPop + FIXED.annotHold;    // 段①
  const growAt1 = growAt0 + segDur + segGap;                     // 段②
  const altAt = growAt1 + segDur + FIXED.altGap;                 // 虚线
  const altDotAt = altAt + FIXED.altDur - 0.05;                  // 虚线端点
  const altLblAt = altAt + FIXED.altDur;                         // ×2 标签
  const bandsAt = altAt + FIXED.altDur + segGap;                 // 色带

  // 拐点：小圆点 + 一圈涟漪
  const dotS = tw(t, annotAt, 0.22, backOut(2.4));
  const haloP = tw(t, annotAt, 0.5, power2Out);
  const [pvx, pvy] = pivot;

  // 主实线两段：dashoffset 从拐点向右生长
  const segsP = [tw(t, growAt0, segDur, power2Out), tw(t, growAt1, segDur, power2Out)];

  // 端点数值 chip：贴着当前生长段的线端走
  const chipPt = t < growAt1 ? pointAt(seg1, segsP[0]) : pointAt(seg2, segsP[1]);
  const chipOp = tw(t, growAt0, 0.2, power2Out);
  const valueAt = (y: number) => vBase + ((FIXED.scaleYBase - y) / FIXED.scaleYStep) * vStep;

  // 对比虚线：mask 的 dashoffset 生长 + 端点 pop
  const altP = tw(t, altAt, FIXED.altDur, power2Out);
  const maskL = Math.ceil(polyLen(alt)) + 2;
  const altDotP = tw(t, altDotAt, 0.22, backOut(2.4));

  // 标签弹出（0.25s back.out(2)）
  const popStyle = (at: number, x: number, y: number, color: string): React.CSSProperties => {
    const p = tw(t, at, FIXED.annotPop, backOut(2));
    return {
      left: x, top: y, color, fontSize: labelSize,
      opacity: Math.min(1, p),
      transform: `translateY(${lerp(6, 0, p)}px) scale(${lerp(0.7, 1, p)})`,
    };
  };
  // 弧线箭头整组弹出（visibility 而非只靠 opacity：Chromium 下 marker 不吃父级 opacity）
  const arcAttrs = (at: number, origin: Pt) => {
    const op = tw(t, at, FIXED.annotPop * 0.8, power2Out);
    const sc = lerp(0.55, 1, tw(t, at, FIXED.annotPop, power3Out));
    return {
      opacity: op,
      visibility: (t >= at ? "visible" : "hidden") as "visible" | "hidden",
      transform: `translate(${origin[0]} ${origin[1]}) scale(${sc}) translate(${-origin[0]} ${-origin[1]})`,
    };
  };
  const arcD = (anchor: Pt, arc: { from: Pt; c: Pt; to: Pt }) =>
    `M ${anchor[0] + arc.from[0]},${anchor[1] + arc.from[1]} Q ${anchor[0] + arc.c[0]},${anchor[1] + arc.c[1]} ${anchor[0] + arc.to[0]},${anchor[1] + arc.to[1]}`;

  const [hr, hg, hb] = hexToRgb(hotColor);
  const bandColor = `rgba(${hr}, ${hg}, ${hb}, 0.07)`;

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      {/* 图表区整体可平移（默认 0,0 与模板逐像素一致） */}
      <div style={{ position: "absolute", inset: 0, transform: `translate(${posX}px, ${posY}px)` }}>
        <div className="lcsd-title">{title}</div>
        <div className="lcsd-sub">{sub}</div>

        <svg className="lcsd-chart" viewBox="0 0 960 540">
          <defs>
            {/* 标注弧线箭头（id 加卡前缀防串卡） */}
            <marker id="lcsd-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
              <path d="M 0,1 L 9,5 L 0,9 Z" fill={hotColor} />
            </marker>
            {/* 虚线笔画无法直接用 dashoffset 生长 → 套一层实心 mask，动 mask 的 dashoffset */}
            <mask id="lcsd-alt-reveal" maskUnits="userSpaceOnUse" x={0} y={0} width={960} height={540}>
              <path d={toPath(alt)} fill="none" stroke="#fff" strokeWidth={16}
                strokeLinecap="butt" strokeLinejoin="round"
                strokeDasharray={maskL} strokeDashoffset={maskL * (1 - altP)} />
            </mask>
          </defs>

          {/* 演示语境：网格 / 今天分界（随拐点 x）/ 轴 / 刻度（数值随 vBase/vStep） */}
          <g>
            <path d="M 200,325 H 880 M 200,254 H 880 M 200,183 H 880 M 200,112 H 880"
                  stroke="#ececef" strokeWidth="1" fill="none" />
            <path d={`M ${pvx},112 V 396`} stroke="#d8d8dc" strokeWidth="1.2" strokeDasharray="4 6" fill="none" />
            <path d="M 200,100 V 396 H 884" stroke="#c8c8cc" strokeWidth="1.6" fill="none" />
            <g fill="#8a8a8a" fontSize="13" textAnchor="end">
              {[0, 1, 2, 3, 4].map((k) => (
                <text key={k} x="188" y={401 - FIXED.scaleYStep * k}>{Math.round(vBase + vStep * k)}</text>
              ))}
            </g>
            <g fill="#8a8a8a" fontSize="13" textAnchor="middle">
              {ticks.map((tick, i) => <text key={i} x={tick.x} y="418">{tick.text}</text>)}
            </g>
          </g>

          {/* 动效本体（与模板 #draw 层同序）*/}
          <g>
            {/* 1) 区间色带（在最底层，罩在线下方） */}
            {bandList.map((b, i) => (
              <g key={i} opacity={tw(t, bandsAt + i * FIXED.bandStagger, FIXED.bandFade, power2Out)}>
                <rect x={b.x} y={FIXED.bandTop} width={b.w}
                  height={FIXED.bandBottom - FIXED.bandTop} fill={bandColor} />
                <text x={b.x + b.w / 2} y={FIXED.bandBottom - 16}
                  fill="#8a8a8a" fontSize={13} textAnchor="middle">{b.text}</text>
              </g>
            ))}

            {/* 2) 历史段：一开始就在场（本卡的前提——不生长） */}
            <path d={toPath(history)} fill="none" stroke={FIXED.histColor}
              strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="butt" />

            {/* 3) 主推演实线：每段一条独立 path，用 stroke-dashoffset 从拐点向右生长 */}
            {[seg1, seg2].map((pts, i) => {
              const dashL = Math.ceil(polyLen(pts)) + 2;  // 整数长度：避免亚像素漏笔
              return (
                <path key={i} d={toPath(pts)} fill="none" stroke={hotColor}
                  strokeWidth={3.4} strokeLinejoin="round" strokeLinecap="butt"
                  strokeDasharray={dashL} strokeDashoffset={dashL * (1 - segsP[i])} />
              );
            })}

            {/* 4) 对比虚线（被 mask 揭出） */}
            <path d={toPath(alt)} fill="none" stroke={altColor}
              strokeWidth={2.6} strokeDasharray={FIXED.altDash}
              strokeLinejoin="round" mask="url(#lcsd-alt-reveal)" />

            {/* 6) 拐点：小圆点 + 一圈涟漪（"就是这里"的落点）
                涟漪的缩放锚点复刻模板实测（环心随放大往左上漂移，这是原片的真实画面） */}
            {(() => {
              const hs = lerp(0.5, 3.2, haloP);
              return (
                <circle cx={pvx} cy={pvy} r={6} fill="none" stroke={hotColor} strokeWidth={2}
                  opacity={lerp(0.9, 0, haloP)}
                  transform={`matrix(${hs},0,0,${hs},${(pvx + 6) * (1 - hs) - 6},${(pvy + 6) * (1 - hs) - 6})`} />
              );
            })()}
            <circle cx={pvx} cy={pvy} r={5.5} fill="#fff" stroke={hotColor} strokeWidth={3}
              transform={`translate(${pvx} ${pvy}) scale(${dotS}) translate(${-pvx} ${-pvy})`} />
            <circle cx={altEnd[0]} cy={altEnd[1]} r={5} fill="#fff" stroke={altColor} strokeWidth={2.6}
              opacity={Math.min(1, altDotP)}
              transform={`translate(${altEnd[0]} ${altEnd[1]}) scale(${lerp(0.3, 1, altDotP)}) translate(${-altEnd[0]} ${-altEnd[1]})`} />

            {/* 5) 弧线箭头（每条包一个 g，整组弹出；锚点跟随拐点 / 段①线端） */}
            <g {...arcAttrs(annotAt, [pivot[0] + FIXED.annotArc.to[0], pivot[1] + FIXED.annotArc.to[1]])}>
              <path d={arcD(pivot, FIXED.annotArc)}
                fill="none" stroke={hotColor} strokeWidth={1.8}
                markerEnd="url(#lcsd-arrow-hot)" />
            </g>
            <g {...arcAttrs(growAt0 + segDur, [seg1End[0] + FIXED.seg1Arc.to[0], seg1End[1] + FIXED.seg1Arc.to[1]])}>
              <path d={arcD(seg1End, FIXED.seg1Arc)}
                fill="none" stroke={hotColor} strokeWidth={1.8}
                markerEnd="url(#lcsd-arrow-hot)" />
            </g>
          </g>
        </svg>

        {/* 7) 标签（HTML，位置随锚点推导） */}
        <div className="lcsd-labels">
          <div className="lcsd-lbl"
            style={popStyle(annotAt, pivot[0] + FIXED.annotOff[0], pivot[1] + FIXED.annotOff[1], hotColor)}>
            {annotText}
          </div>
          <div className="lcsd-lbl"
            style={popStyle(growAt0 + segDur, seg1End[0] + FIXED.seg1LblOff[0], seg1End[1] + FIXED.seg1LblOff[1], hotColor)}>
            {seg1Label}
          </div>
          <div className="lcsd-lbl"
            style={popStyle(altLblAt, altEnd[0] + FIXED.altLblOff[0], altEnd[1] + FIXED.altLblOff[1], altColor)}>
            {altLabel}
          </div>
          <div className="lcsd-chip" style={{
            borderWidth: 1.5, borderStyle: "solid", borderColor: hotColor,
            color: hotColor, fontSize: labelSize,
            opacity: chipOp,
            transform: `translate(${chipPt[0] + FIXED.chipDx}px, ${chipPt[1] + FIXED.chipDy}px)`,
          }}>{fmt(valueAt(chipPt[1]))}</div>
        </div>
      </div>

      {/* 演示语境：主播小窗 */}
      <div className="lcsd-pip"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "line-chart-story-draw",
  name: "折线分段推演",
  category: "数据信息图",
  durationInFrames: 156,
  accent: "#d8383a",
  component: LineChartStoryDraw as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "图表标题", default: "指数点位 · 五年推演" },
    { type: "text", key: "sub", label: "副题", default: "历史已发生 ｜ 右侧为假设" },
    { type: "textarea", key: "historyPts", label: "历史折线点（每行 x,y 舞台像素；末点=拐点）", default: DEF.history },
    { type: "textarea", key: "seg1Pts", label: "推演段①点位（每行 x,y；首点接拐点）", default: DEF.seg1 },
    { type: "textarea", key: "seg2Pts", label: "推演段②点位（每行 x,y；首点接段①末点）", default: DEF.seg2 },
    { type: "textarea", key: "altPts", label: "对比虚线点位（每行 x,y；首点接拐点）", default: DEF.alt },
    { type: "text", key: "annotText", label: "拐点标注", default: "这里买入" },
    { type: "text", key: "seg1Label", label: "段①标签", default: "▲5%" },
    { type: "text", key: "altLabel", label: "虚线标签", default: "涨幅×2" },
    { type: "textarea", key: "xTicks", label: "横轴刻度（每行 x|文本）", default: DEF.xTicks },
    { type: "textarea", key: "bands", label: "区间色带（每行 x|宽|文本）", default: DEF.bands },
    { type: "color", key: "hotColor", label: "推演强调色", default: "#d8383a" },
    { type: "color", key: "altColor", label: "对比虚线色", default: "#1d1d1f" },
    { type: "number", key: "vBase", label: "纵轴基值（y=396 处）", default: 3000, step: 1 },
    { type: "number", key: "vStep", label: "纵轴每格数值（71px/格）", default: 400, step: 1 },
    { type: "slider", key: "labelSize", label: "标签字号", default: 17, min: 12, max: 24, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "图表区偏移 X", default: 0, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "图表区偏移 Y", default: 0, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.6, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "segDur", label: "每段生长时长", default: 0.6, min: 0.3, max: 1.5, step: 0.05, unit: "s" },
    { type: "slider", key: "segGap", label: "段间停顿", default: 0.35, min: 0, max: 1.5, step: 0.05, unit: "s" },
  ],
};
