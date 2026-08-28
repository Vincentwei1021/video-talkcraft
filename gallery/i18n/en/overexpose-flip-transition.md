---
name: overexpose-flip-transition
title: The outgoing camera pushes toward the evidence object until 1.5x fills the frame; on the same frame an accent layer (dark background = white radial overexposure / white background = full-frame darkening) spikes and falls anchored on the cut point, and the incoming shot is pulled out of that bright core
usage: Chapter page-turns, the semantic break of "this section is done, on to the next"; also for jumping away after pushing into a key screenshot/chart. Solemn in tone, 2~4 uses per piece
---

## Intent
[[push-through-transition]] is the accent-free baseline, reading as "I passed through"; the overexposed flip adds **a layer of exposure accent** on the same scale axis,
reading as "this page has been turned." It's heavier than the push-through because the flash is the visual counterpart of an auditory accent — usually pinned on a sentence-final stress or a musical downbeat.

Critical rules to get it right: ① **The accent envelope must anchor on the cut point** — rising before the cut, falling after, asymmetric; write it as one centered symmetric tween
and the peak gets truncated by the fall segment; on white, a 3% darkening equals no accent at all (field-tested mistake); ② **Overexposure is not a white flash** — peak 0.42~0.55,
content must remain faintly visible; hitting 1.0 turns it into a different card (pure white-flash transition); ③ **The accent layer's polarity flips with the background** — on white, a white overlay gets
completely swallowed and must become a beat of darkening. This is the only one of the six forms coupled to background color.

## Motion Core
Time structure (`cut = at + 0.55 − 0.10`, parameters all in `CONFIG.blow`):

| Phase | Time | Outgoing shot | Accent layer | Incoming shot |
|---|---|---|---|---|
| Push into evidence | `at` → `at+0.55` | `scale 1.0→1.50` + `blur 0→4px`, `power2.in` | — | Parked at `scale 1.30` + `blur 6px` |
| Accent rise | `cut−0.26` → `cut` | Keeps pushing | `opacity 0→peak`, `power2.in` | — |
| Cut point | `cut` | Begins 0.40s fade-out | Peak | Begins 0.40s fade-in |
| Accent fall | `cut` → `cut+0.42` | — | `opacity peak→0`, `power2.out` | Settling |
| Settle | `cut` → `cut+0.55` | — | — | `scale 1.30→1.03` + `blur→0`, `power2.out` |

- **Push to 1.5x rather than 1.35x**: that's the magnitude of "pushing into the evidence object until it fills the frame" — the outgoing shot's subject is pushed out of frame,
  the audience's attention is handed to a field of pure light/dark, and from there pulled into the new shot. The defocus is actually lighter than the push-through's (4px rather than 7px),
  because the bright core must stay legible; over-blurred it reads as a plain dissolve.
- **Implementing the asymmetric envelope**: two independent tweens — one rising to peak from `cut − rise` to `cut`, one falling from `cut`.
  Writing it as a single `yoyo` or centered keyframes keeps the peak from reaching its set value.
- **The incoming shot starts at 1.30**: higher than the push-through's 1.16, because as the bright core dissipates the audience is "being pulled out" — the journey must be longer for the pull-out to read.
- **`.flash` is radial, not a uniform fill**: `radial-gradient(ellipse at 50% 46%, …)` gives the accent a center;
  46% is the visual center of gravity (slightly above geometric center); a uniform fill reads as a brightness adjustment, not overexposure.

Remotion equivalent (`template/motion-systems/transitions.tsx`):

- Outgoing shot: `{ tail: 12, path: [{t:0, scale:1.06}, ...blowoutOut(tEnd)] }` — `blowoutOut` is just `pushThroughOut(to:1.5, blur:4, dur:0.9)`
- Incoming shot: `{ lead: 12, path: [...settleIn(leadSec, {from:1.3}), {t:9, scale:1.0}] }`
- Overlay layer (placed on the outgoing side, `at` = end-of-narrative second; or on the incoming side with a negative `at` landing in the lead): `<Overexpose at={tEnd} peak={0.55} riseF={10} fallF={10} color="255, 250, 240" />`
- `Overexpose`'s `riseF/fallF` are frame counts; internally it is exactly the asymmetric envelope above (`df<=0` runs `Easing.in`, `df>0` runs `Easing.out`).
- If the project already has `env.tsx`, prefer registering flashes in the `TRANSITION_FLASHES` table for unified management rather than scattering them across scenes.

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| Outgoing push target `outScale` | 1.50 | <1.35 is indistinguishable from the push-through and the accent seems unmotivated; >1.7 the subject has long left the frame and the last few frames are empty pushing |
| Accent peak `peak` | dark 0.42~0.55 / white 0.10 | At 1.0 it's a pure white-flash transition (a different card); dark <0.3 or white <0.06 reads as "it flickered but meant nothing" |
| Rise `rise` | 0.26s (≈8 frames) | <0.15s reads as a strobe/glitch; >0.4s the audience knows the scene change is coming and the surprise is gone |
| Fall `fall` | 0.42s (≈13 frames) | Must be longer than the rise (fast up, slow down is what exposure recovery looks like); equal lengths read as mechanical blinking |
| Overlap frames `overlap` | 0.40s ≈ 12 frames | Slightly shorter than the push-through: the accent already covers the boundary, so the overlap can be thriftier |
| Incoming start framing `inScale` | 1.30 | =1.16 reads as push-through + flash; >1.45 the pull-out journey is too long and the landing drags |
| Outgoing defocus `outBlur` | 4px | Lighter than the push-through's 7px — the bright core must stay legible; >8px reads as a dissolve |

## Known Pitfalls
- Accent envelope written centered (symmetric tween or `yoyo:true`): the rise gets truncated by the fall, the peak falls far short of the set value, and on white it's as if nothing was done.
- White project copying the white overexposure layer verbatim: the overlay gets completely swallowed by the background and the transition accent vanishes. On white it must become a beat of darkening.
- Peak pushed to 1.0: becomes a pure white-flash transition — that's a different grammar (a zero-content frame) and doesn't belong in this card.
- Flash misaligned with the cut point: the flash peaks after the cut, the audience sees the new frame before the flash, reading as a bug.
- Flash only, no push: a flash over a static frame = a camera flashbulb; no momentum handoff, degenerating into a hard cut + an effect.
- Overexposed flips used seven or eight times in one piece: exposure accents inflate until none of them matter. 2~4 is the ceiling.

## Reuse Guide
- HTML/GSAP: `demos/overexpose-flip-transition/index.html`. Lift `blowout(outShot, inShot, startSec) → endSec`
  as one function + the `CONFIG.blow` parameter set + the `.flash` CSS; take `hold()` along (both ends of the transition need a slow push).
  **White projects use it as-is**; dark projects swap `.flash`'s `radial-gradient` base color to white and raise `peak` to 0.42~0.55, leaving envelope and timing untouched.
- Remotion: `blowoutOut` + `settleIn(…, {from:1.3})` + `<Overexpose>`; with `env.tsx`, flashes go into the `TRANSITION_FLASHES` table.
- Family relations: remove the accent layer = [[push-through-transition]]; swap the accent for a "zero-content pure-white frame" = white-flash transition (a different grammar);
  accent + hard cut + zero overlap = [[black-slam-transition]]. Use only one form per boundary.
- Frame-level compressed version (field-tested, Xiao Lin Shuo · Korean stock crash): **white flash + motion-blur diagonal sweep** — a white overlay spikes high while the frame drags a diagonal blur on the same frame;
  by the time the flash falls, the scene has changed, all within 0.1~0.2s. Note this card's finalized constraint that "the accent layer's polarity flips with the background" applies here too.
- Editing-software equivalents: JianYing's "flash white / exposure transition"; in AE, Exposure keyframes + camera Z displacement on both sides;
  in DaVinci, the Flash transition but with the envelope manually reshaped to asymmetric.

## Scope
- Belongs to this card: the outgoing `scale 1.0→1.50` + `blur 0→4px` `power2.in` push; the incoming `scale 1.30→1.03` + `blur 6→0`
  `power2.out` pull-out; **the accent layer's asymmetric envelope** (0.26s `power2.in` rise to peak before the cut, 0.42s `power2.out` fall after, anchored on the cut point rather than a midpoint);
  the 0.40s (≈12-frame) overlap's crossfade separated from the camera curves; the accent layer being radial (center 50% 46%) rather than a uniform fill;
  the never-static slow push during hold.
- Does not belong to this card: the text and colors inside the two shots (the white/light-gray tile + gray form name is a "label for identifying the form," not dialogue captions),
  the top-left explainer badge, **whether the accent is bright or dark** (set by the background — see the migration interface), the specific `inset:-14%` value on `.shot`.
- Migration interface: timing all in `CONFIG.blow` (`out`/`overlap`/`settle`/`cutLead` + `peak`/`rise`/`fall`);
  **the accent layer's polarity switches with the background** — `peak` is peak intensity, `.flash`'s base color decides darken vs. overexpose: on white use a 6~10% darkening (demo value 0.10),
  on dark switch back to white radial overexposure 0.42~0.55 (the overexposure must leave content faintly visible; at 1.0 it's a different card); no changes needed when resizing (only a scale axis + a full-screen overlay);
  scale `blur` linearly with output resolution.
- Background requirement: runs on white, **but the accent layer must flip polarity**. Field-tested lesson: a white overexposure overlay on a white background gets completely swallowed and the transition accent disappears —
  which is why the demo switched to a full-frame beat of darkening (peak 0.10, verified visible). Dark projects use white overexposure the other way around. This is the only one of the six forms coupled to background color.
