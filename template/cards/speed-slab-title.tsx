import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// speed-slab-title · 速度块标题 —— 自包含 Remotion 源码（与 demos/speed-slab-title/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 98 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
//   ① 主标题整块硬现（scale 1.04→1 + opacity，0.18s power3.out）
//   ② 紫块从画外 x:-580 冲入到位（0.28s power4.out）
//   ③ 到位那一帧三道速度线在块左缘一次性张开（scaleX 0→1，origin right，
//      错峰 2 帧，长度 42/30/22px），随后 0.2s 内淡出
//   ④ 副题白字随块一起进，但 x 反向补偿 40px ⇒ 块内被裁掉一截，读作"字比块慢半拍"
//   命门：速度线是**冲入的残影**，必须在 0.2s 内消失；留在屏上就成装饰。
const CONFIG = {
  lead: 0.40,        // 起手静置：等口播念到主标题
  l1Dur: 0.18,      // 主标题硬现时长 s
  l1Scale: 1.04,    // 主标题起始倍数
  gap: 0.08,        // 主标题落定 → 紫块起冲的间隔 s
  // 紫块起点 x（**必须完全在画外**）px：块右缘在 x≈562，-3° 斜切 ⇒ |起点| > 563
  slabFrom: -580,
  slabDur: 0.28,    // 紫块冲入时长 s（power4.out：起手极猛、尾段极长）
  lagPx: 40,        // 副题字的反向补偿 px：块内被裁一截 ⇒ "追赶感"
  lagDur: 0.34,     // 字追上块的时长 s（比块的 0.28s 长 ⇒ 慢半拍）
  lineLens: [42, 30, 22],  // 三道速度线长度 px（长度不等是"拖尾"的形状来源）
  lineTops: [0.24, 0.50, 0.76], // 三道线在块高度上的落位比例
  lineStagger: 0.067,      // 线之间错峰 s（2 帧 @30fps）
  lineOpen: 0.09,          // 单道线张开时长 s
  lineFade: 0.20,          // 线淡出时长 s —— 本卡命门，不许放大
  hold: 1.50,              // 收尾定格
};

// 块高度（demo 用 offsetHeight 实测）：76px 字 × line-height 1.06 + 上下 padding 10+12 ≈ 103
const SLAB_H = 103;

/* 时间表（demo 秒）
   0.40–0.58   ① 主标题硬现（power3.out）
   0.66–0.94   ② 紫块冲入（power4.out）；0.66–1.00 ④ 白字追赶（power3.out）
   0.94–1.03   ③ 线1 张开 → 1.03–1.23 淡出（后两道各 +0.067）
   1.364–2.864 收尾定格 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2In = (x: number) => x * x * x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);

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

// —— 演示语境（不属于动效）：主持人占右侧一列口播，标题落在左侧白区 ——
const CSS = `
.host-wrap { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.ss-title {
  position: absolute;
  left: 84px; top: 50%;
  transform: translateY(-50%);
}
.ss-l1 {
  font-size: 76px;
  font-weight: 700;
  line-height: 1.06;
  color: #1d1d1f;
  white-space: nowrap;
  transform-origin: 0% 50%;
}
.ss-row {
  position: relative;
  margin-top: 36px;
  margin-left: -20px;
  transform: rotate(-3deg);
  transform-origin: 0% 50%;
  display: inline-block;
}
.ss-slab {
  position: relative;
  display: inline-block;
  overflow: hidden;
  padding: 10px 20px 12px;
  background: #7A5AF8;          /* 本卡唯一强调色（参考图紫系） */
  border-radius: 4px;
}
.ss-slab-t {
  display: inline-block;
  font-size: 76px;
  font-weight: 700;
  line-height: 1.06;
  color: #ffffff;
  white-space: nowrap;
}
.ss-lines {
  position: absolute;
  right: 100%; top: 0; bottom: 0;
  width: 60px;
  pointer-events: none;
}
.ss-line {
  position: absolute;
  right: 6px;
  height: 7px;
  border-radius: 4px;
  background: #7A5AF8;
  transform-origin: 100% 50%;
}
`;

export default function SpeedSlabTitle({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ① 主标题硬现
  const l1P = tw(t, CONFIG.lead, CONFIG.l1Dur, power3Out);
  const l1Scale = lerp(CONFIG.l1Scale, 1, l1P);

  // ② 紫块冲入 + ④ 字慢半拍追赶（两条轨同起、字后停）
  const slabAt = CONFIG.lead + CONFIG.l1Dur + CONFIG.gap;
  const slabX = lerp(CONFIG.slabFrom, 0, tw(t, slabAt, CONFIG.slabDur, power4Out));
  const slabTX = lerp(-CONFIG.lagPx, 0, tw(t, slabAt, CONFIG.lagDur, power3Out));

  // ③ 块到位那一帧速度线张开 → 立刻淡出（残影只存在于冲入那一拍）
  const lineAt = slabAt + CONFIG.slabDur;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <div className="ss-title">
        <div className="ss-l1" style={{ opacity: l1P, transform: `scale(${l1Scale})` }}>
          效率不是更快
        </div>
        <div className="ss-row">
          <div className="ss-lines">
            {CONFIG.lineLens.map((len, i) => {
              const at = lineAt + i * CONFIG.lineStagger;
              const open = tw(t, at, CONFIG.lineOpen, power3Out);
              const fade = 1 - tw(t, at + CONFIG.lineOpen, CONFIG.lineFade, power2In);
              return (
                <div key={i} className="ss-line" style={{
                  width: len,
                  top: Math.round(CONFIG.lineTops[i] * SLAB_H - 3.5),
                  transform: `scaleX(${open})`,
                  opacity: fade,
                }} />
              );
            })}
          </div>
          <span className="ss-slab" style={{ transform: `translateX(${slabX}px)` }}>
            <span className="ss-slab-t" style={{ transform: `translateX(${slabTX}px)` }}>
              而是不做错事
            </span>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}
