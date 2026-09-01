import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, mixHex, power3Out, tw } from "../shared";

// step-timeline-vertical · 竖向步骤线 —— 参数化版（源出 tplcards/step-timeline-vertical.tsx）
// 命门：线的缓动决定节点间隔——power1.inOut 的反函数把"线推到某个 y"换算成时间，
// 才真的是"线到哪、亮哪"；全到位后当前节点升级空心环。画线/弹出/升级配比保持 FIXED。
const FPS = 30;

const FIXED = {
  lineDur: 0.6,       // 竖线画出总耗时 s（origin top 的 scaleY 0→1）
  nodePop: 0.18,      // 节点弹出耗时 s
  textDur: 0.26,      // 右侧两行文字淡入耗时 s
  textLag: 0.067,     // 文字滞后节点 2 帧（@30fps）——点先亮、字后跟
  textShift: 8,       // 文字从左侧进入的位移 px
  ringDelay: 0.10,    // 三组全到位 → 当前节点升级 的呼吸 s
  ringDur: 0.22,      // 升级耗时 s：border 0→3px + scale 1→1.25
  ringWidth: 3,       // 空心环描边宽 px
  ringScale: 1.25,    // 空心环放大倍数
  nodeY0: 22,         // 首节点距线顶 px（尾留白同 22，几何随条数自适应）
};

// —— shared 未含的缓动，本卡局部定义 ——
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};
// power1.inOut 的反函数：节点才真的是"线到哪、亮哪"
const invPower1InOut = (y: number) =>
  y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2);

// DSL：每行 "小标题|标题"
const parseSteps = (dsl: string) =>
  dsl.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const idx = l.indexOf("|");
    return idx >= 0
      ? { kicker: l.slice(0, idx).trim(), title: l.slice(idx + 1).trim() }
      : { kicker: "", title: l };
  });

const DEFAULT_STEPS = "第一步|先把目标写成一句话\n第二步|砍掉两件不做的事\n第三步|今天就动第一步";

// 演示语境（不属于动效）：右侧人物列；左侧竖向时间轴（类名加 stv- 前缀防串卡）
const CSS = `
.stv-host { position: absolute; right: 4px; bottom: 0; width: 448px; height: 100%; }
.stv-wrap { position: absolute; width: 420px; }
/* 竖线：唯一"推进"的元素，origin top */
.stv-line {
  position: absolute; left: 0; top: 0;
  width: 2px; height: 100%;
  background: #d2d2d7;   /* hairline 档，线是骨架不是重点 */
  transform-origin: 50% 0%;
}
.stv-node {
  position: absolute; left: -6px;
  width: 14px; height: 14px;
  box-sizing: border-box;
  border-radius: 50%;
  border-style: solid;
}
.stv-text { position: absolute; left: 34px; width: 386px; }
.stv-kicker { font-size: 14px; letter-spacing: 2px; color: #8a8a8a; margin-bottom: 4px; }
.stv-title {
  font-weight: 600; line-height: 1.25;
  color: #1d1d1f; white-space: nowrap;
}
`;

interface Props {
  stepsDsl?: string;
  accentColor?: string;
  titleSize?: number;
  posX?: number;
  posY?: number;
  rowGap?: number;
  lead?: number;
}

const StepTimelineVertical: React.FC<Props> = ({
  stepsDsl = DEFAULT_STEPS,
  accentColor = "#e0452c",
  titleSize = 25,
  posX = 132,
  posY = 118,
  rowGap = 110,
  lead = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;
  const steps = parseSteps(stepsDsl);

  // 几何随条数走：线全长 = 首尾各留 22 + 节点等距 rowGap（默认 3 条 ⇒ 264，与原卡一致）
  const wrapH = FIXED.nodeY0 * 2 + rowGap * Math.max(0, steps.length - 1);
  const nodeY = (i: number) => FIXED.nodeY0 + rowGap * i;

  // ① 竖线从上往下画出
  const lineP = tw(t, lead, FIXED.lineDur, power1InOut);

  // ② 线经过节点 → 该节点弹出 → 2 帧后右侧两行字跟上
  const nodeAts = steps.map((_, i) =>
    lead + FIXED.lineDur * invPower1InOut(nodeY(i) / wrapH));
  const lastEnd = Math.max(
    lead + FIXED.lineDur,
    ...nodeAts.map((at) => at + FIXED.textLag + FIXED.textDur));

  // ③ 全部到位后，当前节点（第一个）升级为强调色空心环
  const ringAt = lastEnd + FIXED.ringDelay;
  const ringP = tw(t, ringAt, FIXED.ringDur, power3Out);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div className="stv-host"><HostSilhouette /></div>

      <div className="stv-wrap" style={{ left: posX, top: posY, height: wrapH }}>
        <div className="stv-line" style={{ transform: `scaleY(${lineP})` }} />
        {steps.map((s, i) => {
          const at = nodeAts[i];
          const popScale = tw(t, at, FIXED.nodePop, backOut(1.6));
          // 节点 0 升级：pop 早已结束（scale 1）→ ring 阶段 1→1.25
          const scale = i === 0 && t >= ringAt ? lerp(1, FIXED.ringScale, ringP) : popScale;
          const borderW = i === 0 ? FIXED.ringWidth * ringP : 0;
          const bg = i === 0 ? mixHex("#1d1d1f", "#ffffff", ringP) : "#1d1d1f";
          const textP = tw(t, at + FIXED.textLag, FIXED.textDur, power3Out);
          return (
            <React.Fragment key={i}>
              <div className="stv-node" style={{
                top: nodeY(i) - 7,
                transform: `scale(${scale})`,
                borderWidth: borderW,
                borderColor: accentColor,   /* 当前节点升级成空心环时才长出来 */
                backgroundColor: bg,
              }} />
              <div style={{
                opacity: textP,
                transform: `translateX(${lerp(-FIXED.textShift, 0, textP)}px)`,
              }}>
                <div className="stv-text" style={{ top: nodeY(i) - 26 }}>
                  <div className="stv-kicker">{s.kicker}</div>
                  <div className="stv-title" style={{ fontSize: titleSize }}>{s.title}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "step-timeline-vertical",
  name: "竖向步骤线",
  category: "数据信息图",
  durationInFrames: 118,
  accent: "#e0452c",
  component: StepTimelineVertical as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "stepsDsl", label: "步骤（每行：小标题|标题）", default: DEFAULT_STEPS },
    { type: "color", key: "accentColor", label: "强调色（当前节点环）", default: "#e0452c" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 25, min: 16, max: 34, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "时间轴 X", default: 132, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "时间轴 Y", default: 118, step: 1, unit: "px" },
    { type: "number", key: "rowGap", label: "节点间距", default: 110, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
