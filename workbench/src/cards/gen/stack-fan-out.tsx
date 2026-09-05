import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/stack-fan-out";

// stack-fan-out · 卡堆扇形展开 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露标题 / 五张图 URL；节奏命门（扇开 0.7 / 停 0.8 / 铺平 0.6、扇角 ±24°、弧心 R=520、退场 0.4）在模板 CONFIG 里固定不暴露。
// 6.4s + 0.4s = 204 帧。图片专用。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  title?: string;
  src1?: string;
  src2?: string;
  src3?: string;
  src4?: string;
  src5?: string;
}

const StackFanOut: React.FC<Props> = ({
  title = "今年拍了五张候选封面",
  src1 = "",
  src2 = "",
  src3 = "",
  src4 = "",
  src5 = "",
}) => (
  <T
    title={title}
    srcs={[src1 || undefined, src2 || undefined, src3 || undefined, src4 || undefined, src5 || undefined]}
  />
);

export const card: CardDef = {
  id: "stack-fan-out",
  name: "卡堆扇形展开",
  category: "素材呈现",
  durationInFrames: 204,
  accent: "#8a8a8a",
  component: StackFanOut as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "顶部标题（空 = 不显示）", default: "今年拍了五张候选封面" },
    { type: "text", key: "src1", label: "第 1 张图 URL（最底，空 = 占位）", default: "" },
    { type: "text", key: "src2", label: "第 2 张图 URL（空 = 占位）", default: "" },
    { type: "text", key: "src3", label: "第 3 张图 URL（空 = 占位）", default: "" },
    { type: "text", key: "src4", label: "第 4 张图 URL（空 = 占位）", default: "" },
    { type: "text", key: "src5", label: "第 5 张图 URL（最上，空 = 占位）", default: "" },
  ],
};
