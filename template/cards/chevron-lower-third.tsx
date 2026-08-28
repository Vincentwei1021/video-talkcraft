import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// chevron-lower-third · 动态人名条 —— 自包含 Remotion 源码（与 demos/chevron-lower-third/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 108 };

const FPS = meta.fps;

// ─────────────────────────────────────────────────────────────────────
// 可摘走的核心动画：动态人名条（姓名推出 → chip 展开 → chevron 扫过 → 整条收回）
//   ① 姓名行从左推出：x -26→0 + opacity（0.26s power3.out）。
//   ② 职称 chip 错峰 0.1s 从 origin left scaleX 0→1 展开（0.22s），
//      chip 内字滞后 2 帧（0.067s）淡入 —— chip 先成形、字后落，层次才不塌。
//   ③ 三枚 chevron 依次扫过点亮（错峰 0.07s，x +5→0 + opacity 0→1）：
//      收尾语义是"条子还在往右延伸"，不是装饰。
//   ④ hold 2.0s —— 人名条要停久，观众得读完姓名 + 头衔两遍。
//   ⑤ 退场：整条一起从左收回（scaleX→0 + opacity，0.2s power2.in，比入场快）。
// ─────────────────────────────────────────────────────────────────────
const CONFIG = {
  lead: 0.4,          // 起手静置 s：等人物开口
  nameDur: 0.26,      // 姓名推出时长 s
  namePush: -26,      // 姓名起始 x 位移 px（负 = 从左推出）
  chipDur: 0.22,      // chip scaleX 展开时长 s
  chipGap: 0.1,       // chip 相对姓名起步的错峰 s
  chipTxtLag: 0.067,  // chip 内字的滞后 s（≈ 2 帧 @30fps）
  chevDur: 0.14,      // 单枚 chevron 点亮时长 s
  chevStagger: 0.07,  // chevron 之间的错峰 s
  chevSlide: 5,       // chevron 点亮时的 x 位移 px
  hold: 2.0,          // 停留 s：人名条的本职是"让人读完"
  outDur: 0.2,        // 退场时长 s（比入场快 —— 出场永远比入场轻）
};

/* 时间表（demo 秒）
   0.40–0.66  姓名 x -26→0 + opacity（power3.out）
   0.50–0.72  chip scaleX 0→1（power3.out）
   0.567–0.707 chip 内字淡入（power1.out）
   0.72/0.79/0.86 三枚 chevron 依次点亮（各 0.14s power2.out）
   3.00–3.20  整条 scaleX→0 + opacity→0（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
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

// —— 口播语境：真人出镜，左下打人名条 ——
//    中性化：白底、墨字；唯一语义色 = 蓝 #0066cc，只上在 chip 与 chevron（动效本体）上。
const CSS = `
.clt {
  position: absolute;
  left: 72px; bottom: 96px;      /* 安全区内：左 72 / 下 96（≥ action-safe） */
  transform-origin: left center;
}
.clt-name {
  font-size: 44px; font-weight: 700; line-height: 1.1;
  color: #1d1d1f; letter-spacing: 2px;
  white-space: nowrap;
}
/* 第二行 = 职称 chip + chevron，基线对齐 */
.clt-row {
  display: flex; align-items: center; gap: 12px;
  margin-top: 14px;
}
.clt-chip {
  position: relative;
  height: 40px;
  padding: 0 18px;
  border-radius: 12px;           /* 小件圆角（design-language §3） */
  display: flex; align-items: center;
  overflow: hidden;              /* chip 展开时字不许溢出到 chip 之外 */
}
.clt-chip-bg {
  position: absolute; inset: 0;
  background: #0066cc;
  border-radius: 12px;
  transform-origin: left center;
}
.clt-chip span {
  position: relative;
  font-size: 21px; font-weight: 600; letter-spacing: 1.5px;
  color: #ffffff; white-space: nowrap;
}
/* 三枚 chevron：条子"还在往右延伸"的收尾手势 */
.clt-chevs { display: flex; gap: 4px; }
.clt-chev { width: 15px; height: 26px; }
.clt-chev path {
  fill: none; stroke: #0066cc; stroke-width: 4.5;
  stroke-linecap: round; stroke-linejoin: round;
}
`;

export default function ChevronLowerThird({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  const t0 = CONFIG.lead;
  const chipAt = t0 + CONFIG.chipGap;
  const chevAt = chipAt + CONFIG.chipDur;
  const outAt = chevAt + 2 * CONFIG.chevStagger + CONFIG.chevDur + CONFIG.hold;

  // ① 姓名从左推出
  const nameP = tw(t, t0, CONFIG.nameDur, power3Out);
  // ② chip 展开 + 字滞后 2 帧
  const chipScale = tw(t, chipAt, CONFIG.chipDur, power3Out);
  const chipTxtOp = tw(t, chipAt + CONFIG.chipTxtLag, 0.14, power1Out);
  // ⑤ 整条从左收回
  const outP = tw(t, outAt, CONFIG.outDur, power2In);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <Host src={hostSrc} />
      <div className="clt" style={{ transform: `scaleX(${1 - outP})`, opacity: 1 - outP }}>
        <div className="clt-name" style={{
          transform: `translateX(${lerp(CONFIG.namePush, 0, nameP)}px)`, opacity: nameP }}>
          陈知远
        </div>
        <div className="clt-row">
          <div className="clt-chip">
            <div className="clt-chip-bg" style={{ transform: `scaleX(${chipScale})` }} />
            <span style={{ opacity: chipTxtOp }}>供应链咨询顾问 · 12 年</span>
          </div>
          <div className="clt-chevs">
            {[0, 1, 2].map((i) => {
              // ③ chevron 依次扫过
              const p = tw(t, chevAt + i * CONFIG.chevStagger, CONFIG.chevDur, power2Out);
              return (
                <svg key={i} className="clt-chev" viewBox="0 0 15 26" style={{
                  opacity: p, transform: `translateX(${lerp(CONFIG.chevSlide, 0, p)}px)` }}>
                  <path d="M 4 4 L 11 13 L 4 22" />
                </svg>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
