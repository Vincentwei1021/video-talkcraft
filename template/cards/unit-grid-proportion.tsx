import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// unit-grid-proportion · 点阵比例图 —— 自包含 Remotion 源码（与 demos/unit-grid-proportion/index.html 同画面）
// 100 个小方格从中心分环长出，再按阅读顺序逐格染成强调色，右侧大数字同步计数——把"37%"摊成 37 个可数的个体（unit chart）。
// 复制本文件进你的工程即可用；数字 / 文案经 props 注入。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 195 };   // 6.1s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 格子"长出来"不是"飞进来"（只 opacity + scale .8→1，无位移）；② 分环生长 + 同环 3 帧抖动（砍掉抖动波前整齐得像机器）；
//      ③ 染色按阅读顺序从左上起、与大数字计数同一时钟（数字先到格子后到读作两件事）；④ 颜色只有强调色 + 灰，落定即静。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  cols: 10, total: 100,  // 10×10 = 100 格：比例直接可读（8×7 = 56 要换算）
  target: 37,            // 染色格数 = 百分比（<8 观众可能漏看，>60 该染另一边）
  growAt: 0.2,           // 网格生长起点 s
  ringDur: 0.13,         // 每环间隔 s（≈4 帧）；<0.1 读作闪现
  jitter: 0.1,           // 同环内确定性抖动上限 s（≈3 帧）
  growDur: 0.3,          // 单格 opacity 0→1 + scale .8→1（power2.out）
  statIn: 1.4,           // 大数字入场 s（标签 +0.1 错峰；0.5s power3.out，y 14→0）
  fillStart: 1.7,        // 染色 + 计数起点 s（成片对到口播念出数字的时刻）
  fillEach: 0.035,       // 每格间隔 s（37 格 ≈ 1.3s）；计数与染色同一时钟
  fillDur: 0.25,         // 单格底色过渡 s（power2.out）
  legendGap: 0.2,        // 图例在染色结束后多久浮出 s（0.4s）
  exitAt: 5.7,           // 全部退场起点（0.4s power2.in）
  end: 6.1,              // 镜头结束
  accent: "#0066cc",     // 强调色（唯一）
  base: "#e3e3e8",       // 未染格底色（灰）
};

/* 时间表（demo 秒）
   0.20–~1.10  网格分环生长（环号 = 到中心欧氏距离取整，每环 0.13s + ≤0.1s 抖动；单格 0.3s power2.out）
   1.40 / 1.50 大数字 / 两行标签入场（0.5s power3.out，y 14→0）
   1.70–3.00  按阅读顺序逐格染色（每格 0.035s，过渡 0.25s power2.out）；大数字同一时钟 0→target（线性，取整）
   3.20–3.60  图例浮出
   5.70–6.10  全部同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;

// 确定性抖动（同 seed 同值；与 demo 同一公式，不用 Math.random）
const srand = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

// 颜色插值（GSAP backgroundColor 的 RGB 线性插值）
const hex2rgb = (h: string) => { const v = h.replace("#", ""); const n = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixHex = (a: string, b: string, p: number) => { const A = hex2rgb(a), B = hex2rgb(b); return `rgb(${Math.round(lerp(A[0], B[0], p))}, ${Math.round(lerp(A[1], B[1], p))}, ${Math.round(lerp(A[2], B[2], p))})`; };

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 ugp- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.ugp-grid { position: absolute; left: 176px; top: 82px; display: grid; grid-template-columns: repeat(${CONFIG.cols}, 28px); gap: 6px; }
.ugp-cell { width: 28px; height: 28px; border-radius: 6px; }
.ugp-stat { position: absolute; left: 584px; top: 140px; color: #1d1d1f; }
.ugp-big { font-size: 128px; font-weight: 600; letter-spacing: -4px; line-height: 1; font-variant-numeric: tabular-nums; display: flex; align-items: baseline; }
.ugp-big small { font-size: 44px; letter-spacing: 0; margin-left: 6px; font-weight: 600; }
.ugp-lbl { font-size: 26px; font-weight: 600; margin-top: 18px; line-height: 1.4; }
.ugp-lbl span { display: block; }
.ugp-lgd { position: absolute; left: 176px; top: 428px; font-size: 16px; color: #7a7a7a; display: flex; gap: 18px; align-items: center; white-space: nowrap; }
.ugp-lgd i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
`;

type Props = {
  /** 染色格数 = 百分比（0~100） */
  target?: number;
  /** 大数字后缀（"%" / "人" / "家"…） */
  unit?: string;
  /** 大数字下的标签行（每项一行） */
  label?: string[];
  /** 图例：[染色项, 未染项, 备注]；空字符串 = 不显示该项 */
  legend?: [string, string, string];
  /** 强调色（默认唯一强调色） */
  accent?: string;
};

export default function UnitGridProportion({
  target = CONFIG.target,
  unit = "%",
  label = ["的观众", "在前 3 秒划走"],
  legend = ["划走 · 37 人", "留下 · 63 人", "每格 = 1 人（示意数据）"],
  accent = CONFIG.accent,
}: Props) {
  const t = useCurrentFrame() / FPS;
  const n = Math.max(0, Math.min(CONFIG.total, Math.round(target)));
  const fillTotal = n * CONFIG.fillEach;
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.end - CONFIG.exitAt, power2In);   // 全部同收

  // 网格：分环生长 + 按阅读顺序染色
  const c0 = (CONFIG.cols - 1) / 2, rows = CONFIG.total / CONFIG.cols, r0 = (rows - 1) / 2;
  const cells = Array.from({ length: CONFIG.total }, (_, i) => {
    const col = i % CONFIG.cols, row = Math.floor(i / CONFIG.cols);
    const ring = Math.round(Math.hypot(col - c0, row - r0));
    const g = tw(t, CONFIG.growAt + ring * CONFIG.ringDur + srand(i) * CONFIG.jitter, CONFIG.growDur, power2Out);
    const f = i < n ? tw(t, CONFIG.fillStart + i * CONFIG.fillEach, CONFIG.fillDur, power2Out) : 0;
    return (
      <div key={i} className="ugp-cell" style={{ opacity: g * exitK, transform: `scale(${lerp(0.8, 1, g)})`, transformOrigin: "50% 50%", background: mixHex(CONFIG.base, accent, f) }} />
    );
  });

  // 大数字与标签（错峰 0.1）、计数（与染色同一时钟）、图例
  const bigIn = tw(t, CONFIG.statIn, 0.5, power3Out), lblIn = tw(t, CONFIG.statIn + 0.1, 0.5, power3Out);
  const count = Math.round(lerp(0, n, tw(t, CONFIG.fillStart, fillTotal, linear)));
  const lgdIn = tw(t, CONFIG.fillStart + fillTotal + CONFIG.legendGap, 0.4, power1Out);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="ugp-grid">{cells}</div>
      <div className="ugp-stat">
        <div className="ugp-big" style={{ color: accent, opacity: bigIn * exitK, transform: `translateY(${lerp(14, 0, bigIn)}px)` }}>
          <span>{count}</span><small>{unit}</small>
        </div>
        <div className="ugp-lbl" style={{ opacity: lblIn * exitK, transform: `translateY(${lerp(14, 0, lblIn)}px)` }}>
          {label.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </div>
      <div className="ugp-lgd" style={{ opacity: lgdIn * exitK, transform: `translateY(${lerp(14, 0, lgdIn)}px)` }}>
        {legend[0] ? <span><i style={{ background: accent }} />{legend[0]}</span> : null}
        {legend[1] ? <span><i style={{ background: CONFIG.base }} />{legend[1]}</span> : null}
        {legend[2] ? <span>{legend[2]}</span> : null}
      </div>
    </AbsoluteFill>
  );
}
