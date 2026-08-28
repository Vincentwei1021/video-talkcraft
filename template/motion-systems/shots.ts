import {timing} from './timing';
import type {CamImpulse, CamKey} from './camera';

/**
 * Shot table. Camera paths are written in shot-local seconds; every path is one
 * continuous breath across the whole shot, and `impulses` ride on top of it.
 *
 * Sequences overlap by `lead`/`tail` frames so transitions can hand motion over
 * instead of cutting. The one deliberate hard cut is s4→s5 (the reversal).
 */
export type Shot = {
  id: string;
  /** absolute seconds of narration start */
  startSec: number;
  /** narration length */
  durationSec: number;
  /** extra frames rendered before startSec (incoming transition) */
  lead: number;
  /** extra frames rendered after the narration ends (outgoing transition) */
  tail: number;
  path: CamKey[];
  impulses: CamImpulse[];
};

const D = Object.fromEntries(
  timing.scenes.map((s) => [s.id, {start: s.startSec, dur: s.durationSec}]),
) as Record<string, {start: number; dur: number}>;

/** Local second of an absolute second inside a shot (lead frames are negative). */
const L = (id: string, abs: number) => abs - D[id].start;

export const SHOTS: Shot[] = [
  {
    id: 's1_hook',
    ...{startSec: D.s1_hook.start, durationSec: D.s1_hook.dur},
    lead: 0,
    tail: 14,
    // Slow push through the whole hook, then accelerate into the question mark
    // so s2 can be pulled out of the same motion.
    path: [
      {t: 0, scale: 1.0, blur: 0},
      {t: 6.4, scale: 1.06},
      {t: 6.9, blur: 0},
      {t: 7.2, scale: 1.13, blur: 2.6},
      {t: 7.7, scale: 1.2, blur: 7},
    ],
    impulses: [
      {t: L('s1_hook', 1.92), scale: 0.03, frames: 6},
      {t: L('s1_hook', 4.64), scale: 0.018, frames: 5},
      {t: L('s1_hook', 6.48), scale: 0.04, shake: 3, frames: 8},
    ],
  },
  {
    id: 's2_event',
    ...{startSec: D.s2_event.start, durationSec: D.s2_event.dur},
    lead: 14,
    tail: 16,
    // A: settle out of the incoming push. B: drift right with the card belt.
    // C: push into the paper until it fills frame and blows out.
    path: [
      {t: -0.47, scale: 1.14, blur: 6, x: 0},
      {t: 0.5, scale: 1.04, blur: 0, x: 0},
      {t: 9.0, scale: 1.0, x: -26},
      {t: 13.4, scale: 1.02, x: -52},
      {t: 15.9, scale: 1.1, x: -150, y: 10, blur: 0},
      {t: 17.28, scale: 1.34, x: -300, y: 26, blur: 1.6},
      {t: 17.8, scale: 1.5, x: -380, y: 34, blur: 4},
    ],
    impulses: [
      {t: L('s2_event', 11.84), scale: 0.022, frames: 6},
      {t: L('s2_event', 21.04), scale: 0.02, frames: 6},
      {t: L('s2_event', 23.36), scale: 0.034, shake: 2.4, frames: 7},
    ],
  },
  {
    id: 's3_sphere',
    ...{startSec: D.s3_sphere.start, durationSec: D.s3_sphere.dur},
    lead: 16,
    tail: 14,
    // Pull out of the blown-out paper, hold a slow orbit, dutch into the
    // deadlock, punch on the new bound, then whip-pan left out of the shot.
    path: [
      {t: -0.53, scale: 1.3, blur: 5, rot: 0},
      {t: 0.6, scale: 1.04, blur: 0, rot: 0},
      {t: 11.0, scale: 1.0, rot: 0},
      {t: 13.04, scale: 1.01, rot: -1.5},
      {t: 16.48, scale: 1.05, rot: -1.5},
      {t: 17.92, scale: 1.06, rot: -1.2, x: 0, blur: 0},
      {t: 18.4, scale: 1.12, rot: 1.4, x: -420, blur: 8},
    ],
    impulses: [
      {t: L('s3_sphere', 38.08), scale: 0.016, frames: 5},
      {t: L('s3_sphere', 41.52), scale: 0.05, shake: 2, frames: 9},
    ],
  },
  {
    id: 's4_connes',
    ...{startSec: D.s4_connes.start, durationSec: D.s4_connes.dur},
    lead: 14,
    tail: 6,
    // Arrive on the whip (same direction), brake, orbit the two knots, then
    // freeze on the green stamp — the hard cut lands in MainVideo.
    path: [
      {t: -0.47, scale: 1.1, x: 430, blur: 7, rot: 1.2},
      {t: 0.35, scale: 1.02, x: 0, blur: 0, rot: 0.4},
      {t: 1.0, scale: 1.0, x: 0, rot: 0},
      {t: 9.2, scale: 1.03, x: -18},
      {t: 13.44, scale: 1.06, x: -30},
    ],
    impulses: [
      {t: L('s4_connes', 48.48), scale: 0.018, frames: 5},
      {t: L('s4_connes', 52.8), scale: 0.02, frames: 6},
      {t: L('s4_connes', 55.84), scale: 0.042, shake: 2.6, frames: 8},
    ],
  },
  {
    id: 's5_rebut',
    ...{startSec: D.s5_rebut.start, durationSec: D.s5_rebut.dur},
    lead: 0, // hard cut in
    tail: 12,
    // Persistent dutch (unease) and a slow vertical crawl that follows the
    // scan line down the code panel.
    path: [
      {t: 0, scale: 1.05, rot: -2, y: 0, blur: 0},
      {t: 2.4, scale: 1.03, rot: -2, y: 0},
      {t: 6.24, scale: 1.02, rot: -2, y: -14},
      {t: 11.0, scale: 1.03, rot: -1.6, y: -46},
      {t: 16.0, scale: 1.06, rot: -1, y: -30, blur: 0},
      {t: 17.0, scale: 1.08, rot: -0.6, y: -24, blur: 1.4},
    ],
    impulses: [
      {t: L('s5_rebut', 58.08), scale: 0.026, frames: 6},
      {t: L('s5_rebut', 59.28), scale: 0.05, shake: 5, frames: 9},
      {t: L('s5_rebut', 66.0), scale: 0.028, shake: 3.4, frames: 7},
      {t: L('s5_rebut', 67.1), scale: 0.022, shake: 2.6, frames: 6},
      {t: L('s5_rebut', 72.96), scale: 0.03, frames: 8},
    ],
  },
  {
    id: 's6_insight',
    ...{startSec: D.s6_insight.start, durationSec: D.s6_insight.dur},
    lead: 12,
    tail: 14,
    // Pull back out of the darkness, then one very slow push for the whole
    // quote — this act speaks with focus, not travel.
    path: [
      {t: -0.4, scale: 0.94, blur: 4},
      {t: 0.9, scale: 0.99, blur: 0},
      {t: 11.88, scale: 1.05},
      {t: 13.28, scale: 1.07, blur: 0},
      {t: 13.8, scale: 1.1, blur: 1.2},
    ],
    impulses: [
      {t: L('s6_insight', 79.44), scale: 0.014, frames: 5},
      {t: L('s6_insight', 83.12), scale: 0.014, frames: 5},
      {t: L('s6_insight', 85.76), scale: 0.046, shake: 2, frames: 9},
    ],
  },
  {
    id: 's7_ending',
    ...{startSec: D.s7_ending.start, durationSec: D.s7_ending.dur},
    lead: 14,
    tail: 10,
    // One continuous dolly through the proof starfield; brake on the final
    // line, then ease back for the curtain.
    path: [
      {t: -0.47, scale: 1.08, blur: 3.4},
      {t: 0.8, scale: 1.0, blur: 0},
      {t: 12.4, scale: 1.07},
      {t: 13.5, scale: 1.1},
      {t: 15.52, scale: 1.05},
      {t: 16.2, scale: 1.02},
    ],
    impulses: [
      {t: L('s7_ending', 94.16), scale: 0.03, shake: 2, frames: 7},
      {t: L('s7_ending', 99.84), scale: 0.05, shake: 1.6, frames: 10},
    ],
  },
];

export const shotById = (id: string): Shot => {
  const s = SHOTS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown shot ${id}`);
  return s;
};

/** Sequence placement: shots overlap so transitions can carry motion across. */
export const shotSequence = (shot: Shot, fps: number) => {
  const from = Math.round(shot.startSec * fps) - shot.lead;
  const duration = Math.round(shot.durationSec * fps) + shot.lead + shot.tail;
  return {from, duration};
};
