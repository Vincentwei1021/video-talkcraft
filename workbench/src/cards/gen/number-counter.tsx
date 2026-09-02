import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// number-counter · 数字滚动计数 —— 参数化版（源出 tplcards/number-counter.tsx）
// 两种计数并置：a) tween 计数 + 落定弹一拍  b) odometer 逐位滚轮（高位先停低位后停）。
// 命门：落定 punch（0.09s 放大 + 0.18s back 回弹）、箭头只在落定后现身、
// 滚轮 stagger 0.22s/位 与低位整圈数保持 FIXED；计数时长 1~1.5 先快后慢，>2s 观众已听完这句。
const FPS = 30;

const FIXED = {
  landScale: 1.08, // 落定瞬间的放大一拍
  landUp: 0.09,    // 放大段 s
  landBack: 0.18,  // 回弹段 s（back.out(3)，会轻微下探）
  deltaIn: 0.25,   // 涨跌标注淡入 s
  deltaRise: 6,    // 涨跌标注上浮 px
  odoDelay: 0.5,   // 模式 b 相对模式 a 的起始延迟 s
  odoBase: 1.0,    // 最高位滚动时长 s
  odoStagger: 0.22,// 每往低一位多滚的时长：高位先停低位后停
  spins: 2,        // 低位额外整圈数，营造"滚轮"感
  digitH: 64,      // 滚轮行高 px：必须与 .nc-digit/.nc-reel span 的高度一致
};

// back.out —— shared 未含，本卡局部定义
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// 演示语境（不属于动效）：主持人在左，右侧数据区；白底 + 灰阶分栏线（类名加 nc- 前缀防串卡）
const CSS = `
.nc-host { position: absolute; left: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.nc-panel {
  position: absolute; right: 0; top: 0; bottom: 0;
  border-left: 1px solid #e0e0e0;
}
.nc-inner {
  height: 100%;
  display: flex; flex-direction: column; justify-content: center;
  padding: 0 24px; gap: 44px; box-sizing: border-box;
}
.nc-label { font-size: 17px; color: #8a8a8a; letter-spacing: 2px; margin-bottom: 10px; }
.nc-big-num { display: flex; align-items: baseline; gap: 12px; white-space: nowrap;
              font-variant-numeric: tabular-nums; }
.nc-value { font-weight: 800; letter-spacing: 1px; transform-origin: 0% 80%; }
.nc-delta { font-size: 24px; font-weight: 700; white-space: nowrap; }
.nc-odometer { display: flex; align-items: center; font-variant-numeric: tabular-nums; }
.nc-digit { width: 42px; height: ${FIXED.digitH}px; overflow: hidden; position: relative;
            background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;
            margin-right: 6px; }
.nc-reel { position: absolute; left: 0; right: 0; top: 0; display: flex; flex-direction: column; }
.nc-reel span { height: ${FIXED.digitH}px; line-height: ${FIXED.digitH}px; text-align: center;
                font-size: 44px; font-weight: 800; color: #1d1d1f; }
.nc-comma { font-size: 44px; font-weight: 800; color: #1d1d1f;
            margin-right: 6px; align-self: flex-end; line-height: 60px; }
.nc-unit { font-size: 20px; color: #8a8a8a; margin-left: 10px; }
`;

interface Props {
  labelA?: string;
  prefix?: string;
  target?: number;
  deltaText?: string;
  labelB?: string;
  odoTarget?: string;
  odoUnit?: string;
  numColor?: string;
  deltaColor?: string;
  valueSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
  countDur?: number;
}

const NumberCounter: React.FC<Props> = ({
  labelA = "2024 全年营销费用",
  prefix = "¥",
  target = 3000000000,
  deltaText = "↑ 45%",
  labelB = "平均每天烧掉（万元）",
  odoTarget = "8219",
  odoUnit = "万 / 天",
  numColor = "#1d1d1f",
  deltaColor = "#d8383a",
  valueSize = 48,
  posX = 451.2,
  posY = 0,
  lead = 0.3,
  countDur = 1.3,
}) => {
  const t = useCurrentFrame() / FPS;

  const fmt = (n: number) => prefix + Math.floor(n).toLocaleString("en-US");

  // 模式 a：0 → 目标，easeOut 先快后慢，千分位实时格式化
  const value = lerp(0, target, tw(t, lead, countDur, power3Out));
  // 落定瞬间：轻放大一拍 + 回弹（back.out 会轻微下探，属于动效本体）
  const landAt = lead + countDur;
  const scale = t < landAt + FIXED.landUp
    ? lerp(1, FIXED.landScale, tw(t, landAt, FIXED.landUp, power2Out))
    : lerp(FIXED.landScale, 1, tw(t, landAt + FIXED.landUp, FIXED.landBack, backOut(3)));
  // 涨跌箭头淡入（落定奖励）
  const deltaP = tw(t, landAt + FIXED.landUp, FIXED.deltaIn, power2Out);

  // 模式 b：逐位滚轮，高位先停、低位后停
  const odoNum = Number(odoTarget);
  const groups = (Number.isFinite(odoNum) ? odoNum : 0).toLocaleString("en-US").split("");
  const digits = groups.filter((ch) => ch !== ",");
  const odoT0 = lead + FIXED.odoDelay;
  let digitIdx = -1;

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div className="nc-host"><HostSilhouette /></div>
      <div className="nc-panel" style={{ left: posX }}>
        <div className="nc-inner" style={{ transform: `translateY(${posY}px)` }}>
          <div>
            <div className="nc-label">{labelA}</div>
            <div className="nc-big-num">
              <span
                className="nc-value"
                style={{
                  fontSize: valueSize, color: numColor,
                  transform: `scale(${scale})`, display: "inline-block",
                }}
              >
                {fmt(value)}
              </span>
              <span
                className="nc-delta"
                style={{
                  color: deltaColor,
                  opacity: deltaP,
                  transform: `translateY(${lerp(FIXED.deltaRise, 0, deltaP)}px)`,
                }}
              >
                {deltaText}
              </span>
            </div>
          </div>
          <div>
            <div className="nc-label">{labelB}</div>
            <div className="nc-odometer">
              {groups.map((ch, gi) => {
                if (ch === ",") return <span key={gi} className="nc-comma">,</span>;
                digitIdx++;
                const i = digitIdx;
                const n = Number(ch);
                // 低位多滚整圈（必须是整 10 的倍数，否则落错数字）
                const extraSpins = Math.round((FIXED.spins * i) / Math.max(digits.length - 1, 1));
                const steps = extraSpins * 10 + n;
                const y = -steps * FIXED.digitH *
                  tw(t, odoT0, FIXED.odoBase + i * FIXED.odoStagger, power3Out);
                return (
                  <div key={gi} className="nc-digit">
                    <div className="nc-reel" style={{ transform: `translateY(${y}px)` }}>
                      {Array.from({ length: (FIXED.spins + 1) * 10 + 1 }, (_, k) => (
                        <span key={k}>{k % 10}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <span className="nc-unit">{odoUnit}</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "number-counter",
  name: "数字滚动计数",
  category: "数据信息图",
  durationInFrames: 86,
  accent: "#d8383a",
  component: NumberCounter as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "labelA", label: "指标 A 标签", default: "2024 全年营销费用" },
    { type: "text", key: "prefix", label: "数值前缀（货币符等，可留空）", default: "¥" },
    { type: "number", key: "target", label: "计数终值", default: 3000000000, step: 1 },
    { type: "text", key: "deltaText", label: "涨跌标注", default: "↑ 45%" },
    { type: "text", key: "labelB", label: "指标 B 标签（滚轮）", default: "平均每天烧掉（万元）" },
    { type: "text", key: "odoTarget", label: "滚轮目标值（纯数字串）", default: "8219" },
    { type: "text", key: "odoUnit", label: "滚轮单位", default: "万 / 天" },
    { type: "color", key: "numColor", label: "数字颜色", default: "#1d1d1f" },
    { type: "color", key: "deltaColor", label: "涨跌强调色", default: "#d8383a" },
    { type: "slider", key: "valueSize", label: "大数字字号", default: 48, min: 32, max: 72, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "数据区左缘 X", default: 451.2, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "数据区垂直偏移", default: 0, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "countDur", label: "计数时长", default: 1.3, min: 0.8, max: 2, step: 0.05, unit: "s" },
  ],
};
