import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// info-term-card · 名词解释悬浮卡 —— 自包含 Remotion 源码（与 demos/info-term-card/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 197 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数 ——
const CONFIG = {
  slideIn: 0.35,     // 入场耗时 s（power3.out）
  overshootPx: 12,   // 入场过冲距离（约卡宽 3%）：0 就没有"弹"感
  floatPx: 6,        // 悬浮幅度 ±px：>10 像漂走
  floatPeriod: 2.8,  // 悬浮周期 s（一个来回）
  holdBeforeOut: 3.2,// 停留时长 s，念完释义再收
  slideOut: 0.25,    // 出场原路滑出
  iconTilt: 8,       // 图标微转角度 °
  offX: 480,         // 屏外待命的 x 位移 px（人物在右侧时改成 -480）
};

/* 时间表（demo 秒）
   0.00–0.35  x 480→−12 滑入（power3.out）
   0.35–0.51  x −12→0 过冲回稳（power2.out）
   0.56–6.16  y 正弦浮动 ±6px（sine.inOut yoyo ×4 个半程）+ 图标微转
   3.71–3.96  x 0→480 原路滑出（power2.in）——浮动继续但卡已出画 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// yoyo tween 进度：repeat 次数内往返（GSAP yoyo 语义：偶数趟正放、奇数趟倒放，每趟各自走 ease）
const yoyoP = (t: number, t0: number, half: number, plays: number) => {
  if (t <= t0) return 0;
  const cyc = (t - t0) / half;
  if (cyc >= plays) return plays % 2 === 1 ? 1 : 0;
  const k = Math.floor(cyc);
  const p = cyc - k;
  return k % 2 === 1 ? 1 - p : p;
};

// 主持人占位：演示语境素材，不属于动效本体（本卡主持人靠左：host-left）
const Host: React.FC<{ src?: string }> = ({ src }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex",
                alignItems: "flex-end", justifyContent: "flex-start", background: "#fff" }}>
    {src ? (
      <Loop durationInFrames={13 * FPS}>
        <OffthreadVideo src={src} muted transparent style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)", height: "88%" }} />
      </Loop>
    ) : (
      <div style={{ width: "42%", height: "78%", marginLeft: "6%", background:
        "radial-gradient(ellipse 46% 26% at 50% 13%, #e3e3e6 60%, transparent 61%)," +
        "radial-gradient(ellipse 50% 62% at 50% 84%, #ececef 60%, transparent 61%)" }} />
    )}
  </div>
);

// —— 演示语境（不属于动效）：主持人占位靠左，名词卡从人物对侧滑入 ——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */
.term-card {
  position: absolute;
  right: 56px;
  top: 36%;
  width: 330px;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 20px 22px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  /* 投影是"悬浮"这层语义的一部分（无投影就没有悬感），中性化后只留最低限度的一层 */
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.10);
  color: #1d1d1f;
}
.term-card .icon {
  flex: 0 0 auto;
  width: 46px; height: 46px;
  border-radius: 50%;
  background: #f5f5f7;
  border: 1px solid #e0e0e0;
  color: #1d1d1f;
  font-size: 22px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.term-card .term { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
.term-card .term small { font-size: 13px; font-weight: 600; color: #8a8a8a; margin-left: 6px; }
.term-card .desc { font-size: 14px; line-height: 1.55; color: #5a5a5f; }  /* 释义两行封顶 */
`;

export default function InfoTermCard({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // —— x：滑入 → 过冲回稳 → 停留后原路滑出 ——
  const outAt = CONFIG.slideIn + 0.16 + CONFIG.holdBeforeOut;   // 3.71
  const x = t < CONFIG.slideIn
    ? lerp(CONFIG.offX, -CONFIG.overshootPx, tw(t, 0, CONFIG.slideIn, power3Out))
    : t < outAt
      ? lerp(-CONFIG.overshootPx, 0, tw(t, CONFIG.slideIn, 0.16, power2Out))
      : lerp(0, CONFIG.offX, tw(t, outAt, CONFIG.slideOut, power2In));

  // —— 落位后：y 正弦浮动营造"悬浮"，图标跟着微转（yoyo repeat 3 = 共 4 个半程）——
  const floatStart = CONFIG.slideIn + 0.16 + 0.05;   // 0.56
  const fp = sineInOut(yoyoP(t, floatStart, CONFIG.floatPeriod / 2, 4));
  const y = CONFIG.floatPx * fp;
  const iconRot = CONFIG.iconTilt * fp;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <Host src={hostSrc} />
      <div className="term-card" style={{ transform: `translate(${x}px, ${y}px)` }}>
        <div className="icon" style={{ transform: `rotate(${iconRot}deg)` }}>¥</div>
        <div>
          <div className="term">量化宽松<small>QE</small></div>
          <div className="desc">央行"印钱"买入国债等资产，把流动性压进市场，刺激经济。</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
