import React from 'react';
import {Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * L6 实拍底床（design-language §1.2）：B-roll 铺满镜头、压暗降饱和、底部 scrim、极缓 Ken Burns；字与画同收（end）。
 * 根元素 className="wb-bed" 是**工作台透明导出的去底标记**——右键导透明通道时，幕底 / 字幕 / 实拍底床都不带进去，只剩动效本体。
 * 用法：<Bed src="broll/x-30fps-mci.mp4" abs={abs} start={shot.startSec} end={1e6} from={0.6} speed={1} />
 */
const prog = (abs: number, at: number, dur: number, easing: (x: number) => number) =>
  interpolate(abs, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const Bed: React.FC<{
  src: string;
  abs: number;
  start: number;
  end: number;
  from?: number;
  speed?: number;
  bright?: number;
  sat?: number;
  zoomRate?: number;
  scrim?: number;
  fadeIn?: number;
}> = ({src, abs, start, end, from = 0, speed = 0.6, bright = 0.42, sat = 0.55, zoomRate = 0.005, scrim = 0.7, fadeIn = 0.4}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = Math.max(0, abs - start);
  const z = 1.04 + t * zoomRate;
  const fi = prog(abs, start, fadeIn, Easing.out(Easing.quad));
  const fo = 1 - prog(abs, end - 0.4, 0.4, Easing.in(Easing.quad));
  return (
    <div className="wb-bed" style={{position: 'absolute', inset: 0, overflow: 'hidden', opacity: fi * fo}}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        startFrom={Math.round(from * fps)}
        playbackRate={speed}
        style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: `brightness(${bright}) saturate(${sat})`}}
      />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%', background: `linear-gradient(to top, rgba(10,9,8,${scrim}) 0%, rgba(10,9,8,0) 100%)`}} />
      <span style={{display: 'none'}}>{frame}</span>
    </div>
  );
};
