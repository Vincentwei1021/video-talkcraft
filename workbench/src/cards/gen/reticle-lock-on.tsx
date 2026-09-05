import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/reticle-lock-on";

// reticle-lock-on · 准星咬合 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露真截图 URL / 目标 bbox 四个数字 / 标签 / 假页面按钮文字；节奏命门（1.3s 起跳、10 帧扑入、2.2→0.94→1 超调、咬合帧三件事同帧、之后钉死）在模板 CONFIG 里固定不暴露。
// 6.0s + 0.4s = 192 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  src?: string;
  tx?: number;
  ty?: number;
  tw?: number;
  th?: number;
  label?: string;
  buttonText?: string;
}

const ReticleLockOn: React.FC<Props> = ({ src = "", tx = 30, ty = 300, tw = 190, th = 50, label = "就是这个按钮", buttonText = "立即开通 ¥ 199 / 年" }) => (
  <T src={src || undefined} target={{ x: tx, y: ty, w: tw, h: th }} label={label} buttonText={buttonText} />
);

export const card: CardDef = {
  id: "reticle-lock-on",
  name: "准星咬合",
  category: "强调标注",
  durationInFrames: 192,
  accent: "#0066cc",
  component: ReticleLockOn as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "src", label: "截图 URL（空 = CSS 假设置页）", default: "" },
    { type: "number", key: "tx", label: "目标 x（相对截图左上角，px）", default: 30, min: 0, max: 700, step: 1 },
    { type: "number", key: "ty", label: "目标 y", default: 300, min: 0, max: 420, step: 1 },
    { type: "number", key: "tw", label: "目标宽", default: 190, min: 20, max: 700, step: 1 },
    { type: "number", key: "th", label: "目标高", default: 50, min: 16, max: 420, step: 1 },
    { type: "text", key: "label", label: "咬合帧标签", default: "就是这个按钮" },
    { type: "text", key: "buttonText", label: "假页面按钮文字（仅无截图时）", default: "立即开通 ¥ 199 / 年" },
  ],
};
