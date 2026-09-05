import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// still-layout-relay · 多图排版 + 焦点接力 —— 自包含 Remotion 源码（与 demos/still-layout-relay/index.html 同画面）
// 口播一句里要同时给几张图（论点 + 两条证据 / 三个人 / 三个案例）：图怎么摆、讲到谁谁亮。
// 两种版式共用同一套机制：主图（首图）先落 → 其余同向错峰入场 → 讲到谁谁亮（其余降权）→ 接力 → 全部回位 → 一起退场。
// 复制本文件进你的工程即可用；真图经 srcs 注入（不传 = 灰调占位）。
// 默认 layout="tour" 先演 ① 一主两辅、硬切再演 ② 三联竖图（= demo 画面）；成片一镜只用一式：传单个 layout，时长用 durationFor(layout)。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 467 };   // ① 8.08s + ② 7.08s + 0.4s 收尾

const FPS = meta.fps;

export type Layout =
  | "hero-duo"    // ① 一主两辅：主图 546×388 左、两佐证 250×176 右列
  | "triptych";   // ② 三联竖图：三张 262×380 三栏（4+4+4，间距 21）

export const LAYOUTS: Layout[] = ["hero-duo", "triptych"];

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 三条纪律：① 入场有先后有方向（主图/首图先落，其余同向错峰 80~150ms；全组同时淡入 = PPT）
//         ② 任一时刻只有一个主角——焦点接力靠"其余降权"（brightness .6 / scale .985），主角本身只动 3~4%
//         ③ 切换 0.4s，两次接力之间 ≥1.4s；讲完全部回位，再一起退场
// ——————————————————————————————————————————————————————————
const CONFIG = {
  lead: 0.3,          // 起手：主图 / 首图开始入场
  dimB: 0.6,          // 非主角亮度（brightness）
  dimScale: 0.985,    // 非主角缩放
  switchDur: 0.4,     // 接力切换时长（power2.inOut）
  ringDur: 0.25,      // 描边环出现 / 消失
  heroPush: 1.06,     // ① 主图内部缓推终值；duration = 镜头长 − lead（写速率不写死秒数，推到退场为止）
  exit: 0.4,          // 一起退场（power2.in）
  exitStagger: 0.04,  // 退场错峰（每项 = 图 + 图注）
  capIn: 0.4,         // 图注淡入
};

type Table = { enterAt: number[]; enterDur: number[]; capAt: number; capStagger: number; focusScale: number; relays: [number, number][]; reset: number; exitAt: number };
// 两式的时间表（式内相对秒）
const TABLE: Record<Layout, Table> = {
  // 主图 y 30→0 + scale .96→1；佐证 x 40→0 错峰 150ms；接力 佐证1 → 佐证2
  "hero-duo": { enterAt: [0.3, 0.8, 0.95], enterDur: [0.6, 0.55, 0.55], capAt: 1.3, capStagger: 0.1, focusScale: 1.04, relays: [[2.4, 1], [4.2, 2]], reset: 6.0, exitAt: 7.6 },
  // 三张 x 40→0 错峰 80ms；接力 左 → 中 → 右
  triptych: { enterAt: [0.3, 0.38, 0.46], enterDur: [0.5, 0.5, 0.5], capAt: 0.8, capStagger: 0.08, focusScale: 1.03, relays: [[1.4, 0], [2.8, 1], [4.2, 2]], reset: 5.6, exitAt: 6.6 },
};
/** 一式总长（秒）：最后一项退场结束 */
export const perOf = (layout: Layout): number => TABLE[layout].exitAt + CONFIG.exitStagger * 2 + CONFIG.exit;
/** 单式成片时长（帧）：一式 + 0.4s 收尾；"tour" = 两式巡演（① 254 帧 / ② 224 帧 / tour 467 帧） */
export const durationFor = (layout: Layout | "tour"): number =>
  layout === "tour" ? meta.durationInFrames : Math.round((perOf(layout) + 0.4) * FPS);

/* 时间表（式内相对秒，lt）
   ① hero-duo：0.30 主图落（0.6）→ 0.80 / 0.95 两佐证滑入（0.55）→ 1.30 图注 → 2.40 亮佐证1 → 4.20 亮佐证2 → 6.00 回位 → 7.60 退场 → 8.08 结束
   ② triptych：0.30 / 0.38 / 0.46 三张滑入（0.5）→ 0.80 图注 → 1.40 / 2.80 / 4.20 左中右接力 → 5.60 回位 → 6.60 退场 → 7.08 结束 */

// 几何（960×540）：组包围盒水平居中、离画幅边 ≥48
type Rect = { x: number; y: number; w: number; h: number };
const GEO: Record<Layout, { photos: Rect[]; caps: { x: number; y: number; w?: number }[]; tones: number[] }> = {
  "hero-duo": {
    photos: [{ x: 62, y: 66, w: 546, h: 388 }, { x: 650, y: 66, w: 250, h: 176 }, { x: 650, y: 278, w: 250, h: 176 }],
    caps: [{ x: 64, y: 460 }, { x: 652, y: 248 }, { x: 652, y: 460 }],      // 图下 6px、左边与图左对齐
    tones: [1, 2, 3],
  },
  triptych: {
    photos: [{ x: 66, y: 70, w: 262, h: 380 }, { x: 349, y: 70, w: 262, h: 380 }, { x: 632, y: 70, w: 262, h: 380 }],
    caps: [{ x: 66, y: 462, w: 262 }, { x: 349, y: 462, w: 262 }, { x: 632, y: 462, w: 262 }],   // 图下 12px、与图同宽居中
    tones: [4, 5, 6],
  },
};
// 各式默认图注（演示语境，不属于动效）
const DEFAULT_CAPS: Record<Layout, [string, string, string]> = {
  "hero-duo": ["这台相机 · 主角", "细节 · 镜头群", "上手 · 握持"],
  triptych: ["受访者 A · 设计师", "受访者 B · 产品", "受访者 C · 摄影师"],
};
const TAGS: Record<Layout, string> = { "hero-duo": "① 一主两辅 · hero-duo", triptych: "② 三联竖图 · triptych" };
const COLOR = { base: [0x6e, 0x6e, 0x73], on: [0x1d, 0x1d, 0x1f], off: [0x9a, 0x9a, 0xa0] };   // 图注：常态 / 主角 / 非主角

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerpRGB = (a: number[], b: number[], p: number) => a.map((v, i) => lerp(v, b[i], p));
const rgb = (c: number[]) => `rgb(${c.map((v) => Math.round(v)).join(",")})`;

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 slr- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.slr-ph { position: absolute; overflow: hidden; }
.slr-pic { position: absolute; inset: 0; }
.slr-pic.t1 { background: linear-gradient(160deg, #a4b0c6, #7d8aa3); }
.slr-pic.t2 { background: linear-gradient(160deg, #bfa5ae, #957c86); }
.slr-pic.t3 { background: linear-gradient(160deg, #9fb9ae, #789389); }
.slr-pic.t4 { background: linear-gradient(160deg, #c2b39a, #9c8f78); }
.slr-pic.t5 { background: linear-gradient(160deg, #a3a9b8, #7f8594); }
.slr-pic.t6 { background: linear-gradient(160deg, #b8a9c4, #8f809d); }
.slr-pic svg { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.slr-photo { position: absolute; background: #ffffff; padding: 8px; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.16); }
.slr-photo .slr-ph { inset: 8px; border-radius: 6px; }
.slr-ring { position: absolute; inset: -6px; border: 3px solid #0066cc; border-radius: 18px; }
.slr-cap { position: absolute; color: #6e6e73; white-space: nowrap; line-height: 1.25; }
.slr-tag { position: absolute; left: 20px; bottom: 16px; z-index: 9; font-size: 12px; letter-spacing: 1px; color: #8a8a8a; background: rgba(255,255,255,.82); padding: 3px 10px; border-radius: 999px; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

/** 素材占位：灰调渐变 + 相框图标；传 src 则铺真图（object-fit cover）；scale = 主图内部缓推 */
const Ph: React.FC<{ tone: number; src?: string; scale?: number }> = ({ tone, src, scale = 1 }) => (
  <div className="slr-ph">
    <div className={`slr-pic t${tone}`} style={{ transform: `scale(${scale})`, transformOrigin: "50% 50%" }}>
      {src ? <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : GLYPH}
    </div>
  </div>
);

type Props = {
  /** 单式 or 两式巡演（默认，与 demo 一致） */
  layout?: Layout | "tour";
  /** 三条图注；不传用各式默认文案 */
  captions?: string[];
  /** 三张真图（① 顺序：主图、佐证1、佐证2；② 顺序：左中右）；不传用灰调占位 */
  srcs?: string[];
  /** 描边环颜色（单强调色），默认 #0066cc */
  accent?: string;
};

export default function StillLayoutRelay({ layout = "tour", captions, srcs, accent = "#0066cc" }: Props) {
  const t = useCurrentFrame() / FPS;
  const tour = layout === "tour";
  // 当前式 + 式内相对秒
  const k = tour ? (t >= perOf("hero-duo") ? 1 : 0) : Math.max(0, LAYOUTS.indexOf(layout as Layout));
  const cur = LAYOUTS[k];
  const lt = tour && k === 1 ? t - perOf("hero-duo") : t;
  const L = TABLE[cur], G = GEO[cur], P = perOf(cur);
  const caps = (captions && captions.length >= 3 ? captions : DEFAULT_CAPS[cur]) as string[];
  const src = (i: number) => (srcs && srcs[i]) || undefined;
  const tagOp = Math.min(tw(lt, 0.05, 0.2, power1Out), 1 - tw(lt, P - 0.25, 0.2, power1Out));

  // 接力状态：讲到谁谁亮（其余降权 + 图注变灰），回位后全部归 1；站与站不重叠，逐站从上一站落定值 lerp
  const relayState = (j: number) => {
    let b = 1, s = 1, ring = 0, col = COLOR.base;
    const stations: [number, number][] = [...L.relays, [L.reset, -1]];
    for (const [at, idx] of stations) {
      if (lt < at) break;
      const p = tw(lt, at, CONFIG.switchDur, power2InOut), pr = tw(lt, at, CONFIG.ringDur, power1Out);
      const on = idx === j, resetting = idx < 0;
      b = lerp(b, resetting || on ? 1 : CONFIG.dimB, p);
      s = lerp(s, resetting ? 1 : on ? L.focusScale : CONFIG.dimScale, p);
      ring = lerp(ring, on ? 1 : 0, pr);
      col = lerpRGB(col, resetting ? COLOR.base : on ? COLOR.on : COLOR.off, p);
    }
    return { b, s, ring, col };
  };
  const exitK = (j: number) => 1 - tw(lt, L.exitAt + j * CONFIG.exitStagger, CONFIG.exit, power2In);
  const heroPush = cur === "hero-duo" ? lerp(1, CONFIG.heroPush, tw(lt, CONFIG.lead, P - CONFIG.lead, linear)) : 1;

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      {G.photos.map((r, i) => {
        const e = tw(lt, L.enterAt[i], L.enterDur[i], power3Out);
        const isHero = cur === "hero-duo" && i === 0;
        // ① 主图：y 30→0 + scale .96→1；其余：x 40→0（同向）
        const x = isHero ? 0 : lerp(40, 0, e), y = isHero ? lerp(30, 0, e) : 0, es = isHero ? lerp(0.96, 1, e) : 1;
        const st = relayState(i);
        return (
          <div key={i} className="slr-photo" style={{ left: r.x, top: r.y, width: r.w, height: r.h, opacity: e * exitK(i),
            transform: `translate(${x}px, ${y}px) scale(${es * st.s})`, transformOrigin: "50% 50%", filter: `brightness(${st.b})` }}>
            <Ph tone={G.tones[i]} src={src(i)} scale={isHero ? heroPush : 1} />
            <div className="slr-ring" style={{ opacity: st.ring, borderColor: accent }} />
          </div>
        );
      })}
      {G.caps.map((c, i) => {
        const st = relayState(i);
        const op = tw(lt, L.capAt + i * L.capStagger, CONFIG.capIn, power1Out) * exitK(i);
        return (
          <div key={i} className="slr-cap" style={cur === "hero-duo"
            ? { left: c.x, top: c.y, fontSize: 14, opacity: op, color: rgb(st.col) }
            : { left: c.x, top: c.y, width: c.w, textAlign: "center", fontSize: 16, fontWeight: 600, opacity: op, color: rgb(st.col) }}>{caps[i]}</div>
        );
      })}
      {tour && <div className="slr-tag" style={{ opacity: tagOp }}>{TAGS[cur]}</div>}
    </AbsoluteFill>
  );
}
