// stub：字幕层。promo / skill 正式工程都导出 Subtitles；skill 标准工程另导出 phrases()（可见字幕段）与 SubtitleLine（单句静态渲染）
import type React from "react";
export const Subtitles: React.FC = () => null;
export type SubPhrase = { text: string; start: number; end: number; dark: boolean };
export const phrases = (): SubPhrase[] => [];
export const SubtitleLine: React.FC<{ text: string; dark?: boolean }> = () => null;
