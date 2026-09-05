import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/parallel-items-with-host";

// parallel-items-with-host · 并列句排版（人物在场）—— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露版式 / 三项文案 / 三张图 / 人物视频；节奏命门（0.6s 项间隔、0.45 弹出、0.35 退场）在模板 CONFIG 里固定不暴露。
// 单式 3.1s + 0.4s = 105 帧；layout="tour" 巡演七式需 663 帧（时间轴上把 clip 拉到 663）。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  layout?: string;
  item1?: string;
  item2?: string;
  item3?: string;
  src1?: string;
  src2?: string;
  src3?: string;
  hostSrc?: string;
}

const ParallelItemsWithHost: React.FC<Props> = ({
  layout = "head-row",
  item1 = "喝咖啡",
  item2 = "读书",
  item3 = "拍照",
  src1 = "",
  src2 = "",
  src3 = "",
  hostSrc = "",
}) => (
  <T
    layout={layout}
    items={[item1, item2, item3]}
    srcs={[src1 || undefined, src2 || undefined, src3 || undefined]}
    hostSrc={hostSrc || undefined}
  />
);

export const card: CardDef = {
  id: "parallel-items-with-host",
  name: "并列句排版（人物在场）",
  category: "人物互动",
  durationInFrames: 105,
  accent: "#8a8a8a",
  component: ParallelItemsWithHost as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "select", key: "layout", label: "版式（一镜一式）", default: "head-row",
      options: [
        { value: "head-row", label: "① 头顶横排卡" },
        { value: "band-triptych", label: "② 三横条灰转彩" },
        { value: "side-column", label: "③ 竖列 + 本人虚化成底" },
        { value: "stack-shuffle", label: "④ 顶部卡堆翻切" },
        { value: "vertical-strips", label: "⑤ 竖切三分 + 人物前景" },
        { value: "diagonal-bands", label: "⑥ 斜切三分 + 圆头像" },
        { value: "bg-swap", label: "⑦ 背景轮换 + 大字" },
        { value: "tour", label: "七式巡演（预览用，663 帧）" },
      ],
    },
    { type: "text", key: "item1", label: "第一项", default: "喝咖啡" },
    { type: "text", key: "item2", label: "第二项", default: "读书" },
    { type: "text", key: "item3", label: "第三项", default: "拍照" },
    { type: "text", key: "src1", label: "第一项图片 URL（空 = 占位）", default: "" },
    { type: "text", key: "src2", label: "第二项图片 URL（空 = 占位）", default: "" },
    { type: "text", key: "src3", label: "第三项图片 URL（空 = 占位）", default: "" },
    { type: "text", key: "hostSrc", label: "人物 alpha 视频 URL（空 = 剪影）", default: "" },
  ],
};
