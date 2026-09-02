// stub：空词级时间戳（真实数据来自口播成片工程）
export type CharStamp = { ch: string; t: number; e: number };
export type TimingScene = { id: string; text: string; startSec: number; durationSec: number; chars: CharStamp[] };
export const timing: { totalSec: number; scenes: TimingScene[] } = { totalSec: 184.8, scenes: [] };
export const atChar = (_si: number, _q: string, _occ = 0) => 0;
export const cleanText = (s: string) => s;
