---
name: step-timeline-vertical
title: A vertical line draws down over 0.6s; whichever node position the line reaches, that circular node pops out, and 2 frames later the two lines of text on the right slide left and fade in (three nodes at 0.18s intervals, computed by inverting the line's easing function) — after all three groups settle, the first node upgrades into an accent-colored hollow ring scaled up 1.25x, marking "you are at this step right now"
usage: Explaining processes with sequential dependencies — "three steps", "here's how I did it step by step", retrospective timelines; moments when the audience must understand "the order cannot be reversed"; also usable as "current progress" (the hollow ring points at the step in progress). Not for parallel checklists (use numbered-step-stack for those)
---

## Intent
"Three steps" can mean two completely different things. One is a **checklist**: three things all need doing, in any order; the other is a **timeline**:
step two depends on the result of step one, and the whole thing falls apart if the order is wrong. On a static frame these two look almost identical (both are three numbered lines of text),
and the audience can only tell them apart through **motion** — and this card is the "timeline" kind.

There is exactly one means of distinction: **a line is advancing, and the nodes are lit up by the line**. When viewers see the line reach the second position and
only then does the second dot light up, their brain automatically installs the causality "step two exists only after step one is done". The reverse — drawing the line fully, then popping all three dots at once —
reads as "here's a line and three dots"; the causal relationship vanishes in a second, and it degrades back to a checklist.

Two vital points: ① **Nodes must appear as the line advances** — "wherever the line reaches, that spot lights up" is this card's entire semantic content;
② **The hollow ring is the third beat, after all three groups have settled**. It answers a different question — not "how many steps" but "which step are you on";
asking the two questions separately is what makes both audible.

One incidental discipline: the kickers on the right ("Step 1 / Step 2") are dim solid `#8a8a8a`, with no opacity stacked in the resting state
(design-language §1 red line) — it's a lower-hierarchy label, not "text you haven't read yet".

## Motion Core
- **Layering**: white background → vertical line (bottom-most, `#d2d2d7` hairline tier) → three circular nodes → three text groups on the right → host layer (right column)
- **① Vertical line**: `scaleY 0 → 1`, `transform-origin: 50% 0%` (origin top), `0.6s power1.inOut`.
  `inOut` is deliberate — eased at both ends, near-uniform in the middle, reading as "time is passing" rather than "a line being flung down".
  **But the strength of the inOut directly determines the spacing between nodes** (the faster the middle section, the more crowded the three dots): `power2.inOut @0.4s` measured
  only 0.18s **total** across the three nodes (reads as simultaneous, voiding this card's semantics); `power1.inOut @0.6s` yields
  **one every 0.178s** (0.52 / 0.70 / 0.88s), which is what makes "wherever the line reaches, that spot lights up" legible.
  A stronger inOut requires a proportionally longer `lineDur` — the two are a pair and cannot be tuned separately
- **② Nodes and text follow the line (this card's implementation key)**: node i's trigger time is not an arbitrary delay, but is
  **solved from the inverse of the line's easing function**:
  - The node's position ratio along the line: `frac = nodeY / lineHeight`
  - Use bisection (40 iterations) to solve `ease(t) = frac` on `ease`, yielding the normalized time `t` at which the line reaches that position
  - Trigger time = `lead + lineDur × t`
  In other words, **changing node positions, line length, or easing never requires recomputing delays** — "wherever the line reaches, that spot lights up" always holds
- **Node pop**: `scale 0 → 1`, `0.18s back.out(1.6)` — an extremely light overshoot; it is "stamping a dot"
- **Right-side text**: `opacity 0 → 1` + `x −8 → 0`, `0.26s power3.out`, **lagging the node by 2 frames (0.067s @30fps)**.
  Dot lights first, text follows: the viewer's gaze lands on the dot, and the text is drawn out by the dot
- **③ Hollow ring upgrade (after all three groups settle + a 0.10s breath)**, three properties on the same frame with the same `0.22s power3.out`:
  - `border-width 0 → 3px` (stroke color = accent `#e0452c`)
  - `background: #1d1d1f → #ffffff` (solid dot becomes hollow ring — **the center must be truly empty**)
  - `scale 1 → 1.25`
- **④ hold 2.0s**: the three steps' text needs to be read through
- **Geometric baseline**: line length 264px, three nodes at 22 / 132 / 242px (22px reserved at each end so the line has a "head and tail",
  and nodes don't sit on the line's endpoints)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `lineDur` | 0.6s | Total line-draw duration, the card's master rhythm knob (all node trigger times derive from it); >1.0s the audience waits for the line to finish while the narration has moved to step two; <0.4s the three nodes are squeezed into lighting within 0.12s (reads as simultaneous — the "advancing" is invisible) |
| `lineEase` | `power1.inOut` | **The line's character, and simultaneously the controller of node spacing** (see above); anything `power2.inOut` and above requires bumping `lineDur` to 0.8s+ to spread out the three dots; `none` (uniform speed) reads as a progress bar (mechanical, but the most even node spacing — also usable); `power3.out` starts extremely fast = the line gets flung down (advancing feel lost, and all three dots crowd at the start); the `back` family is never allowed (a line does not bounce back) |
| `nodePop` | 0.18s | Node pop duration; >0.3s the dot is still growing while the line has moved past it (inverted causality), <0.1s reads as a hard appearance (loses the "stamping" confirmation feel) |
| `nodeEase` | `back.out(1.6)` | The only place a node is allowed to overshoot; overshoot strength >2.5 reads as jitter on a 14px dot; switching to `power3.out` also works (more sober) |
| `textLag` | 0.067s (2 frames) | **Vital point**: how much the text lags the node; 0 makes dot and text appear together (reads as "a group of things fading in at once", the gaze has no landing spot), >0.2s the two disconnect and read as four separate animations |
| `textShift` | 8px | The leftward-entry displacement of the text; 0 leaves only fade-in (usable but flatter), >20px reads as text flying in horizontally (upstaging the node's "stamp") |
| `ringDelay` | 0.10s | The breath between "three groups settled" and the hollow-ring upgrade; 0 reads as "the first node happens to be special" rather than "currently on step one", >0.4s the two beats disconnect |
| `ringScale` | 1.25 | Hollow-ring scale factor; <1.1 the "upgrade" isn't visible, >1.5 the ring exceeds the text line-height and reads as a circular sticker dropped on the line |
| `ringWidth` | 3px | Ring stroke width (node diameter 14px ⇒ 21%); <2px the hollowness is invisible at 540h, >5px the ring's center smears (turning back into a solid dot) |
| Node count | 3~4 | 3 is the most comfortable ("three steps"); >5 the line must lengthen and line-heights compress, nodes and text start crowding each other — switch to `numbered-step-stack` |
| `hold` | 2.0s | Ending dwell; sized by total word count (three groups × two lines ≈ 0.6s per group) |

## Known Pitfalls
- Drawing the full line then popping all three dots at once — the "timeline" semantics **vanish on the spot**, degrading to "a line and three dots" (a checklist).
  This is the card's only fatal mistake.
- Hardcoding node delays as `0.1 / 0.25 / 0.4` — after changing line length or easing, line and dots fall out of sync;
  in slow motion you can see "the dot lights before the line arrives" (inverted causality, which looks faker than mere desync). Must be inverse-solved from the line's easing.
- Text appearing on the same frame as the node — the gaze has no landing spot; the "dot + two lines of text" group reads as one block fading in.
  The half-frame hierarchy of "dot first, text follows" is the source of this card's polish.
- Making the hollow ring with `outline` or `box-shadow` — neither changes the element's box, so the ring smears when `scale 1.25` runs;
  it must be `border-width` growing from 0 (with `box-sizing: border-box` to keep the outer diameter constant).
- The ring upgrades but the background stays dark — "hollow" must be truly empty (background swapped to the base color), otherwise it's just "the dot got thicker".
- All three nodes upgrading into hollow rings — "current" derives from uniqueness; upgrading all three reads as "all three are in progress".
- Stacking `opacity: 0.6` on the kicker ("Step 1") to lower its hierarchy — `#8a8a8a` on white has only 4.29:1 headroom;
  stacking opacity drops it out of the readable range (design-language §1 red line); it's already a dim solid color — to go lighter, darken the background instead.
- Animating the line with `height` instead of `scaleY` — triggers reflow every frame; in slow motion you can see the line's end jittering.
- Choosing a strong `inOut` (`power2/3.inOut`) without lengthening `lineDur` — with the middle section compressed, the three nodes light up on nearly the same frame,
  and "following the line's advance" is measurably gone (`power2.inOut @0.4s`: only 0.18s spread across the three dots).
  Strong inOut and `lineDur` must be tuned together.
- Replay resets only `scale` but not `borderWidth` / `backgroundColor` — the previous round's hollow ring stays on the first node,
  so on the second playback it's a ring from the start, and the "upgrade" beat is entirely lost.

## Reuse Guide
- HTML/GSAP: demos/step-timeline-vertical/index.html. **To change content, edit the copy in `.tl-kicker` / `.tl-title`**;
  to change node positions, edit only `data-at="22|132|242"` in the HTML (pixels, relative to the top of `.tl-wrap`) —
  node trigger times and text placement are computed from it at runtime, **no delay needs editing**.
  Adding/removing nodes: duplicate a `.tl-node` + `.tl-group` pair, give the new one a `data-at`, then set `.tl-wrap`'s `height`
  to "last node + 22px". Rhythm is tuned solely via `CONFIG.lineDur` (everything else derives) —
  **when adding nodes, lengthen `lineDur` proportionally** (rule of thumb: each node needs at least 0.18s; four nodes ⇒ 0.75s).
  That `timeAtProgress()` (bisection inverse-easing solver) is general-purpose — any demo that needs "trigger child events following some animation's progress"
  can copy it directly.
- Remotion port: drive `scaleY` with `interpolate(frame, [0, lineFrames], [0, 1], {easing: Easing.inOut(Easing.ease)})`
  (`Easing.inOut(Easing.quad)` corresponds to GSAP's `power2.inOut`; using it requires raising `lineFrames` to 24+). Node trigger frames are **precomputed into a table before render**: for each `frac` run the same bisection inverse-solve to get `t`,
  `nodeFrame = Math.round(lineFrames * t)`, then `<Sequence from={nodeFrame}>`.
  Node pop uses `spring({damping: 12, stiffness: 180})`; the hollow-ring beat is three `interpolate` calls
  (`borderWidth` / `scale` / swap the background with `interpolateColors`), all with `extrapolateRight: "clamp"`.
- Editing-software equivalents: Jianying/CapCut — the line is a thin rectangle sticker + "scale (vertical)" keyframes,
  with the anchor first dragged to the top (Jianying's default center anchor makes the line **grow from the middle toward both ends**, a completely different read);
  each of the three dots gets its own scale keyframe layer, timed by hand against the line's progress (Jianying has no inverse-easing solver, so
  **the practical approach is to make the line uniform/linear** — node times then become equal divisions); the hollow ring can't be done as a border tween,
  so substitute two hard-cut layers: "solid dot fades out + hollow ring sticker pops in".
  AE — the line uses a Shape Layer's `Trim Paths → End` from 0% to 100% (cleaner than Scale);
  node trigger times can be read directly off the `End` curve in the Graph Editor, or give each node's Scale an
  expression following the `End` value: `s = thisComp.layer("line").content("Trim Paths 1").end; s > 33 ? 100 : 0`
  (switch to `linear()` for tweening).
- Division of labor with sibling cards in this library: **this card = timeline advancement** (has a line, has causality, can mark the current step);
  `numbered-step-stack` = checklist stacking (no line, four parallel items, only answers "which things to do");
  `chapter-progress-list` = chapter coordinates (answers "how far along are we"; it's a transition, not content);
  `line-chart-story-draw` = data line (the line is a value, not a sequence); `map-route-pin` = geographic path.
  One-sentence card selection: **order cannot be reversed → this card; order irrelevant → numbered-step-stack.**

## Scope
- Belongs to this card: the vertical line's `scaleY 0→1 origin top` running the `0.6s power1.inOut` "time is passing" curve (**easing strength and `lineDur` are a pair** — the stronger the inOut, the faster the middle and the more crowded the nodes; measured node spacing must not drop below 0.15s); the implementation discipline that **node trigger times are inverse-solved from the line's easing** ("wherever the line reaches, that spot lights up"); the node's `scale 0→1 back.out(1.6)` "stamping" feel; the text's **2-frame lag behind the node** (`0.067s`) + `x −8 → 0` following relationship; the third-beat upgrade performed only after all three groups settle + a `0.10s` breath (`border-width 0→3px` + background swapped to base color + `scale 1→1.25`, three properties on the same frame); the hollow ring's **uniqueness**; kickers in dim solid color with zero opacity in the resting state.
- Does not belong to this card: the demo's three specific step copies and the "Step 1 / Step 2 / Step 3" kicker wording, the `#e0452c` accent color, the 25px/14px font sizes and 600 weight, the line's `#d2d2d7` color and 2px width, the 14px node diameter, the `left: 132px` placement and 460px group width, the digital-host placeholder in the right column, the white-background stage.
- Migration interface: the only geometry entry points are `.tl-wrap`'s `height` and each node's `data-at` (pixels, relative to group top) — both scale proportionally with stage height (960×540 ⇒ 1920×1080 doubles everything, including `ringWidth`/node diameter/`textShift`); the only rhythm entry point is `CONFIG.lineDur`, with node and text times fully derived (`textLag` and `nodePop` are **feel constants — do not touch them when resizing**); two color tokens — `accent` (hollow ring) and hairline (line); size `hold` by total text volume (about 0.6s per group); portrait works as-is (this card is a vertical layout, naturally suited to portrait — just narrow the group width to 80% of screen width and reduce nodes to 3).
- Background requirements: **plain white is fine**. Dark backgrounds also work, with swapped values: line `rgba(255,255,255,0.14)`, solid node `#f5f5f7`, kicker `#a1a1a6`, and the hollow ring's "empty" swapped to the dark base color (`#1d1d1f`) rather than white — otherwise the ring's center becomes a white blob, heavier than a solid dot. The only constraint is that the background must have no horizontal texture or grid lines: the vertical line is only 2px wide, and any horizontal line crossing it makes "how far the line has reached" illegible.
