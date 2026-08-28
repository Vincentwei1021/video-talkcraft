import React from 'react';
import {Easing, interpolate} from 'remotion';
import {useSceneSec} from './hooks';

export const Counter: React.FC<{
  from: number;
  to: number;
  startSec: number;
  durSec: number;
  fmt: (v: number) => string;
  style?: React.CSSProperties;
  className?: string;
}> = ({from, to, startSec, durSec, fmt, style, className}) => {
  const t = useSceneSec();
  const v = interpolate(t, [startSec, startSec + durSec], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <span className={className} style={style}>
      {fmt(v)}
    </span>
  );
};
