import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// corner-bracket-frame · 对角角框 —— 自包含 Remotion 源码（与 demos/corner-bracket-frame/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 94 };

const FPS = meta.fps;

// ─────────────────────────────────────────────────────────────────────
// 可摘走的核心动画：对角角框（两个 L 同帧对角进入 → 标题两行错峰进框）
//   ① 两个 L 角框各自沿"外侧对角方向"平移进入：左上从左上方来、右下从右下方来。
//      **必须同帧同曲线** —— 对角对称是这个构图的骨架，错峰就散架。
//   ② 标题两行错峰淡入上浮（框先立住，字后进框）。
//   ③ hold：画完静置，不做 line boil / 定格抖动（design-language §4）。
//   ※ 标题下的手绘弧线（"下划线"）已按用户 2026-08-25 定版删除。
// ─────────────────────────────────────────────────────────────────────
const CONFIG = {
  lead: 0.4,          // 起手静置 s：等口播念到
  brIn: 0.3,          // 角框进入时长 s
  brTravel: 20,       // 角框沿对角方向的进入位移 px（沿 45° 各分量都是这个值）
  lineDur: 0.3,       // 标题单行淡入时长 s
  lineRise: 6,        // 标题上浮 px
  lineStagger: 0.1,   // 两行错峰 s
  linesAt: 0.22,      // 标题起步相对角框起步的延迟 s（框先立住）
  hold: 1.7,          // 收尾停留 s：让观众读完两行
};

/* 时间表（demo 秒）
   0.40–0.70  两个 L 同帧对角进入（power3.out）
   0.62–0.92  标题第一行淡入上浮（power2.out）
   0.72–1.02  标题第二行同法
   1.02–2.72  收尾静置 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
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

// —— 口播语境：主持人在右，左侧标题被两个对角 L 角框框住 ——
//    中性化：白底、墨字；唯一语义色 = 青 #0aa3a3，只上在角框（动效本体）上
const CSS = `
.cb-host {                      /* 演示语境：主持人列（不属于本卡动效） */
  position: absolute;
  right: 0; top: 0; bottom: 0;
  /* 448px 给 427.7px 宽的数字人留 ≥10px 呼吸边（人物不缩小、不截断、整体往中间挪） */
  width: 448px;
}
/* 取景骨架：一个不可见的方框，只在左上 / 右下两个角画 L —— 对角对称是本构图的骨架 */
.cb-frame {
  position: absolute;
  left: 66px; top: 152px;
  width: 450px; height: 200px;
}
.cb-br {                        /* L 角框：两臂等长（命门），靠 border 画 */
  position: absolute;
  width: 54px; height: 54px;    /* = 臂长；两臂必须相等 */
}
.cb-br.tl {
  left: 0; top: 0;
  border-left: 4px solid #0aa3a3;
  border-top: 4px solid #0aa3a3;
}
.cb-br.br {
  right: 0; bottom: 0;
  border-right: 4px solid #0aa3a3;
  border-bottom: 4px solid #0aa3a3;
}
.cb-line {
  position: absolute; left: 34px;
  font-size: 52px; font-weight: 700; line-height: 1;
  color: #1d1d1f;
  letter-spacing: 1px;
  white-space: nowrap;
}
.cb-line.l1 { top: 30px; }
.cb-line.l2 { top: 104px; }
`;

export default function CornerBracketFrame({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  const t0 = CONFIG.lead;
  // ① 两个 L 同帧进入（同曲线同时长——对角对称）
  const brP = tw(t, t0, CONFIG.brIn, power3Out);
  const d = lerp(CONFIG.brTravel, 0, brP);
  // ② 标题两行错峰淡入上浮
  const lineAt = t0 + CONFIG.linesAt;
  const l1P = tw(t, lineAt, CONFIG.lineDur, power2Out);
  const l2P = tw(t, lineAt + CONFIG.lineStagger, CONFIG.lineDur, power2Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="cb-host"><Host src={hostSrc} /></div>
      <div className="cb-frame">
        <div className="cb-br tl" style={{ opacity: brP, transform: `translate(${-d}px, ${-d}px)` }} />
        <div className="cb-br br" style={{ opacity: brP, transform: `translate(${d}px, ${d}px)` }} />
        <div className="cb-line l1" style={{ opacity: l1P, transform: `translateY(${lerp(CONFIG.lineRise, 0, l1P)}px)` }}>一条思路</div>
        <div className="cb-line l2" style={{ opacity: l2P, transform: `translateY(${lerp(CONFIG.lineRise, 0, l2P)}px)` }}>讲清楚一件事</div>
      </div>
    </AbsoluteFill>
  );
}
