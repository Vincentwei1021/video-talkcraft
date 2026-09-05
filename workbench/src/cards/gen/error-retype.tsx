import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/error-retype";

// error-retype · 打字改口 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露句干 / 错的半句 / 对的半句 / 光标色；节奏命门（三档速度 0.09 / 0.06 / 0.06、停顿 0.55s、光标闪两下 + 摘除、hold 2.6s）在模板 CONFIG 里固定不暴露。
// 5.51s + 0.4s = 177 帧（4 字 → 4 字）。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  prefix?: string;
  first?: string;
  second?: string;
  accent?: string;
}

const ErrorRetype: React.FC<Props> = ({
  prefix = "口播做得好，靠的是",
  first = "模型大小",
  second = "讲述方法",
  accent = "#0066cc",
}) => (
  <T prefix={prefix} first={first} second={second} accent={accent} />
);

export const card: CardDef = {
  id: "error-retype",
  name: "打字改口",
  category: "字幕花字",
  durationInFrames: 177,
  accent: "#0066cc",
  component: ErrorRetype as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "prefix", label: "句干（先在，不动）", default: "口播做得好，靠的是" },
    { type: "text", key: "first", label: "错的半句（打出后退掉）", default: "模型大小" },
    { type: "text", key: "second", label: "对的半句（零犹豫重打）", default: "讲述方法" },
    { type: "color", key: "accent", label: "光标颜色（唯一强调色）", default: "#0066cc" },
  ],
};
