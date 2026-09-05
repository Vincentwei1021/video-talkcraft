import React from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from "remotion";

// bed-echo-blur · 同源模糊底床 —— 自包含 Remotion 源码（与 demos/bed-echo-blur/index.html 同画面）
// 竖屏素材（9:16）装白边卡放右侧，同一条素材放大 + 模糊 + 压暗铺满当底床且慢放 0.5×——不用找第二条素材，颜色一定和谐。
// 复制本文件进你的工程即可用；素材经 src 注入（同一条视频渲两份：前景清晰 + 底床慢放），不传 = 帧驱动的 footage 占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 243 };   // 7.7s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 底床 blur ≥20 才读作"氛围"而不是"糊了"；② 底床慢放 0.5×（或定帧）——与前景同步的同源运动会读作重影；
//      ③ 两层速度错开：底床 1.25→1.295 极慢缓推、前景卡只 1→1.03；④ 字与画同起同收：底床 duration = 镜头时长，退场同帧收。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  echoFrom: 1.25,        // 底床起始放大（同源素材 cover 铺满后再放大，把模糊软边推出画外）
  echoRate: 0.07 / 12,   // 底床缓推速率（倍/s）：1.25 → 1.25 + rate × end ≈ 1.295；duration = 镜头，速率恒定
  echoBlur: 26,          // 底床模糊 px：≥20 才读作氛围
  echoBright: 0.45,      // 底床压暗：白字可读靠它，不靠整体透明度
  echoSat: 0.8,          // 底床去饱和
  echoSpeed: 0.5,        // 底床慢放倍率：与前景同步会重影，慢放或定帧才对
  cardIn: 0.3,           // 前景卡入场起点 s（0.6s power3.out：scale .92→1、y 22→0）
  cardPush: 1.03,        // 前景卡极缓推终点：0.9s 起匀速推到退场（与底床速度错开）
  textIn: 0.8,           // 标题行起点 s（4 行 stagger 0.11，0.5s power3.out，y 16→0）
  exitAt: 7.2,           // 文字与前景卡退场起点（0.5s power2.in）
  end: 7.7,              // 镜头结束：底床 7.3 起 0.4s 收，与字同帧收完
  driftSpeed: 40,        // footage 占位的亮带漂移速度 px/s（仅演示占位；底床副本 × echoSpeed）
};

/* 时间表（demo 秒）
   0.00–7.70  底床 scale 1.25→1.295（linear，duration = 镜头）；占位亮带匀速漂移（前景 40px/s、底床 20px/s）
   0.30–0.90  前景卡入场：opacity 0→1、scale .92→1、y 22→0（power3.out）
   0.90–7.20  前景卡极缓推 scale 1→1.03（linear）
   0.80 / 0.91 / 1.02 / 1.13  标题两行 + 来源两行逐行升入（0.5s power3.out）
   7.20–7.70  文字 + 前景卡退场（power2.in）
   7.30–7.70  底床退场（power2.in）——与字同帧收完 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 beb- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.beb-ph { position: absolute; overflow: hidden; }
.beb-ph::before { content: ""; position: absolute; inset: 0; }
.beb-ph.t1::before { background: linear-gradient(160deg, #a4b0c6, #7d8aa3); }
.beb-ph svg { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.beb-ph .beb-drift {
  position: absolute; top: 0; bottom: 0; left: -150%; width: 400%;
  background: repeating-linear-gradient(112deg,
    rgba(255,255,255,0) 0 70px, rgba(255,255,255,.16) 70px 150px,
    rgba(255,255,255,0) 150px 260px, rgba(255,255,255,.12) 260px 320px,
    rgba(255,255,255,0) 320px 420px, rgba(255,255,255,.18) 420px 540px,
    rgba(255,255,255,0) 540px 640px);
}
.beb-echo { position: absolute; inset: 0; overflow: hidden; will-change: transform; }
.beb-echo-inner { position: absolute; left: 50%; top: 50%; width: 250px; height: 444px; margin: -222px 0 0 -125px; transform: scale(3.84); }
.beb-echo-inner .beb-ph { inset: 0; }
.beb-ttl { position: absolute; left: 90px; top: 150px; width: 440px; color: #ffffff; }
.beb-ttl h4 { font-size: 40px; font-weight: 700; line-height: 1.25; letter-spacing: -0.6px; }
.beb-ttl p { font-size: 16px; color: rgba(255,255,255,.72); margin-top: 16px; line-height: 1.7; }
.beb-ttl .beb-line { display: block; }
.beb-photo { position: absolute; background: #ffffff; padding: 10px; border-radius: 12px; box-shadow: 0 12px 60px rgba(0,0,0,.22); }
.beb-photo .beb-ph { inset: 10px; border-radius: 5px; }
.beb-fgcard { left: 590px; top: 38px; width: 270px; height: 464px; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

/** 素材：传 src 铺真视频（cover；rate = 播放倍率），不传 = footage 占位（灰调渐变 + 亮带按 t 匀速漂移） */
const Footage: React.FC<{ src?: string; rate: number; t: number; style?: React.CSSProperties }> = ({ src, rate, t, style }) =>
  src ? (
    <OffthreadVideo src={src} muted playbackRate={rate} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }} />
  ) : (
    <div className="beb-ph t1" style={style}>
      <div className="beb-drift" style={{ transform: `translateX(${-CONFIG.driftSpeed * rate * t}px)` }} />
      {GLYPH}
    </div>
  );

type Props = {
  /** 竖屏素材（9:16 视频）；同一条渲两份：前景清晰 1× + 底床慢放 0.5×。不传 = footage 占位 */
  src?: string;
  /** 左侧标题两行 */
  title?: string[];
  /** 来源说明两行 */
  note?: string[];
};

export default function BedEchoBlur({ src, title = ["网友发来的", "现场画面"], note = ["手机竖拍 · 原比例 9:16 · 不留黑边", "拍摄：@海边的阿飞 · 2026-08（示意）"] }: Props) {
  const t = useCurrentFrame() / FPS;

  // 底床：极慢缓推（duration = 镜头）+ 末尾 0.4s 收
  const echoScale = lerp(CONFIG.echoFrom, CONFIG.echoFrom + CONFIG.echoRate * CONFIG.end, tw(t, 0, CONFIG.end, linear));
  const echoOp = 1 - tw(t, CONFIG.end - 0.4, 0.4, power2In);

  // 前景卡：入场（0.3–0.9）→ 极缓推（0.9–7.2）→ 与字同收
  const cardInP = tw(t, CONFIG.cardIn, 0.6, power3Out);
  const cardScale = t < 0.9 ? lerp(0.92, 1, cardInP) : lerp(1, CONFIG.cardPush, tw(t, 0.9, CONFIG.exitAt - 0.9, linear));
  const exitK = 1 - tw(t, CONFIG.exitAt, 0.5, power2In);

  // 四行文字逐行升入（stagger 0.11）
  const lines = [...title, ...note];
  const lineStyle = (i: number): React.CSSProperties => {
    const p = tw(t, CONFIG.textIn + i * 0.11, 0.5, power3Out);
    return { opacity: p * exitK, transform: `translateY(${lerp(16, 0, p)}px)` };
  };

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      {/* 底床：同源模糊放大副本（慢放 0.5×） */}
      <div className="beb-echo" style={{ opacity: echoOp, transform: `scale(${echoScale})`, transformOrigin: "50% 50%",
        filter: `blur(${CONFIG.echoBlur}px) brightness(${CONFIG.echoBright}) saturate(${CONFIG.echoSat})` }}>
        {src ? (
          <Footage src={src} rate={CONFIG.echoSpeed} t={t} />
        ) : (
          <div className="beb-echo-inner"><Footage rate={CONFIG.echoSpeed} t={t} /></div>
        )}
      </div>
      {/* 左侧标题两行 + 来源说明两行 */}
      <div className="beb-ttl">
        <h4>{title.map((s, i) => <span key={i} className="beb-line" style={lineStyle(i)}>{s}</span>)}</h4>
        <p>{note.map((s, i) => <span key={i} className="beb-line" style={lineStyle(title.length + i)}>{s}</span>)}</p>
      </div>
      {/* 前景：竖屏素材（250×444，9:16）装白边卡 */}
      <div className="beb-photo beb-fgcard" style={{ opacity: cardInP * exitK, transform: `translateY(${lerp(22, 0, cardInP)}px) scale(${cardScale})`, transformOrigin: "50% 50%" }}>
        {src ? (
          <div style={{ position: "absolute", inset: 10, borderRadius: 5, overflow: "hidden" }}><Footage src={src} rate={1} t={t} /></div>
        ) : (
          <Footage rate={1} t={t} />
        )}
      </div>
    </AbsoluteFill>
  );
}
