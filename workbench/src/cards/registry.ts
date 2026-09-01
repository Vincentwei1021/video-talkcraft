import type { CardDef } from "./types";
import { textBasicCard } from "./text-basic";
import { impactOpenTitleCard } from "./impact-open-title";
import { countBadgeTitleCard } from "./count-badge-title";
import { highlighterSweepCard } from "./highlighter-sweep";
import { chapterTitleCardCard } from "./chapter-title-card";
import { kouboPromoCard } from "./koubo-promo";
import {
  audioClipCard,
  kouboEnvironmentCard,
  kouboHostCard,
  kouboShotCard,
  kouboSubtitleLineCard,
  kouboSubtitlesCard,
  kouboWipeCard,
} from "./koubo-units";
import { imageClipCard, videoClipCard } from "./media-cards";
import { ambientSweepCard, ambientVignetteCard } from "./ambient-cards";
import { TEMPLATE_CARDS } from "./templateCards";

/** 批量参数化产物（src/cards/gen/*.tsx，各文件 export const card）自动收集；
 *  同 id 优先级：手写核心卡 > gen 参数化卡 > 模板原卡 */
const genModules = import.meta.glob("./gen/*.tsx", { eager: true }) as Record<
  string,
  { card?: CardDef }
>;
const GEN_CARDS: CardDef[] = Object.values(genModules).flatMap((m) =>
  m.card ? [m.card] : [],
);

/** 参数化卡（优先）+ 全量模板卡（同 id 时参数化版胜出）。
 *  模板卡参数化模式：CONFIG 中"语境/文案/颜色"级参数提为 props + schema，
 *  节奏命门保持 FIXED。 */
const CORE_CARDS: CardDef[] = [
  textBasicCard,
  impactOpenTitleCard,
  countBadgeTitleCard,
  highlighterSweepCard,
  chapterTitleCardCard,
  kouboPromoCard,
  kouboShotCard,
  kouboHostCard,
  kouboSubtitleLineCard,
  kouboSubtitlesCard,
  kouboEnvironmentCard,
  kouboWipeCard,
  audioClipCard,
  videoClipCard,
  imageClipCard,
  ambientVignetteCard,
  ambientSweepCard,
];

const coreIds = new Set(CORE_CARDS.map((c) => c.id));
const genFiltered = GEN_CARDS.filter((c) => !coreIds.has(c.id));
const paramIds = new Set([...coreIds, ...genFiltered.map((c) => c.id)]);
export const CARD_LIST: CardDef[] = [
  ...CORE_CARDS,
  ...genFiltered,
  ...TEMPLATE_CARDS.filter((c) => !paramIds.has(c.id)),
];

export const CARDS: Record<string, CardDef> = Object.fromEntries(
  CARD_LIST.map((c) => [c.id, c]),
);
