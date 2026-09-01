import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import {
  FONT_STACK, HostSilhouette, clamp01, lerp, mixHex, power1Out, power2Out, tw,
} from "../shared";

// ui-prop-theater · 界面道具剧场 —— 参数化版（源出 tplcards/ui-prop-theater.tsx）
// 命门：界面状态只在节拍点上变，绝不匀速自动播——节拍表（时刻/进度值/勾行映射）保持 FIXED，
// 只开放各拍的状态文案、清单行文案与整体延后（对齐口播）。宁可少暴露参数不破坏动效品相。
const FPS = 30;

const FIXED = {
  // 节拍表：at = 状态变化落在语音的第几秒；pct = 进度条跳到的目标值；
  // statusIdx = 同帧换成第几条状态文案（对应 status1/status2/statusDone）；
  // tick = 同拍勾掉的清单行序号；done = 收尾拍（完成勾弹出）
  beats: [
    { at: 0.55, pct: 17 },
    { at: 1.50, pct: 43, statusIdx: 0, tick: 0 },
    { at: 2.35, pct: 71, statusIdx: 1, tick: 1 },
    { at: 3.60, pct: 96 },
    { at: 4.55, pct: 100, statusIdx: 2, tick: 2, done: true },
  ] as { at: number; pct: number; statusIdx?: number; tick?: number; done?: boolean }[],

  jump: 0.30,        // 单段跳进时长 s：填充从上一段值跳到本段值
  swapOut: 0.12,     // 旧状态文案上移淡出
  swapIn: 0.20,      // 新状态文案下方浮入
  swapLift: 6,       // 换字位移 px
  tickDelay: 0.16,   // 勾比跳进晚一点点落地（先看见进度跳，再看见勾）
  tickDraw: 0.20,    // 勾画出时长
  rowGlow: 0.16,     // 行微亮淡入
  rowSettle: 0.50,   // 微亮回落到"已完成"底色
  donePop: 0.26,     // 完成勾弹出
  glowColor: "#f0f0f2",
  restColor: "#f7f7f8",
};

// back.out —— shared 未含，本卡局部定义
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// 勾线折线长度（代替 getTotalLength；demo 取 ceil(L)+2）
const polyLen = (pts: number[][]) => {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
};
const STEP_TICK = [[4.4, 10.4], [8.2, 14.2], [15.6, 6.2]];
const DONE_TICK = [[6.8, 12.4], [10.4, 16], [17.2, 8.4]];
const STEP_L = Math.ceil(polyLen(STEP_TICK)) + 2;   // = 19
const DONE_L = Math.ceil(polyLen(DONE_TICK)) + 2;   // = 18

// DSL：每行 "条目|备注"；前三行依次被节拍表打勾（多出的行不打勾）
const parseRows = (dsl: string) =>
  dsl.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const idx = l.indexOf("|");
    return idx >= 0
      ? { label: l.slice(0, idx).trim(), meta: l.slice(idx + 1).trim() }
      : { label: l, meta: "" };
  });

const DEFAULT_ROWS = "下载模型包|1.4 GB\n解压到本地目录|312 个文件\n安装依赖环境|18 个包";

// 演示语境（不属于动效）：一张灰阶"安装器"卡 + 主播小窗，零装饰（类名加 upt- 前缀防串卡）
const CSS = `
.upt-card {
  position: absolute;
  padding: 24px 26px 26px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #ffffff;
  color: #1d1d1f;
  box-sizing: border-box;
}
.upt-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #ececef;
}
.upt-icon {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: #ececef;
  display: flex; align-items: center; justify-content: center;
}
.upt-icon i {
  width: 12px; height: 12px;
  border: 2px solid #8a8a8a;
  border-radius: 3px;
  display: block;
  box-sizing: border-box;
}
.upt-name { font-size: 17px; font-weight: 700; letter-spacing: 1px; }
.upt-ver { margin-left: auto; font-size: 13px; color: #8a8a8a; letter-spacing: 1px; }
/* 状态行：左状态文案 + 完成勾 + 右百分比读数 */
.upt-status-row {
  display: flex;
  align-items: center;
  margin-top: 20px;
}
.upt-status {
  font-weight: 600;
  letter-spacing: 1px;
}
.upt-pct {
  margin-left: auto;
  font-weight: 700;
  color: #8a8a8a;
  font-variant-numeric: tabular-nums;
}
/* —— 动效本体 —— 进度条：轨道灰阶，填充是唯一的强调色 */
.upt-track {
  position: relative;
  height: 10px;
  margin-top: 14px;
  border-radius: 5px;
  background: #ececef;
  overflow: hidden;
}
.upt-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  border-radius: 5px;
}
/* —— 动效本体 —— 任务清单：逐项打勾 + 行微亮 */
.upt-steps { margin-top: 22px; }
.upt-step {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
}
.upt-box {
  width: 18px; height: 18px;
  flex: 0 0 18px;
  border-width: 1.6px;
  border-style: solid;
  border-radius: 4px;
  box-sizing: border-box;
  display: flex; align-items: center; justify-content: center;
}
.upt-box svg { width: 100%; height: 100%; display: block; overflow: visible; }
.upt-label { font-size: 15px; letter-spacing: 0.5px; }
.upt-meta { margin-left: auto; font-size: 13px; color: #b0b0b5; font-variant-numeric: tabular-nums; }
/* 完成勾（状态行内，宽度固定 → 弹出时不推挤文字） */
.upt-done {
  width: 24px; height: 24px;
  flex: 0 0 24px;
  margin-left: 10px;
}
.upt-done svg { width: 100%; height: 100%; display: block; }
/* 主播 PiP 小窗（演示语境） */
.upt-pip {
  position: absolute;
  left: 24px; bottom: 40px;
  width: 116px; height: 116px;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  overflow: hidden;
  background: #fff;
}
`;

interface Props {
  appName?: string;
  appVer?: string;
  initStatus?: string;
  status1?: string;
  status2?: string;
  statusDone?: string;
  stepsDsl?: string;
  accentColor?: string;
  statusSize?: number;
  posX?: number;
  posY?: number;
  cardW?: number;
  lead?: number;
}

const UiPropTheater: React.FC<Props> = ({
  appName = "Studio 安装程序",
  appVer = "v4.2.1",
  initStatus = "正在下载模型包…",
  status1 = "正在解压文件…",
  status2 = "正在安装依赖…",
  statusDone = "安装完成",
  stepsDsl = DEFAULT_ROWS,
  accentColor = "#d8383a",
  statusSize = 19,
  posX = 180,
  posY = 96,
  cardW = 600,
  lead = 0,
}) => {
  const t = useCurrentFrame() / FPS;
  const rows = parseRows(stepsDsl);
  const statusTexts = [status1, status2, statusDone];
  const beats = FIXED.beats.map((b) => ({
    ...b,
    at: b.at + lead,
    status: b.statusIdx === undefined ? undefined : statusTexts[b.statusIdx],
  }));

  // —— 进度条 + 百分比读数共用一个代理值：分段跳进，段与段之间画面完全静止 ——
  let prog = 0;
  let prev = 0;
  for (const b of beats) {
    if (t >= b.at) prog = lerp(prev, b.pct, tw(t, b.at, FIXED.jump, power2Out));
    prev = b.pct;
  }

  // —— 状态文案：旧的上移淡出 → 换字 → 新的从下方浮入（最后一拍换色）——
  let status = initStatus;
  let statusOp = 1, statusY = 0;
  let statusColor = "#1d1d1f";
  for (const b of beats) {
    if (b.status === undefined) continue;
    const swapAt = b.at + FIXED.swapOut;
    if (t < b.at) break;
    if (t < swapAt) {
      // 旧文案上移淡出
      const p = tw(t, b.at, FIXED.swapOut, power2Out);
      statusOp = 1 - p; statusY = -FIXED.swapLift * p;
    } else {
      // 新文案浮入
      status = b.status;
      const p = tw(t, swapAt, FIXED.swapIn, power2Out);
      statusOp = p; statusY = FIXED.swapLift * (1 - p);
      if (b.done) statusColor = mixHex("#1d1d1f", accentColor, tw(t, swapAt, FIXED.swapIn, power1Out));
    }
  }

  // —— 清单逐项打勾：勾画出 + 描边转强调色 + 行微亮后落到"已完成"底色 ——
  const tickAt: (number | undefined)[] = rows.map(() => undefined);
  let doneAt: number | undefined;
  for (const b of beats) {
    if (b.tick !== undefined && b.tick < rows.length) tickAt[b.tick] = b.at + FIXED.tickDelay;
    if (b.done) doneAt = b.at + FIXED.tickDelay;
  }
  const rowStyle = (i: number) => {
    const at = tickAt[i];
    if (at === undefined || t < at) {
      return { dash: STEP_L, box: "#d2d2d7", label: "#8a8a8a", bg: "rgba(255,255,255,0)" };
    }
    const dash = STEP_L * (1 - tw(t, at, FIXED.tickDraw, power2Out));
    const box = mixHex("#d2d2d7", accentColor, tw(t, at, 0.14, power1Out));
    const label = mixHex("#8a8a8a", "#1d1d1f", tw(t, at, 0.2, power1Out));
    // 行底色：透明 → 微亮 glow → 停 0.18s → 落到 rest
    const settleAt = at + FIXED.rowGlow + 0.18;
    let bg: string;
    if (t < settleAt) {
      // GSAP 对 rgba(255,255,255,0)→#f0f0f2 同时插 RGB 与 alpha
      const p = tw(t, at, FIXED.rowGlow, power2Out);
      bg = `rgba(${Math.round(lerp(255, 240, p))},${Math.round(lerp(255, 240, p))},${Math.round(lerp(255, 242, p))},${p.toFixed(3)})`;
    } else {
      bg = mixHex(FIXED.glowColor, FIXED.restColor, tw(t, settleAt, FIXED.rowSettle, power2Out));
    }
    return { dash, box, label, bg };
  };

  // —— 收尾拍：完成勾弹出（back.out(2.2)）+ 勾线画出 ——
  const donePopP = doneAt === undefined ? 0 : tw(t, doneAt, FIXED.donePop, backOut(2.2));
  const doneDash = doneAt === undefined ? DONE_L
    : DONE_L * (1 - tw(t, doneAt + 0.08, FIXED.tickDraw, power2Out));

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div className="upt-card" style={{ left: posX, top: posY, width: cardW }}>
        <div className="upt-head">
          <div className="upt-icon"><i /></div>
          <div className="upt-name">{appName}</div>
          <div className="upt-ver">{appVer}</div>
        </div>

        <div className="upt-status-row">
          <span className="upt-status" style={{
            fontSize: statusSize,
            opacity: statusOp, color: statusColor,
            transform: `translateY(${statusY}px)`, display: "inline-block" }}>
            {status}
          </span>
          <span className="upt-done" style={{
            opacity: clamp01(donePopP), transform: `scale(${lerp(0.4, 1, donePopP)})`,
            transformOrigin: "50% 50%", display: "inline-block" }}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10.6" fill="none" stroke={accentColor} strokeWidth="1.8" />
              <path d="M6.8 12.4 L10.4 16 L17.2 8.4" fill="none" stroke={accentColor}
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray={DONE_L} strokeDashoffset={doneDash} />
            </svg>
          </span>
          <span className="upt-pct" style={{ fontSize: statusSize }}>{Math.round(prog)}%</span>
        </div>

        <div className="upt-track"><div className="upt-fill" style={{ background: accentColor, width: `${prog}%` }} /></div>

        <div className="upt-steps">
          {rows.map((s, i) => {
            const r = rowStyle(i);
            return (
              <div className="upt-step" key={i} style={{ backgroundColor: r.bg }}>
                <span className="upt-box" style={{ borderColor: r.box }}>
                  <svg viewBox="0 0 20 20">
                    <path d="M4.4 10.4 L8.2 14.2 L15.6 6.2" fill="none" stroke={accentColor}
                          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                          strokeDasharray={STEP_L} strokeDashoffset={r.dash} />
                  </svg>
                </span>
                <span className="upt-label" style={{ color: r.label }}>{s.label}</span>
                <span className="upt-meta">{s.meta}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="upt-pip"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "ui-prop-theater",
  name: "界面道具剧场",
  category: "数据信息图",
  durationInFrames: 179,
  accent: "#d8383a",
  component: UiPropTheater as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "appName", label: "应用名", default: "Studio 安装程序" },
    { type: "text", key: "appVer", label: "版本号", default: "v4.2.1" },
    { type: "text", key: "initStatus", label: "起手状态文案", default: "正在下载模型包…" },
    { type: "text", key: "status1", label: "状态②文案（第 1.5s 拍）", default: "正在解压文件…" },
    { type: "text", key: "status2", label: "状态③文案（第 2.35s 拍）", default: "正在安装依赖…" },
    { type: "text", key: "statusDone", label: "完成文案（收尾拍）", default: "安装完成" },
    { type: "textarea", key: "stepsDsl", label: "任务清单（每行：条目|备注；前三行依次被打勾）", default: DEFAULT_ROWS },
    { type: "color", key: "accentColor", label: "强调色（进度/勾）", default: "#d8383a" },
    { type: "slider", key: "statusSize", label: "状态行字号", default: 19, min: 14, max: 26, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "卡片 X", default: 180, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "卡片 Y", default: 96, step: 1, unit: "px" },
    { type: "number", key: "cardW", label: "卡片宽度", default: 600, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "整体延后（对齐口播）", default: 0, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
