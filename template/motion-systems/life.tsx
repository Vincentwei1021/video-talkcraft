import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * L3/L4 lifecycle. A subject visibly yields the stage when the next subject
 * takes over (interaction pattern 12). Since 2026-09-04 (运动做减法) the
 * `resolved` phase is static by default: `idle` is opt-in (`idle={true}`), the
 * frame is kept alive by the scene camera's slow push/pull instead.
 */
/** 'demoting' = 降权留守中（旧名 'retiring'，语义未变：元素仍占槽）。 */
export type Phase = 'hidden' | 'forming' | 'resolved' | 'demoting' | 'gone';

export const phaseOf = (
  sec: number,
  revealSec: number,
  formSec: number,
  demoteSec?: number,
  demoteDur = 0.45,
): Phase => {
  if (sec < revealSec) return 'hidden';
  if (sec < revealSec + formSec) return 'forming';
  if (demoteSec === undefined || sec < demoteSec) return 'resolved';
  if (sec < demoteSec + demoteDur) return 'demoting';
  return 'gone';
};

/** Deterministic idle wobble. Same seed + frame always gives the same value. */
export const idle = (seed: number, frame: number, fps: number) => {
  const t = frame / fps;
  const p1 = Math.sin(t * 1.15 + seed * 1.7);
  const p2 = Math.sin(t * 0.73 + seed * 3.1);
  return {
    scale: 1 + p1 * 0.005,
    y: p2 * 3,
    glow: 0.85 + (p1 * 0.5 + 0.5) * 0.3,
  };
};

/**
 * Keeps a resolved element alive and hands the stage over on cue. `demoteAt`
 * is the shot-local second at which a newer subject claims focus.
 *
 * 语义是**降权留守**（demote），不是退场：0.5s 内缩 0.92 + 上移 26px + 透明度 0.34 + 模糊 3.2px，
 * 元素**留在原位、继续占着它的槽**——同屏预算照算（cinematography §4.5 第 3 条），新主体不能摆进它的位置。
 * 2026-09-06 改名：旧名 `retireAt` 读起来像"退场"，制作者据此把结论行放进对句还占着的槽 → P0 文字相撞。
 * `retireAt` / `retireDur` 仍接受（deprecated 别名），两者都给时以 `demoteAt` / `demoteDur` 为准。
 * 要真退场用场景自己的出场动画（0.15–0.5s 后从版面消失，shot-design.md「让位」三选）。
 */
export const Live: React.FC<{
  seed: number;
  /** shot-local second the element finished arriving (idle starts here) */
  from?: number;
  /** shot-local second it should start demoting (dim + shrink in place, slot stays occupied) */
  demoteAt?: number;
  demoteDur?: number;
  /** @deprecated use `demoteAt` — same behaviour, misleading name (element does NOT leave) */
  retireAt?: number;
  /** @deprecated use `demoteDur` */
  retireDur?: number;
  /** how far back it recedes when demoting */
  push?: number;
  amount?: number;
  /** opt-in micro-motion while resolved (off by default since 2026-09-04) */
  idle?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({
  seed,
  from = 0,
  demoteAt,
  demoteDur,
  retireAt,
  retireDur,
  push = 0.92,
  amount = 1,
  idle: idleOn = false,
  children,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = frame / fps;
  const at = demoteAt ?? retireAt;          // 新名优先，旧名兜底
  const dur = demoteDur ?? retireDur ?? 0.5;

  const w = idleOn ? idle(seed, frame, fps) : {scale: 1, y: 0, glow: 1};
  const alive = sec >= from;
  let scale = alive ? 1 + (w.scale - 1) * amount : 1;
  let y = alive ? w.y * amount : 0;
  let opacity = 1;
  let blur = 0;

  if (at !== undefined && sec >= at) {
    const p = interpolate(sec, [at, at + dur], [0, 1], {
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.quad),
    });
    scale *= interpolate(p, [0, 1], [1, push]);
    y += interpolate(p, [0, 1], [0, -26]);
    opacity = interpolate(p, [0, 1], [1, 0.34]);
    blur = interpolate(p, [0, 1], [0, 3.2]);
  }

  return (
    <div
      className={className}
      style={{
        transform: `translateY(${y}px) scale(${scale})`,
        opacity,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** L2 exit focus: recede optically without moving. */
export const Defocus: React.FC<{
  at: number;
  dur?: number;
  maxBlur?: number;
  dim?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({at, dur = 0.5, maxBlur = 5, dim = 0.4, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = frame / fps;
  const p = interpolate(sec, [at, at + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  return (
    <div
      style={{
        filter: p > 0.02 ? `blur(${p * maxBlur}px)` : undefined,
        opacity: 1 - p * dim,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
