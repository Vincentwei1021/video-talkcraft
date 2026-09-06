import React from "react";
import type { CardDef } from "../types";
import Tpl from "@tpl/video-player-frame";

// video-player-frame · 单视频播放器框 —— 参数化版：直接包模板正主（tplcards → template/cards），
// 只暴露视频 src / 标题 chip / 来源 pill / 起点秒 / 外观变体；节奏命门（框 0.5s 落位、条晚 0.15s、playAt 0.5、
// 进度 = 真实播放、退场条先框后）与 clipSec 在模板 CONFIG 里固定不暴露。8.15s + 收尾 = 246 帧。
const T = Tpl as unknown as React.ComponentType<Record<string, unknown>>;

interface Props {
  src?: string; title?: string; source?: string; startFrom?: number; chrome?: string;
}

const VideoPlayerFrame: React.FC<Props> = ({
  src = "", title = "录屏 · 案例 01", source = "SOURCE · MIXKIT", startFrom = 0, chrome = "player",
}) => <T src={src || undefined} title={title} source={source} startFrom={startFrom} chrome={chrome} />;

export const card: CardDef = {
  id: "video-player-frame",
  name: "单视频播放器框",
  category: "素材呈现",
  durationInFrames: 246,
  accent: "#8a8a8a",
  component: VideoPlayerFrame as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "src", label: "视频 URL（空 = 灰阶占位）", default: "" },
    { type: "text", key: "title", label: "标题 chip", default: "录屏 · 案例 01" },
    { type: "text", key: "source", label: "来源 pill", default: "SOURCE · MIXKIT" },
    { type: "number", key: "startFrom", label: "视频起点", default: 0, min: 0, max: 3600, step: 0.5, unit: "s" },
    { type: "select", key: "chrome", label: "外观", default: "player", options: [
      { value: "player", label: "播放器（chip + pill + 播放条）" },
      { value: "browser", label: "浏览器（三点 + 地址栏，网页录屏）" },
    ] },
  ],
};
