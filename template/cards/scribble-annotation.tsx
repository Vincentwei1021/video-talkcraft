import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// scribble-annotation · 手绘圈注箭头 —— 自包含 Remotion 源码（与 demos/scribble-annotation/index.html 同画面）
// 复制本文件进你的工程即可用。本卡无主持人（被圈注的假商品页截图占满版面）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 104 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数 ——
// 画完的线保持干净静置：不做 line boil / 定格抖动（design-language.md §4）。
// 手绘感全部来自 path 形状本身（歪斜的圈/带弧度的线）与起笔快收笔缓的描画节奏。
// demo 里 path 是运行时量 DOM 算出来的；tsx 是纯函数渲染，故把 demo 运行时算出的
// path 数据原样照抄进 STROKES（960×540 设计坐标，含 getTotalLength 实测长度）。
const CONFIG = {
  strokeW: 6,          // 线宽 px：<4 没有笔感
  startDelay: 0.5,     // 截图先静置半拍
  gapBetween: 0.55,    // 三个标注之间的间隔 s（对应口播逐条点名）
};

/* 时间表（demo 秒）
   0.50–1.05  圈价格（power2.inOut）
   1.60–2.00  划小字下划线（power2.out）
   2.55–2.90  箭头杆（power2.inOut）
   2.90–3.05  箭头须（power2.out）——收尾静置 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

// demo 运行时 circlePath / underlinePath / arrowPaths 的输出（原样照抄）
const STROKES: { d: string; len: number; color: string; t0: number; dur: number;
                 ease: (x: number) => number }[] = [
  { // 圈：绕价格墨迹画 1.6 圈的手绘椭圆，起笔快收笔缓
    color: "#ff4d4d", t0: 0.50, dur: 0.55, ease: power2InOut, len: 534.56,
    d: "M 153.3 180.3 C 154.5 179.1 157.1 175.3 160.1 173 C 163.1 170.8 167.1 168.7 171.2 166.8 C 175.4 165 180.3 163.5 185.1 162.1 C 190 160.6 195 158.7 200.3 158 C 205.6 157.2 211.6 157.4 216.9 157.6 C 222.3 157.8 227.3 158.7 232.3 159.3 C 237.3 159.9 242.7 160.3 247.1 161.4 C 251.5 162.6 255.1 164.4 258.8 166.1 C 262.5 167.7 266 169.5 269.3 171.4 C 272.6 173.3 276.8 175.2 278.7 177.6 C 280.6 179.9 280.5 182.8 280.6 185.5 C 280.7 188.2 280.1 190.9 279.1 193.5 C 278 196.2 276.8 199 274.2 201.4 C 271.6 203.8 267 205.9 263.4 208 C 259.9 210.1 256.6 212.3 252.8 214.3 C 248.9 216.3 244.8 218.5 240.1 220 C 235.3 221.4 229.7 222.2 224.3 223.1 C 218.9 224 213.3 225.1 207.8 225.4 C 202.3 225.7 196.3 225.7 191.2 225 C 186.1 224.2 181.8 222.4 177.3 221.1 C 172.8 219.8 168.1 218.8 164.2 217.2 C 160.3 215.6 156.7 213.7 153.9 211.7 C 151 209.6 149.5 207.2 147.4 204.8 C 145.2 202.5 142 200.2 140.9 197.6 C 139.8 195.1 139.9 192.1 140.9 189.4 C 142 186.7 144.9 184 147.2 181.5 C 149.5 178.9 151.5 176.1 154.9 173.9 C 158.4 171.6 163.2 169.7 167.6 168 C 172.1 166.2 177 165 181.8 163.4 C 186.6 161.9 191.1 159.8 196.3 158.7 C 201.4 157.6 207.3 157.1 212.9 156.8 C 218.5 156.5 224.1 156.6 229.6 156.8 C 235.2 157.1 241.3 157.2 246.1 158.4 C 250.8 159.5 254.6 161.7 258.3 163.6 C 261.9 165.4 264.9 167.5 268 169.5 C 271 171.6 274.7 173.5 276.6 175.9 C 278.6 178.2 278.9 180.9 279.7 183.6 C 280.6 186.2 281.6 188.8 281.6 191.6 C 281.5 194.3 281.6 197.4 279.7 200 C 277.7 202.7 273.4 205.1 269.9 207.5 C 266.3 209.8 262.6 212.1 258.4 214.1 C 254.1 216.1 246.7 218.5 244.3 219.4" },
  { // 下划线：一笔略带弧度的粗线，压在小字 baseline 下方
    color: "#ffd23e", t0: 1.60, dur: 0.40, ease: power2Out, len: 318.25,
    d: "M 164.6 302.9 C 169.9 302.9 185.8 302.9 196.4 303.2 C 207 303.5 217.6 304.7 228.2 304.8 C 238.8 304.9 249.4 303.9 260 303.8 C 270.6 303.7 281.2 304 291.8 304.3 C 302.4 304.6 313 305.5 323.6 305.5 C 334.2 305.6 344.8 304.5 355.4 304.5 C 366 304.4 376.6 305 387.2 305.1 C 397.8 305.2 408.4 305.5 419 305 C 429.6 304.6 440.2 303.2 450.8 302.6 C 461.4 301.9 477.3 301.5 482.6 301.2" },
  { // 箭头杆：下凸的三次曲线，尖端咬住按钮左缘
    color: "#ff4d4d", t0: 2.55, dur: 0.35, ease: power2InOut, len: 203.19,
    d: "M 435 452 C 497.7 478 564.4 432.3 631 418" },
  { // 箭头须：两根须按杆末端切线算，永远朝目标
    color: "#ff4d4d", t0: 2.90, dur: 0.15, ease: power2Out, len: 61.0,
    d: "M 599.9 410.3 L 631 418 L 609.5 437.4" },
];

// —— 演示语境（不属于动效）：一张被现场圈注的假商品页截图。白底 + 灰阶线框，零风格化 ——
const CSS = `
.shot {
  position: absolute;
  left: 130px; top: 55px;
  width: 700px; height: 430px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 26px 30px;
  color: #1d1d1f;
}
.shot .bar { height: 14px; background: #ececec; border-radius: 7px; margin-bottom: 14px; }
.shot h3 { font-size: 24px; font-weight: 700; margin: 0 0 18px; }
.shot .price { font-size: 42px; font-weight: 800; margin: 10px 0 22px; }
.shot .price small { font-size: 20px; font-weight: 600; color: #8a8a8a; text-decoration: line-through; margin-left: 26px; }
.shot .spec { font-size: 17px; line-height: 1.8; color: #8a8a8a; margin: 0; }
.shot .fine { font-size: 15px; color: #a6a6a6; margin: 10px 0 0; }
.shot .btn {
  position: absolute; right: 44px; bottom: 40px;
  padding: 12px 34px; border-radius: 26px;
  border: 1px solid #e0e0e0; color: #8a8a8a; font-size: 19px; font-weight: 700;
}
/* 标注层（动效本体）盖在截图之上 */
#inkLayer { position: absolute; inset: 0; pointer-events: none; }
#inkLayer path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
`;

export default function ScribbleAnnotation(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="shot">
        <div className="bar" style={{ width: "46%" }} />
        <h3>「限时特惠」某品牌无线耳机</h3>
        <div className="price"><span>¥299</span><small>¥899</small></div>
        <p className="spec">降噪深度 48dB · 续航 36 小时 · 蓝牙 5.4</p>
        <p className="fine">* <span>数据来自实验室理想环境，实际效果因人而异</span></p>
        <div className="btn">立即抢购</div>
      </div>
      <svg id="inkLayer" viewBox="0 0 960 540">
        {/* 描画一笔：dashoffset 从全长到 0；画完保持静置 */}
        {STROKES.map((s, i) => (
          <path key={i} d={s.d} stroke={s.color} strokeWidth={CONFIG.strokeW}
                strokeDasharray={s.len}
                strokeDashoffset={s.len * (1 - tw(t, s.t0, s.dur, s.ease))} />
        ))}
      </svg>
    </AbsoluteFill>
  );
}
