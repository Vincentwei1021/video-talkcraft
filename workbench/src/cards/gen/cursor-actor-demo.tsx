import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import {
  FONT_STACK, HostSilhouette, lerp, mixHex, power2InOut, power2Out, power3Out, tw,
} from "../shared";

// cursor-actor-demo · 光标演员演示 —— 参数化版（源出 tplcards/cursor-actor-demo.tsx）
// 命门：一枚超常规尺寸光标「移动 → 悬停 → 按压 → 元素即时响应」，一个动作一个口播词。
// 移动/按压/涟漪/开关/拖拽各段时长全部 FIXED；行序列走 textarea 逐行 DSL（标题|副题|on），
// 标 on 的行会被光标依次点开，开关落点与插槽落点随行数/窗位推导（默认与模板实测值逐像素一致）。
const FPS = 30;

const FIXED = {
  moveLong: 0.52,     // 跨区域移动耗时 s（长距离）
  moveShort: 0.34,    // 相邻目标之间移动耗时 s
  moveDrag: 0.62,     // 拖拽移动耗时 s（拖着东西走要更慢更稳）
  hoverHold: 0.22,    // 悬停微停顿
  press: 0.09,        // 按压下压时长 s（抬手同值）
  pressScale: 0.9,    // 光标按压微缩倍数（锚在箭头尖）
  ripple: 0.35,       // 按压涟漪扩散耗时 s
  rippleFrom: 0.3,    // 涟漪起始倍数
  rippleTo: 1.6,      // 涟漪终止倍数
  hlIn: 0.16,         // 悬停高亮加深耗时 s
  toggleSlide: 0.28,  // 开关滑块行程耗时 s
  popIn: 0.34,        // 缩略图弹入耗时 s
  popFrom: 0.4,       // 弹入起始倍数
  START: { x: 896, y: 468 },  // 光标起手位（右下角空白处）
};

// 目标几何：模板实测值换算成相对窗口原点的偏移（默认窗位 56/48 下与模板逐像素一致）
const GEO = {
  tgDX: 519.08,   // 开关落点 x 相对窗左（575.08 − 56）
  tgDY: 109.6,    // 第一行开关落点 y 相对窗顶（157.60 − 48）
  rowStep: 52,    // 行高（tg2 − tg1 = 52）
  slotDX: 61.92,  // 插槽落点 x 相对窗左（117.92 − 56）
  slotDY: 308.6,  // 插槽落点 y 相对窗顶（356.60 − 48，随行数每行 +52）
  thumb: { x: 817.46, y: 176.30 },  // 素材库缩略图落点（tray 固定）
  baseRows: 3,    // 模板默认行数（窗高/插槽随行数差值推导）
};

// —— 行 DSL：每行 "标题|副题" 或 "标题|副题|on"；标 on 的行会被光标依次点开 ——
type Row = { b: string; s: string; on: boolean };
function parseRows(dsl: string): Row[] {
  return dsl
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const parts = l.split("|");
      return {
        b: (parts[0] ?? "").trim(),
        s: (parts[1] ?? "").trim(),
        on: (parts[2] ?? "").trim() === "on",
      };
    });
}

const DEFAULT_ROWS = [
  "自动生成字幕|按语音逐句对齐|on",
  "画面高清增强|输出 4K，渲染稍慢|on",
  "自动配背景音乐|这次先不要",
].join("\n");

const power2In = (x: number) => x * x * x;
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// —— 演示语境（不属于动效）：灰阶线框工具 UI + 素材库（类名加 cad- 前缀防串卡）——
const CSS = `
.cad-window {
  position: absolute;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #ffffff;
  z-index: 1;
}
.cad-titlebar {
  height: 36px;
  display: flex; align-items: center; gap: 6px;
  padding: 0 14px;
  border-bottom: 1px solid #ececec;
  font-size: 12px; color: #8a8a8a;
}
.cad-titlebar i { width: 9px; height: 9px; border-radius: 50%; background: #d2d2d7; }
.cad-titlebar .cad-wname { margin-left: 10px; letter-spacing: 1px; }
.cad-body { padding: 20px; }
.cad-seclabel {
  font-size: 12px; color: #8a8a8a; letter-spacing: 2px;
  margin-bottom: 12px;
}
.cad-prefrow {
  position: relative;
  height: 52px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px;
  border-radius: 8px;
}
.cad-prefrow .cad-rowhl {
  position: absolute; inset: 0;
  border-radius: 8px;
  background: #f0f0f0;
  z-index: 0;
}
.cad-prefrow .cad-rowtxt { position: relative; z-index: 1; }
.cad-prefrow .cad-rowtxt b { display: block; font-weight: 600; color: #1d1d1f; }
.cad-prefrow .cad-rowtxt span { display: block; font-size: 12px; color: #8a8a8a; margin-top: 3px; }
.cad-tg { position: relative; z-index: 1; }
.cad-tgtrack {
  width: 44px; height: 24px;
  border: 1.5px solid #c8c8cd;
  border-radius: 12px;
  background: #ffffff;
}
.cad-tgknob {
  position: absolute; left: 3px; top: 3px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #b0b0b5;
}
.cad-divider { height: 1px; background: #ececec; margin: 18px 0; }
.cad-composer {
  height: 84px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  display: flex; align-items: center; gap: 14px;
  padding: 10px;
}
.cad-slot {
  position: relative;
  width: 88px; height: 62px;
  flex: 0 0 auto;
  border: 1.5px dashed #d2d2d7;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #c8c8cd; font-size: 22px; font-weight: 300;
}
.cad-composer .cad-ph { font-size: 14px; color: #b0b0b5; }
.cad-tray {
  position: absolute;
  left: 664px; top: 108px;
  width: 236px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 16px;
  z-index: 2;
  background: #ffffff;
}
.cad-tray .cad-seclabel { margin-bottom: 10px; }
.cad-traygrid { display: flex; flex-wrap: wrap; gap: 12px; }
.cad-thumbhole {
  position: relative;
  width: 88px; height: 62px;
  border: 1.5px dashed #ececef;
  border-radius: 8px;
}
.cad-thumbhole > .cad-thumb { position: absolute; inset: -1.5px; }
.cad-thumb {
  position: relative;
  width: 88px; height: 62px;
  border: 1px solid #e6e6e9;
  border-radius: 8px;
  background: #f7f7f8;
  overflow: hidden;
}
.cad-thumb svg, .cad-slotimg svg { display: block; width: 100%; height: 100%; }
.cad-slotimg {
  position: absolute; inset: -1.5px;
  border: 1px solid #e6e6e9;
  border-radius: 8px;
  background: #f7f7f8;
  overflow: hidden;
}
.cad-cursor {
  position: absolute; left: 0; top: 0;
  width: 30px; height: 45px;
  overflow: visible;
  transform-origin: 0% 0%;
  z-index: 30;
  pointer-events: none;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, .28));
}
.cad-curhalo {
  fill: #ffffff; stroke: #ffffff; stroke-width: 2.05;
  stroke-linejoin: round; stroke-linecap: round;
}
.cad-ripple {
  position: absolute; left: -15px; top: -15px;
  width: 30px; height: 30px;
  box-sizing: border-box;
  border-radius: 50%;
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, .85),
              inset 0 0 0 1.5px rgba(255, 255, 255, .85);
  z-index: 29;
  pointer-events: none;
}
.cad-badge {
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

interface Props {
  rows?: string;
  winTitle?: string;
  secLabel?: string;
  trayLabel?: string;
  composerPh?: string;
  ink?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  startDelay?: number;
}

const CursorActorDemo: React.FC<Props> = ({
  rows = DEFAULT_ROWS,
  winTitle = "生成设置",
  secLabel = "输出偏好",
  trayLabel = "素材库",
  composerPh = "描述你想要的画面，或拖一张参考图进来…",
  ink = "#1d1d1f",
  fontSize = 15.5,
  posX = 56,
  posY = 48,
  startDelay = 0.45,
}) => {
  const t = useCurrentFrame() / FPS;
  const rowList = parseRows(rows);
  const extraRows = rowList.length - GEO.baseRows;

  // 目标点：随窗位与行数推导（默认值 = 模板实测值）
  const tgPos = (i: number) => ({ x: posX + GEO.tgDX, y: posY + GEO.tgDY + GEO.rowStep * i });
  const slotPos = { x: posX + GEO.slotDX, y: posY + GEO.slotDY + GEO.rowStep * extraRows };

  // —— 摊平的时刻表：标 on 的行依次点开，再去素材库拖图（与模板 t 累加逻辑一致）——
  const onIdx = rowList.map((r, i) => (r.on ? i : -1)).filter((i) => i >= 0);
  const moveAt: number[] = [];   // 每个 on-row 的移动起点
  const pressAt: number[] = [];  // 每个 on-row 的按压时刻
  let cur = startDelay;
  onIdx.forEach((_, j) => {
    moveAt.push(cur);
    const dur = j === 0 ? FIXED.moveLong : FIXED.moveShort;
    pressAt.push(cur + dur + FIXED.hoverHold);
    cur = pressAt[j] + FIXED.press * 2;
  });
  const tMove3 = cur + (onIdx.length ? 0.1 : 0);
  const tGrab = tMove3 + FIXED.moveLong + FIXED.hoverHold;
  const tDrag = tGrab + FIXED.press * 2;
  const tDrop = tDrag + FIXED.moveDrag;

  // —— 光标走位：x 用 power2.inOut、y 用 sine.inOut 分开插值 → 轨迹自然成弧线 ——
  const moves = [
    ...onIdx.map((row, j) => ({
      t0: moveAt[j], dur: j === 0 ? FIXED.moveLong : FIXED.moveShort, to: tgPos(row),
    })),
    { t0: tMove3, dur: FIXED.moveLong, to: GEO.thumb },
    { t0: tDrag, dur: FIXED.moveDrag, to: slotPos },
  ];
  let cx = FIXED.START.x, cy = FIXED.START.y;
  for (const m of moves) {
    if (t < m.t0) break;
    cx = lerp(cx, m.to.x, tw(t, m.t0, m.dur, power2InOut));
    cy = lerp(cy, m.to.y, tw(t, m.t0, m.dur, sineInOut));
  }

  // —— 按压：光标微缩 + 涟漪（涟漪贴住按下那一刻的箭头尖）——
  const presses = [
    ...onIdx.map((row, j) => ({ at: pressAt[j], p: tgPos(row) })),
    { at: tGrab, p: GEO.thumb },
    { at: tDrop - FIXED.press, p: slotPos },   // 松手涟漪：提前一个 press 对齐抬手帧
  ];
  let cScale = 1;
  let rippleStyle: React.CSSProperties = { opacity: 0 };
  for (const pr of presses) {
    if (t >= pr.at && t < pr.at + FIXED.press)
      cScale = lerp(1, FIXED.pressScale, tw(t, pr.at, FIXED.press, power2Out));
    else if (t >= pr.at + FIXED.press && t < pr.at + FIXED.press * 2)
      cScale = lerp(FIXED.pressScale, 1, tw(t, pr.at + FIXED.press, FIXED.press, power2Out));
    if (t >= pr.at) rippleStyle = {
      opacity: 1 - tw(t, pr.at, FIXED.ripple, power2In),
      transform: `translate(${pr.p.x}px, ${pr.p.y}px) scale(${lerp(FIXED.rippleFrom, FIXED.rippleTo, tw(t, pr.at, FIXED.ripple, power2Out))})`,
    };
  }

  // —— 开关行响应（悬停高亮 → 按压微缩 → 滑块滑动 + 轨变深）——
  const rowState = (j: number) => {
    const moveEnd = moveAt[j] + (j === 0 ? FIXED.moveLong : FIXED.moveShort);
    const pAt = pressAt[j];
    const tOn = pAt + FIXED.press * 0.55;
    const outAt = pAt + FIXED.press * 2 + 0.1;
    const hl = t < outAt
      ? tw(t, moveEnd - FIXED.hlIn * 0.5, FIXED.hlIn, power2Out)
      : 1 - tw(t, outAt, 0.2, power2Out);
    let tgScale = 1;
    if (t >= pAt && t < pAt + FIXED.press)
      tgScale = lerp(1, 0.94, tw(t, pAt, FIXED.press, power2Out));
    else if (t >= pAt + FIXED.press)
      tgScale = lerp(0.94, 1, tw(t, pAt + FIXED.press, FIXED.press * 1.6, power2Out));
    const knobX = 20 * tw(t, tOn, FIXED.toggleSlide, power2Out);
    const knobBg = mixHex("#b0b0b5", "#ffffff", tw(t, tOn, FIXED.toggleSlide * 0.6, power2Out));
    const trackBg = mixHex("#ffffff", ink, tw(t, tOn, FIXED.toggleSlide * 0.7, power2Out));
    const trackBd = mixHex("#c8c8cd", ink, tw(t, tOn, FIXED.toggleSlide * 0.7, power2Out));
    return { hl, tgScale, knobX, knobBg, trackBg, trackBd };
  };
  const states = onIdx.map((_, j) => rowState(j));
  const stateOfRow = (i: number) => {
    const j = onIdx.indexOf(i);
    return j >= 0 ? states[j] : null;
  };

  // —— 缩略图：悬停边框加深 → 按住微缩 → 跟着光标飞 → 松手拖影消失 ——
  const thumbBd = mixHex("#e6e6e9", "#b0b0b5",
    tw(t, tMove3 + FIXED.moveLong - FIXED.hlIn * 0.5, FIXED.hlIn, power2Out));
  let thumbScale = 1;
  if (t >= tGrab && t < tGrab + FIXED.press)
    thumbScale = lerp(1, 0.94, tw(t, tGrab, FIXED.press, power2Out));
  else if (t >= tGrab + FIXED.press)
    thumbScale = lerp(0.94, 1, tw(t, tGrab + FIXED.press * 1.55, FIXED.press * 1.6, power2Out));
  const dxTotal = slotPos.x - GEO.thumb.x, dyTotal = slotPos.y - GEO.thumb.y;
  const thumbX = dxTotal * tw(t, tDrag, FIXED.moveDrag, power2InOut);
  const thumbY = dyTotal * tw(t, tDrag, FIXED.moveDrag, sineInOut);
  const thumbOp = 1 - tw(t, tDrop, 0.12, power2Out);
  const popP = tw(t, tDrop, FIXED.popIn, power3Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>

      <div className="cad-window" style={{
        left: posX, top: posY, width: 560, height: 386 + GEO.rowStep * extraRows,
      }}>
        <div className="cad-titlebar"><i /><i /><i /><span className="cad-wname">{winTitle}</span></div>
        <div className="cad-body">
          <div className="cad-seclabel">{secLabel}</div>

          {rowList.map((row, i) => {
            const r = stateOfRow(i);
            return (
              <div className="cad-prefrow" key={i}>
                <div className="cad-rowhl" style={{ opacity: r ? r.hl : 0 }} />
                <div className="cad-rowtxt"><b style={{ fontSize }}>{row.b}</b><span>{row.s}</span></div>
                <div className="cad-tg" style={{
                  transform: `scale(${r ? r.tgScale : 1})`, transformOrigin: "50% 50%" }}>
                  <div className="cad-tgtrack" style={r ? { backgroundColor: r.trackBg, borderColor: r.trackBd } : {}} />
                  <div className="cad-tgknob" style={r ? {
                    backgroundColor: r.knobBg, transform: `translateX(${r.knobX}px)` } : {}} />
                </div>
              </div>
            );
          })}

          <div className="cad-divider" />

          <div className="cad-composer">
            <div className="cad-slot">
              +
              <div className="cad-slotimg" style={{
                opacity: popP, transform: `scale(${lerp(FIXED.popFrom, 1, popP)})`,
                transformOrigin: "34% 30%" }}>
                <PickSvg />
              </div>
            </div>
            <div className="cad-ph">{composerPh}</div>
          </div>
        </div>
      </div>

      <div className="cad-tray">
        <div className="cad-seclabel">{trayLabel}</div>
        <div className="cad-traygrid">
          <div className="cad-thumb">
            <svg viewBox="0 0 88 62" aria-hidden="true">
              <rect x="14" y="16" width="60" height="30" rx="4" fill="none" stroke="#c8c8cd" strokeWidth="1.5" />
              <path d="M14 38 L32 24 L52 40" fill="none" stroke="#c8c8cd" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="cad-thumbhole">
            {/* 被拖走的缩略图（拖出后底下露出虚线空槽，网格不塌） */}
            <div className="cad-thumb" style={{
              opacity: thumbOp, borderColor: thumbBd,
              transform: `translate(${thumbX}px, ${thumbY}px) scale(${thumbScale})`,
              transformOrigin: "50% 50%" }}>
              <PickSvg />
            </div>
          </div>
          <div className="cad-thumb">
            <svg viewBox="0 0 88 62" aria-hidden="true">
              <path d="M12 46 L28 46 L28 20 L44 20 L44 46 L60 46 L60 30 L76 30" fill="none" stroke="#c8c8cd" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="cad-thumb">
            <svg viewBox="0 0 88 62" aria-hidden="true">
              <circle cx="34" cy="24" r="9" fill="none" stroke="#c8c8cd" strokeWidth="1.5" />
              <path d="M16 48 C24 34, 44 34, 52 48" fill="none" stroke="#c8c8cd" strokeWidth="1.5" strokeLinejoin="round" />
              <rect x="58" y="18" width="16" height="30" rx="3" fill="none" stroke="#c8c8cd" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>

      <div className="cad-badge"><HostSilhouette /></div>

      {/* 动效本体：按压涟漪（圆心 = 箭头尖）+ 光标，尖端 = 元素左上角(0,0) */}
      <div className="cad-ripple" style={{
        ...rippleStyle,
        borderWidth: 1.7, borderStyle: "solid", borderColor: "rgba(29, 29, 31, .55)",
      }} />
      <svg className="cad-cursor" viewBox="0 0 14 21" aria-hidden="true"
           style={{ transform: `translate(${cx}px, ${cy}px) scale(${cScale})` }}>
        <path className="cad-curhalo" d={CURSOR_PATH} />
        <path d={CURSOR_PATH} style={{ fill: ink }} />
      </svg>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "cursor-actor-demo",
  name: "光标演员演示",
  category: "素材呈现",
  durationInFrames: 135,
  accent: "#1d1d1f",
  component: CursorActorDemo as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "textarea", key: "rows",
      label: "偏好行（每行：标题|副题 或 标题|副题|on；标 on 的行被光标依次点开）",
      default: DEFAULT_ROWS,
    },
    { type: "text", key: "winTitle", label: "窗口标题", default: "生成设置" },
    { type: "text", key: "secLabel", label: "分组标签", default: "输出偏好" },
    { type: "text", key: "trayLabel", label: "素材库标签", default: "素材库" },
    { type: "text", key: "composerPh", label: "输入框占位文案", default: "描述你想要的画面，或拖一张参考图进来…" },
    { type: "color", key: "ink", label: "墨色（光标/开关开态）", default: "#1d1d1f" },
    { type: "slider", key: "fontSize", label: "行标题字号", default: 15.5, min: 12, max: 20, step: 0.5, unit: "px" },
    { type: "number", key: "posX", label: "设置窗 X", default: 56, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "设置窗 Y", default: 48, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.45, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
