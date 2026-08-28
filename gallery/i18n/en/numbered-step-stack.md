---
name: numbered-step-stack
title: Four numbered-tile bars stack in one by one from the right with a strictly uniform 0.11s stagger; on the same frame each bar lands, its number tile punches once (1.12→1, 4 frames) as a "landing confirmation", and once all four are in place the whole group lifts a subtle 4px to close them into one thing
usage: The "here's the method" segments of narration — "remember these four", "it's just three steps", checklist-style actionable content; moments the audience should screenshot and save; bullet-point roundups in sales/tutorial narration. Not for flows with sequential dependencies (use step-timeline-vertical for that)
---

## Intent
One of the most common sentences in narration is "I'll give you four points." Its motion needs are plain: **the four must be readable, must feel like one group,
and must make people want to screenshot**. Sounds simple, but most implementations hit one of two pitfalls — either all four fade in together
(reading as a static image, the audience not knowing where to start reading), or each of the four does its own fancy bounce (reading as four separate effects,
the audience starts counting animations instead of reading content).

This card walks the middle line: **enter one by one, but staggered densely enough to read as one burst** (0.11s × 4 = 0.44s for all of them),
then **one extremely light whole-group lift closes the four into one thing**. The audience's experience is "pa-pa-pa-pa, all four delivered" —
per-item entry gives reading order, the group closure gives the confirmation of "this is one group, the checklist is complete."

It's a twin of `step-timeline-vertical`; the difference is single but hard: **this one has no line**.
No line means no causality — the four are parallel, their order swappable; a line means dependency, and the order cannot be reversed.
The cost of picking the wrong card is the audience misunderstanding the content's structure, which is worse than an ugly motion.

Two critical rules: ① **The stagger must be strictly uniform (0.11s × 4)**. Uneven staggers (0.1 / 0.16 / 0.09) read as stutter or dropped frames —
the one place this card can make the video look "sloppy"; ② **The number tile's punch is a "landing confirmation", not a bounce** —
4 frames, `power2.out`, from 1.12 down to 1, **no rebound**. Using `back.out` reads as four little balls hopping.

## Motion Core
- **Layers**: white background → presenter layer (left column) → four horizontal bars (right side, vertically centered, `gap 14px`);
  each bar = number tile (left, solid accent color) + text (right) + 1px hairline border (`#e0e0e0`, **no drop shadow**)
- **① Bars stack in**: each bar `x +40 → 0` + `opacity 0 → 1`, `0.24s power3.out`, **stagger strictly 0.11s**
- **② Number tile punch**: triggered on **the same frame** that bar lands (`at + barIn`),
  `scale 1.12 → 1`, `0.133s` (4 frames @30fps), `power2.out`, **no rebound**.
  Acts on the number tile only — the whole bar does not participate; the punch is a local confirmation that "this item has landed"
- **③ Group closure** (after the last punch + a 0.08s breath): **the whole `.stack` container** `y 0 → −4px`,
  `0.20s power2.out`. The displacement must be tiny (4px @540h ≈ 0.7%) — it's not "the group flying up,"
  it's an almost imperceptible "closing," declaring the checklist complete
- **④ hold 1.8s**: all four must be readable (about 0.45s each)
- **Total duration accounting**: `0.4` (lead) + `3×0.11` (stagger) + `0.24` (last bar entrance) + `0.133` (punch)
  + `0.08` (breath) + `0.20` (closure) + `1.8` (hold) = about 3.18s

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `barStagger` | 0.11s | **Critical**: the stagger amount, and it must be **equal across all four**; >0.2s reads as four independent effects (the audience counts animations), <0.06s reads as one block fading in (losing the reading order), and any unevenness reads as stutter |
| `barIn` | 0.24s | Single-bar entrance time; >0.4s the four together take too long — the narration is already on item three; <0.15s the displacement is invisible, degenerating into a fade |
| `barShift` | 40px | Entry displacement from the right (about 8% of bar width); 0 leaves only a fade (no "stacking in" action), >90px reads as horizontal fly-ins (four fly-ins = a chaotic screen) |
| `punchScale` | 1.12 | Number tile punch starting multiple; <1.06 the "landing" is invisible, >1.25 reads as the number tile bouncing on its own (upstaging the bar's own entrance) |
| `punchDur` | 0.133s (4 frames) | Punch duration, **must be short**; >0.3s reads as the number tile doing its own entrance animation, decoupled from the bar |
| Punch easing | `power2.out` | **`back` is forbidden**; any rebound instantly reads as four little balls hopping (the card's whole energy tier jumps up and it stops being a "checklist") |
| `settleLift` | 4px | Group closure displacement; 0 loses the "this is one group" close (usable but looser), >12px reads as the group flying up (the last bar just landed and the whole thing moves again — the audience reads two effects) |
| `settleGap` | 0.08s | Breath between the last punch → group closure; 0 buries the closure inside the punch, unreadable, >0.3s the two beats break apart (the audience thinks it ended, then it moves again) |
| Item count | 3~5 | 4 is the most comfortable; >5 compresses row heights and the stagger accumulates past 0.66s (too big a head-to-tail gap, reading as "swept over" not "one burst") — either cut `barStagger` to 0.08s or split into two screens |
| `hold` | 1.8s | Closing hold; budget by item count (about 0.45s per item). This is the time reserved for "screenshotting" — err long, not short |

## Known Pitfalls
- Uneven stagger (easiest to commit when hand-writing delays) — intervals of 0.1 / 0.16 / 0.09 read as dropped frames,
  the one mistake that makes the whole video look "sloppy." Must be computed as `i * barStagger`.
- Number tile punch with `back.out` — four little balls hopping, all the checklist's calm gone (this is the dividing line between this card and
  the sticker/doodle style text cards).
- Punch applied to the whole bar — the bar rescales right after landing, reading as "hasn't settled" (like a rebound overshoot).
  The punch must stay local to the number tile.
- Group closure displacement of 12px+ — the last bar just landed and the whole group travels again; the audience reads a "fifth effect,"
  and closure means "closing shut," not "one more move."
- Adding drop shadows to bars for layering — design-language §3: shadows only go to evidence assets (screenshots/photos).
  Checklist bars stand on a 1px hairline + background contrast; add a shadow and it's instantly a PPT template.
- All four bars in accent-color fills + white text — four items equally heavy means no hierarchy, the screen reads as one color swatch;
  accent color goes on the number tile only (small footprint, fixed position, reading as "index" not "highlight").
- Highlighting one single item — that's `chapter-progress-list`'s language ("current"). All four items in a checklist weigh the same;
  wanting to emphasize one means you want a different card.
- Using it for a flow with dependencies — the audience will assume the order is swappable. Dependencies require a line (`step-timeline-vertical`).
- Bar widths hugging each item's text (unequal widths) — a checklist's "one group" is expressed by **equal width + equal height + equal spacing**;
  unequal widths read as four independent cards.
- Replay without resetting the number tile's `scale` — the `fromTo` form self-heals, but if rewritten as `to`,
  the previous run's 1.0 makes the second punch a no-op (four bars land silently and the "confirmation" disappears).

## Reuse Guide
- HTML/GSAP: demos/numbered-step-stack/index.html. **To change content, edit the `.step-txt` copy + `.step-no` numbers**;
  to add/remove items just duplicate or delete a whole `.step-bar` (timing is derived from `i * CONFIG.barStagger`, **no delay needs editing**);
  when the count changes, only recompute `hold` at "0.45s per item."
  Change the accent color in one place, `.step-no`'s `background`. When resizing, scale `barShift` / `settleLift` proportionally with stage width.
  Tune energy only via `barStagger` (0.08 punchier / 0.14 steadier), **never touch the punch's easing**.
- Remotion port: one `<Sequence from={Math.round(i * 0.11 * fps)} durationInFrames={rest}>` per bar,
  inside each `interpolate(frame, [0, 7], [40, 0], {easing: Easing.out(Easing.cubic), extrapolateRight: "clamp"})`
  driving `translateX`, with the same local clock driving `opacity`.
  The number tile punch runs 4 more frames after `frame >= 7`:
  `interpolate(frame, [7, 11], [1.12, 1], {easing: Easing.out(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp"})`
  (**neither clamp can be omitted** — without clamping, frames with `frame < 7` compute scale >1.12 and the tile starts enlarged).
  The group closure goes on the outer container, `from = 3*11 + 7 + 4 + 2` frames, walking 6 frames to `−4px`.
  **Don't use `spring()` for the punch** — spring has inherent rebound and steps on the pitfall above.
- Editing-software equivalents: JianYing/CapCut — build each item as a "text + color block" group,
  keyframe "position + opacity" entering from the right, **dragging each item 3 frames later than the last (0.1s; JianYing's smallest unit is the frame, which is exactly uniform)**;
  the number tile's punch as two "scale" keyframes (112% → 100%, 4 frames) with easing set to "ease out" (**do not pick "bounce"**);
  the group closure in JianYing requires grouping the four items and keyframing position on the group (no grouping feature? select all four and drag together manually).
  AE — four bar layers + one Null as parent: each bar with its own `Position` + `Opacity` keyframes,
  auto-spaced with `Sequence Layers` (Keyframe Assistant) at equal intervals (which happens to guarantee a uniform stagger);
  the number tile as its own layer with two `Scale` keys + `Easy Ease Out`; the group closure keyed on the Null's `Position`.
- Division of labor with sibling cards in this library: **this card = checklist stacking** (no line, parallel, order swappable, answers "which things to do");
  `step-timeline-vertical` = timeline progression (has a line, causal, order fixed, can mark "currently at step N");
  `chapter-progress-list` = chapter coordinates (dark-background transition, answers "where are we," single highlight);
  `line-by-line-slide` = sentence-by-sentence push (that's subtitles/paragraphs, not numbered checklist items).
  Card choice in one sentence: **order-independent → this card; order fixed → step-timeline-vertical; where are we → chapter-progress-list.**

## Scope
- Belongs to this card: the four bars' `x +40 → 0` + `opacity` stack-in (each `0.24s power3.out`); the discipline of a **strictly uniform stagger `0.11s × 4`**; the number tile punching on **the same frame** its bar lands (`scale 1.12→1`, 4 frames, `power2.out`, **no rebound**) as the "landing confirmation"; the **whole-container** 4px lift (`0.20s`) closure after all four are in ("this is one group"); the four items **equally weighted with no highlight** (accent color only on the number tiles); layering via 1px hairline instead of shadow; `hold 1.8s` reserved for screenshotting.
- Does not belong to this card: the demo's four specific step sentences and the 01~04 numbering style, the accent `#2fb344` (from reference image ③'s green family), the 22px font size and 600 weight, the specific dimensions of 66px-tall / 486px-wide bars with `gap 14px`, the 64px-square number tile and its `12px 0 0 12px` corner radius, the `#e0e0e0` border color, the list sitting on the right, the digital-human placeholder in the left column, the white stage.
- Migration interface: the content entry point is adding/removing `.step-bar` elements (timing derives automatically from `i × barStagger`); scale the size anchors `barShift 40px` / `settleLift 4px` proportionally with stage width (960 ⇒ 1920 doubles them); colors are one token (number tile fill = accent) + one hairline; duration scaling rule — `barStagger` and the punch's 4 frames are **feel constants; never touch them for size or speaking-pace changes**, only cut `barStagger` to 0.08s when the count exceeds 5, and recompute `hold` at "0.45s per item"; for portrait, make bars 88% of screen width, cut the count to 3~4, and set `barShift` to 8% of screen width.
- Background requirement: **white works**. Dark works too, with swapped values: bar fill `#272729`, border `rgba(255,255,255,0.14)`, text `#f5f5f7`; the number tile's accent stays (a solid tile stands just as well on dark). The only constraint is no strong texture or gradient in the background: the four bars read as one group through "equal width/height + 1px hairline," and a patterned background breaks the hairline into dashes, scattering the four into independent cards.
