import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// tracking-in · 字距收拢 —— 自包含 Remotion 源码（与 demos/tracking-in/index.html 同画面）
// 整屏让位给一句大标题的卡（不放主持人）：靠留白成立。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 90 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
//   一条 spring 同时驱动两件事：letter-spacing 0.5em → −0.03em、blur 9px → 0；
//   opacity 另走一条 0.5s 线性淡入（与 spring 无关，源码就是分开的）。
//   spring 配置 damping 18 / stiffness 90 —— ζ=0.949 欠阻尼，但过冲峰值只有 8e-5，
//   肉眼是"没有回弹的长缓收"：起手 0.3s 走掉 80% 的字距，剩下 0.5s 极慢地咬到位。
//   命门：字距与模糊必须同一条 spring。分开成两条缓动，"散开的字聚焦成一块"就散了。
const CONFIG = {
  lead: 0.30,          // 起手静置：等口播开口
  springDur: 1.00,     // spring 走完到 <1e-4 的时长 s（damping 18 / stiffness 90 @30fps）
  fadeDur: 0.50,       // 淡入时长 s，线性、不跟 spring
  startTracking: 0.5,  // 起始字距 em（源码值原样）
  endTracking: -0.03,  // 终态字距 em（源码值原样：略收紧，不是 0）
  startBlur: 9,        // 起始模糊 px（比例恒为字号 1/8；72px ⇒ 9）
  hold: 1.30,          // 收尾定格：咬到位的大标题就是落点
};

/* 时间表（demo 秒）
   0.30–1.30  字距 + 模糊同一条 spring 收拢
   0.30–0.80  线性淡入
   1.30–2.60  收尾定格 */

// Remotion spring 的解析解（欠阻尼分支，from 0 → to 1，初速 0）：
//   ζ = damping / (2√(stiffness·mass))，ω₀ = √(stiffness/mass)，ω₁ = ω₀√(1−ζ²)
//   x(t) = 1 − e^(−ζω₀t)·[ (ζω₀/ω₁)·sin(ω₁t) + cos(ω₁t) ]
function remotionSpring(damping: number, stiffness: number, mass: number) {
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const omega0 = Math.sqrt(stiffness / mass);
  if (zeta >= 1) {                                  // 临界/过阻尼分支（本卡不走，留着以便改参数）
    return (t: number) => 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
  }
  const omega1 = omega0 * Math.sqrt(1 - zeta * zeta);
  const decay = zeta * omega0;
  return (t: number) =>
    1 - Math.exp(-decay * t) * ((decay / omega1) * Math.sin(omega1 * t) + Math.cos(omega1 * t));
}
const SPRING = remotionSpring(18, 90, 1);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// —— 动效本体：整行大字，nowrap 是硬要求（字距 0.5em 时整句比终态宽 50%） ——
const CSS = `
.ti-frame {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;          /* 源码显式白底：字距收拢靠"空"才读得出来 */
}
.ti-title {
  font-size: 72px;              /* 源码 96px @1280 宽画幅 → 本库 960 舞台等比 ×0.75 */
  font-weight: 700;             /* 源码值：大标题气质靠重字重 */
  line-height: 1.2;
  color: #171717;               /* 源码墨色，不是纯黑 */
  white-space: nowrap;
}
`;

export default function TrackingIn() {
  const t = useCurrentFrame() / FPS;

  // 轨① 字距 + 模糊：同一条 spring 驱动（进度 → 秒 → spring 位置）
  const s = SPRING(clamp01((t - CONFIG.lead) / CONFIG.springDur) * CONFIG.springDur);
  const tracking = lerp(CONFIG.startTracking, CONFIG.endTracking, s);
  const blur = CONFIG.startBlur * (1 - s);

  // 轨② 淡入：0.5s 线性，与 spring 无关（源码是两个独立 interpolate）
  const opacity = clamp01((t - CONFIG.lead) / CONFIG.fadeDur);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="ti-frame">
        <span className="ti-title" style={{
          opacity,
          letterSpacing: `${tracking.toFixed(4)}em`,
          filter: `blur(${Math.max(0, blur).toFixed(3)}px)`,
        }}>认知决定上限</span>
      </div>
    </AbsoluteFill>
  );
}
