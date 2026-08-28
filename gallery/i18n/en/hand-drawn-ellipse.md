---
name: hand-drawn-ellipse
title: A crooked ellipse drawn counterclockwise in one stroke circles the key phrase — 0.5s to draw 1.08 turns so the tail overshoots the start by 8% and crosses it; only after the circle completes does the phrase punch 1.06→1 once, then hold still for 1.8s
usage: When the narration says "this is the point" or "remember this word" — moments that **single out one phrase**; opinion, methodology, and sharp-commentary narration; the emphasis tier stronger than a double underline but more restrained than exploding type; not for circling whole sentences (the circle's semantics are "just these few words"; circling a full line reads as box selection)
---

## Intent
"Circling it" is the most **human** of all emphasis gestures — it has a definite stroke order, a start and an end, and it can never come out perfectly round.
The library's `scribble-annotation` already has a circle, but its context is **annotating footage** (circling a price in a screenshot, circling a button),
drawn as three strokes with the circle just one of them; this card pulls the circle out on its own, changes the context to **circling a phrase in the narration**,
and adds one thing scribble-annotation doesn't have: **after the circle completes, the circled phrase moves once itself**.

That punch beat is this card's core information. The circle alone is "I'm pointing here"; the punch is "and it matters" —
two pieces of information delivered on two beats: the viewer's attention is first led to the position by the circle, then the intensity is confirmed by the punch.
Delivered together (circle and punch at once) it muddles: it reads as "the text got bumped by the circle" — the causality reversed.

Two vital constraints: ① **It must overshoot and cross** (draw to 1.08 turns, radius expanding 5.5% per lap so the tail lands outside the start).
A perfectly closed ellipse is instantly a vector shape — a hand-drawn circle never closes; this is a common-sense-level authenticity test;
② **Punch only after the circle completes** (with a 0.06s breath between). Simultaneity loses that before-and-after relationship.

## Motion Core
- **Circle layer = a full-screen SVG over the text** (`viewBox="0 0 960 540"`, `pointer-events:none`),
  `fill:none` + `stroke-linecap/linejoin: round`
- **Coordinates bind to the circled element, never hardcoded**: tag the target DOM with `data-ink="key"`, and at runtime measure its
  **ink box** with canvas `measureText` (`actualBoundingBoxAscent/Descent` + baseline — not the line box; the line box carries
  line-height padding above and below, and circling by it puts the whole circle a notch too high). Circle center = ink center, radii = half-width/half-height + pad
- **The crooked ellipse's four imperfections** (the entire handmade feel lives here; not one can be dropped):
  - `turns: 1.08` — draw 1.08 turns, the tail overshooting by 8% (vital constraint ①)
  - `grow: 0.055` — radius expands 5.5% per lap, landing the tail **outside** the start instead of on top of it
  - `tilt: -3.5°` — a static overall tilt (not motion — a shape property)
  - `wobble: 3.4` — deterministic sinusoidal radius undulation of ±3.4%
    (`0.62·sin(3.7a+seed) + 0.38·sin(9.1a+seed·2.3)`, **no `Math.random`**)
- **Major-to-minor axis ratio ≈3.4:1** (set by the text box: `padX: 26` / `padY: 15`). **Horizontal pad must be a notch larger than intuition says** —
  the ellipse has already narrowed at text height; at padX <16 the circle's left and right waists cut into the first and last characters
- **One counterclockwise stroke** (`dir: -1`, `startAngle: -145°` ≈ starting at the upper left): the natural circling direction for a right hand
- **A single path at constant 3.2px stroke width** (`stroke-linecap: round`): **no pen-pressure simulation** —
  the layered-stroke / tapered-width approach (thick pen-down, thin lift-off) measurably produces erratic width and looks worse than an even line.
  The handmade feel is delegated entirely to the **shape layer** (1.08-turn overshoot cross + per-lap expansion + static tilt + radius undulation);
  stroke width takes no part in the performance
- **Timing**: `dashoffset` full length→0, 0.5s `power2.out` (fast pen-down, slow lift-off; constant speed is instantly fake)
  → 0.06s breath → phrase `scale 1.06 → 1`, 0.22s `power3.out` (`transform-origin: 50% 55%`)
- **The circled phrase must be an independent `inline-block`**: the punch may act only on it, never re-flowing the whole line
- **Hold clean and still once drawn**: this library's finalized rule — **no line boil / no stop-motion jitter** (design-language.md §4)
- **Layering**: white stage → text (two lines, upper line in a dim solid) → circle SVG layer → host placeholder (right 30%)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `turns` | 1.08 | **This card's first vital constraint**; =1.0 the circle closes exactly — instantly a vector ellipse-tool shape; >1.3 two laps read as "crossing out/negation" (the opposite semantics); 1.05~1.15 is the sweet spot of "one hand-drawn lap" |
| `grow` | 0.055 | Per-lap radius expansion; =0 the tail lands on the start (the overshoot is invisible — it just looks drawn thick); >0.12 the tail flings too far and reads as two non-concentric circles |
| `punchGap` | 0.06s | **This card's second vital constraint**; =0 circle and punch coincide, reading as "the text got bumped by the circle"; >0.25s the two events decouple and the punch reads as an independent second emphasis |
| `punchScale` | 1.06 | Punch amplitude; <1.03 invisible (then why do it); >1.12 reads as a bounce — this card is "a stress confirmation", not "a pop-out" |
| `padX` / `padY` | 26 / 15 | The circle's fit; **padX <16 and the circle's side waists cut into the first/last characters** (the ellipse has already narrowed at text height); padX >40 the circle goes slack, reading as "boxing an area", not "circling these words" |
| `tilt` | −3.5° | Static tilt (a shape property, constant throughout); =0 too upright, reads as a graphic; >8° reads as pasted crooked |
| `wobble` | 3.4 (radius ±3.4%) | Undulation amount; =0 is a perfect ellipse; >7 the outline starts to ripple, reading as a shaking hand, not a drawn circle |
| `startAngle` / `dir` | −145° / −1 | Pen-down angle and direction; starting at due right (0°) or due bottom (90°) reads as a machine start point; upper-left counterclockwise is the most natural right-handed circling |
| `draw` | 0.5s | Draw time; <0.3s the stroke order and direction are invisible (the circle "flashes" in); >0.8s viewers are waiting for a circle to finish |
| `ease` | power2.out | Fast pen-down, slow lift-off; `none` (constant) instantly reads as a loading spinner; `power2.inOut` also works (a more "slowly lifting the pen" feel) |
| `width` | 3.2px (3~3.5) | The circle's constant stroke width (one value throughout, **no thickness variation**); <2.5px reads as a UI stroke (no ink weight), >4.5px a heavy circle bites into the text |
| `hold` | 1.8s | Final freeze; the circled phrase is this card's destination — size it to character count (about 0.3s per character) |

## Known Pitfalls
- The circle closing exactly — the most fatal one. A closed ellipse is instantly a vector shape; "someone drew this circle" simply vanishes.
  It must overshoot 5%~15% with the tail landing outside the start (via `grow`).
- Circle and punch happening together — the before-and-after is this card's second piece of information. Together, it reads as "the text got bumped by the circle" — causality reversed.
- Using an `<ellipse>` element + `stroke-dasharray` for the draw-on — that's a perfect ellipse; `turns`/`wobble`/`grow`
  are all three impossible. It must be a path computed from sample points.
- Copying `padY`'s value into `padX` — the ellipse has already narrowed at text height; with equal pads the side waists are guaranteed to cut into the first/last characters.
  Horizontal pad should exceed vertical by 60%~80%.
- Computing the circle center from the line box (`getBoundingClientRect()`) — a 27px font's line box is a dozen px taller than the glyphs; the circle sits high overall,
  its lower edge crossing through the middle of the text. Use the canvas `measureText` ink box.
- Punching a phrase that isn't wrapped in its own `inline-block` — the scale drags the whole line (even triggering reflow),
  and circle and text instantly misalign.
- **Simulating pen pressure (thick pen-down, thin lift-off) — removed by user decision 2026-08-25**. Whether via layered dasharray strokes
  or a `stroke-width` tween, on a still frame it's **erratic line width**, reading as "drawn crooked / misaligned stroke" —
  worse than a constant-width even circle. This card's handmade feel lives in **shape** only (overshoot cross + per-lap expansion + tilt + radius undulation);
  stroke width stays constant at 3.2px throughout.
- Constant-speed drawing — reads as a loading spinner, not a human hand. (Keep the draw's speed curve; only the **width** may not vary.)
- Adding line boil / stop-motion jitter after drawing — a finalized prohibition in this library (design-language.md §4).
- Normal body-text line spacing (under 1.9) — the circle's edges extend by `padY`; too-tight spacing makes the circle bite the line above.
  The line carrying this card needs 2.3+ line spacing.
- Circling a whole sentence — the circle's semantics are "just these few words". Circling a full line reads as "box-selecting a region" —
  that's `outline-box-title`'s (machine-drawn frame) language; don't mix the two.

## Reuse Guide
- HTML/GSAP: demos/hand-drawn-ellipse/index.html. **Changing the circled target needs no coordinate edits**: add
  `data-ink="key"` to the target element (all geometry is measured from the DOM; change copy/font size and the circle follows).
  Fit via `padX/padY`, shape via `turns/grow/tilt/wobble/seed`, rhythm via `draw/punchGap/punchDur`,
  stroke width via `width` (a constant), color via `color`. Core logic = `CONFIG` + `inkBoxOf()` +
  `ellipsePath()` + `smooth()` + `inkStroke()`, liftable as a block; `inkStroke()` is equivalent to
  `scribble-annotation`'s `drawStroke()` (both are single-path constant-width dasharray draw-ons).
- Remotion port: pre-generate `d` with the same `ellipsePath()` outside the component (pure function, no randomness → perfectly frame-consistent).
  Draw-on via `@remotion/paths`' `getLength()` for `L`, single path:
  `strokeWidth = 3.2` (constant), `strokeDasharray = L`, `strokeDashoffset = L·(1 − p)`,
  `p = interpolate(frame, [s, s+drawF], [0,1], {easing: Easing.out(Easing.quad), extrapolateLeft:"clamp", extrapolateRight:"clamp"})`.
  Punch via a second `interpolate(frame, [s+drawF+gapF, s+drawF+gapF+punchF], [1.06, 1], {easing: Easing.out(Easing.cubic)})` driving `scale`.
- Editing-software equivalents: AE = pen-draw a **deliberately unclosed, tail-overshooting** ellipse path (shape layer) +
  Trim Paths End 0→100% (0.5s, `Easy Ease Out`); stroke width fixed at 3.2px
  (**no** tapered strokes / layered strokes to fake pen pressure);
  punch as two Scale keys 1.06→1 on the text layer, starting 2 frames after the draw ends.
  JianYing/CapCut have no draw-on channel: from "Stickers → hand-drawn circle/scribble circle" pick the **tail-overshooting** one (choose a static jitter-free frame),
  place it on the phrase, approximate the entrance with "Zoom" (scale 0.9→1, 0.4s), then add a "Scale" keyframe on the text layer for the punch.
  **Never use "circular mask + stroke"** — that is guaranteed to be a perfect ellipse.
- Division of labor with same-family cards: `scribble-annotation` = circle/line/arrow, three serial strokes annotating **positions inside footage**
  (context: "looking at this image together with you");
  `outline-box-title` = a machine-drawn rounded frame (constant inOut, exact closure — "box selection", not "hand-drawn");
  **this card = a one-stroke hand-drawn circle on a single phrase + a punch after the circle** (the only emphasis card with the two-beat "circle, then confirm").
  It and `outline-box-title` are a deliberate contrasting pair: **the same "enclose" action, hand-drawn vs machine-drawn, are two languages** —
  use only one per screen. The test of hand-drawn is **shape imperfection** (overshoot cross, tilt, undulation), not stroke-width variation.

## Scope
- Belongs to this card: **the overshoot cross** (`turns 1.08` + `grow 0.055` landing the tail outside the start) — the entire source of the card's authenticity; the two-beat timing of **punch only after the circle completes** (the `punchGap 0.06s` breath may not be 0); the `dashoffset` full-length→0 draw-on at 0.5s `power2.out` (fast pen-down, slow lift-off; constant speed kills it); the implementation discipline of **a single path + constant 3.2px stroke width** (`linecap round`) — handmade feel in shape only, **no pen-pressure simulation** (measured erratic width; removed by user decision 2026-08-25); the placement discipline of binding the circle center to the target's **ink box** center with radii = half-width/half-height + pad and **padX a notch larger than padY**; the crooked ellipse's four imperfections (1.08 turns / per-lap expansion / static −3.5° tilt / sinusoidal radius undulation) and the determinism requirement of **no `Math.random`**; the punch amplitude 1.06 with `transform-origin: 50% 55%` (center of mass slightly low, so the text doesn't drift up on settle); the circled phrase as an independent `inline-block`; clean stillness once drawn — no line boil / stop-motion jitter; and the layering of the circle SVG above the text with `pointer-events:none`.
- Does not belong to this card: the demo's two specific lines of copy, the 28px size and 400/600 weights, the upper line's dim-solid layout choice, the orange `#e8720c` value (same hue family as reference image ③; any accent works), the white stage, the right-side 30% host (digital human) placeholder, the "two lines in the left white area" placement, and the 2.4 line spacing (that is the **layout precondition** for giving the circle room — not motion).
- Migration interfaces: `color` is the sole color entry (the screen's only "look here" color); `padX/padY` and `width` **scale proportionally** with the frame (values at 960 wide ×2 for 1080p), while `wobble/grow/turns/tilt` are **ratio/angle constants — never touch them when resizing**; rhythm — `draw/punchGap/punchDur/startDelay/hold` — is frame-independent and follows only speech pace; change the circled target by editing `data-ink` alone; when the target isn't DOM (text inside video/image footage) replace `inkBoxOf()` with a hand-filled `{x, y, w, h, cx, cy}` — `ellipsePath()` needs no change. For phrases over 8 characters, pull `padX` in to 18~20 (a long box's axis ratio is already flat enough; no extra horizontal allowance needed).
- Background requirements: white works (marker orange on white is this card's native context). On dark backgrounds swap `color` for a high-luminance value (`#ff9f45` tier) and raise `width` from 3.2 to 3.8 — dark backgrounds eat the visual weight of thin lines, and a 3.2px circle runs light on dark.
