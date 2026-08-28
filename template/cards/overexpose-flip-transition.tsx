import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// overexpose-flip-transition · 过曝翻页转场 —— 自包含 Remotion 源码（与 demos/overexpose-flip-transition/index.html 同画面）
// 一式 = 出场推向证据物到 1.5x + 重音层冲顶 + 入场 from 1.30 从亮心拉出。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 93 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数：过曝翻页转场 —— A（慢推）→ 过曝翻页 → B（慢推）——
const CONFIG = {
  hold: 0.80,      // 出场镜停留：相机永不静止（慢推）
  holdEnd: 0.90,   // 入场镜收尾停留
  blow: {
    out: 0.55,       // 出场推时长
    cutLead: 0.10,   // 切点提前量
    overlap: 0.40,   // 交叠（像素淡化）时长 ≈ 12 帧 @30fps
    settle: 0.55,    // 入场沉降时长
    outScale: 1.50,  // 推到 1.5x = "推进证据物"，比推穿更狠
    outBlur: 4,      // 出场失焦比推穿轻（亮心要看得清）
    inScale: 1.30,   // 入场起手景别（从亮心里被拉出来）
    inBlur: 6,
    // 重音层不对称包络：白底暗压 6~10%；深底改白色径向过曝 0.42~0.55
    peak: 0.10, rise: 0.26, fall: 0.42,
  },
};

/* 时间表（demo 秒，切点 cut = 0.8 + 0.55 − 0.10 = 1.25）
   0.00–0.30  tag 淡入
   0.00–0.80  A hold：慢推 1 → 1.05（sine.inOut）
   0.80–1.35  A 推 1.05 → 1.50 + blur 0 → 4（power2.in）
   0.99–1.25  重音层升到峰值 0.10（power2.in，以切点为锚）
   1.25–1.67  重音层回落到 0（power2.out）
   1.25–1.65  A 淡出 / B 淡入（交叠，power1.inOut）
   1.25–1.80  B 沉降 1.30 → 1.03 + blur 6 → 0（power2.out）
   1.80–2.70  B hold：慢推 1.03 → 1.07（sine.inOut） */

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

// —— 演示语境（不属于动效）：两个镜头 = 白/浅灰 tile ——
const CSS = `
/* 相机会推到 1.5x：镜头层做成超出画幅 14%（inset 对称 ⇒ 画面中心不变），
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

/* 转场重音层：白底上白色过曝会被完全吞掉（实测），改成"暗压闪"——全场压暗一拍。
   深底工程把底色换回白色径向过曝即可，包络不动 */
.flash { position: absolute; inset: 0; pointer-events: none; z-index: 6;
  background: radial-gradient(ellipse at 50% 46%, rgba(20,20,24,1) 0%, rgba(20,20,24,.55) 45%, rgba(20,20,24,.2) 80%); }

.tag { position: absolute; left: 24px; top: 20px; font-size: 17px; color: #8a8a8a;
  border: 1px solid #e0e0e0; border-radius: 999px; padding: 4px 14px; z-index: 7; }
`;

export default function OverexposeFlipTransition({ hostSrc }: { hostSrc?: string }) {
  void hostSrc;   // 本卡无主持人占位
  const t = useCurrentFrame() / FPS;
  const B = CONFIG.blow;
  const cut = CONFIG.hold + B.out - B.cutLead;          // 1.25
  const settleEnd = cut + B.settle;                     // 1.80

  // ── A（出场镜）：hold 慢推 → 推进证据物 + 轻失焦，交叠期淡出 ──
  const aScale = t < CONFIG.hold
    ? lerp(1, 1.05, tw(t, 0, CONFIG.hold, sineInOut))
    : lerp(1.05, B.outScale, tw(t, CONFIG.hold, B.out, power2In));
  const aBlur = lerp(0, B.outBlur, tw(t, CONFIG.hold, B.out, power2In));
  const aOpacity = 1 - tw(t, cut, B.overlap, power1InOut);

  // ── 重音层：不对称包络以切点为锚——切前 rise 升到峰值、切后 fall 回落 ──
  const flashOpacity = t < cut
    ? lerp(0, B.peak, tw(t, cut - B.rise, B.rise, power2In))
    : lerp(B.peak, 0, tw(t, cut, B.fall, power2Out));

  // ── B（入场镜）：from 1.30 从亮心拉出，交叠期淡入 ──
  const bOpacity = tw(t, cut, B.overlap, power1InOut);
  const bScale = t < settleEnd
    ? lerp(B.inScale, 1.03, tw(t, cut, B.settle, power2Out))
    : lerp(1.03, 1.07, tw(t, settleEnd, CONFIG.holdEnd, sineInOut));
  const bBlur = lerp(B.inBlur, 0, tw(t, cut, B.settle, power2Out));

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
        <div className="big">过曝翻页</div>
      </div>
      <div className="shot s2" style={{
        opacity: bOpacity, transform: `scale(${bScale})`, filter: `blur(${bBlur}px)`,
      }}>
        <div className="big">从亮心拉出</div>
      </div>
      <div className="flash" style={{ opacity: flashOpacity }} />
      <div className="tag" style={{ opacity: tagOpacity }}>
        推到 1.5x + 重音冲顶 · 包络以切点为锚（升 0.26s / 落 0.42s）
      </div>
    </AbsoluteFill>
  );
}
