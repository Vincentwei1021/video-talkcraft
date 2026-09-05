import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/title-demote-to-label";

// title-demote-to-label · 标题降格成标签 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露标题 / 条目文案 / 三块底板色 / 强调色；节奏命门（显影站稳 0.7s、降格 0.67s 单次补间到 0.4×、内容 +12 帧起 0.55s 逐条生长、hold 2.7s）在模板 CONFIG 里固定不暴露。
// 5.9s + 0.4s = 189 帧（3 条）。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  title?: string;
  items?: string;
  bg1?: string;
  bg2?: string;
  bg3?: string;
  bg4?: string;
  accent?: string;
}

const DEFAULT_ITEMS = "把一句话需求拆成 3～5 个可验证的小目标\n每个小目标写清\"做完长什么样\"\n先做最不确定的那一个";

const TitleDemoteToLabel: React.FC<Props> = ({
  title = "第二步 · 拆解需求",
  items = DEFAULT_ITEMS,
  bg1 = "#E8F0FF",
  bg2 = "#E6F7F2",
  bg3 = "#FFF4DC",
  bg4 = "#FFE9F0",
  accent = "#0066cc",
}) => (
  <T
    title={title}
    items={items.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 4)}
    itemBg={[bg1, bg2, bg3, bg4]}
    accent={accent}
  />
);

export const card: CardDef = {
  id: "title-demote-to-label",
  name: "标题降格成标签",
  category: "字幕花字",
  durationInFrames: 189,
  accent: "#E6F7F2",
  component: TitleDemoteToLabel as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "章节 / 小节标题", default: "第二步 · 拆解需求" },
    { type: "textarea", key: "items", label: "内容条目（每行一条，≤4 条）", default: DEFAULT_ITEMS },
    { type: "color", key: "bg1", label: "条目 ① 底板（pastel）", default: "#E8F0FF" },
    { type: "color", key: "bg2", label: "条目 ② 底板（pastel）", default: "#E6F7F2" },
    { type: "color", key: "bg3", label: "条目 ③ 底板（pastel）", default: "#FFF4DC" },
    { type: "color", key: "bg4", label: "条目 ④ 底板（pastel，有第 4 条时用）", default: "#FFE9F0" },
    { type: "color", key: "accent", label: "竖条颜色（唯一强调色）", default: "#0066cc" },
  ],
};
