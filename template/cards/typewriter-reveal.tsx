import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, random, useCurrentFrame } from "remotion";

// typewriter-reveal · 打字机档案戳 —— 自包含 Remotion 源码（与 demos/typewriter-reveal/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
// demo 录制 32.25s 是录制上限截断（收尾光标无限闪烁）；tsx 取有限动画结束点 + 2s idle 展示。

const FPS = 30;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
const CONFIG = {
  line1: "北京 · 2008年8月8日",
  line2: "奥运会开幕当晚，全球40亿人正在注视",
  charMs: 55,        // 每字符基准间隔 ms：30~80 像真打字，>100 像 loading
  jitterMs: 20,      // 间隔随机抖动 ±ms：0 = 匀速 = 一眼 CSS 教程
  blinkPeriod: 0.5,  // 光标闪烁周期 s（行业默认 500ms）
  blinkTimes: 3,     // 句尾闪几次再敲下一行
  line2Delay: 0.4,   // 第二行相对第一行敲完的延迟 s
  startDelay: 0.4,   // 整体起始延迟 s
};

// 逐字符时刻表（demo 用 Math.random 抖动；tsx 用 remotion.random 同 seed 同值，纯函数可回放）
const charTimes = (text: string, seed: string, at: number) => {
  let t = at;
  return Array.from(text).map((_, i) => {
    t += (CONFIG.charMs + (random(`${seed}-${i}`) * 2 - 1) * CONFIG.jitterMs) / 1000;
    return t;
  });
};

/* 时间表（demo 秒，抖动 ±20ms 为均值）
   0.40–≈1.17   第一行逐字符敲出
   ≈1.25–≈2.75  光标句尾闪 3 次（0.5s 方波）
   ≈3.15        光标移交第二行
   ≈3.15–≈4.14  第二行逐字符敲出
   ≈4.24–∞      光标常驻闪烁（周期 0.52s）→ tsx 取 +2s idle 收尾 */
const TIMES1 = charTimes(CONFIG.line1, "tw-l1", CONFIG.startDelay);
const T1_END = TIMES1[TIMES1.length - 1];
const BLINK_AT = T1_END + 0.08;                                      // 句尾闪烁起点
const BLINK_END = BLINK_AT + CONFIG.blinkTimes * CONFIG.blinkPeriod; // 闪 3 次
const T2_START = BLINK_END + CONFIG.line2Delay;                      // 光标移交第二行
const TIMES2 = charTimes(CONFIG.line2, "tw-l2", T2_START);
const T2_END = TIMES2[TIMES2.length - 1];
const LOOP_AT = T2_END + 0.1;   // 收尾常驻闪烁起点 = 有限动画结束点
// gsap to{duration:0.01, repeat:-1, repeatDelay:0.25, yoyo} ⇒ 周期 2×(0.01+0.25)=0.52s 方波
const LOOP_PERIOD = 2 * (0.01 + CONFIG.blinkPeriod / 2);

export const meta = {
  width: 960, height: 540, fps: FPS,
  durationInFrames: Math.round((LOOP_AT + 2.0) * FPS),
};

// 句尾方波闪烁：demo blink() 每周期先灭半拍再亮半拍
const blinkOpacity = (t: number, at: number, times: number) => {
  if (t < at) return 1;
  const end = at + times * CONFIG.blinkPeriod;
  if (t >= end) return 1;
  const phase = (t - at) % CONFIG.blinkPeriod;
  return phase < CONFIG.blinkPeriod / 2 ? 0 : 1;
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

// —— 演示语境（不属于动效）：主持人占左侧一列，打字机档案戳落在右侧白区下方 ——
const CSS = `
.host-wrap {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 47%;
  overflow: hidden;
}
.stamp {
  position: absolute;
  left: 48%; bottom: 112px;
  font-family: Menlo, Consolas, "Courier New", monospace;
  color: #1d1d1f;
}
.stamp .line1 { font-size: 36px; font-weight: 700; letter-spacing: 2px; }
.stamp .line2 { font-size: 18px; margin-top: 12px; color: #8a8a8a; letter-spacing: 1px; }
.stamp .cursor {
  display: inline-block;
  width: .62em; height: 1.05em;
  background: #1d1d1f;
  vertical-align: text-bottom;
  margin-left: 2px;
}
.line2 .cursor { background: #8a8a8a; }
`;

export default function TypewriterReveal({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // 已敲出的字符数 = 时刻表里 ≤ t 的项数
  const n1 = TIMES1.filter((x) => t >= x).length;
  const n2 = TIMES2.filter((x) => t >= x).length;

  // 第一行光标：敲字期间常亮 → 句尾闪 3 次 → 移交第二行后消失
  const cur1Visible = t < T2_START;
  const cur1Opacity = blinkOpacity(t, BLINK_AT, CONFIG.blinkTimes);

  // 第二行光标：移交后出现常亮；敲完后常驻方波闪烁（先灭半拍再亮半拍）
  const cur2Visible = t >= T2_START;
  let cur2Opacity = 1;
  if (t >= LOOP_AT) {
    const phase = (t - LOOP_AT) % LOOP_PERIOD;
    cur2Opacity = phase < LOOP_PERIOD / 2 ? 0 : 1;
  }

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <div className="stamp">
        <div className="line1">
          <span className="txt">{CONFIG.line1.slice(0, n1)}</span>
          <span className="cursor" style={{
            display: cur1Visible ? "inline-block" : "none", opacity: cur1Opacity }} />
        </div>
        <div className="line2">
          <span className="txt">{CONFIG.line2.slice(0, n2)}</span>
          <span className="cursor" style={{
            display: cur2Visible ? "inline-block" : "none", opacity: cur2Opacity }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
