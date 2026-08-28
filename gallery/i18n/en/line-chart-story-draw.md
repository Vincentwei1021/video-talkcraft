---
name: line-chart-story-draw
title: The history segment is on screen from the start; when the narration reaches the hypothesis, new line segments stroke-grow rightward from the pivot over 0.4~0.8s, a ▲5% label + arced arrow pop the instant a segment completes, a dashed comparison line then forks a second future from the same pivot, and vertical color bands finally veil the relevant intervals one by one
usage: Narration doing "if back then… then today…" hypothetical reasoning, computing two futures from one starting point, or discussing an interval's correlation; the calm-deduction tone of finance breakdowns, policy retrospectives, and investment math
---

## Intent
When narration runs a hypothetical, a line drawn all at once is a spoiler — viewers who see the endpoint stop listening to the reasoning. Segmented growth splits
"one line" into "one segment per sentence": the history segment stands on screen first as the factual baseline, the line grows rightward from the pivot only when the hypothesis is spoken,
the dashed comparison forks from the same pivot, and the divergence of two futures is measured directly by the eye. Critical rules:
**the history segment never grows** (it is established fact; growing with the rest reads as "I made the data up too"),
**each segment is strictly voice-triggered** (pauses must remain between segments; grown back-to-back it degenerates into a one-shot line draw),
**the comparison line must share the same pivot** (a second line from a different start instantly voids the "one start, two futures" argument).

## Motion Core
- History segment: a grayscale polyline (demo #a8a8ad, 2.6px), on screen from frame one, never moving; a vertical dashed "today" line between `bandTop/bandBottom` splits history from deduction
- Pivot: white-cored dot scale 0→1 (0.22s `back.out(2.4)`) + a same-colored stroked ripple scale 0.5→3.2, opacity 0.9→0 (0.5s `power2.out`) — the "right here" landing
- Pivot annotation: text label scale 0.7→1 + y 6→0 pop (0.25s `back.out(2)`), an arced arrow opening from its tip's origin on the same frame with scale 0.55→1, pointing at the pivot; after the annotation settles, hold another 0.35s before growth begins
- Segmented growth: each segment is an independent SVG path, `stroke-dasharray = full length`, `stroke-dashoffset` from full length→0, 0.4~0.8s per segment `power2.out` (fast attack, gentle finish = a hand drawing), **with 0.3~0.4s pauses between segments waiting for the voice**
- Segment-end label: on the frame its dashoffset hits zero, the `▲5%` label + arced arrow pop together (0.25s `back.out(2)`), the arrow pointing back at the segment's endpoint
- Endpoint value label: a chip hugging the line end (+12, −30 px offsets) follows it, the number recomputed live from `getPointAtLength().y` (`tabular-nums` prevents digit jitter)
- Dashed comparison line: a second path from the same pivot at a steeper slope; a dashed stroke can't animate dashoffset directly → wrap it in a `<mask>` holding a 16px solid stroke and animate the mask's dashoffset to reveal (0.7s `power2.out`), landing a dark hollow dot + a `gain ×2` label at the endpoint
- Interval veiling: vertical translucent color bands (demo `rgba(216,56,58,.07)`) + gray interval names at the bottom, the two fading in staggered 0.3s at 0.3s `power2.out` each, drawn on the layer **below** the polyline

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `hold0` | 0.6s | Beats of history-line stillness until the voice says "suppose"; at 0 the deduction starts before viewers have registered the facts |
| `segments[].dur` | 0.6s | Per-segment growth; <0.4s reads as a flash (no "deduction in progress"), >0.8s viewers grow impatient |
| `segGap` | 0.35s | Inter-segment pause — **the card's critical parameter**; <0.15s the segments merge into one one-shot draw and the segmented narrative zeroes out |
| `annotPop` | 0.25s | Label+arrow pop duration; >0.4s drags, <0.15s loses the "ding" of landing |
| `annotHold` | 0.35s | Pause from annotation settling to growth starting; at 0 the annotation and the line fight for the same frame and viewers don't know what to watch first |
| `altGap` | 0.4s | Pause from main line finishing → dashed line forking; without a gap it becomes "two lines at once", not "another possibility" |
| `alt.dur` | 0.7s | The comparison line slightly slower than the main line, reading as "computing it again"; faster than the main line steals the conclusion |
| `bandStagger` | 0.3s | Band stagger; simultaneous fade = one big color base, and the semantics of "veiling which intervals, one by one" vanishes |
| `growEase` | power2.out | Growth easing; `none` (constant rate) instantly becomes programmatic plotting, `back` makes the line tip overshoot the grid |
| `chipDx/chipDy` | 12 / −30 | Endpoint chip's offset from the line end; too close presses on the line, too far no longer reads as "this line end's value" |
| `scale` | yBase/vBase/yStep/vStep | The y-pixel→value linear map; changing data changes only these four numbers (full scale must stay fixed) |

## Known Pitfalls
- The history segment growing too — fact and hypothesis alike are "drawn on the spot", and data credibility zeroes out on the spot.
- Segments growing back-to-back (`segGap` too small, or one path drawn in one stroke) — this degenerates into chart-grow's polyline variant, and the card's "segmented narrative" never materializes.
- The comparison dash starting from a different point — the "same start, two futures" premise breaks; viewers read two unrelated datasets.
- Animating the dashed line's `stroke-dashoffset` directly — the dasharray is already spent on the dashes; the effect is the dashes flowing in place (like a marquee); the mask reveal is mandatory.
- Non-tabular digits on the endpoint chip — the chip's width jitters as digit counts change, reading as a trembling frame (`font-variant-numeric: tabular-nums` fixes it).
- Interval bands above the polyline layer or too saturated — the line gets veiled into mush; the veiling hides the very evidence it should frame.
- Labels appearing before their segments — the conclusion arrives before the reasoning; the suspense of step-by-step deduction is dead.

## Reuse Guide
- HTML/GSAP: demos/line-chart-story-draw/index.html. Changing data edits only `CONFIG`: `history` for the history points, `pivot` for the pivot, `segments[].pts/dur/label` for the deduction segments and their end labels, `alt` for the comparison line and its endpoint label, `annot` for the pivot annotation (`arc` defines the arced arrow by three points), `bands` for the veiled intervals, `scale` for the y→value map; all pacing lives in `hold0/segGap/annotHold/altGap/bandStagger`. The core animation is the whole `DemoShell.register` callback (two small functions, `growSeg` / `popLabel`); copying CONFIG + the callback lifts it out.
- Remotion port: one `<Sequence from={segment start frame}>` per segment, `strokeDashoffset={interpolate(frame, [0, dur*fps], [L, 0], {easing: Easing.out(Easing.quad), extrapolateRight:'clamp'})}` (measure `L` via `getTotalLength()` in `useLayoutEffect` or precompute and hard-code); segment-end labels driven by `spring({frame: frame - (segStart + dur*fps), config:{damping:10}})` on scale; the endpoint chip's position uses the same `interpolate` progress into `getPointAtLength` (pre-sample the points into an array to avoid per-frame measurement); the comparison dash keeps the mask structure, animating the mask path's dashoffset; bands via opacity interpolate + `i*bandStagger*fps` delays. **Under frame-driven timing, inter-segment pauses must be written as explicit empty frames** — don't expect the timeline to stretch on its own.
- Editing-software equivalents: AE — shape-layer polyline + Trim Paths End keyframes, one layer per segment with offset in-points (dashed segments via Trim Paths with the Stroke effect's dash toggle, or the same matte-layer reveal); JianYing — polylines only via "line growth" stickers assembled per segment; segmented narrative requires making each segment a separate asset entering in turn; CapCut — search line chart / graph animation templates, but the built-ins mostly draw in one shot, so segmentation must be cut by hand.

## Scope
- Belongs to this card (boundary with chart-grow: that card is a bar chart appearing from zero in one reveal, answering "what are these numbers"; this card is a **polyline's segmented narrative** — the chart already on stage, the fact segment motionless, only the "hypothesis" pushed out segment by segment, answering "if this, then what next"): the constraint that the history segment is on screen from frame one and never grows; the pivot dot's scale 0→1 pop (0.22s, back.out(2.4)) + same-colored ripple scale 0.5→3.2 fading out (0.5s, power2.out); each segment's `stroke-dashoffset` from full length→0 growing rightward from the pivot (0.4~0.8s, power2.out), with the segmented timing of **0.3~0.4s voice-triggered pauses between segments**; the same-frame pop of label scale 0.7→1 + y 6→0 with the arced arrow scale 0.55→1 on segment completion (0.25s, back.out(2)); the endpoint value chip following the line end with its value refreshing live from the line-end height; the dashed comparison growing from **the same pivot** at a different slope (mask reveal, 0.7s, slightly slower than the main line) + endpoint lighting and label; vertical interval bands fading in one by one, staggered (0.3s each, 0.3s stagger, layered below the polyline).
- Not part of this card: the axes/grid/ticks and the "today" divider's styling, the specific data and year copy, the labels' border/radius/type size, the caption row, the presenter window and digital-human placeholder, this specific grayscale+red palette. Neighboring cards' turf is also outside: pointing at one spot on a static frame is callout-line-label (its dot→line→text three beats are an independent action; this card's pivot annotation only serves the line's growth rhythm); emphasizing a single final value stacks number-counter (this card's endpoint chip value is a byproduct of the line-end position — it changes only as the line moves, and is not an independent count-up).
- Portability interface: all data lives in `CONFIG`'s `history/pivot/segments/alt` point tables + `scale`'s y→value map (full scale must stay fixed; rescaling midway distorts the comparison); color needs just three tokens — history gray `histColor` + main-deduction semantic color `hotColor` + comparison color `altColor` (bands use `hotColor` at 7% alpha); pacing scales with speech rate by multiplying `segments[].dur / segGap / altGap / alt.dur` by one factor; line widths, `chipDx/chipDy`, and ripple radius scale with output resolution.
- Background requirements: white is fine. On dark, lighten the history gray, invert the label backing, and switch bands to `rgba(white, .06)` — timing and growth logic entirely unchanged.
