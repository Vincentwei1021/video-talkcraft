import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/word-slot-cycle";

// word-slot-cycle · 词槽轮换 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露句干 / 词表 / 结论 / 强调色；节奏命门（0.7s 拍长里 8 帧换位 13 帧静置、滚轮 blur、末 pill 上飞、结论唯一过冲、hold 2.5s）在模板 CONFIG 里固定不暴露。
// 6.45s + 0.4s = 206 帧（4 词）。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  stem?: string;
  words?: string;
  final?: string;
  accent?: string;
}

const DEFAULT_WORDS = "写代码\n改简历\n做 PPT\n查资料";

const WordSlotCycle: React.FC<Props> = ({
  stem = "一个 AI，帮你",
  words = DEFAULT_WORDS,
  final = "搞定所有事",
  accent = "#0066cc",
}) => (
  <T
    stem={stem}
    words={words.split("\n").map((s) => s.trim()).filter(Boolean)}
    final={final}
    accent={accent}
  />
);

export const card: CardDef = {
  id: "word-slot-cycle",
  name: "词槽轮换",
  category: "字幕花字",
  durationInFrames: 206,
  accent: "#1d1d1f",
  component: WordSlotCycle as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "stem", label: "句干（钉死不动）", default: "一个 AI，帮你" },
    { type: "textarea", key: "words", label: "轮换词表（每行一个，4~6 个）", default: DEFAULT_WORDS },
    { type: "text", key: "final", label: "结论（落进胶囊原位）", default: "搞定所有事" },
    { type: "color", key: "accent", label: "结论颜色（唯一强调色）", default: "#0066cc" },
  ],
};
