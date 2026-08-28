import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// step-timeline-vertical · 竖向步骤线 —— 自包含 Remotion 源码（与 demos/step-timeline-vertical/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 118 };

const FPS = meta.fps;

// —— 动效本体参数（照抄 demo 的 CONFIG）：线往下推进，推到哪个节点就点亮哪个 → 当前节点升级空心环 ——
const CONFIG = {
  lead: 0.4,          // 起手静置 s
  lineDur: 0.6,       // 竖线画出总耗时 s（origin top 的 scaleY 0→1）
  // 线的缓动决定节点的间隔：inOut 越强，中段走得越快、三个节点就挤在一起。
  // power1.inOut @0.6s ⇒ 每 0.175s 一个，才读得出"线到哪、亮哪"。
  nodePop: 0.18,      // 节点弹出耗时 s
  textDur: 0.26,      // 右侧两行文字淡入耗时 s
  textLag: 0.067,     // 文字滞后节点 2 帧（@30fps）——点先亮、字后跟
  textShift: 8,       // 文字从左侧进入的位移 px
  ringDelay: 0.10,    // 三组全到位 → 当前节点升级 的呼吸 s
  ringDur: 0.22,      // 升级耗时 s：border 0→3px + scale 1→1.25
  ringWidth: 3,       // 空心环描边宽 px
  ringScale: 1.25,    // 空心环放大倍数
  accent: "#e0452c",  // 唯一强调色（参考图①红）
  hold: 2.0,          // 收尾停留 s
};

const WRAP_H = 264;   // .tl-wrap 高度 = 线的全长（本组几何基准）
const STEPS = [
  { at: 22, kicker: "第一步", title: "先把目标写成一句话" },
  { at: 132, kicker: "第二步", title: "砍掉两件不做的事" },
  { at: 242, kicker: "第三步", title: "今天就动第一步" },
];

/* 时间表（demo 秒，节点时刻由线的缓动反函数算出）
   0.40–1.00   竖线 scaleY 0→1（power1.inOut）
   0.522/0.700/0.878  线推到节点 i → 节点弹出 0.18s（back.out(1.6)）
   +0.067      右侧两行字跟上 opacity/x -8→0，0.26s（power3.out）
   1.305–1.525 当前节点（第一个）升级：border 0→3 + 底色→白 + scale 1→1.25（power3.out）
   1.525–3.525 收尾 hold 2.0s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};
// power1.inOut 的反函数：把"线推到某个 y"换算成时间——节点才真的是"线到哪、亮哪"
const invPower1InOut = (y: number) =>
  y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2);
// 颜色线性插值（GSAP 的 rgb 逐通道插值）
const lerpColor = (a: [number, number, number], b: [number, number, number], p: number) =>
  `rgb(${Math.round(lerp(a[0], b[0], p))}, ${Math.round(lerp(a[1], b[1], p))}, ${Math.round(lerp(a[2], b[2], p))})`;

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

// 演示语境（不属于动效）：右侧人物列；左侧竖向时间轴：一条线 + 三个节点 + 三组文字
const CSS = `
.host-col { position: absolute; right: 4px; bottom: 0; width: 448px; height: 100%; }
.tl-wrap { position: absolute; left: 132px; top: 118px; width: 420px; height: ${WRAP_H}px; }
/* 竖线：唯一"推进"的元素，origin top */
.tl-line {
  position: absolute; left: 0; top: 0;
  width: 2px; height: 100%;
  background: #d2d2d7;   /* hairline 档，线是骨架不是重点 */
  transform-origin: 50% 0%;
}
.tl-node {
  position: absolute; left: -6px;
  width: 14px; height: 14px;
  box-sizing: border-box;
  border-radius: 50%;
  border-style: solid;
  border-color: ${CONFIG.accent};   /* 当前节点升级成空心环时才长出来 */
}
.tl-text { position: absolute; left: 34px; width: 386px; }
.tl-kicker { font-size: 14px; letter-spacing: 2px; color: #8a8a8a; margin-bottom: 4px; }
.tl-title {
  font-size: 25px; font-weight: 600; line-height: 1.25;
  color: #1d1d1f; white-space: nowrap;
}
`;

export default function StepTimelineVertical({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ① 竖线从上往下画出
  const lineP = tw(t, CONFIG.lead, CONFIG.lineDur, power1InOut);

  // ② 线经过节点 → 该节点弹出 → 2 帧后右侧两行字跟上
  const nodeAts = STEPS.map((s) =>
    CONFIG.lead + CONFIG.lineDur * invPower1InOut(s.at / WRAP_H));
  const lastEnd = Math.max(
    CONFIG.lead + CONFIG.lineDur,
    ...nodeAts.map((at) => at + CONFIG.textLag + CONFIG.textDur));

  // ③ 全部到位后，当前节点（第一个）升级为强调色空心环
  const ringAt = lastEnd + CONFIG.ringDelay;
  const ringP = tw(t, ringAt, CONFIG.ringDur, power3Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-col"><Host src={hostSrc} /></div>

      <div className="tl-wrap">
        <div className="tl-line" style={{ transform: `scaleY(${lineP})` }} />
        {STEPS.map((s, i) => {
          const at = nodeAts[i];
          const popScale = tw(t, at, CONFIG.nodePop, backOut(1.6));
          // 节点 0 升级：pop 早已结束（scale 1）→ ring 阶段 1→1.25
          const scale = i === 0 && t >= ringAt ? lerp(1, CONFIG.ringScale, ringP) : popScale;
          const borderW = i === 0 ? CONFIG.ringWidth * ringP : 0;
          const bg = i === 0
            ? lerpColor([29, 29, 31], [255, 255, 255], ringP)
            : "#1d1d1f";
          const textP = tw(t, at + CONFIG.textLag, CONFIG.textDur, power3Out);
          return (
            <React.Fragment key={i}>
              <div className="tl-node" style={{
                top: s.at - 7,
                transform: `scale(${scale})`,
                borderWidth: borderW,
                backgroundColor: bg,
              }} />
              <div style={{
                opacity: textP,
                transform: `translateX(${lerp(-CONFIG.textShift, 0, textP)}px)`,
              }}>
                <div className="tl-text" style={{ top: s.at - 26 }}>
                  <div className="tl-kicker">{s.kicker}</div>
                  <div className="tl-title">{s.title}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
