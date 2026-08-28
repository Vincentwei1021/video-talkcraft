import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// pullback-cool-transition · 后拉冷却转场 —— 自包含 Remotion 源码（与 demos/pullback-cool-transition/index.html 同画面）
// 一式 = 出场"内容沉暗"（相机几乎不动，靠内容褪灰失焦交出画面）
//        + 入场全片唯一 scale<1 起步的后拉，节奏最慢。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 104 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数：后拉冷却转场 —— A（慢漂）→ 后拉冷却 → B（慢推）——
const CONFIG = {
  hold: 0.80,      // 出场镜停留：相机永不静止（慢漂）
  holdEnd: 0.90,   // 入场镜收尾停留
  pull: {
    out: 0.50,       // 出场沉暗时长
    cutLead: 0.05,   // 切点提前量（本式最小，交接靠"暗"而不是"快"）
    overlap: 0.55,   // 交叠（像素淡化）时长 ≈ 16 帧 @30fps，本式交叠最长
    settle: 0.90,    // 入场后拉时长：全片最慢
    outDim: 0.18,    // 出场内容褪到多暗（白底=褪灰；深底工程沉入近黑）
    outBlur: 2,      // 出场内容失焦
    inScale: 0.90,   // 入场起手景别：全片唯一 <1
    inBlur: 4,
    inSettle: 0.99,  // 后拉落点：停在 0.99 而不是 1.0，留给 hold 继续推
  },
};

/* 时间表（demo 秒，切点 cut = 0.8 + 0.50 − 0.05 = 1.25）
   0.00–0.30  tag 淡入
   0.00–0.80  A hold：慢漂 scale 1 → 1.03 + x 0 → 10（sine.inOut）
   0.80–1.30  A 大字沉暗 opacity 1 → 0.18 + blur 0 → 2（sine.in）；相机收住 scale → 1.0（sine.out）
   1.25–1.80  A 淡出 / B 淡入（交叠，sine.inOut）
   1.25–2.15  B 后拉 0.90 → 0.99 + blur 4 → 0（power2.out）
   2.15–3.05  B hold：慢推 0.99 → 1.02（sine.inOut） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const sineIn = (x: number) => 1 - Math.cos((x * Math.PI) / 2);
const sineOut = (x: number) => Math.sin((x * Math.PI) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// —— 演示语境（不属于动效）：两个镜头 = 白/浅灰 tile ——
const CSS = `
/* 入场从 scale 0.90 起步（全片唯一 scale<1）：镜头层做成超出画幅 14%
   （inset 对称 ⇒ 画面中心不变），后拉时不漏白边。 */
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

export default function PullbackCoolTransition({ hostSrc }: { hostSrc?: string }) {
  void hostSrc;   // 本卡无主持人占位
  const t = useCurrentFrame() / FPS;
  const P = CONFIG.pull;
  const cut = CONFIG.hold + P.out - P.cutLead;          // 1.25
  const settleEnd = cut + P.settle;                     // 2.15

  // ── A（出场镜）：慢漂 → 内容沉暗（相机收住不推不拉），交叠期淡出 ──
  const aScale = t < CONFIG.hold
    ? lerp(1, 1.03, tw(t, 0, CONFIG.hold, sineInOut))
    : lerp(1.03, 1.0, tw(t, CONFIG.hold, P.out, sineOut));   // 相机收住
  const aX = lerp(0, 10, tw(t, 0, CONFIG.hold, sineInOut));
  const aBigOpacity = lerp(1, P.outDim, tw(t, CONFIG.hold, P.out, sineIn));
  const aBigBlur = lerp(0, P.outBlur, tw(t, CONFIG.hold, P.out, sineIn));
  const aOpacity = 1 - tw(t, cut, P.overlap, sineInOut);

  // ── B（入场镜）：全片唯一 scale<1 起步的后拉，交叠期淡入 ──
  const bOpacity = tw(t, cut, P.overlap, sineInOut);
  const bScale = t < settleEnd
    ? lerp(P.inScale, P.inSettle, tw(t, cut, P.settle, power2Out))
    : lerp(P.inSettle, 1.02, tw(t, settleEnd, CONFIG.holdEnd, sineInOut));
  const bBlur = lerp(P.inBlur, 0, tw(t, cut, P.settle, power2Out));

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="shot s1" style={{
        opacity: aOpacity, transform: `translate(${aX}px, 0px) scale(${aScale})`,
      }}>
        <div className="big" style={{ opacity: aBigOpacity, filter: `blur(${aBigBlur}px)` }}>
          后拉冷却
        </div>
      </div>
      <div className="shot s2" style={{
        opacity: bOpacity, transform: `scale(${bScale})`, filter: `blur(${bBlur}px)`,
      }}>
        <div className="big">呼吸落定</div>
      </div>
      <div className="tag" style={{ opacity: tagOpacity }}>
        出场内容沉暗（相机收住）→ 入场从 0.90 后拉 · 全片最慢的一式
      </div>
    </AbsoluteFill>
  );
}
