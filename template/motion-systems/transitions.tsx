import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CamKey} from './camera';

/**
 * 运动承接转场（cinematography.md §3 的代码实现）。
 *
 * 机制回顾：相邻 Sequence 以 lead/tail 重叠 12–16 帧；ShotFade 只做像素淡化，
 * 运动由两侧相机曲线**同向承接**。本文件提供三类件：
 *   1. ShotFade —— 交叠期的透明度包络（含黑震切的 hardOut）
 *   2. cam 路径预设 —— 生成出场/入场侧的 CamKey 片段，spread 进 shots.ts 的 path
 *   3. 叠加层 —— Overexpose（过曝翻页亮心）、Shatter + ParticleDrift（粒子溶接）
 *
 * 六式对照表（出场侧 + 入场侧 + 叠加层）：
 * | 转场      | 出场 shot                        | 入场 shot                         | 叠加 |
 * |-----------|----------------------------------|-----------------------------------|------|
 * | 推穿      | ...pushThroughOut(tEnd)          | ...settleIn(leadSec)              | —    |
 * | 过曝翻页  | ...blowoutOut(tEnd)              | ...settleIn(leadSec,{from:1.3})   | Overexpose（或 env.tsx TRANSITION_FLASHES 表） |
 * | whip-pan  | ...whipOut(tEnd,{dir:'left'})    | ...whipIn(leadSec,{dir:'left'})   | 可配金色 Overexpose |
 * | 黑震切    | 相机定格（不加键）+ hardOut       | lead:0，开场自带运动               | 全片只许一次 |
 * | 后拉冷却  | 内容沉入近黑（场景内做）          | ...pullBackIn(leadSec)            | 色温在 env ACTS 表转变 |
 * | 粒子溶接  | <Shatter> 主体 + <ParticleDrift> | 入场侧同 seed 再放一次 ParticleDrift | —  |
 */

/* ────────────────────────── 1. ShotFade ────────────────────────── */

/**
 * 交叠期像素淡化。出场 shot 的 tail 淡出时，入场 shot 的 lead 正在底下升起；
 * hardOut = 黑震切：最后 1 帧直接 opacity 0（闪光定格由场景自己画）。
 */
export const ShotFade: React.FC<{
  lead: number;
  tail: number;
  narrationFrames: number;
  hardOut?: boolean;
  children: React.ReactNode;
}> = ({lead, tail, narrationFrames, hardOut, children}) => {
  const frame = useCurrentFrame();
  const total = lead + narrationFrames + tail;

  let opacity = 1;
  if (lead > 0) {
    opacity = interpolate(frame, [0, lead], [0, 1], {
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.quad),
    });
  }
  if (hardOut) {
    opacity *= frame >= total - 1 ? 0 : 1;
  } else if (tail > 0) {
    opacity *= interpolate(frame, [total - tail, total], [1, 0], {
      extrapolateLeft: 'clamp',
      easing: Easing.inOut(Easing.quad),
    });
  }

  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

/* ─────────────────── 2. 相机路径预设（CamKey 片段） ─────────────────── */
/*
 * 全部返回 CamKey[]，直接 spread 进 shot 的 path：
 *   path: [...settleIn(0.47), {t: 9, scale: 1.0}, ...whipOut(18.4, {dir: 'left'})]
 * t 均为 shot-local 秒；入场片段用负 t（落在 lead 里）。
 */

/**
 * 两条 spread 进 shots.ts 时的排序纪律（2026-08-27 实修）：
 *
 * 1. **手写键必须早于生成键的起点**。所有出场式的 t 都从 `tEnd` 反推
 *    （`pushThroughOut` 是 `tEnd−dur`、`whipOut` 是 `tEnd−dur` …），
 *    手写键晚于它就让 path 非单调，Remotion 直接抛
 *    `inputRange must be strictly monotonically increasing`。
 * 2. **镜头本来就在横移时，`whipOut` 必须传 `fromX`**。本式默认从 x=0 起甩，
 *    如果 path 里已有 x 键（例如横移跟随长页到 −56），x 会先弹回 0 再甩出去——
 *    **方向断裂比硬切更糟**，正撞六式「两侧必须同向」。传入当前 x 后在它基础上继续同向加速。
 */
type Dir = 'left' | 'right';
const sign = (d: Dir) => (d === 'left' ? -1 : 1);

/** 推穿·出场：结尾 dur 秒相机加速推 + blur 升。 */
export const pushThroughOut = (
  tEnd: number,
  o: {from?: number; to?: number; blur?: number; dur?: number} = {},
): CamKey[] => {
  const {from = 1.06, to = 1.2, blur = 7, dur = 0.5} = o;
  return [
    {t: tEnd - dur, scale: from, blur: 0},
    {t: tEnd, scale: to, blur},
  ];
};

/** 过曝翻页·出场：推向证据物直至占满画面，配 Overexpose 或 env 闪光表。 */
export const blowoutOut = (
  tEnd: number,
  o: {from?: number; to?: number; blur?: number; dur?: number} = {},
): CamKey[] => pushThroughOut(tEnd, {to: 1.5, blur: 4, dur: 0.9, ...o});

/** 推穿/过曝·入场：从模糊高 scale 起步，同向沉降到工作景别。 */
export const settleIn = (
  leadSec: number,
  o: {from?: number; to?: number; blur?: number; settle?: number} = {},
): CamKey[] => {
  const {from = 1.14, to = 1.04, blur = 6, settle = 0.5} = o;
  return [
    {t: -leadSec, scale: from, blur},
    {t: settle, scale: to, blur: 0},
  ];
};

/** whip-pan·出场：x 甩出 + blur 8 + 微旋。 */
export const whipOut = (
  tEnd: number,
  o: {dir?: Dir; dist?: number; blur?: number; dur?: number; rot?: number; fromX?: number} = {},
): CamKey[] => {
  const {dir = 'left', dist = 420, blur = 8, dur = 0.48, rot = 1.4, fromX = 0} = o;
  return [
    {t: tEnd - dur, x: fromX, blur: 0, rot: 0},
    {t: tEnd, x: fromX + sign(dir) * dist, blur, rot: sign(dir) * -rot},
  ];
};

/** whip-pan·入场：同向进入，brake 秒刹住 + 回稳（0.35s 是验证过的手感）。 */
export const whipIn = (
  leadSec: number,
  o: {dir?: Dir; dist?: number; blur?: number; brake?: number; rot?: number} = {},
): CamKey[] => {
  const {dir = 'left', dist = 430, blur = 7, brake = 0.35, rot = 1.2} = o;
  // 出场往 left 甩（x→负），入场内容从对侧偏移滑回 0，视觉上是同一次向左的横扫。
  return [
    {t: -leadSec, x: -sign(dir) * dist, blur, rot: -sign(dir) * rot, scale: 1.1},
    {t: brake, x: 0, blur: 0, rot: -sign(dir) * rot * 0.3, scale: 1.02},
    {t: brake + 0.65, x: 0, rot: 0, scale: 1.0},
  ];
};

/** 后拉冷却·入场：全片唯一 scale<1 起步，缓慢回到 1 附近（rack focus 感）。 */
export const pullBackIn = (
  leadSec: number,
  o: {from?: number; to?: number; blur?: number; settle?: number} = {},
): CamKey[] => {
  const {from = 0.94, to = 0.99, blur = 4, settle = 0.9} = o;
  return [
    {t: -leadSec, scale: from, blur},
    {t: settle, scale: to, blur: 0},
  ];
};

/* ──────────────────────── 3. 叠加层组件 ──────────────────────── */

/**
 * 过曝翻页的白色径向亮心。不对称包络：切点前 riseF 帧升、后 fallF 帧降。
 * `at` 为 shot-local 秒（出场侧 = 叙事末尾；入场侧 = 负值，落在 lead 里）。
 * 若工程用了 env.tsx，优先把闪光写进 TRANSITION_FLASHES 表（全局一处管理）。
 */
export const Overexpose: React.FC<{
  at: number;
  color?: string; // 'r, g, b'
  peak?: number;
  riseF?: number;
  fallF?: number;
}> = ({at, color = '255, 250, 240', peak = 0.55, riseF = 10, fallF = 10}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const df = frame - Math.round(at * fps);
  if (df < -riseF || df > fallF) return null;
  const a =
    df <= 0
      ? interpolate(df, [-riseF, 0], [0, 1], {easing: Easing.in(Easing.quad)})
      : interpolate(df, [0, fallF], [1, 0], {easing: Easing.out(Easing.quad)});
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 46%, rgba(${color}, ${a * peak}) 0%, rgba(${color}, ${a * peak * 0.35}) 40%, transparent 75%)`,
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};

/** 粒子溶接·主体侧：at 秒起主体轻升 + 模糊 + 淡出（碎解的"壳"）。 */
export const Shatter: React.FC<{
  at: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({at, dur = 0.6, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame / fps, [at, at + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  return (
    <div
      style={{
        opacity: 1 - p,
        transform: `translateY(${-14 * p}px) scale(${1 + 0.03 * p})`,
        filter: p > 0.02 ? `blur(${p * 3}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * 粒子溶接·粒子侧：从 box 区域（px，屏幕坐标）确定性生成 count 颗粒子，
 * at 秒起错峰浮起、横向微漂、先亮后灭。
 * 物质连续性做法：出场 shot 在主体位置放一次；入场 shot 在 lead 里用**同一个 seed**
 * 再放一次（at 取负值），交叠 12–16 帧里观众读到的就是"同一批粒子"。
 */
export const ParticleDrift: React.FC<{
  at: number;
  dur?: number;
  seed?: number;
  count?: number;
  color?: string;
  box: {x: number; y: number; w: number; h: number};
  rise?: number;
}> = ({at, dur = 1.4, seed = 7, count = 36, color = '#FFC94D', box, rise = 180}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = frame / fps;
  if (sec < at || sec > at + dur) return null;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: count}, (_, i) => {
        const s = seed * 1000 + i;
        const delay = rand(s) * dur * 0.35;
        const p = interpolate(sec, [at + delay, at + delay + dur * 0.65], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.quad),
        });
        if (p <= 0) return null;
        const x0 = box.x + rand(s + 1) * box.w;
        const y0 = box.y + rand(s + 2) * box.h;
        const sway = Math.sin(sec * (1.8 + rand(s + 3)) + s) * 14;
        const size = 2.5 + rand(s + 4) * 4.5;
        const fade = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x0 + sway,
              top: y0 - rise * p,
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
              opacity: fade * (0.5 + rand(s + 5) * 0.5),
              boxShadow: `0 0 ${6 + size}px ${color}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
