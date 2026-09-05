import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/lead-word-zoom-assemble";

// lead-word-zoom-assemble · 首词占满补句 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露整句词表 / 副行 / 强调词序号 / 强调色；节奏命门（2.3× 独占 + 6% 推近、缩回与左滑同曲线 1:2、后续词推入 28px 淡入 2 帧、上移与副行同窗、hold 3s）在模板 CONFIG 里固定不暴露。
// 4.8s + 0.4s = 156 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  words?: string;
  subline?: string;
  accentIndex?: number;
  accent?: string;
}

const DEFAULT_WORDS = "效率\n才是\n唯一的\n护城河";

const LeadWordZoomAssemble: React.FC<Props> = ({
  words = DEFAULT_WORDS,
  subline = "不是参数，也不是模型大小",
  accentIndex = -2,
  accent = "#0066cc",
}) => {
  const list = words.split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <T
      words={list}
      subline={subline}
      accentIndex={accentIndex === -2 ? list.length - 1 : accentIndex}
      accent={accent}
    />
  );
};

export const card: CardDef = {
  id: "lead-word-zoom-assemble",
  name: "首词占满补句",
  category: "字幕花字",
  durationInFrames: 156,
  accent: "#0066cc",
  component: LeadWordZoomAssemble as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "words", label: "整句按词分行（第一行 = 首词，≤4 字）", default: DEFAULT_WORDS },
    { type: "text", key: "subline", label: "副行（空 = 不要副行）", default: "不是参数，也不是模型大小" },
    { type: "number", key: "accentIndex", label: "强调词序号（-2 = 末词，-1 = 不换色，0 = 首词）", default: -2, min: -2, max: 11, step: 1 },
    { type: "color", key: "accent", label: "强调色", default: "#0066cc" },
  ],
};
