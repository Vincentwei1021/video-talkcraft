import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/grid-to-hero";

// grid-to-hero · 网格收成主角 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露四格标签 / 四格素材 URL / 主角格；节奏命门（错峰 120ms、重排 0.8 inOut、停 1.2 / 2.0 / 0.8、退场 0.4）在模板 CONFIG 里固定不暴露。
// 7.33s + 0.4s = 232 帧。素材 URL 以 .mp4 / .webm / .mov 结尾自动走 <OffthreadVideo>。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  heroIdx?: string;
  label1?: string;
  label2?: string;
  label3?: string;
  label4?: string;
  src1?: string;
  src2?: string;
  src3?: string;
  src4?: string;
}

const GridToHero: React.FC<Props> = ({
  heroIdx = "2",
  label1 = "封面候选 ①",
  label2 = "封面候选 ②",
  label3 = "封面候选 ③ · 最终选它",
  label4 = "封面候选 ④",
  src1 = "",
  src2 = "",
  src3 = "",
  src4 = "",
}) => (
  <T
    heroIdx={Number(heroIdx)}
    labels={[label1, label2, label3, label4]}
    srcs={[src1 || undefined, src2 || undefined, src3 || undefined, src4 || undefined]}
  />
);

export const card: CardDef = {
  id: "grid-to-hero",
  name: "网格收成主角",
  category: "素材呈现",
  durationInFrames: 232,
  accent: "#8a8a8a",
  component: GridToHero as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "select", key: "heroIdx", label: "哪一格成为主角", default: "2",
      options: [
        { value: "0", label: "第 1 格（左上）" },
        { value: "1", label: "第 2 格（右上）" },
        { value: "2", label: "第 3 格（左下）" },
        { value: "3", label: "第 4 格（右下）" },
      ],
    },
    { type: "text", key: "label1", label: "第 1 格标签", default: "封面候选 ①" },
    { type: "text", key: "label2", label: "第 2 格标签", default: "封面候选 ②" },
    { type: "text", key: "label3", label: "第 3 格标签", default: "封面候选 ③ · 最终选它" },
    { type: "text", key: "label4", label: "第 4 格标签", default: "封面候选 ④" },
    { type: "text", key: "src1", label: "第 1 格素材 URL（空 = 占位）", default: "" },
    { type: "text", key: "src2", label: "第 2 格素材 URL（空 = 占位；.mp4 走视频）", default: "" },
    { type: "text", key: "src3", label: "第 3 格素材 URL（空 = 占位）", default: "" },
    { type: "text", key: "src4", label: "第 4 格素材 URL（空 = 占位）", default: "" },
  ],
};
