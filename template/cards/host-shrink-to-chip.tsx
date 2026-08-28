import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// host-shrink-to-chip · 人物缩位让台 —— 自包含 Remotion 源码（与 demos/host-shrink-to-chip/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 114 };

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心动画：人物缩位让台（缩位 → 图形错峰入场 → 角标期，单程不回归）
// 关键工程点：裁切窗（clip-path，锁在舞台坐标系）与人物层（transform）由同一个
// 进度 t 驱动 —— 拆成两条 tween 会因缓动不同步让人脸半路出框。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  startDelay: 0.8,     // 全屏口播先站一拍，等语音说到"我先把图摆出来"
  shrink: 0.42,        // 缩位耗时 s：0.35~0.5，power2.inOut（起收都要缓）
  chipRatio: 0.18,     // 圆 chip 直径 / 屏宽
  chipInsetX: 0.042,   // chip 左边距 / 屏宽
  chipInsetBottom: 0.089, // chip 下边距 / 屏高（下角定版：圆心必须落在画面下 1/3 带内）
  chipScale: 0.72,     // 角标期人物层缩放：脸约占 chip 直径 57%（头肩取景）
  anchorX: 0.5,        // 取景锚点（映射到 chip 圆心的那个源点）/ 屏宽
  anchorY: 0.324,      // 同上 / 屏高——略低于头部中心，取景才带上肩
  gfxLag: 0.15,        // 图形相对缩位起点的错峰延迟 s：同帧出场=两边打架
  gfxIn: 0.45,         // 图形入场耗时 s（power3.out）
  gfxSlide: 90,        // 图形从对侧滑入的位移 px
  hold: 2.0,           // 角标期停留 s（实拍 = 讲完这张图，可任意延长）
};

/* 时间表（demo 秒）
   0.80–1.22  缩位：全屏 → 角标圆 chip（power2.inOut，裁切窗与人物层同进度）
   1.031–1.231 chip 描边淡入（power2.out）
   0.95–1.40  图形卡从右侧滑入（power3.out）
   1.40–3.40  角标期静置（人物锁定，只有人在动） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

// 主持人占位（本卡：背景透明——全屏态的白底会把对侧入场的图形卡糊掉）
const Host: React.FC<{ src?: string }> = ({ src }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex",
                alignItems: "flex-end", justifyContent: "center", background: "transparent" }}>
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

// —— 演示语境（不属于动效）：灰阶线框图表卡 ——
const CSS = `
.gfx {
  position: absolute;
  z-index: 2;
  right: 48px;
  top: 92px;
  width: 590px;
  padding: 22px 26px 18px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  color: #1d1d1f;
}
.gfx .gfx-head {
  font-size: 13px;
  letter-spacing: 2px;
  color: #8a8a8a;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.gfx .gfx-big {
  font-size: 30px;
  font-weight: 700;
  margin: 14px 0 2px;
  letter-spacing: 1px;
}
.gfx .gfx-note { font-size: 13px; color: #8a8a8a; }
.gfx svg { display: block; margin-top: 6px; }
`;

export default function HostShrinkToChip({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // chip 几何：一份数据同时喂给裁切窗与描边，永不错位（@960×540）
  const SW = meta.width, SH = meta.height;
  const r = (SW * CONFIG.chipRatio) / 2;
  const cx = SW * CONFIG.chipInsetX + r;
  const cy = SH - SH * CONFIG.chipInsetBottom - r;
  const chipBox = { top: cy - r, right: SW - (cx + r), bottom: SH - (cy + r), left: cx - r };
  // 缩位位移：让"取景锚点"落到 chip 圆心（缩放绕锚点做，所以位移就是两点之差）
  const dx = cx - SW * CONFIG.anchorX;
  const dy = cy - SH * CONFIG.anchorY;

  // ① 缩位进度：0 = 全屏主角，1 = 角标 chip。裁切与内容同一进度
  const p = tw(t, CONFIG.startDelay, CONFIG.shrink, power2InOut);
  const clipPath = "inset(" +
    lerp(0, chipBox.top, p).toFixed(2) + "px " +
    lerp(0, chipBox.right, p).toFixed(2) + "px " +
    lerp(0, chipBox.bottom, p).toFixed(2) + "px " +
    lerp(0, chipBox.left, p).toFixed(2) + "px round " +
    lerp(0, r, p).toFixed(2) + "px)";

  // chip 描边淡入（缩位走到 55% 时起步）
  const ringOp = tw(t, CONFIG.startDelay + CONFIG.shrink * 0.55, 0.2, power2Out);
  // ② 图形主角从对侧错峰入场（晚 0.15s，让位在前、接位在后）
  const gfxP = tw(t, CONFIG.startDelay + CONFIG.gfxLag, CONFIG.gfxIn, power3Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>

      {/* 图形主角：口播讲到的那张图（内部静态——柱子自己的生长动效属于 chart-grow 卡） */}
      <div className="gfx" style={{ opacity: gfxP, transform: `translateX(${lerp(CONFIG.gfxSlide, 0, gfxP)}px)` }}>
        <div className="gfx-head">韩国综合股价指数 · 年末收盘</div>
        <div className="gfx-big">2,398 → 4,062</div>
        <div className="gfx-note">2020—2025，五年翻了将近一倍</div>
        <svg viewBox="0 0 538 178" width="538" height="178" aria-hidden="true">
          <line x1="0" y1="30" x2="538" y2="30" stroke="#f2f2f2" />
          <line x1="0" y1="82" x2="538" y2="82" stroke="#f2f2f2" />
          <line x1="0" y1="134" x2="538" y2="134" stroke="#f2f2f2" />
          <line x1="0" y1="152" x2="538" y2="152" stroke="#d8d8d8" />
          <g fill="#dcdcdc">
            <rect x="22" y="96" width="48" height="56" />
            <rect x="106" y="78" width="48" height="74" />
            <rect x="190" y="106" width="48" height="46" />
            <rect x="274" y="66" width="48" height="86" />
            <rect x="358" y="38" width="48" height="114" />
            <rect x="442" y="18" width="48" height="134" />
          </g>
          <g fill="#b0b0b0" fontSize="11" textAnchor="middle"
             fontFamily="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif">
            <text x="46" y="170">2020</text>
            <text x="130" y="170">2021</text>
            <text x="214" y="170">2022</text>
            <text x="298" y="170">2023</text>
            <text x="382" y="170">2024</text>
            <text x="466" y="170">2025</text>
          </g>
        </svg>
      </div>

      {/* 人物裁切窗：几何全程锁在舞台坐标系里（只动 clip-path，不动 transform）
          刻意裁切特写（data-crop-ok）：全屏 → 角标圆 chip，单程不回归 */}
      <div data-crop-ok style={{ position: "absolute", inset: 0, zIndex: 3, clipPath }}>
        {/* 人物层：真正被缩放位移的那一层（transform 带着视频一起走） */}
        <div style={{
          position: "absolute", inset: 0,
          transform: `translate(${lerp(0, dx, p)}px, ${lerp(0, dy, p)}px) scale(${lerp(1, CONFIG.chipScale, p)})`,
          transformOrigin: `${CONFIG.anchorX * 100}% ${CONFIG.anchorY * 100}%`,
          willChange: "transform",
        }}>
          <Host src={hostSrc} />
        </div>
      </div>

      {/* chip 描边：白底上没有这根发丝线就读不出"头像章"的边界 */}
      <div style={{
        position: "absolute", zIndex: 4,
        left: chipBox.left, top: chipBox.top, width: r * 2, height: r * 2,
        border: "1px solid #e0e0e0", borderRadius: "50%",
        opacity: ringOp, pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
}
