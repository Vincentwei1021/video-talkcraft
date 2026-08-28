import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// whip-pan-transition · 横甩转场 —— 自包含 Remotion 源码（与 demos/whip-pan-transition/index.html 同画面）
// 一式 = 出场 x 甩出 + blur + 微旋 → 入场从对侧滑回 0（= 同一次横扫），刹住 + 回稳。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 84 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数：横甩（whip-pan）转场 —— A（慢推）→ 横甩 → B（慢推）——
const CONFIG = {
  hold: 0.80,      // 出场镜停留：相机永不静止（慢推）
  holdEnd: 0.90,   // 入场镜收尾停留
  whip: {
    out: 0.42,       // 出场甩出时长（加速段）
    cutLead: 0.06,   // 切点提前量：甩到最快的那一刻换场
    overlap: 0.30,   // 交叠（像素淡化）时长 ≈ 9 帧 @30fps，甩镜的交叠比推穿短
    brake: 0.35,     // 入场刹车时长：不刹直接停 = 撞墙
    recover: 0.50,   // 二段回稳（只收旋转）
    dist: 560,       // 甩出位移 px（按舞台宽 960 折算 ≈ 0.58 屏宽）
    blur: 8,         // 甩镜失焦
    rot: 1.4,        // 微旋角度 deg：甩镜的"手持感"来源
  },
};

/* 时间表（demo 秒，切点 cut = 0.8 + 0.42 − 0.06 = 1.16）
   0.00–0.30  tag 淡入
   0.00–0.80  A hold：慢推 1 → 1.04（sine.inOut）
   0.80–1.22  A 甩出 x 0 → −560 / rotate 0 → −1.4 / blur 0 → 8（power3.in）
   1.16–1.46  A 淡出（power1.out）
   1.16–1.28  B 淡入（power1.out，0.12s）
   1.16–1.51  B 刹车：x 560 → 0 / blur 8 → 0 / rotate 1.4 → 0.42 / scale 1.06 → 1.02（power3.out）
   1.51–2.01  B 二段回稳：rotate 0.42 → 0（sine.out）
   1.51–2.41  B hold：慢推 1.02 → 1.06（sine.inOut） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease
const power3In = (x: number) => x * x * x * x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const sineOut = (x: number) => Math.sin((x * Math.PI) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// —— 演示语境（不属于动效）：两个镜头 = 白/浅灰 tile ——
const CSS = `
/* 相机会横甩 560px：镜头层做成超出画幅 14%（inset 对称 ⇒ 画面中心不变），
   甩镜时不漏白边。 */
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

export default function WhipPanTransition({ hostSrc }: { hostSrc?: string }) {
  void hostSrc;   // 本卡无主持人占位
  const t = useCurrentFrame() / FPS;
  const W = CONFIG.whip;
  const cut = CONFIG.hold + W.out - W.cutLead;          // 1.16
  const brakeEnd = cut + W.brake;                       // 1.51

  // ── A（出场镜）：hold 慢推 → 向左甩出 + 微旋 + 失焦，切点后淡出 ──
  const aScale = lerp(1, 1.04, tw(t, 0, CONFIG.hold, sineInOut));
  const aX = lerp(0, -W.dist, tw(t, CONFIG.hold, W.out, power3In));
  const aRot = lerp(0, -W.rot, tw(t, CONFIG.hold, W.out, power3In));
  const aBlur = lerp(0, W.blur, tw(t, CONFIG.hold, W.out, power3In));
  const aOpacity = 1 - tw(t, cut, W.overlap, power1Out);

  // ── B（入场镜）：从右侧同向滑回 0，刹住 + 二段回稳（只收旋转）──
  const bOpacity = tw(t, cut, 0.12, power1Out);
  const bX = lerp(W.dist, 0, tw(t, cut, W.brake, power3Out));
  const bBlur = lerp(W.blur, 0, tw(t, cut, W.brake, power3Out));
  const bRot = t < brakeEnd
    ? lerp(W.rot, W.rot * 0.3, tw(t, cut, W.brake, power3Out))
    : lerp(W.rot * 0.3, 0, tw(t, brakeEnd, W.recover, sineOut));
  // 二段回稳只收旋转，scale 交给紧接着的 hold（= 进场即自带运动，不撞墙）
  const bScale = t < brakeEnd
    ? lerp(1.06, 1.02, tw(t, cut, W.brake, power3Out))
    : lerp(1.02, 1.06, tw(t, brakeEnd, CONFIG.holdEnd, sineInOut));

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="shot s1" style={{
        opacity: aOpacity, filter: `blur(${aBlur}px)`,
        transform: `translate(${aX}px, 0px) rotate(${aRot}deg) scale(${aScale})`,
      }}>
        <div className="big">横甩</div>
      </div>
      <div className="shot s2" style={{
        opacity: bOpacity, filter: `blur(${bBlur}px)`,
        transform: `translate(${bX}px, 0px) rotate(${bRot}deg) scale(${bScale})`,
      }}>
        <div className="big">同向刹住</div>
      </div>
      <div className="tag" style={{ opacity: tagOpacity }}>
        向左甩出 → 从右侧同向滑回 · 0.35s 刹住 + 二段回稳
      </div>
    </AbsoluteFill>
  );
}
