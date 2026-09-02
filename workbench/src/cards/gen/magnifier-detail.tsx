import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, power1Out, power2Out, power3Out, tw } from "../shared";

// magnifier-detail · 局部放大镜 —— 参数化版（源出 tplcards/magnifier-detail.tsx）
// 目标框 + 连接线 + 圆形放大镜（镜内轻微扫视防死）。指示红是语义色（"看这里"），只上动效本体。
const FPS = 30;

const FIXED = {
  popIn: 0.3,      // 弹出耗时 s
  dimDur: 0.3,     // 底图压暗耗时 s
  boxFade: 0.2,    // 目标框淡入耗时 s
  lineEarly: 0.05, // 连接线相对弹出结束提前 s
  lineDur: 0.25,   // 连接线描出耗时 s
  panLag: 0.2,     // hold 扫视相对弹出结束的延迟 s
  panCycle: 1.4,   // 扫视半程 s（sine.inOut yoyo）
  panPx: 7,        // hold 期间镜内轻微扫视幅度 px
};

const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// 截图内容（底图与镜内副本共用一份结构，保证像素一致）
const ShotContent: React.FC<{
  title: string;
  sub: string;
  rows: [string, string][];
  fontSize: number;
}> = ({ title, sub, rows, fontSize }) => (
  <>
    <div style={{ display: "flex", gap: 6, padding: "10px 14px", borderBottom: "1px solid #ececec" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#e0e0e0" }} />
      ))}
    </div>
    <div style={{ padding: "16px 22px 20px" }}>
      <div style={{ fontSize: fontSize * 1.25, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: fontSize * 0.75, color: "#8a8a8a", marginBottom: 14 }}>{sub}</div>
      {rows.map(([lab, val], i) => (
        <div
          key={i}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 2px", borderBottom: "1px solid #ececec", fontSize,
          }}
        >
          <span style={{ color: "#8a8a8a" }}>{lab}</span>
          <span style={{ fontWeight: 700 }}>{val}</span>
        </div>
      ))}
    </div>
  </>
);

interface Props {
  title?: string;
  sub?: string;
  rows?: string;
  accent?: string;
  ink?: string;
  fontSize?: number;
  zoom?: number;
  magSize?: number;
  magX?: number;
  magY?: number;
  targetX?: number;
  targetY?: number;
  targetW?: number;
  shotX?: number;
  shotY?: number;
  shotW?: number;
  dimTo?: number;
  startDelay?: number;
}

const MagnifierDetail: React.FC<Props> = ({
  title = "星舟 Pro 14 · 实测数据",
  sub = "本站实验室 · 同一负载连续三轮取均值",
  rows = "性能释放|45W 持续\n屏幕亮度|612 nit\n续航测试|4 小时 32 分\n整机重量|1.38 kg",
  accent = "#ff4d4d",
  ink = "#1d1d1f",
  fontSize = 16,
  zoom = 1.8,
  magSize = 210,
  magX = 745,
  magY = 252,
  targetX = 468.6,
  targetY = 218,
  targetW = 92.8,
  shotX = 56,
  shotY = 116,
  shotW = 540,
  dimTo = 0.8,
  startDelay = 0.45,
}) => {
  const t = useCurrentFrame() / FPS;

  const parsedRows: [string, string][] = rows
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const i = l.indexOf("|");
      return i < 0 ? [l, ""] : [l.slice(0, i), l.slice(i + 1)];
    });

  // 目标点/落位点的舞台坐标
  const tx = shotX + targetX, ty = shotY + targetY;
  const lineLen = Math.hypot(magX - tx, magY - ty);
  const dashTotal = Math.ceil(lineLen) + 10;

  // 放大镜弹出：从目标点原位起跳到落位（power3.out）
  const popP = tw(t, startDelay, FIXED.popIn, power3Out);
  const magOpacity = popP;
  const magScale = lerp(0.3, 1, popP);
  const mx = lerp(tx, magX, popP);
  const my = lerp(ty, magY, popP);

  // 底图同步压暗 + 目标框淡入（缺省 power1.out）
  const dim = lerp(1, dimTo, tw(t, startDelay, FIXED.dimDur, power1Out));
  const boxOpacity = tw(t, startDelay, FIXED.boxFade, power1Out);

  // 连接线从目标点向放大镜描出——告诉观众"放大的是这里"
  const lineP = tw(t, startDelay + FIXED.popIn - FIXED.lineEarly, FIXED.lineDur, power2Out);
  const dashOn = dashTotal * lineP, dashOff = dashTotal * (1 - lineP);

  // hold：镜内内容轻微平移扫视（sine.inOut yoyo repeat:-1），画面不呆
  const panT0 = startDelay + FIXED.popIn + FIXED.panLag;
  let pan = 0;
  if (t > panT0) {
    const cyc = (t - panT0) / FIXED.panCycle;
    const k = Math.floor(cyc);
    const p = cyc - k;
    const pp = k % 2 === 1 ? 1 - p : p;
    pan = -FIXED.panPx * zoom * sineInOut(pp);
  }
  // 放大副本定位：让目标点正好落在镜心（pan 叠加在 x 上）
  const innerX = magSize / 2 - zoom * targetX + pan;
  const innerY = magSize / 2 - zoom * targetY;

  // 目标点细描边框几何
  const boxL = targetX - targetW / 2 - 8, boxT = targetY - 16, boxW = targetW + 16;

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 演示语境：假评测截图。白底 + 灰阶线框，零风格化 */}
      <div
        style={{
          position: "absolute", left: shotX, top: shotY, width: shotW,
          background: "#ffffff",
          borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
          borderRadius: 6, overflow: "hidden", color: ink, boxSizing: "border-box",
          filter: `brightness(${dim})`,
        }}
      >
        <ShotContent title={title} sub={sub} rows={parsedRows} fontSize={fontSize} />
        <div
          style={{
            position: "absolute", left: boxL, top: boxT, width: boxW, height: 32,
            borderWidth: 2, borderStyle: "solid", borderColor: accent,
            borderRadius: 6, boxSizing: "border-box", pointerEvents: "none",
            opacity: boxOpacity,
          }}
        />
      </div>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <line
          x1={tx} y1={ty} x2={magX} y2={magY}
          stroke={accent} strokeWidth={2}
          strokeDasharray={`${dashOn} ${dashOff}`}
        />
      </svg>
      <div
        style={{
          position: "absolute", left: 0, top: 0,
          width: magSize, height: magSize, borderRadius: "50%",
          borderWidth: 2, borderStyle: "solid", borderColor: ink,
          overflow: "hidden", background: "#ffffff", boxSizing: "border-box",
          opacity: magOpacity,
          transform: `translate(${mx - magSize / 2}px, ${my - magSize / 2}px) scale(${magScale})`,
        }}
      >
        <div
          style={{
            position: "absolute", left: 0, top: 0, transformOrigin: "0 0",
            transform: `translate(${innerX}px, ${innerY}px) scale(${zoom})`,
          }}
        >
          {/* 放大副本：与底图同结构，抹掉定位与边框 */}
          <div
            style={{
              position: "absolute", left: 0, top: 0, width: shotW,
              background: "#ffffff", overflow: "hidden", color: ink, boxSizing: "border-box",
            }}
          >
            <ShotContent title={title} sub={sub} rows={parsedRows} fontSize={fontSize} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "magnifier-detail",
  name: "局部放大镜",
  category: "强调标注",
  durationInFrames: 101,
  accent: "#ff4d4d",
  component: MagnifierDetail as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "截图标题", default: "星舟 Pro 14 · 实测数据" },
    { type: "text", key: "sub", label: "截图副题", default: "本站实验室 · 同一负载连续三轮取均值" },
    { type: "textarea", key: "rows", label: "数据行（每行 标签|值）", default: "性能释放|45W 持续\n屏幕亮度|612 nit\n续航测试|4 小时 32 分\n整机重量|1.38 kg" },
    { type: "slider", key: "fontSize", label: "数据行字号", default: 16, min: 12, max: 22, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "指示色（框+连线）", default: "#ff4d4d" },
    { type: "color", key: "ink", label: "墨色（文字+镜框）", default: "#1d1d1f" },
    { type: "slider", key: "zoom", label: "放大倍数", default: 1.8, min: 1.3, max: 2.2, step: 0.05 },
    { type: "slider", key: "magSize", label: "放大镜直径", default: 210, min: 150, max: 280, step: 5, unit: "px" },
    { type: "number", key: "magX", label: "放大镜落位 X", default: 745, min: 0, max: 960, step: 1, unit: "px" },
    { type: "number", key: "magY", label: "放大镜落位 Y", default: 252, min: 0, max: 540, step: 1, unit: "px" },
    { type: "number", key: "targetX", label: "目标点 X（截图内）", default: 468.6, min: 0, max: 900, step: 0.1, unit: "px" },
    { type: "number", key: "targetY", label: "目标点 Y（截图内）", default: 218, min: 0, max: 600, step: 1, unit: "px" },
    { type: "number", key: "targetW", label: "目标词宽", default: 92.8, min: 20, max: 400, step: 0.1, unit: "px" },
    { type: "number", key: "shotX", label: "截图 X", default: 56, min: 0, max: 900, step: 1, unit: "px" },
    { type: "number", key: "shotY", label: "截图 Y", default: 116, min: 0, max: 500, step: 1, unit: "px" },
    { type: "number", key: "shotW", label: "截图宽", default: 540, min: 300, max: 900, step: 1, unit: "px" },
    { type: "slider", key: "dimTo", label: "底图压暗到", default: 0.8, min: 0.6, max: 1, step: 0.05 },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.45, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
