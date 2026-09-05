import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/flying-words";

// flying-words · 关键词隧道 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露词表；节奏命门（z −1750→+800、黄金角铺位、生命曲线、整数圈、近端糊化、静态光晕）在模板 CONFIG 里固定不暴露。
// 背景层卡：前景（人物 / 标题）在时间轨上另叠一条 clip。6.0s + 0.4s = 192 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  words?: string;
}

const DEFAULT_WORDS = "大模型\ntoken\n提示词\n上下文\nRAG\n微调\n推理\n涌现\n对齐\n幻觉\nAgent\n多模态\n嵌入\n向量库\n思维链\n蒸馏\nMoE\n量化\n注意力\n预训练\n强化学习\n评测";

const FlyingWords: React.FC<Props> = ({ words = DEFAULT_WORDS }) => (
  <T words={words.split("\n").map((s) => s.trim()).filter(Boolean)} />
);

export const card: CardDef = {
  id: "flying-words",
  name: "关键词隧道",
  category: "字幕花字",
  durationInFrames: 192,
  accent: "#8ab4ff",
  component: FlyingWords as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "words", label: "词表（每行一个，12~30 个）", default: DEFAULT_WORDS },
  ],
};
