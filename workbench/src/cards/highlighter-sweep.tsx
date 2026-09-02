import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "./types";
import { FONT_STACK, lerp, power2InOut, power2Out, tw } from "./shared";

// highlighter-sweep · 荧光笔高亮扫过 —— 参数化版（源出 template/cards/highlighter-sweep.tsx）
// 命门：色块 mix-blend-mode multiply，不许盖字；其余段落必须压暗，否则强调失效。
const FPS = 30;

interface Props {
  docHead?: string;
  linesBefore?: string;
  keyText?: string;
  linesAfter?: string;
  hlColor?: string;
  dimTo?: number;
  startDelay?: number;
  sweepDur?: number;
  fontSize?: number;
}

const HighlighterSweep: React.FC<Props> = ({
  docHead = "《2024 年度宏观经济报告》 · 第 42 页",
  linesBefore = "过去三年，居民部门的储蓄率持续攀升，\n消费意愿始终徘徊在低位。报告指出，",
  keyText = "真正拖住消费的不是没钱，而是对未来的不确定感",
  linesAfter = "这一判断与多家机构的调研结论一致，\n政策端的回应也在陆续落地。",
  hlColor = "#FFE949",
  dimTo = 0.4,
  startDelay = 0.7,
  sweepDur = 0.6,
  fontSize = 21,
}) => {
  const t = useCurrentFrame() / FPS;

  const sweepX = tw(t, startDelay, sweepDur, power2InOut);
  const dimOpacity = lerp(1, dimTo, tw(t, startDelay, 0.45, power2Out));
  const liftP = tw(t, startDelay + sweepDur, 0.3, power2Out);
  const keyScale = lerp(1, 1.03, liftP);
  const keyY = lerp(0, -2, liftP);

  const lineStyle: React.CSSProperties = {
    fontSize, lineHeight: 1.9, fontWeight: 500,
  };
  const renderDim = (text: string) =>
    text.split("\n").map((line, i) => (
      <div key={i} style={{ ...lineStyle, opacity: dimOpacity }}>{line}</div>
    ));

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <div
        style={{
          position: "absolute", left: "50%", top: "46%",
          transform: "translate(-50%, -50%)", width: 640,
          padding: "34px 42px 30px", border: "1px solid #e0e0e0",
          borderRadius: 6, color: "#1d1d1f",
        }}
      >
        <div
          style={{
            fontSize: 13, letterSpacing: 3, color: "#8a8a8a",
            borderBottom: "1px solid #ececec", paddingBottom: 10, marginBottom: 18,
          }}
        >
          {docHead}
        </div>
        {renderDim(linesBefore)}
        <div style={{ ...lineStyle, transform: `translateY(${keyY}px) scale(${keyScale})`, transformOrigin: "left center" }}>
          <span style={{ position: "relative", display: "inline-block", fontWeight: 700 }}>
            <span
              style={{
                position: "absolute", left: -6, right: -8, top: 2, bottom: 0,
                background: hlColor, opacity: 0.6, mixBlendMode: "multiply",
                borderRadius: "12px 5px 10px 4px / 7px 12px 5px 10px",
                transformOrigin: "left center",
                transform: `scaleX(${sweepX})`,
              }}
            />
            {keyText}
          </span>
          。
        </div>
        {renderDim(linesAfter)}
      </div>
    </AbsoluteFill>
  );
};

export const highlighterSweepCard: CardDef = {
  id: "highlighter-sweep",
  name: "荧光笔高亮",
  category: "强调",
  durationInFrames: 60,
  accent: "#FFE949",
  component: HighlighterSweep as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "docHead", label: "文档眉头", default: "《2024 年度宏观经济报告》 · 第 42 页" },
    { type: "textarea", key: "linesBefore", label: "前文（可多行）", default: "过去三年，居民部门的储蓄率持续攀升，\n消费意愿始终徘徊在低位。报告指出，" },
    { type: "textarea", key: "keyText", label: "关键句（被高亮）", default: "真正拖住消费的不是没钱，而是对未来的不确定感" },
    { type: "textarea", key: "linesAfter", label: "后文（可多行）", default: "这一判断与多家机构的调研结论一致，\n政策端的回应也在陆续落地。" },
    { type: "slider", key: "fontSize", label: "正文字号", default: 21, min: 14, max: 32, step: 1, unit: "px" },
    { type: "color", key: "hlColor", label: "荧光色", default: "#FFE949" },
    { type: "slider", key: "dimTo", label: "其余压暗到", default: 0.4, min: 0.1, max: 1, step: 0.05 },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.7, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "sweepDur", label: "扫过时长", default: 0.6, min: 0.2, max: 1.5, step: 0.05, unit: "s" },
  ],
};
