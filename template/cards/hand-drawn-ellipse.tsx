import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// hand-drawn-ellipse · 手绘圈重点 —— 自包含 Remotion 源码（与 demos/hand-drawn-ellipse/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 102 };

const FPS = meta.fps;

// ─────────────────────────────────────────────────────────────────────────
// 可摘走的核心动画：手绘圈重点（一笔画 1.08 圈的歪椭圆 + 圈完才 punch）
//   ① 不是完美椭圆：长短轴比 3.4:1、整体倾斜 -3.5°、半径带确定性正弦起伏，
//      逆时针一笔画到 1.08 圈：尾巴过头 8% 与起笔交叉
//   ② 单条 path、恒定线宽（3.2px，linecap round）：手作感只做在形状上，不模拟笔压
//   ③ 圈到位之后被圈短语才 punch scale 1.06→1（同时发生读作"字被圈撞了一下"）
//   ④ 画完干净静置：不做 line boil / 定格抖动（design-language.md §4）
//   ★ demo 里 path 是运行时量 DOM 算出来的；tsx 是纯函数渲染，故把 demo 运行时
//     算出的 path 原样照抄进 ELLIPSE（960×540 设计坐标，含 getTotalLength 实测长度）
// ─────────────────────────────────────────────────────────────────────────
const CONFIG = {
  startDelay: 0.42,     // 起手静置：等口播念到这个短语
  color: "#e8720c",     // 唯一语义色（橙）
  draw: 0.50,           // 画圈耗时 s：<0.3 看不出笔顺、>0.8 观众在等
  width: 3.2,           // 恒定线宽 px（3~3.5）：全程一个值，不做笔压粗细变化
  punchGap: 0.06,       // 圈画完到 punch 之间的呼吸（必须 >0）
  punchScale: 1.06,     // punch 幅度：>1.12 读作弹跳不是重音
  punchDur: 0.22,
  hold: 1.8,            // 收尾定格：圈住的短语就是落点
};

/* 时间表（demo 秒）
   0.42–0.92  画圈：dashoffset L→0（power2.out，起笔快收笔缓）
   0.98–1.20  punch：短语 scale 1.06→1（power3.out，origin 50% 55%）
   1.20–3.00  hold 定格 */

// demo 运行时 ellipsePath(inkBoxOf(word), CONFIG) 的输出（原样照抄）
const ELLIPSE = {
  len: 471.44,
  d: "M 87.36 276.83 C 86.25 277.69 82.76 280.26 80.69 281.96 C 78.63 283.66 76.87 285.31 74.99 287.03 C 73.1 288.75 70.44 290.53 69.41 292.28 C 68.38 294.03 68.07 295.87 68.79 297.55 C 69.51 299.22 71.78 300.78 73.72 302.33 C 75.67 303.88 77.77 305.41 80.48 306.84 C 83.2 308.27 85.99 309.8 90.01 310.9 C 94.04 312 99.4 312.8 104.63 313.44 C 109.86 314.09 115.87 314.33 121.39 314.77 C 126.92 315.2 132.14 315.71 137.77 316.04 C 143.41 316.37 149.21 316.76 155.19 316.74 C 161.17 316.72 167.51 316.31 173.65 315.9 C 179.79 315.49 185.82 314.88 192.02 314.3 C 198.21 313.72 204.75 313.27 210.82 312.43 C 216.9 311.59 223.26 310.56 228.47 309.26 C 233.68 307.97 237.96 306.25 242.07 304.66 C 246.18 303.08 249.63 301.4 253.14 299.74 C 256.64 298.08 260.5 296.45 263.1 294.72 C 265.69 292.99 267.6 291.15 268.7 289.38 C 269.79 287.61 269.38 285.86 269.65 284.11 C 269.92 282.37 270.31 280.66 270.33 278.9 C 270.36 277.14 270.98 275.24 269.81 273.56 C 268.64 271.88 266.27 270.25 263.32 268.84 C 260.37 267.43 256.08 266.27 252.12 265.08 C 248.16 263.89 244.21 262.67 239.58 261.69 C 234.96 260.7 229.97 259.7 224.36 259.18 C 218.75 258.65 212.11 258.59 205.92 258.54 C 199.73 258.5 193.39 258.79 187.19 258.89 C 180.99 259 174.96 258.93 168.72 259.16 C 162.48 259.4 155.92 259.67 149.73 260.3 C 143.54 260.92 137.5 261.96 131.58 262.93 C 125.65 263.9 119.96 264.99 114.18 266.13 C 108.4 267.26 102.05 268.35 96.9 269.75 C 91.74 271.15 86.83 272.82 83.23 274.54 C 79.64 276.26 77.59 278.23 75.32 280.07 C 73.04 281.91 71.26 283.73 69.59 285.56 C 67.92 287.39 66.03 290.14 65.32 291.06",
};

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const n = (v: number) => Math.round(v * 100) / 100;

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

// —— 演示语境（不属于动效）：主持人占右一列，左侧是口播正在念的一句话 ——
const CSS = `
.host-wrap { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.say {
  position: absolute;
  left: 100px; right: 410px;
  top: 50%;
  transform: translateY(-50%);
  color: #1d1d1f;
}
/* 行距要给圈留地方：圈的上下沿会外扩 padY，行距太密圈会咬到上一行 */
.say-line { font-size: 28px; line-height: 2.4; font-weight: 400; white-space: nowrap; }
.say-line.lead { color: #8a8a8a; }
/* 被圈的短语单独成一个 inline-block —— punch 要作用在它自己身上，不能带动整行 */
.say-line .ring-word {
  display: inline-block;
  font-weight: 600;
  will-change: transform;
}
/* 圈层（动效本体）盖在文字之上 */
#inkLayer { position: absolute; inset: 0; pointer-events: none; }
#inkLayer path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
`;

export default function HandDrawnEllipse({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ④ 一笔：单条 path、恒定线宽，dasharray 描画（起笔快收笔缓）
  const v = tw(t, CONFIG.startDelay, CONFIG.draw, power2Out);
  const L = ELLIPSE.len;

  // 命门②：圈到位之后（+punchGap）短语才 punch 一拍（scale 1.06→1，power3.out）
  const punchAt = CONFIG.startDelay + CONFIG.draw + CONFIG.punchGap;
  const scale = t < punchAt
    ? 1
    : lerp(CONFIG.punchScale, 1, tw(t, punchAt, CONFIG.punchDur, power3Out));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="say">
        <div className="say-line lead">要求可以再高一点，但对自己</div>
        <div className="say-line">
          <span className="ring-word" style={{
            transform: `scale(${scale})`, transformOrigin: "50% 55%",
          }}>更松弛一点</span>
        </div>
      </div>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <svg id="inkLayer" viewBox="0 0 960 540">
        <path d={ELLIPSE.d} stroke={CONFIG.color} strokeWidth={CONFIG.width}
              strokeDasharray={`${n(L)} ${n(L + 4)}`}
              strokeDashoffset={n(Math.max(0, L * (1 - v)))} />
      </svg>
    </AbsoluteFill>
  );
}
