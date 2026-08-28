---
name: pullback-cool-transition
title: The outgoing shot's camera settles — no push, no pull — letting the content itself dim and defocus to hand over the frame; the incoming shot starts at scale 0.90 — the only scale<1 pull-back in the whole piece — slowly pulling to 0.99 over 0.90s to settle; the slowest tempo of all six transition forms
usage: The close of an emotional passage — settling down after an intense argument, a breath before the conclusion, the "let's step back" moment between sections; also used at act boundaries where the color temperature shifts cooler or warmer
---

## Intent
The other five forms all push forward, whip sideways, or crash inward — they handle "information still accumulating." The pull-back cool-down is the only form that moves backward:
it makes the audience **step back** — the previous section's content sinks away on its own (it isn't pushed away), and the new section slowly pulls in from a distance to working framing.
Used at an emotional settling point, it grants one legitimate breath; misused in an information-advancing passage, the whole piece's rhythm collapses on the spot.

The keys to getting it right: (1) **the camera settles, letting the content exit on its own** — the outgoing side's action is not on the camera (`scale` returns to 1.0 and stops),
but on the content's brightness/focus; if the camera is still pushing while the content dims, the two directions fight each other and it reads as "unfinished";
(2) **the incoming shot is the only scale<1 start in the whole piece** — that scarcity is this form's signature; use it anywhere else and it stops being special;
(3) **the tempo must be genuinely slow** — `settle` at 0.90s is the longest of the six forms, and the 0.55s overlap is also the longest; copying the push-through's 0.6s reads as "a pull-back, but rushed" —
a self-contradiction.

## Motion Core
Timing structure (`cut = at + 0.50 − 0.05`; all parameters live in `CONFIG.pull`):

| Phase | Time | Outgoing shot | Incoming shot |
|---|---|---|---|
| Content dims | `at` → `at+0.50` | **Content layer** (not the shot layer) `opacity 1→0.18` + `blur 0→2px`, `sine.in`; **shot layer** `scale →1.0` settles, `sine.out` | Parked at `scale 0.90` + `blur 4px` |
| Cut point | `cut = at+0.45` | 0.55s fade-out, `sine.inOut` | 0.55s fade-in, `sine.inOut` |
| Pull-back settle | `cut` → `cut+0.90` | — | `scale 0.90→0.99` + `blur 4→0`, `power2.out` |
| Handoff | — | — | Slow push during hold (continuing +0.03 from 0.99, `sine.inOut`) |

- **The outgoing side is written as two layers**: a content layer that dims (the `.big` display text in the demo, the whole subject plane in production), and
  a shot layer that settles scale back to 1.0. This is not "the camera doesn't move" but "the camera stops exerting force" — it decelerates from the hold period's slow push to stillness;
  it is a deceleration, not a pause (fundamentally different from the freeze in [[black-slam-transition]]: that is a hard stop, this is a soft settle).
- **Dark-ground vs white-ground dimming semantics**: in dark projects it's "content sinking into near-black" (brightness to zero, the environment swallowing the subject);
  on the white-ground demo the equivalent is "graying out and losing focus" (`opacity 0.18` + 2px blur). Visually different, semantically identical: the content exits of its own accord.
  This layer is **an in-scene matter**, not on the camera rig, so the two background treatments can differ without affecting the camera curve.
- **All easing is from the `sine` family** (`sine.in` / `sine.out` / `sine.inOut`): sine easing has none of the `power` family's steep segments,
  so it reads as "breathing" rather than "an action." Only the final pull-back uses `power2.out` (it needs a sense of settling and cannot keep drifting).
- **The landing point is 0.99, not 1.0**: leave 0.01 for the hold period to keep pushing — this form is the slowest, yet stillness is still forbidden (the camera never stops is an iron rule of this library).
- **The 0.55s (≈16-frame) overlap is the longest of all six forms**: because both sides are so gentle (one dimming, one slowly enlarging),
  a shorter overlap exposes a ghosting where "the old hasn't finished sinking and the new is already fully bright."
- **Color temperature**: in production this form is often paired with a shift toward cooler temperature (the `ACTS` table in `env.tsx` does a 1.2s cross-fade at act boundaries).
  Color temperature is not part of this card's motion proper (see Scope), but it is this form's most common companion.

Remotion equivalent (`template/motion-systems/transitions.tsx`):

- Outgoing shot (on the camera side write only the "settle": the final key parks scale at 1.0, with no keys added afterward; the dimming happens in-scene): `{ tail: 16, path: [{t:0, scale:1.05}, {t:tEnd, scale:1.0}] }`
- Incoming shot (the only scale<1 start in the piece): `{ lead: 16, path: [...pullBackIn(leadSec), {t:9, scale:1.0}] }`
- `pullBackIn(leadSec, {from:0.94, to:0.99, blur:4, settle:0.9})` generates two CamKeys, with the first key's `t` negative (landing inside the lead).
- The outgoing side's content dimming uses the scene's own `interpolate` (brightness/filter), or goes straight through the `<Live retireAt>` yield state machine in `life.tsx` — it already does "shrink to 0.92 + move up + brightness −66% + 3px blur."

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| Incoming start framing `inScale` | 0.90 | >0.95 the pull-back amount is too small to read as "stepping back"; <0.82 the edges expose the background (the shot layer must overfill the frame) and the settle travel is too long |
| Incoming pull-back duration `settle` | 0.90s | Longest of all six forms. <0.6s reads as "rushing the pull-back," clashing with the cool-down semantics; >1.4s the audience won't wait |
| Overlap frames `overlap` | 0.55s ≈ 16 frames | Longest of all six forms. <0.4s produces old/new ghosting (both sides' actions are so gentle they can't mask the boundary); >0.7s the two scenes smear together |
| Outgoing dim duration `out` | 0.50s | <0.3s the content snaps dark and reads as a power failure; >0.8s the audience stares at a slowly darkening frame, waiting |
| Dim depth `outDim` | 0.18 (white ground) / near-black (dark ground) | >0.4 doesn't sink far enough and reads as "slightly faded"; at 0 it becomes a solid-frame transition (a different grammar) |
| Outgoing defocus `outBlur` | 2px | Far lighter than the push-through — this form doesn't rely on speed blur, but on focus withdrawing; >5px reads as being pushed away |
| Cut lead `cutLead` | 0.05s | Smallest of all six forms: the handoff relies on "darkness," not "speed," so there's no need to pre-consume the acceleration segment |
| Pull-back landing `inSettle` | 0.99 | Landing at 1.0 then going still = hitting a wall; leave 0.01 for the hold to keep pushing |

## Known Pitfalls
- The outgoing camera is still pushing while the content is dimming: the two directions fight, reading as "this shot wasn't finished." The camera must settle first.
- Copying the push-through's 0.6s settle: it becomes "a hurried pull-back," self-contradicting the cool-down semantics. This form's slowness is its content.
- scale<1 on the incoming shot used elsewhere in the piece: once the scarcity is gone, this form is just "fade-in + slight enlargement."
- Overlap cut too short (<0.4s): both sides' actions are gentle and can't mask the boundary, producing old/new ghosting.
- Using `power3`/`back` family easing: the steep segments turn "breathing" into "an action," and the cool-down feel vanishes. The sine family is this form's grammar.
- Writing the dimming on the shot layer (pulling the whole shot's `opacity` down to 0.18 and then fading it out): that's just a double fade-out with no readable "content exiting on its own."
  The dimming must act on the content layer; the shot layer's fade belongs to the overlap envelope.
- Shot layer not overfilling the frame: at the `scale 0.90` start the edges directly leak the background color. The demo covers this with `.shot { inset:-14% }`.
- Using it in an information-advancing passage: the whole piece's rhythm collapses once, and the audience thinks the video is about to end.

## Reuse Guide
- HTML/GSAP: `demos/pullback-cool-transition/index.html`. Extract the single function `pullBack(outgoingShot, incomingShot, startSec) → endSec`
  plus the `CONFIG.pull` parameter set. **Note that the function internally does `out.querySelector(".big")`** —
  the dimming acts on the content layer rather than the shot layer; when migrating, swap that selector for your subject-plane container. Take `hold()` along with it.
- Remotion: spread `pullBackIn(leadSec)` into the incoming shot's `path` (first key's `t` negative);
  on the outgoing side the camera writes only the "settle" (no keys after the final `scale: 1.0`), with content dimming done in-scene or directly via the `<Live retireAt>` in `life.tsx`.
  The cooler color-temperature shift is configured in the `ACTS` table of `env.tsx`.
- Family relations: it is the reverse form of [[push-through-transition]] (that one settles down from scale>1, this one pulls in from scale<1);
  their incoming start directions are opposite, so **the two forms can complement each other within the same piece**: push-through for advancing passages, pull-back cool-down for settling ones.
  Difference from [[black-slam-transition]]: there the camera hard-stops for a beat (a signal); here the camera softly settles (a breath).
- Editing-software equivalents: CapCut's "camera-move transition → pull away" category plus "brightness/blur" keyframes on the previous shot;
  in AE it's the incoming shot's camera Z pushing in from afar + Easy Ease, with Exposure/Camera Lens Blur keyframes on the outgoing shot;
  in DaVinci Resolve it's often done in the same frame as a rack focus + color-temperature offset.

## Scope
- Belongs to this card: the outgoing side's **camera settle** (decelerating from the hold's slow push, `sine.out`, to stillness at `scale 1.0` — no push, no pull)
  + the **content layer's** dim-and-defocus (`opacity 1→0.18` + `blur 0→2px`, `sine.in`, acting on the subject plane rather than the shot layer);
  the incoming side's **pull-back starting at the only scale<1 in the piece** (0.90→0.99 + `blur 4→0`, `power2.out`, with `settle` at 0.90s the longest of all six forms);
  the 0.55s (≈16 frames, longest of all six forms) `sine.inOut` cross-fade overlap; the smallest cut lead (0.05s — the handoff relies on "darkness," not "speed");
  the breathing quality of sine-family easing throughout; the landing point leaving 0.01 for the hold's slow push (the camera never stops).
- Does not belong to this card: the text and coloring inside the two shots (the white/light-gray tile + gray form names are "form-identification labels," not dialogue subtitles),
  the top-left explanatory badge, **the specific visual of the dimming** (dark ground = sinking into near-black / white ground = graying out and defocusing — same semantics, different visuals),
  **the cooler color-temperature shift** (a common companion, but it lives in the `ACTS` table of `env.tsx` and belongs to the environment layer, not this card), the specific `inset:-14%` value of `.shot`.
- Migration interface: all timing lives in `CONFIG.pull` (`out`/`overlap`/`settle`/`cutLead` + `outDim`/`inScale`/`inSettle`);
  no changes needed when changing dimensions (only the scale axis is involved); scale `outBlur`/`inBlur` linearly with output resolution;
  adjust dim depth to the background (`outDim: 0.18` on white ground; on dark ground switch to brightness approaching zero) — **the dimming must hang on the content layer**;
  when moving projects, swap `out.querySelector(".big")` for your subject-plane container; `inScale` is this form's signature —
  do not start at scale<1 anywhere else in the piece.
- Background requirement: a white ground suffices. The dimming implementation varies with the background (gray-out on white, sink-to-black on dark), but it is **an in-scene content action**,
  not an overlay layer, so unlike [[overexpose-flip-transition]] there is no polarity-inversion problem. The camera curve is entirely independent of the background color.
