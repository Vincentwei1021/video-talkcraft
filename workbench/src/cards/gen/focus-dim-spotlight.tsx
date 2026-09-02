import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import {
  FONT_STACK, HostSilhouette, hexToRgb, lerp, power2Out, power3Out, tw,
} from "../shared";

// focus-dim-spotlight · 聚焦压暗切换 —— 参数化版（源出 tplcards/focus-dim-spotlight.tsx）
// 命门：焦点是滑过去的不是切过去的；蒙层/描边/跳转/形变各段时长保持 FIXED。
// 目标行几何由 posX/posY + 行序号推导（与模板实测定值同式），行数随 tableRows 行数走。
const FPS = 30;

const FIXED = {
  dimIn: 0.30,    // 蒙层缓入时长 s
  ringIn: 0.30,   // 描边亮起时长 s
  ringFrom: 0.95, // 描边"撑开"的起始倍数
  jump: 0.20,     // 焦点跳转时长 s
  firstHold: 1.25,// 第一个目标多停一拍（错峰配比）
  glowHalf: 1.60, // 辉光脉动半周期 s
  glowFrom: 0.35, // 辉光脉动下限透明度
  morph: 0.45,    // 行级焦点 → 整卡焦点的形变时长 s
  restore: 0.40,  // 蒙层退场时长 s
};

// 目标行几何（模板实测定值换算成相对表卡原点的偏移）
const GEO = { focusDX: 13, firstRowDY: 41, rowStep: 57, rowH: 63, focusW: 674, widePad: 6, wideW: 712 };

type Box = { x: number; y: number; w: number; h: number };
const lerpBox = (a: Box, b: Box, p: number): Box => ({
  x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p),
});
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// 演示语境（不属于动效）：灰阶数据表卡的静态版式（类名加 fds- 前缀防串卡）
const CSS = `
.fds-eyebrow { position: absolute; font-size: 13px; letter-spacing: 3px; color: #8a8a8a; }
.fds-card { position: absolute; width: 700px; padding: 10px 0 4px; border: 1px solid #e0e0e0;
  border-radius: 10px; background: #ffffff; color: #1d1d1f; box-sizing: border-box; margin: 0; }
.fds-trow { display: grid; grid-template-columns: 1.6fr 1fr 0.85fr 0.85fr; align-items: center;
  padding: 15px 26px; margin: 0; }
.fds-trow > span + span { text-align: right; font-variant-numeric: tabular-nums; }
.fds-trow.head { font-size: 12.5px; letter-spacing: 2px; color: #8a8a8a; padding: 4px 26px 12px; }
.fds-trow.data { border-top: 1px solid #f0f0f0; }
.fds-trow.data > span:first-child { font-weight: 600; }
.fds-foot { padding: 12px 26px 8px; font-size: 12px; color: #8a8a8a; border-top: 1px solid #f0f0f0; }
.fds-badge { position: absolute; left: 30px; bottom: 28px; width: 96px; height: 96px;
  border-radius: 50%; border: 1px solid #e0e0e0; overflow: hidden; background: #fff; box-sizing: border-box; }
.fds-chlabel { position: absolute; right: 130px; top: 96px; font-size: 12.5px;
  letter-spacing: 1.5px; color: #8a8a8a; text-align: right; z-index: 7; }
`;

interface Props {
  eyebrow?: string;
  tableHead?: string;
  tableRows?: string;
  cardFoot?: string;
  labelA?: string;
  labelB?: string;
  ringColor?: string;
  dimTo?: number;
  fontSize?: number;
  posX?: number;
  posY?: number;
  startDelay?: number;
  hold?: number;
  wideHold?: number;
}

const FocusDimSpotlight: React.FC<Props> = ({
  eyebrow = "2024 财年 · 分部门经营数据",
  tableHead = "业务板块|营收|同比|毛利率",
  tableRows = "云与 AI|412|+38%|61%\n智能硬件|268|+9%|24%\n广告营销|191|−6%|72%\n金融科技|87|+21%|48%",
  cardFoot = "数据来源：公司 2024 财年年报 · 单位：亿元人民币",
  labelA = "通道③　发光描边 + 其余压暗",
  labelB = "通道①　整屏压暗（无描边）",
  ringColor = "#ffb020",
  dimTo = 0.4,
  fontSize = 19,
  posX = 130,
  posY = 128,
  startDelay = 0.45,
  hold = 1.0,
  wideHold = 1.5,
}) => {
  const t = useCurrentFrame() / FPS;

  const headCells = tableHead.split("|").map((c) => c.trim());
  const rows = tableRows
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => l.split("|").map((c) => c.trim()));

  // 目标矩形：随表卡位置与行数推导（默认值与模板实测定值逐像素一致）
  const targets: Box[] = (rows.length ? rows : [[]]).map((_, i) => ({
    x: posX + GEO.focusDX, y: posY + GEO.firstRowDY + GEO.rowStep * i, w: GEO.focusW, h: GEO.rowH,
  }));
  const wide: Box = {
    x: posX - GEO.widePad, y: posY - GEO.widePad,
    w: GEO.wideW, h: 327 + GEO.rowStep * (targets.length - 4),
  };

  // 时间轴排布：先算出各拍时刻，再挂动作（换目标数量不用改代码）
  const at: number[] = [];
  let tt = startDelay;
  at.push(tt);
  tt += FIXED.dimIn + FIXED.firstHold;
  for (let i = 1; i < targets.length; i++) {
    at.push(tt);
    tt += FIXED.jump + hold;
  }
  const tWide = tt;
  const tRestore = tWide + FIXED.morph + wideHold;

  // —— 焦点窗口 / 描边的几何：分段插值 ——
  let ringGeo: Box = targets[0];
  for (let i = 1; i < targets.length; i++) {
    if (t >= at[i]) ringGeo = lerpBox(targets[i - 1], targets[i], tw(t, at[i], FIXED.jump, power2Out));
  }
  // 窗口撑到整张卡——焦点从"行"放大到"版面"（描边不跟、只退场）
  const spotGeo: Box = t >= tWide
    ? lerpBox(targets[targets.length - 1], wide, tw(t, tWide, FIXED.morph, power2Out))
    : ringGeo;

  // 焦点建立 / 恢复
  const spotOpacity = t < tRestore
    ? tw(t, at[0], FIXED.dimIn, power2Out)
    : 1 - tw(t, tRestore, FIXED.restore, power2Out);
  const ringOpacity = t < tWide
    ? tw(t, at[0], FIXED.ringIn, power3Out)
    : 1 - tw(t, tWide, 0.25, power2Out);
  const ringScale = lerp(FIXED.ringFrom, 1, tw(t, at[0], FIXED.ringIn, power3Out));

  // 辉光微脉动：连续 sine 呼吸，覆盖描边在场的全程
  const glowLife = tWide - (at[0] + FIXED.ringIn);
  const glowReps = Math.max(1, Math.ceil(glowLife / FIXED.glowHalf));
  let glowOpacity = FIXED.glowFrom;
  const gT0 = at[0] + FIXED.ringIn;
  if (t > gT0) {
    const cyc = Math.min((t - gT0) / FIXED.glowHalf, glowReps + 1 - 1e-6);
    const k = Math.floor(cyc);
    const p = cyc - k;
    const pp = k % 2 === 1 ? 1 - p : p;
    glowOpacity = lerp(FIXED.glowFrom, 1, sineInOut(pp));
  }

  // 演示注记：标出当前用的是哪条通道
  const chA = t < tWide ? tw(t, at[0], 0.3, power2Out) : 1 - tw(t, tWide, 0.2, power2Out);
  const chB = t < tRestore ? tw(t, tWide + 0.12, 0.3, power2Out) : 1 - tw(t, tRestore, 0.3, power2Out);

  const [gr, gg, gb] = hexToRgb(ringColor);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div className="fds-eyebrow" style={{ left: posX, top: posY - 32 }}>{eyebrow}</div>

      <div className="fds-card" style={{ left: posX, top: posY }}>
        <div className="fds-trow head">
          {headCells.map((c, i) => <span key={i}>{c}</span>)}
        </div>
        {rows.map((cells, i) => (
          <div key={i} className="fds-trow data" style={{ fontSize }}>
            {cells.map((c, j) => <span key={j}>{c}</span>)}
          </div>
        ))}
        <div className="fds-foot">{cardFoot}</div>
      </div>

      <div className="fds-badge"><HostSilhouette /></div>

      {/* 动效本体：一个聚光窗口 + 一个发光描边框 */}
      <div
        style={{
          position: "absolute", left: 0, top: 0, borderRadius: 8,
          boxShadow: `0 0 0 9999px rgba(0, 0, 0, ${dimTo})`,
          pointerEvents: "none", zIndex: 5, willChange: "transform, width, height",
          opacity: spotOpacity, width: spotGeo.w, height: spotGeo.h,
          transform: `translate(${spotGeo.x}px, ${spotGeo.y}px)`,
        }}
      />
      <div
        style={{
          position: "absolute", left: 0, top: 0,
          borderWidth: 2.5, borderStyle: "solid", borderColor: ringColor,
          borderRadius: 8, boxSizing: "border-box",
          pointerEvents: "none", zIndex: 6, willChange: "transform, width, height",
          opacity: ringOpacity, width: ringGeo.w, height: ringGeo.h,
          transform: `translate(${ringGeo.x}px, ${ringGeo.y}px) scale(${ringScale})`,
          transformOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            position: "absolute", inset: -1, borderRadius: 9,
            boxShadow: `0 0 20px 3px rgba(${gr}, ${gg}, ${gb}, 0.55)`,
            pointerEvents: "none", opacity: glowOpacity,
          }}
        />
      </div>

      <div className="fds-chlabel" style={{ opacity: chA }}>{labelA}</div>
      <div className="fds-chlabel" style={{ opacity: chB }}>{labelB}</div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "focus-dim-spotlight",
  name: "聚焦压暗切换",
  category: "强调标注",
  durationInFrames: 275,
  accent: "#ffb020",
  component: FocusDimSpotlight as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "eyebrow", label: "文档眉头", default: "2024 财年 · 分部门经营数据" },
    { type: "text", key: "tableHead", label: "表头（| 分隔）", default: "业务板块|营收|同比|毛利率" },
    { type: "textarea", key: "tableRows", label: "数据行（每行一条，| 分隔）", default: "云与 AI|412|+38%|61%\n智能硬件|268|+9%|24%\n广告营销|191|−6%|72%\n金融科技|87|+21%|48%" },
    { type: "text", key: "cardFoot", label: "卡片脚注", default: "数据来源：公司 2024 财年年报 · 单位：亿元人民币" },
    { type: "text", key: "labelA", label: "注记 A（行聚焦阶段）", default: "通道③　发光描边 + 其余压暗" },
    { type: "text", key: "labelB", label: "注记 B（整卡阶段）", default: "通道①　整屏压暗（无描边）" },
    { type: "color", key: "ringColor", label: "描边强调色", default: "#ffb020" },
    { type: "slider", key: "fontSize", label: "表格字号", default: 19, min: 14, max: 26, step: 1, unit: "px" },
    { type: "slider", key: "dimTo", label: "压暗深度", default: 0.4, min: 0.1, max: 0.7, step: 0.05 },
    { type: "number", key: "posX", label: "表卡 X", default: 130, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "表卡 Y", default: 128, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.45, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "hold", label: "每目标停留", default: 1.0, min: 0.4, max: 3, step: 0.05, unit: "s" },
    { type: "slider", key: "wideHold", label: "整卡聚焦停留", default: 1.5, min: 0.5, max: 3, step: 0.05, unit: "s" },
  ],
};
