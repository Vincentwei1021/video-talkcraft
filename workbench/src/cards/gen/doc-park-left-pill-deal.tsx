import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/doc-park-left-pill-deal";

// doc-park-left-pill-deal · 文档驻留发牌 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露文档标题 / 三条结论 / 三行说明 / 提示行 / 真文档 URL / 强调色；节奏命门（0.9 满幅读、驻留 −514 / .92、发牌 1.3s 间隔、先实后稳、说明行逐词加深留住）在模板 CONFIG 里固定不暴露。
// 7.0s + 0.4s = 222 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  docTitle?: string;
  pills?: string;
  notes?: string;
  hint?: string;
  docSrc?: string;
  accent?: string;
}

const DEFAULT_PILLS = "开头 3 秒决定 70% 完播\n每周 2 更比日更留存高\n字幕素排的完播率最高";
const DEFAULT_NOTES = "数据来自 1.2 万条样本，知识区更明显\n日更的三个月流失率反而高 12%\n花字越多，观众越看不进你在说什么";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

const DocParkLeftPillDeal: React.FC<Props> = ({
  docTitle = "2026 中国短视频创作者调研报告",
  pills = DEFAULT_PILLS,
  notes = DEFAULT_NOTES,
  hint = "读完 60 页，我记下三条",
  docSrc = "",
  accent = "#0066cc",
}) => (
  <T
    docTitle={docTitle}
    pills={lines(pills)}
    notes={lines(notes)}
    hint={hint}
    docSrc={docSrc || undefined}
    accent={accent}
  />
);

export const card: CardDef = {
  id: "doc-park-left-pill-deal",
  name: "文档驻留发牌",
  category: "素材呈现",
  durationInFrames: 222,
  accent: "#d6d6dc",
  component: DocParkLeftPillDeal as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "docTitle", label: "文档标题（mock 文档顶部；传真图时不显示）", default: "2026 中国短视频创作者调研报告" },
    { type: "textarea", key: "pills", label: "三条结论（每行一条，按口播顺序）", default: DEFAULT_PILLS },
    { type: "textarea", key: "notes", label: "每条结论下的说明行（每行一条，与结论同序）", default: DEFAULT_NOTES },
    { type: "text", key: "hint", label: "提示行", default: "读完 60 页，我记下三条" },
    { type: "text", key: "docSrc", label: "真文档长截图 URL（空 = 灰条 mock）", default: "" },
    { type: "color", key: "accent", label: "药丸圆点颜色（唯一强调色）", default: "#0066cc" },
  ],
};
