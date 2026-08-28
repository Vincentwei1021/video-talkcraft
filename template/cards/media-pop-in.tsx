import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// media-pop-in · 素材弹入堆叠 —— 自包含 Remotion 源码（与 demos/media-pop-in/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
// 时长说明：demo 收尾是无限 idle 呼吸；本文件取有限动画结束点（1.05s）+ 2s idle 展示。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 92 };

const FPS = meta.fps;

// —— 可摘走的核心动画：白边素材 back.out 弹入 + 错峰堆叠 ——
const CONFIG = {
  popDur: 0.3,        // 单张弹入时长 s：0.25~0.35，>0.4 拖节奏
  overshoot: 1.7,     // back.out 回弹力度：越大"拍"得越重
  fromScale: 0.8,     // 起始缩放：0.8 → 1 是"拍上来"的标准行程
  stagger: 0.15,      // 张与张间隔 s：100~150ms 才有甩证据的密度感
  startDelay: 0.45,   // 等主持人说完半句再开甩
  breathe: 0.008,     // 落位后整组呼吸幅度：0 = 完全静止
  preTilt: 6,         // 入场时比落位再多歪的度数：落位收正才有"拍"的手感
};

/* 时间表（demo 秒）
   0.45/0.60/0.75  三张依次弹入：opacity 前半程（0.15s power1.out）+
                   scale 0.8→1 & 旋转收正（0.3s back.out(1.7)）
   1.25 起         整组 ±0.008 呼吸（1.6s sine.inOut yoyo 无限） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
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

// —— 演示语境（不属于动效）：主持人占位在左，右侧甩出三张灰阶假截图 ——
//    白边 + 投影是"实体素材被拍上来"的语义（动效本体的一部分），保留
const CSS = `
.host-wrap { position: absolute; left: 0; top: 0; bottom: 0; width: 46%; overflow: hidden; }
.evidence { position: absolute; left: 46%; right: 0; top: 0; bottom: 0; }
.shot {
  position: absolute;
  border: 8px solid #fff;
  border-radius: 4px;
  box-shadow: 0 12px 26px rgba(0, 0, 0, .16);
  overflow: hidden;
}
.shot-browser { width: 300px; height: 200px; left: 40px; top: 46px; background: #fafafa; }
.shot-browser .bar { height: 26px; background: #ececef; display: flex; align-items: center; gap: 5px; padding: 0 8px; }
.shot-browser .bar i { width: 8px; height: 8px; border-radius: 50%; background: #c8c8cc; }
.shot-browser .h { height: 14px; background: #8a8a8a; margin: 14px 14px 8px; border-radius: 3px; width: 70%; }
.shot-browser .l { height: 8px; background: #d2d2d7; margin: 7px 14px; border-radius: 3px; }
.shot-browser .l.s { width: 55%; }
.shot-chat { width: 240px; height: 210px; left: 190px; top: 130px; background: #f5f5f7; }
.shot-chat .msg { max-width: 72%; height: 30px; margin: 12px; border-radius: 10px; background: #ffffff; border: 1px solid #e0e0e0; }
.shot-chat .msg.me { width: 58%; margin-left: auto; background: #ececef; border-color: #e0e0e0; }
.shot-pay { width: 250px; height: 170px; left: 90px; top: 270px; background: #fff; }
.shot-pay .tick { width: 40px; height: 40px; margin: 20px auto 10px; border-radius: 50%; background: #ececef; }
.shot-pay .amt { height: 20px; width: 52%; margin: 0 auto 10px; border-radius: 4px; background: #8a8a8a; }
.shot-pay .sub { height: 8px; width: 34%; margin: 0 auto; border-radius: 4px; background: #d2d2d7; }
`;

// 三张假截图的落位旋转角（data-rot）
const ROTS = [-7, 5, -4];

export default function MediaPopIn({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // 单张弹入：透明度前半程完成，缩放/旋转带 back 回弹整程
  const shotStyle = (i: number): React.CSSProperties => {
    const at = CONFIG.startDelay + i * CONFIG.stagger;
    const op = tw(t, at, CONFIG.popDur * 0.5, power1Out);
    const p = tw(t, at, CONFIG.popDur, backOut(CONFIG.overshoot));
    return {
      opacity: op,
      transform: `rotate(${lerp(ROTS[i] - CONFIG.preTilt, ROTS[i], p)}deg) scale(${lerp(CONFIG.fromScale, 1, p)})`,
      transformOrigin: "50% 60%",
    };
  };

  // 全部落位后整组轻微呼吸（sine.inOut yoyo 无限）
  const settled = CONFIG.startDelay + 2 * CONFIG.stagger + CONFIG.popDur;
  const b0 = settled + 0.2;
  let groupScale = 1;
  if (t >= b0) {
    const cyc = (t - b0) / 1.6;
    const k = Math.floor(cyc);
    const p = cyc - k;
    const pp = k % 2 === 1 ? 1 - p : p;
    groupScale = 1 + CONFIG.breathe * sineInOut(pp);
  }

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <div className="evidence" style={{ transform: `scale(${groupScale})`, transformOrigin: "50% 50%" }}>
        <div className="shot shot-browser" style={shotStyle(0)}>
          <div className="bar"><i /><i /><i /></div>
          <div className="h" /><div className="l" /><div className="l" /><div className="l s" />
        </div>
        <div className="shot shot-chat" style={shotStyle(1)}>
          <div className="msg" />
          <div className="msg me" />
          <div className="msg" />
        </div>
        <div className="shot shot-pay" style={shotStyle(2)}>
          <div className="tick" />
          <div className="amt" />
          <div className="sub" />
        </div>
      </div>
    </AbsoluteFill>
  );
}
