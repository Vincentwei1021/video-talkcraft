import type React from "react";
import type { CardDef } from "./types";
import { TPL_META } from "./tplMeta";

/** 全量模板卡：workbench/tplcards → template/cards 符号链接，Vite glob 一次接入。
 *  这些卡未参数化（schema 空），但可正常上轨播放/裁剪/变速；
 *  参数化版本（registry 靠前注册的同 id 卡）优先生效。 */
const modules = import.meta.glob("../../tplcards/*.tsx", { eager: true }) as Record<
  string,
  {
    default?: React.ComponentType<Record<string, unknown>>;
    meta?: { durationInFrames?: number };
  }
>;

export const TEMPLATE_CARDS: CardDef[] = Object.entries(modules)
  .flatMap(([path, mod]) => {
    const id = path.split("/").pop()!.replace(/\.tsx$/, "");
    if (!mod.default) return [];
    const meta = TPL_META[id];
    const card: CardDef = {
      id,
      name: meta?.name ?? id,
      category: meta?.category ?? "动效卡库",
      durationInFrames: Math.max(1, Math.round(mod.meta?.durationInFrames ?? 90)),
      component: mod.default,
      schema: [],
      accent: "#5e5ce6",
    };
    return [card];
  });

/** 卡片预览视频/封面约定路径（gallery 资产符号链接进 public） */
export const cardPreviewUrl = (id: string) =>
  TPL_META[id] ? `/cardpreviews/${id}.mp4` : null;
export const cardThumbUrl = (id: string) =>
  TPL_META[id] ? `/cardthumbs/${id}.png` : null;
