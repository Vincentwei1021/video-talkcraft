// kb 适配层 · shots：接入工程的分镜表 → 工作台统一形态。
// promo 工程：{id, slug, label, start, end, dark, path, impulses} + darkAt；
// skill 正式工程（MainVideo-example / test04）：{id, start, end, lead, tail, onDark, path…}，无 label / darkAt。
// 直接 `import { darkAt } from "@kbsrc/shots"` 在缺导出时是 ESM 链接期 SyntaxError（整页挂），所以走命名空间 + 兜底。
import * as real from "@kbsrc/shots";
import * as stub from "../../kbsrc-stub/shots";
import { arrOr, fnOr, numOr } from "./pick";

export type Shot = stub.Shot;

export const FPS: number = numOr(real.FPS, stub.FPS);

const rawShots = arrOr<Record<string, unknown>>(real.SHOTS, []);
export const SHOTS: Shot[] = (rawShots.length ? rawShots : (stub.SHOTS as unknown as Record<string, unknown>[])).map(
  (s) => ({
    ...(s as object),
    id: String(s.id ?? ""),
    slug: String(s.slug ?? s.id ?? ""),
    label: String(s.label ?? s.title ?? s.intent ?? s.slug ?? s.id ?? ""),
    start: numOr(s.start, 0),
    end: numOr(s.end, 0),
    dark: Boolean(s.dark ?? s.onDark ?? false),
    path: arrOr<unknown>(s.path, []),
    impulses: arrOr<unknown>(s.impulses, []),
  }),
);

export const TOTAL_FRAMES: number = numOr(
  real.TOTAL_FRAMES,
  SHOTS.length ? Math.ceil(SHOTS[SHOTS.length - 1].end * FPS) : stub.TOTAL_FRAMES,
);

/** 该绝对秒是否落在深底镜头里（promo 工程自带；其余按 dark/onDark 标记推） */
export const darkAt: (sec: number) => boolean = fnOr(
  real.darkAt,
  (sec: number) => SHOTS.some((s) => s.dark && sec >= s.start && sec < s.end),
);
