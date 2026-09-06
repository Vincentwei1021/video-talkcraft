import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/word-relay-filmstrip";

// word-relay-filmstrip · 动词接力胶片 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露名词 / 动词表 / 卡标签 / 卡图 URL / 强调色；节奏命门（1.4s 词期、切词窗 0.4s 滚一卡高、先出后进、词块中心 = 卡中点、hold 0.9s）在模板 CONFIG 里固定不暴露。
// 6.4s + 0.4s = 204 帧（4 词）。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  noun?: string;
  verbs?: string;
  labels?: string;
  srcs?: string;
  accent?: string;
}

const DEFAULT_VERBS = "写文案\n做配图\n剪视频\n配旁白";
const DEFAULT_LABELS = "文案 · 初稿\n配图 · 3 版\n成片 · 时间线\n旁白 · 波形\n封面 · 候选";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

const WordRelayFilmstrip: React.FC<Props> = ({
  noun = "一个 AI，能",
  verbs = DEFAULT_VERBS,
  labels = DEFAULT_LABELS,
  srcs = "",
  accent = "#0066cc",
}) => {
  const srcList = srcs.split("\n").map((x) => x.trim());
  return (
    <T
      noun={noun}
      verbs={lines(verbs)}
      labels={lines(labels)}
      srcs={srcList.some(Boolean) ? srcList.map((s) => s || undefined) : undefined}
      accent={accent}
    />
  );
};

export const card: CardDef = {
  id: "word-relay-filmstrip",
  name: "动词接力胶片",
  category: "素材呈现",
  durationInFrames: 204,
  accent: "#7d8aa3",
  component: WordRelayFilmstrip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "noun", label: "名词（上行，恒定）", default: "一个 AI，能" },
    { type: "textarea", key: "verbs", label: "动词（每行一个，4~6 个；末词换强调色）", default: DEFAULT_VERBS },
    { type: "textarea", key: "labels", label: "胶片卡标签（每行一个，比动词多一张 = 露出的下一张）", default: DEFAULT_LABELS },
    { type: "textarea", key: "srcs", label: "胶片卡图片 URL（每行一个，与标签同序；空 = 占位）", default: "" },
    { type: "color", key: "accent", label: "末词颜色（唯一强调色）", default: "#0066cc" },
  ],
};
