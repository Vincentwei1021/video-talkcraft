import React from 'react';
import {C, FONT} from './theme';

export const Kicker: React.FC<{children: React.ReactNode; className?: string; color?: string}> = ({
  children,
  className,
  color = C.cyan,
}) => (
  <div
    className={className}
    style={{
      display: 'inline-block',
      padding: '8px 22px',
      borderRadius: 999,
      border: `1.5px solid ${color}`,
      color,
      fontFamily: FONT.mono,
      fontSize: 26,
      letterSpacing: 4,
      opacity: 0,
    }}
  >
    {children}
  </div>
);

/** Splits text into per-char spans with the given class for stagger targets. */
export const Chars: React.FC<{text: string; cls: string; style?: React.CSSProperties}> = ({
  text,
  cls,
  style,
}) => (
  <>
    {text.split('').map((ch, i) => (
      <span key={i} className={cls} style={{display: 'inline-block', opacity: 0, ...style}}>
        {ch === ' ' ? ' ' : ch}
      </span>
    ))}
  </>
);

/** Deterministic pseudo-random in [0,1) from an integer seed. */
export const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const Particles: React.FC<{count?: number; cls: string; color?: string}> = ({
  count = 26,
  cls,
  color = C.cyan,
}) => (
  <div style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'}}>
    {Array.from({length: count}, (_, i) => (
      <div
        key={i}
        className={cls}
        style={{
          position: 'absolute',
          left: `${rand(i) * 100}%`,
          top: `${rand(i + 100) * 100}%`,
          width: 3 + rand(i + 200) * 5,
          height: 3 + rand(i + 200) * 5,
          borderRadius: '50%',
          background: color,
          opacity: 0,
        }}
      />
    ))}
  </div>
);

export const sceneWrap: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  fontFamily: FONT.cn,
  color: C.text,
  overflow: 'hidden',
};
