// kb 适配层 · theme：设计 token。接入工程缺的键用 stub 补齐（C.hairline 之类被卡直接引用）。
import * as real from "@kbsrc/theme";
import * as stub from "../../kbsrc-stub/theme";
import { objOr } from "./pick";

type Tokens = Record<string, string>;
export const C = { ...stub.C, ...objOr<Tokens>(real.C, {}) } as typeof stub.C & Tokens;
export const FONT = { ...stub.FONT, ...objOr<Tokens>(real.FONT, {}) } as typeof stub.FONT & Tokens;
export const RADII = { ...stub.RADII, ...objOr<Record<string, number>>(real.RADII, {}) } as typeof stub.RADII &
  Record<string, number>;
export const SHADOW_EVIDENCE: string =
  typeof real.SHADOW_EVIDENCE === "string" ? real.SHADOW_EVIDENCE : stub.SHADOW_EVIDENCE;
export const cardStyle = objOr(real.cardStyle, stub.cardStyle);
