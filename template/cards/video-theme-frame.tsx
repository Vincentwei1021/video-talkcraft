import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, useCurrentFrame } from "remotion";

// video-theme-frame · 单视频主题边框 —— 自包含 Remotion 源码（与 demos/video-theme-frame/index.html 同画面）
// 镜头里唯一主体是一段视频（录屏 / 单条 B-roll / 引用片段）时，不裸贴满幅、也不装假播放器（2026-09-07 用户定版：不要进度条 / 播放键，
// 要有设计语汇的装饰边框），而是给它一只"有出处的框"：八式一卡（frame prop），每式都是一个可识别的物——复古浏览器窗口 / 杂志相框 /
// 35mm 胶片 / 拍立得 / 工程图纸 / 笔记本 / 邮票齿边 / 双发丝线。动作全部收敛为「落位 → 装饰接力 → 整框极缓推 → 退场」，框里的画面零处理。
// 默认 frame="tour" 依次巡演八式（= demo 画面）；成片一镜只用一式：传单个 frame + hold（句长），时长用 durationFor(frame, hold)。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 540 };   // tour：0.3 + 8 × 2.2 = 17.9s + 收尾

const FPS = meta.fps;

export type Frame = "browser-retro" | "magazine" | "film" | "polaroid" | "blueprint" | "laptop" | "stamp" | "hairline";
export const FRAMES: Frame[] = ["browser-retro", "magazine", "film", "polaroid", "blueprint", "laptop", "stamp", "hairline"];

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 框是"物"不是 UI——每式的元素都能说出它是什么（窗口钮 / 齿孔 / 图注 / 尺寸线），没有任何假控件（进度条 / 播放键 / 时间码）
//      ② 动作只有四段：落位 0.45s → 装饰接力（描线 / 淡入 / 展开，≤1.2s 全部画完静置）→ 整框极缓推 1→1.03 → 退场 0.35s；不弹不摆不呼吸
//      ③ 视频画面本身零处理：不加滤镜 / 不缩放 / 不淡入淡出，活由整框极缓推负责（G1 相机）
//      ④ 一片一式：同一支片里所有单视频镜用同一式（design-language §0.4 一致性），选式写进 SHOTBOOK 蒙皮行
// ——————————————————————————————————————————————————————————
const CONFIG = {
  landIn: 0.45,    // 落位：opacity 0→1 + scale .96→1 + y 16→0（power3.out；拍立得 y 24→0）
  decorAt: 0.5,    // 装饰动作起点（相对本式起点）
  push: 1.03,      // 整框极缓推 1→1.03（linear，落位后起、退场前止，末速非零）
  hold: 1.85,      // 巡演时每式的退场起点（相对起点）；成片经 hold prop 传口播句长
  exit: 0.35,      // 退场：opacity→0 + scale→.98（power2.in）
  per: 2.2,        // 巡演每式总长
  tourStart: 0.3,
  ink: "#1d1d1f",  // 装饰线 / 装饰字的墨色（进片换 theme ink）
};
/* 时间表（tour，s）：0.3 起每 2.2s 一式，顺序 = FRAMES；每式内 +0–0.45 落位 · +0.5 起装饰接力（各式 0.3~1.35s）· +0.45–1.85 极缓推 · +1.85–2.2 退场
   单式（成片）：从 0 起同一节拍，hold = 句长；END = hold + exit */
export const durationFor = (frame: Frame | "tour", hold = CONFIG.hold) =>
  frame === "tour" ? meta.durationInFrames : Math.round((hold + CONFIG.exit + 0.1) * FPS);

// —— 缓动与 tween helper（对照 GSAP 名字）——
type Ease = (x: number) => number;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: Ease) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear: Ease = (x) => x;
const power2In: Ease = (x) => x * x * x;
const power2Out: Ease = (x) => 1 - Math.pow(1 - x, 3);
const power2InOut: Ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const power3Out: Ease = (x) => 1 - Math.pow(1 - x, 4);

const MONO = '"SF Mono", Menlo, monospace';

// 每式的落位几何（960×540 舞台）与入场差异
const GEO: Record<Frame, { x: number; y: number; w: number; h: number; rot?: number; fromY?: number }> = {
  "browser-retro": { x: 80, y: 38, w: 800, h: 464 },
  magazine: { x: 120, y: 60, w: 720, h: 420 },
  film: { x: 0, y: 36, w: 960, h: 468 },
  polaroid: { x: 160, y: 14, w: 640, h: 512, rot: -1.5, fromY: 24 },
  blueprint: { x: 96, y: 54, w: 768, h: 432 },
  laptop: { x: 70, y: 34, w: 820, h: 476 },
  stamp: { x: 96, y: 44, w: 768, h: 452 },
  hairline: { x: 96, y: 54, w: 768, h: 432 },
};
/** 舞台底色：邮票的白边要靠极浅灰显形，其余白底 */
export const STAGE_BG = (kind: Frame) => (kind === "stamp" ? "#f0f0f2" : "#ffffff");
/** 每式的装饰文字默认值（是装饰不是信息，进片可换）：[label, sub] */
export const LABELS: Record<Frame, [string, string]> = {
  "browser-retro": ["Untitled", "http://"],
  magazine: ["FIG. 01  —  SCREEN RECORDING", "024"],
  film: ["24", "KODAK 400"],
  blueprint: ["768", "SCALE 1 : 1 · FIG A"],
  polaroid: ["", ""], laptop: ["", ""], stamp: ["", ""], hairline: ["", ""],
};

// 占位：没有 src 时的灰阶画面 + 匀速斜纹（让"里面在放东西"成立；不属于动效本体）
const Placeholder: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #d9d9de, #b9b9c0)", overflow: "hidden" }}>
    <div style={{
      position: "absolute", inset: -200, opacity: 0.35,
      background: "repeating-linear-gradient(45deg, transparent 0 28px, rgba(255,255,255,.6) 28px 34px)",
      transform: `translateX(${(t * 26) % 48}px)`,
    }} />
  </div>
);
// 视频画面：零处理（不滤镜 / 不缩放 / 不淡入淡出）
const Video: React.FC<{ src?: string; t: number }> = ({ src, t }) =>
  src ? <OffthreadVideo src={src} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <Placeholder t={t} />;

const bevel: React.CSSProperties = { position: "absolute", background: "#dcdcdc", border: "1px solid #222", boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #888", boxSizing: "border-box" };
const dash = (p: number) => ({ pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - p });

type Ctx = { t: number; src?: string; label: string; sub: string; d: (at: number, dur: number, ease: Ease) => number };

// 八式各自的"物"——只有造型与装饰接力不同，落位 / 极缓推 / 退场在 Slot 里统一
const KIND: Record<Frame, (c: Ctx) => React.ReactNode> = {
  // I · 复古浏览器（Mac OS 9 铂金窗口）：条纹标题栏 + 三只方钮、斜面导航钮 + 白地址栏、状态条 + 右下拖拽纹；落位后静置
  "browser-retro": ({ t, src, label, sub }) => (
    <div style={{ position: "absolute", inset: 0, background: "#dcdcdc", border: "1px solid #000", boxSizing: "border-box",
      boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #7a7a7a, 0 14px 40px rgba(0,0,0,.25)", fontFamily: 'Charcoal, "Lucida Grande", Geneva, sans-serif' }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 22, background: "repeating-linear-gradient(180deg,#ececec 0 1px,#c9c9c9 1px 2px)", borderBottom: "1px solid #000" }}>
        <div style={{ ...bevel, left: 6, top: 4, width: 12, height: 12 }} />
        <div style={{ ...bevel, right: 24, top: 4, width: 12, height: 12 }} />
        <div style={{ ...bevel, right: 6, top: 4, width: 12, height: 12 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>
          <span style={{ background: "#dcdcdc", padding: "0 8px" }}>{label}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 23, height: 30, borderBottom: "1px solid #8a8a8a", display: "flex", alignItems: "center", gap: 6, padding: "0 8px", boxSizing: "border-box" }}>
        <span style={{ ...bevel, position: "relative", display: "inline-block", width: 22, height: 18 }} />
        <span style={{ ...bevel, position: "relative", display: "inline-block", width: 22, height: 18 }} />
        <div style={{ flex: 1, height: 18, background: "#fff", border: "1px solid #555", boxShadow: "inset 1px 1px 0 #999", fontSize: 11, lineHeight: "16px", padding: "0 6px", color: "#777", boxSizing: "border-box" }}>{sub}</div>
      </div>
      <div style={{ position: "absolute", left: 8, right: 8, top: 62, bottom: 24, background: "#111", border: "1px solid #555", boxShadow: "inset 1px 1px 0 #333", overflow: "hidden" }}><Video src={src} t={t} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 16, borderTop: "1px solid #8a8a8a" }}>
        <div style={{ position: "absolute", right: 3, bottom: 3, width: 11, height: 11, background: "repeating-linear-gradient(135deg,#777 0 1px,transparent 1px 3px)" }} />
      </div>
    </div>
  ),
  // J · 杂志相框：通栏 1px 细线 + 小号字距图注 + 衬线页码 + 短线；纸面留白当边框，没有描边
  magazine: ({ t, src, label, sub, d }) => {
    const rule = d(0, 0.4, power3Out), cap = d(0.15, 0.3, linear), rule2 = d(0.2, 0.3, power3Out);
    return (
      <>
        <div style={{ position: "absolute", left: 0, top: 0, fontSize: 11, letterSpacing: 2.5, color: CONFIG.ink, opacity: cap, whiteSpace: "pre" }}>{label}</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 20, height: 1, background: CONFIG.ink, transform: `scaleX(${rule})`, transformOrigin: "left" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 32, height: 360, overflow: "hidden", background: "#111" }}><Video src={src} t={t} /></div>
        <div style={{ position: "absolute", right: 0, bottom: 0, fontFamily: 'Georgia, "Songti SC", serif', fontSize: 12, letterSpacing: 1, color: CONFIG.ink, opacity: cap }}>{sub}</div>
        <div style={{ position: "absolute", left: 0, bottom: 6, width: 36, height: 1, background: CONFIG.ink, transform: `scaleX(${rule2})`, transformOrigin: "left" }} />
      </>
    );
  },
  // K · 35mm 胶片：通幅深色胶片带 + 上下两排齿孔（孔 = 舞台底色）+ 琥珀色片号；落位后静置（浅底上唯一的深 tile）
  film: ({ t, src, label, sub }) => (
    <div style={{ position: "absolute", inset: 0, background: "#141414" }}>
      {[10, 432].map((top) => (
        <div key={top} style={{ position: "absolute", left: 0, right: 0, top, height: 26 }}>
          {Array.from({ length: 20 }, (_, i) => 15 + i * 48).map((x) => (
            <span key={x} style={{ position: "absolute", left: x, top: 0, width: 18, height: 26, borderRadius: 3, background: STAGE_BG("film") }} />
          ))}
        </div>
      ))}
      <div style={{ position: "absolute", left: 130, top: 54, width: 700, height: 352, borderRadius: 3, overflow: "hidden", background: "#111" }}><Video src={src} t={t} /></div>
      <div style={{ position: "absolute", left: 132, top: 412, fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: "#e0a030" }}>{label}</div>
      <div style={{ position: "absolute", right: 132, top: 412, fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: "#e0a030" }}>{sub}</div>
    </div>
  ),
  // L · 拍立得：白卡厚底边（下 96）+ 固定倾斜 −1.5° + 软投影；从上方 24px 落下，不弹不摆
  polaroid: ({ t, src }) => (
    <div style={{ position: "absolute", inset: 0, background: "#fff", boxShadow: "0 0 0 1px #e5e5ea, 0 18px 50px rgba(0,0,0,.22)" }}>
      <div style={{ position: "absolute", left: 24, right: 24, top: 24, height: 392, overflow: "hidden", background: "#111" }}><Video src={src} t={t} /></div>
    </div>
  ),
  // M · 工程图纸：内外双线 + 四角十字 + 顶部尺寸线 + 96px 刻度 + 等宽小字；外线机器一笔画 → 十字 → 尺寸线 → 刻度 → 小字，错峰接力
  blueprint: ({ t, src, label, sub, d }) => {
    const outer = d(0, 0.6, power2InOut), dim = d(0.65, 0.4, power2InOut), ticks = d(0.85, 0.3, linear), lbl = d(1.05, 0.3, linear);
    const ticksD = [136, 232, 328, 424, 520, 616, 712].map((x) => `M ${x} 26 V 32`).join(" ");
    const crosses = ["M 26 14 V 38 M 14 26 H 38", "M 822 14 V 38 M 810 26 H 834", "M 822 474 V 498 M 810 486 H 834", "M 26 474 V 498 M 14 486 H 38"];
    return (
      <>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#111", boxShadow: `0 0 0 1px ${CONFIG.ink}` }}><Video src={src} t={t} /></div>
        <svg viewBox="0 0 848 512" style={{ position: "absolute", left: -40, top: -40, width: 848, height: 512, overflow: "visible", fill: "none", stroke: CONFIG.ink, strokeWidth: 1 }}>
          <rect x={26} y={26} width={796} height={460} {...dash(outer)} />
          {crosses.map((dd, i) => <path key={i} d={dd} {...dash(d(0.45 + i * 0.06, 0.25, power2Out))} />)}
          <path d="M 40 10 H 808 M 40 6 V 14 M 808 6 V 14" {...dash(dim)} />
          <path d={ticksD} {...dash(ticks)} />
          <text x={424} y={7} fontFamily={MONO} fontSize={9} textAnchor="middle" fill={CONFIG.ink} stroke="none" opacity={lbl}>{label}</text>
          <text x={26} y={508} fontFamily={MONO} fontSize={9} letterSpacing={1} fill={CONFIG.ink} stroke="none" opacity={lbl}>{sub}</text>
        </svg>
      </>
    );
  },
  // N · 笔记本设备框：深色屏框圆角 18 + 摄像头点 + 更宽的机身底座带中央缺口；落位后静置
  laptop: ({ t, src }) => (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 446, background: "#1c1c1e", borderRadius: 18, boxShadow: "0 0 0 1px #3a3a3c, 0 16px 50px rgba(0,0,0,.28)" }}>
        <div style={{ position: "absolute", left: "50%", top: 9, width: 6, height: 6, marginLeft: -3, borderRadius: 3, background: "#050505", boxShadow: "inset 0 0 0 1px #2c2c2e" }} />
        <div style={{ position: "absolute", left: 16, right: 16, top: 22, bottom: 16, borderRadius: 6, overflow: "hidden", background: "#111" }}><Video src={src} t={t} /></div>
      </div>
      <div style={{ position: "absolute", left: -20, right: -20, bottom: 8, height: 22, background: "linear-gradient(180deg,#3a3a3c,#2a2a2c)", borderRadius: "0 0 14px 14px", boxShadow: "0 6px 20px rgba(0,0,0,.25)" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, width: 120, height: 8, marginLeft: -60, background: "#1c1c1e", borderRadius: "0 0 8px 8px" }} />
      </div>
    </>
  ),
  // O · 邮票齿边：白色厚边 22 + 四边半圆齿孔（孔 = 舞台底色，舞台改极浅灰）；落位后静置
  stamp: ({ t, src }) => {
    const dot = `radial-gradient(circle, ${STAGE_BG("stamp")} 5px, transparent 5.5px)`;
    return (
      <div style={{ position: "absolute", inset: 0, background: "#fff", boxShadow: "0 10px 40px rgba(0,0,0,.14)" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: -6, height: 12, background: `${dot} 6px 0 / 24px 12px repeat-x` }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -6, height: 12, background: `${dot} 6px 0 / 24px 12px repeat-x` }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: -6, width: 12, background: `${dot} 0 6px / 12px 24px repeat-y` }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, right: -6, width: 12, background: `${dot} 0 6px / 12px 24px repeat-y` }} />
        <div style={{ position: "absolute", inset: 22, overflow: "hidden", background: "#111" }}><Video src={src} t={t} /></div>
      </div>
    );
  },
  // B · 双发丝线 + 四角短标：画面圆角 12 + 发丝线，外扩 14 再一圈淡线（淡入），四角短标依次描出
  hairline: ({ t, src, d }) => {
    const ticks = ["M 0 30 V 24 Q 0 0 24 0 H 30", "M 766 0 H 772 Q 796 0 796 24 V 30", "M 796 430 V 436 Q 796 460 772 460 H 766", "M 30 460 H 24 Q 0 460 0 436 V 430"];
    return (
      <>
        <div style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", background: "#111", boxShadow: "0 0 0 1px #d2d2d7" }}><Video src={src} t={t} /></div>
        <div style={{ position: "absolute", inset: -14, borderRadius: 24, boxShadow: "0 0 0 1px #e3e3e8", opacity: d(0, 0.3, linear) }} />
        <svg viewBox="0 0 796 460" style={{ position: "absolute", left: -14, top: -14, width: 796, height: 460, overflow: "visible", fill: "none", stroke: CONFIG.ink, strokeWidth: 2, strokeLinecap: "round" }}>
          {ticks.map((dd, i) => <path key={i} d={dd} {...dash(d(0.15 + i * 0.06, 0.25, power2Out))} />)}
        </svg>
      </>
    );
  },
};

// 一式的完整节拍：落位 → 装饰接力 → 整框极缓推 → 退场（八式共用；t = 相对本式起点的秒）
const Slot: React.FC<{ t: number; kind: Frame; src?: string; label: string; sub: string; hold: number }> = ({ t, kind, src, label, sub, hold }) => {
  const g = GEO[kind];
  const land = tw(t, 0, CONFIG.landIn, power3Out);
  const outP = tw(t, hold, CONFIG.exit, power2In);
  const push = lerp(1, CONFIG.push, tw(t, CONFIG.landIn, Math.max(0.1, hold - CONFIG.landIn), linear));
  const scale = lerp(lerp(0.96, 1, land) * push, 0.98, outP);
  const d = (at: number, dur: number, ease: Ease) => tw(t, CONFIG.decorAt + at, dur, ease);
  return (
    <div style={{
      position: "absolute", left: g.x, top: g.y, width: g.w, height: g.h, opacity: land * (1 - outP), transformOrigin: "50% 50%",
      transform: `translateY(${lerp(g.fromY ?? 16, 0, land).toFixed(2)}px) rotate(${g.rot ?? 0}deg) scale(${scale.toFixed(4)})`,
    }}>
      {KIND[kind]({ t, src, label, sub, d })}
    </div>
  );
};

export default function VideoThemeFrame({
  frame = "tour", src, label, sub, hold = CONFIG.hold,
}: { frame?: Frame | "tour"; src?: string; label?: string; sub?: string; hold?: number }) {
  const t = useCurrentFrame() / FPS;
  const tour = frame === "tour";
  const k = tour ? Math.min(FRAMES.length - 1, Math.max(0, Math.floor((t - CONFIG.tourStart) / CONFIG.per))) : 0;
  const kind: Frame = tour ? FRAMES[k] : frame;
  const start = tour ? CONFIG.tourStart + k * CONFIG.per : 0;
  const rel = t - start;
  return (
    <AbsoluteFill style={{ background: STAGE_BG(kind), overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      {rel >= 0 && (
        // Sequence 让 OffthreadVideo 从本式起点起播：视频与框同帧出现，不存在"框还没到画面已经在放"的错位
        <Sequence from={Math.round(start * FPS)} layout="none">
          <Slot t={rel} kind={kind} src={src} label={label ?? LABELS[kind][0]} sub={sub ?? LABELS[kind][1]} hold={tour ? CONFIG.hold : hold} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}
