import type React from "react";

/** 属性面板控件描述——卡片用它声明自己有哪些可调属性 */
export type PropField =
  | { type: "text"; key: string; label: string; default: string }
  | { type: "textarea"; key: string; label: string; default: string }
  | {
      type: "number";
      key: string;
      label: string;
      default: number;
      min?: number;
      max?: number;
      step?: number;
      /** 展示单位，如 "s" / "px" */
      unit?: string;
    }
  | {
      type: "slider";
      key: string;
      label: string;
      default: number;
      min: number;
      max: number;
      step: number;
      unit?: string;
    }
  | { type: "color"; key: string; label: string; default: string }
  | {
      type: "select";
      key: string;
      label: string;
      default: string;
      options: { value: string; label: string }[];
    }
  | { type: "boolean"; key: string; label: string; default: boolean };

export interface CardDef {
  id: string;
  /** 中文名（面板展示） */
  name: string;
  category: string;
  /** "audio"/"video"：媒体卡——不包 TimeRemap（Freeze 会掐死原生播放），
   *  裁入/变速经 props 传入，由卡内 trimBefore/playbackRate 实现；
   *  video 保留图层包裹（透明度/缩放/位移），audio 无视觉 */
  kind?: "visual" | "audio" | "video";
  /** 卡片原始时长（帧，30fps）——新 clip 的默认时长 */
  durationInFrames: number;
  component: React.ComponentType<Record<string, unknown>>;
  schema: PropField[];
  /** 素材库色签 */
  accent?: string;
}

export const defaultsOf = (card: CardDef): Record<string, unknown> =>
  Object.fromEntries(card.schema.map((f) => [f.key, f.default]));
