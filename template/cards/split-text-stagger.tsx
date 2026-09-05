import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";

// split-text-stagger · 逐字裂升 —— 自包含 Remotion 源码（与 demos/split-text-stagger/index.html 同画面）
// 标题每个字在自己的裁切盒里从下方 115% 升起、带 10% 过冲回落，字间错峰 2 帧；一条基线从左向右长到整行宽，长满与末字落定同帧。
// 复制本文件进你的工程即可用；文案经 props 注入（text / sub），不传 = demo 文案。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 156 };   // 4.8s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 过冲 10%（6% 可测不可感）——正常速度要看得见回落那一下；② 裁切盒高 = 行高，字从基线下方"被裁着"升出来，
//      这一裁就是与逐字上升卡的全部区别；③ 基线生长时长 = 字的总 stagger 时长，长满与末字落定同帧；④ 全员落定真静止 ≥30f。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  startAt: 0.3,     // 第一个字起升 s
  stagger: 0.067,   // 字间错峰 s（2 帧）
  dur: 0.5,         // 每字行程 s（yPercent 115→0）
  over: 1.2,        // back.out 系数：约 10% 过冲（<1.0 可测不可感）
  subAt: 1.4,       // 副标淡入起点 s（0.4s）
  exitAt: 4.4,      // 整组同收起点 s
  exitDur: 0.4,     // 同收时长（power2.in）
};

/* 时间表（demo 秒，9 字）
   0.30 起  第 i 字在 0.30 + i×0.067 起 0.5s back.out(1.2) 从 115% 升到 0（末字 0.84–1.34）
   0.30–1.34  基线 scaleX 0→1（power2.out），长满 = 末字落定
   1.40–1.80  副标淡入
   4.40–4.80  整组同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const backOut = (s = 1.70158) => (x: number) => { const t = x - 1; return 1 + (s + 1) * t * t * t + s * t * t; };

// —— 演示语境（不属于动效）：样式照搬 demo（类名 sts- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.sts-line { position: absolute; left: 50%; top: 240px; transform: translateX(-50%); display: flex; gap: 2px; font-size: 64px; font-weight: 700; color: #1d1d1f; letter-spacing: -1px; white-space: nowrap; }
.sts-ch { display: inline-block; height: 78px; line-height: 78px; overflow: hidden; }
.sts-ch span { display: inline-block; }
.sts-base { position: absolute; left: 50%; top: 322px; height: 3px; background: #1d1d1f; transform-origin: 0 50%; }
.sts-sub { position: absolute; left: 50%; top: 344px; transform: translateX(-50%); font-size: 20px; color: #7a7a7a; white-space: nowrap; }
`;

type Props = {
  /** 标题（逐字裂升） */
  text?: string;
  /** 副标（落定后跟进） */
  sub?: string;
};

export default function SplitTextStagger({ text = "把复杂的事，讲简单", sub = "——口播脚本的第一原则" }: Props) {
  const t = useCurrentFrame() / FPS;
  const chars = [...text];

  // 静态几何只量一次：整行宽 → 基线宽
  const lineRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState<number | null>(null);
  const [handle] = useState(() => delayRender("split-text-stagger: measure line width"));
  const continued = useRef(false);
  const done = () => { if (!continued.current) { continueRender(handle); continued.current = true; } };   // 同一 handle 只 continue 一次；文案 props 变了重测不再挂起
  useLayoutEffect(() => {
    setW(lineRef.current?.offsetWidth ?? chars.length * 63);
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);   // 文案变了重测
  const width = W ?? chars.length * 63;

  const growDur = CONFIG.dur + CONFIG.stagger * (chars.length - 1);   // 基线长满 = 末字落定
  const grow = tw(t, CONFIG.startAt, growDur, power2Out);
  const subK = tw(t, CONFIG.subAt, 0.4, power1Out);
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.exitDur, power2In);
  const ease = backOut(CONFIG.over);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="sts-line" ref={lineRef} style={{ opacity: exitK }}>
        {chars.map((c, i) => {
          const p = tw(t, CONFIG.startAt + i * CONFIG.stagger, CONFIG.dur, ease);   // 每字裂升：裁切盒内 115%→0，带 10% 过冲
          return <span key={i} className="sts-ch"><span style={{ transform: `translateY(${lerp(115, 0, p)}%)` }}>{c}</span></span>;
        })}
      </div>
      {/* 基线：宽 = 整行宽，从左向右长满 */}
      <div className="sts-base" style={{ width, transform: `translateX(${-width / 2}px) scaleX(${grow})`, opacity: exitK }} />
      <div className="sts-sub" style={{ opacity: subK * exitK }}>{sub}</div>
    </AbsoluteFill>
  );
}
