import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// per-character-rise · 逐字升起 —— 自包含 Remotion 源码（与 demos/per-character-rise/index.html 同画面）
// 纯文字卡（不放主持人）：整屏交给这一句，"一股气顶上来"。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 85 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
//   每个汉字从自己位置下方升到位：位移 0.33s、淡入 0.70s，
//   逐字错峰 1 帧（0.033s）—— 错峰极小，整句读作"一股气顶上来"而不是一个个蹦。
//   位移与淡入用两条不同的缓动（源码就是两条），这是它比普通上滑淡入更"有骨头"的原因。
const CONFIG = {
  lead: 0.30,        // 起手静置：等口播开口
  dur: 0.70,         // 淡入时长 s（源码 charDurationFrames 21 ÷ 30）
  travel: 0.3333,    // 位移时长 s（源码 charTravelFrames 10 ÷ 30）= dur 的 48%
  stagger: 0.0333,   // 逐字错峰 s（源码 staggerFrames 1 ÷ 30）
  rise: 32,          // 起始下沉 px（比例恒为字号 44%；72px ⇒ 32）
  hold: 1.20,        // 收尾定格：立住的整句就是落点
  text: "先想清楚，再动手",   // 一句口播判断，6~10 字
};

/* 时间表（demo 秒）：第 i 字 at = 0.30 + i×0.0333；
   淡入 [at, at+0.70]（FADE_EASE）、升起 [at, at+0.3333]（TRAVEL_EASE）；
   末字（i=7）淡入止于 1.233；hold 1.2 → 有限动画结束 2.433s */

// GSAP core 不带 CustomEase：自己解 cubic-bezier 的 x(t)=p 再取 y(t)（照抄 demo 解算器）
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return function (p: number) {
    let t = p;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - p;
      if (Math.abs(e) < 1e-6) break;
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = Math.max(0, Math.min(1, t));
    return ((ay * t + by) * t + cy) * t;
  };
}
const FADE_EASE   = cubicBezier(0.2, 0.8, 0.2, 1);      // 淡入：起手快、尾段长缓收
const TRAVEL_EASE = cubicBezier(0.2, 0.8, 0.6, 0.85);   // 位移：冲一下就滑到位（源码专用曲线）

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// —— 动效本体所在的行：整句在舞台正中；nowrap 是硬要求 ——
const CSS = `
.pcr-line {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.pcr-text {
  font-size: 72px;              /* 纯文字整屏（本卡起始下沉恒为字号 44%） */
  font-weight: 600;
  line-height: 1.25;
  color: #171717;               /* 源码墨色，不是纯黑 */
  letter-spacing: -0.05em;      /* 源码值：整句略收紧 */
}
.pcr-char {
  display: inline-block;
  white-space: pre;
  backface-visibility: hidden;
  transform-origin: 50% 55%;    /* 重心略偏下，升起收尾时字不往上飘 */
}
`;

export default function PerCharacterRise() {
  const t = useCurrentFrame() / FPS;

  // Array.from 按码点切字：中文即逐汉字（标点也算一个字，跟着升起是对的）
  const chars = Array.from(CONFIG.text);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="pcr-line">
        <span className="pcr-text">
          {chars.map((ch, i) => {
            const at = CONFIG.lead + i * CONFIG.stagger;
            // 轨① 淡入：走满 dur（比位移长一倍，位移先停、淡入后停）
            const fadeP = tw(t, at, CONFIG.dur, FADE_EASE);
            // 轨② 升起位移：只占前 travel，另一条缓动
            const y = lerp(CONFIG.rise, 0, tw(t, at, CONFIG.travel, TRAVEL_EASE));
            return (
              <span key={i} className="pcr-char" style={{
                opacity: fadeP, transform: `translateY(${y}px)`,
              }}>{ch}</span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
}
