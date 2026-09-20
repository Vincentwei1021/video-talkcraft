import { create } from "zustand";
import { singleton } from "../hmr";

/** kb-main（实时成片卡）的载入状态。
 *  - 载入失败**不缓存**：`retry()` 让 kb-main 重建 lazy 组件再试（页面打开时工程就是坏的、修好后也能恢复）；
 *    触发点在 pipeline/store：Vite `vite:afterUpdate`，以及 SSE 推来工程文件变化（首次转换失败的模块 Vite 不会向导入方传播更新）。
 *  - `error` 与右下角 CodeErrorToast 同一条提示（pipeline/store 订阅这里）。
 *  独立小 store，不进 pipeline store——避免 cards → pipeline/store → store → registry → cards 的模块环。 */
interface LiveLoad {
  gen: number;
  error: { message: string; file?: string } | null;
  retry: () => void;
  setError: (e: LiveLoad["error"]) => void;
}

export const useLiveLoad = singleton("liveLoad", () => create<LiveLoad>((set) => ({
  gen: 0,
  error: null,
  retry: () => set((s) => ({ gen: s.gen + 1 })),
  setError: (error) => set({ error }),
})));
