import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/split-60-40-story";

// split-60-40-story · 60/40 主从分屏 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露标题 / 三枚 chip 文案与底色 / 左格素材 URL / 人物视频；节奏命门（缓推 1.06 duration=镜头、0.6s 逐枚、尾对齐同收）在模板 CONFIG 里固定不暴露。
// 6.8s + 0.4s = 216 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  title?: string;
  chip1?: string;
  chip2?: string;
  chip3?: string;
  chipBg1?: string;
  chipBg2?: string;
  chipBg3?: string;
  src?: string;
  hostSrc?: string;
}

const DEFAULT_TITLE = "它一晚上\n干了三件事";

const Split6040Story: React.FC<Props> = ({
  title = DEFAULT_TITLE,
  chip1 = "读完 40 份资料",
  chip2 = "写好三版初稿",
  chip3 = "跑测试 修 bug",
  chipBg1 = "#E8F0FF",
  chipBg2 = "#FFE9F0",
  chipBg3 = "#E6F7F2",
  src = "",
  hostSrc = "",
}) => (
  <T
    title={title.split("\n").map((s) => s.trim()).filter(Boolean)}
    chips={[chip1, chip2, chip3].filter(Boolean)}
    chipBg={[chipBg1, chipBg2, chipBg3]}
    src={src || undefined}
    hostSrc={hostSrc || undefined}
  />
);

export const card: CardDef = {
  id: "split-60-40-story",
  name: "60/40 主从分屏",
  category: "素材呈现",
  durationInFrames: 216,
  accent: "#789389",
  component: Split6040Story as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "title", label: "标题（每行一句）", default: DEFAULT_TITLE },
    { type: "text", key: "chip1", label: "要点 ①", default: "读完 40 份资料" },
    { type: "text", key: "chip2", label: "要点 ②", default: "写好三版初稿" },
    { type: "text", key: "chip3", label: "要点 ③（空 = 只两枚）", default: "跑测试 修 bug" },
    { type: "color", key: "chipBg1", label: "要点 ① 底板（pastel）", default: "#E8F0FF" },
    { type: "color", key: "chipBg2", label: "要点 ② 底板（pastel）", default: "#FFE9F0" },
    { type: "color", key: "chipBg3", label: "要点 ③ 底板（pastel）", default: "#E6F7F2" },
    { type: "text", key: "src", label: "左格 B-roll 视频 URL（空 = 占位）", default: "" },
    { type: "text", key: "hostSrc", label: "左格口播本人 alpha 视频 URL（优先于 B-roll）", default: "" },
  ],
};
