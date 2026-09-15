// kb 适配层 · shots：接入工程的分镜表 → 工作台统一形态。
// promo 工程：{id, slug, label, start, end, dark, path, impulses} + darkAt；
// skill 正式工程（test04）：{id, start, end, lead, tail, onDark, path…}，无 label / darkAt；
// 仓库模板 MainVideo-example（template/motion-systems/shots.ts）：{id, startSec, durationSec, lead, tail}，不导出 FPS / TOTAL_FRAMES。
// 三种都归一到 start / end（绝对秒）；FPS 缺导出时取 Root.tsx 字面量（KB_COMP），再退 stub。
// 直接 `import { darkAt } from "@kbsrc/shots"` 在缺导出时是 ESM 链接期 SyntaxError（整页挂），所以走命名空间 + 兜底。
import * as real from "@kbsrc/shots";
import * as stub from "../../kbsrc-stub/shots";
import { KB_COMP } from "../kbMeta";
import { arrOr, fnOr, numOr } from "./pick";

export type Shot = stub.Shot & { lead?: number; tail?: number; hardOut?: boolean };

export const FPS: number = numOr(real.FPS, numOr(KB_COMP.fps, stub.FPS));

const rawShots = arrOr<Record<string, unknown>>(real.SHOTS, []);
export const SHOTS: Shot[] = (rawShots.length ? rawShots : (stub.SHOTS as unknown as Record<string, unknown>[])).map(
  (s) => {
    const start = numOr(s.start, numOr(s.startSec, 0));
    const end = numOr(s.end, start + numOr(s.durationSec, 0));
    return {
      ...(s as object),
      id: String(s.id ?? ""),
      slug: String(s.slug ?? s.id ?? ""),
      label: String(s.label ?? s.title ?? s.intent ?? s.slug ?? s.id ?? ""),
      start,
      end,
      dark: Boolean(s.dark ?? s.onDark ?? false),
      path: arrOr<unknown>(s.path, []),
      impulses: arrOr<unknown>(s.impulses, []),
      // skill 标准工程：交叠帧数与黑震切标记（promo 工程没有 → undefined，导入器用固定 OVERLAP）
      lead: typeof s.lead === "number" ? s.lead : undefined,
      tail: typeof s.tail === "number" ? s.tail : undefined,
      hardOut: typeof s.hardOut === "boolean" ? s.hardOut : undefined,
    };
  },
);

export const TOTAL_FRAMES: number = numOr(
  real.TOTAL_FRAMES,
  SHOTS.length ? Math.ceil(Math.max(...SHOTS.map((s) => s.end)) * FPS) : stub.TOTAL_FRAMES,
);

/** 该绝对秒是否落在深底镜头里（promo 工程自带；其余按 dark/onDark 标记推） */
export const darkAt: (sec: number) => boolean = fnOr(
  real.darkAt,
  (sec: number) => SHOTS.some((s) => s.dark && sec >= s.start && sec < s.end),
);
