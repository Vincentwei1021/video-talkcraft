import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/scanline-annotate";

// scanline-annotate · 扫描线逐处点名 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露真截图 URL / 四个目标 bbox（逐行 DSL）/ 四条标注文案；节奏命门（零缓动扫描 2.4s、bbox 反算触发、1.75→1 收拢、标注滞后 5 帧、常驻）在模板 CONFIG 里固定不暴露。
// 5.6s + 0.4s = 180 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  src?: string;
  targets?: string;
  labels?: string;
}

// 目标 bbox 逐行 DSL：x,y,w,h（相对截图左上角，px；按 y 从上到下）
const DEFAULT_TARGETS = "26,66,320,44\n26,172,548,110\n26,300,150,44\n26,358,170,38";
// 标注逐行 DSL：主行|副行
const DEFAULT_LABELS = "标题没说清是什么|01 · 首屏\n首图占了六成视口|02 · 图片\n按钮文案\"了解更多\"|03 · CTA\n价格藏在最底下|04 · 定价";
const DEMO_STYLE = [
  { bg: undefined, radius: undefined },
  { bg: "#dcdce2", radius: undefined },
  { bg: "#0066cc", radius: 22 },
  { bg: undefined, radius: undefined },
];

const parseTargets = (s: string) =>
  s.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
    const [x, y, w, h] = l.split(/[,，\s]+/).map(Number);
    return { x: x || 0, y: y || 0, w: w || 100, h: h || 40, ...(s === DEFAULT_TARGETS ? DEMO_STYLE[i] : {}) };
  });
const parseLabels = (s: string) =>
  s.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [text, sub] = l.split("|");
    return { text: text.trim(), sub: sub?.trim() };
  });

const ScanlineAnnotate: React.FC<Props> = ({ src = "", targets = DEFAULT_TARGETS, labels = DEFAULT_LABELS }) => (
  <T src={src || undefined} targets={parseTargets(targets)} labels={parseLabels(labels)} />
);

export const card: CardDef = {
  id: "scanline-annotate",
  name: "扫描线逐处点名",
  category: "强调标注",
  durationInFrames: 180,
  accent: "#0066cc",
  component: ScanlineAnnotate as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "src", label: "截图 URL（空 = CSS 假落地页）", default: "" },
    { type: "textarea", key: "targets", label: "目标框（每行 x,y,w,h，相对截图，按 y 排序）", default: DEFAULT_TARGETS },
    { type: "textarea", key: "labels", label: "标注（每行 主行|副行，与目标一一对应）", default: DEFAULT_LABELS },
  ],
};
