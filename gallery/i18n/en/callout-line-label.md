---
name: callout-line-label
title: A dot pops alight on the target and rings out a ripple → a polyline grows outward along 45°/horizontal bends → a text label reveals from a mask at the line's end; three beats strictly serial, one continuous breath
usage: When narration reaches "here / this part / these two spots", pointing exactly where to look on a screenshot or product image; review, teardown, and map-explainer tonality — calm, professional, never stealing the scene
---

## Intent
When narration says "the truly valuable parts are these two spots", the viewer's eyes need to be led to a specific position in the frame — a callout translates "pointing with a finger" into three causal beats: the dot lights up (where) → the line grows (look this way) → the label reveals (what it is).
Critical rules: **the three beats must be strictly serial** (appearing simultaneously kills the eye-guiding causality); **polyline bends use only 45° or horizontal** (the orderliness of engineering drafting; arbitrary slopes look like a sketch); **the label always appears last** (the answer must not arrive before the finger).

## Motion Core
- Dot: an SVG circle placed on the target, scale 0→1, 0.2s `back.out(2.2)`; simultaneously a same-color stroked ripple, scale 0.4→3.2, opacity 0.9→0, 0.5s `power2.out`
- Polyline: an SVG path (1–2 bends, all 45° or horizontal), `stroke-dasharray` = total length, `stroke-dashoffset` drawing from total length→0 over 0.4s `power2.out`; **its start is scheduled after the dot pop ends** (t0 + dotIn)
- Label: an HTML div attached at the line's end, `clip-path: inset()` expanding from the line-end direction, 0.25s `power3.out` (if the line comes from the right, start with `inset(0 0 0 100%)`); the inner text fades in with a further 0.1s lag over 0.2s
- Multiple callouts: the second callout is delayed 0.8s overall, aligning one by one with the narration's enumeration rhythm
- Exit: reverse retraction — label retracts first (power2.in), then the line sucks back, then the dot extinguishes, the three segments allocated by proportions of `out` (0.4/0.4/0.3); the second callout offsets a further 0.15s

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `dotR` | 7 | Dot radius in px; >10 looks like a button, <5 becomes invisible after video compression |
| `dotIn` | 0.2s | Dot pop duration; >0.35s drags, <0.1s loses the "ding" of a landing point |
| `lineDraw` | 0.4s | Polyline draw duration; >0.6s the viewer grows impatient, <0.25s the line "flashes on" with no sense of guided growth |
| `labelIn` | 0.25s | Label mask expansion duration (text always lags a further 0.1s); >0.4s reads as a curtain being drawn — too slow |
| `hold` | 1.6s | Dwell after everything is in place; align it with how long the narration spends on that selling point — talk longer, set it larger |
| `out` | 0.5s | Total reverse-retraction time (label/line/dot allocated 0.4/0.4/0.3); >0.8s the exit upstages the content |
| `stagger` | 0.8s | The second callout's delay; <0.5s the two callouts fight for attention — they must appear staggered, one by one |
| `color` | #d8383a | The annotation color shared by dot, ripple, and line (the white-background demo uses red; dark backgrounds can switch to highlight yellow); when using a brand color, keep high contrast against the underlying image |
| `callouts[]` | target/points/label | target = dot coordinates; points = bends + endpoint (place only at 45°/horizontal positions); label's x/y hugs the line end, `from` sets the expansion direction ("right" = a line that closes in from the right) |

## Known Pitfalls
- Dot, line, and label all starting at once — no "dot → line → text" causal chain; the eye doesn't know where to look first, instantly fake.
- Polyline slopes dragged freehand — bends must land on the 45°/horizontal grid, otherwise it looks like doodled scratch marks rather than an annotation.
- Label appearing before the line (the most common ordering mistake) — the answer arrives before the finger, and the leader line is reduced to decoration.
- Label sitting on top of the target itself, or the line too short — a callout must lead the text into empty space; covering the subject means the annotation is wasted.
- Using an opacity fade instead of clip-path expansion — the label loses its "growing out of the line end" directionality and disconnects from the line.

## Reuse Guide
- HTML/GSAP: demos/callout-line-label/index.html. To change copy/positions, edit only `CONFIG.callouts`: `label.html` for the label text (`<b>` main line + `<small>` supplement), `target`/`points`/`label.x/y` for coordinates, `label.from` for the expansion direction; `CONFIG.color` for the theme color; the mock phone is `.phone`, a block of pure CSS — swap in your own screenshot element. The base entrance delay of 0.6s is hardcoded inside register as `t0 = 0.6 + i * CONFIG.stagger`. The core animation is the entire `DemoShell.register` callback; copy CONFIG + the callback and it lifts out cleanly.
- Remotion port: chain the three beats with `<Sequence>`, converting `from` per `dotIn/lineDraw/labelIn × fps` frames; drive the polyline draw with `interpolate(frame, [0, lineDraw*fps], [len, 0])` on `strokeDashoffset` (`getTotalLength()` must be measured in `useEffect`/`useLayoutEffect` or precomputed and hardcoded); the dot uses `spring({frame, config:{damping:10}})` for the back.out overshoot; the label interpolates `clipPath: inset(0 ${interpolate(...)}% 0 0)`, with the text opacity delayed 3 frames.
- Editing-software equivalents: in AE this is the "Call-Out Titles" template genre; hand-built = a shape-layer polyline with Trim Paths + a text layer revealed by a moving rectangular mask; in Jianying, search stickers for "annotation/indicator line" or use line-growth footage with a caption "wipe" entrance; in CapCut search callout/annotation templates.

## Scope
- Belongs to this card: the dot's scale 0→1 pop (0.2s, back.out(2.2)) + same-color stroked ripple scale 0.4→3.2 fading out (0.5s, power2.out); the polyline's stroke-dashoffset draw from total length→0 (0.4s, power2.out, bends only at 45°/horizontal); the label's clip-path inset expansion from the line-end direction (0.25s, power3.out) with the inner text fading in a further 0.1s later; the strictly serial three-beat timing (dot → line → text, each segment's start abutting the previous end); the 0.8s overall stagger for multiple callouts; the reverse retraction (label 0.4 / line 0.4 / dot 0.3 proportional segments, power2.in).
- Does not belong to this card: the annotated product-image placeholder (the grayscale wireframe phone in the demo), the label's typography/border/font size, the example copy and coordinates, the caption line.
- Migration interface: `CONFIG.color` changes the annotation color in one place (dot/ripple/line share it; it needs high contrast against the underlying image); `CONFIG.callouts[]` changes `target` (dot coordinates) / `points` (bends + endpoint, keeping 45°/horizontal) / `label.x,y` and `label.from` (expansion direction); the four durations `dotIn / lineDraw / labelIn / hold` scale together by one multiplier per speech pace; `dotR` and `stroke-width` scale proportionally with output resolution.
- Background requirements: a white background suffices. The annotation color only needs sufficient contrast against the underlying image — on dark backgrounds swap `CONFIG.color` to highlight yellow and the label background to a dark tone; the motion timing does not change.
