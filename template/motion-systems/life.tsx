import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * L3/L4 lifecycle. A subject is never allowed to freeze once it has arrived:
 * `resolved` carries a deterministic micro-motion, and it visibly yields the
 * stage when the next subject takes over (interaction pattern 12).
 */
export type Phase = 'hidden' | 'forming' | 'resolved' | 'retiring' | 'gone';

export const phaseOf = (
  sec: number,
  revealSec: number,
  formSec: number,
  retireSec?: number,
  retireDur = 0.45,
): Phase => {
  if (sec < revealSec) return 'hidden';
  if (sec < revealSec + formSec) return 'forming';
  if (retireSec === undefined || sec < retireSec) return 'resolved';
  if (sec < retireSec + retireDur) return 'retiring';
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
 * Keeps a resolved element alive and hands the stage over on cue. `retireAt`
 * is the shot-local second at which a newer subject claims focus.
 */
export const Live: React.FC<{
  seed: number;
  /** shot-local second the element finished arriving (idle starts here) */
  from?: number;
  /** shot-local second it should start yielding */
  retireAt?: number;
  retireDur?: number;
  /** how far back it recedes when yielding */
  push?: number;
  amount?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({
  seed,
  from = 0,
  retireAt,
  retireDur = 0.5,
  push = 0.92,
  amount = 1,
  children,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = frame / fps;

  const w = idle(seed, frame, fps);
  const alive = sec >= from;
  let scale = alive ? 1 + (w.scale - 1) * amount : 1;
  let y = alive ? w.y * amount : 0;
  let opacity = 1;
  let blur = 0;

  if (retireAt !== undefined && sec >= retireAt) {
    const p = interpolate(sec, [retireAt, retireAt + retireDur], [0, 1], {
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
