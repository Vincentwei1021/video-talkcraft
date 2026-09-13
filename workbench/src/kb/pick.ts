/** kb 适配层公用：接入工程的导出可能缺、可能改名、可能形态不同——按类型挑，挑不到用 stub。 */
export const fnOr = <F,>(v: unknown, fallback: F): F => (typeof v === "function" ? (v as F) : fallback);
/** React 组件：函数 / class 组件，或 React.memo / forwardRef / lazy 返回的元素类型对象（带 $$typeof）。
 *  组件不能用 fnOr 判——memo 包装的合法组件会被当成缺失、静默换成 stub（2026-09-13 审计 R7）。 */
export const compOr = <F,>(v: unknown, fallback: F): F =>
  typeof v === "function" || (v !== null && typeof v === "object" && "$$typeof" in (v as object)) ? (v as F) : fallback;
export const numOr = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
export const objOr = <T extends object>(v: unknown, fallback: T): T =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as T) : fallback;
export const arrOr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
