import React from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from "remotion";

// video-player-frame · 单视频播放器框 —— 自包含 Remotion 源码（与 demos/video-player-frame/index.html 同画面）
// 镜头里唯一主体是一段视频（录屏 / B-roll / 引用别人的成片）时，不裸贴满幅、不裸放白卡，而是装进一只"播放器"：
// 白边证据卡 + 底部播放条（播放键 → 暂停键、进度随真实播放走、时间码、章节刻度）+ 左上标题 chip + 右上来源 pill。
// 复制本文件进你的工程即可用；视频经 src 注入（不传 = 灰阶占位 + 匀速斜纹，保证"里面在放东西"）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 246 };   // END 8.1s + 0.1s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 进度条走的是真实播放进度（同一个时间源），不是装饰动画——观众会拿它对视频里的动作
//      ② 播放键先按下（punch）、进度才起步——"按下去 → 动起来"是播放器的语法，反过来是 GIF
//      ③ 播放条只在入场后 0.15s 滑上来、退场时先于框 0.2s 收——框是容器、条是控件，两者不同帧
//      ④ 视频画面本身不做任何滤镜 / 缩放动画，活由整框极缓推 1→1.03 负责
// ——————————————————————————————————————————————————————————
const CONFIG = {
  frameIn: 0.5,       // 框落位 s：opacity 0→1 + scale .96→1 + y 16→0（power3.out）
  chromeDelay: 0.15,  // 播放条比框晚多少滑上来（+12px → 0，0.35s）
  playAt: 0.5,        // 按下播放的时刻 s（键 punch 1.15→1，进度从此起步）
  clipSec: 12,        // 时间码分母（这段视频"有多长"）；进度 = (t − playAt) / clipSec
  markers: [0.35, 0.72], // 进度条上的章节刻度（比例）；进度经过时由 30% 白亮到 100%
  push: 1.03,         // 整框极缓推 1→1.03，时长 = 卡（linear，末速非零）
  radius: 16,         // 框外圆角；内容圆角 = radius − border
  border: 8,          // 白边宽（证据卡造型）
  barH: 56,           // 播放条高（含渐变 scrim）
  exitAt: 7.6,        // 退场起点：播放条先收 0.2s，框再收 0.35s
  exit: 0.35,
  chrome: "player" as "player" | "browser", // browser：顶部加三点 + 地址栏 pill（网页录屏用）
};
/* 时间表（s）：0–0.5 框落位 · 0.15–0.5 播放条滑上 · 0.5 播放键 punch、进度起步 · 0.5–7.6 进度 0→59%（12s 片）
   · 刻度 35% 在 4.7s 点亮 · 7.6–7.8 播放条收 · 7.8–8.15 框 scale→.98 + 淡出 · END 8.15 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power2In = (x: number) => x * x * x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const backOut = (x: number, s = 1.7) => { const c3 = s + 1; return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
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

export default function VideoPlayerFrame({
  src, title = "录屏 · 案例 01", source = "SOURCE · MIXKIT", startFrom = 0, chrome = CONFIG.chrome,
}: { src?: string; title?: string; source?: string; startFrom?: number; chrome?: "player" | "browser" }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  // 框：960×540 舞台上 768×432（16:9）@ (96, 40)，下方留字幕带
  const F = { x: 96, y: 40, w: 768, h: 432 };
  const inP = tw(t, 0, CONFIG.frameIn, power3Out);
  const outP = tw(t, CONFIG.exitAt + 0.2, CONFIG.exit, power2In);
  const push = lerp(1, CONFIG.push, tw(t, 0, CONFIG.exitAt + 0.2, linear));
  const frameScale = lerp(0.96, 1, inP) * push * lerp(1, 0.98, outP);
  const frameOp = inP * (1 - outP);
  const frameY = lerp(16, 0, inP);

  // 播放条：晚 chromeDelay 滑上，退场先收
  const chromeIn = tw(t, CONFIG.chromeDelay, 0.35, power3Out);
  const chromeOut = tw(t, CONFIG.exitAt, 0.2, power2In);
  const chromeOp = chromeIn * (1 - chromeOut);
  const chromeY = lerp(12, 0, chromeIn);

  // 播放：键 punch → 进度起步（同一个时间源 played）
  const playing = t >= CONFIG.playAt;
  const played = Math.max(0, t - CONFIG.playAt);
  const progress = clamp01(played / CONFIG.clipSec);
  const punch = playing ? lerp(1.15, 1, tw(t, CONFIG.playAt, 0.2, backOut)) : 1;

  const inner = { x: CONFIG.border, y: CONFIG.border, w: F.w - 2 * CONFIG.border, h: F.h - 2 * CONFIG.border };
  const trackX = 92, trackW = inner.w - 92 - 132;   // 左留播放键 / 右留时间码

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      {/* 框（证据卡造型：白边 + hairline + 唯一投影） */}
      <div style={{
        position: "absolute", left: F.x, top: F.y, width: F.w, height: F.h,
        borderRadius: CONFIG.radius, background: "#ffffff", boxShadow: "0 0 0 1px #e0e0e0, 0 12px 60px rgba(0,0,0,.22)",
        opacity: frameOp, transform: `translateY(${frameY}px) scale(${frameScale.toFixed(4)})`, transformOrigin: "50% 50%",
      }}>
        {/* browser 变体：顶部三点 + 地址栏 pill */}
        {chrome === "browser" && (
          <div style={{ position: "absolute", left: inner.x, top: inner.y, width: inner.w, height: 36, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", boxSizing: "border-box", background: "#f5f5f7", borderRadius: `${CONFIG.radius - CONFIG.border}px ${CONFIG.radius - CONFIG.border}px 0 0` }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 10, height: 10, borderRadius: 5, background: "#c9c9ce" }} />)}
            <span style={{ marginLeft: 10, flex: 1, height: 22, borderRadius: 11, background: "#ffffff", boxShadow: "inset 0 0 0 1px #e0e0e0", color: "#8a8a8a", fontSize: 12, lineHeight: "22px", padding: "0 12px", boxSizing: "border-box", overflow: "hidden", whiteSpace: "nowrap" }}>{source.toLowerCase()}</span>
          </div>
        )}
        {/* 视频内容（不做任何滤镜 / 缩放动画） */}
        <div style={{
          position: "absolute", left: inner.x, top: inner.y + (chrome === "browser" ? 36 : 0), width: inner.w, height: inner.h - (chrome === "browser" ? 36 : 0),
          borderRadius: chrome === "browser" ? `0 0 ${CONFIG.radius - CONFIG.border}px ${CONFIG.radius - CONFIG.border}px` : CONFIG.radius - CONFIG.border, overflow: "hidden", background: "#111",
        }}>
          {src ? (
            <OffthreadVideo src={src} muted startFrom={Math.round(startFrom * FPS)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : <Placeholder t={t} />}

          {/* 左上标题 chip / 右上来源 pill（player 变体） */}
          {chrome === "player" && (
            <>
              <div style={{ position: "absolute", left: 16, top: 14, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 14, fontWeight: 600, letterSpacing: 1, opacity: chromeOp, transform: `translateY(${-chromeY}px)` }}>{title}</div>
              <div style={{ position: "absolute", right: 16, top: 16, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,.18)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.35)", color: "#fff", fontSize: 11, letterSpacing: 2, opacity: chromeOp * 0.9, transform: `translateY(${-chromeY}px)` }}>{source}</div>
            </>
          )}

          {/* 底部播放条：scrim + 播放键 + 进度（真实进度）+ 时间码 */}
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0, height: CONFIG.barH,
            background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.62))",
            opacity: chromeOp, transform: `translateY(${chromeY}px)`,
          }}>
            {/* 播放 / 暂停键 */}
            <div style={{ position: "absolute", left: 22, bottom: 16, width: 34, height: 34, borderRadius: 17, background: "rgba(255,255,255,.16)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.7)", transform: `scale(${punch.toFixed(3)})` }}>
              {playing ? (
                <>
                  <span style={{ position: "absolute", left: 11, top: 10, width: 4, height: 14, borderRadius: 1, background: "#fff" }} />
                  <span style={{ position: "absolute", left: 19, top: 10, width: 4, height: 14, borderRadius: 1, background: "#fff" }} />
                </>
              ) : (
                <span style={{ position: "absolute", left: 13, top: 10, width: 0, height: 0, borderStyle: "solid", borderWidth: "7px 0 7px 11px", borderColor: "transparent transparent transparent #fff" }} />
              )}
            </div>
            {/* 进度轨 + 已播 + 刻度 + 圆钮 */}
            <div style={{ position: "absolute", left: trackX, bottom: 31, width: trackW, height: 4, borderRadius: 2, background: "rgba(255,255,255,.3)" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: 4, width: `${(progress * 100).toFixed(2)}%`, borderRadius: 2, background: "#ffffff" }} />
              {CONFIG.markers.map((m) => (
                <span key={m} style={{ position: "absolute", left: `${m * 100}%`, top: -3, width: 2, height: 10, marginLeft: -1, background: progress >= m ? "#ffffff" : "rgba(255,255,255,.3)" }} />
              ))}
              <span style={{ position: "absolute", left: `${(progress * 100).toFixed(2)}%`, top: -4, width: 12, height: 12, marginLeft: -6, borderRadius: 6, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.4)" }} />
            </div>
            {/* 时间码（等宽数字） */}
            <div style={{ position: "absolute", right: 20, bottom: 24, color: "#fff", fontSize: 13, letterSpacing: 1, fontVariantNumeric: "tabular-nums", fontFamily: '"SF Mono", Menlo, monospace', opacity: 0.92 }}>
              {fmt(played)} / {fmt(CONFIG.clipSec)}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
