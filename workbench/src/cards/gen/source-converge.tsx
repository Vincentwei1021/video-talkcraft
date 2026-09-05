import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/source-converge";

// source-converge · 多源汇聚 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露标题 / 来源名 / 汇聚胶囊 / 说明行；节奏命门（逐路接通错峰 0.15、汇入 1.5s、三段式缩小拐点 .75、吞并脉冲、擦线、居中 0.6s）在模板 CONFIG 里固定不暴露。
// 6.2s + 0.4s = 198 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  title?: string;
  sources?: string;
  hub?: string;
  caption?: string;
}

const DEFAULT_SOURCES = "抖音\n小红书\nB 站\n公众号";

const SourceConverge: React.FC<Props> = ({
  title = "四个平台的数据，怎么汇成一张表",
  sources = DEFAULT_SOURCES,
  hub = "一张表",
  caption = "每天 8 点自动更新",
}) => (
  <T
    title={title}
    sources={sources.split("\n").map((s) => s.trim()).filter(Boolean)}
    hub={hub}
    caption={caption}
  />
);

export const card: CardDef = {
  id: "source-converge",
  name: "多源汇聚",
  category: "数据信息图",
  durationInFrames: 198,
  accent: "#7d8aa3",
  component: SourceConverge as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "标题", default: "四个平台的数据，怎么汇成一张表" },
    { type: "textarea", key: "sources", label: "来源（每行一个，2～6 个）", default: DEFAULT_SOURCES },
    { type: "text", key: "hub", label: "汇聚胶囊文案", default: "一张表" },
    { type: "text", key: "caption", label: "汇聚后的说明行（空 = 不显示）", default: "每天 8 点自动更新" },
  ],
};
