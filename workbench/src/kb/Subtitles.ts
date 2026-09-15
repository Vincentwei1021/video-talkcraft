// kb 适配层 · Subtitles：字幕层。promo / skill 正式工程都导出 Subtitles（后者 props 全可选，空调用可渲）。
import type React from "react";
import * as real from "@kbsrc/Subtitles";
import * as stub from "../../kbsrc-stub/Subtitles";
import { compOr, fnOr } from "./pick";

export const Subtitles: React.FC<Record<string, unknown>> = compOr(real.Subtitles, stub.Subtitles);
export type SubPhrase = stub.SubPhrase;
/** skill 标准工程：可见字幕段（已扣静音区间、已做显示映射）；promo 工程无此导出 → 空表（拆解走 koubo-units 的 kouboPhrases） */
export const phrases: () => SubPhrase[] = fnOr(real.phrases, stub.phrases);
/** skill 标准工程：单句静态字幕渲染（与成片 Subtitles 同一份样式） */
export const SubtitleLine: React.FC<{ text: string; dark?: boolean }> = compOr(real.SubtitleLine, stub.SubtitleLine);
