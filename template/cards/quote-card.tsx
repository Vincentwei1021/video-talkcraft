import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// quote-card · 金句大字卡 —— 自包含 Remotion 源码（与 demos/quote-card/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 123 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数 ——
const CONFIG = {
  panelIn: 0.25,     // 底色板淡入耗时 s：盖住人物的仪式感
  panelDim: 1,       // 底板不透明度：低于 0.9 文字会和人物打架
  lineIn: 0.4,       // 单行弹入耗时 s（y 30→0 + opacity，power3.out）
  lineStagger: 0.15, // 行间错峰 120~180ms：同时出=没有"逐句砸"的语感
  lineRise: 30,      // 行入场位移 px
  hold: 2,           // 全卡停留 s（真实口播 2~4s，随语速）
  out: 0.3,          // 出场整卡下滑淡出耗时 s
  outDrop: 40,       // 出场下滑距离 px
};

/* 时间表（demo 秒）
   0.15–0.40  底板淡入（power2.out）
   0.35+0.15i 行 i 弹入 0.4s（power3.out，y 30→0）；末行 0.80–1.20
   1.10–1.40  出处淡入（power2.out）
   3.40–3.70  整卡下滑淡出（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;

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

// —— 动效本体 —— 底板整屏盖住人物（遮蔽动作）+ 逐行错峰弹入。
// 例外底色：底板必须与舞台白底有明度反差，否则"盖住人物"这个动作不可见——
// 故用灰阶深底（无色相）。
const CSS = `
.quote-panel {
  position: absolute;
  inset: 0;
  background: #1d1d1f;            /* 底板要够实，别让文字和人物打架 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 26px;
  padding: 0 28px;
}
.quote-line {
  font-size: 42px;
  font-weight: 800;
  line-height: 1.25;
  color: #ffffff;
  letter-spacing: 2px;
  white-space: nowrap;
}
.quote-line .kw {                 /* 行内关键词：换色 + 1.2x，不再加字级动画（静态高亮） */
  color: #ffd23e;
  font-size: 1.2em;
}
.quote-src {
  margin-top: 10px;
  font-size: 16px;
  color: #8a8a8a;
  letter-spacing: 4px;
}
`;

export default function QuoteCard({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // 底板：淡入 → hold → 整卡下滑淡出
  const outAt = 3.40;
  const outP = tw(t, outAt, CONFIG.out, power2In);
  const panelOpacity = t < outAt
    ? lerp(0, CONFIG.panelDim, tw(t, 0.15, CONFIG.panelIn, power2Out))
    : lerp(CONFIG.panelDim, 0, outP);
  const panelY = lerp(0, CONFIG.outDrop, outP);

  // 逐行错峰弹入：整行动，行内不再加字级动画
  const lineStyle = (i: number): React.CSSProperties => {
    const p = tw(t, 0.35 + i * CONFIG.lineStagger, CONFIG.lineIn, power3Out);
    return { opacity: p, transform: `translateY(${lerp(CONFIG.lineRise, 0, p)}px)` };
  };
  const srcOpacity = tw(t, 1.10, 0.3, power2Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <Host src={hostSrc} />
      <div className="quote-panel" style={{
        opacity: panelOpacity, transform: `translateY(${panelY}px)`,
      }}>
        <div className="quote-line" style={lineStyle(0)}>赚钱这件事</div>
        <div className="quote-line" style={lineStyle(1)}>从来不靠<span className="kw">努力</span></div>
        <div className="quote-line" style={lineStyle(2)}>靠的是<span className="kw">认知</span></div>
        <div className="quote-line" style={lineStyle(3)}>和你敢不敢选</div>
        <div className="quote-src" style={{ opacity: srcOpacity }}>—— 口播金句 · 第 47 期</div>
      </div>
    </AbsoluteFill>
  );
}
