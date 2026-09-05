import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/rack-focus-pair";

// rack-focus-pair · 焦点接力 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露两张标签 / 两张图；节奏命门（一清一糊两态、0.7s 转移、2.0 / 4.6 转移点、6.4 同收）在模板 CONFIG 里固定不暴露。
// 6.8s + 0.4s = 216 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  labelFront?: string;
  labelBack?: string;
  srcFront?: string;
  srcBack?: string;
}

const RackFocusPair: React.FC<Props> = ({
  labelFront = "纸书",
  labelBack = "电子书",
  srcFront = "",
  srcBack = "",
}) => (
  <T
    labels={[labelFront, labelBack]}
    srcs={[srcFront || undefined, srcBack || undefined]}
  />
);

export const card: CardDef = {
  id: "rack-focus-pair",
  name: "焦点接力",
  category: "素材呈现",
  durationInFrames: 216,
  accent: "#9c8f78",
  component: RackFocusPair as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "labelFront", label: "前张标签（先在焦）", default: "纸书" },
    { type: "text", key: "labelBack", label: "后张标签（2.0s 接焦）", default: "电子书" },
    { type: "text", key: "srcFront", label: "前张图片 URL（空 = 占位）", default: "" },
    { type: "text", key: "srcBack", label: "后张图片 URL（空 = 占位）", default: "" },
  ],
};
