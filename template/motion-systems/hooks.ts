import {useCurrentFrame, useVideoConfig} from 'remotion';

/** Seconds since the enclosing Sequence started. */
export const useSceneSec = (): number => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return frame / fps;
};
