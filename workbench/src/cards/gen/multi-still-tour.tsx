import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/multi-still-tour";

// multi-still-tour · 多图巡览停靠 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露版式 / 图注 / 图；运镜命门（全景 z .61 / 停靠 z 1.15、移 1.0 停 0.9；timeline 移 0.9 停 1.0 拉开 z .62）在模板 CONFIG 里固定不暴露。
// 单式：wall 8.2s + 0.4s = 258 帧，timeline 9.9s + 0.4s = 309 帧；layout="tour" 两式巡演需 555 帧（时间轴上把 clip 拉到 555）。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  layout?: string;
  label1?: string; label2?: string; label3?: string; label4?: string;
  src1?: string; src2?: string; src3?: string; src4?: string;
}

const MultiStillTour: React.FC<Props> = ({
  layout = "wall",
  label1 = "案例一 · 品牌官网", label2 = "案例二 · 电商小程序", label3 = "案例三 · 数据看板", label4 = "2026 · 自己的工作室",
  src1 = "", src2 = "", src3 = "", src4 = "",
}) => (
  <T layout={layout} labels={[label1, label2, label3, label4]} srcs={[src1, src2, src3, src4].map((s) => s || undefined)} />
);

export const card: CardDef = {
  id: "multi-still-tour",
  name: "多图巡览停靠",
  category: "运镜",
  durationInFrames: 258,
  accent: "#8a8a8a",
  component: MultiStillTour as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "select", key: "layout", label: "版式（一镜一式）", default: "wall",
      options: [
        { value: "wall", label: "① 照片墙推轨（3 张，258 帧）" },
        { value: "timeline", label: "② 时间线照片带（4 张，309 帧）" },
        { value: "tour", label: "两式巡演（预览用，555 帧）" },
      ],
    },
    { type: "text", key: "label1", label: "图注 1（wall 压图标签 / timeline 日期）", default: "案例一 · 品牌官网" },
    { type: "text", key: "label2", label: "图注 2", default: "案例二 · 电商小程序" },
    { type: "text", key: "label3", label: "图注 3", default: "案例三 · 数据看板" },
    { type: "text", key: "label4", label: "图注 4（仅 timeline）", default: "2026 · 自己的工作室" },
    { type: "text", key: "src1", label: "图 1 URL（空 = 占位）", default: "" },
    { type: "text", key: "src2", label: "图 2 URL（空 = 占位）", default: "" },
    { type: "text", key: "src3", label: "图 3 URL（空 = 占位）", default: "" },
    { type: "text", key: "src4", label: "图 4 URL（仅 timeline，空 = 占位）", default: "" },
  ],
};
