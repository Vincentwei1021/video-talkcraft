import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/timeline-photo-strip";

// timeline-photo-strip · 时间线照片带 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露日期 caption / 图；运镜命门（停靠 z 1.05、移 0.9 停 1.0、拉开 z .62 + 停 1.2）在模板 CONFIG 里固定不暴露。9.9s + 0.4s = 309 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  label1?: string; label2?: string; label3?: string; label4?: string;
  src1?: string; src2?: string; src3?: string; src4?: string;
}

const TimelinePhotoStrip: React.FC<Props> = ({
  label1 = "2019 · 一台笔记本", label2 = "2021 · 有了工位", label3 = "2023 · 全套设备", label4 = "2026 · 自己的工作室",
  src1 = "", src2 = "", src3 = "", src4 = "",
}) => <T labels={[label1, label2, label3, label4]} srcs={[src1, src2, src3, src4].map((s) => s || undefined)} />;

export const card: CardDef = {
  id: "timeline-photo-strip",
  name: "时间线照片带",
  category: "素材呈现",
  durationInFrames: 309,
  accent: "#8a8a8a",
  component: TimelinePhotoStrip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "label1", label: "日期 caption 1", default: "2019 · 一台笔记本" },
    { type: "text", key: "label2", label: "日期 caption 2", default: "2021 · 有了工位" },
    { type: "text", key: "label3", label: "日期 caption 3", default: "2023 · 全套设备" },
    { type: "text", key: "label4", label: "日期 caption 4", default: "2026 · 自己的工作室" },
    { type: "text", key: "src1", label: "图 1 URL（空 = 占位）", default: "" },
    { type: "text", key: "src2", label: "图 2 URL（空 = 占位）", default: "" },
    { type: "text", key: "src3", label: "图 3 URL（空 = 占位）", default: "" },
    { type: "text", key: "src4", label: "图 4 URL（空 = 占位）", default: "" },
  ],
};
