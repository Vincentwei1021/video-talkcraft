// kb 适配层 · sfx：音效 cue 表。promo 导出 SFX_CUES；skill 正式工程导出 CUES（多 rate/trim/note 字段）。
import * as real from "@kbsrc/sfx";
import * as stub from "../../kbsrc-stub/sfx";
import { arrOr, numOr } from "./pick";

export type SfxCue = stub.SfxCue;

const raw = arrOr<Record<string, unknown>>(real.SFX_CUES ?? real.CUES ?? real.cues, []);
export const SFX_CUES: SfxCue[] = raw.length
  ? raw
      .map((c) => ({
        t: numOr(c.t, NaN),
        file: String(c.file ?? c.name ?? ""),
        vol: numOr(c.vol ?? c.volume, 1),
        dur: typeof c.dur === "number" ? c.dur : undefined,
      }))
      .filter((c) => Number.isFinite(c.t) && c.file)
  : stub.SFX_CUES;
