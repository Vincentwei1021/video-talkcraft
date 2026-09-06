import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// chapter-title-card · 章节标题卡 —— 自包含 Remotion 源码（与 demos/chapter-title-card/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
// 2026-09-07 加「章节主题层」：每章一套主题色（bg / ink / accent）+ 一个与本章内容相关的线稿 motif（L6 背景层，
// 色块盖屏后立即描画、比文字组慢 0.6× 漂移），章节名下一条 accent 短线在名字揭示完后长出——四张章节卡不再是同一块色板。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 201 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
const CONFIG = {
  wipeIn: 0.3,      // 色块扫入盖屏 s（power4.inOut）
  numIn: 0.4,       // 编号落位 s（scale 1.3→1）
  nameIn: 0.35,     // 章节名遮罩揭示 s
  subDelay: 0.1,    // 小字比章节名再晚一拍
  hold: 1.2,        // 停留 s（带极缓漂移防呆滞）
  driftPx: 10,      // hold 期间整组横向漂移量 px
  wipeOut: 0.3,     // 色块继续向右扫出 s
  gapBetween: 0.7,  // 两张章节卡之间回到口播的间隔 s
  motifIn: 0.5,     // 主题 motif 描画 s（色块盖屏后 +0.05 起，dashoffset 1→0，power2.inOut）
  motifOpacity: 0.14, // motif 不透明度（0.12~0.18：是纹样不是图标，不能抢编号）
  motifParallax: 0.6, // motif 漂移 = 文字组漂移 × 0.6（背景更慢 = 深度）
  ruleIn: 0.25,     // 章节名下 accent 短线 scaleX 0→1 s（名字揭示完后接上）
};

/* 时间表（demo 秒）——单卡节拍（at = 卡起点）：
   at+0.00–0.30  色块 xPercent -100→0 扫入（power4.inOut）
   at+0.35–0.85  motif 线稿描画（L6 背景，不参与下面三层的错峰）
   at+0.30–0.70  编号 opacity 0→1 + scale 1.3→1（power3.out）
   at+0.48–0.83  章节名 clip 从左揭示（power3.out）
   at+0.83–1.08  accent 短线 scaleX 0→1（power3.out）
   at+0.66–0.96  小字 opacity 0→1 + x -14→0（power1.out）
   at+0.30–2.00  编号 + 文字组 x 0→10 极缓漂移（linear）；motif ×0.6
   at+2.25–2.55  色块 xPercent 0→100 扫出（power4.in）
   卡① at=0.5；卡② at=0.5+2.55+0.7=3.75；有限动画结束 6.3s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power4In = (x: number) => Math.pow(x, 5);
const power4InOut = (x: number) =>
  x < 0.5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2;

/** 一章一套主题：底色 / 字色 / 强调色 + 与本章内容相关的线稿 motif（200×200 viewBox 的 path d 列表） */
export type ChapterTheme = { bg: string; ink: string; accent: string; motif: string[] };

// demo 主题：中性灰阶两档（复用时换成本片色板派生的四套章色）；motif 是示例——
// 01「泡沫是怎么吹起来的」= 一颗上升的泡 + 上扬曲线；02「谁在最后一刻离场」= 门框 + 出门箭头
export const DEMO_THEMES: ChapterTheme[] = [
  { bg: "#1d1d1f", ink: "#ffffff", accent: "#9a9aa0",
    motif: ["M 20 170 C 60 160, 90 120, 120 70 S 165 30, 185 24", "M 130 60 a 34 34 0 1 0 0.1 0", "M 118 46 a 6 6 0 1 0 0.1 0"] },
  { bg: "#55565a", ink: "#ffffff", accent: "#d1d1d6",
    motif: ["M 40 30 H 130 V 180 H 40 Z", "M 92 105 H 178", "M 156 84 L 178 105 L 156 126"] },
];

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

// —— 口播语境：主持人讲话 → 色块压入 → 章节卡 → 切回 ——
const CSS = `
.chapter-card {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 34px;
  overflow: hidden;
}
.chapter-motif {                              /* L6 主题纹样：右下 1/4、屏高 ≈45%、低不透明度 */
  position: absolute;
  right: 3%;
  top: 60%;                                    /* 上缘在文字组（编号 / 章节名 / 小字）之下，不相交 */
  width: 240px;                                /* ≈ 屏高 45%，右下 1/4，下缘允许出画 */
  height: 240px;
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.chapter-num {
  font-family: Georgia, "Songti SC", serif;   /* 超大编号：衬线更有章节感 */
  font-size: 216px;                            /* 约屏高 40% */
  font-weight: 700;
  line-height: 1;
  position: relative;
}
.chapter-text { overflow: hidden; }            /* 章节名遮罩容器 */
.chapter-name {
  font-size: 44px;
  font-weight: 700;
  letter-spacing: 4px;
}
.chapter-rule {                                /* 章节名下的 accent 短线：一章一色的"签名" */
  width: 72px;
  height: 3px;
  margin-top: 12px;
  transform-origin: left center;
}
.chapter-sub {
  margin-top: 12px;
  font-size: 15px;
  letter-spacing: 6px;
  opacity: 0.6;
}
`;

// 单张章节卡的完整节拍：压入 → motif 描画（背景）→ 编号 → 章节名 → accent 短线 → 小字 → 漂移 hold → 扫出
const ChapterCard: React.FC<{
  t: number; at: number; theme: ChapterTheme; num: string; name: string; sub: string;
}> = ({ t, at, theme, num, name, sub }) => {
  // 色块扫入 → 扫出（同方向）
  const inP = tw(t, at, CONFIG.wipeIn, power4InOut);
  const outAt = at + CONFIG.wipeIn + CONFIG.numIn + CONFIG.nameIn + CONFIG.hold;
  const outP = tw(t, outAt, CONFIG.wipeOut, power4In);
  const xPercent = t < outAt ? lerp(-100, 0, inP) : lerp(0, 100, outP);

  // motif：色块盖屏后立即描画（背景层，不参与三层错峰）——各段接力、每段各自 power2.inOut（与 demo 逐段 tween 同）
  const motifAt = at + CONFIG.wipeIn + 0.05;
  const motifSeg = CONFIG.motifIn / theme.motif.length;
  // 编号先落位——先立骨架再上名字，层次不塌
  const numP = tw(t, at + CONFIG.wipeIn, CONFIG.numIn, power3Out);
  // 章节名从编号旁遮罩揭示
  const nameP = tw(t, at + CONFIG.wipeIn + 0.18, CONFIG.nameIn, power3Out);
  // accent 短线：名字揭示完后长出
  const ruleP = tw(t, at + CONFIG.wipeIn + 0.18 + CONFIG.nameIn, CONFIG.ruleIn, power3Out);
  // 小字再晚一拍
  const subP = tw(t, at + CONFIG.wipeIn + 0.18 + CONFIG.subDelay, 0.3, power1Out);
  // hold：整组极缓漂移，防"卡帧感"；motif 慢 0.6×
  const drift = CONFIG.driftPx * tw(t, at + CONFIG.wipeIn, CONFIG.hold + 0.5, linear);

  return (
    <div className="chapter-card" style={{ background: theme.bg, color: theme.ink, transform: `translateX(${xPercent}%)` }}>
      <svg className="chapter-motif" viewBox="0 0 200 200" style={{
        stroke: theme.ink, opacity: CONFIG.motifOpacity,
        transform: `translateX(${drift * CONFIG.motifParallax}px)`,
      }}>
        {theme.motif.map((d, i) => (
          <path key={i} d={d} pathLength={1} strokeDasharray="1 1"
            strokeDashoffset={1 - tw(t, motifAt + i * motifSeg, motifSeg, power2InOut)} />
        ))}
      </svg>
      <div className="chapter-num" style={{
        opacity: numP,
        transform: `translate(${drift}px, 0px) scale(${lerp(1.3, 1, numP)})`,
      }}>{num}</div>
      <div style={{ transform: `translateX(${drift}px)`, position: "relative" }}>
        <div className="chapter-text">
          <div className="chapter-name" style={{ clipPath: `inset(0 ${lerp(100, 0, nameP)}% 0 0)` }}>
            {name}
          </div>
        </div>
        <div className="chapter-rule" style={{ background: theme.accent, transform: `scaleX(${ruleP})` }} />
        <div className="chapter-sub" style={{
          opacity: 0.6 * subP, transform: `translateX(${lerp(-14, 0, subP)}px)`,
        }}>{sub}</div>
      </div>
    </div>
  );
};

export default function ChapterTitleCard({ hostSrc, themes = DEMO_THEMES }: { hostSrc?: string; themes?: ChapterTheme[] }) {
  const t = useCurrentFrame() / FPS;

  const oneCard = CONFIG.wipeIn + CONFIG.numIn + CONFIG.nameIn + CONFIG.hold + CONFIG.wipeOut;
  const at1 = 0.5;                                  // 章节 01
  const at2 = 0.5 + oneCard + CONFIG.gapBetween;    // 章节 02

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <Host src={hostSrc} />

      <ChapterCard t={t} at={at1} theme={themes[0]} num="01"
        name="泡沫是怎么吹起来的" sub="CHAPTER 01 · 2006—2008" />
      <ChapterCard t={t} at={at2} theme={themes[1] ?? themes[0]} num="02"
        name="谁在最后一刻离场" sub="CHAPTER 02 · 2008.09" />
    </AbsoluteFill>
  );
}
