import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/line-carry-transition";

// line-carry-transition · 线条接力转场 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露 A / B 两镜的标题副标与 B 内容图；节奏命门（下划线 0.6s、横移 2.0s 线与镜头同速、框闭合后 B 才淡入、6.0 同收）在模板 CONFIG 里固定不暴露。
// 6.4s + 0.4s = 204 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  titleA?: string;
  subA?: string;
  titleB?: string;
  subB?: string;
  srcB?: string;
}

const LineCarryTransition: React.FC<Props> = ({
  titleA = "第一部分 · 为什么慢",
  subA = "三个拖慢流程的地方",
  titleB = "第二部分 · 怎么快",
  subB = "把三处改成自动",
  srcB = "",
}) => (
  <T titleA={titleA} subA={subA} titleB={titleB} subB={subB} srcB={srcB || undefined} />
);

export const card: CardDef = {
  id: "line-carry-transition",
  name: "线条接力转场",
  category: "转场结构",
  durationInFrames: 204,
  accent: "#0066cc",
  component: LineCarryTransition as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "titleA", label: "A 镜标题", default: "第一部分 · 为什么慢" },
    { type: "text", key: "subA", label: "A 镜副标（空 = 不显示）", default: "三个拖慢流程的地方" },
    { type: "text", key: "titleB", label: "B 镜标题", default: "第二部分 · 怎么快" },
    { type: "text", key: "subB", label: "B 镜副标（空 = 不显示）", default: "把三处改成自动" },
    { type: "text", key: "srcB", label: "B 内容图 URL（空 = 占位）", default: "" },
  ],
};
