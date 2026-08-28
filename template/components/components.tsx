import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {C, DirBlur, FONT_CN, FONT_MONO, backOut, breathe, clamp, easeOut, keyframes, popScale, prog} from './lib';

// ---------- subtitle track (r07 recipe: white + double black stroke, whole-clause hard cut) ----------
// chunks come from your project's data layer (split timestamps.json sentences at
// punctuation, max ~16 chars; see demo/deepseek-harness/remotion/src/data.ts for a
// reference implementation of SUB_CHUNKS).
export type SubChunk = {text: string; from: number; to: number};

export const Subtitles: React.FC<{chunks: SubChunk[]}> = ({chunks}) => {
  const f = useCurrentFrame();
  const cur = chunks.find((c) => f >= c.from && f < c.to);
  if (!cur) return null;
  const fs = cur.text.length > 15 ? 46 : 54;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 350,
        left: '5%',
        width: '90%',
        textAlign: 'center',
        fontFamily: FONT_CN,
        fontSize: fs,
        lineHeight: 1.4,
        fontWeight: 700,
        color: C.white,
        WebkitTextStroke: '10px black',
        paintOrder: 'stroke',
        letterSpacing: 2,
      }}
    >
      {cur.text}
    </div>
  );
};

// ---------- 花字: triple-outline emphasis word, per-char opacity+blur reveal (r10 recipe) ----------
export const FlowerWord: React.FC<{
  text: string;
  at: number; // appear frame
  x: number;
  y: number;
  size?: number;
  color?: string;
  rotate?: number;
}> = ({text, at, x, y, size = 88, color = C.yellow, rotate = -3}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const chars = [...text];
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + breathe(f, at % 7, 3),
        transform: `rotate(${rotate}deg)`,
        whiteSpace: 'nowrap',
        fontFamily: FONT_CN,
        fontWeight: 900,
        fontSize: size,
      }}
    >
      {chars.map((ch, i) => {
        const p = prog(f, at + i * 1.6, 4); // 1.6 frames/char stagger
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p,
              filter: `blur(${(1 - p) * 6}px)`,
              color,
              WebkitTextStroke: '6px black',
              paintOrder: 'stroke',
              textShadow: '0 0 0 #fff, 4px 4px 0 rgba(255,255,255,0.9)',
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// ---------- 砸字: smash-in word, scale 1.8→1 back-out + 2-frame dirblur + shake on land ----------
export const SmashWord: React.FC<{
  text: string;
  at: number;
  x: number;
  y: number;
  size?: number;
  color?: string;
}> = ({text, at, x, y, size = 120, color = C.white}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = prog(f, at, 7);
  const s = 1.8 - backOut(p) * 0.8;
  const land = f - at >= 7 && f - at < 9;
  const blur = f - at < 2 ? 14 : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: x + (land ? 5 : 0),
        top: y + (land ? -4 : 0),
        transform: `scale(${s})`,
        transformOrigin: 'center',
        fontFamily: FONT_CN,
        fontWeight: 900,
        fontSize: size,
        color,
        WebkitTextStroke: '8px black',
        paintOrder: 'stroke',
        opacity: clamp(p * 3, 0, 1),
        whiteSpace: 'nowrap',
      }}
    >
      <DirBlur bx={0} by={blur}>
        {text}
      </DirBlur>
    </div>
  );
};

// ---------- 荧光笔 sweep (r07: green block sweeps left→right in 8 frames) ----------
export const HighlightSweep: React.FC<{
  at: number;
  x: number;
  y: number;
  w: number;
  h?: number;
  color?: string;
  children?: React.ReactNode;
}> = ({at, x, y, w, h = 70, color = C.green, children}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const sw = easeOut(prog(f, at, 8)) * w;
  return (
    <div style={{position: 'absolute', left: x, top: y}}>
      <div style={{position: 'absolute', left: -8, top: -6, width: sw, height: h, background: color, opacity: 0.75, borderRadius: 6, transform: 'skewX(-6deg)'}} />
      <div style={{position: 'relative'}}>{children}</div>
    </div>
  );
};

// ---------- card with pop-in (0.92→1 overshoot + soft shadow) ----------
export const Card: React.FC<{
  at: number;
  x: number;
  y: number;
  w: number;
  h?: number;
  bg?: string;
  rotate?: number;
  idx?: number;
  children?: React.ReactNode;
}> = ({at, x, y, w, h, bg = C.white, rotate = 0, idx = 0, children}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = 0.85 + popScale(f, at, 10) * 0.15;
  const r0 = rotate + (1 - prog(f, at, 10)) * -4;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + breathe(f, idx, 3),
        width: w,
        height: h,
        background: bg,
        borderRadius: 28,
        boxShadow: '0 12px 40px rgba(20,25,60,0.18)',
        transform: `scale(${s}) rotate(${r0}deg)`,
        transformOrigin: 'center',
        opacity: clamp(prog(f, at, 4) * 1.5, 0, 1),
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

// ---------- screenshot slap-in (r07 paper slap: scale 1.4→1, shadow tightens, ±4° settle) ----------
export const Screenshot: React.FC<{
  src: string;
  at: number;
  x: number;
  y: number;
  w: number;
  rotate?: number;
  idx?: number;
}> = ({src, at, x, y, w, rotate = -2, idx = 0}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = easeOut(prog(f, at, 8));
  const s = 1.4 - p * 0.4;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + breathe(f, idx + 3, 2.5),
        width: w,
        transform: `scale(${s}) rotate(${rotate + (1 - p) * 5}deg)`,
        transformOrigin: 'center',
        opacity: clamp(p * 2, 0, 1),
        borderRadius: 18,
        overflow: 'hidden',
        border: '10px solid white',
        boxShadow: `0 ${24 - p * 12}px ${60 - p * 24}px rgba(0,0,0,${0.4 - p * 0.15})`,
      }}
    >
      <Img src={staticFile(src)} style={{width: '100%', display: 'block'}} />
    </div>
  );
};

// ---------- rolling number (odometer for star count / prices) ----------
export const NumberRoll: React.FC<{
  to: number;
  at: number;
  dur?: number;
  size?: number;
  color?: string;
  prefix?: string;
  suffix?: string;
  x: number;
  y: number;
}> = ({to, at, dur = 40, size = 150, color = C.yellow, prefix = '', suffix = '', x, y}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const v = Math.round(easeOut(prog(f, at, dur)) * to);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontFamily: FONT_MONO,
        fontWeight: 800,
        fontSize: size,
        color,
        WebkitTextStroke: '8px black',
        paintOrder: 'stroke',
        whiteSpace: 'nowrap',
      }}
    >
      {prefix}
      {v.toLocaleString('en-US')}
      {suffix}
    </div>
  );
};

// ---------- hand-drawn stroke reveal (dashoffset draw-on, r07 annotation recipe) ----------
export const DrawPath: React.FC<{
  d: string;
  at: number;
  dur?: number;
  stroke?: string;
  width?: number;
  viewBox: string;
  style?: React.CSSProperties;
}> = ({d, at, dur = 19, stroke = C.red, width = 10, viewBox, style}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = easeOut(prog(f, at, dur));
  return (
    <svg viewBox={viewBox} style={{position: 'absolute', overflow: 'visible', ...style}}>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - p * 100}
      />
    </svg>
  );
};

// ---------- section label chip ----------
export const Chip: React.FC<{text: string; at: number; x: number; y: number; bg?: string; color?: string}> = ({
  text,
  at,
  x,
  y,
  bg = C.blue,
  color = C.white,
}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = popScale(f, at, 8);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${s})`,
        transformOrigin: 'left center',
        background: bg,
        color,
        fontFamily: FONT_CN,
        fontWeight: 800,
        fontSize: 40,
        padding: '10px 28px',
        borderRadius: 999,
        boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
      }}
    >
      {text}
    </div>
  );
};

// ---------- typewriter code (S5) ----------
const CODE_LINES = [
  {t: 'const result = await harness.run({', c: '#7fb2ff'},
  {t: '  tools: [search, shell, editor],', c: '#c8d3f5'},
  {t: '  sandbox: docker("node:22"),', c: '#c8d3f5'},
  {t: '  plan: agent.write(taskSpec),', c: '#10e88a'},
  {t: '});  // 模型直接写代码编排任务', c: '#888faf'},
];

export const TypeCode: React.FC<{at: number; cps?: number}> = ({at, cps = 2.2}) => {
  const f = useCurrentFrame();
  const shown = Math.max(0, Math.floor((f - at) * cps));
  let used = 0;
  return (
    <div style={{fontFamily: FONT_MONO, fontSize: 34, lineHeight: 1.7, padding: '28px 34px'}}>
      {CODE_LINES.map((ln, i) => {
        const take = clamp(shown - used, 0, ln.t.length);
        used += ln.t.length;
        const active = take > 0 && take < ln.t.length;
        return (
          <div key={i} style={{color: ln.c, whiteSpace: 'pre'}}>
            {ln.t.slice(0, take)}
            {active && f % 16 < 8 ? <span style={{color: C.yellow}}>▌</span> : null}
          </div>
        );
      })}
    </div>
  );
};

// ---------- highlight color pulse for whole screen on beat (single-frame scale hit, r11) ----------
export const BeatHit: React.FC<{at: number; children: React.ReactNode}> = ({at, children}) => {
  const f = useCurrentFrame();
  const k = keyframes(f, [
    [at - 1, 1],
    [at, 1.06],
    [at + 3, 1],
  ]);
  return <div style={{transform: `scale(${k})`, transformOrigin: 'center', width: '100%', height: '100%'}}>{children}</div>;
};
