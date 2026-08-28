import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// ui-flow-theater · 界面流程剧场 —— 自包含 Remotion 源码（与 demos/ui-flow-theater/index.html 同画面）
// 复制本文件进你的工程即可用。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 281 };

const FPS = meta.fps;

// —— 动效本体（可整段摘走）——
// 整套界面按一条 STEPS 时刻表自演：光标走位 + 控件同拍换态 + 成功 toast 收尾。
// 架构纪律（本卡的真正内容）：
//   ① 时间只从一处进入 —— STEPS 里的 at 既是光标到位/按下的时刻，也是控件换态的时刻。
//   ② 控件坐标是命名常量（POS.xxx）—— demo 里由 P(el) 运行时反算；
//      移植版把 demo 实测出的舞台坐标照抄成常量（布局 CSS 相同，坐标不变）。
//   ③ 一个控件只归一个响应函数，响应内部再没有时间参数。
const CONFIG = {
  // 入场
  cardIn: 0.60,       // 整卡 blur 揭示耗时 s
  cardBlur: 9,        // 整卡揭示起始模糊 px
  blkIn: 0.53,        // 卡内区块 blur-in 耗时 s
  blkBlur: 5,         // 区块揭示起始模糊 px
  blkStep: 0.20,      // 区块错峰步长 s（每 0.2s 一个）
  blkLift: 8,         // 区块揭示起始下沉 px

  // 光标
  moveLong: 0.62,     // 跨区域移动耗时 s
  moveShort: 0.40,    // 相邻控件之间移动耗时 s
  hoverHold: 0.20,    // 到位到按下之间的微停顿 s
  press: 0.09,        // 按压下压时长 s（抬手同值）
  pressScale: 0.9,    // 按压微缩倍数（锚在箭头尖）
  ripple: 0.35,       // 涟漪扩散耗时 s
  rippleFrom: 0.3,    // 涟漪起始倍数
  rippleTo: 1.6,      // 涟漪终止倍数
  START: { x: 118, y: 486 },   // 光标起手位（左下空白）

  // 控件换态：全库统一 0.27s + out（press 只给一半）
  swap: 0.27,
  sldFrom: 28,        // 滑杆起始值 %
  sldTo: 76,          // 滑杆目标值 %

  // toast
  toastIn: 0.47,      // 滑入耗时 s
  toastHold: 1.80,    // 停留 s
  toastOut: 0.47,     // 退场耗时 s
  toastLift: 16,      // 滑入起始下沉 px
  accent: "#d8383a",  // 唯一语义色：只上"保存成功"这一拍
};

// 时刻表：一行一拍。at = 这一拍"按下"的时刻，光标与控件都读它。
const STEPS = [
  { at: 2.10, target: "sw",   act: "click", move: "long"  },
  { at: 3.10, target: "seg",  act: "click", move: "short" },
  { at: 4.05, target: "sld",  act: "drag",  move: "short", until: 4.95 },
  { at: 5.90, target: "save", act: "click", move: "long"  },
] as { at: number; target: "sw" | "seg" | "sld" | "save"; act: string; move: string; until?: number }[];

// 命名坐标常量（舞台设计坐标；demo 运行时由 P(el) 反算，此处照抄实测值）
const POS = {
  sw:     { x: 768.88, y: 216.92 },   // 开关落点偏右上：箭头体不盖住滑块行程
  seg:    { x: 668.99, y: 275.70 },   // 要选的那一段（"深色"）
  sld:    { x: 606.04, y: 335.00 },   // 手柄起始位（28%）
  sldEnd: { x: 686.68, y: 335.00 },   // 手柄目标位（76%）
  save:   { x: 733.00, y: 393.12 },
};

/* 时间表（demo 秒）
   0.00–0.60  整卡 blur 揭示；0.60 起五个区块每 0.2s 错峰 blur-in
   1.28–1.90  光标 → 开关；2.10 按下 → 开关滑深
   2.50–2.90  光标 → 分段选择；3.10 按下 → 指示器滑到"深色"
   3.45–3.85  光标 → 滑杆手柄；4.05 按住拖到 4.95（28%→76%，光标与手柄同曲线）
   5.08–5.70  光标 → 保存；5.90 按下 → 按钮转成功态
   6.23–6.70  toast 滑入 → 停 1.8s → 8.50–8.97 退场 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
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

// —— 演示语境（不属于动效）：一套灰阶假「输出设置」面板 + 成功 toast ——
const CSS = `
.panel {
  position: absolute;
  left: 150px; top: 84px;
  width: 660px;
  padding: 26px 30px 24px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: #ffffff;
  color: #1d1d1f;
  z-index: 1;
}
.blk { position: relative; }
.p-title { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
.p-sub { margin-top: 5px; font-size: 12.5px; color: #8a8a8a; letter-spacing: .5px; }
.p-div { height: 1px; background: #ececef; margin: 16px 0 4px; }
.row {
  height: 58px;
  display: flex; align-items: center; justify-content: space-between;
}
.r-txt b { display: block; font-size: 15px; font-weight: 600; }
.r-txt span { display: block; margin-top: 3px; font-size: 12px; color: #8a8a8a; }
/* 右列所有控件同宽同右边线（220px） */
.ctl { width: 220px; flex: 0 0 220px; display: flex; align-items: center; justify-content: flex-end; }
/* —— 动效目标 1：开关（轨 46×26 / 滑块 20，行程 20px）—— */
.tg-track {
  position: relative;
  width: 46px; height: 26px;
  border: 1.5px solid #c8c8cd;
  border-radius: 13px;
  background: #ffffff;
}
.tg-knob {
  position: absolute; left: 2px; top: 2px;
  width: 19px; height: 19px;
  border-radius: 50%;
  background: #b0b0b5;
}
/* —— 动效目标 2：分段选择（指示器在段间滑动，只动 x）—— */
.seg {
  position: relative;
  width: 220px; height: 34px;
  padding: 3px;
  border: 1px solid #e0e0e0;
  border-radius: 9px;
  background: #f7f7f8;
  display: flex;
}
.seg-ind {
  position: absolute; left: 3px; top: 3px;
  width: 70.6px; height: 26px;      /* = (220 - 2 - 6) / 3 */
  border-radius: 7px;
  background: #1d1d1f;
}
.seg i {
  position: relative; z-index: 1;
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: 12.5px; font-style: normal;
}
/* —— 动效目标 3：滑杆（轨 168 + 读数 44，合计 220）—— */
.sld { display: flex; align-items: center; gap: 8px; }
.sld-track {
  position: relative;
  width: 168px; height: 5px;
  border-radius: 3px;
  background: #ececef;
}
.sld-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  border-radius: 3px;
  background: #1d1d1f;
}
.sld-thumb {
  position: absolute; top: 50%;
  width: 16px; height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 50%;
  border: 1.5px solid #c8c8cd;
  background: #ffffff;
}
.sld-val {
  width: 44px;
  text-align: right;
  font-size: 12.5px; color: #8a8a8a;
  font-variant-numeric: tabular-nums;
}
/* —— 动效目标 4：保存按钮（label ↔ 勾 常驻只驱动 opacity，宽度由 label 撑住不跳框）—— */
.foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 14px; }
.btn-ghost {
  padding: 0 16px; height: 36px;
  display: flex; align-items: center;
  border: 1px solid #e0e0e0; border-radius: 8px;
  font-size: 13px; color: #8a8a8a;
}
.btn-save {
  position: relative;
  padding: 0 20px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  font-size: 13px; font-weight: 600; color: #ffffff;
  overflow: hidden;
}
.bs-label { position: relative; }
.bs-done {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.bs-done svg { width: 18px; height: 18px; display: block; }
/* —— 动效目标 5：成功 toast（滑入 → 停 → 退）—— */
.toast {
  position: absolute;
  right: 24px; bottom: 24px;
  width: 300px;
  padding: 13px 15px;
  display: flex; align-items: center; gap: 11px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .10);
  z-index: 20;
  transform-origin: bottom center;
}
.toast svg { width: 19px; height: 19px; flex: 0 0 auto; display: block; }
.toast b { font-size: 13.5px; font-weight: 600; }
.toast span { display: block; margin-top: 2px; font-size: 12px; color: #8a8a8a; }
/* —— 动效本体 —— 光标（同一条 path 描两遍：白边层 + 实心层） */
.ui-cursor {
  position: absolute; left: 0; top: 0;
  width: 30px; height: 45px;
  overflow: visible;
  transform-origin: 0% 0%;    /* 锚在箭头尖：按压微缩不让尖端移位 */
  z-index: 30;
  pointer-events: none;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, .28));
}
.cur-halo {
  fill: #ffffff; stroke: #ffffff; stroke-width: 2.05;
  stroke-linejoin: round; stroke-linecap: round;
}
.cur-body { fill: #1d1d1f; }
/* 按压涟漪：圆心 = 箭头尖，深芯 + 内外白边 */
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
`;

const CURSOR_PATH = "M1.25 1.28 L10.63 11.77 Q11.20 12.40 10.35 12.40 L7.85 12.40 Q7.30 12.40 7.43 12.94 L8.83 18.92 Q8.99 19.60 8.35 19.89 L7.79 20.15 Q7.15 20.44 6.92 19.78 L4.90 14.11 Q4.65 13.40 4.10 13.91 L1.66 16.19 Q1.00 16.80 1.00 15.90 L1.00 1.38 Q1.00 1.00 1.25 1.28 Z";

export default function UiFlowTheater() {
  const t = useCurrentFrame() / FPS;

  // —— 入场：整卡 blur 揭示 → 卡内区块每 0.2s 错峰一个 ——
  const panelP = tw(t, 0, CONFIG.cardIn, power2Out);
  const blkP = (i: number) => tw(t, CONFIG.cardIn + i * CONFIG.blkStep, CONFIG.blkIn, power2Out);
  const blkStyle = (i: number): React.CSSProperties => {
    const p = blkP(i);
    return { opacity: p, transform: `translateY(${lerp(CONFIG.blkLift, 0, p)}px)`,
             filter: `blur(${lerp(CONFIG.blkBlur, 0, p)}px)` };
  };

  // —— 光标走位：x 用 power2.inOut、y 用 sine.inOut 分开插值 → 轨迹天然成弧线 ——
  // 移动收在 at - hoverHold：到位先停一拍；拖拽步先走到手柄再拖到终点（同一条曲线）
  const moves: { t0: number; dur: number; to: { x: number; y: number } }[] = [];
  for (const s of STEPS) {
    const dur = s.move === "long" ? CONFIG.moveLong : CONFIG.moveShort;
    moves.push({ t0: s.at - CONFIG.hoverHold - dur, dur, to: POS[s.target] });
    if (s.act === "drag") moves.push({ t0: s.at, dur: s.until! - s.at, to: POS.sldEnd });
  }
  let cx = CONFIG.START.x, cy = CONFIG.START.y;
  for (const m of moves) {
    if (t < m.t0) break;
    cx = lerp(cx, m.to.x, tw(t, m.t0, m.dur, power2InOut));
    cy = lerp(cy, m.to.y, tw(t, m.t0, m.dur, sineInOut));
  }

  // —— 按压：光标微缩（拖拽段按住不放）——
  let cScale = 1;
  for (const s of STEPS) {
    if (s.act === "drag") {
      if (t >= s.at && t < s.until!) cScale = lerp(1, CONFIG.pressScale, tw(t, s.at, CONFIG.press, power2Out));
      else if (t >= s.until! && t < s.until! + CONFIG.press)
        cScale = lerp(CONFIG.pressScale, 1, tw(t, s.until!, CONFIG.press, power2Out));
    } else {
      if (t >= s.at && t < s.at + CONFIG.press) cScale = lerp(1, CONFIG.pressScale, tw(t, s.at, CONFIG.press, power2Out));
      else if (t >= s.at + CONFIG.press && t < s.at + CONFIG.press * 2)
        cScale = lerp(CONFIG.pressScale, 1, tw(t, s.at + CONFIG.press, CONFIG.press, power2Out));
    }
  }

  // —— 涟漪：最近一次按下，从箭头尖那点扩散 ——
  let rippleStyle: React.CSSProperties = { opacity: 0 };
  for (const s of STEPS) {
    if (t < s.at) break;
    const p = POS[s.target];
    rippleStyle = {
      opacity: 1 - tw(t, s.at, CONFIG.ripple, power2In),
      transform: `translate(${p.x}px, ${p.y}px) scale(${lerp(CONFIG.rippleFrom, CONFIG.rippleTo, tw(t, s.at, CONFIG.ripple, power2Out))})`,
    };
  }

  // —— 控件响应（响应起点 = 按下中点 at + press*0.55，不等抬手）——
  const resp = (at: number) => at + CONFIG.press * 0.55;
  // 开关
  const swT = resp(STEPS[0].at);
  const knobX = 20 * tw(t, swT, CONFIG.swap, power2Out);
  const knobBg = hexLerp("#b0b0b5", "#ffffff", tw(t, swT, CONFIG.swap * 0.6, power2Out));
  const trackBg = hexLerp("#ffffff", "#1d1d1f", tw(t, swT, CONFIG.swap * 0.7, power2Out));
  const trackBd = hexLerp("#c8c8cd", "#1d1d1f", tw(t, swT, CONFIG.swap * 0.7, power2Out));
  // 分段选择（指示器位移 = segInd.offsetWidth = 71）
  const segT = resp(STEPS[1].at);
  const segX = 71 * tw(t, segT, CONFIG.swap, power2Out);
  const segC0 = hexLerp("#ffffff", "#8a8a8a", tw(t, segT, CONFIG.swap * 0.6, power1Out));
  const segC1 = hexLerp("#8a8a8a", "#ffffff", tw(t, segT, CONFIG.swap * 0.6, power1Out));
  // 滑杆：填充 / 手柄 / 读数共用一个代理值；拖拽缓动与光标 x 完全一致
  const drag = STEPS[2];
  const sldP = lerp(CONFIG.sldFrom, CONFIG.sldTo, tw(t, drag.at, drag.until! - drag.at, power2InOut));
  const sldT = resp(drag.at);
  let thumbScale = 1, thumbBd = "#c8c8cd";
  if (t < drag.until!) {
    const p = tw(t, sldT, CONFIG.swap * 0.5, power2Out);
    thumbScale = lerp(1, 1.12, p);
    thumbBd = hexLerp("#c8c8cd", "#8a8a8a", p);
  } else {
    const p = tw(t, drag.until!, CONFIG.swap, power2Out);
    thumbScale = lerp(1.12, 1, p);
    thumbBd = hexLerp("#8a8a8a", "#c8c8cd", p);
  }
  // 保存按钮：按压微缩 → 换成功态（label ↔ 勾 交叉淡化）
  const save = STEPS[3];
  const saveT = resp(save.at);
  let btnScale = 1;
  if (t >= saveT - CONFIG.press * 0.55 && t < saveT + CONFIG.press * 0.45)
    btnScale = lerp(1, 0.96, tw(t, saveT - CONFIG.press * 0.55, CONFIG.press, power2Out));
  else if (t >= saveT + CONFIG.press * 0.45)
    btnScale = lerp(0.96, 1, tw(t, saveT + CONFIG.press * 0.45, CONFIG.press * 1.6, power2Out));
  const btnBg = hexLerp("#1d1d1f", CONFIG.accent, tw(t, saveT, CONFIG.swap, power2Out));
  const labelOp = 1 - tw(t, saveT, CONFIG.swap * 0.6, power2Out);
  const doneOp = tw(t, saveT + CONFIG.swap * 0.25, CONFIG.swap * 0.8, power2Out);

  // —— 收尾 toast：最后一次按下之后约 0.33s 滑入，停 1.8s，再退场 ——
  const tToast = save.at + 0.33;
  const toastOutAt = tToast + CONFIG.toastIn + CONFIG.toastHold;
  let toastStyle: React.CSSProperties;
  if (t < toastOutAt) {
    const p = tw(t, tToast, CONFIG.toastIn, power3Out);
    toastStyle = { opacity: p, transform: `translateY(${lerp(CONFIG.toastLift, 0, p)}px) scale(${lerp(0.97, 1, p)})` };
  } else {
    const p = tw(t, toastOutAt, CONFIG.toastOut, power2In);
    toastStyle = { opacity: 1 - p, transform: `translateY(${lerp(0, CONFIG.toastLift * 0.6, p)}px) scale(${lerp(1, 0.98, p)})` };
  }

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>

      <div className="panel" style={{ opacity: panelP, filter: `blur(${lerp(CONFIG.cardBlur, 0, panelP)}px)` }}>
        <div className="blk blk-head" style={blkStyle(0)}>
          <div className="p-title">输出设置</div>
          <div className="p-sub">字幕、主题与音量，改完记得保存</div>
          <div className="p-div" />
        </div>

        <div className="blk row" style={blkStyle(1)}>
          <div className="r-txt"><b>自动生成字幕</b><span>按语音逐句对齐</span></div>
          <div className="ctl">
            <div className="tg-track" style={{ backgroundColor: trackBg, borderColor: trackBd }}>
              <div className="tg-knob" style={{ backgroundColor: knobBg, transform: `translateX(${knobX}px)` }} />
            </div>
          </div>
        </div>

        <div className="blk row" style={blkStyle(2)}>
          <div className="r-txt"><b>界面主题</b><span>预览窗与导出封面同步切换</span></div>
          <div className="ctl">
            <div className="seg">
              <div className="seg-ind" style={{ transform: `translateX(${segX}px)` }} />
              <i style={{ color: segC0 }}>浅色</i><i style={{ color: segC1 }}>深色</i><i style={{ color: "#8a8a8a" }}>跟随</i>
            </div>
          </div>
        </div>

        <div className="blk row" style={blkStyle(3)}>
          <div className="r-txt"><b>输出音量</b><span>混音后的整体电平</span></div>
          <div className="ctl">
            <div className="sld">
              <div className="sld-track">
                <div className="sld-fill" style={{ width: `${sldP}%` }} />
                <div className="sld-thumb" style={{ left: `${sldP}%`, borderColor: thumbBd,
                  transform: `scale(${thumbScale})` }} />
              </div>
              <div className="sld-val">{Math.round(sldP)}%</div>
            </div>
          </div>
        </div>

        <div className="blk foot" style={blkStyle(4)}>
          <div className="btn-ghost">取消</div>
          <div className="btn-save" style={{ backgroundColor: btnBg,
            transform: `scale(${btnScale})`, transformOrigin: "50% 50%" }}>
            <span className="bs-label" style={{ opacity: labelOp }}>保存设置</span>
            <span className="bs-done" style={{ opacity: doneOp }}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12.6 L10 17.4 L19 7.2" stroke="#ffffff" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      <div className="toast" style={toastStyle}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" stroke={CONFIG.accent} strokeWidth="2" />
          <path d="M8 12.4 L10.7 15.1 L16.1 9" stroke={CONFIG.accent} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div><b>设置已保存</b><span>下一条视频开始生效</span></div>
      </div>

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
