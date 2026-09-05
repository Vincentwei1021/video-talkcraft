import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/countdown-arc-scatter";

// countdown-arc-scatter · 数字弧落标题 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露数字串 / 选中数 / 标题词 / 强调色；节奏命门（96° 扫回 0.57s 急停、角度算透明度、落位紧接扫停、刻度 0.35 差速、末词染色）在模板 CONFIG 里固定不暴露。
// 5.0s + 0.4s = 162 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  numbers?: string;
  pick?: number;
  words?: string;
  accent?: string;
}

const DEFAULT_NUMBERS = "11, 10, 9, 8, 7, 6, 5, 4, 3";
const DEFAULT_WORDS = "分钟\n搭好\n创作系统";

const CountdownArcScatter: React.FC<Props> = ({
  numbers = DEFAULT_NUMBERS,
  pick = 5,
  words = DEFAULT_WORDS,
  accent = "#0066cc",
}) => (
  <T
    numbers={numbers.split(/[,\s，]+/).map((s) => parseInt(s, 10)).filter((n) => Number.isFinite(n))}
    pick={pick}
    words={words.split("\n").map((s) => s.trim()).filter(Boolean)}
    accent={accent}
  />
);

export const card: CardDef = {
  id: "countdown-arc-scatter",
  name: "数字弧落标题",
  category: "字幕花字",
  durationInFrames: 162,
  accent: "#c9c9cf",
  component: CountdownArcScatter as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "numbers", label: "弧上数字串（相邻递减，逗号分隔）", default: DEFAULT_NUMBERS },
    { type: "number", key: "pick", label: "被选中的数（须在串内）", default: 5, min: 0, max: 999, step: 1 },
    { type: "textarea", key: "words", label: "标题后续词（每行一个，末词染色）", default: DEFAULT_WORDS },
    { type: "color", key: "accent", label: "末词颜色（唯一强调色）", default: "#0066cc" },
  ],
};
