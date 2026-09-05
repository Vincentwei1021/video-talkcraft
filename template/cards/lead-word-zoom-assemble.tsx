import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";

// lead-word-zoom-assemble · 首词占满补句 —— 自包含 Remotion 源码（与 demos/lead-word-zoom-assemble/index.html 同画面）
// 首词以 2.3 倍字号独占画面正中、hold 期继续推近 6%；随后一条曲线同时完成"缩回终字号"与"整行左滑归位"，
// 后续词各自从槽位右侧被推进来补齐整句；整行落定后上移 28px、副行同一时窗浮出。
// 复制本文件进你的工程即可用；文案经 props 注入（words / subline / accentIndex），不传 = demo 文案。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 156 };   // 4.8s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 缩回与左滑必须共用一条缓动读作一次运动（各走各的曲线会断成"先缩小、再滑走"两拍）；
//      ② 后续词淡入 ≤2 帧——是"被塞进槽位"不是"浮现"；③ 支点钉首词中心，缩放期间首词不挪；
//      ④ 上移与副行同一时窗，先上移再出副行会多一个空当拍。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  startAt: 0.10,      // 首词出现时刻 s（0.15s 淡入）
  leadScale: 2.3,     // 首词起手倍数：2.3 让首词横向溢出一点（"太大了装不下"）；<1.8 只是稍大的字
  pushScale: 1.06,    // hold 期继续推近 6%："还在朝观众来"的最小可感量；>1.15 缩回时读作反向弹跳
  hold: 0.40,         // 首词独占画面的时长 s（≈12 帧；<0.27 读不完一个词，>0.67 整句节奏塌）
  shrink: 0.40,       // 缩回终字号 s（power3.inOut）
  slide: 0.80,        // 整行左滑归位 s（与缩回同起、同曲线、时长两倍——字号已落定位置还在走，这段"滑行尾巴"是电影感来源）
  wordDelay: 0.20,    // 后续词相对缩回起点的延迟 s（首词开始缩回才放后续词，同帧放挤在一起看不清谁在动）
  wordStagger: 0.13,  // 后续词错峰 s（≈4 帧；0 则整段后缀一起进，回到"整句淡入"）
  wordDur: 0.40,      // 单词推入 s（power4.out：起步快、落地长）
  wordPush: 28,       // 推入起点：槽位右侧 28px（≈0.5em；>1em 读作从画外飞入，与首词收束方向打架）
  wordFade: 0.07,     // 词淡入 s（≈2 帧，刻意极短；>0.2 词会"浮现"，推入的力学感消失）
  upDelay: 0.10,      // 整行落定后到上移的间隔 s
  upDur: 0.53,        // 整行上移 + 副行浮出 s（同一时窗，power2.out）
  up: -28,            // 整行上移量 px（让出的空间当帧被副行填掉）
  holdEnd: 3.0,       // 落定后静置 s（读整句 + 副行）
  exitDur: 0.40,      // 整行 + 副行同收（power2.in）
};

/* 时间表（demo 秒）
   0.10–0.25  首词淡入；0.10–0.50 整行 2.3→2.438 推近（power2.out）
   0.50–0.90  缩回 2.438→1（power3.inOut）；0.50–1.30 左滑 slide→0（同曲线，时长两倍）
   0.70 / 0.83 / 0.96  后续词各推入 0.4s（power4.out，x 28→0），淡入 0.07s
   1.40–1.93  整行 y 0→−28 + 副行淡入上浮（power2.out）
   4.40–4.80  整行 + 副行同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);
const power3InOut = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);

// —— 演示语境（不属于动效）：样式照搬 demo（类名 lwz- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.lwz-line { position: absolute; left: 50%; top: 250px; white-space: nowrap; font-size: 56px; font-weight: 600; letter-spacing: -1px; color: #1d1d1f; line-height: 1.2; will-change: transform; }
.lwz-line .lwz-w, .lwz-line .lwz-sp { display: inline-block; }
.lwz-line .lwz-sp { width: .28em; }
.lwz-sub { position: absolute; left: 50%; top: 318px; font-size: 22px; color: #7a7a7a; white-space: nowrap; }
`;

type Props = {
  /** 整句按词拆开，第一个词是首词（先占满画面） */
  words?: string[];
  /** 副行（整行上移让出的位置） */
  subline?: string;
  /** 换强调色的词序号（默认末词；-1 = 不换色） */
  accentIndex?: number;
  /** 唯一强调色 */
  accent?: string;
};

export default function LeadWordZoomAssemble({ words = ["效率", "才是", "唯一的", "护城河"], subline = "不是参数，也不是模型大小", accentIndex = words.length - 1, accent = "#0066cc" }: Props) {
  const t = useCurrentFrame() / FPS;

  // 支点实测（静态几何只量一次）：首词中心在整行里的占比 → transform-origin；偏心距 = 整行宽 × (0.5 − 占比)
  const lineRef = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<{ ratio: number; slide: number } | null>(null);
  const [handle] = useState(() => delayRender("lead-word-zoom-assemble: measure lead word"));
  useLayoutEffect(() => {
    const line = lineRef.current, lead = line?.querySelector<HTMLSpanElement>(".lwz-lead");
    if (!line || !lead) return;
    const L = line.offsetWidth, c = lead.offsetLeft + lead.offsetWidth / 2, ratio = c / L;
    setM({ ratio, slide: L * (0.5 - ratio) });
    continueRender(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ratio = m?.ratio ?? 0.15, slide = m?.slide ?? 0;

  // 时间表：shrinkAt = startAt + hold；wordAt(i) = shrinkAt + wordDelay + i·wordStagger；upAt = shrinkAt + slide + upDelay；exitAt = upAt + holdEnd
  const shrinkAt = CONFIG.startAt + CONFIG.hold;
  const upAt = shrinkAt + CONFIG.slide + CONFIG.upDelay;
  const exitAt = upAt + CONFIG.holdEnd;

  const leadOp = tw(t, CONFIG.startAt, 0.15, power1Out);
  // 一条 scale：hold 期推近（power2.out）→ 缩回（power3.inOut）
  const peak = CONFIG.leadScale * CONFIG.pushScale;
  const scale = t < shrinkAt ? lerp(CONFIG.leadScale, peak, tw(t, CONFIG.startAt, CONFIG.hold, power2Out)) : lerp(peak, 1, tw(t, shrinkAt, CONFIG.shrink, power3InOut));
  const x = lerp(slide, 0, tw(t, shrinkAt, CONFIG.slide, power3InOut));
  const y = lerp(0, CONFIG.up, tw(t, upAt, CONFIG.upDur, power2Out));
  const subP = tw(t, upAt, CONFIG.upDur, power2Out);
  const exitK = 1 - tw(t, exitAt, CONFIG.exitDur, power2In);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div ref={lineRef} className="lwz-line" style={{ opacity: exitK, transformOrigin: `${ratio * 100}% 50%`, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})` }}>
        {words.map((w, i) => {
          if (i === 0) return <span key={i} className="lwz-w lwz-lead" style={{ opacity: leadOp, color: accentIndex === 0 ? accent : undefined }}>{w}</span>;
          const at = shrinkAt + CONFIG.wordDelay + (i - 1) * CONFIG.wordStagger;   // 后续词被推进来：位移长、淡入极短
          const wx = lerp(CONFIG.wordPush, 0, tw(t, at, CONFIG.wordDur, power4Out));
          const wop = tw(t, at, CONFIG.wordFade, power1Out);
          return (
            <React.Fragment key={i}>
              <span className="lwz-sp" style={{ opacity: t >= at ? 1 : 0 }} />
              <span className="lwz-w" style={{ opacity: wop, transform: `translateX(${wx}px)`, color: accentIndex === i ? accent : undefined }}>{w}</span>
            </React.Fragment>
          );
        })}
      </div>
      <div className="lwz-sub" style={{ opacity: subP * exitK, transform: `translate(-50%, ${lerp(16, 0, subP)}px)` }}>{subline}</div>
    </AbsoluteFill>
  );
}
