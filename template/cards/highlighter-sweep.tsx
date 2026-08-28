import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// highlighter-sweep · 荧光笔高亮扫过 —— 自包含 Remotion 源码（与 demos/highlighter-sweep/index.html 同画面）
// 复制本文件进你的工程即可用。本卡无主持人（纯文字引用卡）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 60 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数：扫过 + 压暗 + 浮起 三个动作一个时序 ——
const CONFIG = {
  startDelay: 0.7,   // 静置一拍，等口播念到关键句
  sweep: 0.6,        // 荧光块扫过耗时 s：0.4~0.8 匹配朗读语速，太快像 bug
  dimTo: 0.4,        // 其余段落压暗到的透明度：不压暗=强调失效
  liftScale: 1.03,   // 扫完整句轻微浮起倍数
};

/* 时间表（demo 秒）
   0.70–1.30  荧光块 scaleX 0→1（power2.inOut）
   0.70–1.15  其余段落 opacity 1→0.4（power2.out）
   1.30–1.60  关键句 scale 1→1.03 + y 0→-2（power2.out，origin left center） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

// —— 演示语境（不属于动效）：一段引用文字。白底 + 黑字 + 灰阶，零风格化 ——
const CSS = `
.quote-card {
  position: absolute;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%);
  width: 640px;
  padding: 34px 42px 30px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  color: #1d1d1f;
}
.quote-card .doc-head {
  font-size: 13px;
  letter-spacing: 3px;
  color: #8a8a8a;
  border-bottom: 1px solid #ececec;
  padding-bottom: 10px;
  margin-bottom: 18px;
}
.quote-line {
  font-size: 21px;
  line-height: 1.9;
  font-weight: 500;
}
/* —— 动效本体 —— 荧光色块（语义色，属于动效） */
.quote-line .hl-wrap {
  position: relative;
  display: inline-block;
  font-weight: 700;
}
.quote-line .hl-block {
  position: absolute;
  left: -6px;
  right: -8px;
  top: 2px;
  bottom: 0;
  background: #FFE949;
  opacity: 0.6;
  mix-blend-mode: multiply;         /* 命门：色块不许盖字 */
  border-radius: 12px 5px 10px 4px / 7px 12px 5px 10px;  /* 不规则圆角模拟笔触 */
  transform-origin: left center;
}
`;

export default function HighlighterSweep(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // 荧光笔从左到右扫过关键句；同帧其余文字压暗——视线被押着走
  const sweepX = tw(t, CONFIG.startDelay, CONFIG.sweep, power2InOut);
  const dimOpacity = lerp(1, CONFIG.dimTo, tw(t, CONFIG.startDelay, 0.45, power2Out));
  // 扫完：整句轻微放大浮起，强调落定
  const liftP = tw(t, CONFIG.startDelay + CONFIG.sweep, 0.3, power2Out);
  const keyScale = lerp(1, CONFIG.liftScale, liftP);
  const keyY = lerp(0, -2, liftP);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="quote-card">
        <div className="doc-head">《2024 年度宏观经济报告》 · 第 42 页</div>
        <div className="quote-line dim" style={{ opacity: dimOpacity }}>过去三年，居民部门的储蓄率持续攀升，</div>
        <div className="quote-line dim" style={{ opacity: dimOpacity }}>消费意愿始终徘徊在低位。报告指出，</div>
        <div className="quote-line key" style={{
          transform: `translateY(${keyY}px) scale(${keyScale})`,
          transformOrigin: "left center",
        }}>
          <span className="hl-wrap">
            <span className="hl-block" style={{ transform: `scaleX(${sweepX})` }} />
            真正拖住消费的不是没钱，而是对未来的不确定感
          </span>。
        </div>
        <div className="quote-line dim" style={{ opacity: dimOpacity }}>这一判断与多家机构的调研结论一致，</div>
        <div className="quote-line dim" style={{ opacity: dimOpacity }}>政策端的回应也在陆续落地。</div>
      </div>
    </AbsoluteFill>
  );
}
