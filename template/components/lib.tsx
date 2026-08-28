import React from 'react';

// ---------- math ----------
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const lerp = (t: number, t0: number, t1: number, v0: number, v1: number) => {
  if (t <= t0) return v0;
  if (t >= t1) return v1;
  return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
};

/** Piecewise-linear keyframe interpolation: kf = [[frame, value], ...] sorted by frame. */
export const keyframes = (t: number, kf: [number, number][]): number => {
  if (t <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) {
    if (t <= kf[i][0]) return lerp(t, kf[i - 1][0], kf[i][0], kf[i - 1][1], kf[i][1]);
  }
  return kf[kf.length - 1][1];
};

// ---------- easings ----------
export const easeOut = (p: number) => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
export const easeIn = (p: number) => Math.pow(clamp(p, 0, 1), 3);
export const easeInOut = (p: number) => {
  const x = clamp(p, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const backOut = (p: number, s = 1.70158) => {
  const x = clamp(p, 0, 1) - 1;
  return 1 + x * x * ((s + 1) * x + s);
};

/** Progress 0..1 over [start, start+dur] frames. */
export const prog = (frame: number, start: number, dur: number) =>
  clamp((frame - start) / Math.max(dur, 1), 0, 1);

/** Pop-in: scale overshoot entrance (6-12 frame recipe from replica analysis). */
export const popScale = (frame: number, start: number, dur = 9) =>
  backOut(prog(frame, start, dur), 2.2);

/** Deterministic pseudo-random from integer seed. */
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- components ----------
/** Anisotropic directional blur (whip-pan / motion smear). */
export const DirBlur: React.FC<{bx: number; by: number; children: React.ReactNode}> = ({bx, by, children}) => {
  if (bx < 0.3 && by < 0.3) return <>{children}</>;
  const id = `db${Math.round(bx * 10)}x${Math.round(by * 10)}`;
  return (
    <>
      <svg width="0" height="0" style={{position: 'absolute'}}>
        <filter id={id}>
          <feGaussianBlur stdDeviation={`${bx} ${by}`} />
        </filter>
      </svg>
      <div style={{filter: `url(#${id})`, width: '100%', height: '100%'}}>{children}</div>
    </>
  );
};

/** Handheld camera drift: multi-sine wander, ±6px / ±0.3° (r04 recipe). */
export const drift = (f: number) => ({
  x: 4.2 * Math.sin(f / 47) + 1.8 * Math.sin(f / 13 + 2),
  y: 3.6 * Math.sin(f / 59 + 1) + 1.5 * Math.sin(f / 17 + 4),
  rot: 0.25 * Math.sin(f / 83 + 0.5),
});

/** Idle breathing float, phase-offset by index (±4px, ~100 frame period). */
export const breathe = (f: number, i = 0, amp = 4) => amp * Math.sin((f / 16 + i * 1.7) * 1.0);

export const FONT_CN = '"PingFang SC", "Hiragino Sans GB", sans-serif';
export const FONT_MONO = '"SF Mono", Menlo, monospace';

// palette (r09 blue system + emphasis colors from analysis)
export const C = {
  paper: '#f3eeeb',
  ink: '#1a1a2e',
  blue: '#0D7BDD',
  band: '#107DE2',
  lightBlue: '#a8d4f7',
  red: '#ef5436',
  lightRed: '#f6a796',
  yellow: '#FFD400',
  green: '#10e88a',
  white: '#ffffff',
};
