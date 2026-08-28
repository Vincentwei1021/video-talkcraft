import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// focus-dim-spotlight · 聚焦压暗切换 —— 自包含 Remotion 源码（与 demos/focus-dim-spotlight/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 275 };

const FPS = meta.fps;

// —— 动效本体（可整段摘走）：一个聚光窗口在目标间跳转 + 目标上的发光描边 ——
const CONFIG = {
  startDelay: 0.45,   // 起手静置一拍，等口播念到第一个目标
  dimTo: 0.40,        // 非目标区暗度（0.40 = 压暗 40%）；白底 0.35~0.45，深底减半
  dimIn: 0.30,        // 蒙层缓入时长 s：<0.15 像切黑闪，>0.5 焦点来得比语音晚
  ringIn: 0.30,       // 描边亮起时长 s（与蒙层同帧起）
  ringFrom: 0.95,     // 描边"撑开"的起始倍数：1.0 则读作贴上去的静态框
  jump: 0.20,         // 焦点跳转到下一目标的时长 s：焦点是滑过去的，不是切过去的
  hold: 1.00,         // 每个目标停留 s（对齐这一行的台词）
  firstHold: 1.25,    // 第一个目标多停一拍（观众要先认出整张表）
  glowHalf: 1.60,     // 辉光脉动半周期 s：连续缓动防死，不是闪烁
  glowFrom: 0.35,     // 辉光脉动下限透明度
  focusInsetX: 12,    // 焦点窗口相对目标行左右内缩 px（别压到卡片边框）
  focusPadY: 3,       // 焦点窗口上下外扩 px
  cardPad: 6,         // 通道①：窗口撑到整张卡时的外扩 px
  morph: 0.45,        // 行级焦点 → 整卡焦点的形变时长 s
  wideHold: 1.50,     // 整卡聚焦停留 s
  restore: 0.40,      // 讲完整体恢复（蒙层退场）时长 s
};

// 目标矩形（demo 运行时测量 .trow.data 与 .table-card，移植按同版式实测定值 + focusBox 换算）
type Box = { x: number; y: number; w: number; h: number };
const TARGETS: Box[] = [
  { x: 143, y: 169, w: 674, h: 63 },
  { x: 143, y: 226, w: 674, h: 63 },
  { x: 143, y: 283, w: 674, h: 63 },
  { x: 143, y: 340, w: 674, h: 63 },
];
const WIDE: Box = { x: 124, y: 122, w: 712, h: 327 };

/* 时间轴排布（demo 秒）：at = [0.45, 2.0, 3.2, 4.4]，tWide = 5.6，tRestore = 7.55
   0.45–0.75  焦点建立：蒙层缓入（power2.out）+ 描边亮起撑开（power3.out）
   0.75–8.75  辉光 sine 呼吸（1.6s 半程 yoyo ×5）
   2.0/3.2/4.4  焦点跳转到第 2/3/4 行（0.2s power2.out）
   5.60–6.05  描边退场 + 窗口撑到整卡（morph 0.45s power2.out）
   7.55–7.95  蒙层退场，画面恢复 */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const lerpBox = (a: Box, b: Box, p: number): Box => ({
  x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p),
});

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

// —— 演示语境（不属于动效）：一张灰阶数据表卡 + 角标主持人 ——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
.doc-eyebrow {
  position: absolute;
  left: 130px; top: 96px;
  font-size: 13px;
  letter-spacing: 3px;
  color: #8a8a8a;
}
.table-card {
  position: absolute;
  left: 130px; top: 128px;
  width: 700px;
  padding: 10px 0 4px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #ffffff;
  color: #1d1d1f;
}
.trow {
  display: grid;
  grid-template-columns: 1.6fr 1fr 0.85fr 0.85fr;
  align-items: center;
  padding: 15px 26px;
}
.trow > span + span { text-align: right; font-variant-numeric: tabular-nums; }
.trow.head {
  font-size: 12.5px;
  letter-spacing: 2px;
  color: #8a8a8a;
  padding: 4px 26px 12px;
}
.trow.data { font-size: 19px; border-top: 1px solid #f0f0f0; }
.trow.data > span:first-child { font-weight: 600; }
.card-foot {
  padding: 12px 26px 8px;
  font-size: 12px;
  color: #8a8a8a;
  border-top: 1px solid #f0f0f0;
}
.host-badge {
  position: absolute;
  left: 30px; bottom: 28px;
  width: 96px; height: 96px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}

/* —— 动效本体 ——
   压暗蒙层：一个"聚光窗口"元素，靠超大 spread 的 box-shadow 把窗口以外的整屏压暗。 */
.spot {
  position: absolute;
  left: 0; top: 0;
  border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.40);
  pointer-events: none;
  z-index: 5;
  will-change: transform, width, height;
}
/* 发光描边：圆角框圈住目标，0.95→1 撑开亮起 */
.ring {
  position: absolute;
  left: 0; top: 0;
  border: 2.5px solid #ffb020;
  border-radius: 8px;
  pointer-events: none;
  z-index: 6;
  will-change: transform, width, height;
}
/* 辉光：单独一层，只脉动它的 opacity（连续缓动，不是抖动） */
.ring-glow {
  position: absolute;
  inset: -1px;
  border-radius: 9px;
  box-shadow: 0 0 20px 3px rgba(255, 176, 32, 0.55);
  pointer-events: none;
}

/* —— 演示注记：压在蒙层之上（注记层不被压暗） —— */
.ch-label {
  position: absolute;
  right: 130px; top: 96px;
  font-size: 12.5px;
  letter-spacing: 1.5px;
  color: #8a8a8a;
  text-align: right;
  z-index: 7;
}
`;

export default function FocusDimSpotlight({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;

  // 时间轴排布：先算出各拍时刻，再挂动作（换目标数量不用改代码）
  const at: number[] = [];
  let tt = C.startDelay;
  at.push(tt);
  tt += C.dimIn + C.firstHold;
  for (let i = 1; i < TARGETS.length; i++) {
    at.push(tt);
    tt += C.jump + C.hold;
  }
  const tWide = tt;
  const tRestore = tWide + C.morph + C.wideHold;

  // —— 焦点窗口 / 描边的几何：分段插值 ——
  let ringGeo: Box = TARGETS[0];
  for (let i = 1; i < TARGETS.length; i++) {
    if (t >= at[i]) ringGeo = lerpBox(TARGETS[i - 1], TARGETS[i], tw(t, at[i], C.jump, power2Out));
  }
  // ③ 窗口撑到整张卡——焦点从"行"放大到"版面"（描边不跟、只退场）
  const spotGeo: Box = t >= tWide ? lerpBox(TARGETS[TARGETS.length - 1], WIDE, tw(t, tWide, C.morph, power2Out)) : ringGeo;

  // ① 焦点建立 / ④ 恢复
  const spotOpacity = t < tRestore
    ? tw(t, at[0], C.dimIn, power2Out)
    : 1 - tw(t, tRestore, C.restore, power2Out);
  const ringOpacity = t < tWide
    ? tw(t, at[0], C.ringIn, power3Out)
    : 1 - tw(t, tWide, 0.25, power2Out);
  const ringScale = lerp(C.ringFrom, 1, tw(t, at[0], C.ringIn, power3Out));

  // 辉光微脉动：连续 sine 呼吸，覆盖描边在场的全程（防死，不做闪烁/抖动）
  const glowLife = tWide - (at[0] + C.ringIn);
  const glowReps = Math.max(1, Math.ceil(glowLife / C.glowHalf));
  let glowOpacity = C.glowFrom;
  const gT0 = at[0] + C.ringIn;
  if (t > gT0) {
    // repeat: glowReps ⇒ 共 glowReps+1 段 yoyo（超时后停在最后一段的终值）
    const cyc = Math.min((t - gT0) / C.glowHalf, glowReps + 1 - 1e-6);
    const k = Math.floor(cyc);
    const p = cyc - k;
    const pp = k % 2 === 1 ? 1 - p : p;
    glowOpacity = lerp(C.glowFrom, 1, sineInOut(pp));
  }

  // —— 演示注记（不属于动效）：标出当前用的是哪条通道 ——
  const chA = t < tWide ? tw(t, at[0], 0.3, power2Out) : 1 - tw(t, tWide, 0.2, power2Out);
  const chB = t < tRestore ? tw(t, tWide + 0.12, 0.3, power2Out) : 1 - tw(t, tRestore, 0.3, power2Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="doc-eyebrow">2024 财年 · 分部门经营数据</div>

      <div className="table-card">
        <div className="trow head">
          <span>业务板块</span><span>营收</span><span>同比</span><span>毛利率</span>
        </div>
        <div className="trow data"><span>云与 AI</span><span>412</span><span>+38%</span><span>61%</span></div>
        <div className="trow data"><span>智能硬件</span><span>268</span><span>+9%</span><span>24%</span></div>
        <div className="trow data"><span>广告营销</span><span>191</span><span>−6%</span><span>72%</span></div>
        <div className="trow data"><span>金融科技</span><span>87</span><span>+21%</span><span>48%</span></div>
        <div className="card-foot">数据来源：公司 2024 财年年报 · 单位：亿元人民币</div>
      </div>

      <div className="host-badge"><Host src={hostSrc} /></div>

      {/* 动效本体：一个聚光窗口 + 一个发光描边框 */}
      <div className="spot" style={{
        opacity: spotOpacity, width: spotGeo.w, height: spotGeo.h,
        transform: `translate(${spotGeo.x}px, ${spotGeo.y}px)`,
      }} />
      <div className="ring" style={{
        opacity: ringOpacity, width: ringGeo.w, height: ringGeo.h,
        transform: `translate(${ringGeo.x}px, ${ringGeo.y}px) scale(${ringScale})`,
        transformOrigin: "50% 50%",
      }}>
        <div className="ring-glow" style={{ opacity: glowOpacity }} />
      </div>

      <div className="ch-label" style={{ opacity: chA }}>通道③　发光描边 + 其余压暗</div>
      <div className="ch-label" style={{ opacity: chB }}>通道①　整屏压暗（无描边）</div>
    </AbsoluteFill>
  );
}
