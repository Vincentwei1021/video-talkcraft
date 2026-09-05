import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// line-carry-transition · 线条接力转场 —— 自包含 Remotion 源码（与 demos/line-carry-transition/index.html 同画面）
// A 镜标题的下划线继续向右冲出画面，镜头跟着线横移（线生长 = 镜头位移，笔头钉在画面 x≈640），
// 线到位后拐直角围出 B 镜的画框，闭合那一帧笔头消失、B 内容在框内淡入——全程无剪切，一条线把两镜缝在一起。
// 复制本文件进你的工程即可用；A / B 文案经 props 注入，B 内容图经 srcB 注入（不传 = 灰调占位）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 204 };   // 6.4s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 横移段线生长 = 镜头位移（drawn = underline + cam），笔头钉在画面 x≈640 永不出画也永不落后——失速观众跟丢线就等于跟丢转场；
//      ② 直角硬拐不倒圆（圆角丢掉制图感）；③ 框没闭合 B 内容不能先出；④ 闭合后笔头墨点必须卸载，残留即毁静止。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  underline: 560,                        // A 标题下划线长度（80 → 640）
  run: 520,                              // 冲出段：640 → 1160（B 画框左边）
  frame: { x: 1160, y: 110, w: 560, h: 330 },   // B 画框（世界坐标；镜头到位后屏幕 x 200~760、整组居中）
  lineY: 262,                            // 下划线 / 冲出段的 y（标题副标底边 +18）
  titleIn: 0.1,                          // A 标题入场 s（0.4s power3.out）
  penIn: 0.35,                           // 笔头墨点出现 s
  underAt: 0.4, underDur: 0.6,           // 下划线画出（power2.out）
  camAt: 1.2, camDur: 2.0, cam: 960,     // 镜头横移（power2.inOut）；>40px/f 笔头拖影跟丢，别提速要拉长时长
  penOut: 3.2,                           // 框闭合：笔头卸载（0.2s）
  bIn: 3.3,                              // B 内容淡入 s（0.5s power2.out）——框闭合后才出
  exitAt: 6.0,                           // B 内容与线同收（0.4s power2.in）
  end: 6.4,                              // 镜头结束
};

/* 时间表（demo 秒）
   0.10–0.50  A 标题入场；0.35 笔头出现
   0.40–1.00  下划线 0→560 画出（power2.out）
   1.20–3.20  镜头横移 0→960（power2.inOut）：前 520px 线与镜头同速（笔头钉在屏幕 x=640），
              余下 440px 位移里线拐直角画完 B 画框 1780（左边中点进、顺时针回到入口）
   3.20–3.40  框闭合，笔头卸载
   3.30–3.80  B 内容淡入（power2.out）；之后真静止
   6.00–6.40  B 内容与线同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

// —— 折线几何（全是直线段，长度解析计算）——
const F = CONFIG.frame;
const PTS: [number, number][] = [[80, CONFIG.lineY], [80 + CONFIG.underline, CONFIG.lineY], [F.x, CONFIG.lineY], [F.x, F.y], [F.x + F.w, F.y], [F.x + F.w, F.y + F.h], [F.x, F.y + F.h], [F.x, CONFIG.lineY]];
const SEG = PTS.slice(1).map((p, i) => Math.hypot(p[0] - PTS[i][0], p[1] - PTS[i][1]));
const TOTAL = SEG.reduce((a, b) => a + b, 0);
const PERIMETER = 2 * (F.w + F.h);
const D = PTS.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
/** 折线上距起点 L 处的点（getPointAtLength 的解析版） */
const pointAt = (L: number): [number, number] => {
  let q = Math.max(0, Math.min(TOTAL, L));
  for (let i = 0; i < SEG.length; i++) {
    if (q <= SEG[i] || i === SEG.length - 1) { const f = SEG[i] ? Math.min(1, q / SEG[i]) : 0; return [lerp(PTS[i][0], PTS[i + 1][0], f), lerp(PTS[i][1], PTS[i + 1][1], f)]; }
    q -= SEG[i];
  }
  return PTS[PTS.length - 1];
};
// 横移段：线生长与镜头位移同速；镜头过了冲出段后余下位移里把画框画完
const camL = (c: number) => (c <= CONFIG.run ? CONFIG.underline + c : CONFIG.underline + CONFIG.run + ((c - CONFIG.run) / (CONFIG.cam - CONFIG.run)) * PERIMETER);

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 lct- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.lct-world { position: absolute; left: 0; top: 0; width: 1920px; height: 540px; will-change: transform; }
.lct-ta { position: absolute; left: 80px; top: 150px; font-size: 48px; font-weight: 700; color: #1d1d1f; white-space: nowrap; line-height: 1.2; }
.lct-ta small { display: block; font-size: 20px; color: #7a7a7a; font-weight: 500; margin-top: 12px; }
.lct-svg { position: absolute; left: 0; top: 0; width: 1920px; height: 540px; overflow: visible; }
.lct-ln { fill: none; stroke: #0066cc; stroke-width: 6; stroke-linejoin: miter; stroke-linecap: butt; }
.lct-pen { fill: #0066cc; }
.lct-tb { position: absolute; left: ${F.x + 14}px; top: ${F.y + 32}px; width: ${F.w - 28}px; }
.lct-ph { position: relative; width: 100%; height: 222px; border-radius: 6px; overflow: hidden; background: linear-gradient(160deg, #a4b0c6, #7d8aa3); }
.lct-ph svg { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.lct-tb p { margin-top: 14px; font-size: 22px; font-weight: 700; color: #1d1d1f; white-space: nowrap; }
.lct-tb p small { font-weight: 500; color: #7a7a7a; font-size: 16px; margin-left: 10px; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

type Props = {
  /** A 镜标题 / 副标 */
  titleA?: string;
  subA?: string;
  /** B 镜标题 / 副标（落在画框内图片下方） */
  titleB?: string;
  subB?: string;
  /** B 内容图；不传 = 灰调占位 */
  srcB?: string;
};

export default function LineCarryTransition({ titleA = "第一部分 · 为什么慢", subA = "三个拖慢流程的地方", titleB = "第二部分 · 怎么快", subB = "把三处改成自动", srcB }: Props) {
  const t = useCurrentFrame() / FPS;

  const u = lerp(0, CONFIG.underline, tw(t, CONFIG.underAt, CONFIG.underDur, power2Out));   // 下划线
  const c = lerp(0, CONFIG.cam, tw(t, CONFIG.camAt, CONFIG.camDur, power2InOut));           // 镜头
  const L = Math.min(TOTAL, Math.max(u, camL(c)));                                            // 已画长度
  const [px, py] = pointAt(L);

  const taIn = tw(t, CONFIG.titleIn, 0.4, power3Out);
  const penK = tw(t, CONFIG.penIn, 0.1, power1Out) - tw(t, CONFIG.penOut, 0.2, power1Out);   // 笔头：出现 → 框闭合后卸载
  const tbIn = tw(t, CONFIG.bIn, 0.5, power2Out);
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.end - CONFIG.exitAt, power2In);              // B 内容与线同收

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="lct-world" style={{ transform: `translateX(${-c}px)` }}>
        <div className="lct-ta" style={{ opacity: taIn, transform: `translateY(${lerp(10, 0, taIn)}px)` }}>{titleA}<small>{subA}</small></div>
        <svg className="lct-svg" viewBox="0 0 1920 540">
          <path className="lct-ln" d={D} style={{ strokeDasharray: TOTAL, strokeDashoffset: TOTAL - L, opacity: exitK }} />
          <circle className="lct-pen" r={8} cx={px} cy={py} opacity={penK} />
        </svg>
        <div className="lct-tb" style={{ opacity: tbIn * exitK }}>
          <div className="lct-ph">{srcB ? <Img src={srcB} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : GLYPH}</div>
          <p>{titleB}<small>{subB}</small></p>
        </div>
      </div>
    </AbsoluteFill>
  );
}
