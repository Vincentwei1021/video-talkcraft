import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// bar-chart-growth · 柱状增长 —— 参数化版（源出 tplcards/bar-chart-growth.tsx）
// 命门：七根柱是"一串"不是七个动效——错峰 0.06s 保持 FIXED，>0.1 就散成"七个动效"；
// 结论 chip 只在最后一根到顶那一帧弹出；量程全程固定（中途缩放对比就是骗人）。
// 数据经 "标签|数值" DSL 注入：柱宽随条数自适应，chip 落位随最高柱自动抬高。
const FPS = 30;

const FIXED = {
  titleIn: 0.2,    // 标题淡入 s
  baseGap: 0.12,   // 基线相对起手的延后 s（先立地面再长柱）
  baseDur: 0.24,   // 基线 scaleX 0→1 s
  barsGap: 0.32,   // 第一根柱相对起手的延后 s
  barStagger: 0.06,// 柱间错峰 s：本卡命门
  barGrow: 0.28,   // 单柱 scaleY 0→1 s
  chipGap: 18,     // chip 底边距最高柱顶的留白 px：不许压柱顶
  chipPop: 0.2,    // chip 弹出 s
  chipScale: 0.8,  // chip 起始缩放
  chartW: 420,     // 图表区宽 px
  chartH: 240,     // 图表区高 px = 量程高度
};

// back.out —— shared 未含，本卡局部定义
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// 演示语境（不属于动效）：主持人占位在右，左侧一组柱；白底零装饰、无网格无坐标轴
// （类名加 bcg- 前缀防串卡）
const CSS = `
.bcg-host { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.bcg-title { position: absolute; left: 0; top: 0; font-weight: 600; color: #1d1d1f; letter-spacing: 1px; }
.bcg-chart { position: absolute; left: 0; top: 108px; width: ${FIXED.chartW}px; height: ${FIXED.chartH}px; }
.bcg-baseline {
  position: absolute; left: 0; right: 0; bottom: -1px; height: 2px;
  background: #d2d2d7; transform-origin: 0% 50%;
}
.bcg-bars {
  position: absolute; inset: 0;
  display: flex; align-items: flex-end; justify-content: space-between;
}
.bcg-bar {
  border-radius: 4px 4px 0 0;
  transform-origin: 50% 100%;          /* 命门：只用 scaleY，改 height 每帧重排 */
}
.bcg-xlabels {
  position: absolute; left: 0; right: 0; bottom: -30px;
  display: flex; justify-content: space-between;
  font-size: 13px; color: #8a8a8a;
}
.bcg-xlabels span { text-align: center; }
.bcg-chip {
  position: absolute; right: 0;
  padding: 8px 16px; border-radius: 12px;
  color: #ffffff;
  font-size: 22px; font-weight: 600; line-height: 1; letter-spacing: 1px;
  white-space: nowrap; font-variant-numeric: tabular-nums;
  transform-origin: 100% 50%;
}
`;

interface Props {
  title?: string;
  barsData?: string;
  chipText?: string;
  maxVal?: number;
  barColor?: string;
  titleSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
}

const BarChartGrowth: React.FC<Props> = ({
  title = "数据说话",
  barsData = "1月|16\n2月|23\n3月|30\n4月|41\n5月|52\n6月|66\n7月|84",
  chipText = "增长 42%",
  maxVal = 100,
  barColor = "#e8720c",
  titleSize = 34,
  posX = 96,
  posY = 96,
  lead = 0.3,
}) => {
  const t = useCurrentFrame() / FPS;

  // "标签|数值" 逐行 DSL → 柱数据
  const bars = barsData
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label = "", val = "0"] = l.split("|").map((s) => s.trim());
      return { label, v: Number(val) || 0 };
    });
  const list = bars.length ? bars : [{ label: "", v: 0 }];
  // 柱宽随条数自适应（7 根时正好还原模板的 44px）
  const barW = Math.max(8, Math.min(44, Math.floor(FIXED.chartW / list.length) - 16));

  // ① 标题淡入
  const titleP = tw(t, lead, FIXED.titleIn, power2Out);
  // ② 基线从左画出（先有地面，柱子才有"从地里长出来"的语义）
  const baseP = tw(t, lead + FIXED.baseGap, FIXED.baseDur, power2Out);
  // ④ 最后一根到顶那一帧：结论 chip 弹出
  const barsAt = lead + FIXED.barsGap;
  const lastTop = barsAt + (list.length - 1) * FIXED.barStagger + FIXED.barGrow;
  const chipP = tw(t, lastTop, FIXED.chipPop, backOut(1.4));

  // chip 落位由最高柱算出——换数据自动跟着抬高，永远压不到柱顶
  const range = Math.max(1e-6, maxVal);
  const maxH = (Math.max(...list.map((b) => b.v)) / range) * FIXED.chartH;

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div style={{ position: "absolute", left: posX, top: posY, width: FIXED.chartW }}>
        <div className="bcg-title" style={{ fontSize: titleSize, opacity: titleP }}>{title}</div>
        <div className="bcg-chart">
          <div
            className="bcg-chip"
            style={{
              background: barColor,
              bottom: maxH + FIXED.chipGap,
              opacity: Math.min(1, chipP),
              transform: `scale(${lerp(FIXED.chipScale, 1, chipP)})`,
            }}
          >
            {chipText}
          </div>
          <div className="bcg-bars">
            {list.map((b, i) => {
              // ③ 柱子逐根升起，错峰密到读作一次连续动作
              const p = tw(t, barsAt + i * FIXED.barStagger, FIXED.barGrow, power3Out);
              return (
                <div
                  key={i}
                  className="bcg-bar"
                  style={{
                    width: barW,
                    background: barColor,
                    height: (b.v / range) * FIXED.chartH,
                    transform: `scaleY(${p})`,
                  }}
                />
              );
            })}
          </div>
          <div className="bcg-baseline" style={{ transform: `scaleX(${baseP})` }} />
          <div className="bcg-xlabels">
            {list.map((b, i) => <span key={i} style={{ width: barW }}>{b.label}</span>)}
          </div>
        </div>
      </div>
      <div className="bcg-host"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "bar-chart-growth",
  name: "柱状增长",
  category: "数据信息图",
  durationInFrames: 110,
  accent: "#e8720c",
  component: BarChartGrowth as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "标题", default: "数据说话" },
    { type: "textarea", key: "barsData", label: "柱数据（每行 标签|数值）", default: "1月|16\n2月|23\n3月|30\n4月|41\n5月|52\n6月|66\n7月|84" },
    { type: "text", key: "chipText", label: "结论 chip 文案", default: "增长 42%" },
    { type: "number", key: "maxVal", label: "量程满刻度", default: 100, min: 1, step: 1 },
    { type: "color", key: "barColor", label: "柱色（唯一强调色）", default: "#e8720c" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 34, min: 22, max: 48, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "图表区 X", default: 96, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "图表区 Y", default: 96, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
