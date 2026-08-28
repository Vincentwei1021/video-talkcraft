import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// callout-line-label · 标注引出线 —— 自包含 Remotion 源码（与 demos/callout-line-label/index.html 同画面）
// 复制本文件进你的工程即可用。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 148 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数 ——
const CONFIG = {
  dotR: 7,             // 圆点半径 px
  dotIn: 0.2,          // 圆点 pop 时长 s（back.out）
  lineDraw: 0.4,       // 折线描画时长 s
  labelIn: 0.25,       // 标签遮罩展开时长 s；文字再滞后 0.1s
  hold: 1.6,           // 全部标注就位后的停留 s
  out: 0.5,            // 反向收回总时长 s
  stagger: 0.8,        // 第二个标注的延迟 s（多标注必须错峰）
  color: "#d8383a",    // 点/涟漪/线同色的标注色（唯一语义色；白底上保对比，深底可换高亮黄）
  // 每个 callout：target = 圆点位置；elbow/end = 折线拐点与终点（45° 或水平）；标签贴 end
  callouts: [
    {
      target: { x: 422, y: 114 },                 // 摄像头模组
      points: [{ x: 380, y: 156 }, { x: 258, y: 156 }],
      label: { lines: ["1 英寸大底主摄", "同价位唯一"], x: 84, y: 128, from: "right" },
    },
    {
      target: { x: 588, y: 300 },                 // 侧键/边框
      points: [{ x: 648, y: 240 }, { x: 760, y: 240 }],
      label: { lines: ["钛合金中框", "整机减重 19g"], x: 772, y: 214, from: "left" },
    },
  ],
};

/* 时间表（demo 秒，i = 标注序号 0/1，t0 = 0.6 + i*0.8）
   t0        圆点 pop（0.2s back.out(2.2)）
   t0+0.05   涟漪扩散（0.5s power2.out，scale 0.4→3.2 / opacity 0.9→0）
   t0+0.2    折线描画（0.4s power2.out）
   t0+0.6    标签 clip 展开（0.25s power3.out）；文字 +0.1s 淡入（0.2s）
   outAt = 3.95；tOut = outAt + i*0.15
   tOut       标签反向收回（0.2s power2.in）
   tOut+0.12  折线回吸（0.2s power2.in）
   tOut+0.28  圆点熄灭（0.15s power2.in）→ 最晚 4.53s 结束 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// 折线总长（代替 getTotalLength）
const polyLen = (pts: { x: number; y: number }[]) => {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
};

// —— 演示语境（不属于动效）：被标注的产品图占位，白底 + 灰阶线框 ——
const CSS = `
.phone {
  position: absolute;
  left: 380px; top: 70px;
  width: 200px; height: 400px;
  border-radius: 30px;
  background: #ffffff;
  border: 2px solid #d8d8dc;
}
.phone .screen {
  position: absolute; inset: 10px;
  border-radius: 22px;
  background: #f5f5f7;
  border: 1px solid #ececef;
}
.phone .cam {
  position: absolute; left: 20px; top: 22px;
  width: 44px; height: 44px; border-radius: 12px;
  background: #ffffff; border: 1px solid #d8d8dc;
}
.phone .cam::after {
  content: ""; position: absolute; left: 10px; top: 10px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #ececef; border: 1px solid #c8c8cc;
}
.phone .btn-side {
  position: absolute; right: -6px; top: 120px;
  width: 4px; height: 56px; border-radius: 3px; background: #d8d8dc;
}
#calloutLayer { position: absolute; inset: 0; pointer-events: none; }
/* —— 动效本体 —— 文字标签：clip-path 从线端方向展开 */
.callout-label {
  position: absolute;
  padding: 10px 16px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  color: #1d1d1f;
  border-radius: 8px;
  font-size: 17px;
  line-height: 1.45;
  white-space: nowrap;
}
.callout-label b { display: block; font-size: 19px; }
.callout-label small { color: #8a8a8a; font-size: 14px; }
`;

export default function CalloutLineLabel() {
  const t = useCurrentFrame() / FPS;

  const outAt = 0.6 + CONFIG.stagger + CONFIG.dotIn + CONFIG.lineDraw + CONFIG.labelIn + 0.1 + CONFIG.hold;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="phone">
        <div className="screen" />
        <div className="cam" />
        <div className="btn-side" />
      </div>
      <svg id="calloutLayer" viewBox="0 0 960 540">
        {CONFIG.callouts.map((c, i) => {
          const t0 = 0.6 + i * CONFIG.stagger;
          const tOut = outAt + i * 0.15;

          // 1) 圆点 pop（back.out 会过冲，scale 保留过冲、opacity 封顶 1）+ 涟漪
          const dotP = t < tOut + CONFIG.out * 0.56
            ? tw(t, t0, CONFIG.dotIn, backOut(2.2))
            : 1 - tw(t, tOut + CONFIG.out * 0.56, CONFIG.out * 0.3, power2In);
          const rippleOn = t >= t0 + 0.05;   // immediateRender: false —— 起步前不画
          const rippleP = tw(t, t0 + 0.05, 0.5, power2Out);

          // 2) 折线生长 → 退场回吸（dashoffset 描画）
          const pts = [c.target, ...c.points];
          const len = polyLen(pts);
          const d = `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
          const tLine = t0 + CONFIG.dotIn;   // 圆点亮完线才走：三拍有先后
          const dash = t < tOut + CONFIG.out * 0.24
            ? len * (1 - tw(t, tLine, CONFIG.lineDraw, power2Out))
            : len * tw(t, tOut + CONFIG.out * 0.24, CONFIG.out * 0.4, power2In);

          return (
            <g key={i}>
              {rippleOn && (
                <circle cx={c.target.x} cy={c.target.y} r={CONFIG.dotR}
                  fill="none" stroke={CONFIG.color} strokeWidth={2}
                  opacity={lerp(0.9, 0, rippleP)}
                  transform={`translate(${c.target.x} ${c.target.y}) scale(${lerp(0.4, 3.2, rippleP)}) translate(${-c.target.x} ${-c.target.y})`} />
              )}
              <circle cx={c.target.x} cy={c.target.y} r={CONFIG.dotR}
                fill={CONFIG.color} opacity={clamp01(dotP)}
                transform={`translate(${c.target.x} ${c.target.y}) scale(${dotP}) translate(${-c.target.x} ${-c.target.y})`} />
              <path d={d} fill="none" stroke={CONFIG.color} strokeWidth={2.5}
                strokeDasharray={len} strokeDashoffset={dash} />
            </g>
          );
        })}
      </svg>
      <div>
        {CONFIG.callouts.map((c, i) => {
          const t0 = 0.6 + i * CONFIG.stagger;
          const tOut = outAt + i * 0.15;
          const tLabel = t0 + CONFIG.dotIn + CONFIG.lineDraw;

          // 3) 标签：clip-path 从线端方向展开，文字滞后 0.1s 淡入
          const shown = t < tOut
            ? tw(t, tLabel, CONFIG.labelIn, power3Out)
            : 1 - tw(t, tOut, CONFIG.out * 0.4, power2In);
          // from: "right" = 从右缘向左展开（左 inset 收缩）；"left" 反之
          const clip = c.label.from === "right"
            ? `inset(0 0 0 ${(1 - shown) * 100}%)`
            : `inset(0 ${(1 - shown) * 100}% 0 0)`;
          const txtOp = tw(t, tLabel + 0.1, 0.2, power1Out);

          return (
            <div key={i} className="callout-label"
              style={{ left: c.label.x, top: c.label.y, clipPath: clip }}>
              <b style={{ opacity: txtOp }}>{c.label.lines[0]}</b>
              <small style={{ opacity: txtOp }}>{c.label.lines[1]}</small>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
