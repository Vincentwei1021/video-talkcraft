import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// number-slab-pop · 数字弹出 —— 自包含 Remotion 源码（与 demos/number-slab-pop/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 101 };

const FPS = meta.fps;

// ===== 可摘走的核心动画参数 =====
// 语义：这是「结论感」的数字——一次弹出就到位，不给过程。
//       块先落、数字后弹（同时进读作一张 PNG 整块飞进来）；小数是精度补充，延后单独淡入。
const CONFIG = {
  lead: 0.30,        // 起手静置 s：等口播念到
  slabDrop: 20,      // 色块起始上移 px（从上方落下）
  slabScale: 0.94,   // 色块起始缩放
  slabDur: 0.24,     // 色块落定 s
  numScale: 0.72,    // 数字起始缩放
  numDur: 0.28,      // 数字弹出 s
  decLag: 0.20,      // 小数 + 单位相对数字弹出起点的延后 s（≈6 帧 @30fps）
  decIn: 0.18,       // 小数淡入 s
  capRise: 6,        // 说明行上浮 px
  capIn: 0.24,       // 说明行淡入 s
  hold: 1.80,        // 收尾定格 s
};

/* 时间表（demo 秒）
   0.30–0.54  色块落定 opacity/y -20→0/scale 0.94→1（power3.out）
   0.54–0.82  数字整体弹出 opacity/scale 0.72→1（back.out(1.7)）
   0.74–0.92  小数 + 单位淡入（power2.out）
   0.92–1.16  说明行淡入上浮（power2.out）
   1.16–2.96  收尾 hold 1.8s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

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

// —— 演示语境（不属于动效）：主持人占位在右，左侧色块 + 说明行；白底零装饰 ——
const CSS = `
.host-wrap { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.slab-block { position: absolute; left: 108px; top: 50%; transform: translateY(-50%); }
/* —— 动效本体 a：实色块（先落） —— */
.slab {
  display: inline-block;
  padding: 26px 40px 30px;
  border-radius: 28px;
  background: #0066cc;                 /* 唯一语义强调色（蓝），只上在色块上 */
  transform-origin: 50% 50%;
}
/* —— 动效本体 b：巨大数字（块落定后一次弹出） —— */
.num-row {
  display: flex; align-items: baseline;
  white-space: nowrap;                 /* 整数/小数/单位必须同行 */
  font-variant-numeric: tabular-nums;  /* 命门：数字不跳宽 */
  color: #ffffff; font-weight: 600; line-height: 1; letter-spacing: -0.02em;
  transform-origin: 50% 60%;           /* 重心略偏下：弹出时不往上飘 */
}
.num-row .int { font-size: 96px; }
/* 小数与单位从一开始就占位（只动 opacity 不动 display）——
   否则它们淡入那一帧整行宽度会变，整数被推着挪一下 */
.num-row .dec { font-size: 96px; }
.num-row .pct { font-size: 52px; margin-left: 6px; }
/* —— 动效本体 c：说明行（最后淡入上浮） —— */
.slab-cap {
  margin-top: 22px; margin-left: 6px;
  font-size: 20px; font-weight: 400; color: #8a8a8a; letter-spacing: 2px;
}
`;

export default function NumberSlabPop({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ① 色块先落到位（数字此刻还不在场）
  const slabP = tw(t, CONFIG.lead, CONFIG.slabDur, power3Out);
  // ② 块落定后数字整体弹出
  const numAt = CONFIG.lead + CONFIG.slabDur;
  const numP = tw(t, numAt, CONFIG.numDur, backOut(1.7));
  // ②b 小数 + 单位延后单独淡入（整数先立住，精度是补充）
  const decP = tw(t, numAt + CONFIG.decLag, CONFIG.decIn, power2Out);
  // ③ 说明行最后淡入上浮
  const capAt = numAt + CONFIG.decLag + CONFIG.decIn;
  const capP = tw(t, capAt, CONFIG.capIn, power2Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="slab-block">
        <div className="slab" style={{
          opacity: slabP,
          transform: `translateY(${lerp(-CONFIG.slabDrop, 0, slabP)}px) scale(${lerp(CONFIG.slabScale, 1, slabP)})`,
        }}>
          <div className="num-row" style={{
            opacity: Math.min(1, numP),
            transform: `scale(${lerp(CONFIG.numScale, 1, numP)})`,
          }}>
            <span className="int">23</span>
            <span className="dec" style={{ opacity: decP }}>.6</span>
            <span className="pct" style={{ opacity: decP }}>%</span>
          </div>
        </div>
        <div className="slab-cap" style={{
          opacity: capP,
          transform: `translateY(${lerp(CONFIG.capRise, 0, capP)}px)`,
        }}>较去年增长</div>
      </div>
      <div className="host-wrap"><Host src={hostSrc} /></div>
    </AbsoluteFill>
  );
}
