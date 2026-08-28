import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// black-slam-transition · 黑震切转场 —— 自包含 Remotion 源码（与 demos/black-slam-transition/index.html 同画面）
// 一式 = 出场相机定格 + 重音冲顶 + 最后 1 帧直接消失（hardOut，零交叠）；
//        入场满亮直切且开场自带运动（震一拍 + 从 1.10 后拉刹住）。全片唯一硬切。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 82 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数：黑震切转场 —— A（慢推 + 末段定格）→ 黑震切 → B（慢漂）——
const CONFIG = {
  hold: 0.80,      // 出场镜停留（前段慢推 + 末段定格）
  holdEnd: 0.90,   // 入场镜收尾停留
  slam: {
    freeze: 0.34,     // 定格时长：全片唯一不动的一拍，是硬切的预备拍
    punch: 0.12,      // 重音冲顶时长（切点前）
    peak: 0.34,       // 重音峰值（白底暗压；深底改白色过曝）
    fall: 0.20,       // 切点后重音回落
    kick: 0.50,       // 入场后拉刹住时长
    kickScale: 1.10,  // 入场起手景别（满亮直切时就已经在动）
    shake: 9,         // 震位幅度 px：三段递减，只在切点一拍发生
  },
};

/* 时间表（demo 秒，切点 cut = 0.8 + 0.12 = 0.92）
   0.00–0.30  tag 淡入
   0.00–0.46  A hold：慢推 1 → 1.06（sine.inOut），0.46–0.80 定格
   0.80–0.92  重音冲顶 0 → 0.34（power3.in）
   0.92       硬切：A 直接消失 / B 满亮直切（零交叠）
   0.92–1.12  重音回落 0.34 → 0（power2.out）
   0.92–1.12  B 震一拍：x 9 → −4.95 → 2.52 → 0（三段递减）
   0.92–1.42  B 后拉刹住 1.10 → 1.0（power4.out）
   1.42–2.32  B hold：慢漂 scale 1.0 → 1.03 + x 0 → 10（sine.inOut） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3In = (x: number) => x * x * x * x;
const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// —— 演示语境（不属于动效）：两个镜头 = 白/浅灰 tile ——
const CSS = `
/* 入场自带震位 ±9px + 从 1.10 后拉：镜头层做成超出画幅 14%（inset 对称 ⇒ 画面中心不变），
   震/拉时不漏白边。 */
.shot {
  position: absolute; inset: -14%; display: flex;
  align-items: center; justify-content: center;
  will-change: transform, filter, opacity;
}
/* 镜头里只有式名大字——这是给人认式子用的标签，不是台词字幕 */
.shot .big { font-size: 76px; font-weight: 800; color: #8a8a8a;
  letter-spacing: 3px; white-space: nowrap; }
.s1 { background: #ffffff; }
.s2 { background: #f1f1f4; }

/* 转场重音层：白底上白色过曝会被完全吞掉（实测），改成"暗压闪"——全场压暗一拍。
   深底工程把底色换回白色径向过曝即可，包络不动 */
.flash { position: absolute; inset: 0; pointer-events: none; z-index: 6;
  background: radial-gradient(ellipse at 50% 46%, rgba(20,20,24,1) 0%, rgba(20,20,24,.55) 45%, rgba(20,20,24,.2) 80%); }

.tag { position: absolute; left: 24px; top: 20px; font-size: 17px; color: #8a8a8a;
  border: 1px solid #e0e0e0; border-radius: 999px; padding: 4px 14px; z-index: 7; }
`;

export default function BlackSlamTransition({ hostSrc }: { hostSrc?: string }) {
  void hostSrc;   // 本卡无主持人占位
  const t = useCurrentFrame() / FPS;
  const K = CONFIG.slam;
  const cut = CONFIG.hold + K.punch;                    // 0.92
  const kickEnd = cut + K.kick;                         // 1.42

  // ── A（出场镜）：前段慢推 + 末段定格（定格是黑震切的预备拍），切点直接消失 ──
  const aScale = lerp(1, 1.06, tw(t, 0, CONFIG.hold - K.freeze, sineInOut));
  const aOpacity = t < cut ? 1 : 0;   // hardOut：不淡出，直接消失

  // ── 重音层：切点前冲顶、切点后回落 ──
  const flashOpacity = t < cut
    ? lerp(0, K.peak, tw(t, CONFIG.hold, K.punch, power3In))
    : lerp(K.peak, 0, tw(t, cut, K.fall, power2Out));

  // ── B（入场镜）：满亮直切 + 震一拍（三段递减）+ 后拉刹住 ──
  const bOpacity = t < cut ? 0 : 1;
  let bX = 0;
  if (t >= cut && t < cut + 0.06) bX = lerp(K.shake, -K.shake * 0.55, tw(t, cut, 0.06, linear));
  else if (t >= cut + 0.06 && t < cut + 0.12) bX = lerp(-K.shake * 0.55, K.shake * 0.28, tw(t, cut + 0.06, 0.06, linear));
  else if (t >= cut + 0.12 && t < cut + 0.20) bX = lerp(K.shake * 0.28, 0, tw(t, cut + 0.12, 0.08, power2Out));
  else if (t >= kickEnd) bX = lerp(0, 10, tw(t, kickEnd, CONFIG.holdEnd, sineInOut));   // hold 慢漂
  const bScale = t < kickEnd
    ? lerp(K.kickScale, 1.0, tw(t, cut, K.kick, power4Out))
    : lerp(1.0, 1.03, tw(t, kickEnd, CONFIG.holdEnd, sineInOut));

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="shot s1" style={{ opacity: aOpacity, transform: `scale(${aScale})` }}>
        <div className="big">黑震切</div>
      </div>
      <div className="shot s2" style={{
        opacity: bOpacity, transform: `translate(${bX}px, 0px) scale(${bScale})`,
      }}>
        <div className="big">满亮直切</div>
      </div>
      <div className="flash" style={{ opacity: flashOpacity }} />
      <div className="tag" style={{ opacity: tagOpacity }}>
        定格一拍 → 零交叠硬切 · 入场自带震一拍 + 后拉刹住（全片限一次）
      </div>
    </AbsoluteFill>
  );
}
