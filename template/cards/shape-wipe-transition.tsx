import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// shape-wipe-transition · 色块扫屏转场 —— 自包含 Remotion 源码（与 demos/shape-wipe-transition/index.html 同画面）
// 三层同色系色块斜切错峰扫屏，换内容藏在第二层完全盖住全屏的那一帧里。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 74 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（复制 CONFIG + 动画核心即可复用）——
const CONFIG = {
  // 三层必须同色系浅→中→深（后扫的深色层压在最上）。这里用中性墨色三档；
  // 复用时整组换成品牌色的浅/中/深即可——这就是本卡唯一的颜色接口
  colors: ["#d8d8dc", "#8a8a8e", "#1d1d1f"],
  wipeDur: 0.45,    // 单层扫屏耗时 s：>0.7 读作拉幕布，<0.3 只剩闪烁
  layerDelay: 0.07, // 层间错峰 60~80ms：>120ms 露缝穿帮
  skew: -12,        // 斜切角度：0 读作 PPT 推入
  stretch: 1.22,    // 过屏中段横向拉伸倍数（速度感）：>1.4 读作果冻
  holdA: 0.9,       // 场景 A 先停留多久再扫
};

/* 时间表（demo 秒，wipe = 0.9）
   0.90+0.07i–…  第 i 层扫屏（i=0..2）：前半 xPercent −75→0 + scaleX 1→1.22（power4.in），
                 后半 xPercent 0→75 + scaleX 1.22→1（power4.out），各 0.225s
   1.195         换内容：第二层运动中点 = 它完全盖住全屏的那一帧（场景 A→B 直切）
   1.49+0.06j    场景 B 柱状图逐根长出（0.4s，power3.out，stagger 0.06） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power4In = (x: number) => x * x * x * x * x;
const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);

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

// —— 演示语境（不属于动效）：场景 A 主持人讲概念 / 场景 B CSS 画的假数据图表 ——
const CSS = `
.scene { position: absolute; inset: 0; }

.chapter-tag {
  position: absolute;
  top: 26px; left: 30px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #8a8a8a;
  padding: 6px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.scene-b { background: #ffffff; }
.chart-card {
  position: absolute;
  left: 50%; top: 46%;
  transform: translate(-50%, -50%);
  width: 560px;
  padding: 26px 34px 22px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
}
.chart-title { font-size: 21px; font-weight: 700; color: #1d1d1f; }
.chart-src { margin-top: 14px; font-size: 12px; color: #8a8a8a; }
.bars {
  margin-top: 18px;
  display: flex;
  align-items: flex-end;
  gap: 42px;
  height: 190px;
  padding: 0 14px;
  border-bottom: 1px solid #e0e0e0;
}
.bar { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 74px; }
.bar i {
  display: block;
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: #c8c8cc;
  transform-origin: 50% 100%;
}
.bar b { font-size: 17px; color: #8a8a8a; }
.bar.hot i { background: #1d1d1f; }
.bar.hot b { color: #1d1d1f; }
.bar-x {
  display: flex; gap: 42px; padding: 8px 14px 0;
  width: 560px; margin: 0 auto;
}
.bar-x span { width: 74px; text-align: center; font-size: 14px; color: #8a8a8a; }
.x-row { position: absolute; left: 50%; top: 46%; transform: translate(-50%, calc(-50% + 148px)); }

/* —— 扫屏色块：宽 2.6 倍屏宽——power4 高速段里 70ms 错峰会拉开约 2 屏宽的空间间距，
      块不够宽中段必露缝；动画只改 transform —— */
.wipe-layer {
  position: absolute;
  top: -8%; height: 116%;
  left: -80%; width: 260%;
  will-change: transform;
}
`;

// 场景 B 的柱子（演示数据）：[高度 px, 标注, 是否重点]
const BARS: Array<[number, string, boolean]> = [
  [56, "+12%", false], [84, "+18%", false], [128, "+34%", false], [182, "+61%", true],
];

export default function ShapeWipeTransition({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const wipe = C.holdA;                                       // 0.90
  // 换内容藏在遮挡帧里：第二层运动中点 = 它完全盖住全屏的那一帧
  const swapAt = wipe + C.layerDelay + C.wipeDur / 2;         // 1.195
  const sceneBOn = t >= swapAt;

  // 单层扫屏：拆成 power4.in + power4.out 两段 = 整体 power4.inOut，
  // 中点（完全盖住全屏的那一帧）同步到拉伸峰值
  const layerAt = (i: number) => {
    const t0 = wipe + i * C.layerDelay;
    const half = C.wipeDur / 2;
    if (t < t0 + half) {
      const p = tw(t, t0, half, power4In);
      return { xp: lerp(-75, 0, p), sx: lerp(1, C.stretch, p) };
    }
    const p = tw(t, t0 + half, half, power4Out);
    return { xp: lerp(0, 75, p), sx: lerp(C.stretch, 1, p) };
  };

  // 场景 B：色块扫净后，柱状图逐根长出
  const barsAt = wipe + 2 * C.layerDelay + C.wipeDur;         // 1.49

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>

      {/* 场景 A：主持人讲概念 */}
      <div className="scene scene-a" style={{
        opacity: sceneBOn ? 0 : 1, visibility: sceneBOn ? "hidden" : "visible",
      }}>
        <Host src={hostSrc} />
        <div className="chapter-tag">01 · 讲概念</div>
      </div>

      {/* 场景 B：数据图表占位（CSS 画的假图表） */}
      <div className="scene scene-b" style={{
        opacity: sceneBOn ? 1 : 0, visibility: sceneBOn ? "visible" : "hidden",
      }}>
        <div className="chapter-tag">02 · 看数据</div>
        <div className="chart-card">
          <div className="chart-title">季度营收同比增速</div>
          <div className="bars">
            {BARS.map(([h, label, hot], j) => (
              <div key={j} className={hot ? "bar hot" : "bar"}>
                <b>{label}</b>
                <i style={{
                  height: h,
                  transform: `scaleY(${tw(t, barsAt + j * 0.06, 0.4, power3Out)})`,
                }} />
              </div>
            ))}
          </div>
          <div className="bar-x"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div>
          <div className="chart-src">数据来源：公司 2024 年报</div>
        </div>
      </div>

      {/* 扫屏色块（动效本体）：单一中性强调色的浅→中→深三档，后扫的层叠在上面 */}
      {C.colors.map((color, i) => {
        const { xp, sx } = layerAt(i);
        return (
          <div key={i} className="wipe-layer" style={{
            background: color,
            transform: `translate3d(${xp}%, 0px, 0px) skewX(${C.skew}deg) scaleX(${sx})`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
}
