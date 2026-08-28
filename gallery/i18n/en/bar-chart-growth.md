---
name: bar-chart-growth
title: After the title fades in, the baseline draws from the left over 0.24s to establish the ground; seven bars rise from the baseline in a tight 0.06s stagger (reading as one continuous action rather than seven effects), and on the frame the last bar tops out, a conclusion chip pops into the whitespace above the bars
usage: Narration covering a continuous-interval growth/decline trend ("doubled in half a year", "kept climbing from January to July"); data segments that need "overall shape" rather than "item-by-item comparison"; fast-paced narration (the whole group finishes growing within 1.0s, keeping up with speech)
---

## Intent
There are two ways to read a bar chart: **item-by-item comparison** (which year is higher or lower) and **overall shape** (this line is heading up).
The library's existing `chart-grow` does the former — 5 bars, 0.13s stagger, a value on every bar top, the tallest bar highlighted in a different color;
the viewer is guided to **read bar by bar**, which is the cadence of "reciting data".

This card does the latter. The difference lies in three places; miss any one and it turns back into `chart-grow`:
- **More bars (7), tighter stagger (0.06s)** — 0.06s × 6 = 0.36s; the whole group finishes growing within 0.64s,
  which the eye reads as **one continuous rise** (like a wave sweeping across), not seven sequential events.
- **No values on bar tops** — the value of any single bar doesn't matter; what matters is the **slope** of the whole row. Hanging seven numbers on the bar tops
  pulls the viewer back into "item-by-item reading", and the shape semantics vanish outright.
- **The conclusion lands on one chip** — "Up 42%" is the sentence that will be retold; it replaces the seven values.

Two critical rules:
① **Bars use only `scaleY`**. Animating `height` triggers reflow every frame; 7 bars at 60fps will drop frames.
More importantly, `scaleY` with `transform-origin: 50% 100%` carries the semantics of "growing out of the ground";
animating height is "the bar being stretched" (the top is moving while the bottom is also being recalculated).
② **The tallest bar must reserve headroom for the chip**. The chip's `bottom` is computed from **the tallest bar's actual pixel height**
(`maxH + chipGap`), not a hardcoded CSS value — swap in a new dataset and the chip automatically rises with it, never crushing a bar top.
Hardcode it and it will inevitably get crushed one day.

## Motion Core
- **Layering** (bottom to top): white stage → title (34px/600 black) → bar-group container (`display:flex; align-items:flex-end;
  justify-content:space-between`, height = the scale range) → baseline (2px gray, `transform-origin: 0% 50%`) →
  x-axis month labels (gray 13px) → conclusion chip (absolutely positioned, `right: 0`, `bottom` computed by JS).
  The host placeholder takes the right 32%; the chart block is left-aligned at 96px.
- **① Title**: `opacity 0→1`, 0.2s `power2.out`, `t = 0.30`.
- **② Baseline**: from `t = 0.42`, `scaleX 0→1` (`origin left`), 0.24s `power2.out`.
  **The ground must exist before bars can "grow out of it"** — bars without a baseline read as "seven rectangles fading in".
- **③ Seven bars**: `t = 0.62 + i × 0.06`, each `scaleY 0→1`, 0.28s `power3.out`,
  `transform-origin: 50% 100%`. Bar heights are converted in `register` from `dataset.v / maxVal × container height`
  into **pixel heights written to style** (this step is layout, not animation); the animation moves only `scaleY`.
- **④ Conclusion chip**: `lastTop = 0.62 + 6×0.06 + 0.28 = 1.26`,
  `opacity 0→1` + `scale 0.8→1`, 0.2s `back.out(1.4)`, `transform-origin: 100% 50%`
  (expands from the right end — the chip is right-aligned and grows out of its own anchor).
  The `back` overshoot is deliberately held at 1.4 (not a cartoonish 2.2): this is "a conclusion stamped down", not "a bounce".
- **⑤ hold 1.8s**: the whole chart at rest.
- **Fixed scale range**: `maxVal = 100` throughout. Changing the range mid-way (e.g. dynamically normalizing to the current max)
  makes the comparison between bars a lie.
- **Single semantic color `#e8720c` (orange)**: only on the bar bodies and the chip. Title black, baseline hairline, months gray.
  **All seven bars share the color** — the `chart-grow` style of "tallest bar in a different color" is wrong here: recoloring = singling out one item,
  the opposite of the "look at the overall shape" intent.

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `barStagger` | 0.06s | **The card's first critical rule**; >0.1s reads as "seven effects" (back to `chart-grow`'s item-by-item cadence), at 0 the whole row stands up at once, reading as one staircase-shaped color slab being pushed up (no direction) |
| Bar count | 7 | Below 5 bars the "shape" doesn't hold (use `chart-grow` for item comparison); >10 bars the width gets squeezed under 20px and reads as a barcode |
| `barGrow` | 0.28s | Single-bar rise duration; <0.18s the bar "flashes" into place (no visible growth), >0.45s a single bar's motion overwhelms the group's stagger rhythm |
| `barEase` | `power3.out` | Strong start, gentle tail — the bar top has a "seated in place" feel; `power1.out` is too soft and reads as inflation, `back.out` overshoots the bar top and reads as a spring (data shouldn't bounce) |
| `baseDur` | 0.24s | Baseline draw; 0 (baseline present from the start) also works but loses the "establish the ground first" beat, >0.4s the viewer is waiting for a gray line to finish drawing |
| `chipGap` | 18px | Whitespace between the chip's bottom edge and the tallest bar top; <10px it visually sticks to the bar top (reads as the bar's label, not a conclusion), >40px the chip floats in space, detached from the chart |
| `chipPop` | 0.2s | Conclusion landing; >0.35s the conclusion arrives soft, unable to counter the momentum of the seven bars before it |
| `back.out(1.4)` | 1.4 | The chip's overshoot; >2 reads as cartoon bounce (a language a data card should not have), 1.0 (= no overshoot) loses the confirmation feel of "stamping down" |
| `maxVal` | 100 | The scale range, **fixed throughout**; switching to "dynamically normalize to the current max" instantly distorts bar-to-bar comparison |
| `hold` | 1.8s | End freeze; the chip's sentence must be read in full, <1.2s the viewer sees the chart but not the conclusion |

## Known Pitfalls
- Animating bars via `height` instead of `scaleY` — reflow every frame; 7 bars drop frames at 60fps,
  and with both top and bottom recalculating, it reads as "rectangles being stretched", not "growing out of the ground".
- Chip `bottom` hardcoded as a CSS value — with a new dataset the tallest bar rises and the chip lands right on top of it (this card's most common failure).
  It must be computed from the tallest bar's actual pixel height.
- Stagger widened to 0.13s while still calling it "bar-chart growth" — that is already `chart-grow`'s item-listing cadence; the overall shape can no longer be read.
- Seven values hung on the bar tops — the viewer is pulled back into "reading one bar at a time" and the shape semantics vanish; this card's only number is the one on the chip.
- Highlighting the tallest bar in another color — "singling out one item" and "seeing the overall trend" are opposing intents; recolor it and the card falls apart.
- The chip pops while bars are still growing — the conclusion arrives before the data, reading as numbers being bent to fit the conclusion.
- Forgetting the baseline and growing bars directly — seven rectangles fading in on a white background; without a "ground" there is no magnitude reference, and they read as decorative color blocks.
- Bar spacing via `justify-content: space-around` without giving x labels matching widths — bars and month labels misalign,
  visible at a glance in slow motion (in the demo both bars and labels are fixed at 44px wide with `space-between`, naturally aligned).
- Semantic color applied to the title — `design-language.md` §1 red line: positive/negative and chart colors go only into the chart body;
  titles are always ink black.
- Adding breathing/micro-jitter to bars during the hold — the data is the conclusion; jitter reads as "still computing" (beyond the frozen-frame jitter banned in §4,
  continuous micro-motion also contradicts the semantics here).

## Reuse Guide
- HTML/GSAP: `demos/bar-chart-growth/index.html`. **To change the data, edit only the seven `.bar` elements' `data-v`**
  (0 to `maxVal`); bar heights and chip placement are computed at runtime from the container height; to change copy, edit `.title` / `.grow-chip` /
  `.xlabels`. Changing the bar count: add/remove `.bar` and the matching `.xlabels span` in the HTML (the two counts must match
  for `space-between` to align), and back-solve `barStagger` from "whole group ≤0.4s" (10 bars ⇒ 0.045s).
  For a decline trend: make `data-v` descending + swap the color in `CONFIG` to `#d70015` and the chip copy to "Down 38%";
  not a single timing value changes (this card's motion is direction-agnostic).
- Remotion port: compute each bar's `scaleY` per frame; do not build a timeline:
  `const p = interpolate(t, [0.62 + i*0.06, 0.62 + i*0.06 + 0.28], [0, 1],
  {easing: Easing.out(Easing.cubic), extrapolateLeft:'clamp', extrapolateRight:'clamp'})`,
  styled as `transform: scaleY(${p})` + `transformOrigin: '50% 100%'`.
  `clamp` cannot be omitted — without it, `t` before the start computes a negative `scaleY` and the bar flips out below the ground.
  The chip's `bottom` is computed in the component as `Math.max(...values) / maxVal * chartH + chipGap` (same formula as the demo).
  The baseline uses `scaleX` + `transformOrigin: 'left center'`.
- Editing-software equivalents: Jianying/CapCut — seven rectangle shape layers, each with two "Scale Y" keyframes (0→100%),
  **the anchor must be dragged to the rectangle's bottom edge** (Jianying defaults to center anchor — growing from the middle outward is a completely different effect),
  and push each layer's in-point back by 0.06s (about 2 frames @30fps); the chip is one layer with a "scale pop-in".
  Manually arranging seven layers × 2 frames in Jianying is tedious, but **the stagger value must not be widened for convenience** — it is this card's critical rule.
  AE — seven Rectangles inside one Shape Layer, or use the `Scale` property + `Anchor Point` moved to the bottom edge;
  the lazier route is seven layers run through `Sequence Layers` (Keyframe Assistant) with a 0.06s offset;
  the chip uses two `Scale` keyframes + `Easy Ease` with the handles pulled out for a slight overshoot (≈ `back.out(1.4)`).
- Division of labor with sibling cards in this library: `chart-grow` = 5-bar item comparison (0.13s stagger, values on bar tops, tallest bar highlighted in a different color —
  "reciting data"); `line-chart-story-draw` = one line telling a story (segment-by-segment reasoning + annotations + comparison dashed line);
  `metric-with-sparkline` = one number + its trend; `number-slab-pop` = reporting a single conclusion number;
  **this card = the overall shape of a continuous interval** (many bars, tight stagger, no bar-top values, conclusion on one chip).

## Scope
- Belongs to this card: the `barStagger 0.06s` stagger magnitude that is "tight enough to read as one continuous action"; the implementation discipline that bars move only via `scaleY` + `transform-origin: 50% 100%` (refusing to animate height); the order of "baseline draws first, bars rise after"; the subtraction of **seven same-color bars with no bar-top values** ("see the shape, not the items"); the conclusion chip timed to pop on the frame the last bar tops out, with the restrained `back.out(1.4)` overshoot; the adaptivity requirement that the chip's placement is computed from **the tallest bar's actual height** (`maxH + chipGap`); the scale range fixed throughout; complete rest during the hold.
- Does not belong to this card: the "Let the data speak / Up 42% / Jan–Jul" copy set and that ascending dataset, the orange `#e8720c` (accent blue or negative red both work), the 44px bar width and 6px corner radius, the 240px range height, the chip's 12px radius and 22px font size, the host (digital human) placeholder on the right, and the placement of "chart left-aligned at 96px, 96px from the bottom".
- Migration interface: `data-v` in the HTML is the only content entry point; when the bar count changes, back-solve `barStagger` from "whole group rises in ≤0.4s" (`0.4 / (n-1)`); take bar width as available width ÷ (bar count × 1.9) (leaving roughly equal gaps); scale `chipGap` at 40% of bar width; take the range height at 45% of stage height; for a decline, change only data and color, timing untouched; for vertical video, cut to 5 bars and raise bar width to 56px (horizontal space is scarce — 7 bars in portrait get squeezed under 26px).
- Background requirements: a white background suffices. Dark backgrounds work (swap bar color to a dark-background orange like `#ff9f0a`, baseline to `rgba(255,255,255,0.14)`, title to white); the only constraint is **no horizontal gridlines in the background** — bars would repeatedly intersect the gridlines while growing, reading as "the bars are flickering". If you must have a grid, push it below 3% contrast, or simply drop it (this card's magnitude reference comes from the baseline; it needs no grid).
