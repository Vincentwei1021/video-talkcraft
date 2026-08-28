import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, backOut, clamp, easeInOut, prog} from './lib';

/**
 * Blob mascot — port of the r00 grok-icon r(θ) radial-morph system.
 * Shape = radius function sampled at N angles, states blend by per-angle interpolation.
 * States: blob (idle) / squash (blink-jump) / hex / drop (alert) / tri.
 */
const N = 72;
const TAU = Math.PI * 2;

const polyR = (theta: number, n: number, R: number, off = 0) => {
  const seg = TAU / n;
  const a = ((theta + off) % seg + seg) % seg;
  return (R * Math.cos(Math.PI / n)) / Math.cos(a - Math.PI / n);
};

const SHAPES: Record<string, (th: number) => number> = {
  blob: (th) => 100 * (1 + 0.03 * Math.sin(th * 3)),
  hex: (th) => polyR(th, 6, 104, Math.PI / 6),
  tri: (th) => polyR(th, 3, 112, Math.PI / 2),
  drop: (th) => 100 * (1 + 0.28 * Math.pow(Math.max(0, Math.sin(th - Math.PI / 2)), 2)),
  squash: (th) => 100 * (1 - 0.35 * Math.pow(Math.sin(th), 2) + 0.18 * Math.pow(Math.cos(th), 2)),
};

const samplePath = (mix: {shape: string; w: number}[], wobblePhase: number): string => {
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * TAU;
    let r = 0;
    for (const m of mix) r += SHAPES[m.shape](th) * m.w;
    r *= 1 + 0.012 * Math.sin(th * 5 + wobblePhase); // living-surface wobble
    pts.push([Math.cos(th) * r, Math.sin(th) * r]);
  }
  // Catmull-Rom → cubic bezier closed path
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
};

export type MascotMood = 'idle' | 'happy' | 'think' | 'alert' | 'question';

/** mood timeline: [fromFrame, mood] — resolved by last entry <= frame */
export const moodAt = (timeline: [number, MascotMood][], f: number): MascotMood => {
  let m: MascotMood = 'idle';
  for (const [t, mood] of timeline) if (f >= t) m = mood;
  return m;
};

export const Mascot: React.FC<{
  timeline: [number, MascotMood][];
  x: number;
  y: number;
  scale?: number;
}> = ({timeline, x, y, scale = 0.8}) => {
  const f = useCurrentFrame();
  const mood = moodAt(timeline, f);
  const since = f - (timeline.filter(([t]) => t <= f).pop()?.[0] ?? 0);
  const trans = easeInOut(clamp(since / 12, 0, 1)); // 12-frame morph into new mood

  const target = mood === 'alert' ? 'drop' : mood === 'happy' ? 'squash' : mood === 'question' ? 'hex' : 'blob';
  const mix = [
    {shape: 'blob', w: 1 - trans * (target === 'blob' ? 0 : 1)},
    {shape: target, w: target === 'blob' ? 0 : trans},
  ];
  const d = samplePath(mix, f / 9);

  // happy: bounce; alert: shake
  const bounce = mood === 'happy' ? -Math.abs(Math.sin(f / 5)) * 18 * backOut(trans) : 0;
  const shake = mood === 'alert' && since < 14 ? Math.sin(f * 2.6) * 6 * (1 - since / 14) : 0;

  // blink: squash eyes every ~90 frames for 5 frames
  const blinkP = f % 90;
  const eyeH = blinkP < 5 ? 3 : 16;

  // thinking dots
  const dots = mood === 'think' ? [0, 1, 2] : [];
  // symbol overlay (! / ?)
  const symbol = mood === 'alert' ? '!' : mood === 'question' ? '?' : null;
  const symP = backOut(clamp((since - 6) / 8, 0, 1), 2.4);

  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translateX(${shake}px) translateY(${bounce}px) scale(${scale})`}}>
      <svg viewBox="-150 -150 300 300" width={300} height={300} style={{overflow: 'visible'}}>
        <path d={d} fill={C.blue} />
        {/* eyes */}
        <ellipse cx={-32} cy={-14} rx={11} ry={eyeH} fill="white" />
        <ellipse cx={32} cy={-14} rx={11} ry={eyeH} fill="white" />
        {/* thinking dots */}
        {dots.map((i) => (
          <circle
            key={i}
            cx={125 + i * 34}
            cy={-115 - Math.max(0, Math.sin((f - i * 4) / 6)) * 12}
            r={11}
            fill={C.ink}
            opacity={0.35 + 0.65 * Math.max(0, Math.sin((f - i * 4) / 6))}
          />
        ))}
        {/* symbol pop */}
        {symbol ? (
          <text
            x={0}
            y={-128}
            textAnchor="middle"
            fontSize={110}
            fontWeight={900}
            fontFamily="Arial Black, sans-serif"
            fill={mood === 'alert' ? C.red : C.yellow}
            stroke="black"
            strokeWidth={8}
            paintOrder="stroke"
            transform={`scale(${symP})`}
            style={{transformOrigin: '0px -128px'}}
          >
            {symbol}
          </text>
        ) : null}
      </svg>
    </div>
  );
};
