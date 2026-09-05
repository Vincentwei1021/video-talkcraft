import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// filmstrip-conveyor · 传送带列举 + 减速停靠 —— 自包含 Remotion 源码（与 demos/filmstrip-conveyor/index.html 同画面）
// 六格素材接成一条传送带匀速左行，经过中线的格按"离中线的距离"每帧连续放大 / 提亮；讲到关键一格时按位置-时间分段积分减速到 0.25×、
// 停靠 1.4s 再加速回匀速；六格全部过完中线后整体退场（有限时长，不循环）。复制本文件进你的工程即可用；真图经 srcs 注入（不传 = 六档灰调占位）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 250 };   // END 7.94s + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 放大 / 提亮按"离中线的距离"每帧连续算（不是到点触发）
//      ② 减速按位置-时间分段积分：匀速 → 减速 → 慢速停靠 → 加速 → 匀速，速度连续不跳变；减速结束点对齐"关键格居中"
//      ③ 一切状态由时间 t 纯函数算出（stripX(t) + 逐格 k），HTML 与 tsx 用同一条公式
// ——————————————————————————————————————————————————————————
const CONFIG = {
  n: 6,             // 一组格数（后面接一组副本，传送带右端不留空）
  w: 240, gap: 24,  // 格宽 / 格距 → pitch 264
  loopDur: 9,       // 一组（6 格）匀速走完的时长 → v = 6×264 / 9 = 176px/s（≤220；24fps 成片抖动先降到 ~150）
  slowIdx: 3,       // 讲到第四格减速（0 起）
  slowTo: 0.25,     // 慢速段速度 = 0.25 × 匀速
  decel: 0.5,       // 减速时长
  slowDur: 1.4,     // 慢速停靠时长
  accel: 0.6,       // 加速时长
  maxScale: 1.08,   // 正对中线时的放大
  dimTo: 0.5,       // 离中线最远时的 brightness
  reach: 420,       // 放大 / 提亮的影响半径 px（|cx − 480| ≥ reach ⇒ k = 0）
  exitAt: 7.5,      // 第六格过完中线（6.92s）后 ~0.6s 整体退场
  exit: 0.4,        // 退场时长（标题 → 传送带，错峰 0.04）
};
const pitch = CONFIG.w + CONFIG.gap, setW = CONFIG.n * pitch, v = setW / CONFIG.loopDur;   // 264 / 1584 / 176
// 位置-时间分段积分（trapezoid：减速段距离 = v·decel·(1+slowTo)/2，加速段同理）
const dDecel = (v * CONFIG.decel * (1 + CONFIG.slowTo)) / 2;      // 55
const dSlow = v * CONFIG.slowTo * CONFIG.slowDur;                 // 61.6
const dAccel = (v * CONFIG.accel * (1 + CONFIG.slowTo)) / 2;      // 66
const centerX = CONFIG.slowIdx * pitch + CONFIG.w / 2 - 480;      // 关键格居中时的 stripX = 432
const x0 = Math.max(0, centerX - dDecel);                         // 减速起点 377：减速结束时刚好居中
const t1 = x0 / v, t2 = t1 + CONFIG.decel, t3 = t2 + CONFIG.slowDur, t4 = t3 + CONFIG.accel;   // 2.142 / 2.642 / 4.042 / 4.642
// 速度连续的减速 / 加速曲线：起速 v、末速 r·v（power2.out 的起速是 3v、末速 0，会跳）
const r = CONFIG.slowTo;
const decelEase = (s: number) => (2 / (1 + r)) * s - ((1 - r) / (1 + r)) * s * s;       // p'(0)=1.6, p'(1)=0.4
const accelEase = (s: number) => ((2 * r) / (1 + r)) * s + ((1 - r) / (1 + r)) * s * s;  // p'(0)=0.4, p'(1)=1.6
/** 传送带位移 stripX(t)：五段拼接，各段端点速度相等 */
const stripX = (t: number) => {
  if (t < t1) return v * t;
  if (t < t2) return x0 + dDecel * decelEase((t - t1) / CONFIG.decel);
  if (t < t3) return x0 + dDecel + v * r * (t - t2);
  if (t < t4) return x0 + dDecel + dSlow + dAccel * accelEase((t - t3) / CONFIG.accel);
  return x0 + dDecel + dSlow + dAccel + v * (t - t4);
};
/** 第 i 格的中线权重 k ∈ [0,1]：离中线 0 → 1，reach 之外 → 0（二次衰减） */
const weight = (i: number, x: number) => { const cx = -x + i * pitch + CONFIG.w / 2; const d = Math.min(1, Math.abs(cx - 480) / CONFIG.reach); return (1 - d) * (1 - d); };
const END = CONFIG.exitAt + 0.04 + CONFIG.exit;   // 7.94
/* 时间表（s）：0–2.14 匀速 · 2.14–2.64 减速 · 2.64–4.04 慢速停靠（第四格居中）· 4.04–4.64 加速 · 4.64– 匀速
   · 6.92 第六格过中线 · 7.5 标题退 · 7.54 传送带退 · END 7.94 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const power2In = (x: number) => x * x * x;

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 fsc- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.fsc-hdr { position: absolute; left: 60px; top: 70px; font-size: 26px; font-weight: 700; color: #1d1d1f; }
.fsc-hdr small { display: block; font-size: 14px; color: #8a8a8a; font-weight: 500; margin-top: 4px; }
.fsc-center { position: absolute; left: 50%; top: 170px; width: 280px; height: 200px; margin-left: -140px; border: 1px dashed rgba(0,0,0,.14); border-radius: 14px; }
.fsc-strip { position: absolute; left: 0; top: 190px; display: flex; gap: 24px; will-change: transform; }
.fsc-item { position: relative; flex: 0 0 240px; height: 160px; border-radius: 10px; overflow: hidden; background: #ffffff; padding: 6px; box-shadow: 0 12px 40px rgba(0,0,0,.16); }
.fsc-item .n { position: absolute; left: 14px; bottom: 12px; font-size: 14px; color: #ffffff; background: rgba(0,0,0,.55); padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.fsc-ph { position: absolute; inset: 6px; border-radius: 5px; overflow: hidden; }
.fsc-ph::before { content: ""; position: absolute; inset: 0; }
.fsc-ph.t1::before { background: linear-gradient(160deg, #a4b0c6, #7d8aa3); }
.fsc-ph.t2::before { background: linear-gradient(160deg, #bfa5ae, #957c86); }
.fsc-ph.t3::before { background: linear-gradient(160deg, #9fb9ae, #789389); }
.fsc-ph.t4::before { background: linear-gradient(160deg, #c2b39a, #9c8f78); }
.fsc-ph.t5::before { background: linear-gradient(160deg, #a3a9b8, #7f8594); }
.fsc-ph.t6::before { background: linear-gradient(160deg, #b8a9c4, #8f809d); }
.fsc-ph svg { position: absolute; left: 50%; top: 50%; width: 34px; height: 29px; transform: translate(-50%, -56%); opacity: .35; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);
const NAMES = ["一", "二", "三", "四", "五", "六"];

type Props = {
  /** 六张真图（第 i 格）；不传用六档灰调占位 */
  srcs?: string[];
  /** 六格标签；不传用"构图 一~六" */
  labels?: string[];
  /** 顶部标题 / 小注 */
  title?: string;
  note?: string;
};

export default function FilmstripConveyor({ srcs, labels, title = "去年爆款封面的六种构图", note = "2025 年播放量前六的封面 · 第四种出现最多" }: Props) {
  const t = useCurrentFrame() / FPS;
  const x = stripX(t);
  // 字与画同收：标题 → 传送带（含中线取景位），错峰 0.04
  const opHdr = 1 - tw(t, CONFIG.exitAt, CONFIG.exit, power2In);
  const opStrip = 1 - tw(t, CONFIG.exitAt + 0.04, CONFIG.exit, power2In);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="fsc-hdr" style={{ opacity: opHdr }}>{title}<small>{note}</small></div>
      <div className="fsc-center" style={{ opacity: opStrip }} />
      <div className="fsc-strip" style={{ opacity: opStrip, transform: `translateX(${-x}px)` }}>
        {Array.from({ length: CONFIG.n * 2 }, (_, i) => {
          const j = i % CONFIG.n, k = weight(i, x);   // 后六格是前六格的副本
          const src = srcs && srcs[j];
          return (
            <div key={i} className="fsc-item" style={{ transform: `scale(${1 + (CONFIG.maxScale - 1) * k})`, filter: `brightness(${CONFIG.dimTo + (1 - CONFIG.dimTo) * k})`, zIndex: Math.round(k * 10) }}>
              <div className={`fsc-ph t${j + 1}`}>
                {src ? <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : GLYPH}
              </div>
              <div className="n">{(labels && labels[j]) || `构图 ${NAMES[j]}`}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
