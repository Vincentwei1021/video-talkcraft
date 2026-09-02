import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// numbered-step-stack · 编号步骤堆入 —— 参数化版（源出 tplcards/numbered-step-stack.tsx）
// 命门：错峰**必须均匀**，不均匀读作卡顿；落定同帧编号块 punch（落地确认，不是延迟弹跳）；
// 全部落定后整组上浮收束——把 N 个动效收成一件事。入场/punch/收束配比保持 FIXED。
const FPS = 30;

const FIXED = {
  barIn: 0.24,        // 单枚横条入场耗时 s
  barShift: 40,       // 从右侧进入的位移 px
  punchLag: 0.0,      // 编号块 punch 与该枚落定同帧
  punchScale: 1.12,   // 编号块 punch 起始倍数（1.12→1）
  punchDur: 0.133,    // punch 4 帧 @30fps
  settleLift: 4,      // 落定后整组上浮 px：宣告"这是一组"
  settleDur: 0.20,    // 收束耗时 s
  settleGap: 0.08,    // 末枚落定 → 整组收束 的呼吸 s
};

// DSL：每行 "编号|文本"；无 "|" 时按行序自动补零编号
const parseSteps = (dsl: string) =>
  dsl.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
    const idx = l.indexOf("|");
    return idx >= 0
      ? { no: l.slice(0, idx).trim(), txt: l.slice(idx + 1).trim() }
      : { no: String(i + 1).padStart(2, "0"), txt: l };
  });

const DEFAULT_STEPS =
  "01|把手机放到另一个房间\n02|只写今天要交的那一件\n03|计时 25 分钟不许起身\n04|做完立刻记一行结果";

// 演示语境（不属于动效）：左侧人物列 + 右侧横条清单（无线、无连接关系）（类名加 nss- 前缀防串卡）
const CSS = `
.nss-host { position: absolute; left: 0; bottom: 0; width: 448px; height: 100%; }
.nss-stack {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.nss-bar {
  display: flex;
  align-items: center;
  gap: 18px;
  height: 66px;
  padding: 0 22px 0 0;
  border: 1px solid #e0e0e0;   /* hairline 立层级，不用投影 */
  border-radius: 12px;
  background: #ffffff;
}
/* 编号方块：唯一带强调色的件，落地时单独 punch 一拍 */
.nss-no {
  flex: 0 0 auto;
  width: 64px; height: 64px;
  margin: -1px 0 -1px -1px;
  border-radius: 12px 0 0 12px;
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nss-txt {
  font-weight: 600;
  line-height: 1.25;
  color: #1d1d1f;
  white-space: nowrap;
}
`;

interface Props {
  stepsDsl?: string;
  noColor?: string;
  fontSize?: number;
  barW?: number;
  posRight?: number;
  posY?: number;
  lead?: number;
  barStagger?: number;
}

const NumberedStepStack: React.FC<Props> = ({
  stepsDsl = DEFAULT_STEPS,
  noColor = "#2fb344",
  fontSize = 22,
  barW = 486,
  posRight = 62,
  posY = 270,
  lead = 0.4,
  barStagger = 0.11,
}) => {
  const t = useCurrentFrame() / FPS;
  const steps = parseSteps(stepsDsl);

  // ③ 全部落定后整组轻微上浮收束
  const settleAt = lead + (steps.length - 1) * barStagger
    + FIXED.barIn + FIXED.punchDur + FIXED.settleGap;
  const stackY = -FIXED.settleLift * tw(t, settleAt, FIXED.settleDur, power2Out);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div className="nss-host"><HostSilhouette /></div>

      {/* GSAP 保留 CSS 的 translateY(-50%)，px 位移叠加在其后 */}
      <div
        className="nss-stack"
        style={{
          right: posRight, top: posY, width: barW,
          transform: `translateY(-50%) translateY(${stackY}px)`,
        }}
      >
        {steps.map((s, i) => {
          const at = lead + i * barStagger;
          // ① 横条从右堆入（错峰严格均匀）
          const inP = tw(t, at, FIXED.barIn, power3Out);
          // ② 落定同帧编号块 punch 一拍（fromTo immediateRender：punch 前一直停在 1.12）
          const punchAt = at + FIXED.barIn + FIXED.punchLag;
          const noScale = t < punchAt
            ? FIXED.punchScale
            : lerp(FIXED.punchScale, 1, tw(t, punchAt, FIXED.punchDur, power2Out));
          return (
            <div key={i} className="nss-bar" style={{
              opacity: inP,
              transform: `translateX(${lerp(FIXED.barShift, 0, inP)}px)`,
            }}>
              <span className="nss-no" style={{ background: noColor, fontSize, transform: `scale(${noScale})` }}>{s.no}</span>
              <span className="nss-txt" style={{ fontSize }}>{s.txt}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "numbered-step-stack",
  name: "编号步骤堆入",
  category: "数据信息图",
  durationInFrames: 107,
  accent: "#2fb344",
  component: NumberedStepStack as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "stepsDsl", label: "步骤（每行：编号|文本；无「|」则自动编号）", default: DEFAULT_STEPS },
    { type: "color", key: "noColor", label: "编号块强调色", default: "#2fb344" },
    { type: "slider", key: "fontSize", label: "文字字号", default: 22, min: 16, max: 28, step: 1, unit: "px" },
    { type: "number", key: "barW", label: "横条列宽", default: 486, step: 1, unit: "px" },
    { type: "number", key: "posRight", label: "列距右缘", default: 62, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "列中心 Y", default: 270, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "barStagger", label: "条目错峰间隔", default: 0.11, min: 0.05, max: 0.3, step: 0.01, unit: "s" },
  ],
};
