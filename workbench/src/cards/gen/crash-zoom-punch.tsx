import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/crash-zoom-punch";

// crash-zoom-punch · 急推特写 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露真截图 URL / 目标 bbox 四个数字 / 假设置页目标行文案；节奏命门（1s 全景、6 帧 power3.in 急推 2.3、5 帧回收 2.2、落定钉死）在模板 CONFIG 里固定不暴露。
// 4.4s + 0.4s = 144 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  src?: string;
  tx?: number;
  ty?: number;
  tw?: number;
  th?: number;
  label?: string;
  sub?: string;
}

const CrashZoomPunch: React.FC<Props> = ({
  src = "",
  tx = 108,
  ty = 237,
  tw = 208,
  th = 64,
  label = "自动续费",
  sub = "下次扣款 2026-10-05 · ¥ 199 / 月",
}) => (
  <T src={src || undefined} target={{ x: tx, y: ty, w: tw, h: th }} label={label} sub={sub} />
);

export const card: CardDef = {
  id: "crash-zoom-punch",
  name: "急推特写",
  category: "强调标注",
  durationInFrames: 144,
  accent: "#248a3d",
  component: CrashZoomPunch as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "src", label: "截图 URL（空 = CSS 假设置页）", default: "" },
    { type: "number", key: "tx", label: "目标 x（舞台坐标，960 基准）", default: 108, min: 0, max: 960, step: 1, unit: "px" },
    { type: "number", key: "ty", label: "目标 y", default: 237, min: 0, max: 540, step: 1, unit: "px" },
    { type: "number", key: "tw", label: "目标宽", default: 208, min: 20, max: 960, step: 1, unit: "px" },
    { type: "number", key: "th", label: "目标高", default: 64, min: 20, max: 540, step: 1, unit: "px" },
    { type: "text", key: "label", label: "目标行标题（仅假设置页）", default: "自动续费" },
    { type: "text", key: "sub", label: "目标行副行（仅假设置页）", default: "下次扣款 2026-10-05 · ¥ 199 / 月" },
  ],
};
