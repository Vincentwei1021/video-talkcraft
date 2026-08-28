import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// particle-weld-transition · 粒子溶接转场 —— 自包含 Remotion 源码（与 demos/particle-weld-transition/index.html 同画面）
// 一式 = 出场主体碎成粒子向上漂散 + 入场侧同 seed 的一批粒子同方向（仍向上）
//        在新镜主体位置收拢成形。物质连续性 = 观众读到"同一批粒子跨过了边界"。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 98 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数：粒子溶接转场 —— A（慢推）→ 粒子溶接 → B（慢推）——
const CONFIG = {
  hold: 0.80,      // 出场镜停留：相机永不静止（慢推）
  holdEnd: 0.90,   // 入场镜收尾停留
  weld: {
    out: 0.60,       // 出场碎解时长
    cutLead: 0.12,   // 切点提前量：粒子已经飞起来了才换场
    overlap: 0.50,   // 交叠（像素淡化）时长 ≈ 15 帧 @30fps
    gather: 0.70,    // 入场粒子收拢时长
    count: 18,       // 每组粒子数
    rise: 200,       // 上升位移 px（换尺寸按屏高比例缩放）
    sway: 46,        // 横向漂移幅度 px
    seed: 7,         // 两组粒子必须同 seed —— 换了就不是"同一批粒子"
  },
};

/* 时间表（demo 秒，切点 cut = 0.8 + 0.60 − 0.12 = 1.28）
   0.00–0.30  tag 淡入
   0.00–0.80  A hold：慢推 1 → 1.02（sine.inOut）
   0.80–1.28  A 大字碎解：opacity→0 / y→−14 / scale→1.03 / blur→3（power2.in）
   0.80+d–…   出场粒子错峰淡入 0.12s、上飘 0.95s（power2.out）、0.8+d+0.33 起 0.30s 淡出
   1.28–1.78  A 淡出 / B 淡入 + B scale 1.02→1.0（power1.inOut）
   1.22+r·0.2 入场粒子（同 seed）从下方就位，0.70s 收拢到主体位置（power2.out）
   1.68–2.10  B 大字成形：opacity 0→1 / scale 0.94→1 / y 16→0（power2.out）
   1.98–2.88  B hold：慢推 1.0 → 1.04（sine.inOut） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease
const power2In = (x: number) => x * x * x;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// 确定性伪随机：出场组和入场组用同一个 seed 生成，才能读作"同一批粒子"
// （与 demo 完全同一公式 ⇒ 同 seed 同值、逐帧稳定，不用 Math.random）
const rnd = (s: number) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// 粒子：主体（式名大字）包围盒 → 出场组散开、入场组聚拢（舞台坐标 960×540）
const HOME = { x: 480, y: 268, w: 340, h: 74 };

type Particle = { size: number; left: number; top: number; delay: number; r: (k: number) => number };
const PARTICLES: Particle[] = Array.from({ length: CONFIG.weld.count }, (_, i) => {
  const r = (k: number) => rnd(CONFIG.weld.seed * 1000 + i * 7 + k);
  return {
    r,
    size: 5 + r(4) * 7,
    left: HOME.x - HOME.w / 2 + r(1) * HOME.w,
    top: HOME.y - HOME.h / 2 + r(2) * HOME.h,
    delay: r(3) * 0.26,
  };
});

// —— 演示语境（不属于动效）：两个镜头 = 白/浅灰 tile ——
const CSS = `
/* 镜头层做成超出画幅 14%（inset 对称 ⇒ 画面中心不变），交叠期两镜同时缩放时不漏白边。 */
.shot {
  position: absolute; inset: -14%; display: flex;
  align-items: center; justify-content: center;
  will-change: transform, filter, opacity;
}
/* 镜头里只有式名大字——认式子用的标签，同时是"被碎解 / 被溶接"的主体 */
.shot .big { font-size: 76px; font-weight: 800; color: #8a8a8a;
  letter-spacing: 3px; white-space: nowrap; }
.s1 { background: #ffffff; }
.s2 { background: #f1f1f4; }

/* 粒子层：层级在镜头之上 ⇒ 粒子跨过切点，边界被"物质"盖住 */
#weld { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
#weld i { position: absolute; display: block; border-radius: 2px;
  background: #1d1d1f; will-change: transform, opacity; }

.tag { position: absolute; left: 24px; top: 20px; font-size: 17px; color: #8a8a8a;
  border: 1px solid #e0e0e0; border-radius: 999px; padding: 4px 14px; z-index: 7; }
`;

export default function ParticleWeldTransition({ hostSrc }: { hostSrc?: string }) {
  void hostSrc;   // 本卡无主持人占位
  const t = useCurrentFrame() / FPS;
  const W = CONFIG.weld;
  const at = CONFIG.hold;                               // 0.80
  const cut = at + W.out - W.cutLead;                   // 1.28
  const gatherEnd = cut + W.gather;                     // 1.98

  // ── A（出场镜）：慢推 → tile 交叠淡出；大字碎解（壳）──
  const aScale = lerp(1, 1.02, tw(t, 0, CONFIG.hold, sineInOut));
  const aOpacity = 1 - tw(t, cut, W.overlap, power1InOut);
  const outBigP = tw(t, at, W.out * 0.8, power2In);
  const outBig = {
    opacity: 1 - outBigP,
    transform: `translate(0px, ${lerp(0, -14, outBigP)}px) scale(${lerp(1, 1.03, outBigP)})`,
    filter: `blur(${lerp(0, 3, outBigP)}px)`,
  };

  // ── B（入场镜）：交叠淡入 + scale 1.02→1.0，大字在粒子聚拢末段成形 ──
  const bOpacity = tw(t, cut, W.overlap, power1InOut);
  const bScale = t < gatherEnd
    ? lerp(1.02, 1.0, tw(t, cut, W.overlap, power1InOut))
    : lerp(1.0, 1.04, tw(t, gatherEnd, CONFIG.holdEnd, sineInOut));
  const inBigP = tw(t, cut + W.gather - 0.30, 0.42, power2Out);
  const inBig = {
    opacity: inBigP,
    transform: `translate(0px, ${lerp(16, 0, inBigP)}px) scale(${lerp(0.94, 1, inBigP)})`,
  };

  const tagOpacity = tw(t, 0, 0.3, power1Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="shot s1" style={{ opacity: aOpacity, transform: `scale(${aScale})` }}>
        <div className="big" style={outBig}>粒子溶接</div>
      </div>
      <div className="shot s2" style={{ opacity: bOpacity, transform: `scale(${bScale})` }}>
        <div className="big" style={inBig}>同批粒子成形</div>
      </div>
      <div id="weld">
        {/* 出场组：错峰淡入、向上漂散、飞行中段淡出 */}
        {PARTICLES.map((p, i) => {
          const t0 = at + p.delay;
          const peak = 0.4 + p.r(5) * 0.45;
          const fadeIn = tw(t, t0, 0.12, power1Out);
          const fadeOut = tw(t, t0 + W.out * 0.55, 0.30, power1Out);
          const fly = tw(t, t0, W.out + 0.35, power2Out);
          const y = -W.rise * (0.55 + p.r(6) * 0.6) * fly;
          const x = (p.r(7) - 0.5) * 2 * W.sway * fly;
          return (
            <i key={`out-${i}`} style={{
              width: p.size, height: p.size, left: p.left, top: p.top,
              opacity: peak * fadeIn * (1 - fadeOut),
              transform: `translate(${x}px, ${y}px)`,
            }} />
          );
        })}
        {/* 入场组：同 seed 的同一批粒子从下方继续上升（同方向），收拢回主体位置 */}
        {PARTICLES.map((p, i) => {
          const d2 = cut - 0.06 + p.r(8) * 0.20;        // 落在 lead 里：切点前后就位
          const peak = 0.4 + p.r(5) * 0.45;
          const fadeIn = tw(t, d2, 0.12, power1Out);
          const fadeOut = tw(t, d2 + W.gather - 0.20, 0.24, power1Out);
          const gather = tw(t, d2, W.gather, power2Out);
          const y = W.rise * (0.5 + p.r(6) * 0.5) * (1 - gather);
          const x = (p.r(7) - 0.5) * 2 * W.sway * (1 - gather);
          return (
            <i key={`in-${i}`} style={{
              width: p.size, height: p.size, left: p.left, top: p.top,
              opacity: t < d2 ? 0 : peak * fadeIn * (1 - fadeOut),
              transform: `translate(${x}px, ${y}px)`,
            }} />
          );
        })}
      </div>
      <div className="tag" style={{ opacity: tagOpacity }}>
        主体碎成粒子上飘 → 同 seed 的同一批粒子在新镜位置收拢成形
      </div>
    </AbsoluteFill>
  );
}
