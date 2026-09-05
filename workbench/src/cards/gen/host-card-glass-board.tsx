import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/host-card-glass-board";

// host-card-glass-board · 人物竖卡玻璃台 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 暴露板头三行文案 / 三步道具（逐行 DSL）/ 结果胶囊 / 人物视频；节奏命门（板 −18→−10 单次显影、sheen 一次、tile 0.9s 一档、连接线滞后 0.45、6.1 同收）在模板 CONFIG 里固定不暴露。
// 6.6s + 0.4s = 210 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  tag?: string;
  title?: string;
  en?: string;
  steps?: string;
  result?: string;
  hostSrc?: string;
}

const DEFAULT_STEPS = "✎|文稿|SCRIPT · 13 句\n◉|配音|VOICE · 95 s\n▶|成片|RENDER · 1080p";

/** 逐行 DSL "图标|标签|副标" → steps；缺字段用空串补，空行跳过，最多 4 步 */
const parseSteps = (s: string) =>
  s.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 4).map((l) => {
    const [icon = "", label = "", sub = ""] = l.split("|").map((x) => x.trim());
    return { icon, label, sub };
  });

const HostCardGlassBoard: React.FC<Props> = ({
  tag = "TALKCRAFT · 第 12 期",
  title = "口播工作流",
  en = "SCRIPT → VOICE → RENDER",
  steps = DEFAULT_STEPS,
  result = "一遍过 · 3 分 20 秒",
  hostSrc = "",
}) => {
  const parsed = parseSteps(steps);
  return <T tag={tag} title={title} en={en} steps={parsed.length >= 2 ? parsed : undefined} result={result} hostSrc={hostSrc || undefined} />;
};

export const card: CardDef = {
  id: "host-card-glass-board",
  name: "人物竖卡玻璃台",
  category: "人物互动",
  durationInFrames: 210,
  accent: "#8ab4ff",
  component: HostCardGlassBoard as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "tag", label: "板头期数小字", default: "TALKCRAFT · 第 12 期" },
    { type: "text", key: "title", label: "大标题（逐字解糊）", default: "口播工作流" },
    { type: "text", key: "en", label: "英文字距行", default: "SCRIPT → VOICE → RENDER" },
    { type: "textarea", key: "steps", label: "道具步骤（每行「图标|标签|副标」，2~4 步）", default: DEFAULT_STEPS },
    { type: "text", key: "result", label: "结果胶囊", default: "一遍过 · 3 分 20 秒" },
    { type: "text", key: "hostSrc", label: "口播人物 alpha 视频 URL（空 = 灰阶剪影）", default: "" },
  ],
};
