import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// split-60-40-story · 60/40 主从分屏 —— 自包含 Remotion 源码（与 demos/split-60-40-story/index.html 同画面）
// 左 60% 一条素材缓推做主（录屏 / 实拍 / 大图 / 口播本人），右 40% 标题 + 三枚要点 chip 按口播逐枚弹出，chip 底板三种淡色区分。
// 复制本文件进你的工程即可用；左格素材经 src 注入（B-roll 视频），或经 hostSrc 注入口播本人（alpha 视频，优先于 src）；都不传 = footage 占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 216 };   // 6.8s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 左格缓推 duration = 镜头时长（速率恒定，末速非零）；② chip 按口播逐枚弹出（0.6s 一枚、back.out 过冲）；
//      ③ 右栏左边缘吸附同一栏线、chip 同高同 padding、≤4 条；④ 字与画同起同收：素材、中缝、字全部在 end 收齐。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  split: 576,         // 左格宽（60%）；右 40% 永远是文字
  seam: 3,            // 中缝 px（白）
  push: 1.06,         // 左格素材缓推终点：1→1.06，duration = 镜头时长（匀速）
  titleIn: 0.3,       // 标题入场 s（0.5s power3.out，y 12→0）
  chipAt: 1.0,        // 第一枚 chip 弹出 s
  gap: 0.6,           // chip 间隔（口播逐条的节奏；0.5~0.7）
  pop: 0.45,          // 单枚弹出时长（back.out(1.7)：scale .9→1、y 10→0）
  exit: 0.4,          // 退场时长（power2.in）
  stagger: 0.04,      // 文字组退场错峰（尾对齐：标题先走、最后一枚 chip 与素材同帧收完）
  end: 6.8,           // 镜头结束：素材、中缝、字全部在此收齐
  driftSpeed: 40,     // footage 占位的亮带漂移速度 px/s（仅演示占位）
};

/* 时间表（demo 秒）
   0.00–6.80  左格素材 scale 1→1.06（linear，duration = 镜头）；占位亮带 40px/s 匀速漂移
   0.30–0.80  标题升入（opacity 0→1、y 12→0，power3.out）
   1.00 / 1.60 / 2.20  三枚 chip 逐枚弹出（0.45s back.out(1.7)：scale .9→1、y 10→0）
   6.28 / 6.32 / 6.36 / 6.40  标题、chip①②③ 依次退场 0.4s（power2.in，尾对齐 6.68–6.80）
   6.40–6.80  左格素材 + 中缝退场（power2.in）——与最后一枚 chip 同帧收完 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const backOut = (s = 1.70158) => (x: number) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 s64- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.s64-ph { position: absolute; overflow: hidden; }
.s64-ph::before { content: ""; position: absolute; inset: 0; }
.s64-ph.t3::before { background: linear-gradient(160deg, #9fb9ae, #789389); }
.s64-ph svg { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.s64-ph .s64-drift {
  position: absolute; top: 0; bottom: 0; left: -150%; width: 400%;
  background: repeating-linear-gradient(112deg,
    rgba(255,255,255,0) 0 70px, rgba(255,255,255,.16) 70px 150px,
    rgba(255,255,255,0) 150px 260px, rgba(255,255,255,.12) 260px 320px,
    rgba(255,255,255,0) 320px 420px, rgba(255,255,255,.18) 420px 540px,
    rgba(255,255,255,0) 540px 640px);
}
.s64-pane { position: absolute; left: 0; top: 0; width: 576px; height: 540px; overflow: hidden; }
.s64-cam { position: absolute; inset: 0; will-change: transform; }
.s64-cam .s64-ph { inset: 0; }
.s64-vline { position: absolute; left: 576px; top: 0; width: 3px; height: 540px; background: #ffffff; }
.s64-ttl { position: absolute; left: 620px; top: 78px; font-size: 30px; font-weight: 700; color: #1d1d1f; line-height: 1.3; }
.s64-chip { position: absolute; left: 620px; padding: 10px 20px; border-radius: 14px; font-size: 24px; font-weight: 700; color: #1d1d1f; white-space: nowrap; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

/** 人物（演示语境素材）：hostSrc 传 alpha 视频，站在左格底部（视频高 = 格高 88%） */
const Host: React.FC<{ src: string }> = ({ src }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "#fff" }}>
    <Loop durationInFrames={13 * FPS}>
      <OffthreadVideo src={src} muted transparent style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", height: "88%" }} />
    </Loop>
  </div>
);

type Props = {
  /** 左格 B-roll 视频（cover 铺满左格）；不传 = footage 占位 */
  src?: string;
  /** 左格放口播本人（alpha 视频）；传了就渲人物而不是 src / 占位 */
  hostSrc?: string;
  /** 标题（每项一行） */
  title?: string[];
  /** 三枚要点 chip 文案 */
  chips?: string[];
  /** chip 底板色（pastel，同组不重复；见 layout.md §7） */
  chipBg?: string[];
};

const CHIP_TOP = [216, 290, 364];

export default function Split6040Story({ src, hostSrc, title = ["它一晚上", "干了三件事"], chips = ["读完 40 份资料", "写好三版初稿", "跑测试 修 bug"], chipBg = ["#E8F0FF", "#FFE9F0", "#E6F7F2"] }: Props) {
  const t = useCurrentFrame() / FPS;
  const n = Math.min(chips.length, CHIP_TOP.length);

  // 左格缓推（duration = 镜头）+ 素材 / 中缝同收
  const camScale = lerp(1, CONFIG.push, tw(t, 0, CONFIG.end, linear));
  const mediaOp = 1 - tw(t, CONFIG.end - CONFIG.exit, CONFIG.exit, power2In);

  // 文字组退场：尾对齐（标题先走，最后一枚 chip 与素材同帧收完）
  const textOut0 = CONFIG.end - CONFIG.exit - n * CONFIG.stagger;
  const outK = (i: number) => 1 - tw(t, textOut0 + i * CONFIG.stagger, CONFIG.exit, power2In);

  const ttlP = tw(t, CONFIG.titleIn, 0.5, power3Out);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      {/* 左格 60%：素材在格内缓推 */}
      <div className="s64-pane" data-crop-ok style={{ opacity: mediaOp }}>
        <div className="s64-cam" style={{ transform: `scale(${camScale})`, transformOrigin: "50% 50%" }}>
          {hostSrc ? (
            <Host src={hostSrc} />
          ) : src ? (
            <OffthreadVideo src={src} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div className="s64-ph t3">
              <div className="s64-drift" style={{ transform: `translateX(${-CONFIG.driftSpeed * t}px)` }} />
              {GLYPH}
            </div>
          )}
        </div>
      </div>
      {/* 中缝 3px 白 */}
      <div className="s64-vline" style={{ opacity: mediaOp }} />
      {/* 右格 40%：标题 + 三枚 chip，左边缘吸附同一栏线 x=620 */}
      <div className="s64-ttl" style={{ opacity: ttlP * outK(0), transform: `translateY(${lerp(12, 0, ttlP)}px)` }}>
        {title.map((s, i) => <React.Fragment key={i}>{i > 0 && <br />}{s}</React.Fragment>)}
      </div>
      {chips.slice(0, n).map((s, i) => {
        const p = tw(t, CONFIG.chipAt + i * CONFIG.gap, CONFIG.pop, backOut(1.7));
        return (
          <div key={i} className="s64-chip" style={{ top: CHIP_TOP[i], background: chipBg[i % chipBg.length], opacity: clamp01(p) * outK(i + 1),
            transform: `translateY(${lerp(10, 0, p)}px) scale(${lerp(0.9, 1, p)})`, transformOrigin: "50% 50%" }}>{s}</div>
        );
      })}
    </AbsoluteFill>
  );
}
