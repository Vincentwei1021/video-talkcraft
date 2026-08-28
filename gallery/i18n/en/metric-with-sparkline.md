---
name: metric-with-sparkline
title: A small label fades in first, the big number rolls 0→67 over 0.9s, the small sparkline below starts at the same instant and draws in 0.6s with four data points popping in one by one behind the line tip; only on the frame the number lands do the "%" and up arrow appear — the conclusion arrives half a beat after the process
usage: When the narration reads out a metric with a direction ("efficiency improved 67%", "return rate dropped to 3%"); the "one number + how it got there" two-layer information in finance/review/retrospective segments; not for reporting a single isolated number (use number-slab-pop for that)
---

## Intent
When the narration reports a percentage, the audience actually wants two things: **what the number is**, and **how it got there**.
Give only the number (`number-counter` / `number-slab-pop`) and the audience believes it but doesn't know the trend; give only the line
(`line-chart-story-draw` / `chart-grow`) and the audience sees the trend but can't grab the repeatable number.
This card compresses both into **one motion**: the number and the curve start at the same instant, the audience's eyes bounce between the two once,
and they simultaneously get "how much" and "which way it's going."

Two critical rules:
① **The unit and arrow must not appear before the roll finishes**. If "%↑" is already on screen while the number is still ticking, the conclusion arrives before the calculation —
the audience reads it as "this number was just placed there; the rolling is decoration." The unit and arrow are the **conclusion signature** and must land exactly on the frame the number settles.
② **The sparkline and the counter start on the same instant, not one after the other**. Offset the two by even 0.2s and it reads as "state the number first, then add a chart" —
two motions. Starting together makes it one thing: `lineDur (0.6s) < countDur (0.9s)`, the curve arrives first,
the number settles last, and the gaze naturally returns from the curve to the number — the final landing point is the number that should be repeated.

Division of labor with `number-counter`: that card's subject is **the act of rolling itself** (odometer reels + large comma-grouped numbers,
the sense of magnitude in "how much money was burned"); this card's rolling is just a device to pin attention for 0.9s — the subject is
**the composite semantics of number + trend**.

## Motion Core
- **Layers** (bottom to top): white stage → small label (gray `#8a8a8a` / letter-spacing 3px) →
  big number row (`display: flex; align-items: baseline`, whole row `white-space: nowrap` +
  `font-variant-numeric: tabular-nums`) → small sparkline SVG (including one static gray baseline) → x-axis week labels.
  The host placeholder occupies the right 34%; the metric block is left-aligned inside a 96px safe margin.
- **① Label**: `opacity 0→1`, 0.16s `power2.out`, `t = 0.30` (opening rest).
- **② Counter**: from `t = 0.50`, `{v:0} → {v:67}`, 0.9s `power2.out`,
  with `Math.round` written into textContent in `onUpdate`. **`tabular-nums` is a hard requirement** —
  with proportional digits, 67 is narrower than 26, so the whole row breathes left and right during the roll.
- **④ Sparkline**: from `t = 0.50` (same value as ②, this is the critical rule), `stroke-dashoffset dashL → 0`,
  0.6s `power1.inOut`. `dashL = Math.ceil(L) + 2` (integer length: GSAP rounds the dashoffset while
  dasharray keeps decimals, and the sub-pixel gap between them leaks a small sliver of stroke at the start point).
- **Data points follow the line tip**: four dots `scale 0→1`, 0.18s `back.out(2)`, **trigger times back-computed from arc-length ratio**:
  for point i, cumulative arc-length ratio `r = cum[i]/total`, then run it through the **inverse function** of `power1.inOut`
  (`r<0.5 ? √(r/2) : 1-√((1-r)/2)`) to convert to a time ratio: `at = 0.50 + 0.6 × invEase(r)`.
  Splitting evenly by time is wrong — `inOut` is fast in the middle and slow at both ends, so evenly-split dots lag behind the line tip in the middle and run ahead at the ends.
- **③ Conclusion signature**: `landAt = 0.50 + 0.9 = 1.40`. Two things at the same instant:
  unit "%" `opacity 0→1` 0.2s `power2.out`; up arrow `y +12→0` + `scale 0.8→1` +
  `opacity 0→1`, 0.2s `power3.out`, `transform-origin: 50% 100%` (pops in from below; the arrow's
  center of gravity is at its tail). The arrow is an SVG path, not the character "↑" — font arrows have inconsistent metrics across systems and the baseline never aligns.
- **⑤ hold 1.8s**: the entire metric block sits still (no micro-motion whatsoever — data is a conclusion, and conclusions should not jiggle).
- **Single semantic color `#2fb344` (positive)**: applied only to the number, unit, arrow, sparkline, and data-point strokes.
  Label goes gray, baseline goes hairline, x-axis labels go gray.

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `countDur` | 0.9s | This card's energy knob; <0.5s reads as a hard cut (the process layer of rolling is lost), >1.4s the narration is already on the next sentence while the audience waits for a number |
| `lineDur` | 0.6s | **Must be < `countDur`** (about 2/3); when = `countDur` the curve and number settle simultaneously and two landing points fight over one beat; > `countDur` and the number settles first while the curve is still climbing — the conclusion signature is swallowed by the curve's motion |
| `countAt` | 0.5s | **Same value as the sparkline start, this card's first critical rule**; a gap >0.15s reads as "number first, chart added later" |
| `countEase` | `power2.out` | The counter's "fast then slow"; `none` reads as a machine readout (no "computed" feel), `power4.out` hits 90% in the first 1/4 and grinds the last two digits for 0.7s, reading as stuck |
| `lineEase` | `power1.inOut` | The curve's even pacing; with an `out` curve the stroke shoots out at the start and can't climb at the tail, reading as "the line was flung out" instead of "walked out" |
| `unitIn` / `arrowIn` | 0.2s | Landing duration of the conclusion signature; >0.35s the conclusion arrives too softly to counterbalance the preceding 0.9s of motion |
| `arrowRise` | 12px | Arrow pop-in displacement; 0 reads as part of the unit (losing the "up" direction), >24px the arrow becomes a motion of its own and steals the scene |
| `dotPop` | 0.18s | Data point pop; >0.3s the dots become more prominent than the line, reading as "four dots connected" rather than "one line with four ticks" |
| Data point count | 3~5 | With 6 or more, dots are too dense to read as "sequential"; at that point drop the dots and keep only the line (a trend doesn't need ticks) |
| `hold` | 1.8s | Closing freeze; the number + curve are two layers of information each needing a read, <1.2s the audience only has time to read the number |

## Known Pitfalls
- The unit "%" participates in the roll (written into textContent and changing along) — the unit is there while the number is still ticking, conclusion before calculation, instantly fake.
- Arrow enters at the same time as the number — the "up" verdict is delivered before the counting finishes, reading as fabricated data.
- Sparkline starts earlier or later than the counter — two motions; the audience's eyes must look twice, and the composite semantics of "a number + its trend" fall apart.
- Omitting `font-variant-numeric: tabular-nums` — with proportional digits every frame has a different glyph width, the whole row breathes side to side, obvious in slow motion.
- Omitting `white-space: nowrap` on the big number row — the row width changes on the frame the unit fades in, the arrow gets pushed to the next line, and the opening layout is wrong.
- Triggering data points at even time intervals — `power1.inOut` is fast in the middle and slow at the ends, so dots detach from the line tip (lagging in the middle, leading at the ends),
  reading as "the dots and the line are two animations." You must convert arc-length ratios through the easing inverse function.
- Using decimal lengths for `dasharray` / `dashoffset` — GSAP's rounding creates a sub-pixel gap between them, leaking a sliver of stroke at the start point.
- Using the character "↑" as the arrow — font arrow glyphs have different baselines and metrics across systems, never align with the digits, and the weight can't match 600.
- Adding breathing/drift to the number during hold — data is a conclusion, and a jiggling conclusion reads as "not settled yet" (the handcrafted-feel channel of design-language §4 does not apply to numbers).
- Semantic color applied to the label and x-axis labels — `design-language.md` §1 red line: positive/negative only go into charts and gain/loss annotations;
  layout elements (labels/ticks) are always grayscale.

## Reuse Guide
- HTML/GSAP: `demos/metric-with-sparkline/index.html`. **To change data, edit two places**: `CONFIG.target` (counter end value)
  and `CONFIG.pts` (sparkline points, SVG local coordinates `viewBox 0 0 400 96`, smaller y is higher); to change copy edit
  `.label` and `.xlabels` in the HTML. To flip the direction: swap `CONFIG.color` to `#d70015` (negative),
  mirror the arrow SVG path vertically (flip the y values of `M10 2 … Z` within the `viewBox`), and make `arrowRise` negative
  (a drop should fall from above). The `invPower1InOut` inverse function only holds for `power1.inOut` —
  if you change `lineEase` you must change the inverse function accordingly, or fall back to "dots at arc-length ratio × linear time" (in which case `lineEase` must also be `none`).
- Remotion port: don't build a timeline; per-frame lookup is more direct. After `frame` → seconds:
  counter `interpolate(t, [0.5, 1.4], [0, 67], {easing: Easing.out(Easing.quad), extrapolateLeft:'clamp', extrapolateRight:'clamp'})`
  then `Math.round`; sparkline via `<path strokeDasharray={L} strokeDashoffset={L * (1 - p)} />`,
  `p = interpolate(t, [0.5, 1.1], [0, 1], {easing: Easing.inOut(Easing.ease), …clamp})`;
  data-point trigger times computed **at build time** (arc-length ratios through the inverse function), not in the render.
  `clamp` cannot be omitted — without clamp, dashoffset computes values > L when t<0.5 (harmless) but the counter goes negative.
- Editing-software equivalents: JianYing/CapCut — use a "number roll" preset for the digits or hand-typed text frames (JianYing has no true rolling counter;
  the common approach is splitting 0→67 into 8~10 keyed text frames, **and you must pick a monospaced-digit font** or the width jumps),
  sparkline via "line grow" or keying dashoffset with two keys on a shape layer's "stroke" effect; the unit and arrow are **two independent layers**,
  their in-points pinned to the number's final frame (this step cannot be skipped — skipping it is this card's biggest pitfall).
  AE — number layer with Slider Control + `Math.round(effect("量")("滑块"))` expression, two slider keys 0→67;
  sparkline via Shape Layer + `Trim Paths` `End` 0→100%; data points as four layers, in-points matched by eye to the Trim Paths'
  **actual progress** at each point (in AE you can just scrub and watch — faster than computing the inverse function).
- Division of labor with sibling cards in this library: `number-counter` = the roll itself is the subject (odometer reels + large comma-grouped amounts, magnitude feel);
  `number-slab-pop` = a one-shot popped conclusion (no process); `chart-grow` = multi-item comparative bar growth;
  `line-chart-story-draw` = one line tells one story (staged reasoning + annotations);
  **this card = one number + its trend compressed into one beat** (two layers of information, one motion, one landing point).

## Scope
- Belongs to this card: the timing discipline of "counter and sparkline start on the same instant, `lineDur ≈ 2/3 countDur`"; the conclusion-signature discipline of "unit and arrow pinned to the frame the counter ends"; the implementation requirement that data-point trigger times are converted from **arc-length ratio through the easing inverse function** (not split evenly by time); the arrow's `y+12 → 0` + `scale 0.8→1` pop-in from below with `transform-origin: 50% 100%`; the layout discipline of `tabular-nums` + whole-row `nowrap`; the sparkline `dasharray` integer-length detail that prevents stroke leaks; complete stillness during hold (no micro-motion on the number).
- Does not belong to this card: the specific copy and data of "this week's editing efficiency / 67% / Mon~Thu", the green `#2fb344` (swapping to accent or negative red both work), the 86px/34px font sizes, the sparkline's 400×96 canvas size and 3px stroke width, the white-core dot style, the host (digital human) placeholder on the right, and the "metric block left-aligned at 96px" placement (centered, right-aligned, or lower-third all work).
- Migration interface: `CONFIG.target` + `CONFIG.pts` are the only content entry points; adjust energy only via `countDur`, and `lineDur` must follow to keep the roughly 2/3 ratio; scale `arrowRise` proportionally at 14% of the font size; changing `lineEase` requires changing the data points' easing inverse function in step; flipping direction requires changing three things together — `color`, arrow path orientation, and `arrowRise` sign; for portrait, shrink the sparkline width to 80% of stage width, drop the font size to 64px, and reduce data points to 3 (horizontal space is scarce; 4+ points are too dense to read as "sequential").
- Background requirement: white works. Dark backgrounds work too (number and sparkline inverted to white or swapped to `#30d158`, baseline swapped to `rgba(255,255,255,0.14)`); the only constraint is **the background must have no grid or texture** — the sparkline is only 3px wide, and high-frequency detail in the background competes with it, so the audience can't read it as a trend line.
