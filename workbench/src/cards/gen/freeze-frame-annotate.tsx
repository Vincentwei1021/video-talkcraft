import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/freeze-frame-annotate";

// freeze-frame-annotate · 定格圈注 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露 B-roll URL / 标签文案 / 圈注椭圆几何（中心 + 半径，由此生成 path 与长度）；
// 节奏命门（1.3s 定格、4 帧白闪、8 帧描边、6 帧箭头、hold 1.6、1.4× 补时）在模板 CONFIG 里固定不暴露。
// 5.9s + 0.4s = 189 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  src?: string;
  label?: string;
  sub?: string;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
}

/** 手绘感椭圆：四段三次贝塞尔，控制点略不规则（与模板 demo 路径同口径）；返回 path 与近似长度（Ramanujan） */
const ellipsePath = (cx: number, cy: number, rx: number, ry: number) => {
  const k = 0.5523;
  const d = [
    `M ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ry * k * 1.28}, ${cx - rx * k * 1.05} ${cy - ry * 1.04}, ${cx + rx * 0.04} ${cy - ry}`,
    `C ${cx + rx * k * 1.04} ${cy - ry * 0.96}, ${cx + rx * 1.01} ${cy - ry * k * 0.98}, ${cx + rx} ${cy}`,
    `C ${cx + rx * 0.99} ${cy + ry * k * 1.02}, ${cx + rx * k * 0.92} ${cy + ry * 1.02}, ${cx - rx * 0.01} ${cy + ry}`,
    `C ${cx - rx * k * 0.94} ${cy + ry * 0.98}, ${cx - rx} ${cy + ry * k * 1.17}, ${cx - rx} ${cy} Z`,
  ].join(" ");
  const h = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2);
  const len = Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  return { d, len: Math.round(len * 1.04) };
};
/** 箭头：从标签右下指向椭圆左上缘 */
const arrowPath = (cx: number, cy: number, rx: number, ry: number) => {
  const tx = cx - rx * 0.76, ty = cy - ry * 0.75;            // 椭圆左上缘落点
  const sx = tx - 70, sy = ty - 30;
  const d = `M ${sx} ${sy} C ${sx + 26} ${sy + 10}, ${sx + 50} ${sy + 20}, ${tx} ${ty} M ${tx - 16} ${ty - 13} L ${tx} ${ty} L ${tx - 17} ${ty + 4}`;
  return { d, len: 114 };
};

const FreezeFrameAnnotate: React.FC<Props> = ({
  src = "",
  label = "注意他的左手",
  sub = "一直按着 ⌘，没离开过",
  cx = 480,
  cy = 268,
  rx = 150,
  ry = 96,
}) => {
  const e = ellipsePath(cx, cy, rx, ry), a = arrowPath(cx, cy, rx, ry);
  return <T src={src || undefined} label={label} sub={sub} ellipsePath={e.d} ellipseLen={e.len} arrowPath={a.d} arrowLen={a.len} />;
};

export const card: CardDef = {
  id: "freeze-frame-annotate",
  name: "定格圈注",
  category: "强调标注",
  durationInFrames: 189,
  accent: "#ffd60a",
  component: FreezeFrameAnnotate as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "src", label: "B-roll 视频 URL（空 = footage 占位）", default: "" },
    { type: "text", key: "label", label: "标签主行", default: "注意他的左手" },
    { type: "text", key: "sub", label: "标签副行（空 = 不显示）", default: "一直按着 ⌘，没离开过" },
    { type: "number", key: "cx", label: "圈注中心 x（960 基准）", default: 480, min: 0, max: 960, step: 1, unit: "px" },
    { type: "number", key: "cy", label: "圈注中心 y", default: 268, min: 0, max: 540, step: 1, unit: "px" },
    { type: "number", key: "rx", label: "椭圆横半径", default: 150, min: 30, max: 400, step: 1, unit: "px" },
    { type: "number", key: "ry", label: "椭圆纵半径", default: 96, min: 30, max: 260, step: 1, unit: "px" },
  ],
};
