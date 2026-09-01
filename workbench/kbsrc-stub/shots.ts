// stub：23 个占位镜头（保证 kscene 卡与导入器可构建；真实数据来自口播成片工程）
export const FPS = 30;
export type Shot = { id: string; slug: string; label: string; start: number; end: number; dark?: boolean; path: unknown[]; impulses?: unknown[] };
export const SHOTS: Shot[] = Array.from({ length: 23 }, (_, i) => ({
  id: `s${String(i + 1).padStart(2, "0")}`,
  slug: "stub",
  label: `s${String(i + 1).padStart(2, "0")}（需链接口播成片工程）`,
  start: i * 8,
  end: i * 8 + 7.5,
  dark: false,
  path: [],
}));
export const TOTAL_FRAMES = Math.ceil(184.8 * FPS);
export const darkAt = (_sec: number) => false;
