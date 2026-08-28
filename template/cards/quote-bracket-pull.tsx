import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// quote-bracket-pull · 引号夹句 —— 自包含 Remotion 源码（与 demos/quote-bracket-pull/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 119 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数：两枚引号同帧向内"夹" → 三行错峰淡入 → 荧光笔扫关键短语 ——
const CONFIG = {
  lead: 0.35,        // 起手静置 s：等口播念到金句第一个字
  markDur: 0.32,     // 引号推入耗时 s
  markOpacity: 0.9,  // 引号落定不透明度：<0.8 读作水印，1.0 抢过正文（引号是符号不是标题）
  markDx: 30,        // 引号横向推入距离 px（左 -30 / 右 +30，反向对称）
  markDy: 14,        // 引号纵向推入距离 px（左 -14 / 右 +14）
  lineDur: 0.30,     // 单行淡入耗时 s
  lineStagger: 0.09, // 行错峰 s：比 quote-card 的 0.15 更密——本卡是"一句话"不是"逐句砸"
  lineRise: 6,       // 行上浮位移 px：只有一点重量，不抢引号的"夹"
  markerGap: 0.10,   // 末行到位 → 荧光笔起扫 的呼吸 s
  markerDur: 0.26,   // 荧光笔扫过耗时 s
  hold: 2.2,         // 收尾停留 s：金句要停
};

/* 时间表（demo 秒）
   0.35–0.67  两枚引号同帧向内推入（power3.out）
   0.51+0.09i 行 i 淡入上浮 0.30s（power2.out，引号走过一半就起字）
   1.09–1.35  荧光笔扫过关键短语（power2.inOut）
   1.35–3.55  hold 定格 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

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

// —— 演示语境（不属于动效）：角标主持人——本卡不盖底板，人物全程留在画面里 ——
const CSS = `
.host-badge {
  position: absolute;
  left: 26px; bottom: 22px;
  width: 96px; height: 96px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
/* —— 动效本体 —— 金句块 + 两枚大引号（符号，不是装饰） */
.qb-block {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  width: fit-content;   /* 贴合最长一行——引号才"夹"在句子边上，不是钉在版心角上 */
}
.qb-line {
  font-size: 32px;
  font-weight: 600;
  line-height: 1.5;
  color: #1d1d1f;
  white-space: nowrap;
}
/* 大引号：尺寸必须压过正文两倍以上才立得住（32px 正文 ⇒ 108px 引号） */
.qb-mark {
  position: absolute;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 108px;
  font-weight: 700;
  line-height: 1;
  color: #1d1d1f;
  user-select: none;
}
.qb-mark.open  { left: -42px;  top: -74px; }
.qb-mark.close { right: -30px; bottom: -104px; }
/* 关键短语的荧光笔下划线（marker 语义色，属于动效本体） */
.qb-mark-wrap { position: relative; display: inline-block; }
.qb-marker {
  position: absolute;
  left: -5px; right: -7px;
  bottom: 6px;
  height: 15px;
  background: #FFE949;
  opacity: 0.6;
  mix-blend-mode: multiply;            /* 命门：色块在字下层，不许盖字 */
  border-radius: 9px 4px 8px 3px / 5px 9px 4px 8px;   /* 不规则圆角 = 笔触，不是选区 */
  transform-origin: left center;
}
`;

export default function QuoteBracketPull({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ① 两枚引号从画外向内推入——同帧同曲线（"夹住"是一个动作）
  const markP = tw(t, CONFIG.lead, CONFIG.markDur, power3Out);
  const markOpacity = lerp(0, CONFIG.markOpacity, markP);
  const openX = lerp(-CONFIG.markDx, 0, markP), openY = lerp(-CONFIG.markDy, 0, markP);
  const closeX = lerp(CONFIG.markDx, 0, markP), closeY = lerp(CONFIG.markDy, 0, markP);

  // ② 三行金句错峰淡入上浮（引号走过一半就起字，不空等）
  const linesAt = CONFIG.lead + CONFIG.markDur * 0.5;
  const lineStyle = (i: number): React.CSSProperties => {
    const p = tw(t, linesAt + i * CONFIG.lineStagger, CONFIG.lineDur, power2Out);
    return { opacity: p, transform: `translateY(${lerp(CONFIG.lineRise, 0, p)}px)` };
  };

  // ③ 末行到位后荧光笔扫过关键短语
  const markerAt = linesAt + CONFIG.lineStagger * 2 + CONFIG.lineDur + CONFIG.markerGap;
  const markerX = tw(t, markerAt, CONFIG.markerDur, power2InOut);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="qb-block">
        <span className="qb-mark open" style={{
          opacity: markOpacity, transform: `translate(${openX}px, ${openY}px)`,
        }}>&ldquo;</span>
        <div className="qb-line" style={lineStyle(0)}>真正拉开差距的</div>
        <div className="qb-line" style={lineStyle(1)}>从来不是谁更聪明</div>
        <div className="qb-line" style={lineStyle(2)}>
          而是谁愿意
          <span className="qb-mark-wrap">
            <span className="qb-marker" style={{ transform: `scaleX(${markerX})` }} />
            主动去解决问题
          </span>
        </div>
        <span className="qb-mark close" style={{
          opacity: markOpacity, transform: `translate(${closeX}px, ${closeY}px)`,
        }}>&rdquo;</span>
      </div>

      <div className="host-badge"><Host src={hostSrc} /></div>
    </AbsoluteFill>
  );
}
