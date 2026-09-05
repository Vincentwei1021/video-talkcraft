import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// rack-focus-pair · 焦点接力 —— 自包含 Remotion 源码（与 demos/rack-focus-pair/index.html 同画面）
// 两张白边卡前后叠放，永远一清一糊；讲到哪张，焦点 0.7s 转移过去——像镜头在两张之间对焦。
// 复制本文件进你的工程即可用；两张真图经 srcs 注入（[前张, 后张]，不传 = 灰调占位）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 216 };   // 6.8s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 两张永远一清一糊（同时清晰就没有"焦点"）；② 被糊的那张仍在原位不退场；
//      ③ 转移 0.7s power2.inOut（清晰 ↔ blur 8 / brightness .6，scale 1.02 ↔ .97 同步）；④ 两次转移之间 ≥1.8s。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  softBlur: 8,           // 失焦模糊 px（6~10；<5 读不出对焦，>12 素材内容认不出）
  softBright: 0.6,       // 失焦压暗（配合模糊把注意力让出去）
  sharpScale: 1.02,      // 在焦那张微放
  softScale: 0.97,       // 失焦那张微缩（两张 5% 的尺寸差 = 前后景深感）
  shift: 0.7,            // 焦点转移时长 s（power2.inOut）
  focusAt: [2.0, 4.6],   // 两次转移时刻：前→后、后→前（间隔 ≥1.8s，让观众读完一张）
  enterAt: 0.2,          // 两张入场起点 s（后张先、前张 +0.08；0.5s power3.out，y 14→0）
  exitAt: 6.4,           // 两张同收（0.4s power2.in）
  end: 6.8,              // 镜头结束
};

/* 时间表（demo 秒）
   0.20–0.70  后张入场（opacity 0→1、y 14→0，power3.out）；前张 0.28–0.78
   2.00–2.70  焦点前→后：前张 blur 0→8 / brightness 1→.6 / scale 1.02→.97，后张反向（power2.inOut）
   4.60–5.30  焦点后→前（同上反向）
   6.40–6.80  两张同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 rfp- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.rfp-ph { position: absolute; overflow: hidden; }
.rfp-ph::before { content: ""; position: absolute; inset: 0; }
.rfp-ph.t4::before { background: linear-gradient(160deg, #c2b39a, #9c8f78); }
.rfp-ph.t5::before { background: linear-gradient(160deg, #a3a9b8, #7f8594); }
.rfp-ph svg { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.rfp-photo { position: absolute; background: #ffffff; padding: 10px; border-radius: 12px; box-shadow: 0 12px 60px rgba(0,0,0,.22); will-change: transform, filter; }
.rfp-photo .rfp-ph { inset: 10px; border-radius: 5px; }
.rfp-photo .rfp-tag { position: absolute; left: 24px; bottom: 24px; background: rgba(255,255,255,.94); color: #1d1d1f; font-size: 20px; font-weight: 700; padding: 6px 14px; border-radius: 8px; white-space: nowrap; box-shadow: 0 4px 16px rgba(0,0,0,.18); }
.rfp-photo .rfp-tag.r { left: auto; right: 24px; }
.rfp-pb { left: 400px; top: 60px; width: 480px; height: 320px; }
.rfp-pf { left: 100px; top: 160px; width: 380px; height: 270px; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

/** 素材占位：灰调渐变 + 相框图标；传 src 则铺真图（object-fit cover） */
const Ph: React.FC<{ tone: 4 | 5; src?: string }> = ({ tone, src }) => (
  <div className={`rfp-ph t${tone}`}>
    {src ? <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : GLYPH}
  </div>
);

type Props = {
  /** 两张标签 [前张, 后张] */
  labels?: [string, string];
  /** 两张真图 [前张, 后张]；不传用灰调占位 */
  srcs?: [string | undefined, string | undefined];
};

export default function RackFocusPair({ labels = ["纸书", "电子书"], srcs }: Props) {
  const t = useCurrentFrame() / FPS;

  // f = 焦点在后张的程度（0 = 前张在焦，1 = 后张在焦）
  const f = tw(t, CONFIG.focusAt[0], CONFIG.shift, power2InOut) - tw(t, CONFIG.focusAt[1], CONFIG.shift, power2InOut);
  // 失焦程度 → filter / scale
  const look = (soft: number) => ({
    filter: `blur(${lerp(0, CONFIG.softBlur, soft)}px) brightness(${lerp(1, CONFIG.softBright, soft)})`,
    scale: lerp(CONFIG.sharpScale, CONFIG.softScale, soft),
  });
  const front = look(f), back = look(1 - f);

  // 入场（后张先）与同收
  const inB = tw(t, CONFIG.enterAt, 0.5, power3Out), inF = tw(t, CONFIG.enterAt + 0.08, 0.5, power3Out);
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.end - CONFIG.exitAt, power2In);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      {/* 后张（电子书）480×320 @ (400, 60) */}
      <div className="rfp-photo rfp-pb" style={{ opacity: inB * exitK, filter: back.filter, transform: `translateY(${lerp(14, 0, inB)}px) scale(${back.scale})`, transformOrigin: "50% 50%" }}>
        <Ph tone={5} src={srcs?.[1]} /><div className="rfp-tag r">{labels[1]}</div>
      </div>
      {/* 前张（纸书）380×270 @ (100, 160)，压住后张左下一角 */}
      <div className="rfp-photo rfp-pf" style={{ opacity: inF * exitK, filter: front.filter, transform: `translateY(${lerp(14, 0, inF)}px) scale(${front.scale})`, transformOrigin: "50% 50%" }}>
        <Ph tone={4} src={srcs?.[0]} /><div className="rfp-tag">{labels[0]}</div>
      </div>
    </AbsoluteFill>
  );
}
