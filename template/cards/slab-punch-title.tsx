import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// slab-punch-title · 重点放大 —— 自包含 Remotion 源码（与 demos/slab-punch-title/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 91 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
//   ① 第一行整块硬现：scale 1.04→1 + opacity，0.18s power3.out，无位移
//   ② 第二行的色块从**中心** scaleX 0→1 撑开 0.22s power3.out
//   ③ 块撑到位那一帧白字才 opacity 0→1 + scale 1.12→1 落定（punch 5 帧）
//   命门：块必须先到位、字后落。反了就读作"字被块追上"。
//         -2.5° 斜切是静态 CSS 属性，不参与任何时间线。
const CONFIG = {
  lead: 0.40,        // 起手静置：等口播念到"找到"
  l1Dur: 0.18,      // 第一行硬现时长 s
  l1Scale: 1.04,    // 第一行起始倍数（>1.08 就读作弹窗，不再是"硬现"）
  slabDur: 0.22,    // 色块中心撑开时长 s
  gap: 0.07,        // 第一行落定 → 色块起撑的间隔 s（两行之间的呼吸）
  punchDur: 0.167,  // 白字 punch 时长 s（5 帧 @30fps）
  punchScale: 1.12, // 白字 punch 起始倍数
  hold: 1.60,       // 收尾定格：块 + 字的成品就是落点
};

/* 时间表（demo 秒）
   0.40–0.58  ① 第一行硬现（power3.out）
   0.65–0.87  ② 色块中心撑开（power3.out）
   0.87       ③ 白字 opacity 硬切 1（0 帧，不淡入）
   0.87–1.04  ③续 白字 punch 1.12→1（power3.out）
   1.04–2.64  收尾定格 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
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

// —— 演示语境（不属于动效）：主持人占右侧一列口播，标题两行落在左侧白区 ——
const CSS = `
.host-wrap { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.sp-title {
  position: absolute;
  left: 72px; top: 50%;
  transform: translateY(-50%);
}
.sp-l1 {
  font-size: 84px;
  font-weight: 700;
  line-height: 1.06;
  color: #1d1d1f;
  white-space: nowrap;
  transform-origin: 0% 50%;
}
.sp-l2 {
  margin-top: 14px;
  margin-left: -22px;
  transform: rotate(-2.5deg);
  transform-origin: 0% 50%;
}
.sp-slab {
  position: relative;
  display: inline-block;
  padding: 10px 22px 12px;      /* 块比字大一圈：上下 ~11px、左右 22px */
}
.sp-slab-bg {                    /* 唯一被 scaleX 的元素，从中心撑开 */
  position: absolute;
  inset: 0;
  background: #e0452c;           /* 本卡唯一强调色（参考图红系） */
  border-radius: 4px;
  transform-origin: 50% 50%;
}
.sp-l2-t {
  position: relative;            /* 压在 bg 之上 */
  display: inline-block;
  font-size: 84px;
  font-weight: 700;
  line-height: 1.06;
  color: #ffffff;
  white-space: nowrap;
  transform-origin: 50% 50%;
}
`;

export default function SlabPunchTitle({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ① 第一行硬现
  const l1P = tw(t, CONFIG.lead, CONFIG.l1Dur, power3Out);
  const l1Scale = lerp(CONFIG.l1Scale, 1, l1P);

  // ② 色块从中心撑开
  const slabAt = CONFIG.lead + CONFIG.l1Dur + CONFIG.gap;
  const bgScaleX = tw(t, slabAt, CONFIG.slabDur, power3Out);

  // ③ 块到位那一帧白字落定（punch）——opacity 是硬切（0 帧），不做淡入
  const punchAt = slabAt + CONFIG.slabDur;
  const l2Opacity = t < punchAt ? 0 : 1;
  const l2Scale = lerp(CONFIG.punchScale, 1, tw(t, punchAt, CONFIG.punchDur, power3Out));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <div className="sp-title">
        <div className="sp-l1" style={{ opacity: l1P, transform: `scale(${l1Scale})` }}>找到</div>
        <div className="sp-l2">
          <span className="sp-slab">
            <span className="sp-slab-bg" style={{ transform: `scaleX(${bgScaleX})` }} />
            <span className="sp-l2-t" style={{ opacity: l2Opacity, transform: `scale(${l2Scale})` }}>
              关键点
            </span>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}
