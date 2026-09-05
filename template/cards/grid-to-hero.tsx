import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, useCurrentFrame } from "remotion";

// grid-to-hero · 网格收成主角 —— 自包含 Remotion 源码（与 demos/grid-to-hero/index.html 同画面）
// 口播"四个里我们选了这个"：2×2 网格先并列（错峰落位），讲到那一格时它长成主图、其余三格收成右侧一列小图
// （不消失：保留"是从这四个里选的"），讲完回到网格，再一起退场。
// 复制本文件进你的工程即可用；真素材经 srcs 注入（图片 → <Img>，.mp4/.webm/.mov → <OffthreadVideo>；不传 = 灰调占位）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 232 };   // 7.33s 动画 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 网格先并列（错峰 120ms 落位，不是四张一起淡入）② 主图长大与其余收缩走同一条 inOut、同一时刻起止
//      ③ 其余不消失——收成等大等距的一列（保留"是从这四个里选的"）④ 讲完回到网格再退场（首尾对称）
// ——————————————————————————————————————————————————————————
const CONFIG = {
  lead: 0.3,          // 起手：第一格开始落位
  stagger: 0.12,      // 网格错峰（每格）
  enterDur: 0.55,     // 单格落位（y 24→0 + scale .97→1，power3.out）
  holdGrid: 1.2,      // 网格停留（成片 = 口播念完"四个候选"）
  reflow: 0.8,        // 重排时长（power3.inOut；长大与收缩同一条曲线）
  holdHero: 2.0,      // 主图停留（成片 = 讲这一格的句长）
  holdBack: 0.8,      // 回到网格后的停留
  heroPush: 1.05,     // 主图内部缓推终值（重排起 → 回网格止，速率恒定）
  exit: 0.4,          // 一起退场（power2.in）
  exitStagger: 0.04,  // 退场错峰
  heroIdx: 2,         // 哪一格成为主角（0 起）
  // 几何（960×540，四边 48 安全边、间距 24）
  grid: [{ x: 48, y: 48 }, { x: 492, y: 48 }, { x: 48, y: 282 }, { x: 492, y: 282 }], tile: { w: 420, h: 210 },
  hero: { x: 48, y: 48, w: 620, h: 444 },                 // 主图占 65% 宽
  col: { x: 692, w: 220, h: 132, gap: 24 },               // 右侧一列：等大等距，列顶与主图顶对齐
};
const N = CONFIG.grid.length;
const T1 = CONFIG.lead + CONFIG.enterDur + CONFIG.stagger * (N - 1) + CONFIG.holdGrid;   // 重排起点 2.41
const T2 = T1 + CONFIG.reflow + CONFIG.holdHero;                                          // 回网格起点 5.21
const T_OUT = T2 + CONFIG.reflow + CONFIG.holdBack;                                       // 退场起点 6.81
/** 动画结束秒（最后一格退场结束）= 7.33；durationInFrames = round((END + 0.4) × 30) */
export const END = T_OUT + CONFIG.exitStagger * (N - 1) + CONFIG.exit;

/* 时间表（秒）
   0.30 / 0.42 / 0.54 / 0.66  四格错峰落位（0.55）
   2.41–3.21  重排：主角 → 620×444 主图，其余 → 右侧 220×132 一列（power3.inOut）；主图内部 1→1.05 缓推起
   5.21–6.01  回到网格；缓推收回
   6.81–7.33  一起退场（错峰 0.04） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const power3InOut = (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
type Rect = { x: number; y: number; w: number; h: number };
const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 g2h- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.g2h-ph { position: absolute; overflow: hidden; }
.g2h-pic { position: absolute; inset: 0; }
.g2h-pic.t1 { background: linear-gradient(160deg, #a4b0c6, #7d8aa3); }
.g2h-pic.t2 { background: linear-gradient(160deg, #bfa5ae, #957c86); }
.g2h-pic.t3 { background: linear-gradient(160deg, #9fb9ae, #789389); }
.g2h-pic.t4 { background: linear-gradient(160deg, #c2b39a, #9c8f78); }
.g2h-pic svg { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.g2h-tile { position: absolute; left: 0; top: 0; background: #ffffff; padding: 8px; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.16); }
.g2h-tile .g2h-ph { inset: 8px; border-radius: 6px; }
.g2h-tile .g2h-k { position: absolute; left: 20px; bottom: 18px; font-size: 16px; font-weight: 600; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,.7); white-space: nowrap; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);
const isVideo = (s: string) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(s);

/** 素材占位：灰调渐变 + 相框图标；传 src 则铺真图 / 真视频（object-fit cover）；scale = 主图内部缓推 */
const Ph: React.FC<{ tone: number; src?: string; scale?: number }> = ({ tone, src, scale = 1 }) => {
  const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return (
    <div className="g2h-ph">
      <div className={`g2h-pic t${tone}`} style={{ transform: `scale(${scale})`, transformOrigin: "50% 50%" }}>
        {src ? (isVideo(src) ? <OffthreadVideo src={src} muted style={fill} /> : <Img src={src} style={fill} />) : GLYPH}
      </div>
    </div>
  );
};

const DEFAULT_LABELS = ["封面候选 ①", "封面候选 ②", "封面候选 ③ · 最终选它", "封面候选 ④"];

type Props = {
  /** 四格压图标签；不传用默认文案 */
  labels?: string[];
  /** 四格真素材（图片 → <Img>，.mp4/.webm/.mov → <OffthreadVideo>）；不传用灰调占位 */
  srcs?: string[];
  /** 哪一格成为主角（0 起），默认 CONFIG.heroIdx = 2（第 3 格） */
  heroIdx?: number;
};

export default function GridToHero({ labels, srcs, heroIdx = CONFIG.heroIdx }: Props) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const H = Math.max(0, Math.min(N - 1, Math.round(heroIdx)));
  const lbs = (labels && labels.length >= N ? labels : DEFAULT_LABELS) as string[];
  const src = (i: number) => (srcs && srcs[i]) || undefined;

  const gridRect = (i: number): Rect => ({ x: C.grid[i].x, y: C.grid[i].y, w: C.tile.w, h: C.tile.h });
  // 重排目标：主角 → 主图；其余按原顺序收成右侧一列
  const target = (i: number): Rect => {
    if (i === H) return C.hero;
    const k = i < H ? i : i - 1;
    return { x: C.col.x, y: C.hero.y + k * (C.col.h + C.col.gap), w: C.col.w, h: C.col.h };
  };
  const p1 = tw(t, T1, C.reflow, power3InOut), p2 = tw(t, T2, C.reflow, power3InOut);
  // 主图内部缓推：T1 起匀速推到 1.05，T2 起收回
  const heroPush = lerp(lerp(1, C.heroPush, tw(t, T1, C.reflow + C.holdHero, linear)), 1, tw(t, T2, C.reflow, power2InOut));

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      {C.grid.map((_, i) => {
        const g = gridRect(i);
        const r = lerpRect(lerpRect(g, target(i), p1), g, p2);           // 网格 → 目标 → 网格（两段不重叠，顺序 lerp）
        const e = tw(t, C.lead + i * C.stagger, C.enterDur, power3Out);   // 落位：y 24→0 + scale .97→1
        const op = e * (1 - tw(t, T_OUT + i * C.exitStagger, C.exit, power2In));
        return (
          <div key={i} className="g2h-tile" style={{ width: r.w, height: r.h, opacity: op, zIndex: i === H ? 2 : 1,
            transform: `translate(${r.x}px, ${r.y + lerp(24, 0, e)}px) scale(${lerp(0.97, 1, e)})`, transformOrigin: "50% 50%" }}>
            <Ph tone={i + 1} src={src(i)} scale={i === H ? heroPush : 1} />
            <div className="g2h-k">{lbs[i]}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
