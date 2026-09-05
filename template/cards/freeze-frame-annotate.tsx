import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, useCurrentFrame } from "remotion";

// freeze-frame-annotate · 定格圈注 —— 自包含 Remotion 源码（与 demos/freeze-frame-annotate/index.html 同画面）
// B-roll 正常播 1.3s，瞬时定格（配 4 帧 18% 白闪当快门）；停 8 帧后一条手绘感椭圆 8 帧描边圈住目标、箭头 6 帧点题、标签浮出；
// hold 1.6s；圈注淡出的同一帧解冻，视频 1.4× 追一秒补回时长再回正常速。定格期间画面绝对静止，只有圈和字在动。
// 复制本文件进你的工程即可用；真 B-roll 经 src 注入（时间重映射用 <Freeze> 包住 OffthreadVideo），不传 = footage 占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 189 };   // 5.9s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 定格要干脆（源时间斜率瞬间归零，任何缓入都读作卡顿）；② 定格段 ≥45 帧凝视才成立；③ 圈注对象锐利居中，画完静置不抖（用户禁 line boil）；
//      ④ 解冻用 1.4× 追一秒补回时长再回 1×（>2× 读作快进）；⑤ 一个镜头只能有一个时间操纵者。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  freezeAt: 1.3,       // 定格时刻 s（源时间从这里钉住）
  flash: 0.18,         // 快门白闪峰值（4 帧；>0.30 读作曝光事故）
  drawDelay: 0.27,     // 定格后多久开始画圈（8 帧：先让观众看到"停了"）
  draw: 0.27,          // 椭圆描边时长 s（8 帧）
  arrow: 0.2,          // 箭头时长 s（6 帧）
  hold: 1.6,           // 圈注 hold s（看清目标）
  catchup: 1.4,        // 解冻后追赶倍率
  catchupDur: 1.0,     // 追赶时长 s，之后回 1×
  exitAt: 5.5,         // 退场起点（0.4s power2.in）
  end: 5.9,            // 镜头结束
  driftSpeed: 40,      // footage 占位亮带漂移速度 px/源秒（仅演示占位）
};
// 解冻时刻 = 定格 + 画圈 + 箭头 + hold
const UNFREEZE = CONFIG.freezeAt + CONFIG.drawDelay + CONFIG.draw + CONFIG.arrow + CONFIG.hold;   // 3.64

/* 时间表（demo 秒）
   0.00–1.30  B-roll 正常播（源时间斜率 1）
   1.30       定格：源时间钉在 1.30；白闪 0.18 / 4 帧；定格徽标淡入
   1.57–1.84  椭圆 8 帧描边；1.84–2.04 箭头 6 帧；1.94–2.24 标签浮出
   3.37–3.64  圈注 / 标签 / 徽标淡出
   3.64–4.64  解冻：1.4× 追赶（源时间 1.30→2.70）；之后 1×
   5.50–5.90  退场（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/** 源时间重映射 src(t)：正常 → 钉住 → catchup× 追赶 → 回 1×（成片里就是 <Freeze frame> 的输入） */
export const srcTime = (t: number) => {
  if (t < CONFIG.freezeAt) return t;
  if (t < UNFREEZE) return CONFIG.freezeAt;
  if (t < UNFREEZE + CONFIG.catchupDur) return CONFIG.freezeAt + CONFIG.catchup * (t - UNFREEZE);
  return CONFIG.freezeAt + CONFIG.catchup * CONFIG.catchupDur + (t - UNFREEZE - CONFIG.catchupDur);
};

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 ffa- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.ffa-ph { position: absolute; inset: 0; overflow: hidden; }
.ffa-ph::before { content: ""; position: absolute; inset: 0; background: linear-gradient(160deg, #a4b0c6, #7d8aa3); }
.ffa-ph svg.ffa-glyph { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.ffa-ph .ffa-drift {
  position: absolute; top: 0; bottom: 0; left: -150%; width: 400%;
  background: repeating-linear-gradient(112deg,
    rgba(255,255,255,0) 0 70px, rgba(255,255,255,.16) 70px 150px,
    rgba(255,255,255,0) 150px 260px, rgba(255,255,255,.12) 260px 320px,
    rgba(255,255,255,0) 320px 420px, rgba(255,255,255,.18) 420px 540px,
    rgba(255,255,255,0) 540px 640px);
}
.ffa-flash { position: absolute; inset: 0; background: #ffffff; pointer-events: none; }
.ffa-anno { position: absolute; inset: 0; width: 960px; height: 540px; overflow: visible; }
.ffa-anno .ffa-ell, .ffa-anno .ffa-arr { fill: none; stroke: #ffd60a; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.ffa-lb { position: absolute; left: 92px; top: 96px; font-size: 30px; font-weight: 700; color: #ffffff; text-shadow: 0 2px 10px rgba(0,0,0,.7); }
.ffa-lb small { display: block; font-size: 16px; font-weight: 500; margin-top: 4px; color: rgba(255,255,255,.8); }
.ffa-badge { position: absolute; right: 40px; top: 30px; font-family: "SF Mono", Menlo, monospace; font-size: 14px; letter-spacing: 1.5px; color: rgba(255,255,255,.75); }
`;

// 圈注几何（demo 占位：椭圆圈住画面中心的相框图标；成片按目标 bbox 反推，经 ellipse / arrow props 覆盖）
const DEMO_ELLIPSE = "M 330 268 C 330 200, 410 168, 486 172 C 566 176, 632 216, 630 268 C 628 322, 556 366, 478 364 C 400 362, 330 330, 330 268 Z";
const DEMO_ARROW = "M 296 166 C 322 176, 346 186, 366 196 M 350 183 L 366 196 L 349 200";
// 路径长度（与 demo getTotalLength 实测一致口径；纯函数渲染不查 DOM，写死常量，换路径时同步改）
const DEMO_ELLIPSE_LEN = 786;
const DEMO_ARROW_LEN = 114;

const GLYPH = (
  <svg className="ffa-glyph" viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

const fmt = (s: number) => `FREEZE · 00:${String(Math.floor(s)).padStart(2, "0")}.${String(Math.round((s % 1) * 100)).padStart(2, "0")}`;

type Props = {
  /** 真 B-roll（cover 铺满）；不传 = footage 占位 */
  src?: string;
  /** 标签主行 / 副行 */
  label?: string;
  sub?: string;
  /** 圈注椭圆 / 箭头的 SVG path（960×540 坐标），按目标 bbox 反推；不传 = demo 圈住画面中心 */
  ellipsePath?: string;
  arrowPath?: string;
  /** 对应 path 的长度（描边动画用）；换 path 时同步给 */
  ellipseLen?: number;
  arrowLen?: number;
};

export default function FreezeFrameAnnotate({
  src, label = "注意他的左手", sub = "一直按着 ⌘，没离开过",
  ellipsePath = DEMO_ELLIPSE, arrowPath = DEMO_ARROW, ellipseLen = DEMO_ELLIPSE_LEN, arrowLen = DEMO_ARROW_LEN,
}: Props) {
  const t = useCurrentFrame() / FPS;
  const s = srcTime(t);                                   // 源时间：定格段钉住

  // 快门白闪：4 帧升到峰值、再 0.12s 落回
  const flash = CONFIG.flash * (tw(t, CONFIG.freezeAt, 0.04, power1Out) - tw(t, CONFIG.freezeAt + 0.04, 0.12, power1Out));
  // 圈注：椭圆 → 箭头 → 标签；解冻前 0.27s 一起淡出
  const drawAt = CONFIG.freezeAt + CONFIG.drawDelay;
  const ellP = tw(t, drawAt, CONFIG.draw, power1InOut);
  const arrP = tw(t, drawAt + CONFIG.draw, CONFIG.arrow, power2Out);
  const lbP = tw(t, drawAt + CONFIG.draw + 0.1, 0.3, power2Out);
  const badgeP = tw(t, CONFIG.freezeAt, 0.2, power1Out);
  const annoK = 1 - tw(t, UNFREEZE - 0.27, 0.27, power1Out);
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.end - CONFIG.exitAt, power2In);

  return (
    <AbsoluteFill style={{ background: "#1d1d1f", color: "#f5f5f7", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      {/* B-roll：真视频走 <Freeze> 时间重映射；占位 = 亮带按源时间漂移 */}
      <div style={{ position: "absolute", inset: 0, opacity: exitK }}>
        {src ? (
          <Freeze frame={Math.round(s * FPS)}>
            <OffthreadVideo src={src} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          </Freeze>
        ) : (
          <div className="ffa-ph">
            <div className="ffa-drift" style={{ transform: `translateX(${-CONFIG.driftSpeed * s}px)` }} />
            {GLYPH}
          </div>
        )}
      </div>
      <div className="ffa-flash" style={{ opacity: Math.max(0, flash) }} />
      <svg className="ffa-anno" viewBox="0 0 960 540" style={{ opacity: annoK }}>
        <path className="ffa-ell" d={ellipsePath} strokeDasharray={ellipseLen} strokeDashoffset={ellipseLen * (1 - ellP)} />
        <path className="ffa-arr" d={arrowPath} strokeDasharray={arrowLen} strokeDashoffset={arrowLen * (1 - arrP)} />
      </svg>
      <div className="ffa-lb" style={{ opacity: lbP * annoK, transform: `translateY(${lerp(6, 0, lbP)}px)` }}>
        {label}{sub ? <small>{sub}</small> : null}
      </div>
      <div className="ffa-badge" style={{ opacity: badgeP * annoK }}>{fmt(CONFIG.freezeAt)}</div>
    </AbsoluteFill>
  );
}
