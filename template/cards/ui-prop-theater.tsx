import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// ui-prop-theater · 界面道具剧场 —— 自包含 Remotion 源码（与 demos/ui-prop-theater/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 179 };

const FPS = meta.fps;

// ===== 可摘走的核心动画：节拍表 CONFIG.beats =====
// 纪律：界面状态只在节拍点上变，绝不匀速自动播——每个 at 就是一个口播词的时间戳。
const CONFIG = {
  // 节拍表：at = 该状态变化落在语音的第几秒；pct = 进度条跳到的目标值；
  // status = 同帧要换成的状态文案（省略 = 本拍只跳进度、不换文案）；
  // tick = 同拍勾掉的清单行序号；done = 收尾拍（完成勾弹出）
  beats: [
    { at: 0.55, pct: 17 },
    { at: 1.50, pct: 43, status: "正在解压文件…", tick: 0 },
    { at: 2.35, pct: 71, status: "正在安装依赖…", tick: 1 },
    { at: 3.60, pct: 96 },
    { at: 4.55, pct: 100, status: "安装完成", tick: 2, done: true },
  ] as { at: number; pct: number; status?: string; tick?: number; done?: boolean }[],
  initStatus: "正在下载模型包…",   // 起手状态（第一拍前就在屏，不做入场）

  jump: 0.30,        // 单段跳进时长 s：填充从上一段值跳到本段值
  swapOut: 0.12,     // 旧状态文案上移淡出
  swapIn: 0.20,      // 新状态文案下方浮入
  swapLift: 6,       // 换字位移 px
  tickDelay: 0.16,   // 勾比跳进晚一点点落地（先看见进度跳，再看见勾）
  tickDraw: 0.20,    // 勾画出时长
  rowGlow: 0.16,     // 行微亮淡入
  rowSettle: 0.50,   // 微亮回落到"已完成"底色
  donePop: 0.26,     // 完成勾弹出
  glowColor: "#f0f0f2",
  restColor: "#f7f7f8",
  accent: "#d8383a",
};

/* 时间表（demo 秒）
   0.55/1.50/2.35/3.60/4.55  进度分段跳进（各 0.3s power2.out），段与段之间画面完全静止
   1.50/2.35/4.55            状态文案换字（0.12s 上移淡出 → 0.20s 下方浮入）
   1.66/2.51/4.71            清单行打勾（勾 0.2s 画出 + 行微亮 → 0.5s 落到已完成底色）
   4.71–4.97                 完成勾弹出（back.out(2.2)）+ 勾线 0.2s 画出 → 5.55 全部落定 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};
// 颜色插值（#rrggbb）
const hexLerp = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], p))).join(",")})`;
};

// 勾线折线长度（代替 getTotalLength；demo 取 ceil(L)+2）
const polyLen = (pts: number[][]) => {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
};
const STEP_TICK = [[4.4, 10.4], [8.2, 14.2], [15.6, 6.2]];
const DONE_TICK = [[6.8, 12.4], [10.4, 16], [17.2, 8.4]];
const STEP_L = Math.ceil(polyLen(STEP_TICK)) + 2;   // = 19
const DONE_L = Math.ceil(polyLen(DONE_TICK)) + 2;   // = 18

const STEPS_DATA = [
  { label: "下载模型包", meta: "1.4 GB" },
  { label: "解压到本地目录", meta: "312 个文件" },
  { label: "安装依赖环境", meta: "18 个包" },
];

// 主持人占位：演示语境素材，不属于动效本体
const Host: React.FC<{ src?: string }> = ({ src }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex",
                alignItems: "flex-end", justifyContent: "center", background: "#fff",
                borderRadius: "50%" }}>
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

// —— 演示语境（不属于动效）：一张灰阶"安装器"卡 + 主播小窗，零装饰 ——
const CSS = `
.app-card {
  position: absolute;
  left: 180px; top: 96px;
  width: 600px;
  padding: 24px 26px 26px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #ffffff;
  color: #1d1d1f;
}
.app-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #ececef;
}
.app-icon {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: #ececef;
  display: flex; align-items: center; justify-content: center;
}
.app-icon i {
  width: 12px; height: 12px;
  border: 2px solid #8a8a8a;
  border-radius: 3px;
  display: block;
}
.app-name { font-size: 17px; font-weight: 700; letter-spacing: 1px; }
.app-ver { margin-left: auto; font-size: 13px; color: #8a8a8a; letter-spacing: 1px; }
/* 状态行：左状态文案 + 完成勾 + 右百分比读数 */
.status-row {
  display: flex;
  align-items: center;
  margin-top: 20px;
}
.status {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 1px;
}
.pct {
  margin-left: auto;
  font-size: 19px;
  font-weight: 700;
  color: #8a8a8a;
  font-variant-numeric: tabular-nums;
}
/* —— 动效本体 —— 进度条：轨道灰阶，填充是唯一的强调色 */
.bar-track {
  position: relative;
  height: 10px;
  margin-top: 14px;
  border-radius: 5px;
  background: #ececef;
  overflow: hidden;
}
.bar-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  border-radius: 5px;
  background: #d8383a;
}
/* —— 动效本体 —— 任务清单：逐项打勾 + 行微亮 */
.steps { margin-top: 22px; }
.step {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
}
.box {
  width: 18px; height: 18px;
  flex: 0 0 18px;
  border: 1.6px solid #d2d2d7;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
}
.box svg { width: 100%; height: 100%; display: block; overflow: visible; }
.s-label { font-size: 15px; letter-spacing: 0.5px; }
.s-meta { margin-left: auto; font-size: 13px; color: #b0b0b5; font-variant-numeric: tabular-nums; }
/* 完成勾（状态行内，宽度固定 → 弹出时不推挤文字） */
.done-check {
  width: 24px; height: 24px;
  flex: 0 0 24px;
  margin-left: 10px;
}
.done-check svg { width: 100%; height: 100%; display: block; }
/* 主播 PiP 小窗（演示语境） */
.host-pip {
  position: absolute;
  left: 24px; bottom: 40px;
  width: 116px; height: 116px;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  overflow: hidden;
  background: #fff;
}
`;

export default function UiPropTheater({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // —— 进度条 + 百分比读数共用一个代理值：分段跳进，段与段之间画面完全静止 ——
  let prog = 0;
  let prev = 0;
  for (const b of CONFIG.beats) {
    if (t >= b.at) prog = lerp(prev, b.pct, tw(t, b.at, CONFIG.jump, power2Out));
    prev = b.pct;
  }

  // —— 状态文案：旧的上移淡出 → 换字 → 新的从下方浮入（最后一拍换色）——
  let status = CONFIG.initStatus;
  let statusOp = 1, statusY = 0;
  let statusColor = "#1d1d1f";
  for (const b of CONFIG.beats) {
    if (b.status === undefined) continue;
    const swapAt = b.at + CONFIG.swapOut;
    if (t < b.at) break;
    if (t < swapAt) {
      // 旧文案上移淡出
      const p = tw(t, b.at, CONFIG.swapOut, power2Out);
      statusOp = 1 - p; statusY = -CONFIG.swapLift * p;
    } else {
      // 新文案浮入
      status = b.status;
      const p = tw(t, swapAt, CONFIG.swapIn, power2Out);
      statusOp = p; statusY = CONFIG.swapLift * (1 - p);
      if (b.done) statusColor = hexLerp("#1d1d1f", CONFIG.accent, tw(t, swapAt, CONFIG.swapIn, power1Out));
    }
  }

  // —— 清单逐项打勾：勾画出 + 描边转强调色 + 行微亮后落到"已完成"底色 ——
  const tickAt: (number | undefined)[] = [undefined, undefined, undefined];
  let doneAt: number | undefined;
  for (const b of CONFIG.beats) {
    if (b.tick !== undefined) tickAt[b.tick] = b.at + CONFIG.tickDelay;
    if (b.done) doneAt = b.at + CONFIG.tickDelay;
  }
  const rowStyle = (i: number) => {
    const at = tickAt[i];
    if (at === undefined || t < at) {
      return { dash: STEP_L, box: "#d2d2d7", label: "#8a8a8a", bg: "rgba(255,255,255,0)" };
    }
    const dash = STEP_L * (1 - tw(t, at, CONFIG.tickDraw, power2Out));
    const box = hexLerp("#d2d2d7", CONFIG.accent, tw(t, at, 0.14, power1Out));
    const label = hexLerp("#8a8a8a", "#1d1d1f", tw(t, at, 0.2, power1Out));
    // 行底色：透明 → 微亮 glow → 停 0.18s → 落到 rest
    const settleAt = at + CONFIG.rowGlow + 0.18;
    let bg: string;
    if (t < settleAt) {
      // GSAP 对 rgba(255,255,255,0)→#f0f0f2 同时插 RGB 与 alpha
      const p = tw(t, at, CONFIG.rowGlow, power2Out);
      bg = `rgba(${Math.round(lerp(255, 240, p))},${Math.round(lerp(255, 240, p))},${Math.round(lerp(255, 242, p))},${p.toFixed(3)})`;
    } else {
      bg = hexLerp(CONFIG.glowColor, CONFIG.restColor, tw(t, settleAt, CONFIG.rowSettle, power2Out));
    }
    return { dash, box, label, bg };
  };

  // —— 收尾拍：完成勾弹出（back.out(2.2)）+ 勾线画出 ——
  const donePopP = doneAt === undefined ? 0 : tw(t, doneAt, CONFIG.donePop, backOut(2.2));
  const doneDash = doneAt === undefined ? DONE_L
    : DONE_L * (1 - tw(t, doneAt + 0.08, CONFIG.tickDraw, power2Out));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="app-card">
        <div className="app-head">
          <div className="app-icon"><i /></div>
          <div className="app-name">Studio 安装程序</div>
          <div className="app-ver">v4.2.1</div>
        </div>

        <div className="status-row">
          <span className="status" style={{
            opacity: statusOp, color: statusColor,
            transform: `translateY(${statusY}px)`, display: "inline-block" }}>
            {status}
          </span>
          <span className="done-check" style={{
            opacity: clamp01(donePopP), transform: `scale(${lerp(0.4, 1, donePopP)})`,
            transformOrigin: "50% 50%", display: "inline-block" }}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10.6" fill="none" stroke={CONFIG.accent} strokeWidth="1.8" />
              <path d="M6.8 12.4 L10.4 16 L17.2 8.4" fill="none" stroke={CONFIG.accent}
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray={DONE_L} strokeDashoffset={doneDash} />
            </svg>
          </span>
          <span className="pct">{Math.round(prog)}%</span>
        </div>

        <div className="bar-track"><div className="bar-fill" style={{ width: `${prog}%` }} /></div>

        <div className="steps">
          {STEPS_DATA.map((s, i) => {
            const r = rowStyle(i);
            return (
              <div className="step" key={i} style={{ backgroundColor: r.bg }}>
                <span className="box" style={{ borderColor: r.box }}>
                  <svg viewBox="0 0 20 20">
                    <path d="M4.4 10.4 L8.2 14.2 L15.6 6.2" fill="none" stroke={CONFIG.accent}
                          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                          strokeDasharray={STEP_L} strokeDashoffset={r.dash} />
                  </svg>
                </span>
                <span className="s-label" style={{ color: r.label }}>{s.label}</span>
                <span className="s-meta">{s.meta}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="host-pip"><Host src={hostSrc} /></div>
    </AbsoluteFill>
  );
}
