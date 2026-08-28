import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// behind-text-title · 人后大字视差 —— 自包含 Remotion 源码（与 demos/behind-text-title/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
// demo 录制 32.25s 是录制上限截断（idle 微动无限）；tsx 取有限动画结束点 + 2s idle 展示。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 95 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
const CONFIG = {
  titleIn: 0.6,         // 标题升起耗时 s（power3.out）
  riseFrom: 70,         // 升起起始下沉 px（从人身后升出来；随字号等比加大）
  trackFrom: 0.14,      // 字距从松到紧收拢（em）
  trackTo: 0.02,
  driftPx: 4,           // hold 期间标题与人物的反向漂移 ±px
  driftPeriod: 8,       // 漂移周期 s：快了穿帮，慢了才像"镜头在呼吸"
  subDelay: 0.35,       // 小字晚于标题出现
};

/* 时间表（demo 秒）
   0.40–1.00  标题升起 + 字距收拢（power3.out）
   0.75–1.15  小字淡入上移（power2.out）
   1.00–∞     标题 x 0→+4 / 人物 x 0→-4 反向漂移（sine.inOut yoyo repeat:-1，半周期 4s）
   有限动画结束 1.15s → +2s idle 展示 = 3.15s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

/** yoyo repeat:-1 的往返进度：t0 起点，half 半周期 */
const yoyoP = (t: number, t0: number, half: number) => {
  if (t <= t0) return 0;
  const cyc = (t - t0) / half;
  const k = Math.floor(cyc);
  const p = cyc - k;
  return k % 2 === 1 ? 1 - p : p;
};

// —— 三层：背景 → 大字标题 → 前景人物（字从人身后穿出）——
// 3D 艺术字：本体扛"挤出侧面 + 落地投影"（浅灰字 + 递进 text-shadow），
// ::after（同文案，data-text）盖在上面扛"渐变字面"。
const CSS = `
.bt-title {
  position: absolute; z-index: 1;
  left: 0; right: 0; top: 7%;
  text-align: center;
  font-size: 235px;                 /* 屏高 40%+：下缘要被人物吃掉 25%+ 才读得出"在身后" */
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  color: #b9b9bf;
  text-shadow:
    1px 1px 0 #b2b2b8, 2px 2px 0 #ababb1, 3px 3px 0 #a4a4aa,
    4px 4px 0 #9d9da3, 5px 5px 0 #96969c, 6px 6px 0 #8f8f95,
    7px 7px 0 #88888e, 8px 8px 0 #818187, 9px 9px 0 #7a7a80,
    10px 10px 0 #737379, 11px 11px 0 #6c6c72, 12px 12px 0 #65656b,
    20px 26px 38px rgba(0, 0, 0, 0.32);
}
.bt-title::after {
  content: attr(data-text);
  position: absolute;
  left: 0; right: 0; top: 0;
  background: linear-gradient(180deg, #4a4a50 0%, #1d1d1f 58%, #0c0c0d 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
}
.bt-sub {
  position: absolute; z-index: 1;
  left: 0; right: 0; top: 5.5%;
  text-align: center;
  font-size: 16px;
  letter-spacing: 10px;
  color: #8a8a8a;
}
.bt-host {                          /* 前景人物（实拍中来自抠像）——hostSrc 注入，不传退灰阶剪影 */
  position: absolute; z-index: 2;
  left: 50%; bottom: 0;
  width: 470px; height: 430px;   /* 头顶要吃进标题下缘 ≥25%，矮了就是普通标题 */
}
`;

export default function BehindTextTitle({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // 标题从人物身后升起 + 字距收拢（下缘被人物剪影遮挡）
  const inP = tw(t, 0.4, CONFIG.titleIn, power3Out);
  const titleY = lerp(CONFIG.riseFrom, 0, inP);
  const track = lerp(CONFIG.trackFrom, CONFIG.trackTo, inP);
  // 小字晚于标题出现
  const subP = tw(t, 0.4 + CONFIG.subDelay, 0.4, power2Out);
  // hold：标题与人物反向极缓漂移——伪 3D 层次的命门（同向=层次感消失）
  const driftT0 = 0.4 + CONFIG.titleIn;
  const drift = CONFIG.driftPx * sineInOut(yoyoP(t, driftT0, CONFIG.driftPeriod / 2));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="bt-sub" style={{ opacity: subP, transform: `translateY(${lerp(10, 0, subP)}px)` }}>
        A DECADE STORY · EP.01
      </div>
      <div className="bt-title" data-text="十年之约" style={{
        opacity: inP,
        letterSpacing: `${track}em`,
        transform: `translate(${drift}px, ${titleY}px)`,
      }}>十年之约</div>
      {/* 前景人物：反向漂移；不传 hostSrc 时用 demo 的灰阶剪影渐变兜底 */}
      <div className="bt-host" style={{
        transform: `translateX(-50%) translateX(${-drift}px)`,
        background: hostSrc ? "none" :
          "radial-gradient(ellipse 24% 22% at 50% 12%, #e3e3e6 99%, transparent 100%)," +
          "radial-gradient(ellipse 50% 62% at 50% 88%, #ececef 99%, transparent 100%)",
      }}>
        {hostSrc ? (
          <Loop durationInFrames={13 * FPS}>
            <OffthreadVideo src={hostSrc} muted transparent style={{
              position: "absolute", bottom: 0, left: "50%",
              transform: "translateX(-50%)", height: "100%" }} />
          </Loop>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}
