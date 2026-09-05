import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/split-compare-slider";

// split-compare-slider · 对比双分屏（滑动揭示）—— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露两张图 / 两枚标签；节奏命门（0.6 起手、1.4 揭示、1.5 停、nudge 42、近端 8、极慢推 1.04）在模板 CONFIG 里固定不暴露。
// 只传一张图（或两张相同）时模板自动套"前 / 后"两套滤镜演示调色。9.48s + 0.4s = 296 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  srcBefore?: string;
  srcAfter?: string;
  labelBefore?: string;
  labelAfter?: string;
}

const SplitCompareSlider: React.FC<Props> = ({ srcBefore = "", srcAfter = "", labelBefore = "调色前", labelAfter = "调色后" }) => (
  <T srcBefore={srcBefore || undefined} srcAfter={srcAfter || undefined} labelBefore={labelBefore} labelAfter={labelAfter} />
);

export const card: CardDef = {
  id: "split-compare-slider",
  name: "对比双分屏（滑动揭示）",
  category: "素材呈现",
  durationInFrames: 296,
  accent: "#8a8a8a",
  component: SplitCompareSlider as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "srcBefore", label: "\"前\"图 URL（左，空 = 占位）", default: "" },
    { type: "text", key: "srcAfter", label: "\"后\"图 URL（右，空 = 占位 / 同图套滤镜）", default: "" },
    { type: "text", key: "labelBefore", label: "左标签", default: "调色前" },
    { type: "text", key: "labelAfter", label: "右标签", default: "调色后" },
  ],
};
