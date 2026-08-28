import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// soft-blur-in · 柔焦淡入 —— 自包含 Remotion 源码（与 demos/soft-blur-in/index.html 同画面）
// 复制本文件进你的工程即可用。本卡是纯文字卡（2026-08-25 用户定版）——不放主持人。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 92 };

const FPS = meta.fps;

// ─────────────────────────────────────────────────────────────────────────
// 可摘走的核心动画：柔焦淡入（remocn SoftBlurIn 忠实搬运，30fps → 秒）
//   一句话被"对焦"出来：blur 12px → 0 + opacity 0 → 1 走满 0.9s，
//   同时 y +16px → 0 只占前 0.3s（位移先停、解糊后停 —— 柔性的来源）。
//   逐字错峰只有 1 帧（0.033s）：几乎是整块，但留下一道极浅的左→右扫过感。
// ─────────────────────────────────────────────────────────────────────────
const CONFIG = {
  lead: 0.30,        // 起手静置：等口播开口（本库约定，源码从第 0 帧就开始）
  dur: 0.90,         // 解糊 + 淡入时长 s（源码 charDurationFrames 27 ÷ 30）
  travel: 0.30,      // y 位移时长 s（源码 charTravelFrames 9 ÷ 30）= dur 的 33%
  stagger: 0.0333,   // 逐字错峰 s（源码 staggerFrames 1 ÷ 30）
  blur: 12,          // 起始模糊 px（比例恒为字号 1/6；72px ⇒ 12）
  rise: 16,          // 起始下沉 px（≈字号 22%；72px ⇒ 16）
  hold: 1.20,        // 收尾定格：清晰的整句就是落点
  text: "答案往往没那么复杂",   // 一句口播结论，7~11 字
};

/* 时间表（demo 秒）
   0.30+0.0333i  字 i 解糊+淡入 0.9s / y 位移只占前 0.3s（同一条 cubic-bezier(0.22,1,0.36,1)）
   末字 1.47 解糊完毕 → hold 1.2 → 2.67 结束 */

// cubic-bezier(0.22,1,0.36,1)（easeOutQuint 家族）—— 解 x(t)=p 再取 y(t)。
// 这个解算器是通用的，别的卡可直接抄走。
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
const EASE = cubicBezier(0.22, 1, 0.36, 1);   // 全卡一条缓动：位移与解糊同族

// —— tween helper ——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// —— 演示语境（不属于动效）：整句在舞台正中，nowrap 是硬要求 ——
const CSS = `
.sb-line {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.sb-text {
  font-size: 72px;              /* 纯文字整屏：模糊量恒为字号 1/6、下沉恒为 22% */
  font-weight: 600;
  line-height: 1.25;
  color: #171717;               /* 源码墨色，不是纯黑 */
  letter-spacing: -0.05em;      /* 源码值：整句略收紧，柔焦解开后读作"一整块" */
}
/* 每个字：唯一被 transform / filter 的元素。transform-origin 50% 55% 抄源码
   （重心略偏下，解糊时字不往上飘） */
.sb-char {
  display: inline-block;
  white-space: pre;
  backface-visibility: hidden;
  transform-origin: 50% 55%;
  will-change: transform, filter, opacity;
}
`;

export default function SoftBlurIn(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // Array.from 按码点切字：中文即逐汉字（emoji/代理对也不会被切坏）
  const chars = Array.from(CONFIG.text);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="sb-line">
        <span className="sb-text">
          {chars.map((ch, i) => {
            const at = CONFIG.lead + i * CONFIG.stagger;
            // 轨① 解糊 + 淡入：走满 dur（本卡的主轨，"柔"全在这条 0.9s 上）
            const pMain = tw(t, at, CONFIG.dur, EASE);
            // 轨② 位移：只占前 travel。位移先停、解糊后停
            const pTravel = tw(t, at, CONFIG.travel, EASE);
            return (
              <span key={i} className="sb-char" style={{
                opacity: pMain,
                filter: `blur(${lerp(CONFIG.blur, 0, pMain)}px)`,
                transform: `translateY(${lerp(CONFIG.rise, 0, pTravel)}px)`,
              }}>{ch}</span>
            );
          })}
        </span>
      </div>
    </AbsoluteFill>
  );
}
