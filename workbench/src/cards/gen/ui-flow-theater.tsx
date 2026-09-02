import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { lerp, mixHex, power1Out, power2InOut, power2Out, power3Out, tw } from "../shared";

// ui-flow-theater · 界面流程剧场 —— 参数化版（源出 tplcards/ui-flow-theater.tsx）
// 命门：时间只从 STEPS 一处进入（光标到位/按下与控件换态同拍），控件坐标是命名常量。
// 时刻表 / 光标手感 / 控件换态时长全部 FIXED；开放的是面板文案、强调色、
// 面板位置（控件坐标随面板整体平移）、滑杆起止值（光标落点由公式反推，默认逐像素一致）。
const FPS = 30;

const FIXED = {
  // 入场
  cardIn: 0.60,       // 整卡 blur 揭示耗时 s
  cardBlur: 9,        // 整卡揭示起始模糊 px
  blkIn: 0.53,        // 卡内区块 blur-in 耗时 s
  blkBlur: 5,         // 区块揭示起始模糊 px
  blkStep: 0.20,      // 区块错峰步长 s
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
  START: { x: 118, y: 486 },   // 光标起手位（左下空白，舞台坐标不随面板动）

  // 控件换态：全库统一 0.27s + out
  swap: 0.27,

  // toast
  toastIn: 0.47,      // 滑入耗时 s
  toastHold: 1.80,    // 停留 s
  toastOut: 0.47,     // 退场耗时 s
  toastLift: 16,      // 滑入起始下沉 px
};

// 时刻表：一行一拍。at = 这一拍"按下"的时刻，光标与控件都读它。
const STEPS = [
  { at: 2.10, target: "sw",   act: "click", move: "long"  },
  { at: 3.10, target: "seg",  act: "click", move: "short" },
  { at: 4.05, target: "sld",  act: "drag",  move: "short", until: 4.95 },
  { at: 5.90, target: "save", act: "click", move: "long"  },
] as { at: number; target: "sw" | "seg" | "sld" | "save"; act: string; move: string; until?: number }[];

// 命名坐标常量（demo 实测舞台坐标，面板默认位 150/84 时成立；面板移动整体平移）
const BASE_POS = {
  sw:   { x: 768.88, y: 216.92 },
  seg:  { x: 668.99, y: 275.70 },
  save: { x: 733.00, y: 393.12 },
  sldTrackL: 559,      // 滑杆轨道左端舞台 x（实测反算：606.04 − 1.68×28）
  sldY: 335.00,
};
const PANEL_X0 = 150, PANEL_Y0 = 84;   // 模板面板原位

// —— 缓动（shared 缺的两支局部补）——
const power2In = (x: number) => x * x * x;
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// —— 演示语境（不属于动效）：灰阶假「输出设置」面板 + 成功 toast（类名加 uft- 前缀）——
const CSS = `
.uft-panel {
  position: absolute;
  width: 660px;
  padding: 26px 30px 24px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: #ffffff;
  color: #1d1d1f;
  z-index: 1;
  box-sizing: border-box;
}
.uft-panel, .uft-panel * { margin: 0; }
.uft-blk { position: relative; }
.uft-p-title { font-weight: 700; letter-spacing: 1px; }
.uft-p-sub { margin-top: 5px; font-size: 12.5px; color: #8a8a8a; letter-spacing: .5px; }
.uft-p-div { height: 1px; background: #ececef; margin: 16px 0 4px; }
.uft-row {
  height: 58px;
  display: flex; align-items: center; justify-content: space-between;
}
.uft-r-txt b { display: block; font-weight: 600; }
.uft-r-txt span { display: block; margin-top: 3px; font-size: 12px; color: #8a8a8a; }
.uft-ctl { width: 220px; flex: 0 0 220px; display: flex; align-items: center; justify-content: flex-end; }
/* —— 动效目标 1：开关（轨 46×26 / 滑块 20，行程 20px）—— */
.uft-tg-track {
  position: relative;
  width: 46px; height: 26px;
  border: 1.5px solid #c8c8cd;
  border-radius: 13px;
  background: #ffffff;
  box-sizing: border-box;
}
.uft-tg-knob {
  position: absolute; left: 2px; top: 2px;
  width: 19px; height: 19px;
  border-radius: 50%;
  background: #b0b0b5;
}
/* —— 动效目标 2：分段选择（指示器在段间滑动，只动 x）—— */
.uft-seg {
  position: relative;
  width: 220px; height: 34px;
  padding: 3px;
  border: 1px solid #e0e0e0;
  border-radius: 9px;
  background: #f7f7f8;
  display: flex;
  box-sizing: border-box;
}
.uft-seg-ind {
  position: absolute; left: 3px; top: 3px;
  width: 70.6px; height: 26px;      /* = (220 - 2 - 6) / 3 */
  border-radius: 7px;
  background: #1d1d1f;
}
.uft-seg i {
  position: relative; z-index: 1;
  flex: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: 12.5px; font-style: normal;
}
/* —— 动效目标 3：滑杆（轨 168 + 读数 44，合计 220）—— */
.uft-sld { display: flex; align-items: center; gap: 8px; }
.uft-sld-track {
  position: relative;
  width: 168px; height: 5px;
  border-radius: 3px;
  background: #ececef;
}
.uft-sld-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  border-radius: 3px;
  background: #1d1d1f;
}
.uft-sld-thumb {
  position: absolute; top: 50%;
  width: 16px; height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 50%;
  border: 1.5px solid #c8c8cd;
  background: #ffffff;
  box-sizing: border-box;
}
.uft-sld-val {
  width: 44px;
  text-align: right;
  font-size: 12.5px; color: #8a8a8a;
  font-variant-numeric: tabular-nums;
}
/* —— 动效目标 4：保存按钮（label ↔ 勾 常驻只驱动 opacity）—— */
.uft-foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 14px; }
.uft-btn-ghost {
  padding: 0 16px; height: 36px;
  display: flex; align-items: center;
  border: 1px solid #e0e0e0; border-radius: 8px;
  font-size: 13px; color: #8a8a8a;
  box-sizing: border-box;
}
.uft-btn-save {
  position: relative;
  padding: 0 20px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  font-size: 13px; font-weight: 600; color: #ffffff;
  overflow: hidden;
  box-sizing: border-box;
}
.uft-bs-label { position: relative; }
.uft-bs-done {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.uft-bs-done svg { width: 18px; height: 18px; display: block; }
/* —— 动效目标 5：成功 toast（滑入 → 停 → 退）—— */
.uft-toast {
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
  box-sizing: border-box;
}
.uft-toast svg { width: 19px; height: 19px; flex: 0 0 auto; display: block; }
.uft-toast b { display: block; font-size: 13.5px; font-weight: 600; }
.uft-toast span { display: block; margin-top: 2px; font-size: 12px; color: #8a8a8a; }
/* —— 动效本体 —— 光标（同一条 path 描两遍：白边层 + 实心层） */
.uft-cursor {
  position: absolute; left: 0; top: 0;
  width: 30px; height: 45px;
  overflow: visible;
  transform-origin: 0% 0%;    /* 锚在箭头尖 */
  z-index: 30;
  pointer-events: none;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, .28));
}
.uft-cur-halo {
  fill: #ffffff; stroke: #ffffff; stroke-width: 2.05;
  stroke-linejoin: round; stroke-linecap: round;
}
.uft-cur-body { fill: #1d1d1f; }
/* 按压涟漪：圆心 = 箭头尖，深芯 + 内外白边 */
.uft-click-ripple {
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

const DEFAULT_ROWS = "自动生成字幕|按语音逐句对齐\n界面主题|预览窗与导出封面同步切换\n输出音量|混音后的整体电平";

// DSL：每行 "主文案|副文案"，依次对应 开关行 / 分段行 / 滑杆行（固定三行控件）
const parseRows = (dsl: string) => {
  const rows = dsl.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const idx = l.indexOf("|");
    return idx >= 0
      ? { label: l.slice(0, idx).trim(), sub: l.slice(idx + 1).trim() }
      : { label: l, sub: "" };
  });
  while (rows.length < 3) rows.push({ label: "", sub: "" });
  return rows;
};

interface Props {
  panelTitle?: string;
  panelSub?: string;
  rowsDsl?: string;
  segLabels?: string;
  cancelLabel?: string;
  saveLabel?: string;
  toastTitle?: string;
  toastSub?: string;
  accent?: string;
  titleSize?: number;
  rowSize?: number;
  posX?: number;
  posY?: number;
  sldFrom?: number;
  sldTo?: number;
  lead?: number;
}

const UiFlowTheater: React.FC<Props> = ({
  panelTitle = "输出设置",
  panelSub = "字幕、主题与音量，改完记得保存",
  rowsDsl = DEFAULT_ROWS,
  segLabels = "浅色|深色|跟随",
  cancelLabel = "取消",
  saveLabel = "保存设置",
  toastTitle = "设置已保存",
  toastSub = "下一条视频开始生效",
  accent = "#d8383a",
  titleSize = 20,
  rowSize = 15,
  posX = 150,
  posY = 84,
  sldFrom = 28,
  sldTo = 76,
  lead = 0,
}) => {
  const t = useCurrentFrame() / FPS - lead;   // 整体延后：全部时刻表统一平移
  const rows = parseRows(rowsDsl);
  const segs = segLabels.split("|").map((s) => s.trim());

  // 控件坐标：随面板位置整体平移；滑杆两端由起止值反推（默认 28/76 ⇒ 606.04/686.68）
  const dx = posX - PANEL_X0, dy = posY - PANEL_Y0;
  const POS: Record<string, { x: number; y: number }> = {
    sw:     { x: BASE_POS.sw.x + dx, y: BASE_POS.sw.y + dy },
    seg:    { x: BASE_POS.seg.x + dx, y: BASE_POS.seg.y + dy },
    sld:    { x: BASE_POS.sldTrackL + 1.68 * sldFrom + dx, y: BASE_POS.sldY + dy },
    sldEnd: { x: BASE_POS.sldTrackL + 1.68 * sldTo + dx, y: BASE_POS.sldY + dy },
    save:   { x: BASE_POS.save.x + dx, y: BASE_POS.save.y + dy },
  };

  // —— 入场：整卡 blur 揭示 → 卡内区块每 0.2s 错峰一个 ——
  const panelP = tw(t, 0, FIXED.cardIn, power2Out);
  const blkP = (i: number) => tw(t, FIXED.cardIn + i * FIXED.blkStep, FIXED.blkIn, power2Out);
  const blkStyle = (i: number): React.CSSProperties => {
    const p = blkP(i);
    return { opacity: p, transform: `translateY(${lerp(FIXED.blkLift, 0, p)}px)`,
             filter: `blur(${lerp(FIXED.blkBlur, 0, p)}px)` };
  };

  // —— 光标走位：x 用 power2.inOut、y 用 sine.inOut 分开插值 → 轨迹天然成弧线 ——
  const moves: { t0: number; dur: number; to: { x: number; y: number } }[] = [];
  for (const s of STEPS) {
    const dur = s.move === "long" ? FIXED.moveLong : FIXED.moveShort;
    moves.push({ t0: s.at - FIXED.hoverHold - dur, dur, to: POS[s.target] });
    if (s.act === "drag") moves.push({ t0: s.at, dur: s.until! - s.at, to: POS.sldEnd });
  }
  let cx = FIXED.START.x, cy = FIXED.START.y;
  for (const m of moves) {
    if (t < m.t0) break;
    cx = lerp(cx, m.to.x, tw(t, m.t0, m.dur, power2InOut));
    cy = lerp(cy, m.to.y, tw(t, m.t0, m.dur, sineInOut));
  }

  // —— 按压：光标微缩（拖拽段按住不放）——
  let cScale = 1;
  for (const s of STEPS) {
    if (s.act === "drag") {
      if (t >= s.at && t < s.until!) cScale = lerp(1, FIXED.pressScale, tw(t, s.at, FIXED.press, power2Out));
      else if (t >= s.until! && t < s.until! + FIXED.press)
        cScale = lerp(FIXED.pressScale, 1, tw(t, s.until!, FIXED.press, power2Out));
    } else {
      if (t >= s.at && t < s.at + FIXED.press) cScale = lerp(1, FIXED.pressScale, tw(t, s.at, FIXED.press, power2Out));
      else if (t >= s.at + FIXED.press && t < s.at + FIXED.press * 2)
        cScale = lerp(FIXED.pressScale, 1, tw(t, s.at + FIXED.press, FIXED.press, power2Out));
    }
  }

  // —— 涟漪：最近一次按下，从箭头尖那点扩散 ——
  let rippleStyle: React.CSSProperties = { opacity: 0 };
  for (const s of STEPS) {
    if (t < s.at) break;
    const p = POS[s.target];
    rippleStyle = {
      opacity: 1 - tw(t, s.at, FIXED.ripple, power2In),
      transform: `translate(${p.x}px, ${p.y}px) scale(${lerp(FIXED.rippleFrom, FIXED.rippleTo, tw(t, s.at, FIXED.ripple, power2Out))})`,
    };
  }

  // —— 控件响应（响应起点 = 按下中点 at + press*0.55，不等抬手）——
  const resp = (at: number) => at + FIXED.press * 0.55;
  // 开关
  const swT = resp(STEPS[0].at);
  const knobX = 20 * tw(t, swT, FIXED.swap, power2Out);
  const knobBg = mixHex("#b0b0b5", "#ffffff", tw(t, swT, FIXED.swap * 0.6, power2Out));
  const trackBg = mixHex("#ffffff", "#1d1d1f", tw(t, swT, FIXED.swap * 0.7, power2Out));
  const trackBd = mixHex("#c8c8cd", "#1d1d1f", tw(t, swT, FIXED.swap * 0.7, power2Out));
  // 分段选择（指示器位移 = segInd.offsetWidth = 71）
  const segT = resp(STEPS[1].at);
  const segX = 71 * tw(t, segT, FIXED.swap, power2Out);
  const segC0 = mixHex("#ffffff", "#8a8a8a", tw(t, segT, FIXED.swap * 0.6, power1Out));
  const segC1 = mixHex("#8a8a8a", "#ffffff", tw(t, segT, FIXED.swap * 0.6, power1Out));
  // 滑杆：填充 / 手柄 / 读数共用一个代理值；拖拽缓动与光标 x 完全一致
  const drag = STEPS[2];
  const sldP = lerp(sldFrom, sldTo, tw(t, drag.at, drag.until! - drag.at, power2InOut));
  const sldT = resp(drag.at);
  let thumbScale = 1, thumbBd = "#c8c8cd";
  if (t < drag.until!) {
    const p = tw(t, sldT, FIXED.swap * 0.5, power2Out);
    thumbScale = lerp(1, 1.12, p);
    thumbBd = mixHex("#c8c8cd", "#8a8a8a", p);
  } else {
    const p = tw(t, drag.until!, FIXED.swap, power2Out);
    thumbScale = lerp(1.12, 1, p);
    thumbBd = mixHex("#8a8a8a", "#c8c8cd", p);
  }
  // 保存按钮：按压微缩 → 换成功态（label ↔ 勾 交叉淡化）
  const save = STEPS[3];
  const saveT = resp(save.at);
  let btnScale = 1;
  if (t >= saveT - FIXED.press * 0.55 && t < saveT + FIXED.press * 0.45)
    btnScale = lerp(1, 0.96, tw(t, saveT - FIXED.press * 0.55, FIXED.press, power2Out));
  else if (t >= saveT + FIXED.press * 0.45)
    btnScale = lerp(0.96, 1, tw(t, saveT + FIXED.press * 0.45, FIXED.press * 1.6, power2Out));
  const btnBg = mixHex("#1d1d1f", accent, tw(t, saveT, FIXED.swap, power2Out));
  const labelOp = 1 - tw(t, saveT, FIXED.swap * 0.6, power2Out);
  const doneOp = tw(t, saveT + FIXED.swap * 0.25, FIXED.swap * 0.8, power2Out);

  // —— 收尾 toast：最后一次按下之后约 0.33s 滑入，停 1.8s，再退场 ——
  const tToast = save.at + 0.33;
  const toastOutAt = tToast + FIXED.toastIn + FIXED.toastHold;
  let toastStyle: React.CSSProperties;
  if (t < toastOutAt) {
    const p = tw(t, tToast, FIXED.toastIn, power3Out);
    toastStyle = { opacity: p, transform: `translateY(${lerp(FIXED.toastLift, 0, p)}px) scale(${lerp(0.97, 1, p)})` };
  } else {
    const p = tw(t, toastOutAt, FIXED.toastOut, power2In);
    toastStyle = { opacity: 1 - p, transform: `translateY(${lerp(0, FIXED.toastLift * 0.6, p)}px) scale(${lerp(1, 0.98, p)})` };
  }

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>

      <div className="uft-panel" style={{
        left: posX, top: posY,
        opacity: panelP, filter: `blur(${lerp(FIXED.cardBlur, 0, panelP)}px)`,
      }}>
        <div className="uft-blk" style={blkStyle(0)}>
          <div className="uft-p-title" style={{ fontSize: titleSize }}>{panelTitle}</div>
          <div className="uft-p-sub">{panelSub}</div>
          <div className="uft-p-div" />
        </div>

        <div className="uft-blk uft-row" style={blkStyle(1)}>
          <div className="uft-r-txt"><b style={{ fontSize: rowSize }}>{rows[0].label}</b><span>{rows[0].sub}</span></div>
          <div className="uft-ctl">
            <div className="uft-tg-track" style={{ backgroundColor: trackBg, borderColor: trackBd }}>
              <div className="uft-tg-knob" style={{ backgroundColor: knobBg, transform: `translateX(${knobX}px)` }} />
            </div>
          </div>
        </div>

        <div className="uft-blk uft-row" style={blkStyle(2)}>
          <div className="uft-r-txt"><b style={{ fontSize: rowSize }}>{rows[1].label}</b><span>{rows[1].sub}</span></div>
          <div className="uft-ctl">
            <div className="uft-seg">
              <div className="uft-seg-ind" style={{ transform: `translateX(${segX}px)` }} />
              <i style={{ color: segC0 }}>{segs[0] ?? ""}</i>
              <i style={{ color: segC1 }}>{segs[1] ?? ""}</i>
              <i style={{ color: "#8a8a8a" }}>{segs[2] ?? ""}</i>
            </div>
          </div>
        </div>

        <div className="uft-blk uft-row" style={blkStyle(3)}>
          <div className="uft-r-txt"><b style={{ fontSize: rowSize }}>{rows[2].label}</b><span>{rows[2].sub}</span></div>
          <div className="uft-ctl">
            <div className="uft-sld">
              <div className="uft-sld-track">
                <div className="uft-sld-fill" style={{ width: `${sldP}%` }} />
                <div className="uft-sld-thumb" style={{ left: `${sldP}%`, borderColor: thumbBd,
                  transform: `scale(${thumbScale})` }} />
              </div>
              <div className="uft-sld-val">{Math.round(sldP)}%</div>
            </div>
          </div>
        </div>

        <div className="uft-blk uft-foot" style={blkStyle(4)}>
          <div className="uft-btn-ghost">{cancelLabel}</div>
          <div className="uft-btn-save" style={{ backgroundColor: btnBg,
            transform: `scale(${btnScale})`, transformOrigin: "50% 50%" }}>
            <span className="uft-bs-label" style={{ opacity: labelOp }}>{saveLabel}</span>
            <span className="uft-bs-done" style={{ opacity: doneOp }}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12.6 L10 17.4 L19 7.2" stroke="#ffffff" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      <div className="uft-toast" style={toastStyle}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" stroke={accent} strokeWidth="2" />
          <path d="M8 12.4 L10.7 15.1 L16.1 9" stroke={accent} strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div><b>{toastTitle}</b><span>{toastSub}</span></div>
      </div>

      <div className="uft-click-ripple" style={rippleStyle} />
      <svg className="uft-cursor" viewBox="0 0 14 21" aria-hidden="true"
           style={{ transform: `translate(${cx}px, ${cy}px) scale(${cScale})` }}>
        <path className="uft-cur-halo" d={CURSOR_PATH} />
        <path className="uft-cur-body" d={CURSOR_PATH} />
      </svg>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "ui-flow-theater",
  name: "界面流程剧场",
  category: "素材呈现",
  durationInFrames: 281,
  accent: "#d8383a",
  component: UiFlowTheater as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "panelTitle", label: "面板标题", default: "输出设置" },
    { type: "text", key: "panelSub", label: "面板副题", default: "字幕、主题与音量，改完记得保存" },
    { type: "textarea", key: "rowsDsl", label: "三行设置（每行：主文案|副文案；依次为开关/分段/滑杆行）", default: DEFAULT_ROWS },
    { type: "text", key: "segLabels", label: "分段选项（| 分隔三段，点第二段）", default: "浅色|深色|跟随" },
    { type: "text", key: "cancelLabel", label: "取消按钮文案", default: "取消" },
    { type: "text", key: "saveLabel", label: "保存按钮文案", default: "保存设置" },
    { type: "text", key: "toastTitle", label: "toast 主文案", default: "设置已保存" },
    { type: "text", key: "toastSub", label: "toast 副文案", default: "下一条视频开始生效" },
    { type: "color", key: "accent", label: "强调色（保存成功那一拍）", default: "#d8383a" },
    { type: "slider", key: "titleSize", label: "面板标题字号", default: 20, min: 16, max: 28, step: 1, unit: "px" },
    { type: "slider", key: "rowSize", label: "行主文案字号", default: 15, min: 12, max: 18, step: 0.5, unit: "px" },
    { type: "number", key: "posX", label: "面板 X（控件坐标随动）", default: 150, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "面板 Y（控件坐标随动）", default: 84, step: 1, unit: "px" },
    { type: "slider", key: "sldFrom", label: "滑杆起始值", default: 28, min: 0, max: 100, step: 1, unit: "%" },
    { type: "slider", key: "sldTo", label: "滑杆目标值", default: 76, min: 0, max: 100, step: 1, unit: "%" },
    { type: "slider", key: "lead", label: "整体延后（对齐口播）", default: 0, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
