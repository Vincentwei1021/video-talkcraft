import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// cursor-actor-demo · 光标演员演示 —— 自包含 Remotion 源码（与 demos/cursor-actor-demo/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 135 };

const FPS = meta.fps;

// —— 动效本体（可整段摘走）——
// 一枚超常规尺寸光标在 UI 上「移动 → 悬停 → 按压 → 元素即时响应」，一个动作一个口播词。
const CONFIG = {
  startDelay: 0.45,   // 起手静置：光标停在角落等口播开口
  moveLong: 0.52,     // 跨区域移动耗时 s（长距离）
  moveShort: 0.34,    // 相邻目标之间移动耗时 s
  moveDrag: 0.62,     // 拖拽移动耗时 s（拖着东西走要更慢更稳）
  hoverHold: 0.22,    // 悬停微停顿：到位不立刻点，等观众看见"要点这里"
  press: 0.09,        // 按压下压时长 s（抬手同值）
  pressScale: 0.9,    // 光标按压微缩倍数（锚在箭头尖）
  ripple: 0.35,       // 按压涟漪扩散耗时 s
  rippleFrom: 0.3,    // 涟漪起始倍数（从箭头尖那一点长出来）
  rippleTo: 1.6,      // 涟漪终止倍数（越大越"响"，>2 抢戏）
  hlIn: 0.16,         // 悬停高亮加深耗时 s
  toggleSlide: 0.28,  // 开关滑块行程耗时 s
  popIn: 0.34,        // 缩略图弹入耗时 s
  popFrom: 0.4,       // 弹入起始倍数（从光标处长出来）
  START: { x: 896, y: 468 },  // 光标起手位（舞台设计坐标，右下角空白处）
};

// 目标点（舞台设计坐标；demo 里由 P(el) 运行时反算，此处照抄实测值。
// 落点偏右上（0.82/0.4）：箭头体朝右下伸出，不盖住要被观众读的滑块行程）
const POS = {
  tg1:   { x: 575.08, y: 157.60 },   // 开关 1
  tg2:   { x: 575.08, y: 209.60 },   // 开关 2
  thumb: { x: 817.46, y: 176.30 },   // 素材库缩略图（0.42/0.4）
  slot:  { x: 117.92, y: 356.60 },   // 插槽内偏左上（0.34/0.3），弹入原点与它对齐
};

/* 时间表（demo 秒）
   0.45–0.97  光标 → 开关1；1.19 按下 → 滑块滑动 + 轨变深（悬停高亮 0.89 起）
   1.37–1.71  光标 → 开关2；1.93 按下（悬停高亮 1.63 起）
   2.21–2.73  光标 → 缩略图；悬停边框加深 2.65 起
   2.95       按住拖起（涟漪 + 缩略图微缩一拍）
   3.13–3.75  拖拽：光标与缩略图同曲线飞向插槽
   3.66/3.75  松手涟漪 / 拖影消失，插槽缩略图 pop-in → 4.09 落定 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const hexLerp = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], p))).join(",")})`;
};

// —— 摊平的时刻表（由 CONFIG 推出，与 demo 的 t 累加逻辑一致）——
const T_MOVE1 = CONFIG.startDelay;                                  // 0.45
const T_PRESS1 = T_MOVE1 + CONFIG.moveLong + CONFIG.hoverHold;      // 1.19
const T_MOVE2 = T_PRESS1 + CONFIG.press * 2;                        // 1.37
const T_PRESS2 = T_MOVE2 + CONFIG.moveShort + CONFIG.hoverHold;     // 1.93
const T_MOVE3 = T_PRESS2 + CONFIG.press * 2 + 0.1;                  // 2.21
const T_GRAB = T_MOVE3 + CONFIG.moveLong + CONFIG.hoverHold;        // 2.95
const T_DRAG = T_GRAB + CONFIG.press * 2;                           // 3.13
const T_DROP = T_DRAG + CONFIG.moveDrag;                            // 3.75

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

// —— 演示语境（不属于动效）：灰阶线框工具 UI + 素材库，全部 CSS/SVG 画 ——
const CSS = `
.ui-window {
  position: absolute;
  left: 56px; top: 48px;
  width: 560px; height: 386px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #ffffff;
  z-index: 1;
}
.ui-titlebar {
  height: 36px;
  display: flex; align-items: center; gap: 6px;
  padding: 0 14px;
  border-bottom: 1px solid #ececec;
  font-size: 12px; color: #8a8a8a;
}
.ui-titlebar i { width: 9px; height: 9px; border-radius: 50%; background: #d2d2d7; }
.ui-titlebar .wname { margin-left: 10px; letter-spacing: 1px; }
.ui-body { padding: 20px; }
.sec-label {
  font-size: 12px; color: #8a8a8a; letter-spacing: 2px;
  margin-bottom: 12px;
}
/* 一行偏好设置 = 一个可被光标点的目标 */
.pref-row {
  position: relative;
  height: 52px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px;
  border-radius: 8px;
}
.pref-row .row-hl {
  position: absolute; inset: 0;
  border-radius: 8px;
  background: #f0f0f0;
  z-index: 0;
}
.pref-row .row-txt { position: relative; z-index: 1; }
.pref-row .row-txt b { display: block; font-size: 15.5px; font-weight: 600; color: #1d1d1f; }
.pref-row .row-txt span { display: block; font-size: 12px; color: #8a8a8a; margin-top: 3px; }
/* —— 动效目标之一：开关。轨 44×24、滑块 18，行程 20px —— */
.tg { position: relative; z-index: 1; }
.tg-track {
  width: 44px; height: 24px;
  border: 1.5px solid #c8c8cd;
  border-radius: 12px;
  background: #ffffff;
}
.tg-knob {
  position: absolute; left: 3px; top: 3px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #b0b0b5;
}
.ui-divider { height: 1px; background: #ececec; margin: 18px 0; }
/* 对话框 + 参考图插槽（拖放落点） */
.composer {
  height: 84px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  display: flex; align-items: center; gap: 14px;
  padding: 10px;
}
.slot {
  position: relative;
  width: 88px; height: 62px;
  flex: 0 0 auto;
  border: 1.5px dashed #d2d2d7;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #c8c8cd; font-size: 22px; font-weight: 300;
}
.composer .ph { font-size: 14px; color: #b0b0b5; }
/* 素材库 */
.tray {
  position: absolute;
  left: 664px; top: 108px;
  width: 236px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 16px;
  z-index: 2;              /* 高于窗口：被拖起的缩略图要能飞过窗口 */
  background: #ffffff;
}
.tray .sec-label { margin-bottom: 10px; }
.tray-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.thumb-hole {
  position: relative;
  width: 88px; height: 62px;
  border: 1.5px dashed #ececef;
  border-radius: 8px;
}
.thumb-hole > .thumb { position: absolute; inset: -1.5px; }
.thumb {
  position: relative;
  width: 88px; height: 62px;
  border: 1px solid #e6e6e9;
  border-radius: 8px;
  background: #f7f7f8;
  overflow: hidden;
}
.thumb svg, .slot-img svg { display: block; width: 100%; height: 100%; }
/* 落进插槽后弹入的缩略图（与素材库缩略图同尺寸，避免飞行中缩放） */
.slot-img {
  position: absolute; inset: -1.5px;
  border: 1px solid #e6e6e9;
  border-radius: 8px;
  background: #f7f7f8;
  overflow: hidden;
}
/* —— 动效本体 —— 光标：超常规尺寸的箭头（深墨实心 + 白描边 + 柔投影） —— */
.ui-cursor {
  position: absolute; left: 0; top: 0;
  width: 30px; height: 45px;
  overflow: visible;
  transform-origin: 0% 0%;   /* 锚在箭头尖：按压微缩不让尖端移位 */
  z-index: 30;
  pointer-events: none;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, .28));
}
.cur-halo {
  fill: #ffffff; stroke: #ffffff; stroke-width: 2.05;
  stroke-linejoin: round; stroke-linecap: round;
}
.cur-body { fill: #1d1d1f; }
/* 按压涟漪：从箭头尖扩散的一圈（深芯 + 内外白边） */
.click-ripple {
  position: absolute; left: -15px; top: -15px;
  width: 30px; height: 30px;
  box-sizing: border-box;
  border: 1.7px solid rgba(29, 29, 31, .55);
  border-radius: 50%;
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, .85),
              inset 0 0 0 1.5px rgba(255, 255, 255, .85);
  z-index: 29;
  pointer-events: none;
}
/* —— 演示语境：角标主持人 —— */
.host-badge {
  position: absolute;
  left: 44px; top: 442px;
  width: 84px; height: 84px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
`;

const CURSOR_PATH = "M1.25 1.28 L10.63 11.77 Q11.20 12.40 10.35 12.40 L7.85 12.40 Q7.30 12.40 7.43 12.94 L8.83 18.92 Q8.99 19.60 8.35 19.89 L7.79 20.15 Q7.15 20.44 6.92 19.78 L4.90 14.11 Q4.65 13.40 4.10 13.91 L1.66 16.19 Q1.00 16.80 1.00 15.90 L1.00 1.38 Q1.00 1.00 1.25 1.28 Z";

// 缩略图内容：灰阶线稿（山 + 太阳），不做拟真
const PickSvg = () => (
  <svg viewBox="0 0 88 62" aria-hidden="true">
    <circle cx="64" cy="18" r="7" fill="none" stroke="#c8c8cd" strokeWidth="1.5" />
    <path d="M8 50 L30 26 L46 44 L57 32 L80 50 Z" fill="none" stroke="#c8c8cd" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export default function CursorActorDemo({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // —— 光标走位：x 用 power2.inOut、y 用 sine.inOut 分开插值 → 轨迹自然成弧线 ——
  const moves = [
    { t0: T_MOVE1, dur: CONFIG.moveLong, to: POS.tg1 },
    { t0: T_MOVE2, dur: CONFIG.moveShort, to: POS.tg2 },
    { t0: T_MOVE3, dur: CONFIG.moveLong, to: POS.thumb },
    { t0: T_DRAG, dur: CONFIG.moveDrag, to: POS.slot },
  ];
  let cx = CONFIG.START.x, cy = CONFIG.START.y;
  for (const m of moves) {
    if (t < m.t0) break;
    cx = lerp(cx, m.to.x, tw(t, m.t0, m.dur, power2InOut));
    cy = lerp(cy, m.to.y, tw(t, m.t0, m.dur, sineInOut));
  }

  // —— 按压：光标微缩 + 涟漪（涟漪贴住按下那一刻的箭头尖）——
  const presses = [
    { at: T_PRESS1, p: POS.tg1 },
    { at: T_PRESS2, p: POS.tg2 },
    { at: T_GRAB, p: POS.thumb },
    { at: T_DROP - CONFIG.press, p: POS.slot },   // 松手涟漪：提前一个 press 对齐抬手帧
  ];
  let cScale = 1;
  let rippleStyle: React.CSSProperties = { opacity: 0 };
  for (const pr of presses) {
    if (t >= pr.at && t < pr.at + CONFIG.press)
      cScale = lerp(1, CONFIG.pressScale, tw(t, pr.at, CONFIG.press, power2Out));
    else if (t >= pr.at + CONFIG.press && t < pr.at + CONFIG.press * 2)
      cScale = lerp(CONFIG.pressScale, 1, tw(t, pr.at + CONFIG.press, CONFIG.press, power2Out));
    if (t >= pr.at) rippleStyle = {
      opacity: 1 - tw(t, pr.at, CONFIG.ripple, power2In),
      transform: `translate(${pr.p.x}px, ${pr.p.y}px) scale(${lerp(CONFIG.rippleFrom, CONFIG.rippleTo, tw(t, pr.at, CONFIG.ripple, power2Out))})`,
    };
  }

  // —— 开关行响应（悬停高亮 → 按压微缩 → 滑块滑动 + 轨变深）——
  const rowState = (i: number) => {
    const moveEnd = i === 0 ? T_MOVE1 + CONFIG.moveLong : T_MOVE2 + CONFIG.moveShort;
    const pressAt = i === 0 ? T_PRESS1 : T_PRESS2;
    const tOn = pressAt + CONFIG.press * 0.55;
    const outAt = pressAt + CONFIG.press * 2 + 0.1;
    // 悬停高亮：到位前半拍加深，离开后退回
    const hl = t < outAt
      ? tw(t, moveEnd - CONFIG.hlIn * 0.5, CONFIG.hlIn, power2Out)
      : 1 - tw(t, outAt, 0.2, power2Out);
    // 开关容器按压微缩一拍
    let tgScale = 1;
    if (t >= pressAt && t < pressAt + CONFIG.press)
      tgScale = lerp(1, 0.94, tw(t, pressAt, CONFIG.press, power2Out));
    else if (t >= pressAt + CONFIG.press)
      tgScale = lerp(0.94, 1, tw(t, pressAt + CONFIG.press, CONFIG.press * 1.6, power2Out));
    // 状态切换：滑块滑到右端 + 轨道变深 + 滑块转白
    const knobX = 20 * tw(t, tOn, CONFIG.toggleSlide, power2Out);
    const knobBg = hexLerp("#b0b0b5", "#ffffff", tw(t, tOn, CONFIG.toggleSlide * 0.6, power2Out));
    const trackBg = hexLerp("#ffffff", "#1d1d1f", tw(t, tOn, CONFIG.toggleSlide * 0.7, power2Out));
    const trackBd = hexLerp("#c8c8cd", "#1d1d1f", tw(t, tOn, CONFIG.toggleSlide * 0.7, power2Out));
    return { hl, tgScale, knobX, knobBg, trackBg, trackBd };
  };
  const row0 = rowState(0);
  const row1 = rowState(1);

  // —— 缩略图：悬停边框加深 → 按住微缩 → 跟着光标飞 → 松手拖影消失 ——
  const thumbBd = hexLerp("#e6e6e9", "#b0b0b5",
    tw(t, T_MOVE3 + CONFIG.moveLong - CONFIG.hlIn * 0.5, CONFIG.hlIn, power2Out));
  let thumbScale = 1;
  if (t >= T_GRAB && t < T_GRAB + CONFIG.press)
    thumbScale = lerp(1, 0.94, tw(t, T_GRAB, CONFIG.press, power2Out));
  else if (t >= T_GRAB + CONFIG.press)
    thumbScale = lerp(0.94, 1, tw(t, T_GRAB + CONFIG.press * 1.55, CONFIG.press * 1.6, power2Out));
  // 拖拽位移：与光标同一条曲线（x/y 各自的缓动也相同）
  const dxTotal = POS.slot.x - POS.thumb.x, dyTotal = POS.slot.y - POS.thumb.y;
  const thumbX = dxTotal * tw(t, T_DRAG, CONFIG.moveDrag, power2InOut);
  const thumbY = dyTotal * tw(t, T_DRAG, CONFIG.moveDrag, sineInOut);
  const thumbOp = 1 - tw(t, T_DROP, 0.12, power2Out);
  // 插槽缩略图从光标处 pop-in
  const popP = tw(t, T_DROP, CONFIG.popIn, power3Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>

      <div className="ui-window">
        <div className="ui-titlebar"><i /><i /><i /><span className="wname">生成设置</span></div>
        <div className="ui-body">
          <div className="sec-label">输出偏好</div>

          {[
            { b: "自动生成字幕", s: "按语音逐句对齐", r: row0 },
            { b: "画面高清增强", s: "输出 4K，渲染稍慢", r: row1 },
            { b: "自动配背景音乐", s: "这次先不要", r: null },
          ].map((row, i) => (
            <div className="pref-row" key={i}>
              <div className="row-hl" style={{ opacity: row.r ? row.r.hl : 0 }} />
              <div className="row-txt"><b>{row.b}</b><span>{row.s}</span></div>
              <div className="tg" style={{
                transform: `scale(${row.r ? row.r.tgScale : 1})`, transformOrigin: "50% 50%" }}>
                <div className="tg-track" style={row.r ? { backgroundColor: row.r.trackBg, borderColor: row.r.trackBd } : {}} />
                <div className="tg-knob" style={row.r ? {
                  backgroundColor: row.r.knobBg, transform: `translateX(${row.r.knobX}px)` } : {}} />
              </div>
            </div>
          ))}

          <div className="ui-divider" />

          <div className="composer">
            <div className="slot">
              +
              <div className="slot-img" style={{
                opacity: popP, transform: `scale(${lerp(CONFIG.popFrom, 1, popP)})`,
                transformOrigin: "34% 30%" }}>
                <PickSvg />
              </div>
            </div>
            <div className="ph">描述你想要的画面，或拖一张参考图进来…</div>
          </div>
        </div>
      </div>

      <div className="tray">
        <div className="sec-label">素材库</div>
        <div className="tray-grid">
          <div className="thumb">
            <svg viewBox="0 0 88 62" aria-hidden="true">
              <rect x="14" y="16" width="60" height="30" rx="4" fill="none" stroke="#c8c8cd" strokeWidth="1.5" />
              <path d="M14 38 L32 24 L52 40" fill="none" stroke="#c8c8cd" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="thumb-hole">
            {/* 被拖走的缩略图（拖出后底下露出虚线空槽，网格不塌） */}
            <div className="thumb pick" style={{
              opacity: thumbOp, borderColor: thumbBd,
              transform: `translate(${thumbX}px, ${thumbY}px) scale(${thumbScale})`,
              transformOrigin: "50% 50%" }}>
              <PickSvg />
            </div>
          </div>
          <div className="thumb">
            <svg viewBox="0 0 88 62" aria-hidden="true">
              <path d="M12 46 L28 46 L28 20 L44 20 L44 46 L60 46 L60 30 L76 30" fill="none" stroke="#c8c8cd" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="thumb">
            <svg viewBox="0 0 88 62" aria-hidden="true">
              <circle cx="34" cy="24" r="9" fill="none" stroke="#c8c8cd" strokeWidth="1.5" />
              <path d="M16 48 C24 34, 44 34, 52 48" fill="none" stroke="#c8c8cd" strokeWidth="1.5" strokeLinejoin="round" />
              <rect x="58" y="18" width="16" height="30" rx="3" fill="none" stroke="#c8c8cd" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>

      <div className="host-badge"><Host src={hostSrc} /></div>

      {/* 动效本体：按压涟漪（圆心 = 箭头尖）+ 光标，尖端 = 元素左上角(0,0) */}
      <div className="click-ripple" style={rippleStyle} />
      <svg className="ui-cursor" viewBox="0 0 14 21" aria-hidden="true"
           style={{ transform: `translate(${cx}px, ${cy}px) scale(${cScale})` }}>
        {/* 轮廓全程圆角贝塞尔：尖端锐、腰身直、肩与尾跟倒角，缩到 30px 仍读得出是箭头 */}
        <path className="cur-halo" d={CURSOR_PATH} />
        <path className="cur-body" d={CURSOR_PATH} />
      </svg>
    </AbsoluteFill>
  );
}
