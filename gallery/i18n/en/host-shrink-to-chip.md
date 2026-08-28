---
name: host-shrink-to-chip
title: When a graphic takes the stage, the speaker shrinks from fullscreen into a circular avatar chip in the corner over 0.4s while continuing to talk, and the graphic enters from the opposite side with a 0.15s offset to take its place — the handoff is one-way; the lead steps aside but the person never disappears
usage: Every handoff where the narration switches from "let me tell you" to "let me show you a chart/data/screenshot"; long explainer, finance-breakdown, and tutorial narrations that need to bounce back and forth between person and graphic repeatedly
---

## Intent
The two most common ways to bring a graphic on stage both lose something: **cutting away from the person** (the frame shows only the graphic, the speaker vanishes into thin air, and the narration becomes a voiced-over PPT)
or **stacking the graphic on top of the person** (neither is the lead, and the viewer can't see either clearly). Shrink-to-chip offers a third path — the person actively shrinks into a corner badge,
yielding center stage to the graphic, but their expression, lip sync, and gestures stay live throughout, so the viewer always knows "this person is the one explaining this to me". Three critical rules:
1. **The person inside the chip must keep moving**: after shrinking, never swap in a static headshot/freeze frame — that reads as "the person left and pinned up an ID photo", which is faker than cutting away.
2. **Yielding and taking the stage must be offset**: the person moves first, the graphic enters 0.15s later — two leads entering and exiting on the same frame fight each other on screen and read as "a stutter".
3. **Position is hard-locked during the chip phase**: the chip may not drift, breathe, or change position. The whole point of yielding is "I'm not stealing the scene" — the moment the chip moves, that's all undone.

## Motion Core
- Layering: graphic lead (z2) → person crop window (z3) → chip stroke (z4) → captions (z5)
- **Engineering structure**: crop window (`clip-path`, geometry locked in stage coordinates) + inner person layer (`transform: scale/x/y`).
  Both layers are driven by **the same progress value t** (0 = fullscreen lead, 1 = corner chip), written together inside `onUpdate` —
  splitting them into two tweens will desync the easing and push the face out of frame mid-shrink
- Shrink (t 0→1): `clip-path: inset(...)` interpolates from `inset(0)` to the chip's four-side inset + `round r` (the corner radius grows to r in sync
  to yield a true circle), while the person layer goes `scale 1→0.72` + translation. `transform-origin` sits at the **framing anchor** (50% / 32.4% of screen height,
  slightly below head center, so the framing includes the shoulders); translation = chip center − anchor, and since scaling pivots on the anchor, the translation is simply the difference between the two points
- Duration 0.42s (0.35~0.5), `power2.inOut` — ease both in and out; this is a "yield", not a "bounce"
- Chip diameter = 18% of screen width, **it must land in the bottom-left or bottom-right corner** (user-finalized 2026-08-27: chip center within the bottom 1/3 band,
  bottom edge hugging the 96px action-safe margin; v3 testing showed a center at 66% height was judged "too high"); inset amounts are 4.2% of screen width / 6.3% of screen height;
  a 1px #e0e0e0 stroke fades in over 0.2s at the 55% mark of the shrink
- Graphic lead: starts 0.15s after the shrink begins, slides in 90px from the **opposite side** (person chip on the left → graphic from the right) + fade in, 0.45s `power3.out`
- Chip phase: position fully locked; the only thing moving on screen is the person inside the chip (still narrating)
- Return (optional, decided by the application side): when the person needs to return, the graphic exits first (`power2.in`, faster than its entrance), and the person starts 0.12s later,
  scaling back up with t 1→0 on the same easing reversed; doing it in the opposite order (person enlarges first) squashes the graphic that hasn't exited yet. The demo doesn't show the return — the yield defaults to one-way

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `shrink` | 0.42s | A "yield" at 0.35~0.5; <0.3s looks like being kicked out of frame, >0.6s makes the viewer anxious waiting and the graphic arrives late |
| `chipRatio` | 0.18 | Chip diameter / screen width. <0.12 the face is too small to read expressions — it's just an icon; >0.26 the yield is incomplete and still crowds the graphic's space |
| `chipScale` | 0.72 | Person-layer scale during the chip phase, controls the framing inside the chip. Larger = big-head close-up (face spills over the circle edge); smaller = full-body thumbnail (face too small) |
| `anchorY` | 0.324 | Framing anchor height / screen height. Smaller shifts the framing up to just the head; larger pushes the face out of the chip's top edge — the first value to re-tune when swapping footage |
| `gfxLag` | 0.15s | Graphic's offset relative to the shrink start. 0 = two leads fighting on the same frame, reads as a stutter; >0.4s leaves a beat of "empty stage" in between |
| `hold` | 2.0s (demo) | In production = the real duration of explaining that graphic, extendable at will; <1.5s the person returns before the viewer finishes reading the graphic — the shrink was for nothing |
| `gfxOut` / `restoreLag` | 0.28s / 0.12s | Graphic exits first, person enlarges after — that ordering is this card's closing grammar; `restoreLag` at zero = the person shoves the graphic out, reads as scene-stealing |
| `restore` | 0.42s | Just mirror `shrink`; deliberately slowing it (0.6s) gives a ceremonious "taking back over" feel |

## Known Pitfalls
- **Swapping in a static headshot/freeze frame inside the chip** — a motionless person means the person already left; faker than a straight cut-away (lips stop but the voice continues).
- **Cutting away from the person then fading in a chip** — one frame of continuity breaks in the middle; viewers read it as "two shots", and the shrink's "same person" semantics are entirely lost.
- **Person and graphic entering/exiting on the same frame** — two leads grabbing attention at once; it feels like "a stutter", not a handoff.
- **Letting the chip drift/breathe/relocate during the chip phase** — the semantics of yielding is "I'm not stealing the scene"; the moment the chip moves, the viewer's gaze snaps right back.
- **Scaling without cropping (scale only)** — the person layer just shrinks into "a tiny figure hovering in the corner"; without the chip boundary it's not an "avatar badge".
- **Splitting the crop window and person layer into two tweens** — the easing desyncs and the face squeezes out of the round window mid-shrink; instantly reads as a bug.
- **(If doing a return) enlarging the person first** — the graphic that hasn't exited yet gets squashed behind the person; reads as scene-stealing rather than taking over.
- **Placing the chip in the caption zone or on the side the graphic needs** — yielding your spot onto someone else is not yielding at all.

## Reuse Guide
- HTML/GSAP: demos/host-shrink-to-chip/index.html. The core is the single `setHost(t)` function + the top-level `CONFIG`;
  copy it out together with `lerp` and it's portable. Swapping footage only requires re-tuning `anchorY` / `chipScale` to center the face inside the chip.
  To switch the chip between bottom-left and bottom-right, change `chipInsetX` (and negate the graphic's `gfxSlide` to keep the opposite-side entrance); final placement is bottom corners only;
  for a "bottom rounded card" variant: change `chipRatio` to a 1/3 width ratio, change `round r` to a fixed 12px radius, and shift the anchor down accordingly.
  The graphic card (`.gfx`) is a whole block replaceable with any content.
- Remotion port: `const t = interpolate(frame, [d, d+shrinkF], [0, 1], {easing: Easing.inOut(Easing.quad),
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})`, and the same `t` computes both the outer `clipPath` string and the inner
  `transform` (`scale(lerp(1, chipScale, t)) translate(...)`) — frame-driven means naturally synced and seek-safe;
  use `<OffthreadVideo>` for the keyed person footage with `muted={false}` so the narration continues through the chip phase;
  (if the application side does a return) a second `interpolate` runs backward to 0 from `outAt+restoreLag`.
- **Segmented-cutout variant (B-roll shots only, user-finalized 2026-08-27)**: when the thing taking the stage is a B-roll clip rather than a graphic card,
  the badge doesn't have to be a round window — use segmentation (`colorkey` for green screen, RVM/SAM-family person segmentation for live footage) to get an alpha,
  **keep the person's real silhouette** and paste them directly into the B-roll's bottom-left or bottom-right corner, reading as "the person standing in front of the footage while talking".
  Division of labor with this card's round-window route: footage keys poorly, or you only need the single fact "this person is speaking" → round window (the boundary eats the fringing);
  the person's gestures matter, or you want a keynote-style live presence → segmented corner paste. The two routes fully share the shrink timing, the 0.15s offset, the position lock, and
  the "person in the badge must keep moving" discipline — all four rules. Selection and placement guidance is in `references/host-footage.md`
  "Host footage on screen with B-roll". Note the segmentation route has no `clip-path` safety net: if the frame edge clips the person, **move the whole person inward**
  or narrow the B-roll — never uniformly shrink the person.
- Editing-software equivalents: JianYing/CapCut — add "Mask → Circle" on the person track, keyframing mask size/position and the footage's scale/position **in the same segment**
  (they must be keyed simultaneously, otherwise the face exits the frame), with "ease in-out" easing; AE — put a Mask or a Shape Layer Alpha Matte on the person layer,
  keyframe Mask Path + Scale + Position on the same frames with Easy Ease, or parent everything to a Null and key one layer only;
  FCPX — circular mask in "Transform/Crop" + Transform keyframes.

## Scope
- Belongs to this card: the person layer's **shrink** from fullscreen to corner chip — the crop window's `clip-path` four-side inset + corner radius growing to r in sync, plus the inner `scale 1→0.72` + translation, all driven by **the same progress t** (0.35~0.5s, `power2.inOut`, `transform-origin` on the framing anchor); the offset relationship where the graphic lead slides in from the **opposite side** 0.15s later to take the stage; the hard constraint of "position locked, person keeps narrating" during the chip phase. The yield defaults to one-way; the return belongs to the application side's next beat (when done, follow the "graphic exits first → person enlarges after" order).
- Not part of this card: the graphic card's content/layout/grayscale-wireframe styling (the bars' own growth motion belongs to the chart-grow card), caption copy, the chip stroke's color and weight, the host footage itself (the demo injects a digital human via demo-shell, which is demo context), and the specific choice of bottom-left vs. bottom-right for the chip
(but "must be a bottom corner" is a hard constraint, not a portable option).
- Portability interface: the geometry is all **ratios** — `chipRatio` (diameter/screen width), `chipInsetX/Y` (margins/screen width·height), `anchorX/Y` (framing anchor/screen width·height), so changing aspect ratio or size requires no code changes; when swapping person footage, tune `anchorY` + `chipScale` to align the framing; set `hold` to the real narration duration; after changing chip placement via `chipInsetX/Y` you must negate `gfxSlide` to keep the "opposite-side entrance"; for the bottom rounded-card variant, replace `round r` with a fixed corner radius and change the aspect ratio.
- Background requirements: a white background is fine, but **the chip must have a visible boundary** — on white with light-colored clothing, that 1px #e0e0e0 stroke is the only boundary line; remove it and the "avatar badge" becomes unreadable (on dark backgrounds switch to a light stroke, or rely purely on luminance contrast and drop the stroke).
