---
name: black-slam-transition
title: The outgoing shot freezes for one beat (the film's only motionless moment) + an accent surges to peak; on the final frame opacity snaps to zero (zero-overlap hard cut); the incoming shot cuts in at full brightness with motion already built in — a three-stage decaying shake at the cut point + a pull-back from 1.10 that brakes to a stop
usage: The single biggest reversal/reveal in the film — **allowed only once per film**; the preceding line is a cliffhanger or a pre-conclusion pause, the following line is the answer
---

## Intent
The other five forms all do "momentum handoff"; the black slam does the opposite — it is a **deliberate rupture**, trading one legitimate hard cut for maximum impact.
The key is not the "hard cut" itself (that is the root disease of PPT feel) but the **privileged arrangements** on both sides of the cut:
the outgoing side gets one beat of freeze (the only still moment in the whole film), the incoming side gets one beat of shake + built-in motion.
The freeze creates anticipation; the shake cashes in the impact. If both sides just cut flatly, it degrades into the very flaw it exists to avoid.

Critical rules for getting it right: ① **The freeze must be the only one in the film** — the camera never rests during other shots' hold phases; only here does it stop for a beat,
so stillness becomes a signal rather than a mistake; ② **Zero overlap** (`hardOut` — the last frame disappears outright, no fade) — with any overlap it is no longer a "slam";
③ **The incoming shot cuts in at full brightness with motion built in** — the frame it cuts in on is already at 1.10 and carrying the shake; a hard cut to a static frame reads as a slideshow page-flip;
④ **Once per film, max** — use it a second time and the first one's weight evaporates instantly.

## Motion Core
Time structure (`cut = at + 0.12`, all parameters in `CONFIG.slam`):

| Phase | Time | Outgoing shot | Accent layer | Incoming shot |
|---|---|---|---|---|
| Freeze | `at−0.34` → `at` | Camera **completely still** (hold does only an early slow push; the tail is left empty) | — | Parked at `scale 1.10`, `opacity 0` |
| Accent surge | `at` → `cut` | Still frozen | `opacity 0→0.34`, `power3.in` | — |
| Cut point | `cut` | `tl.set(opacity: 0)` — hardOut, no fade | Peak | `tl.set(opacity: 1)` — full-brightness hard cut |
| One-beat shake | `cut` → `cut+0.20` | — | 0.20s `power2.out` falloff | `x: +9 → −4.95 → +2.52 → 0` (three decaying segments, 0.06/0.06/0.08s each, `ease:none`) |
| Pull-back brake | `cut` → `cut+0.50` | — | — | `scale 1.10→1.0`, `power4.out` |
| Handoff | — | — | — | Hold-phase slow drift (`drift 10px` + `push 0.03`) |

- **`hardOut` is this form's technical marker**: in GSAP, `tl.set(out, {opacity: 0}, cut)`;
  in Remotion, `<ShotFade hardOut>` (`opacity *= frame >= total - 1 ? 0 : 1`).
  Both sides use `set` rather than `to` — the instantaneous change on this one frame is where the "slam" comes from.
- **Three decaying shake segments, not jitter**: `+9 → −4.95 → +2.52 → 0`, amplitude decaying by 0.55, occurring exactly once at the cut point.
  This does not conflict with the project's settled rule of "no frozen-frame jitter / line boil": jitter is sustained micro-vibration (reads as cheap),
  the shake here is a **single impact on a boundary** (reads as physics). Turn it into sustained jitter with `repeat` and you've crossed the red line.
- **The three-segment displacement uses `ease:none`**: each segment linear, hard direction changes between segments — that's what gives the "collision" its edges; `elastic`/`back` would read as jelly.
- **The pull-back uses `power4.out`**: an extremely steep deceleration — the incoming frame arrives at maximum speed, eats 90% of the distance within 0.15s, then settles slowly over the remaining 0.35s.
  This curve keeps the "full-brightness hard cut" from feeling abrupt, because what the viewer sees is "it charges in and gets braked".
- **Accent peak 0.34 (darkening on white backgrounds)**: higher than the overexposure page-flip (0.10) because it carries the entire impact;
  in dark-background projects switching back to a white radial overexposure, it can go to 0.55–0.7. The polarity rule is the same as [[overexpose-flip-transition]].

Remotion equivalent (`template/motion-systems/transitions.tsx`):

- Outgoing shot (**no camera keys** in the tail = freeze, paired with hardOut): `{ tail: 1, hardOut: true, path: [{t:0, scale:1.02}, {t:tFreeze, scale:1.06}] }`, shell `<ShotFade lead={lead} tail={1} narrationFrames={n} hardOut>`
- Incoming shot (`lead: 0` zero overlap, `path` carrying its own opening motion): `{ lead: 0, path: [{t:0, scale:1.10, x:9}, {t:0.2, x:0}, {t:0.5, scale:1.0}] }`
- It is the **only one of the six forms without a CamKey generator** — on the outgoing side the action is "add no keys", and the incoming side's opening motion is set per content (shake direction and pull-back amount are both adjustable).
- The flash is drawn by the scene itself; when `env.tsx` exists, register it in the `TRANSITION_FLASHES` table for unified management.

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| Freeze duration `freeze` | 0.34s (≈10 frames) | <0.2s the viewer doesn't have time to notice "it stopped" and the anticipation beat fails; >0.6s reads as a stall/dropped frames |
| Accent surge `punch` | 0.12s (≈4 frames) | >0.25s the viewer sees the cut coming and the impact leaks away; <0.06s the accent doesn't have time to be seen |
| Accent peak `peak` | 0.34 on white / 0.55–0.7 on dark | Higher than the overexposure page-flip — it carries the entire impact; on white <0.2 reads as "it flickered for no reason" |
| Accent falloff `fall` | 0.20s | Shorter than the page-flip's 0.42s: here the new frame must brighten up as fast as possible |
| Shake amplitude `shake` | 9px @960 width | <5px invisible; >16px reads as a glitch/blooper; scale with screen width |
| Shake segment durations | 0.06 / 0.06 / 0.08s | Any segment ≥0.1s becomes "sway" rather than "shake"; more than 3 segments becomes jitter (crossing the red line) |
| Incoming framing `kickScale` | 1.10 | =1.0 is a hard cut to a static frame = slideshow page-flip; >1.25 the pull-back runs too long and the impact gets dragged out |
| Pull-back brake `kick` | 0.50s, `power4.out` | Swap to `power2.out` and the deceleration is too soft, losing the "being braked" feel; >0.8s the impact's tail drags on too long |
| Overlap | **0 (hardOut)** | Any nonzero overlap degrades this form into a weak version of the push-through |

## Known Pitfalls
- Used more than once: the first instance's weight evaporates on the spot. Once per film, saved for the biggest reversal.
- No freeze on the outgoing side (slow push as usual): the hard cut has no anticipation beat and reads as an editing mistake rather than design.
- Adding idle micro-motion to the freeze beat "so it isn't too dead": then it's no longer a freeze, and this form's signal disappears.
- Incoming side cuts in without motion: a static frame flashing on = PPT page jump, inviting back the very flaw this card most wants to avoid.
- Turning the shake into sustained `repeat` jitter: crosses the project red line (no frozen-frame jitter) and reads as cheap. The shake happens once.
- Using an overlap fade (forgetting `hardOut`): softens the boundary, and the impact is gone entirely.
- Copying the white overexposure accent in a white-background project: swallowed by the background (the same polarity constraint as [[overexpose-flip-transition]]).
- Placing the freeze + hard cut mid-sentence: this form must land on a sentence end/pause, otherwise the audio runs continuous while the picture ruptures, reading as dropped frames.

## Reuse Guide
- HTML/GSAP: `demos/black-slam-transition/index.html`. Lift out the single function `blackSlam(outgoingShot, incomingShot, startSeconds) → endSeconds`
  + the `CONFIG.slam` parameter set + the `.flash` CSS block. **Mind the scheduling**: the outgoing shot's `hold()` duration must be written as
  `hold - freeze` (leaving the tail empty = the freeze); this line cannot be omitted, or the freeze does not exist.
- Remotion: outgoing shot with no CamKeys in the tail + `<ShotFade hardOut>` + `tail: 1`; incoming shot with `lead: 0`,
  `path` first key carrying `scale 1.10` and the shake; the flash goes through the `TRANSITION_FLASHES` table.
- Family relations: it is the only hard cut among the six forms; the other five all have overlap. Want impact without rupture → use [[overexpose-flip-transition]];
  want the continuous version of "zero-tween hard cuts as a metronome" → that is a different card, color-slam-beat-card (background-color jump beats); do not mix it with this form.
- Editing-software equivalents: in Jianying/PR it is simply a hard cut with no transition + a freeze frame on the previous shot + two keyframes ("scale + position") on the next shot;
  in AE, an Exposure surge + Scale/Position keyframes on the incoming shot (Easy Ease changed to 90% outgoing) — this card binds those three things into one temporal shape.

## Scope
- Belongs to this card: the outgoing side's **one-beat camera freeze** (the film's only still moment, serving as the hard cut's anticipation beat) + the accent's 0.12s `power3.in` surge;
  **zero-overlap hardOut** (the final frame's `opacity` snaps to zero, using `set` not `to`); the incoming side's full-brightness hard cut (same-frame `set opacity:1`)
  with motion built into its opening — the three-segment decaying shake at the cut beat (`+9 → −4.95 → +2.52 → 0`, each segment `ease:none`, occurring once)
  + the `scale 1.10→1.0` `power4.out` pull-back brake; the accent's 0.20s `power2.out` falloff; the hold-phase slow drift where the camera never rests.
- Does not belong to this card: the text and colors within the two shots (the white/light-gray tiles + gray form-name labels are "labels for identifying the form", not dialogue captions),
  the upper-left explanatory corner tag, **whether the accent is bright or dark** (set by the background), whether the shake goes left or right, and the specific `inset:-14%` value on `.shot`.
- Migration interface: all timing lives in `CONFIG.slam` (`freeze`/`punch`/`peak`/`fall`/`kick`/`kickScale`/`shake`);
  **the accent layer's polarity flips with the background** (darkening at 0.34 on white; white radial overexposure at 0.55–0.7 on dark; the envelope stays put);
  when resizing, scale `shake` with screen width; `kickScale` is frame-size independent;
  **zero overlap is this form's definition and cannot be parameterized** — the moment you grant an overlap, you should be using a different form.
- Background requirements: runs on white, **but the accent layer must flip polarity** (white overexposure is completely swallowed on a white background; switch to a one-beat darkening).
  The camera curves are background-independent. This shares the same background-coupling constraint with [[overexpose-flip-transition]].
