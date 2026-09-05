import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";

// word-slot-cycle · 词槽轮换 —— 自包含 Remotion 源码（与 demos/word-slot-cycle/index.html 同画面）
// 句干钉死不动，句尾深色胶囊每 0.7s 向上翻一格换一个短语、宽度随词长伸缩，上下露两行幽灵项；
// 换完 N 个词胶囊上飞，结论带全卡唯一一次过冲落进同一位置。
// 复制本文件进你的工程即可用；文案经 props 注入（stem / words / final），不传 = demo 文案。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 206 };   // 6.45s 镜头 + 0.4s 收尾（4 词）

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 句干绝对定位左端锚死，不能 flex 居中（胶囊变宽会带着句干重排）；② 每拍前 8 帧换位、后 13 帧静置——
//      静置段是给观众读词的，读不完的拍等于没换；③ 新词减速落定、旧词加速逃走（方向感 = 向上翻页）；
//      ④ 全卡唯一一次过冲留给结论。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  beat: 0.7,         // 拍长 s：每 0.7s 换一个词（<0.55 读不完短语，>0.95 节拍器感散掉）
  swap: 0.27,        // 换位窗 s（≈8 帧）power2.inOut——两头都缓才像滚轮起步与停稳
  row: 56,           // 胶囊高 = 滚轮行高 px
  pad: 48,           // 胶囊宽 = 词宽 + pad（左右内边距 24×2；<32 词贴边，>80 胶囊胖成按钮）
  swapBlur: 4,       // 换位途中滚轮运动模糊峰值 px（去掉读作硬弹，>8 中间帧糊成色块）
  ghostAlpha: 0.13,  // 幽灵项透明度：看得见但不抢（>0.25 读作三行并列文字）
  enterAt: 0.2,      // 句干 + 胶囊入场起点 s（0.5s power3.out，y 14→0，胶囊错峰 0.08）
  firstSwapAt: 1.1,  // 第一次换词时刻：起手静置让观众先认出句式
  settle: 0.35,      // 末词读完（一拍）后到收束的追加静置 s
  flyOut: 0.23,      // 末 pill 上飞 s（power2.in：y -130 + blur 10，加速逃走）
  finalDelay: 0.12,  // 结论相对 pill 起飞的滞后 s
  finalIn: 0.47,     // 结论落位 s：back.out(1.4)，全卡唯一过冲（>2 像卡通，无过冲结论与列举没档次差）
  holdEnd: 2.5,      // 结论静置 s（这句话是全段目的，不 hold 等于白列举；≥1.5）
  exitDur: 0.4,      // 句干 + 结论同收（power2.in）
  gap: 14,           // 句干与词槽间距 px
};

/* 时间表（demo 秒，4 词）
   0.20–0.70  句干入场（opacity 0→1、y 14→0，power3.out）；胶囊 0.28–0.78；幽灵项 0.70–1.00 淡到 13%
   1.10 / 1.80 / 2.50  换词：前 0.27s 滚轮上翻一格（power2.inOut）+ 运动模糊 + 胶囊宽度插值，幽灵项隐→换字→现
   3.55  收束：pill 上飞 0.23s（power2.in）；槽宽 0.3s 换成结论宽；3.67–4.14 结论 back.out(1.4) 落位
   6.05–6.45  句干 + 结论同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power1In = (x: number) => x * x;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const backOut = (s = 1.70158) => (x: number) => { const t = x - 1; return 1 + (s + 1) * t * t * t + s * t * t; };

// —— 演示语境（不属于动效）：样式照搬 demo（类名 wsc- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.wsc-sent { position: absolute; top: 238px; height: 64px; display: flex; align-items: center; font-size: 40px; font-weight: 700; letter-spacing: -.5px; color: #1d1d1f; white-space: nowrap; }
.wsc-stem { margin-right: 14px; }
.wsc-slot { position: relative; height: 56px; }
.wsc-pill { position: absolute; left: 0; top: 0; height: 56px; border-radius: 999px; background: #1d1d1f; color: #ffffff; overflow: hidden; font-size: 30px; font-weight: 700; letter-spacing: 0; will-change: transform, width, filter; }
.wsc-reel { position: absolute; left: 0; top: 0; display: flex; flex-direction: column; will-change: transform, filter; }
.wsc-reel span { height: 56px; line-height: 56px; padding: 0 24px; white-space: nowrap; }
.wsc-ghost { position: absolute; left: 24px; font-size: 30px; font-weight: 700; color: #1d1d1f; white-space: nowrap; line-height: 56px; letter-spacing: 0; }
.wsc-gu { top: -50px; } .wsc-gd { top: 62px; }
.wsc-final { position: absolute; left: 0; top: 0; height: 56px; line-height: 56px; font-size: 40px; font-weight: 700; letter-spacing: -.5px; white-space: nowrap; }
.wsc-meas { position: absolute; left: 0; top: 0; visibility: hidden; white-space: nowrap; font-weight: 700; }
.wsc-meas span { display: inline-block; }
`;

type Props = {
  /** 句干（钉死不动） */
  stem?: string;
  /** 轮换词表（4~6 个；末词后收束） */
  words?: string[];
  /** 结论（落进胶囊原位，强调色） */
  final?: string;
  /** 结论颜色（唯一强调色） */
  accent?: string;
};

export default function WordSlotCycle({ stem = "一个 AI，帮你", words = ["写代码", "改简历", "做 PPT", "查资料"], final = "搞定所有事", accent = "#0066cc" }: Props) {
  const t = useCurrentFrame() / FPS;
  const n = Math.max(1, words.length);

  // 静态几何只量一次：词宽（胶囊 = 词宽 + pad）、句干宽、结论宽（句干锚点 = 按"句干 + 间距 + 结论"总宽居中反推）
  const measRef = useRef<HTMLSpanElement>(null);
  const [m, setM] = useState<{ ws: number[]; stemW: number; finW: number } | null>(null);
  const [handle] = useState(() => delayRender("word-slot-cycle: measure text widths"));
  useLayoutEffect(() => {
    const el = measRef.current;
    if (!el) return;
    const q = (k: string) => el.querySelector<HTMLSpanElement>(`span[data-k="${k}"]`)?.offsetWidth ?? 0;
    setM({ ws: words.map((_, i) => q(`w${i}`) + CONFIG.pad), stemW: q("stem"), finW: q("fin") });
    continueRender(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ws = m?.ws ?? words.map((w) => w.length * 30 + CONFIG.pad);
  const stemW = m?.stemW ?? stem.length * 40, finW = m?.finW ?? final.length * 40;
  const left = Math.round((960 - (stemW + CONFIG.gap + finW)) / 2);

  // 时间表：swapAt(i) = firstSwapAt + (i-1)·beat；lastAt = 末次换词 + beat + settle；exitAt = lastAt + holdEnd
  const swapAt = (i: number) => CONFIG.firstSwapAt + (i - 1) * CONFIG.beat;
  const lastAt = (n > 1 ? swapAt(n - 1) : CONFIG.firstSwapAt - CONFIG.beat) + CONFIG.beat + CONFIG.settle;
  const exitAt = lastAt + CONFIG.holdEnd;

  // 入场 / 退场
  const stemIn = tw(t, CONFIG.enterAt, 0.5, power3Out), pillIn = tw(t, CONFIG.enterAt + 0.08, 0.5, power3Out);
  const exitK = 1 - tw(t, exitAt, CONFIG.exitDur, power2In);

  // 滚轮：idx = 已完成的换位之和（换位中为小数）；胶囊宽在当前换位内插值；换位途中运动模糊
  let idx = 0, width = ws[0], blur = 0, curIdx = 0;
  for (let i = 1; i < n; i++) {
    const at = swapAt(i), p = clamp01((t - at) / CONFIG.swap);
    idx += power2InOut(p);
    if (t >= at) { width = lerp(ws[i - 1], ws[i], power2InOut(p)); }
    if (t >= at && t < at + CONFIG.swap) blur = p < 0.45 ? CONFIG.swapBlur * power1In(p / 0.45) : CONFIG.swapBlur * (1 - power2Out((p - 0.45) / 0.55));
    if (t >= at + CONFIG.swap) curIdx = i;   // 幽灵项换字时刻 = 换位结束
  }

  // 幽灵项透明度：0.7s 淡到 13%；每次换位前隐、换位后再现；收束前 0.12s 隐去
  let gk = tw(t, 0.7, 0.3, power1Out);
  for (let i = 1; i < n; i++) {
    const at = swapAt(i);
    if (t >= at && t < at + 0.1) gk = 1 - power1Out((t - at) / 0.1);
    else if (t >= at + 0.1 && t < at + CONFIG.swap) gk = 0;
    else if (t >= at + CONFIG.swap && t < at + CONFIG.swap + 0.15) gk = power1Out((t - at - CONFIG.swap) / 0.15);
  }
  if (t >= lastAt - 0.12) gk = Math.min(gk, 1 - power1Out(clamp01((t - (lastAt - 0.12)) / 0.12)));
  const ghostA = gk * CONFIG.ghostAlpha;

  // 收束：pill 上飞（加速逃走）→ 槽宽换成结论宽 → 结论 back.out(1.4) 落位
  const fly = tw(t, lastAt, CONFIG.flyOut, power2In);
  const slotW = t >= lastAt ? lerp(ws[n - 1], finW, tw(t, lastAt, 0.3, power2Out)) : width;
  const finRaw = clamp01((t - (lastAt + CONFIG.finalDelay)) / CONFIG.finalIn);
  const finP = backOut(1.4)(finRaw);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="wsc-sent" style={{ left }}>
        <span className="wsc-stem" style={{ opacity: stemIn * exitK, transform: `translateY(${lerp(14, 0, stemIn)}px)` }}>{stem}</span>
        <span className="wsc-slot" style={{ width: slotW }}>
          <span className="wsc-ghost wsc-gu" style={{ opacity: ghostA }}>{words[curIdx - 1] ?? ""}</span>
          <span className="wsc-pill" style={{ width, opacity: pillIn * (1 - fly), transform: `translateY(${lerp(14, 0, pillIn) + lerp(0, -130, fly)}px)`, filter: `blur(${lerp(0, 10, fly)}px)` }}>
            <span className="wsc-reel" style={{ transform: `translateY(${-idx * CONFIG.row}px)`, filter: `blur(${blur}px)` }}>
              {words.map((w, i) => <span key={i}>{w}</span>)}
            </span>
          </span>
          <span className="wsc-ghost wsc-gd" style={{ opacity: ghostA }}>{words[curIdx + 1] ?? ""}</span>
          <span className="wsc-final" style={{ color: accent, opacity: Math.min(1, finRaw * 3) * exitK, transform: `translateY(${lerp(90, 0, finP)}px)` }}>{final}</span>
        </span>
      </div>
      {/* 隐形尺子 */}
      <span className="wsc-meas" ref={measRef}>
        <span data-k="stem" style={{ fontSize: 40, letterSpacing: -0.5 }}>{stem}</span>
        <span data-k="fin" style={{ fontSize: 40, letterSpacing: -0.5 }}>{final}</span>
        {words.map((w, i) => <span key={i} data-k={`w${i}`} style={{ fontSize: 30, letterSpacing: 0 }}>{w}</span>)}
      </span>
    </AbsoluteFill>
  );
}
