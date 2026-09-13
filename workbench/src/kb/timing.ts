// kb 适配层 · timing：词级时间戳（promo 工程 timing.ts 导出 timing/atChar/cleanText；
// skill 正式工程只有 timing.json，没有 .ts → 文件级回退到 stub 的空表）。
import * as real from "@kbsrc/timing";
import * as stub from "../../kbsrc-stub/timing";
import { fnOr } from "./pick";

export type CharStamp = stub.CharStamp;
export type TimingScene = stub.TimingScene;

const rt = real.timing as { totalSec?: unknown; scenes?: unknown } | undefined;
export const timing: { totalSec: number; scenes: TimingScene[] } =
  rt && Array.isArray(rt.scenes)
    ? { totalSec: typeof rt.totalSec === "number" ? rt.totalSec : stub.timing.totalSec, scenes: rt.scenes as TimingScene[] }
    : stub.timing;
export const atChar: (sceneIndex: number, query: string, occurrence?: number) => number = fnOr(real.atChar, stub.atChar);
export const cleanText: (s: string) => string = fnOr(real.cleanText, stub.cleanText);
