import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/bed-echo-blur";

// bed-echo-blur · 同源模糊底床 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露文案 / 竖屏素材 URL；节奏与处理链命门（blur 26 / brightness .45 / 慢放 0.5× / 缓推速率 / 7.2 退场）在模板 CONFIG 里固定不暴露。
// 7.7s + 0.4s = 243 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  title1?: string;
  title2?: string;
  note1?: string;
  note2?: string;
  src?: string;
}

const BedEchoBlur: React.FC<Props> = ({
  title1 = "网友发来的",
  title2 = "现场画面",
  note1 = "手机竖拍 · 原比例 9:16 · 不留黑边",
  note2 = "拍摄：@海边的阿飞 · 2026-08（示意）",
  src = "",
}) => (
  <T
    title={[title1, title2].filter(Boolean)}
    note={[note1, note2].filter(Boolean)}
    src={src || undefined}
  />
);

export const card: CardDef = {
  id: "bed-echo-blur",
  name: "同源模糊底床",
  category: "素材呈现",
  durationInFrames: 243,
  accent: "#7d8aa3",
  component: BedEchoBlur as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title1", label: "标题第一行", default: "网友发来的" },
    { type: "text", key: "title2", label: "标题第二行", default: "现场画面" },
    { type: "text", key: "note1", label: "来源说明第一行", default: "手机竖拍 · 原比例 9:16 · 不留黑边" },
    { type: "text", key: "note2", label: "来源说明第二行", default: "拍摄：@海边的阿飞 · 2026-08（示意）" },
    { type: "text", key: "src", label: "竖屏素材视频 URL（同一条渲前景 + 底床；空 = 占位）", default: "" },
  ],
};
