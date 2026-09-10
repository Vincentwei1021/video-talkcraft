/** kb 适配层公用：接入工程的导出可能缺、可能改名、可能形态不同——按类型挑，挑不到用 stub。 */
export const fnOr = <F,>(v: unknown, fallback: F): F => (typeof v === "function" ? (v as F) : fallback);
export const numOr = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
export const objOr = <T extends object>(v: unknown, fallback: T): T =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as T) : fallback;
export const arrOr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
