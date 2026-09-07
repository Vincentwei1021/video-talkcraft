import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/video-theme-frame";

// video-theme-frame · 单视频主题边框 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 暴露 frame（八式单选 / tour 巡演）、视频 src、装饰文字 label / sub、hold（句长）；落位 / 装饰接力 / 极缓推 / 退场的节拍命门在模板 CONFIG 里固定不暴露。
// 默认 frame=browser-retro + hold 6s → (6 + 0.35 + 0.1) × 30 = 194 帧；tour 巡演 540 帧（在时间轨上拉长 clip 即可看全）。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props { frame?: string; src?: string; label?: string; sub?: string; hold?: number }

const VideoThemeFrame: React.FC<Props> = ({ frame = "browser-retro", src = "", label = "", sub = "", hold = 6 }) =>
  <T frame={frame} src={src || undefined} label={label || undefined} sub={sub || undefined} hold={hold} />;

export const card: CardDef = {
  id: "video-theme-frame",
  name: "单视频主题边框",
  category: "素材呈现",
  durationInFrames: 194,
  accent: "#8a8a8a",
  component: VideoThemeFrame as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "select", key: "frame", label: "边框式", default: "browser-retro", options: [
      { value: "browser-retro", label: "复古浏览器（Mac OS 9 窗口）" },
      { value: "magazine", label: "杂志相框（图注 + 页码）" },
      { value: "film", label: "35mm 胶片（齿孔）" },
      { value: "polaroid", label: "拍立得" },
      { value: "blueprint", label: "工程图纸（角标 + 尺寸线）" },
      { value: "laptop", label: "笔记本设备框" },
      { value: "stamp", label: "邮票齿边" },
      { value: "hairline", label: "双发丝线 + 四角短标" },
      { value: "tour", label: "巡演八式（demo）" },
    ] },
    { type: "text", key: "src", label: "视频 URL（空 = 灰阶占位）", default: "" },
    { type: "text", key: "label", label: "装饰文字 1（窗口标题 / 图注 / 片号 / 尺寸；空 = 该式默认）", default: "" },
    { type: "text", key: "sub", label: "装饰文字 2（地址栏 / 页码 / 胶片型号 / 比例；空 = 该式默认）", default: "" },
    { type: "number", key: "hold", label: "停留（退场起点 = 句长）", default: 6, min: 1, max: 60, step: 0.5, unit: "s" },
  ],
};
