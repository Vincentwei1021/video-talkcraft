import type { CardDef } from "./types";
import { textBasicCard } from "./text-basic";
import { impactOpenTitleCard } from "./impact-open-title";
import { countBadgeTitleCard } from "./count-badge-title";
import { highlighterSweepCard } from "./highlighter-sweep";
import { chapterTitleCardCard } from "./chapter-title-card";

/** 已参数化接入工作台的卡。template/cards/ 其余卡按同一模式渐进接入：
 *  CONFIG 中"语境/文案/颜色"级参数提为 props + schema，节奏命门保持 FIXED。 */
export const CARD_LIST: CardDef[] = [
  textBasicCard,
  impactOpenTitleCard,
  countBadgeTitleCard,
  highlighterSweepCard,
  chapterTitleCardCard,
];

export const CARDS: Record<string, CardDef> = Object.fromEntries(
  CARD_LIST.map((c) => [c.id, c]),
);
