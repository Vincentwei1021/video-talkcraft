---
name: push-through-transition
title: The outgoing shot's camera accelerates its push to 1.35x while blur rises; after the cut point the incoming shot settles down in the opposite direction from a blurred 1.16 high position — both sides ride the same "push" axis, and the audience is pushed through the shot boundary
usage: Shot boundaries advancing from concept to evidence, or from wide view to detail; the most neutral of the six forms — it can be reused repeatedly in the same piece without wearing thin
---

## Intent
The hard-cut page flip is one of the four root causes of the PowerPoint look: content swaps wholesale at Sequence boundaries and the audience is "thrown" into the new scene.
The push-through is the **baseline form** of the motion-handoff family — the outgoing shot accelerates the camera outward, and the incoming shot catches the residual momentum in the same direction and then brakes.
What the audience reads is not "the picture changed" but "I passed through." It has no flash, no displacement, no particles — just a single scale axis —
so it is the safest, the most repeatable, and the control group for judging "does this cut of the transitions actually have momentum."

The keys to getting it right: (1) **both sides move in the same direction** — the outgoing shot pushes in (scale grows), and the incoming shot must settle back down from a larger scale;
a direction break (outgoing pushing in + incoming pulling out from 0.9) is worse than a hard cut; (2) **the fade handles only pixels** — write the opacity envelope and the camera curve completely separately,
with all motion on the camera; (3) **don't let go once the incoming shot settles back to 1.0** — the landing point stops at 1.03, and the hold that follows keeps slowly pushing from there, so the entry arrives already in motion.

## Motion Core
Timing structure (`at` = the moment the outgoing shot begins handing over the frame; everything lives in `CONFIG.push`):

| Phase | Time | Outgoing shot | Incoming shot |
|---|---|---|---|
| Accelerating push | `at` → `at+0.55` | `scale 1.0→1.35` + `blur 0→7px`, `power2.in` | Silent, parked at `scale 1.16` + `blur 7px` |
| Cut point | `cut = at + 0.55 − 0.10` | Begins 0.45s fade-out `power1.inOut` | Begins 0.45s fade-in `power1.inOut` |
| Settle | `cut` → `cut+0.60` | — | `scale 1.16→1.03` + `blur 7→0`, `power2.out` |
| Handoff | after `cut+0.60` | — | Slow push during hold (`sine.inOut`, continuing +0.04 from 1.03) |

- **The cut point leads by 0.10s (`cutLead`)**: the overlap begins before the outgoing shot's push peaks, so the outgoing shot's fastest segment coincides with the incoming shot's settle;
  that overlap is the "handoff" itself. Place the cut after the outgoing push completes and there's a frame where neither side is moving — the momentum breaks.
- **Acceleration uses `power2.in`, settle uses `power2.out`**: the exit is "leaving faster and faster," the entry is "landing slower and slower";
  the two easings joined end-to-end read as one continuous accelerate–decelerate — the temporal shape of a match-on-action.
- **Defocus is the evidence of speed**: `blur` rises and falls on the same curve as scale; pushing without blurring looks like Keynote's Magic Move — only with blur does it feel like a lens.
- **The shot layer must overfill the frame**: the demo uses `.shot { inset: -14% }` (symmetric inset ⇒ the frame center stays put),
  so no white edges leak during the push-in/settle; in Remotion the equivalent is the scene filling with its own `AbsoluteFill`, with the camera transform applied to an outer rig.

Remotion equivalent (`template/motion-systems/transitions.tsx`; the generators spread directly into the `path` in `shots.ts`):

- Outgoing shot (accelerating push starting at tEnd seconds, at the end of the narration): `{ tail: 14, path: [{t:0, scale:1.06}, ...pushThroughOut(tEnd)] }`
- Incoming shot (starts from a blurred high position within the lead, settling to working framing over settle seconds): `{ lead: 14, path: [...settleIn(leadSec), {t:9, scale:1.0}] }`
- `pushThroughOut(tEnd, {from:1.06, to:1.2, blur:7, dur:0.5})` generates two CamKeys; the first key of `settleIn(leadSec, {from:1.14, to:1.04, blur:6, settle:0.5})` has a negative `t` (landing inside the lead).
- Hand the pixel fade to `<ShotFade lead tail narrationFrames>`; do not write displacement into it.

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| Overlap frames `overlap` | 0.45s ≈ 14 frames | <10 frames reads as a hard cut; >20 frames the two scenes smear together and neither reads clearly |
| Outgoing acceleration duration `out` | 0.55s | <0.3s whips straight from stillness = no anticipation beat, the audience can't follow; >0.8s reads as "slowly enlarging" rather than pushing through |
| Outgoing push amount `outScale` | 1.35 | Below 1.15 there's not enough momentum — reads as a slight zoom; >1.6 is overexpose-flip territory — switch to that form |
| Cut lead `cutLead` | 0.10s | 0 = cutting only after the push completes, a static frame in between kills the momentum; >0.2s the overlap eats the acceleration segment and the push never registers |
| Incoming start framing `inScale` | 1.16 | =1.0 means no reverse settle (equivalent to a fade-in); >1.3 the settle travel is too long and the landing drags |
| Defocus peak `outBlur/inBlur` | 7px | 0 reads as a PowerPoint zoom; >12px the overlap smears into mush and the audience loses spatial continuity |
| Incoming landing point | 1.03 (not 1.0) | Landing at 1.0 then going still = hitting a wall; leave 0.03 for the hold to keep pushing, so the entry arrives already in motion |

## Known Pitfalls
- Each side's curve written independently, forgetting the direction: outgoing pushes in, incoming pulls out from 0.9 — a direction break, more jarring than a hard cut.
- Writing motion into `ShotFade`: opacity and displacement become coupled — change one and break both, and you can no longer tune overlap frames independently.
- Pushing without blurring: `blur` stays 0 throughout, reading as Keynote Magic Move, with no lens speed.
- The incoming shot settles to 1.0 and goes completely still: wall-hit feel — the hold that follows must keep pushing/drifting.
- Shot layer not overfilling the frame: the edges leak the background during the push-in (white edges on a white ground — an instant giveaway).
- Lead compensation missed: forgetting to negate the `t` of the incoming side's camera segment, so the settle starts only at narration frame 0 and the incoming shot sits static through the overlap.

## Reuse Guide
- HTML/GSAP: `demos/push-through-transition/index.html`. The core is the single function `pushThrough(outgoingShot, incomingShot, startSec) → transitionEndSec`
  plus the `CONFIG.push` parameter set — the whole block can be lifted directly; `hold()` is the slow push during shot dwell, take it too (without it the transition hits walls at both ends).
- Remotion: spread `pushThroughOut` / `settleIn` from `transitions.tsx` into `shots.ts`:
  `path: [...settleIn(0.47), {t:9, scale:1.0}, ...pushThroughOut(18.4)]`; assembly example in `MainVideo-example.tsx`.
- Relation to the family's other forms: the push-through is the baseline; **the accented layer** is [[overexpose-flip-transition]] (push to 1.5x + flash),
  **swapped onto the horizontal axis** it becomes [[whip-pan-transition]], and **reversed** it becomes [[pullback-cool-transition]]. Use only one form per boundary.
- Frame-level compressed variant (field-tested, real vertical talking-head): the **crash-zoom whip** (Apm_oCzPEQs) = the outgoing camera slams past 1.4x within 2–3 frames with trailing ghosting,
  the incoming shot catches the momentum, pulls back and brakes — a violent version of the push-through, total duration compressed to 0.1–0.2s, used on the strongest reversal line, once per piece.
- Editing-software equivalents: CapCut's "camera-move transition → push in" category; in AE it's hand-keying Z displacement on both sides' camera nulls + Camera Lens Blur — this card solidifies that hand-keying into parameters.

## Scope
- Belongs to this card: the 0.45s (≈14-frame) overlap between adjacent shots and the timing structure where both sides move simultaneously; the outgoing side's `scale 1.0→1.35` + `blur 0→7px`
  `power2.in` accelerating push; the incoming side's reverse settle from `scale 1.16` + `blur 7px` down to 1.03 with `power2.out`;
  the cut point leading by 0.10s so the acceleration and settle segments overlap; the opacity envelope (0.45s `power1.inOut` cross-fade) separated from the camera curve;
  the incoming landing leaving 0.03 headroom for the hold's slow push (`sine.inOut`, the camera never stops).
- Does not belong to this card: the text and coloring inside the two shots (the demo's white/light-gray tile + gray form names exist only to signal "the shot changed" and label which form is playing — annotation, not dialogue subtitles),
  the top-left explanatory badge, the specific `inset:-14%` value of `.shot` (derive it from the maximum scale).
- Migration interface: all timing lives in `CONFIG.push` (`out` exit / `overlap` / `settle` entry / `cutLead` cut lead);
  no changes needed when changing dimensions (this form has only the scale axis and is frame-size independent); to change momentum strength, touch only the `outScale` + `inScale` pair —
  **and always together, in the same direction** (exit grows, entry settles from something larger); scale `blur` linearly with output resolution (7px at 1080p, 14px at 4K).
- Background requirement: a white ground suffices. This form has no overlay layers; the camera curve is entirely independent of the background color.
