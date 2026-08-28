import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// keyword-pop-highlight · 关键词弹出强调 —— 自包含 Remotion 源码（与 demos/keyword-pop-highlight/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 42 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数 ——
const CONFIG = {
  popScale: 1.65,     // 关键词最大放大倍数：>1.9 读作搞笑向，<1.3 强调不足
  popIn: 0.18,        // 弹出耗时 s：快才有"砸出来"的劲
  settle: 0.22,       // 回落到 1.15 的耗时
  restScale: 1.15,    // 定格倍数：关键词比正文略大
  shakePx: 7,         // 弹出瞬间整屏微震幅度 px
  delay: 0.55,        // 正文先读一拍，关键词晚半句出现
};

/* 时间表（demo 秒）
   0.55–0.73  关键词 scale 0→1.65 + opacity 0→1 + rotate -8→2（power4.out）
   0.55–0.79  整屏 x 抖动 [0,7,-7,7,-7,7,0]（linear，6 段各 0.04s），0.79 复位
   0.79–1.01  关键词 scale 1.65→1.15 + rotate 2→0（back.out(2.5)） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// 主持人占位：演示语境素材，不属于动效本体
const Host: React.FC<{ src?: string }> = ({ src }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex",
                alignItems: "flex-end", justifyContent: "center", background: "#fff" }}>
    {src ? (
      <Loop durationInFrames={13 * FPS}>
        <OffthreadVideo src={src} muted transparent style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)", height: "88%" }} />
      </Loop>
    ) : (
      <div style={{ width: "42%", height: "78%", background:
        "radial-gradient(ellipse 46% 26% at 50% 13%, #e3e3e6 60%, transparent 61%)," +
        "radial-gradient(ellipse 50% 62% at 50% 84%, #ececef 60%, transparent 61%)" }} />
    )}
  </div>
);

// —— 演示语境（不属于动效）：主持人剪影 + 底部字幕。白底 + 黑字，零风格化 ——
const CSS = `
.caption-zone {
  position: absolute;
  left: 0; right: 0;
  bottom: 6%;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.caption {
  font-size: 34px;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: 1px;
  white-space: nowrap;
}
/* —— 动效本体 —— 关键词 + 色块底（色块红/词黄是语义高亮对，只用在动效本体上） */
.caption .kw {
  display: inline-block;
  position: relative;
  margin: 0 .36em;          /* 留出 1.15 倍定格 + skew 的溢出，否则色块压到相邻字 */
  padding: .04em .18em;
  font-weight: 800;
  color: #ffd23e;
  transform-origin: 50% 80%;
}
.caption .kw::before {         /* 色块底 */
  content: "";
  position: absolute;
  inset: 0;
  background: #b33131;
  border-radius: .14em;
  z-index: -1;
  transform: skewX(-6deg);
}
`;

export default function KeywordPopHighlight({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ① 弹出：scale 0→1.65（power4.out）；0.73–0.79 停在 1.65，之后回落
  const popP = tw(t, CONFIG.delay, CONFIG.popIn, power4Out);
  const settleAt = CONFIG.delay + 0.24;   // shake（0.24s）结束才排到回落 tween
  const settleP = tw(t, settleAt, CONFIG.settle, backOut(2.5));
  const scale = t < settleAt
    ? lerp(0, CONFIG.popScale, popP)
    : lerp(CONFIG.popScale, CONFIG.restScale, settleP);
  const rotate = t < settleAt ? lerp(-8, 2, popP) : lerp(2, 0, settleP);
  const opacity = popP;

  // ② 弹出的冲击帧：整个画面 ±shakePx 左右抖 3 个来回（0.04s/次，linear）
  const shakeVals = [0, CONFIG.shakePx, -CONFIG.shakePx, CONFIG.shakePx,
                     -CONFIG.shakePx, CONFIG.shakePx, 0];
  let shakeX = 0;
  if (t >= CONFIG.delay && t < CONFIG.delay + 0.24) {
    const seg = ((t - CONFIG.delay) / 0.24) * (shakeVals.length - 1);
    const i = Math.min(shakeVals.length - 2, Math.floor(seg));
    shakeX = lerp(shakeVals[i], shakeVals[i + 1], seg - i);
  }

  return (
    <AbsoluteFill style={{ background: "#ffffff", overflow: "hidden" }}>
      {/* demo 里抖的是 #stage：这里抖整个内层画面 */}
      <AbsoluteFill style={{
        background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
        fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
        transform: `translateX(${shakeX}px)`,
      }}>
        <style>{CSS}</style>
        <Host src={hostSrc} />
        <div className="caption-zone">
          <div className="caption">
            这家公司一年烧掉
            <span className="kw" style={{
              opacity,
              transform: `rotate(${rotate}deg) scale(${scale})`,
            }}>300个亿</span>
            ，还在疯狂扩张
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
