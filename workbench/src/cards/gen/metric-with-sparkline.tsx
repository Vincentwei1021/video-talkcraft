import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// metric-with-sparkline · 数字带趋势 —— 参数化版（源出 tplcards/metric-with-sparkline.tsx）
// 命门：一个数字的"结论"要等它算完才成立——滚动期间不许出现单位和箭头；
// 折线与计数同一刻起跑（数字和曲线讲的是同一件事）；折线时长恒为计数的 2/3，
// 曲线先到位、数字后落定。数据经 "标签|数值" DSL 注入，y 随数值范围自适应
//（默认 DSL 逐像素还原模板点位 24,74 / 141,60 / 258,44 / 376,16）。
const FPS = 30;

const FIXED = {
  labelIn: 0.16,    // 小标签淡入 s
  countGap: 0.2,    // 计数相对起手的延后 s（= 折线起点，两者必须同值）
  lineRatio: 2 / 3, // 折线时长 / 计数时长：必须 < 1，曲线先到位、数字后落定
  unitIn: 0.2,      // 单位淡入 s（计数结束那一刻）
  arrowRise: 12,    // 箭头从下弹入的位移 px
  arrowScale: 0.8,  // 箭头起始缩放
  arrowIn: 0.2,     // 箭头弹入 s
  dotPop: 0.18,     // 数据点弹出 s
  // 折线几何（SVG 局部坐标，viewBox 0 0 400 96）：x 均布 24→376，y 由数值范围映射 74→16
  x0: 24, x1: 376, yLo: 74, yHi: 16,
};

// back.out / power1.inOut —— shared 未含，本卡局部定义
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
// power1.inOut 的反函数：把"线画到第 i 个点"的长度比例换算成时间比例，
// 数据点才真的是"随线的推进"弹出，而不是按均分时间假装同步。
const invPower1InOut = (y: number) =>
  y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2);

// 演示语境（不属于动效）：主持人占位在右，左侧指标区；白底零装饰（类名加 mws- 前缀防串卡）
const CSS = `
.mws-host { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.mws-block { position: absolute; width: 400px; }
.mws-label { font-size: 16px; font-weight: 400; color: #8a8a8a; letter-spacing: 3px; }
/* —— 动效本体 —— 大数字 + 单位 + 涨跌箭头同一条基线 —— */
.mws-big-row {
  display: flex; align-items: baseline; gap: 8px; margin-top: 10px;
  white-space: nowrap;                 /* 数字/单位/箭头必须同行，换行会把箭头挤下去 */
  font-variant-numeric: tabular-nums;  /* 命门：滚动计数不跳宽 */
}
.mws-num { font-weight: 600; line-height: 1; letter-spacing: -0.02em; }
.mws-unit { font-weight: 600; line-height: 1; }
.mws-arrow { width: 20px; height: 34px; margin-left: 4px; transform-origin: 50% 100%; }
.mws-arrow svg { display: block; width: 100%; height: 100%; }
/* 小折线图：与计数同时开始画 */
.mws-spark { margin-top: 30px; width: 400px; }
.mws-spark svg { display: block; width: 400px; height: 96px; overflow: visible; }
.mws-base { stroke: #e0e0e0; stroke-width: 1; }
.mws-xlabels {
  display: flex; justify-content: space-between; width: 400px; margin-top: 8px;
  font-size: 13px; color: #8a8a8a;
}
`;

interface Props {
  label?: string;
  target?: number;
  unit?: string;
  sparkData?: string;
  color?: string;
  numSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
  countDur?: number;
}

const MetricWithSparkline: React.FC<Props> = ({
  label = "本周剪辑效率",
  target = 67,
  unit = "%",
  sparkData = "周一|38\n周二|45\n周三|53\n周四|67",
  color = "#2fb344",
  numSize = 86,
  posX = 96,
  posY = 138,
  lead = 0.3,
  countDur = 0.9,
}) => {
  const t = useCurrentFrame() / FPS;

  // "标签|数值" 逐行 DSL → 折线点位（x 均布、y 按数值范围映射；条数可增减）
  const rows = sparkData
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [lb = "", val = "0"] = l.split("|").map((s) => s.trim());
      return { label: lb, v: Number(val) || 0 };
    });
  const list = rows.length ? rows : [{ label: "", v: 0 }];
  const vMin = Math.min(...list.map((r) => r.v));
  const vMax = Math.max(...list.map((r) => r.v));
  const vRange = vMax - vMin || 1;
  const pts: [number, number][] = list.map((r, i) => [
    list.length > 1 ? Math.floor(FIXED.x0 + (i * (FIXED.x1 - FIXED.x0)) / (list.length - 1)) : 200,
    FIXED.yLo - ((r.v - vMin) / vRange) * (FIXED.yLo - FIXED.yHi),
  ]);

  // ① 小标签先淡入
  const labelP = tw(t, lead, FIXED.labelIn, power2Out);
  // ② 大数字滚动计数（tabular-nums 防跳宽）
  const countAt = lead + FIXED.countGap;
  const num = Math.round(lerp(0, target, tw(t, countAt, countDur, power2Out)));
  // ③ 计数结束那一刻：单位淡入 + 上箭头从下弹入（结论成立的一拍）
  const landAt = countAt + countDur;
  const unitP = tw(t, landAt, FIXED.unitIn, power2Out);
  const arrowP = tw(t, landAt, FIXED.arrowIn, power3Out);

  // ④ 折线 dashoffset 画出 —— 与计数同刻起跑，时长恒为计数的 2/3（命门配比）
  const lineDur = countDur * FIXED.lineRatio;
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
  // 折线总长（直段折线可精确算），dashL 取整数：避免亚像素漏笔
  let L = 0;
  const cum = pts.map((p, i) => {
    if (i) {
      const q = pts[i - 1];
      L += Math.hypot(p[0] - q[0], p[1] - q[1]);
    }
    return L;
  });
  const dashL = Math.ceil(L) + 2;
  const lineP = tw(t, countAt, lineDur, power1InOut);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div className="mws-block" style={{ left: posX, top: posY }}>
        <div className="mws-label" style={{ opacity: labelP }}>{label}</div>
        <div className="mws-big-row">
          <span className="mws-num" style={{ fontSize: numSize, color }}>{num}</span>
          <span className="mws-unit" style={{ fontSize: numSize * (34 / 86), color, opacity: unitP }}>{unit}</span>
          <span className="mws-arrow" style={{
            opacity: arrowP,
            transform: `translateY(${lerp(FIXED.arrowRise, 0, arrowP)}px) scale(${lerp(FIXED.arrowScale, 1, arrowP)})`,
          }}>
            <svg viewBox="0 0 20 34" aria-hidden="true">
              <path d="M10 2 L19 14 H13.2 V32 H6.8 V14 H1 Z" fill={color} />
            </svg>
          </span>
        </div>
        <div className="mws-spark">
          <svg viewBox="0 0 400 96">
            <line className="mws-base" x1="0" y1="90" x2="400" y2="90" />
            <g>
              <path d={d} fill="none" stroke={color} strokeWidth={3}
                strokeLinejoin="round" strokeLinecap="round"
                strokeDasharray={dashL} strokeDashoffset={dashL * (1 - lineP)} />
              {pts.map((p, i) => {
                // 数据点跟着线端推进依次弹出（时间由线长比例反推）
                const at = countAt + lineDur * invPower1InOut(cum[i] / (L || 1));
                const s = tw(t, at, FIXED.dotPop, backOut(2));
                return (
                  <circle key={i} cx={p[0]} cy={p[1]} r={5} fill="#ffffff"
                    stroke={color} strokeWidth={3}
                    transform={`translate(${p[0]} ${p[1]}) scale(${s}) translate(${-p[0]} ${-p[1]})`} />
                );
              })}
            </g>
          </svg>
          <div className="mws-xlabels">
            {list.map((r, i) => <span key={i}>{r.label}</span>)}
          </div>
        </div>
      </div>
      <div className="mws-host"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "metric-with-sparkline",
  name: "数字带趋势",
  category: "数据信息图",
  durationInFrames: 114,
  accent: "#2fb344",
  component: MetricWithSparkline as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "label", label: "小标签", default: "本周剪辑效率" },
    { type: "number", key: "target", label: "计数终值", default: 67, step: 1 },
    { type: "text", key: "unit", label: "单位（计数结束才现身）", default: "%" },
    { type: "textarea", key: "sparkData", label: "趋势数据（每行 标签|数值）", default: "周一|38\n周二|45\n周三|53\n周四|67" },
    { type: "color", key: "color", label: "语义色（数字/折线/箭头）", default: "#2fb344" },
    { type: "slider", key: "numSize", label: "大数字字号", default: 86, min: 56, max: 120, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "指标区 X", default: 96, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "指标区 Y", default: 138, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "countDur", label: "计数时长", default: 0.9, min: 0.5, max: 1.4, step: 0.05, unit: "s" },
  ],
};
