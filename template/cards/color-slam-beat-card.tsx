import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// color-slam-beat-card · 纯色硬切节拍卡 —— 自包含 Remotion 源码（与 demos/color-slam-beat-card/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 215 };

const FPS = meta.fps;

// —— 可摘走的核心动画：硬切纯色底当节拍器 + 卡上元素错峰入场 ——
const CONFIG = {
  // 底色 = 本卡唯一的颜色接口。必须高饱和、**一片一色**；tint 是同色系淡色（大字"显影"起点）
  cards: [
    { bg: "#1B3CF5", tint: "#8A9BFF" },
    { bg: "#FF3B1F", tint: "#FFAE9E" },
  ],
  hostHold: 0.9,     // 口播先讲一句再硬切（真实由语音落点决定）
  developAt: 0.18,   // 硬切后多久大字从"显影"淡色变实：0 就没有显影这一拍
  developDur: 0.22,  // 变实耗时 s
  subDelay: 0.12,    // 小字戳比大字变实再晚一点
  shotDelay: 0.45,   // 大字 → 素材卡的错峰 0.2~0.5s：0 则一坨糊上来
  shotDur: 0.42,     // 素材卡升入耗时 s
  shotRise: 56,      // 素材卡从下方升入的距离 px
  shotBlur: 10,      // 模糊飞入起始模糊 px：0 = 只升不飞
  hold: 1.6,         // 停留 s（真实 1.5~5s 随口播；demo 压短）
  driftPx: 8,        // 停留期整组极缓漂移量 px：0 = 静置
  liftOut: 0.34,     // "色块整体上移让位"切出耗时 s
  gapBetween: 0.6,   // 两张卡之间回口播的间隔（仅 demo 示范节奏）
};

/* 时间表（demo 秒）——由 slamBeat 摊平：
   卡 01：0.90 硬切进（大字同帧显影态）→ 1.08 变实 → 1.20 小字 → 1.35 素材卡升入
          1.77–3.37 停留漂移 → 3.37 硬切回口播
   卡 02：3.97 硬切进 → 4.15 变实 → 4.27 小字 → 4.42 素材卡
          4.84–6.44 停留漂移 → 6.44–6.78 色块整体上移让位 → 总 6.78s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);

// 颜色插值（gsap 对 color 的补间是逐通道线性）
const hex2rgb = (h: string) => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
] as const;
const mix = (a: string, b: string, p: number) => {
  const ca = hex2rgb(a), cb = hex2rgb(b);
  return `rgb(${Math.round(lerp(ca[0], cb[0], p))}, ${Math.round(lerp(ca[1], cb[1], p))}, ${Math.round(lerp(ca[2], cb[2], p))})`;
};

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

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */
/* —— 演示语境（不属于动效）：白底口播场景，主持人占位 —— */
.scene-host { position: absolute; inset: 0; background: #ffffff; }

/* —— 动效本体 —— 满屏纯色节拍卡。
      底色是本卡的语义色：跳变本身就是节拍器，所以"高饱和一片一色"必须保留。 */
.slam-card { position: absolute; inset: 0; will-change: transform; }
.slam-inner { position: absolute; inset: 0; }

/* 左栏文字组竖向居中：行数变化不会挤到小字戳 */
.slam-text {
  position: absolute;
  left: 62px;
  top: 0;
  bottom: 0;
  width: 452px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.slam-title {
  font-size: 62px;
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: 1px;
  /* 初始色 = 同色系淡色（"显影"态），由 t 从 CONFIG.cards[i].tint 插值到白 */
}
.slam-sub {
  margin-top: 26px;
  padding-left: 4px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 5px;
  color: rgba(255, 255, 255, 0.78);
}

/* 素材卡：白边 + 深投影是"实体素材被拍上来"的语义（属于动效本体） */
.slam-shot {
  position: absolute;
  left: 528px;
  top: 96px;
  width: 372px;
  height: 348px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 26px 52px rgba(0, 0, 0, 0.30);
  overflow: hidden;
}
/* 假截图内容（演示语境）：最低限度灰阶线框 */
.shot-bar {
  height: 32px;
  background: #f0f0f2;
  border-bottom: 1px solid #e4e4e7;
  display: flex; align-items: center; gap: 6px;
  padding: 0 12px;
}
.shot-bar i { width: 9px; height: 9px; border-radius: 50%; background: #cdcdd2; }
.shot-body { padding: 22px 24px; }
.shot-h { height: 18px; width: 72%; border-radius: 4px; background: #8a8a8a; }
.shot-l { height: 10px; border-radius: 4px; background: #d9d9de; margin-top: 14px; }
.shot-l.s { width: 58%; }
.shot-l.m { width: 84%; }

.shot-bars {
  display: flex; align-items: flex-end; gap: 26px;
  height: 156px; margin-top: 26px;
  border-bottom: 1px solid #e4e4e7;
}
.shot-bars i { flex: 1; border-radius: 4px 4px 0 0; background: #d9d9de; }
.shot-bars i.hot { background: #1d1d1f; }
.shot-cap { margin-top: 12px; font-size: 12px; color: #8a8a8a; letter-spacing: 1px; }
`;

// 一张纯色节拍卡在时刻 t 的全部状态；exit: "cut"（硬切回）| "lift"（色块上移让位）
function beatState(t: number, spec: { bg: string; tint: string }, at: number, exit: "cut" | "lift") {
  const settled = at + CONFIG.shotDelay + CONFIG.shotDur;
  const out = settled + CONFIG.hold;
  const endVis = exit === "lift" ? out + CONFIG.liftOut : out;
  const visible = t >= at && t < endVis;
  // ② 大字变实（显影 → 实色），小字戳跟一拍
  const titleColor = mix(spec.tint, "#ffffff", tw(t, at + CONFIG.developAt, CONFIG.developDur, power2Out));
  const subO = tw(t, at + CONFIG.developAt + CONFIG.subDelay, 0.24, power2Out);
  // ③ 素材卡带投影升入 + 模糊飞入（与大字错峰 0.2~0.5s）
  const sp = tw(t, at + CONFIG.shotDelay, CONFIG.shotDur, power3Out);
  // ④ 停留期：元素不再做动作，只有整组极缓线性漂移（防"视频卡帧"读法）
  const innerY = lerp(0, -CONFIG.driftPx, tw(t, settled, CONFIG.hold, linear));
  // ⑤ 切出：硬切（零补间）或色块整体上移让位
  const yPct = exit === "lift" ? lerp(0, -100, tw(t, out, CONFIG.liftOut, power3Out)) : 0;
  return { visible, titleColor, subO, sp, innerY, yPct };
}

const Shot1: React.FC = () => (
  <>
    <div className="shot-bar"><i></i><i></i><i></i></div>
    <div className="shot-body">
      <div className="shot-h"></div>
      <div className="shot-l m"></div>
      <div className="shot-l"></div>
      <div className="shot-l s"></div>
      <div className="shot-l m"></div>
      <div className="shot-l"></div>
      <div className="shot-l s"></div>
    </div>
  </>
);

const Shot2: React.FC = () => (
  <>
    <div className="shot-bar"><i></i><i></i><i></i></div>
    <div className="shot-body">
      <div className="shot-h"></div>
      <div className="shot-bars">
        <i style={{ height: 46 }}></i><i style={{ height: 74 }}></i><i style={{ height: 98 }}></i><i className="hot" style={{ height: 142 }}></i>
      </div>
      <div className="shot-cap">四周内的交付量变化</div>
    </div>
  </>
);

export default function ColorSlamBeatCard({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // 卡 01：硬切进 → 停留 → 硬切回口播
  const at1 = CONFIG.hostHold;
  const end1 = at1 + CONFIG.shotDelay + CONFIG.shotDur + CONFIG.hold;   // 3.37
  const s1 = beatState(t, CONFIG.cards[0], at1, "cut");
  // 卡 02：换一个高饱和底色（一片一色）→ 停留 → 色块整体上移让位
  const at2 = end1 + CONFIG.gapBetween;
  const s2 = beatState(t, CONFIG.cards[1], at2, "lift");

  const cards = [
    { spec: CONFIG.cards[0], st: s1, title: <>不是不会用<br />是没想清楚</>, sub: "01 · 最常见的卡点", shot: <Shot1 /> },
    { spec: CONFIG.cards[1], st: s2, title: <>先定输出<br />再挑工具</>, sub: "02 · 顺序反了就白干", shot: <Shot2 /> },
  ];

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      {/* 口播场景（一直在纯色卡下层，硬切进出时露出） */}
      <div className="scene-host"><Host src={hostSrc} /></div>

      {cards.map(({ spec, st, title, sub, shot }, i) => (
        <div key={i} className="slam-card" style={{
          background: spec.bg,
          visibility: st.visible ? "visible" : "hidden",
          transform: `translateY(${st.yPct}%)`,
        }}>
          <div className="slam-inner" style={{ transform: `translateY(${st.innerY}px)` }}>
            <div className="slam-text">
              <div className="slam-title" style={{ color: st.titleColor }}>{title}</div>
              <div className="slam-sub" style={{ opacity: st.subO }}>{sub}</div>
            </div>
            <div className="slam-shot" style={{
              opacity: st.sp,
              // autoAlpha 语义：显形时用 inherit（父卡 hidden 时不得穿透）
              visibility: st.sp > 0 ? "inherit" : "hidden",
              transform: `translateY(${lerp(CONFIG.shotRise, 0, st.sp)}px)`,
              filter: `blur(${lerp(CONFIG.shotBlur, 0, st.sp)}px)`,
            }}>
              {shot}
            </div>
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
}
