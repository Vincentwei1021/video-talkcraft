import React, {createContext, useContext, useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * L1 Camera. One continuous curve per shot plus short impulses that ride on top
 * of it — an impact must never reset the slow breath (interaction pattern 4).
 */
export type CamKey = {
  /** shot-local seconds; negative values live in the lead (incoming transition) */
  t: number;
  scale?: number;
  x?: number;
  y?: number;
  /** degrees; a dutch angle stays where it is put, it does not spring back */
  rot?: number;
  blur?: number;
};

export type CamImpulse = {
  /** shot-local seconds of the hit */
  t: number;
  scale?: number;
  /** peak lateral shake in px */
  shake?: number;
  /** frames from hit to full decay */
  frames?: number;
};

export type CamState = {
  scale: number;
  x: number;
  y: number;
  rot: number;
  blur: number;
  /** 0..1 progress across the narration span, for 3D rigs on the same curve */
  progress: number;
  /** shot-local seconds (0 = narration start, lead excluded) */
  sec: number;
};

const CameraCtx = createContext<CamState>({
  scale: 1,
  x: 0,
  y: 0,
  rot: 0,
  blur: 0,
  progress: 0,
  sec: 0,
});

export const useCamera = (): CamState => useContext(CameraCtx);

const track = (
  keys: CamKey[],
  field: keyof Omit<CamKey, 't'>,
  fallback: number,
  sec: number,
): number => {
  const pts = keys.filter((k) => k[field] !== undefined);
  if (pts.length === 0) return fallback;
  if (pts.length === 1) return pts[0][field] as number;
  return interpolate(
    sec,
    pts.map((p) => p.t),
    pts.map((p) => p[field] as number),
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.sin),
    },
  );
};

/**
 * Wraps a whole shot. Children read the resolved camera state through context
 * so parallax planes and Three.js rigs stay in lockstep with the DOM transform.
 * `leadFrames` shifts local time so that t=0 lands on narration start even when
 * the Sequence begins earlier for a transition overlap.
 */
export const CameraRig: React.FC<{
  path: CamKey[];
  impulses?: CamImpulse[];
  durationSec: number;
  leadFrames?: number;
  children: React.ReactNode;
}> = ({path, impulses = [], durationSec, leadFrames = 0, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = (frame - leadFrames) / fps;

  const state = useMemo<CamState>(() => {
    let scale = track(path, 'scale', 1, sec);
    const rot = track(path, 'rot', 0, sec);
    const blur = track(path, 'blur', 0, sec);
    let x = track(path, 'x', 0, sec);
    const y = track(path, 'y', 0, sec);

    for (const imp of impulses) {
      const dur = imp.frames ?? 6;
      const df = frame - (Math.round(imp.t * fps) + leadFrames);
      if (df < 0 || df > dur) continue;
      // Fast attack, eased release: peaks on the hit frame itself.
      const decay = 1 - df / dur;
      const env = decay * decay;
      if (imp.scale) scale += imp.scale * env;
      if (imp.shake) x += imp.shake * env * Math.sin(df * 2.1);
    }

    return {
      scale,
      x,
      y,
      rot,
      blur,
      progress: Math.max(0, Math.min(1, sec / durationSec)),
      sec,
    };
  }, [sec, frame, fps, path, impulses, durationSec, leadFrames]);

  return (
    <CameraCtx.Provider value={state}>
      <AbsoluteFill
        style={{
          transform: `scale(${state.scale}) translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rot}deg)`,
          transformOrigin: '50% 50%',
          filter: state.blur > 0.05 ? `blur(${state.blur}px)` : undefined,
          willChange: 'transform',
        }}
      >
        {children}
      </AbsoluteFill>
    </CameraCtx.Provider>
  );
};

/**
 * A depth plane. Camera translation is multiplied by (depth - 1) so far planes
 * lag and near planes lead, and scale is biased the same way (pattern 8).
 */
export const Plane: React.FC<{
  depth: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({depth, children, style}) => {
  const cam = useCamera();
  const dx = cam.x * (depth - 1);
  const dy = cam.y * (depth - 1);
  const ds = 1 + (cam.scale - 1) * (depth - 1);
  return (
    <AbsoluteFill
      style={{
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(${ds})`,
        transformOrigin: '50% 50%',
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
