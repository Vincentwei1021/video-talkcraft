import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/unit-grid-proportion";

// unit-grid-proportion · 点阵比例图 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露染色格数 / 单位 / 标签 / 图例 / 强调色；节奏命门（分环生长 4 帧 + 3 帧抖动、0.035s 一格染色与计数同钟、5.7 同收）在模板 CONFIG 里固定不暴露。
// 6.1s + 0.4s = 195 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  target?: number;
  unit?: string;
  label?: string;
  legendHit?: string;
  legendRest?: string;
  legendNote?: string;
  accent?: string;
}

const DEFAULT_LABEL = "的观众\n在前 3 秒划走";

const UnitGridProportion: React.FC<Props> = ({
  target = 37,
  unit = "%",
  label = DEFAULT_LABEL,
  legendHit = "划走 · 37 人",
  legendRest = "留下 · 63 人",
  legendNote = "每格 = 1 人（示意数据）",
  accent = "#0066cc",
}) => (
  <T
    target={target}
    unit={unit}
    label={label.split("\n").map((s) => s.trim()).filter(Boolean)}
    legend={[legendHit, legendRest, legendNote]}
    accent={accent}
  />
);

export const card: CardDef = {
  id: "unit-grid-proportion",
  name: "点阵比例图",
  category: "数据信息图",
  durationInFrames: 195,
  accent: "#0066cc",
  component: UnitGridProportion as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "number", key: "target", label: "染色格数（= 百分比）", default: 37, min: 0, max: 100, step: 1 },
    { type: "text", key: "unit", label: "大数字后缀", default: "%" },
    { type: "textarea", key: "label", label: "标签（每行一句）", default: DEFAULT_LABEL },
    { type: "text", key: "legendHit", label: "图例 · 染色项（空 = 不显示）", default: "划走 · 37 人" },
    { type: "text", key: "legendRest", label: "图例 · 未染项（空 = 不显示）", default: "留下 · 63 人" },
    { type: "text", key: "legendNote", label: "图例 · 备注（空 = 不显示）", default: "每格 = 1 人（示意数据）" },
    { type: "color", key: "accent", label: "强调色", default: "#0066cc" },
  ],
};
