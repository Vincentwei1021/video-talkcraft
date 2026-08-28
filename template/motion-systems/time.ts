import {useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * 时间基收敛件（cinematography §6 "lead 补偿收敛一处"的现成实现，
 * 由 deepseek-harness-v2 实战验证：场景里统一走这两个 helper 后全程零踩坑）。
 *
 * 全工程存在三种时间基，别混：
 *  - 绝对秒 abs —— SHOTBOOK / timestamps.json 的真相源。
 *    镜头 ≠ 句子（一个镜头聚合多句）时，锚点一律写绝对秒字面量；
 *    timing.ts 的 tSay 是句级 scene-local，只在单句镜头里用。
 *  - shot-local 叙事秒 —— CameraRig / WorldRig 的 path/stops 用（内部自带 leadFrames 补偿）。
 *  - Sequence-local 秒 —— Live / Defocus / ParticleDrift / Overexpose 等模板件
 *    直接吃 useCurrentFrame()/fps，**含 lead**。
 *
 * 场景组件里的用法：一切时序判断用 `const abs = useAbs(shot)`；
 * 给吃 Sequence-local 的模板件传参时用 `const tl = useToLocal(shot); tl(绝对秒)`。
 */
export type ShotTiming = {startSec: number; lead: number};

/** 当前帧的绝对叙事秒（abs = startSec 即该镜头叙事开口）。 */
export const useAbs = (shot: ShotTiming): number => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (frame - shot.lead) / fps + shot.startSec;
};

/** 绝对秒 → Sequence-local 秒（Live retireAt / Defocus at / ParticleDrift at 等用）。 */
export const useToLocal = (shot: ShotTiming): ((abs: number) => number) => {
  const {fps} = useVideoConfig();
  return (abs: number) => abs - shot.startSec + shot.lead / fps;
};
