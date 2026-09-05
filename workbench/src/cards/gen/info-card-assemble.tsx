import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/info-card-assemble";

// info-card-assemble · 信息卡逐字段自建 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露封面 URL / 说明 / 标题 / 标签 / 价格 / 要点（逐行 DSL）/ 马克行索引 / 色卡颜色；节奏命门（配方帧时间表、0.5s 行程、rise/pop 分工、5 帧马克、1.06 前推）在模板 CONFIG 里固定不暴露。
// 6.8s + 0.4s = 216 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  src?: string;
  caption?: string;
  title?: string;
  pills?: string;
  price?: string;
  lines?: string;
  highlightLines?: string;
  swatch1?: string;
  swatch2?: string;
  swatch3?: string;
}

const DEFAULT_PILLS = "叙事\n心理学\n2024";
const DEFAULT_LINES = "三幕结构的现代版：钩子、转折、回收\n为什么开头 3 秒必须有冲突\n怎么让数据有画面感";

const splitLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

const InfoCardAssemble: React.FC<Props> = ({
  src = "",
  caption = "这期推荐的一本书",
  title = "《讲故事的科学》",
  pills = DEFAULT_PILLS,
  price = "¥ 39.9",
  lines = DEFAULT_LINES,
  highlightLines = "1,2",
  swatch1 = "#E8F0FF",
  swatch2 = "#FFE9F0",
  swatch3 = "#E6F7F2",
}) => (
  <T
    src={src || undefined}
    caption={caption}
    title={title}
    pills={splitLines(pills).slice(0, 3)}
    price={price}
    lines={splitLines(lines).slice(0, 3)}
    highlightLines={highlightLines.split(/[,，\s]+/).map((v) => Number(v) - 1).filter((n) => Number.isInteger(n) && n >= 0)}
    swatches={[swatch1, swatch2, swatch3].filter(Boolean)}
  />
);

export const card: CardDef = {
  id: "info-card-assemble",
  name: "信息卡逐字段自建",
  category: "素材呈现",
  durationInFrames: 216,
  accent: "#9c8f78",
  component: InfoCardAssemble as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "src", label: "封面 / 头像图 URL（空 = 占位）", default: "" },
    { type: "text", key: "caption", label: "左侧说明（画面文字）", default: "这期推荐的一本书" },
    { type: "text", key: "title", label: "标题", default: "《讲故事的科学》" },
    { type: "textarea", key: "pills", label: "标签（每行一枚，≤3）", default: DEFAULT_PILLS },
    { type: "text", key: "price", label: "价格 / 关键数字行（空 = 不显示）", default: "¥ 39.9" },
    { type: "textarea", key: "lines", label: "要点（每行一条，≤3）", default: DEFAULT_LINES },
    { type: "text", key: "highlightLines", label: "带马克底块的要点行号（如 1,2）", default: "1,2" },
    { type: "color", key: "swatch1", label: "色卡 ①", default: "#E8F0FF" },
    { type: "color", key: "swatch2", label: "色卡 ②", default: "#FFE9F0" },
    { type: "color", key: "swatch3", label: "色卡 ③", default: "#E6F7F2" },
  ],
};
