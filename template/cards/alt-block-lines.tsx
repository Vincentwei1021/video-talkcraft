import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// alt-block-lines · 双色块对句 —— 自包含 Remotion 源码（与 demos/alt-block-lines/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 91 };

const FPS = meta.fps;

// ─────────────────────────────────────────────────────────────────────────
// 可摘走的核心动画：双色块对句（块刷出字）
//   两行错峰 0.12s，每行两条轨：
//     ① 色块 scaleX 0→1（origin left，0.26s power3.out）
//     ② 文字 clip-path: inset(0 100% 0 0) → inset(0 0% 0 0)
//        同曲线同时长，起点滞后 2 帧（0.067s）⇒ 字始终落在块的右缘之后
//   命门：文字必须被块"刷"出来（clip 跟随）。块和字各自淡入 = 两个动效不是一个。
// ─────────────────────────────────────────────────────────────────────────
const CONFIG = {
  lead: 0.40,        // 起手静置：等口播念到第一句
  dur: 0.26,        // 单行展开时长 s（块与字共用）
  rowStagger: 0.12, // 两行错峰 s（>0.25s 读作两个独立动效）
  textLag: 0.067,   // 字相对块的滞后 s（2 帧 @30fps）—— 本卡命门
  hold: 1.80,       // 收尾定格：对句要停久，观众得读完两行才成"对句"
};

const ROWS = [
  { cls: "a", text: "先做减法" },
  { cls: "b", text: "再做加法" },
];

/* 时间表（demo 秒）
   0.40–0.66  行 1 色块 scaleX 0→1（power3.out）；0.467–0.727 字被刷出
   0.52–0.78  行 2 色块 scaleX 0→1；0.587–0.847 字被刷出
   0.847–2.647 收尾 hold 1.8s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
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

// 演示语境（不属于动效）：主持人占右侧一列口播，对句两行落在左侧白区
const CSS = `
.host-wrap { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
/* —— 动效本体 —— */
.ab-stack {
  position: absolute;
  left: 82px; top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-start;        /* 块左对齐、宽度各自贴合文字（参考图的构图骨架） */
  gap: 16px;
}
/* 每行 = 一个块（inline-block，宽度由文字撑出）+ 块内的字。
   块用 scaleX（origin left）展开，字用 clip-path inset 从右侧收 100%→0 被"刷"出来。 */
.ab-row { position: relative; display: inline-block; padding: 11px 24px 13px; }
.ab-bg {
  position: absolute; inset: 0;
  border-radius: 4px;
  transform-origin: 0% 50%;      /* 从左展开 */
  will-change: transform;
}
.ab-t {
  position: relative;            /* 压在 bg 之上 */
  display: inline-block;
  font-size: 66px;
  font-weight: 700;
  line-height: 1.08;
  white-space: nowrap;
  will-change: clip-path;
}
/* 同结构反色：块1 实色 + 白字；块2 白底 + 黑字 + 1px 灰描边。 */
.ab-row.a .ab-bg { background: #0aa3a3; }             /* 本卡唯一强调色（参考图青系） */
.ab-row.a .ab-t  { color: #ffffff; }
.ab-row.b .ab-bg { background: #ffffff; box-shadow: inset 0 0 0 1px #d8d8d8; }
.ab-row.b .ab-t  { color: #1d1d1f; }
`;

export default function AltBlockLines({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <div className="ab-stack">
        {ROWS.map((r, i) => {
          const at = CONFIG.lead + i * CONFIG.rowStagger;
          // ① 色块从左展开
          const bgP = tw(t, at, CONFIG.dur, power3Out);
          // ② 文字被块的右缘刷出来（同曲线同时长，滞后 2 帧）
          const txtP = tw(t, at + CONFIG.textLag, CONFIG.dur, power3Out);
          return (
            <span key={i} className={`ab-row ${r.cls}`}>
              <span className="ab-bg" style={{ transform: `scaleX(${bgP})` }} />
              <span className="ab-t" style={{ clipPath: `inset(0 ${(1 - txtP) * 100}% 0 0)` }}>
                {r.text}
              </span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
