import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/filmstrip-conveyor";

// filmstrip-conveyor · 传送带列举 + 减速停靠 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露标题 / 小注 / 六格标签 / 六张图；节奏命门（176px/s、第四格减速 0.25× 停 1.4s、中线放大 1.08）在模板 CONFIG 里固定不暴露。
// 7.94s + 0.4s = 250 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  title?: string;
  note?: string;
  label1?: string; label2?: string; label3?: string; label4?: string; label5?: string; label6?: string;
  src1?: string; src2?: string; src3?: string; src4?: string; src5?: string; src6?: string;
}

const FilmstripConveyor: React.FC<Props> = ({
  title = "去年爆款封面的六种构图",
  note = "2025 年播放量前六的封面 · 第四种出现最多",
  label1 = "构图 一", label2 = "构图 二", label3 = "构图 三", label4 = "构图 四", label5 = "构图 五", label6 = "构图 六",
  src1 = "", src2 = "", src3 = "", src4 = "", src5 = "", src6 = "",
}) => (
  <T
    title={title}
    note={note}
    labels={[label1, label2, label3, label4, label5, label6]}
    srcs={[src1, src2, src3, src4, src5, src6].map((s) => s || undefined)}
  />
);

export const card: CardDef = {
  id: "filmstrip-conveyor",
  name: "传送带列举 + 减速停靠",
  category: "素材呈现",
  durationInFrames: 250,
  accent: "#8a8a8a",
  component: FilmstripConveyor as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "标题", default: "去年爆款封面的六种构图" },
    { type: "text", key: "note", label: "小注", default: "2025 年播放量前六的封面 · 第四种出现最多" },
    { type: "text", key: "label1", label: "第一格标签", default: "构图 一" },
    { type: "text", key: "label2", label: "第二格标签", default: "构图 二" },
    { type: "text", key: "label3", label: "第三格标签", default: "构图 三" },
    { type: "text", key: "label4", label: "第四格标签（减速停靠的关键格）", default: "构图 四" },
    { type: "text", key: "label5", label: "第五格标签", default: "构图 五" },
    { type: "text", key: "label6", label: "第六格标签", default: "构图 六" },
    { type: "text", key: "src1", label: "第一格图片 URL（空 = 占位）", default: "" },
    { type: "text", key: "src2", label: "第二格图片 URL（空 = 占位）", default: "" },
    { type: "text", key: "src3", label: "第三格图片 URL（空 = 占位）", default: "" },
    { type: "text", key: "src4", label: "第四格图片 URL（空 = 占位）", default: "" },
    { type: "text", key: "src5", label: "第五格图片 URL（空 = 占位）", default: "" },
    { type: "text", key: "src6", label: "第六格图片 URL（空 = 占位）", default: "" },
  ],
};
