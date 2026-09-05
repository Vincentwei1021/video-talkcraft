import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// stack-fan-out · 卡堆扇形展开 —— 自包含 Remotion 源码（与 demos/stack-fan-out/index.html 同画面）
// 口播"我收集了这几张 / 今年拍了五张候选"：五张卡先叠成一叠（微错位），0.7s 扇形展开（旋转 −24°…+24°、沿弧线平移），
// 停一拍，再 0.6s 铺平成一行等距五格——"这一叠"变成"这五个"。图片专用。
// 复制本文件进你的工程即可用；真图经 srcs 注入（不传 = 灰调占位）；title 传空串可去掉标题。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 204 };   // 6.4s 动画 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 扇开是绕弧心的旋转 + 平移（弧心在卡堆下方 R），不是各卡原地转
//      ② 扇开 / 铺平两段动作之间必须停 ≥0.6s（一段动作一个意思："一叠" → "五个"）
//      ③ 铺平后每张旋转归零、等宽等距、整行居中
// ——————————————————————————————————————————————————————————
const CONFIG = {
  n: 5,               // 卡数（≤6）
  lead: 0.2,          // 起手：标题与卡堆开始淡入
  stackIn: 0.4,       // 卡堆淡入时长
  stackStagger: 0.05, // 卡堆淡入错峰（每张）
  stackOff: { x: 3, y: -2, rot: 1.2 },   // 叠放微错位（每张 × (i − 中位)），让"一叠"读得出来
  fanAt: 1.0,         // 扇开起点
  fanDur: 0.7,        // 扇开时长（power3.out）
  fanAngle: 24,       // 扇角：两端 ±24°
  R: 520,             // 弧心在卡堆下方 R px
  flatAt: 2.5,        // 铺平起点（扇开后停 0.8 ≥ 0.6）
  flatDur: 0.6,       // 铺平时长（power3.inOut）
  flatW: 150,         // 铺平后每张宽（220 → 150，scale .68）
  flatGap: 16,        // 铺平后间距；整行 5×150 + 4×16 = 814 居中（离边 73 ≥ 48）
  exitAt: 5.8,        // 退场起点（成片 = 讲完这五个）
  exit: 0.4,          // 一起退场（power2.in）
  exitStagger: 0.04,  // 退场错峰（卡 → 标题）
  card: { x: 370, y: 170, w: 220, h: 150 },   // 卡堆位置（中心 480, 245：与标题一起落在上三分线附近）
};
/** 动画结束秒（标题退场结束）= 6.4；durationInFrames = round((END + 0.4) × 30) */
export const END = CONFIG.exitAt + CONFIG.exitStagger * CONFIG.n + CONFIG.exit;

/* 时间表（秒）
   0.20  标题升起（0.45）+ 卡堆淡入（0.4，错峰 0.05）
   1.00–1.70  扇开：第 i 张转到 −24 + 12i 度，位置 = 弧心 (0, R) 上对应点
   2.50–3.10  铺平：x = (i − 2) × 166、旋转归零、scale 150/220
   5.80–6.40  一起退场（五张卡 → 标题，错峰 0.04） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const power3InOut = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 sfo- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.sfo-ph { position: absolute; overflow: hidden; }
.sfo-pic { position: absolute; inset: 0; }
.sfo-pic.t1 { background: linear-gradient(160deg, #a4b0c6, #7d8aa3); }
.sfo-pic.t2 { background: linear-gradient(160deg, #bfa5ae, #957c86); }
.sfo-pic.t3 { background: linear-gradient(160deg, #9fb9ae, #789389); }
.sfo-pic.t4 { background: linear-gradient(160deg, #c2b39a, #9c8f78); }
.sfo-pic.t5 { background: linear-gradient(160deg, #a3a9b8, #7f8594); }
.sfo-pic.t6 { background: linear-gradient(160deg, #b8a9c4, #8f809d); }
.sfo-pic svg { position: absolute; left: 50%; top: 50%; width: 44px; height: 38px; transform: translate(-50%, -56%); opacity: .35; }
.sfo-card { position: absolute; background: #ffffff; padding: 8px; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.16); }
.sfo-card .sfo-ph { inset: 8px; border-radius: 6px; }
.sfo-ttl { position: absolute; left: 0; right: 0; top: 60px; text-align: center; font-size: 28px; font-weight: 700; color: #1d1d1f; letter-spacing: 1px; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

/** 素材占位：灰调渐变 + 相框图标；传 src 则铺真图（object-fit cover） */
const Ph: React.FC<{ tone: number; src?: string }> = ({ tone, src }) => (
  <div className="sfo-ph">
    <div className={`sfo-pic t${tone}`}>
      {src ? <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : GLYPH}
    </div>
  </div>
);

type Props = {
  /** 顶部一行标题（演示语境）；传 "" 不显示 */
  title?: string;
  /** 五张真图（叠放顺序 = 数组顺序，最后一张在最上）；不传用灰调占位 */
  srcs?: string[];
};

export default function StackFanOut({ title = "今年拍了五张候选封面", srcs }: Props) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG, mid = (C.n - 1) / 2, pitch = C.flatW + C.flatGap;
  const src = (i: number) => (srcs && srcs[i]) || undefined;
  const pf = tw(t, C.fanAt, C.fanDur, power3Out), pl = tw(t, C.flatAt, C.flatDur, power3InOut);
  const ttlIn = tw(t, C.lead, 0.45, power3Out);
  const ttlOp = ttlIn * (1 - tw(t, C.exitAt + C.n * C.exitStagger, C.exit, power2In));

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      {title ? <div className="sfo-ttl" style={{ opacity: ttlOp, transform: `translateY(${lerp(10, 0, ttlIn)}px)` }}>{title}</div> : null}
      {Array.from({ length: C.n }, (_, i) => {
        // 三态：叠放（微错位）→ 扇开（弧上点 + 旋转）→ 铺平（一行等距、旋转归零、缩到 flatW）；两段不重叠，顺序 lerp
        const deg = -C.fanAngle + i * ((2 * C.fanAngle) / (C.n - 1)), a = (deg * Math.PI) / 180;
        const s0 = { x: (i - mid) * C.stackOff.x, y: (i - mid) * C.stackOff.y, r: (i - mid) * C.stackOff.rot, s: 1 };
        const s1 = { x: Math.sin(a) * C.R, y: (1 - Math.cos(a)) * C.R, r: deg, s: 1 };
        const s2 = { x: (i - mid) * pitch, y: 0, r: 0, s: C.flatW / C.card.w };
        const x = lerp(lerp(s0.x, s1.x, pf), s2.x, pl), y = lerp(lerp(s0.y, s1.y, pf), s2.y, pl);
        const r = lerp(lerp(s0.r, s1.r, pf), s2.r, pl), s = lerp(lerp(s0.s, s1.s, pf), s2.s, pl);
        const op = tw(t, C.lead + i * C.stackStagger, C.stackIn, power1Out) * (1 - tw(t, C.exitAt + i * C.exitStagger, C.exit, power2In));
        return (
          <div key={i} className="sfo-card" style={{ left: C.card.x, top: C.card.y, width: C.card.w, height: C.card.h, opacity: op,
            transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, transformOrigin: "50% 50%" }}>
            <Ph tone={i + 1} src={src(i)} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
