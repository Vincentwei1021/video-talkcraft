import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power3Out, tw } from "../shared";

// quote-hold-arrow · 金句停留 —— 参数化版（源出 tplcards/quote-hold-arrow.tsx）
// 命门：末行必须先"平淡"停 plainHold 才升级（框铺开 + punch）——=0 就少了"重点在这一句"的推进。
// 高亮框 mix-blend-mode multiply 不许盖字；金句点亮后停住（2026-08-26 定版已无箭头）。
const FPS = 30;

const FIXED = {
  lineDur: 0.28,      // 单行淡入耗时 s
  lineStagger: 0.12,  // 行间错峰 s
  lineRise: 8,        // 行上浮位移 px
  plainHold: 0.34,    // 命门：末行"平淡"停留 s，之后才升级
  hlDur: 0.24,        // 高亮框从中心铺开耗时 s
  punchScale: 1.05,   // 框到位后文字 punch 起始倍数（1.05→1）
  punchDur: 0.17,     // punch 5 帧 @30fps
  hlOpacity: 0.62,    // 高亮框透明度（multiply 之下的荧光笔浓度）
};

interface Props {
  line1?: string;
  line2?: string;
  lastLine?: string;
  hlColor?: string;
  ink?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
}

const QuoteHoldArrow: React.FC<Props> = ({
  line1 = "你现在觉得难受",
  line2 = "不是因为你不行",
  lastLine = "是因为你正在走出舒适区",
  hlColor = "#FFE949",
  ink = "#1d1d1f",
  fontSize = 33,
  posX = 84,
  posY = 270,
  lead = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  // ① 三行逐行淡入上浮——末行此刻是普通样式（框还没出，第一拍是"平淡"）
  const lineStyle = (i: number): React.CSSProperties => {
    const p = tw(t, lead + i * FIXED.lineStagger, FIXED.lineDur, power2Out);
    return {
      fontSize, fontWeight: 600, lineHeight: 1.52, color: ink, whiteSpace: "nowrap",
      opacity: p, transform: `translateY(${lerp(FIXED.lineRise, 0, p)}px)`,
    };
  };

  // ② 第二拍：末行升级——高亮框从文字中心 scaleX 铺开，框到位后文字 punch
  const upAt = lead + FIXED.lineStagger * 2 + FIXED.lineDur + FIXED.plainHold;
  const hlX = tw(t, upAt, FIXED.hlDur, power3Out);
  const punchAt = upAt + FIXED.hlDur;
  const txtScale = t < punchAt
    ? 1
    : lerp(FIXED.punchScale, 1, tw(t, punchAt, FIXED.punchDur, power2Out));

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 演示语境：右侧人物列（不属于本卡动效） */}
      <div style={{ position: "absolute", right: 10, bottom: 0, width: 448, height: "100%" }}>
        <HostSilhouette />
      </div>

      <div style={{ position: "absolute", left: posX, top: posY, transform: "translateY(-50%)", width: 460 }}>
        <div style={lineStyle(0)}>{line1}</div>
        <div style={lineStyle(1)}>{line2}</div>
        <div style={lineStyle(2)}>
          {/* 末行：文字保持墨色，高亮框在下层铺开（荧光笔语义，不是反白 chip） */}
          <span style={{ position: "relative", display: "inline-block" }}>
            <span
              style={{
                position: "absolute", left: -12, right: -14, top: 4, bottom: 4,
                background: hlColor, opacity: FIXED.hlOpacity,
                mixBlendMode: "multiply",                                // 命门：框不许盖字
                borderRadius: "11px 5px 9px 4px / 6px 11px 5px 9px",     // 不规则圆角 = 笔触
                transformOrigin: "50% center",                           // 从文字中心铺开
                zIndex: 0,
                transform: `scaleX(${hlX})`,
              }}
            />
            <span
              style={{
                position: "relative", zIndex: 1, display: "inline-block",
                transform: `scale(${txtScale})`, transformOrigin: "50% 50%",
              }}
            >
              {lastLine}
            </span>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "quote-hold-arrow",
  name: "金句停留",
  category: "强调标注",
  durationInFrames: 128,
  accent: "#FFE949",
  component: QuoteHoldArrow as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "line1", label: "第一行", default: "你现在觉得难受" },
    { type: "text", key: "line2", label: "第二行", default: "不是因为你不行" },
    { type: "text", key: "lastLine", label: "末行（金句·被点亮）", default: "是因为你正在走出舒适区" },
    { type: "slider", key: "fontSize", label: "金句字号", default: 33, min: 22, max: 48, step: 1, unit: "px" },
    { type: "color", key: "hlColor", label: "荧光色", default: "#FFE949" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "number", key: "posX", label: "文字块左缘 X", default: 84, min: 0, max: 900, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "文字块中心 Y", default: 270, min: 0, max: 540, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
