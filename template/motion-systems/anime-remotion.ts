import {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {engine} from 'animejs';
import type {Timeline} from 'animejs';

// Remotion renders frames out of order across headless workers. anime.js must
// never advance on its own clock: kill the internal rAF loop and drive
// everything through seek() from useCurrentFrame().
engine.useDefaultMainLoop = false;
engine.pauseOnDocumentHidden = false;

/**
 * Builds an anime.js timeline once per mount and seeks it to the current
 * Remotion frame on every frame change. The builder must return a timeline
 * created with `autoplay: false`. Layout effects run synchronously before
 * Remotion screenshots the frame, which keeps seeks deterministic.
 *
 * `leadFrames`: when a Sequence starts early for a transition overlap, pass the
 * shot's lead so timeline-time 0 still lands on narration start. Positions from
 * msSay() then keep meaning "ms after the first spoken char of the scene".
 */
export const useAnimeTimeline = (build: () => Timeline, leadFrames = 0): void => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tlRef = useRef<Timeline | null>(null);

  useLayoutEffect(() => {
    tlRef.current = build();
    tlRef.current.pause();
    return () => {
      tlRef.current?.revert();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    tlRef.current?.seek(Math.max(0, ((frame - leadFrames) / fps) * 1000));
  });
};
