import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/gallery-wall-dolly";

// gallery-wall-dolly · 照片墙推轨 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露图注 / 图；运镜命门（全景 z .61 / 停靠 z 1.15、移 1.0 停 0.9、拉回 1.2）在模板 CONFIG 里固定不暴露。8.2s + 0.4s = 258 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  label1?: string; label2?: string; label3?: string;
  src1?: string; src2?: string; src3?: string;
}

const GalleryWallDolly: React.FC<Props> = ({
  label1 = "案例一 · 品牌官网", label2 = "案例二 · 电商小程序", label3 = "案例三 · 数据看板",
  src1 = "", src2 = "", src3 = "",
}) => <T labels={[label1, label2, label3]} srcs={[src1, src2, src3].map((s) => s || undefined)} />;

export const card: CardDef = {
  id: "gallery-wall-dolly",
  name: "照片墙推轨",
  category: "素材呈现",
  durationInFrames: 258,
  accent: "#8a8a8a",
  component: GalleryWallDolly as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "label1", label: "图注 1（压图标签）", default: "案例一 · 品牌官网" },
    { type: "text", key: "label2", label: "图注 2", default: "案例二 · 电商小程序" },
    { type: "text", key: "label3", label: "图注 3", default: "案例三 · 数据看板" },
    { type: "text", key: "src1", label: "图 1 URL（空 = 占位）", default: "" },
    { type: "text", key: "src2", label: "图 2 URL（空 = 占位）", default: "" },
    { type: "text", key: "src3", label: "图 3 URL（空 = 占位）", default: "" },
  ],
};
