import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// outline-box-title · 描边框标题 —— 自包含 Remotion 源码（与 demos/outline-box-title/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 103 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
//   ① 描边框沿路径画出：dashoffset 一圈，**power2.inOut**（近匀速）——
//      "机器画的框选"：不过头、精确闭合、匀速。
//   ② 框闭合后实心 chip 从 origin left scaleX 0→1 展开，chip 内白字滞后淡入。
//   ③ 三枚 chevron 依次点亮（opacity 0.25→1 + x+4→0，错峰 0.08s）。
//   ④ hold：画完静置（不做 line boil / 定格抖动）。
const CONFIG = {
  lead: 0.4,          // 起手静置 s
  boxDur: 0.42,       // 描边框画一圈的时长 s（power2.inOut = 机器感）
  chipDur: 0.2,       // chip scaleX 展开时长 s
  chipGap: 0.04,      // chip 相对框闭合的延迟 s（几乎接上，别留空拍）
  chipTxtLag: 0.1,    // chip 内白字相对 chip 的滞后 s
  chevDur: 0.16,      // 单枚 chevron 点亮时长 s
  chevStagger: 0.08,  // chevron 之间的错峰 s
  chevDim: 0.25,      // chevron 起始 opacity（不是 0——它们本来"在那儿"，只是暗）
  chevSlide: 4,       // chevron 点亮时的 x 位移 px
  hold: 1.6,          // 收尾停留 s
};

// 描边框路径总长（demo 用 getTotalLength 实测；4 直边 308+72+328+72+闭合 20 + 4 圆角弧 ≈ 880.5）
const BOX_LEN = 880.5;

/* 时间表（demo 秒）
   0.40–0.82  ① 描边框画一圈（power2.inOut）
   0.86–1.06  ② chip scaleX 展开（power3.out）
   0.96–1.12  ②续 chip 白字淡入（power1.out）
   1.12–1.44  ③ 三枚 chevron 依次点亮（错峰 0.08，power2.out）
   1.44–3.04  ④ 收尾静置 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
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

// —— 口播语境：主持人在右，左侧"核心观点 / 在这里"；唯一语义色 = 紫 #7A5AF8 ——
const CSS = `
.ob-root { --acc: #7A5AF8; }
.ob-host { position: absolute; right: 0; top: 0; bottom: 0; width: 448px; }
.ob-group { position: absolute; left: 96px; top: 168px; }
.ob-row1 { position: relative; width: 356px; height: 104px; }
.ob-row1 .txt {
  position: absolute; left: 30px; top: 22px;
  font-size: 56px; font-weight: 700; line-height: 1;
  color: #1d1d1f; letter-spacing: 2px; white-space: nowrap;
}
#obBox { position: absolute; left: 0; top: 0; width: 356px; height: 104px; overflow: visible; }
#obBox path {
  fill: none; stroke: var(--acc); stroke-width: 4;
  stroke-linecap: round; stroke-linejoin: round;
}
.ob-row2 { position: relative; margin-top: 22px; height: 66px; width: 260px; }
.ob-chip {
  position: absolute; inset: 0;
  background: var(--acc);
  border-radius: 12px;
  transform-origin: left center;
}
.ob-chip-txt {
  position: absolute; left: 26px; top: 13px;
  font-size: 40px; font-weight: 700; line-height: 1;
  color: #ffffff; letter-spacing: 2px; white-space: nowrap;
}
.ob-chevs { position: absolute; left: 96px; top: 386px; display: flex; gap: 10px; }
.ob-chev { width: 26px; height: 34px; }
.ob-chev path {
  fill: none; stroke: var(--acc); stroke-width: 5;
  stroke-linecap: round; stroke-linejoin: round;
}
`;

export default function OutlineBoxTitle({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  const t0 = CONFIG.lead;
  // ① 框选：一笔画一圈，近匀速
  const boxP = tw(t, t0, CONFIG.boxDur, power2InOut);
  const dashOffset = BOX_LEN * (1 - boxP);

  // ② chip 展开 + 白字滞后
  const chipAt = t0 + CONFIG.boxDur + CONFIG.chipGap;
  const chipScaleX = tw(t, chipAt, CONFIG.chipDur, power3Out);
  const chipTxtOpacity = tw(t, chipAt + CONFIG.chipTxtLag, 0.16, power1Out);

  // ③ chevron 依次点亮
  const chevAt = chipAt + CONFIG.chipDur + 0.06;

  return (
    <AbsoluteFill className="ob-root" style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="ob-host"><Host src={hostSrc} /></div>

      <div className="ob-group">
        <div className="ob-row1">
          <div className="txt">核心观点</div>
          {/* 描边框：从左上顺时针一圈的圆角矩形路径（起点在上边中偏左，一笔精确闭合） */}
          <svg id="obBox" viewBox="0 0 356 104">
            <path
              d="M 34 2 H 342 A 14 14 0 0 1 354 16 V 88 A 14 14 0 0 1 342 102
                 H 14 A 14 14 0 0 1 2 88 V 16 A 14 14 0 0 1 14 2 Z"
              strokeDasharray={BOX_LEN}
              strokeDashoffset={dashOffset}
            />
          </svg>
        </div>

        <div className="ob-row2">
          <div className="ob-chip" style={{ transform: `scaleX(${chipScaleX})` }} />
          <div className="ob-chip-txt" style={{ opacity: chipTxtOpacity }}>在这里</div>
        </div>
      </div>

      <div className="ob-chevs">
        {[0, 1, 2].map((i) => {
          const p = tw(t, chevAt + i * CONFIG.chevStagger, CONFIG.chevDur, power2Out);
          return (
            <svg key={i} className="ob-chev" viewBox="0 0 26 34" style={{
              opacity: lerp(CONFIG.chevDim, 1, p),
              transform: `translateX(${lerp(CONFIG.chevSlide, 0, p)}px)`,
            }}>
              <path d="M 7 5 L 19 17 L 7 29" />
            </svg>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
