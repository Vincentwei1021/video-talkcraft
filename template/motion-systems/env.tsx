import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * L6 Environment. Since 2026-09-04 (运动做减法) it is a *static* layer by default:
 * act-based colour temperature + a fixed vignette. The breathing vignette,
 * diagonal light sweep, exposure pulses and transition flashes are kept as
 * opt-in props (`breathe` / `sweep` / `pulses` / `flashes`), all default false —
 * the frame is kept alive by the scene camera's slow push/pull, not by this layer.
 */

/** Absolute seconds → act tint. Build → demo → reversal → resolution. */
const ACTS: {until: number; tint: string; strength: number}[] = [
  {until: 25.04, tint: '94, 225, 255', strength: 0.05}, // I 建置 · 青
  {until: 56.96, tint: '255, 201, 77', strength: 0.06}, // II 演示 · 暖金
  {until: 73.88, tint: '255, 90, 110', strength: 0.1}, // III 反转 · 红
  {until: 1e9, tint: '120, 190, 255', strength: 0.05}, // IV 启示 · 冷回暖
];

const tintAt = (sec: number) => {
  for (let i = 0; i < ACTS.length; i++) {
    if (sec < ACTS[i].until) {
      const a = ACTS[i];
      const prev = ACTS[i - 1];
      // Cross-fade over 1.2s at each act boundary so the shift is felt, not seen.
      if (prev && sec < prev.until + 1.2) {
        const p = interpolate(sec, [prev.until, prev.until + 1.2], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return {tint: a.tint, strength: prev.strength + (a.strength - prev.strength) * p};
      }
      return {tint: a.tint, strength: a.strength};
    }
  }
  return {tint: ACTS[0].tint, strength: ACTS[0].strength};
};

/** Absolute seconds of hits that get a rise/plateau/decay exposure pulse. */
export const EXPOSURE_HITS = [
  1.92, 4.64, 6.48, 11.84, 23.36, 41.52, 55.84, 59.28, 66.0, 85.76, 94.16, 99.84,
];

/**
 * Transition flashes: a bright core at each motion-carried boundary so the
 * blur-to-blur handoff reads as "punching through light", not a dark dip.
 * s2→s3 blows out white off the paper; s3→s4 flashes gold off the whip.
 */
const TRANSITION_FLASHES: {t: number; color: string; peak: number}[] = [
  {t: 25.04, color: '255, 250, 240', peak: 0.55},
  {t: 43.24, color: '255, 210, 120', peak: 0.42},
];

/** Absolute seconds where the vignette tightens hard (reversal act). */
const VIGNETTE_TIGHTEN: {from: number; to: number; amount: number}[] = [
  {from: 6.3, to: 7.4, amount: 0.08},
  {from: 56.96, to: 58.5, amount: 0.12},
  {from: 72.9, to: 73.8, amount: 0.16},
  {from: 101.5, to: 103.2, amount: 0.2},
];

export const Environment: React.FC<{
  /** 8s breathing vignette (off by default since 2026-09-04) */
  breathe?: boolean;
  /** 12s diagonal light sweep (off by default) */
  sweep?: boolean;
  /** exposure pulses on EXPOSURE_HITS (off by default) */
  pulses?: boolean;
  /** TRANSITION_FLASHES overlays (off by default) */
  flashes?: boolean;
  /** static vignette strength; 0 disables the vignette layer entirely */
  vignette?: number;
}> = ({breathe = false, sweep = false, pulses = false, flashes = false, vignette = 0.34}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = frame / fps;
  const {tint, strength} = tintAt(sec);

  // Vignette: static by default; optional 8s ±6% breathing.
  const breatheAmt = breathe ? 0.5 + 0.5 * Math.sin((sec / 8) * Math.PI * 2) : 0;
  let vig = vignette + breatheAmt * 0.06;
  for (const v of breathe ? VIGNETTE_TIGHTEN : []) {
    if (sec >= v.from && sec <= v.to + 0.8) {
      const p = interpolate(sec, [v.from, v.to], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.quad),
      });
      vig += v.amount * p;
    }
  }

  // Optional slow diagonal light sweep, 12s period.
  const sweepPos = ((sec % 12) / 12) * 260 - 60;

  // Optional exposure pulse: 2f rise, 2f plateau, 8f decay.
  let pulse = 0;
  for (const h of pulses ? EXPOSURE_HITS : []) {
    const df = frame - Math.round(h * fps);
    if (df < 0 || df > 12) continue;
    pulse = Math.max(
      pulse,
      df <= 2
        ? df / 2
        : df <= 4
          ? 1
          : interpolate(df, [4, 12], [1, 0], {easing: Easing.out(Easing.quad)}),
    );
  }

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* act tint */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 42%, rgba(${tint}, ${strength}) 0%, transparent 68%)`,
          mixBlendMode: 'screen',
        }}
      />
      {/* diagonal sweep (opt-in) */}
      {sweep && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(${104}deg, transparent ${sweepPos - 26}%, rgba(${tint}, 0.055) ${sweepPos}%, transparent ${sweepPos + 26}%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
      {/* transition flashes (opt-in) */}
      {(flashes ? TRANSITION_FLASHES : []).map((f) => {
        const df = frame - Math.round(f.t * fps);
        if (df < -10 || df > 10) return null;
        // Asymmetric envelope: fast rise into the cut, slower fall out of it.
        const a =
          df <= 0
            ? interpolate(df, [-10, 0], [0, 1], {easing: Easing.in(Easing.quad)})
            : interpolate(df, [0, 10], [1, 0], {easing: Easing.out(Easing.quad)});
        return (
          <AbsoluteFill
            key={f.t}
            style={{
              background: `radial-gradient(ellipse at 50% 46%, rgba(${f.color}, ${a * f.peak}) 0%, rgba(${f.color}, ${a * f.peak * 0.35}) 40%, transparent 75%)`,
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
      {/* exposure pulse */}
      {pulse > 0.01 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 48%, rgba(255,255,255,${pulse * 0.075}) 0%, transparent 62%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
      {/* vignette (static unless `breathe`) */}
      {vig > 0.001 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 50%, transparent ${Math.max(8, 58 - vig * 44)}%, rgba(3,6,12,${Math.min(0.94, vig * 1.5)}) 100%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/** L5/L6 background grid, now a parallax citizen instead of a static backdrop. */
export const GridField: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = frame / fps;
  // Grid drifts a few px per second: the floor is alive even at rest.
  const dx = (sec * 2.1) % 72;
  const dy = (sec * 1.3) % 72;
  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage:
          'linear-gradient(rgba(94,225,255,0.16) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(94,225,255,0.16) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
        backgroundPosition: `${dx}px ${dy}px`,
      }}
    />
  );
};
