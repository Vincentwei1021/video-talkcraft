import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {C} from './theme';
import {Environment} from './env';
import {Subtitles} from './Subtitles';
import {SHOTS, shotSequence} from './shots';
import {S1Hook} from './scenes/S1Hook';
import {S2Event} from './scenes/S2Event';
import {S3Sphere} from './scenes/S3Sphere';
import {S4Connes} from './scenes/S4Connes';
import {S5Rebut} from './scenes/S5Rebut';
import {S6Insight} from './scenes/S6Insight';
import {S7Ending} from './scenes/S7Ending';

const SCENES: Record<string, React.FC> = {
  s1_hook: S1Hook,
  s2_event: S2Event,
  s3_sphere: S3Sphere,
  s4_connes: S4Connes,
  s5_rebut: S5Rebut,
  s6_insight: S6Insight,
  s7_ending: S7Ending,
};

/**
 * Cross-shot opacity during overlaps. Outgoing shots fade in their tail while
 * the incoming shot's lead rises underneath — motion is carried by each shot's
 * own camera path (whip out ↔ whip in), this layer only blends pixels.
 * s4→s5 is the deliberate hard cut: s4 snaps to black 3 frames early and s5
 * enters with no lead at full opacity.
 */
const ShotFade: React.FC<{
  lead: number;
  tail: number;
  narrationFrames: number;
  hardOut?: boolean;
  children: React.ReactNode;
}> = ({lead, tail, narrationFrames, hardOut, children}) => {
  const frame = useCurrentFrame();
  const total = lead + narrationFrames + tail;

  let opacity = 1;
  if (lead > 0) {
    opacity = interpolate(frame, [0, lead], [0, 1], {
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.quad),
    });
  }
  if (hardOut) {
    // Freeze → 3 frames of black handled by the flash overlay in S4 itself;
    // here we just kill the shot instantly at its end.
    opacity *= frame >= total - 1 ? 0 : 1;
  } else if (tail > 0) {
    opacity *= interpolate(frame, [total - tail, total], [1, 0], {
      extrapolateLeft: 'clamp',
      easing: Easing.inOut(Easing.quad),
    });
  }

  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

export const MainVideo: React.FC = () => {
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <Audio src={staticFile('narration.wav')} />
      {SHOTS.map((shot) => {
        const {from, duration} = shotSequence(shot, fps);
        const Scene = SCENES[shot.id];
        const narrationFrames = Math.round(shot.durationSec * fps);
        return (
          <Sequence key={shot.id} from={from} durationInFrames={duration}>
            <ShotFade
              lead={shot.lead}
              tail={shot.tail}
              narrationFrames={narrationFrames}
              hardOut={shot.id === 's4_connes'}
            >
              <Scene />
            </ShotFade>
          </Sequence>
        );
      })}
      {/* L6 environment and subtitles live above every shot, in screen space */}
      <Environment />
      <Subtitles />
    </AbsoluteFill>
  );
};
