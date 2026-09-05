import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/chip-grid-single-select";

// chip-grid-single-select · 五选一反黑 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露问题行 / 候选项（逐行 DSL）/ 选中项序号 / 算式行（逐词 DSL，*词* 为强调色）；节奏命门（FS 2.0、1 帧灰闪、5 帧 linear 反黑、18% 锁位、1.5s 后收束回中线）在模板 CONFIG 里固定不暴露。
// 6.8s + 0.4s = 216 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  question?: string;
  options?: string;
  selected?: number;
  equation?: string;
}

const DEFAULT_OPTIONS = "方案 A · 全手动\n方案 B · 半自动\n方案 C · 全自动\n方案 D · 外包\n方案 E · 先不做";
const DEFAULT_EQ = "每期 *省 6 小时* × 每周 3 期 = *每月 72 小时*";

const parseOptions = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6);
// 算式 DSL：空格分词；*词* 为强调色（词内可含空格，用 * 包住）
const parseEq = (s: string) => {
  const out: { text: string; accent?: boolean }[] = [];
  const re = /\*([^*]+)\*|(\S+)/g; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[1] ? { text: m[1].trim(), accent: true } : { text: m[2] });
  return out;
};

const ChipGridSingleSelect: React.FC<Props> = ({ question = "五个方案，我选哪个？", options = DEFAULT_OPTIONS, selected = 3, equation = DEFAULT_EQ }) => {
  const opts = parseOptions(options);
  return <T question={question} options={opts} selected={Math.min(opts.length, Math.max(1, Math.round(selected))) - 1} equation={parseEq(equation)} />;
};

export const card: CardDef = {
  id: "chip-grid-single-select",
  name: "五选一反黑",
  category: "数据信息图",
  durationInFrames: 216,
  accent: "#1d1d1f",
  component: ChipGridSingleSelect as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "question", label: "问题行（画面文字）", default: "五个方案，我选哪个？" },
    { type: "textarea", key: "options", label: "候选项（每行一枚，≤6；前 3 上排）", default: DEFAULT_OPTIONS },
    { type: "number", key: "selected", label: "选中第几项（1 起）", default: 3, min: 1, max: 6, step: 1 },
    { type: "text", key: "equation", label: "算式行（空格分词，*词* 为强调色）", default: DEFAULT_EQ },
  ],
};
