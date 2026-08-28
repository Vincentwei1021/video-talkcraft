import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// line-by-line-slide · 逐行滑入 —— 自包含 Remotion 源码（与 demos/line-by-line-slide/index.html 同画面）
// 复制本文件进你的工程即可用（本卡为纯文字卡，无主持人）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 120 };

const FPS = meta.fps;

// ─────────────────────────────────────────────────────────────────────────
// 可摘走的核心动画：逐行滑入（remocn LineByLineSlide 忠实搬运，30fps → 秒）
//   入场：每行从左侧 36px 外滑到位，位移 0.47s、淡入 0.90s（位移先停、淡入后停），
//         行间错峰 0.133s（=4 帧，恰好读作"一行一行"而不是整块）。
//   出场：整叠从同一侧穿出去——淡出 0.60s 立刻起，横向位移延迟 0.27s 才动、
//         往右 +36px（进从左、出向右 = 穿过式，不是倒放），出场错峰只有入场的一半（0.067s）。
//   入场缓动是缓出（0.22,1,0.36,1）、出场缓动是缓入（0.64,0,0.78,0）——一进一出方向相反。
// ─────────────────────────────────────────────────────────────────────────
const CONFIG = {
  lead: 0.30,          // 起手静置：等口播开口（本库约定，源码从第 0 帧就开始）
  enterDur: 0.90,      // 每行淡入时长 s（源码 enterDur 27 ÷ 30）
  enterTravel: 0.4667, // 每行位移时长 s（源码 enterTravel 14 ÷ 30）= enterDur 的 52%
  enterStagger: 0.1333,// 入场行间错峰 s（源码 enterStagger 4 ÷ 30）
  hold: 1.40,          // 全叠读完的停留 s
  exitDur: 0.60,       // 每行淡出时长 s（源码 exitDur 18 ÷ 30）
  exitDelay: 0.2667,   // 淡出起 → 横向位移起的延迟 s（源码 exitTravelFrom 8 ÷ 30）
  exitStagger: 0.0667, // 出场行间错峰 s（源码 exitStagger 2 ÷ 30）= 入场的一半
  distance: 47,        // 横向位移量 px（比例恒为字号 78%；本卡 60px ⇒ 47）：入场 −47 → 0，出场 0 → +47
  // 3~4 行中文要点。行数上限 4：再多则首行早已淡出、"一叠"这个整体读不出来
  lines: ["第一，把问题写下来", "第二，只留一个变量", "第三，跑最小实验"],
};

/* 时间表（demo 秒）
   0.30+0.133i  第 i 行入场：淡入 0.9s；位移 -47→0 只占前 0.467s（皆 cubic-bezier(0.22,1,0.36,1)）
   1.467        最后一行入场结束 → hold 1.4s
   2.867+0.067i 第 i 行出场：淡出 0.6s 立刻起；位移 0→+47 延迟 0.267s（皆 cubic-bezier(0.64,0,0.78,0)）
   3.60         最后一行出场结束 */

// —— tween helper ——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// cubic-bezier 解算器：解 x(t)=p 再取 y(t)（牛顿迭代，通用可抄走）
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return function (p: number) {
    let u = p;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * u + bx) * u + cx) * u - p;
      if (Math.abs(e) < 1e-6) break;
      const d = (3 * ax * u + 2 * bx) * u + cx;
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    u = Math.max(0, Math.min(1, u));
    return ((ay * u + by) * u + cy) * u;
  };
}
const ENTER_EASE = cubicBezier(0.22, 1, 0.36, 1);    // 缓出：冲进来再长距离缓收
const EXIT_EASE = cubicBezier(0.64, 0, 0.78, 0);     // 缓入：先粘住再加速甩走

// 演示语境（不属于动效）：纯文字整屏，整叠居中但行与行仍左对齐（共享左端才读作"一叠"）
const CSS = `
.lbl-block {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lbl-text {
  display: inline-block;        /* 收缩到最长行的宽度，共享左端由此成立 */
  text-align: left;
  font-size: 60px;
  font-weight: 600;
  line-height: 1.35;            /* 源码 1.1 是拉丁字母值；中文字面高，1.1 会让行与行粘住 */
  color: #171717;               /* 源码墨色，不是纯黑 */
  letter-spacing: -0.03em;
}
/* 每一行：唯一被 transform 的元素（block + 左端为轴，位移只走横向） */
.lbl-row {
  display: block;
  transform-origin: 0% 50%;
  white-space: nowrap;
  will-change: transform, opacity;
}
`;

export default function LineByLineSlide() {
  const t = useCurrentFrame() / FPS;

  // 出场永远不早于入场结束：最后一行入场结束 + hold
  const enterEnd = CONFIG.lead + CONFIG.enterDur + (CONFIG.lines.length - 1) * CONFIG.enterStagger;
  const exitStart = enterEnd + CONFIG.hold;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="lbl-block">
        <span className="lbl-text">
          {CONFIG.lines.map((line, i) => {
            const at = CONFIG.lead + i * CONFIG.enterStagger;
            const out = exitStart + i * CONFIG.exitStagger;
            // 入场轨① 淡入走满 enterDur；出场轨① 淡出立刻起（入场必已结束，顺序接力）
            const opacity = t < out
              ? tw(t, at, CONFIG.enterDur, ENTER_EASE)
              : 1 - tw(t, out, CONFIG.exitDur, EXIT_EASE);
            // 入场轨② 位移只占前 enterTravel；出场轨② 位移延迟 exitDelay 才动
            const x = t < out + CONFIG.exitDelay
              ? lerp(-CONFIG.distance, 0, tw(t, at, CONFIG.enterTravel, ENTER_EASE))
              : lerp(0, CONFIG.distance,
                  tw(t, out + CONFIG.exitDelay, CONFIG.exitDur - CONFIG.exitDelay, EXIT_EASE));
            return (
              <span key={i} className="lbl-row" style={{
                opacity, transform: `translateX(${x}px)`,
              }}>{line}</span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
}
