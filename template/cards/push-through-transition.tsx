import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// push-through-transition · 推穿转场 —— 自包含 Remotion 源码（与 demos/push-through-transition/index.html 同画面）
// 一式 = 出场相机片段 + 入场相机片段，两侧运动必须同向（都在"往里推"这条轴上）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 95 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数：推穿转场 —— A（慢推）→ 推穿 → B（慢推）——
const CONFIG = {
  hold: 0.80,      // 出场镜停留：相机永不静止（慢推）
  holdEnd: 0.90,   // 入场镜收尾停留
  push: {
    out: 0.55,       // 出场加速推时长 s：从静止直接推=没有预备拍
    cutLead: 0.10,   // 切点提前量：交叠期在出场推到顶之前就开始
    overlap: 0.45,   // 交叠（像素淡化）时长 ≈ 13 帧 @30fps
    settle: 0.60,    // 入场沉降时长
    outScale: 1.35,  // 出场推到多大（"穿过去"的量）
    outBlur: 7,      // 出场末端失焦
    inScale: 1.16,   // 入场起手景别（>1 = 从高位往回沉，与出场同向）
    inBlur: 7,       // 入场起手失焦
  },
};

/* 时间表（demo 秒，切点 cut = 0.8 + 0.55 − 0.10 = 1.25）
   0.00–0.30  tag 淡入
   0.00–0.80  A hold：慢推 1 → 1.05（sine.inOut）
   0.80–1.35  A 加速推 1.05 → 1.35 + blur 0 → 7（power2.in）
   1.25–1.70  A 淡出 / B 淡入（交叠，power1.inOut）
   1.25–1.85  B 沉降 1.16 → 1.03 + blur 7 → 0（power2.out）
   1.85–2.75  B hold：慢推 1.03 → 1.07（sine.inOut） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease
const power2In = (x: number) => x * x * x;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// —— 演示语境（不属于动效）：两个镜头 = 白/浅灰 tile（只为区分"换了一镜"，不是风格）——
const CSS = `
/* 相机会推到 1.35x：镜头层做成超出画幅 14%（inset 对称 ⇒ 画面中心不变），
   推近/沉降时不漏白边。 */
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

.tag { position: absolute; left: 24px; top: 20px; font-size: 17px; color: #8a8a8a;
  border: 1px solid #e0e0e0; border-radius: 999px; padding: 4px 14px; z-index: 7; }
`;

export default function PushThroughTransition({ hostSrc }: { hostSrc?: string }) {
  void hostSrc;   // 本卡无主持人占位
  const t = useCurrentFrame() / FPS;
  const P = CONFIG.push;
  const cut = CONFIG.hold + P.out - P.cutLead;          // 1.25
  const settleEnd = cut + P.settle;                     // 1.85

  // ── A（出场镜）：hold 慢推 → 加速推穿 + 失焦，交叠期淡出 ──
  const aScale = t < CONFIG.hold
    ? lerp(1, 1.05, tw(t, 0, CONFIG.hold, sineInOut))
    : lerp(1.05, P.outScale, tw(t, CONFIG.hold, P.out, power2In));
  const aBlur = lerp(0, P.outBlur, tw(t, CONFIG.hold, P.out, power2In));
  const aOpacity = 1 - tw(t, cut, P.overlap, power1InOut);

  // ── B（入场镜）：从模糊高位反向沉降到 1.03（进场即自带运动），交叠期淡入 ──
  const bOpacity = tw(t, cut, P.overlap, power1InOut);
  const bScale = t < settleEnd
    ? lerp(P.inScale, 1.03, tw(t, cut, P.settle, power2Out))
    : lerp(1.03, 1.07, tw(t, settleEnd, CONFIG.holdEnd, sineInOut));
  const bBlur = lerp(P.inBlur, 0, tw(t, cut, P.settle, power2Out));

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="shot s1" style={{
        opacity: aOpacity, transform: `scale(${aScale})`, filter: `blur(${aBlur}px)`,
      }}>
        <div className="big">推穿</div>
      </div>
      <div className="shot s2" style={{
        opacity: bOpacity, transform: `scale(${bScale})`, filter: `blur(${bBlur}px)`,
      }}>
        <div className="big">同向沉降</div>
      </div>
      <div className="tag" style={{ opacity: tagOpacity }}>
        出场加速推 → 入场从模糊高位反向沉降 · 两侧同向
      </div>
    </AbsoluteFill>
  );
}
