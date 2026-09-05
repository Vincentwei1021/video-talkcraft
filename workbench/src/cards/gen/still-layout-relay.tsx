import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/still-layout-relay";

// still-layout-relay · 多图排版 + 焦点接力 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露版式 / 三条图注 / 三张图 / 描边环色；节奏命门（错峰 80~150ms、0.4 接力、其余降权 .6 / .985、0.4 退场）在模板 CONFIG / TABLE 里固定不暴露。
// 一主两辅 8.08s + 0.4s = 254 帧；三联 7.08s + 0.4s = 224 帧；layout="tour" 两式巡演 467 帧（时间轴上把 clip 拉到 467）。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  layout?: string;
  cap1?: string;
  cap2?: string;
  cap3?: string;
  src1?: string;
  src2?: string;
  src3?: string;
  accent?: string;
}

const StillLayoutRelay: React.FC<Props> = ({
  layout = "hero-duo",
  cap1 = "这台相机 · 主角",
  cap2 = "细节 · 镜头群",
  cap3 = "上手 · 握持",
  src1 = "",
  src2 = "",
  src3 = "",
  accent = "#0066cc",
}) => (
  <T
    layout={layout}
    captions={[cap1, cap2, cap3]}
    srcs={[src1 || undefined, src2 || undefined, src3 || undefined]}
    accent={accent}
  />
);

export const card: CardDef = {
  id: "still-layout-relay",
  name: "多图排版 + 焦点接力",
  category: "素材呈现",
  durationInFrames: 254,
  accent: "#0066cc",
  component: StillLayoutRelay as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "select", key: "layout", label: "版式（一镜一式）", default: "hero-duo",
      options: [
        { value: "hero-duo", label: "① 一主两辅（254 帧）" },
        { value: "triptych", label: "② 三联竖图（224 帧）" },
        { value: "tour", label: "两式巡演（预览用，467 帧）" },
      ],
    },
    { type: "text", key: "cap1", label: "图注 1（① 主图 / ② 左）", default: "这台相机 · 主角" },
    { type: "text", key: "cap2", label: "图注 2（① 佐证 1 / ② 中）", default: "细节 · 镜头群" },
    { type: "text", key: "cap3", label: "图注 3（① 佐证 2 / ② 右）", default: "上手 · 握持" },
    { type: "text", key: "src1", label: "图 1 URL（空 = 占位）", default: "" },
    { type: "text", key: "src2", label: "图 2 URL（空 = 占位）", default: "" },
    { type: "text", key: "src3", label: "图 3 URL（空 = 占位）", default: "" },
    { type: "color", key: "accent", label: "描边环色（单强调色）", default: "#0066cc" },
  ],
};
