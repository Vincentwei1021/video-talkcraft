import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, power2InOut, power2Out, power3Out, tw } from "../shared";

// host-shrink-to-chip · 人物缩位让台 —— 参数化版（源出 tplcards/host-shrink-to-chip.tsx）
// 命门：裁切窗（clip-path，锁在舞台坐标系）与人物层（transform）由同一个进度 p 驱动，
// 拆成两条 tween 会因缓动不同步让人脸半路出框——chip 几何 / 缩位曲线全部 FIXED。
// 人物保留模板原生透明剪影写法：全屏态的白底（shared HostSilhouette）会把对侧入场的图形卡糊掉。
const FPS = 30;
const SW = 960;
const SH = 540;

const FIXED = {
  shrink: 0.42,           // 缩位耗时 s（power2.inOut，起收都要缓）
  chipRatio: 0.18,        // 圆 chip 直径 / 屏宽
  chipInsetX: 0.042,      // chip 左边距 / 屏宽
  chipInsetBottom: 0.089, // chip 下边距 / 屏高（圆心必须落在画面下 1/3 带内）
  chipScale: 0.72,        // 角标期人物层缩放
  anchorX: 0.5,           // 取景锚点 / 屏宽
  anchorY: 0.324,         // 取景锚点 / 屏高——略低于头部中心，取景才带上肩
  gfxLag: 0.15,           // 图形相对缩位起点的错峰延迟 s（同帧出场=两边打架）
  gfxIn: 0.45,            // 图形入场耗时 s（power3.out）
  gfxSlide: 90,           // 图形从对侧滑入的位移 px
};

// 演示语境（不属于动效）：灰阶线框图表卡（类名加 hstc- 前缀防串卡）
const CSS = `
.hstc-gfx {
  position: absolute;
  z-index: 2;
  width: 590px;
  padding: 22px 26px 18px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
.hstc-gfx .hstc-gfx-head {
  font-size: 13px;
  letter-spacing: 2px;
  color: #8a8a8a;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.hstc-gfx .hstc-gfx-big {
  font-weight: 700;
  margin: 14px 0 2px;
  letter-spacing: 1px;
}
.hstc-gfx .hstc-gfx-note { font-size: 13px; color: #8a8a8a; }
.hstc-gfx svg { display: block; margin-top: 6px; }
`;

interface Props {
  gfxHead?: string;
  gfxBig?: string;
  gfxNote?: string;
  yearLabels?: string;
  ink?: string;
  barColor?: string;
  bigSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
}

const BAR_RECTS: [number, number, number][] = [
  [22, 96, 56], [106, 78, 74], [190, 106, 46], [274, 66, 86], [358, 38, 114], [442, 18, 134],
];

const HostShrinkToChip: React.FC<Props> = ({
  gfxHead = "韩国综合股价指数 · 年末收盘",
  gfxBig = "2,398 → 4,062",
  gfxNote = "2020—2025，五年翻了将近一倍",
  yearLabels = "2020 2021 2022 2023 2024 2025",
  ink = "#1d1d1f",
  barColor = "#dcdcdc",
  bigSize = 30,
  posX = 48,
  posY = 92,
  lead = 0.8,
}) => {
  const t = useCurrentFrame() / FPS;

  // chip 几何：一份数据同时喂给裁切窗与描边，永不错位（@960×540）
  const r = (SW * FIXED.chipRatio) / 2;
  const cx = SW * FIXED.chipInsetX + r;
  const cy = SH - SH * FIXED.chipInsetBottom - r;
  const chipBox = { top: cy - r, right: SW - (cx + r), bottom: SH - (cy + r), left: cx - r };
  // 缩位位移：让"取景锚点"落到 chip 圆心（缩放绕锚点做，所以位移就是两点之差）
  const dx = cx - SW * FIXED.anchorX;
  const dy = cy - SH * FIXED.anchorY;

  // ① 缩位进度：0 = 全屏主角，1 = 角标 chip。裁切与内容同一进度
  const p = tw(t, lead, FIXED.shrink, power2InOut);
  const clipPath = "inset(" +
    lerp(0, chipBox.top, p).toFixed(2) + "px " +
    lerp(0, chipBox.right, p).toFixed(2) + "px " +
    lerp(0, chipBox.bottom, p).toFixed(2) + "px " +
    lerp(0, chipBox.left, p).toFixed(2) + "px round " +
    lerp(0, r, p).toFixed(2) + "px)";

  // chip 描边淡入（缩位走到 55% 时起步）
  const ringOp = tw(t, lead + FIXED.shrink * 0.55, 0.2, power2Out);
  // ② 图形主角从对侧错峰入场（晚 0.15s，让位在前、接位在后）
  const gfxP = tw(t, lead + FIXED.gfxLag, FIXED.gfxIn, power3Out);

  const years = yearLabels.trim().split(/\s+/);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>

      {/* 图形主角：口播讲到的那张图（内部静态——柱子自己的生长动效属于 chart-grow 卡） */}
      <div
        className="hstc-gfx"
        style={{
          right: posX, top: posY, color: ink,
          opacity: gfxP, transform: `translateX(${lerp(FIXED.gfxSlide, 0, gfxP)}px)`,
        }}
      >
        <div className="hstc-gfx-head">{gfxHead}</div>
        <div className="hstc-gfx-big" style={{ fontSize: bigSize }}>{gfxBig}</div>
        <div className="hstc-gfx-note">{gfxNote}</div>
        <svg viewBox="0 0 538 178" width="538" height="178" aria-hidden="true">
          <line x1="0" y1="30" x2="538" y2="30" stroke="#f2f2f2" />
          <line x1="0" y1="82" x2="538" y2="82" stroke="#f2f2f2" />
          <line x1="0" y1="134" x2="538" y2="134" stroke="#f2f2f2" />
          <line x1="0" y1="152" x2="538" y2="152" stroke="#d8d8d8" />
          <g fill={barColor}>
            {BAR_RECTS.map(([x, y, h], i) => (
              <rect key={i} x={x} y={y} width={48} height={h} />
            ))}
          </g>
          <g fill="#b0b0b0" fontSize="11" textAnchor="middle"
             fontFamily="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif">
            {years.map((yl, i) => (
              <text key={i} x={46 + i * 84} y={170}>{yl}</text>
            ))}
          </g>
        </svg>
      </div>

      {/* 人物裁切窗：几何全程锁在舞台坐标系里（只动 clip-path，不动 transform）
          刻意裁切特写（data-crop-ok）：全屏 → 角标圆 chip，单程不回归 */}
      <div data-crop-ok style={{ position: "absolute", inset: 0, zIndex: 3, clipPath }}>
        {/* 人物层：真正被缩放位移的那一层 */}
        <div style={{
          position: "absolute", inset: 0,
          transform: `translate(${lerp(0, dx, p)}px, ${lerp(0, dy, p)}px) scale(${lerp(1, FIXED.chipScale, p)})`,
          transformOrigin: `${FIXED.anchorX * 100}% ${FIXED.anchorY * 100}%`,
          willChange: "transform",
        }}>
          {/* 模板原生透明剪影：白底会把对侧入场的图形卡糊掉，故不用 shared HostSilhouette */}
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "flex-end", justifyContent: "center", background: "transparent",
          }}>
            <div style={{
              width: "42%", height: "78%",
              background:
                "radial-gradient(ellipse 46% 26% at 50% 13%, #e3e3e6 60%, transparent 61%)," +
                "radial-gradient(ellipse 50% 62% at 50% 84%, #ececef 60%, transparent 61%)",
            }} />
          </div>
        </div>
      </div>

      {/* chip 描边：白底上没有这根发丝线就读不出"头像章"的边界 */}
      <div style={{
        position: "absolute", zIndex: 4,
        left: chipBox.left, top: chipBox.top, width: r * 2, height: r * 2,
        borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0", borderRadius: "50%",
        opacity: ringOp, pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "host-shrink-to-chip",
  name: "人物缩位让台",
  category: "人物互动",
  durationInFrames: 114,
  accent: "#8a8a8a",
  component: HostShrinkToChip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "gfxHead", label: "图形卡眉题", default: "韩国综合股价指数 · 年末收盘" },
    { type: "text", key: "gfxBig", label: "图形卡大数字", default: "2,398 → 4,062" },
    { type: "text", key: "gfxNote", label: "图形卡副注", default: "2020—2025，五年翻了将近一倍" },
    { type: "text", key: "yearLabels", label: "横轴标签（空格分隔）", default: "2020 2021 2022 2023 2024 2025" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "color", key: "barColor", label: "柱色", default: "#dcdcdc" },
    { type: "slider", key: "bigSize", label: "大数字字号", default: 30, min: 20, max: 44, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "图形卡距右缘", default: 48, min: 0, max: 400, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "图形卡距顶缘", default: 92, min: 0, max: 400, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置（口播先站一拍）", default: 0.8, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
