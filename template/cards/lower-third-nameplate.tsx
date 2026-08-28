import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// lower-third-nameplate · 人名条展示牌 —— 自包含 Remotion 源码（与 demos/lower-third-nameplate/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 107 };

const FPS = meta.fps;

// —— 可摘走的核心动画：色条展开 → 姓名揭示 → 头衔跟进 → 反向收回 ——
const CONFIG = {
  barDur: 0.3,       // 色条 scaleX 展开时长 s
  nameDur: 0.25,     // 姓名 clip-path 揭示时长 s
  titleLag: 0.15,    // 头衔相对姓名的延迟 s：同时出 = 层次塌
  hold: 2.0,         // 停留 s（实拍建议 3~5s，demo 压短）
  outDur: 0.3,       // 出场时长 s：反向收回，不是淡出
};

/* 时间表（demo 秒）
   0.40–0.70  色条 scaleX 0→1（power4.out）
   0.61–0.86  姓名 clip 从左揭示（power2.out，色条走完 70% 时起步）
   0.76–1.01  头衔同法（延迟 0.15）
   2.70–2.91  头衔反向收回（power2.in）
   2.78–2.99  姓名反向收回（power2.in）
   2.86–3.16  色条 scaleX→0（power4.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);
const power2In = (x: number) => x * x * x;
const power4In = (x: number) => x * x * x * x * x;

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

// —— 口播语境：真人出镜访谈画面，左下打人名条 ——
const CSS = `
.lt {
  position: absolute;
  left: 56px; bottom: 64px;
}
.lt .name {
  font-size: 42px;
  font-weight: 800;
  color: #1d1d1f;
  line-height: 1.15;
  letter-spacing: 2px;
}
/* 色条 = 动效本体（scaleX 展开的那根）。中性墨色；复用时这里换品牌色 */
.lt .bar {
  height: 7px;
  width: 100%;
  background: #1d1d1f;
  border-radius: 2px;
  margin: 10px 0 10px;
  transform-origin: left center;
}
.lt .title {
  font-size: 19px;
  color: #8a8a8a;
  letter-spacing: 1.5px;
}
`;

export default function LowerThirdNameplate({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  const t0 = 0.4;
  const nameAt = t0 + CONFIG.barDur * 0.7;               // 色条走完 70% 时姓名起步
  const titleAt = nameAt + CONFIG.titleLag;
  const outAt = t0 + CONFIG.barDur + CONFIG.hold;        // = 2.7

  // 色条：scaleX 展开（power4.out）→ 最后反向收回（power4.in）
  const barScale = t < outAt + 0.16
    ? tw(t, t0, CONFIG.barDur, power4Out)
    : 1 - tw(t, outAt + 0.16, CONFIG.outDur, power4In);

  // 姓名/头衔：clip-path 从左揭示（shown = 可见比例 0~1）
  const nameShown = t < outAt + 0.08
    ? tw(t, nameAt, CONFIG.nameDur, power2Out)
    : 1 - tw(t, outAt + 0.08, CONFIG.outDur * 0.7, power2In);
  const titleShown = t < outAt
    ? tw(t, titleAt, CONFIG.nameDur, power2Out)
    : 1 - tw(t, outAt, CONFIG.outDur * 0.7, power2In);

  const clip = (shown: number) => `inset(0% ${(1 - shown) * 100}% 0% 0%)`;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <Host src={hostSrc} />
      <div className="lt">
        <div className="name" style={{ clipPath: clip(nameShown) }}>王砚秋</div>
        <div className="bar" style={{ transform: `scaleX(${barScale})` }} />
        <div className="title" style={{ clipPath: clip(titleShown) }}>半导体行业分析师 · 从业 14 年</div>
      </div>
    </AbsoluteFill>
  );
}
