import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, power2Out, power3Out, tw } from "../shared";

// chart-grow · 图表生长 —— 参数化版（源出 tplcards/chart-grow.tsx，全图表卡，无主持人）
// 命门：先立坐标系再长柱子；柱间错峰 0.13s（"逐项列举"的语感）与最高柱到顶的整图
// punch 一拍保持 FIXED；量程全程固定，中途缩放会让对比失真。
// 数据经 "标签|数值|hot（可选）" DSL 注入：柱宽随条数自适应，punch 时刻随条数顺延。
const FPS = 30;

const FIXED = {
  axisGap: 0.0,     // 轴+网格相对起手的延后 s
  axisIn: 0.3,      // 轴+网格淡入耗时 s
  barsGap: 0.35,    // 第一根柱相对起手的延后 s
  barGrow: 0.5,     // 单柱 scaleY 0→1 耗时 s（origin bottom）
  barStagger: 0.13, // 柱间错峰 100~150ms：本卡命门
  labelPopAt: 0.72, // 柱顶数字在柱子长到多少进度时 pop（0~1）
  punchScale: 1.03, // 最高柱到顶时整图轻 punch 幅度
  wrapW: 720,       // 图表区宽 px（= 960 − 120×2）
  wrapH: 340,       // 图表区高 px（= 540 − 108 − 92）
  barsInnerW: 680,  // 柱区可用宽 px（wrap 内 left 30 / right 10）
};

// back.out —— shared 未含，本卡局部定义
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// 演示语境（不属于动效）：图表底，白底 + 灰阶坐标系（类名加 cg- 前缀防串卡）
const CSS = `
.cg-title { position: absolute; font-weight: 700; color: #1d1d1f; letter-spacing: 2px; }
.cg-axis-x, .cg-axis-y { position: absolute; background: #c8c8cc; }
.cg-axis-x { left: 0; right: 0; bottom: 0; height: 2px; }
.cg-axis-y { left: 0; top: 0; bottom: 0; width: 2px; }
.cg-gridline { position: absolute; left: 2px; right: 0; height: 1px; background: #ececef; }
.cg-bars {
  position: absolute; left: 30px; right: 10px; top: 0; bottom: 2px;
  display: flex; align-items: flex-end; justify-content: space-around;
}
.cg-bar-col {
  display: flex; flex-direction: column; align-items: center;
  position: relative; height: 100%; justify-content: flex-end;
}
/* —— 动效本体 —— 普通柱走灰阶，关键柱用语义高亮色（层级色是本卡语义的一部分） */
.cg-bar {
  width: 100%; border-radius: 5px 5px 0 0;
  transform-origin: 50% 100%;   /* 从地面长出来 */
}
.cg-bar-val { position: absolute; font-weight: 800; }
.cg-bar-year { position: absolute; bottom: -30px; font-size: 15px; color: #8a8a8a; }
`;

interface Props {
  title?: string;
  colsData?: string;
  maxVal?: number;
  baseColor?: string;
  hotColor?: string;
  titleSize?: number;
  valSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
}

const ChartGrow: React.FC<Props> = ({
  title = "年营收（亿元）",
  colsData = "2020|12\n2021|18\n2022|27\n2023|45\n2024|86|hot",
  maxVal = 100,
  baseColor = "#d2d2d7",
  hotColor = "#d8383a",
  titleSize = 22,
  valSize = 20,
  posX = 120,
  posY = 62,
  lead = 0.2,
}) => {
  const t = useCurrentFrame() / FPS;

  // "标签|数值|hot（可选）" 逐行 DSL → 柱数据
  const cols = colsData
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split("|").map((s) => s.trim());
      return {
        year: parts[0] ?? "",
        v: Number(parts[1]) || 0,
        hot: (parts[2] ?? "").toLowerCase() === "hot",
      };
    });
  const list = cols.length ? cols : [{ year: "", v: 0, hot: false }];
  // 柱宽随条数自适应（5 根时正好还原模板的 76px）
  const barW = Math.max(16, Math.min(76, Math.floor((FIXED.barsInnerW / list.length) * 0.56)));
  const range = Math.max(1e-6, maxVal);

  // ① 先立坐标系（标题 + 轴 + 网格一起淡入）
  const axisP = tw(t, lead + FIXED.axisGap, FIXED.axisIn, power2Out);

  // ③ 最后一根柱到顶：整图轻 punch 一拍
  const barsAt = lead + FIXED.barsGap;
  const lastTop = barsAt + (list.length - 1) * FIXED.barStagger + FIXED.barGrow;
  const punch = t < lastTop + 0.08
    ? lerp(1, FIXED.punchScale, tw(t, lastTop, 0.08, power2Out))
    : lerp(FIXED.punchScale, 1, tw(t, lastTop + 0.08, 0.22, backOut(3)));

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div className="cg-title" style={{ left: posX, top: posY, fontSize: titleSize, opacity: axisP }}>{title}</div>
      <div
        style={{
          position: "absolute", left: posX, top: posY + 46,
          width: FIXED.wrapW, height: FIXED.wrapH,
          transform: `scale(${punch})`,
        }}
      >
        <div className="cg-gridline" style={{ bottom: "25%", opacity: axisP }} />
        <div className="cg-gridline" style={{ bottom: "50%", opacity: axisP }} />
        <div className="cg-gridline" style={{ bottom: "75%", opacity: axisP }} />
        <div className="cg-axis-y" style={{ opacity: axisP }} />
        <div className="cg-axis-x" style={{ opacity: axisP }} />
        <div className="cg-bars">
          {list.map((col, i) => {
            const h = (col.v / range) * 100;   // 柱高（% of 量程）
            // ② 柱子逐根长出，柱顶数字在该柱快到顶时弹出
            const at = barsAt + i * FIXED.barStagger;
            const barP = tw(t, at, FIXED.barGrow, power3Out);
            const valP = tw(t, at + FIXED.barGrow * FIXED.labelPopAt, 0.25, backOut(2));
            return (
              <div key={i} className="cg-bar-col" style={{ width: barW }}>
                <div
                  className="cg-bar"
                  style={{
                    background: col.hot ? hotColor : baseColor,
                    height: `${h}%`,
                    transform: `scaleY(${barP})`,
                  }}
                />
                <div
                  className="cg-bar-val"
                  style={{
                    color: col.hot ? hotColor : "#1d1d1f",
                    fontSize: col.hot ? Math.round(valSize * 1.2) : valSize,
                    bottom: `calc(${h}% + 10px)`,
                    opacity: Math.min(1, valP),
                    transform: `scale(${lerp(0.4, 1, valP)})`,
                  }}
                >
                  {col.v}
                </div>
                <div className="cg-bar-year">{col.year}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "chart-grow",
  name: "图表生长",
  category: "数据信息图",
  durationInFrames: 68,
  accent: "#d8383a",
  component: ChartGrow as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "图表标题", default: "年营收（亿元）" },
    { type: "textarea", key: "colsData", label: "柱数据（每行 标签|数值|hot 可选高亮）", default: "2020|12\n2021|18\n2022|27\n2023|45\n2024|86|hot" },
    { type: "number", key: "maxVal", label: "量程满刻度", default: 100, min: 1, step: 1 },
    { type: "color", key: "baseColor", label: "普通柱色", default: "#d2d2d7" },
    { type: "color", key: "hotColor", label: "高亮柱色", default: "#d8383a" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 22, min: 16, max: 36, step: 1, unit: "px" },
    { type: "slider", key: "valSize", label: "柱顶数值字号", default: 20, min: 14, max: 30, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "图表区 X", default: 120, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "图表区 Y（标题行）", default: 62, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.2, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
