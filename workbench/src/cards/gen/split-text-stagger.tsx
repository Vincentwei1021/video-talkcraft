import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/split-text-stagger";

// split-text-stagger · 逐字裂升 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露标题 / 副标；节奏命门（裁切盒内 115%→0、back.out(1.2) 过冲、2 帧错峰、基线与末字同帧长满、hold 到 4.4s）在模板 CONFIG 里固定不暴露。
// 4.8s + 0.4s = 156 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  text?: string;
  sub?: string;
}

const SplitTextStagger: React.FC<Props> = ({
  text = "把复杂的事，讲简单",
  sub = "——口播脚本的第一原则",
}) => <T text={text} sub={sub} />;

export const card: CardDef = {
  id: "split-text-stagger",
  name: "逐字裂升",
  category: "字幕花字",
  durationInFrames: 156,
  accent: "#1d1d1f",
  component: SplitTextStagger as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "text", label: "标题（≤14 字，逐字裂升）", default: "把复杂的事，讲简单" },
    { type: "text", key: "sub", label: "副标（落定后跟进，可空）", default: "——口播脚本的第一原则" },
  ],
};
