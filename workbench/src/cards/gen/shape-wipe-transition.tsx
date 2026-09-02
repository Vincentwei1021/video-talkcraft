import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import {
  FONT_STACK, HostSilhouette, lerp, power3Out, power4In, power4Out, tw,
} from "../shared";

// shape-wipe-transition · 色块扫屏转场 —— 参数化版（源出 tplcards/shape-wipe-transition.tsx）
// 命门：三层同色系浅→中→深斜切错峰扫屏，换内容藏在第二层完全盖住全屏的那一帧；
//       扫屏时长/层间错峰/斜切角/拉伸倍数保持 FIXED——只放出文案 / 三档扫屏色 / 底色 / 字号 / 起手静置。
const FPS = 30;

const FIXED = {
  wipeDur: 0.45,    // 单层扫屏耗时 s：>0.7 读作拉幕布，<0.3 只剩闪烁
  layerDelay: 0.07, // 层间错峰 60~80ms：>120ms 露缝穿帮
  skew: -12,        // 斜切角度：0 读作 PPT 推入
  stretch: 1.22,    // 过屏中段横向拉伸倍数（速度感）：>1.4 读作果冻
  barIn: 0.4,       // 场景 B 单根柱子长出时长 s
  barStagger: 0.06, // 柱间错峰 s
};

// 演示语境（不属于动效）：场景 A 主持人讲概念 / 场景 B CSS 画的假数据图表（类名加 swt- 前缀防串卡）
const CSS = `
.swt-scene { position: absolute; inset: 0; }
.swt-chapter-tag {
  position: absolute; top: 26px; left: 30px;
  font-size: 15px; font-weight: 700; letter-spacing: 2px; color: #8a8a8a;
  padding: 6px 14px; border: 1px solid #e0e0e0; border-radius: 6px;
}
.swt-chart-card {
  position: absolute; left: 50%; top: 46%;
  transform: translate(-50%, -50%);
  width: 560px; padding: 26px 34px 22px;
  border: 1px solid #e0e0e0; border-radius: 10px;
}
.swt-chart-title { font-weight: 700; color: #1d1d1f; }
.swt-chart-src { margin-top: 14px; font-size: 12px; color: #8a8a8a; }
.swt-bars {
  margin-top: 18px; display: flex; align-items: flex-end;
  gap: 42px; height: 190px; padding: 0 14px;
  border-bottom: 1px solid #e0e0e0;
}
.swt-bar { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 74px; }
.swt-bar i {
  display: block; width: 100%;
  border-radius: 4px 4px 0 0; background: #c8c8cc;
  transform-origin: 50% 100%;
}
.swt-bar b { font-size: 17px; color: #8a8a8a; }
.swt-bar.swt-hot i { background: #1d1d1f; }
.swt-bar.swt-hot b { color: #1d1d1f; }
.swt-bar-x {
  display: flex; gap: 42px; padding: 8px 14px 0;
  width: 560px; margin: 0 auto;
}
.swt-bar-x span { width: 74px; text-align: center; font-size: 14px; color: #8a8a8a; }

/* 扫屏色块：宽 2.6 倍屏宽——power4 高速段里 70ms 错峰会拉开约 2 屏宽的空间间距，
   块不够宽中段必露缝；动画只改 transform */
.swt-wipe-layer {
  position: absolute;
  top: -8%; height: 116%;
  left: -80%; width: 260%;
  will-change: transform;
}
`;

interface Props {
  tagA?: string;
  tagB?: string;
  chartTitle?: string;
  bars?: string;
  chartSrc?: string;
  wipeLight?: string;
  wipeMid?: string;
  wipeDeep?: string;
  bg?: string;
  chartFontSize?: number;
  lead?: number;
}

const ShapeWipeTransition: React.FC<Props> = ({
  tagA = "01 · 讲概念",
  tagB = "02 · 看数据",
  chartTitle = "季度营收同比增速",
  bars = "Q1|+12%|56\nQ2|+18%|84\nQ3|+34%|128\nQ4|+61%|182|hot",
  chartSrc = "数据来源：公司 2024 年报",
  wipeLight = "#d8d8dc",
  wipeMid = "#8a8a8e",
  wipeDeep = "#1d1d1f",
  bg = "#ffffff",
  chartFontSize = 21,
  lead = 0.9,
}) => {
  const t = useCurrentFrame() / FPS;

  // 三层必须同色系浅→中→深（后扫的深色层压在最上）——这就是本卡唯一的颜色接口
  const colors = [wipeLight, wipeMid, wipeDeep];

  // 场景 B 柱子：每行 "X标签|标注|柱高px"，末尾加 |hot 标重点柱（条数自适应）
  const barRows = bars
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => l.split("|").map((c) => c.trim()));

  // 换内容藏在遮挡帧里：第二层运动中点 = 它完全盖住全屏的那一帧
  const swapAt = lead + FIXED.layerDelay + FIXED.wipeDur / 2;
  const sceneBOn = t >= swapAt;

  // 单层扫屏：拆成 power4.in + power4.out 两段 = 整体 power4.inOut，
  // 中点（完全盖住全屏的那一帧）同步到拉伸峰值
  const layerAt = (i: number) => {
    const t0 = lead + i * FIXED.layerDelay;
    const half = FIXED.wipeDur / 2;
    if (t < t0 + half) {
      const p = tw(t, t0, half, power4In);
      return { xp: lerp(-75, 0, p), sx: lerp(1, FIXED.stretch, p) };
    }
    const p = tw(t, t0 + half, half, power4Out);
    return { xp: lerp(0, 75, p), sx: lerp(FIXED.stretch, 1, p) };
  };

  // 场景 B：色块扫净后，柱状图逐根长出
  const barsAt = lead + 2 * FIXED.layerDelay + FIXED.wipeDur;

  return (
    <AbsoluteFill style={{
      background: bg, color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>

      {/* 场景 A：主持人讲概念 */}
      <div className="swt-scene" style={{
        opacity: sceneBOn ? 0 : 1, visibility: sceneBOn ? "hidden" : "visible",
      }}>
        <HostSilhouette />
        <div className="swt-chapter-tag">{tagA}</div>
      </div>

      {/* 场景 B：数据图表占位（CSS 画的假图表） */}
      <div className="swt-scene" style={{
        background: bg,
        opacity: sceneBOn ? 1 : 0, visibility: sceneBOn ? "visible" : "hidden",
      }}>
        <div className="swt-chapter-tag">{tagB}</div>
        <div className="swt-chart-card">
          <div className="swt-chart-title" style={{ fontSize: chartFontSize }}>{chartTitle}</div>
          <div className="swt-bars">
            {barRows.map((cells, j) => {
              const hot = (cells[3] ?? "") === "hot";
              return (
                <div key={j} className={hot ? "swt-bar swt-hot" : "swt-bar"}>
                  <b>{cells[1] ?? ""}</b>
                  <i style={{
                    height: Number(cells[2]) || 0,
                    transform: `scaleY(${tw(t, barsAt + j * FIXED.barStagger, FIXED.barIn, power3Out)})`,
                  }} />
                </div>
              );
            })}
          </div>
          <div className="swt-bar-x">
            {barRows.map((cells, j) => <span key={j}>{cells[0] ?? ""}</span>)}
          </div>
          <div className="swt-chart-src">{chartSrc}</div>
        </div>
      </div>

      {/* 扫屏色块（动效本体）：单一色系的浅→中→深三档，后扫的层叠在上面 */}
      {colors.map((color, i) => {
        const { xp, sx } = layerAt(i);
        return (
          <div key={i} className="swt-wipe-layer" style={{
            background: color,
            transform: `translate3d(${xp}%, 0px, 0px) skewX(${FIXED.skew}deg) scaleX(${sx})`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "shape-wipe-transition",
  name: "色块扫屏转场",
  category: "转场结构",
  durationInFrames: 74,
  accent: "#1d1d1f",
  component: ShapeWipeTransition as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "tagA", label: "场景 A 章节标签", default: "01 · 讲概念" },
    { type: "text", key: "tagB", label: "场景 B 章节标签", default: "02 · 看数据" },
    { type: "text", key: "chartTitle", label: "图表标题", default: "季度营收同比增速" },
    { type: "textarea", key: "bars", label: "柱状图（每行：X标签|标注|柱高px，末尾加 |hot 标重点柱）", default: "Q1|+12%|56\nQ2|+18%|84\nQ3|+34%|128\nQ4|+61%|182|hot" },
    { type: "text", key: "chartSrc", label: "数据来源脚注", default: "数据来源：公司 2024 年报" },
    { type: "slider", key: "chartFontSize", label: "图表标题字号", default: 21, min: 16, max: 30, step: 1, unit: "px" },
    { type: "color", key: "wipeLight", label: "扫屏色 · 浅档", default: "#d8d8dc" },
    { type: "color", key: "wipeMid", label: "扫屏色 · 中档", default: "#8a8a8e" },
    { type: "color", key: "wipeDeep", label: "扫屏色 · 深档（主色）", default: "#1d1d1f" },
    { type: "color", key: "bg", label: "底色", default: "#ffffff" },
    { type: "slider", key: "lead", label: "起手静置（场景 A 停留）", default: 0.9, min: 0.3, max: 2, step: 0.05, unit: "s" },
  ],
};
