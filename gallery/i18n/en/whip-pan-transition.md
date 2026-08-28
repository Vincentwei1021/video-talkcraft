---
name: whip-pan-transition
title: The outgoing shot flings off-frame along the horizontal axis with 8px directional blur + a 1.4° micro-rotation; the incoming shot slides back to frame center from **the opposite side of the same direction**, brakes over 0.35s, then a second-stage recovery clears the residual rotation
usage: Shot boundaries between peers — "this is A, that is B", cutting to a comparison case, cutting to another person / another market; fast-paced and variety-show tones, and the single most-used move in vertical clips
---

## Intent
The push-through handles "going deeper"; the whip pan handles "moving sideways": the two shots are narratively parallel (not progressive),
and one lateral sweep flings the viewer's gaze from A to B — spatially like a head turn, semantically like "and on the other side?".
It is the highest-energy of the six moves and the easiest to get wrong, because direction is legible: **a direction break is more jarring than a hard cut**.

The vital points for getting it right: ① **Both sides same direction** — if the outgoing shot flings left (x going negative), the incoming shot must slide back to 0 from the right (x positive);
writing "enters from the left" on both sides means two opposite sweeps spliced together, and viewers get dizzy; ② **Braking is mandatory** — 0.35s of `power3.out`
eats the speed; no brake and a dead stop = hitting a wall; ③ **The second-stage recovery clears only the rotation, not the scale** — the scale hands over to the immediately following hold to keep pushing,
otherwise the frame goes fully still the moment recovery ends: another wall hit.

## Motion Core
Time structure (`cut = at + 0.42 − 0.06`; parameters all in `CONFIG.whip`; when `dir = left`, `dist` takes negative values):

| Phase | Time | Outgoing shot | Incoming shot |
|---|---|---|---|
| Fling out | `at` → `at+0.42` | `x 0→−560` + `rotate 0→−1.4°` + `blur 0→8px`, `power3.in` | Parked at `x +560`, `rotate +1.4°`, `scale 1.06`, `blur 8px` |
| Cut point | `cut = at+0.36` | 0.30s fade-out (no ease — during the sweep everything is blurred past recognition) | 0.12s fast fade-in |
| Brake | `cut` → `cut+0.35` | — | `x →0` + `blur→0` + `rotate→+0.42°` + `scale→1.02`, `power3.out` |
| Second-stage recovery | `cut+0.35` → `+0.85` | — | `rotate →0`, `sine.out` (**rotation only**) |
| Handover | — | — | Slow push through the hold (from 1.02 another +0.04, `sine.inOut`) |

- **`cutLead` is only 0.06s**: the cut point sits nearly on the moment of maximum sweep speed — on this frame both sides are blurred into a smear,
  a natural covering frame, allowing the shortest overlap of all six moves (0.30s). Cutting earlier exposes not-yet-blurred old footage.
- **The `power3.in` → `power3.out` speed relay**: the outgoing shot accelerates out cubically, the incoming shot decelerates in cubically —
  spliced together they form one complete sweep speed curve. With `power1`/`linear` there is no "fling"; it reads as a sliding slideshow.
- **The 1.4° micro-rotation is the source of the handheld feel**: outgoing rotates −1.4°, incoming settles from +1.4° to +0.42° then back to 0.
  Pure x displacement reads as a mechanical dolly; rotation past 3° becomes a barrel-roll effect. Note the rotation direction must flip along with `dir`.
- **The incoming shot starts at `scale 1.06`**: the swept-in frame is slightly larger, settling to 1.02 at the brake — building a hint of depth into the horizontal move,
  so "braking" decelerates along two axes at once, more like a real camera.
- **Displacement of 560px @ 960 stage width ≈ 0.58 screen widths**: when resizing, convert by screen-width ratio — never copy the pixel value.

Remotion equivalent (`template/motion-systems/transitions.tsx`):

- Outgoing shot (`dir` must match the incoming side): `{ tail: 9, path: [{t:0, scale:1.02}, ...whipOut(tEnd, {dir:'left'})] }`
- Incoming shot: `{ lead: 9, path: [...whipIn(leadSec, {dir:'left'}), {t:9, scale:1.0}] }`
- `whipIn` already negates the direction internally (starting at `x: -sign(dir) * dist`), so **passing the same `dir` on both sides** is same-direction; passing opposite `dir`s is the direction break.
- It generates three CamKeys: start (off-frame + blur + rot + scale 1.1), `brake` (x=0, blur=0, 30% residual rot), `brake+0.65` recovery (rot=0, scale=1.0).

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| Fling duration `out` | 0.42s | <0.25s only one blurred frame remains — the direction is unreadable; >0.6s reads as a "slide", not a "fling" |
| Displacement `dist` | 560px @960 width (0.58 screen widths) | <0.35 screen widths reads as a twitch; >1 screen width the outgoing shot has long exited and the tail is an empty sweep |
| Directional blur `blur` | 8px | 0 reads as a slideshow push; >14px the overlap is fully smeared and spatial continuity is lost |
| Micro-rotation `rot` | 1.4° | 0 reads as a mechanical dolly; >3° reads as a barrel-roll / glitch effect |
| Brake duration `brake` | 0.35s | No brake (direct set x=0) = hitting a wall; >0.6s reads as ice-skating, losing the sweep's decisiveness |
| Second-stage recovery `recover` | 0.50s | Omit it = the frame stays tilted; >1s feels like motion sickness |
| Overlap `overlap` | 0.30s ≈ 9 frames | The shortest of all six moves — the sweep's blur frames are themselves the cover; >0.5s two blurred frames stacked look dirty |
| Cut lead `cutLead` | 0.06s | Larger → exposes not-yet-blurred old footage; 0 → the cut lands after deceleration has begun, dulling the fling |

## Known Pitfalls
- Directions reversed between the sides (outgoing flings left, incoming also enters from the left): a direction break — viewers distinctly feel "that's wrong", worse than a hard cut.
- Forgetting the rotation must flip with the direction: displacement matched, rotation opposed — the frame looks wrenched.
- No braking, direct `set x:0`: hitting a wall; the sweep's entire decisiveness is squandered on the last frame.
- Second-stage recovery pulling scale back to 1.0 as well: full stillness the moment recovery ends — a second wall; scale must hand over to the hold.
- Using `linear`/`power1`: no acceleration means no "fling"; it reads as PowerPoint's "push" transition.
- Shot layers not overfilling the frame: the fling moment leaks the background at the edges (a white edge on white). The demo covers it with `.shot { inset:-14% }`.
- Randomly mixing left and right flings within one piece: direction should serve the narrative (timeline forward = right, flashback = left); random flipping reads as chaos.

## Reuse Guide
- HTML/GSAP: `demos/whip-pan-transition/index.html`. Extract the single function `whipPan(outgoingShot, incomingShot, startSec) → endSec`
  + the `CONFIG.whip` parameter set; to flip direction, negate `dist` and `rot` **on both sides together**,
  and the initial `gsap.set(S[1], {x: +dist})` must flip too. Take `hold()` along.
- Remotion: `whipOut(tEnd,{dir})` + `whipIn(leadSec,{dir})`, passing the same `dir` on both sides;
  `path: [...whipIn(0.30,{dir:'left'}), {t:9, scale:1.0}]`; assembly example in `MainVideo-example.tsx`.
- Family relations: swap the horizontal axis for the scale axis = [[push-through-transition]]; add an exposure accent = [[overexpose-flip-transition]];
  for "changing channels entirely" rather than "moving sideways in space", use the radial blast-blur variant below. One move per boundary.
- Frame-level compressed versions (field-tested, real vertical narration):
  - **Radial blast-blur whip** (Y17upxADWXs): the outgoing frame's radial blur explodes from center to full screen, and the incoming side converges down from high blur —
    the whip pan's **directionless version**, suited to "changing the topic's channel" rather than spatial displacement; done in 0.1~0.2s.
  - **Speed-line wipe** (from Xiao Lin Shuo · Korean stock crash): a set of same-direction speed lines (thin strips) sweeps the screen to complete the change; the lines carry the directionality
    while the camera only drifts lightly in the same direction — the lightest option, spending no camera budget.
  Both share this card's discipline: **both sides same direction**, one move per boundary; frame-level variants are so short that a direction break is even more jarring than in the standard version.
- Editing-software equivalents: Jianying "camera transitions → left/right whip"; CapCut "whip pan";
  in AE it's both sides' camera X displacement + Directional Blur + slight Z Rotation — this card has baked that hand-keying into parameters.

## Scope
- Belongs to this card: the outgoing `x 0→±dist` + `rotate 0→∓1.4°` + `blur 0→8px` fling on `power3.in`;
  the incoming shot starting from the opposite side at `x ∓dist`, `rotate ±1.4°`, `scale 1.06`, `blur 8px`, sliding on `power3.out` within the 0.35s `brake`
  back to `x=0` / `blur=0` / 30% residual `rot` / `scale 1.02`; the **second-stage recovery clearing rotation only** (`sine.out` 0.50s, scale left to the hold);
  the 0.30s overlap (shortest of the six, because the sweep's blur frames are themselves the cover) + the incoming 0.12s fast fade-in;
  strict same-direction on both sides (displacement and rotation both); the never-still slow push through the hold.
- Does not belong to this card: the text and colors inside the two shots (the white/light-gray tiles with gray move names are "labels for identifying the move", not caption text),
  the top-left explainer tag, `dist`'s specific pixel value (convert by stage width), the specific `-14%` of `.shot`'s `inset`.
- Migration interface: timing all in `CONFIG.whip` (`out`/`overlap`/`brake`/`recover`/`cutLead`);
  **when resizing, scale `dist` by screen-width ratio** (the demo uses 0.58 screen widths) and `blur` linearly with output resolution;
  **changing direction must change both sides together** — negate `dist`, `rot`, and the incoming initial `x`, all three at once (a direction break is worse than a hard cut).
- Background requirements: plain white is fine. This move carries no overlay layers; the camera curve is background-independent; the only requirement is that shot layers overfill the frame (negative `inset`) so the fling never leaks the background.
