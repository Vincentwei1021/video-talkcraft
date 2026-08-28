---
name: scribble-annotation
title: Marker-textured circles / underlines / arrows drawn live in authentic stroke order, then held cleanly at rest once drawn
usage: When the narration calls out a specific spot in footage or a screenshot ("look at this price," "this fine print right here," "click here"); reviews, hot takes, exposé-style commentary — any tone with an "author present" feel
---

## Intent
When the narration mentions a detail in the footage, the audience's gaze needs to be led there by "a live hand" —
printed highlights are typesetting; a hand-drawn line is an action, making people feel the author is looking at the image with them.
Keys: **authentic stroke order** (one stroke drawn from start to end, with speed variation at the start and finish — constant speed reads as a loading bar),

**thick, round-capped lines** (below 4px there's none of a marker's "ink weight").

## Motion Core
- Annotation layer = a full-screen SVG over the mock screenshot (`viewBox="0 0 960 540"`, `pointer-events:none`), one path per stroke, `fill:none`, `stroke-linecap/linejoin: round`, 6px stroke width
- **Coordinates bind to the annotated element — never hard-coded** (key): tag the target DOM with `data-ink="xx"`, measure its box at runtime, convert into the viewBox, then compute the path — circle center = target center, underline y = target baseline + 4px, arrow tip = 8px outside the target's edge. For text targets, measure the **ink box** (canvas `measureText`'s `actualBoundingBoxAscent/Descent` + baseline), not the line box: line boxes carry font padding above and below, so circles drawn off them ride high and underlines drift out by 15px+
- Drawing: `stroke-dasharray` = the path's full length, `stroke-dashoffset` tweened from full length to 0 — circle 0.55s `power2.inOut`, underline 0.4s `power2.out`, arrow as two strokes: shaft first (0.35s `power2.inOut`) then head (0.15s `power2.out`)
- Once drawn, hold at rest. This library's sign-off: **no line boil / no stop-motion jitter** (user preference; see the note under motion tokens in design-language.md §4). The hand-made feel is carried entirely by path shape (wonky hand-drawn circles, lines with a slight bow) and drawing rhythm
- The three annotations run in series, spaced 0.55s apart (matching the narration naming items one by one); the screenshot sits still for 0.5s before playback starts
- The circle is no ellipse-tool ellipse: the path loops the target about 1.6 turns, with the start and end strokes crossing and overlapping; colors red #ff4d4d / yellow #ffd23e, laid over light-toned screenshots
- Replay semantics: each run first clears the previous ink with `layer.innerHTML = ""` before rebuilding

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `strokeW` | 6 | <4 has no pen feel — reads as a thin printed rule; >10 the ink gets so fat it covers the annotated text |
| `gapBetween` | 0.55s | Matches the breath of the narration naming items one by one; <0.3s the three strokes blur into a single action; >1s the audience is waiting |
| `marks[].dur` | circle 0.55 / line 0.4 / shaft 0.35 | >0.8s a single stroke reads like a progress bar; <0.25s the stroke direction can't be read |
| `headDur` | 0.15 | The arrowhead is a quick finishing flick; stretched past 0.3s the head "arrives late" |
| `marks[].ease` | power2.inOut / power2.out | Swap in none (constant speed) and it's instantly fake; inOut gives the circle the hand pressure of "fast attack, gentle release" |
| Circle `padX/padY` | 17 / 17 | When the ellipse circumscribes a wide, flat text block, horizontal padding needs to be a notch bigger than intuition (the waist has already narrowed at text height); padX below 12 lets the circle's left/right waist cut into the first/last characters |
| Circle `turns` / `grow` | 1.6 / 0.05 | turns <1.5 is a geometric ellipse, not a hand drawing; at grow=0 the second loop covers the first and the double loop can't be seen |
| Line `baselineGap` | 4px | 2–6 sits like it's pressing the text; >10 the line floats between this line and the next, blurring what it points to |
| Line `overhang` | 9px | Slightly overshooting both ends looks hand-swept; =0 a line shorter than the text reads as "unfinished" |
| Arrow `tipGap` | 8px | 5–10 is "biting without pressing"; =0 the tip stabs into the target, >20 the pointing goes vague |

## Known Pitfalls
- Constant-speed drawing — a line without attack and release reads as a loading animation, not a human hand.
- Line too thin (<4px) — no marker ink weight; reads as UI stroke.
- Circle drawn too round — a perfect ellipse is a geometry tool's work; it must be wonky, loop more than 1.5 turns, and cross itself at the ends to read as a hand.
- **Annotation missing the target (the most fatal)** — path coordinates hand-filled as fixed values drift the moment the copy or font size changes: the circle rings the wrong word, the underline floats between lines, the arrow points at blank space. The audience will first see "why doesn't this line land," and no amount of nice motion recovers it. Always compute coordinates from the annotated element.
- Taking the line box as the text position — `getBoundingClientRect()` includes line-height padding (a 17px glyph's line box can be 10px+ taller), so the circle rides high and the underline sits too far from the text. Use the glyph ink box + baseline.

## Reuse Guide
- HTML/GSAP: demos/scribble-annotation/index.html. **Changing the annotated target requires no coordinate edits**: add `data-ink="xx"` to the target element and write `{kind:"circle"|"underline"|"arrow", target:"xx"}` in `CONFIG.marks` — positions follow the DOM automatically; fine-tune with `padX/padY` (circle snugness), `baselineGap/overhang` (line fit), `side/tipGap/fromDX/fromDY/bow` (which way the arrow comes from and which edge it points at). Change colors via `marks[].color`, rhythm via `dur`/`gapBetween`. Hand wobble uses a deterministic function (`sin` combinations + `seed`), not `Math.random()` — shapes are identical on replay and friendly to frame-by-frame rendering. Core logic = `CONFIG` + `boxOf/inkBoxOf` + `circlePath/underlinePath/arrowPaths` + `smooth()` + `drawStroke()` — liftable as a whole.
- Remotion port: use `evolvePath(progress, d)` from `@remotion/paths` for `strokeDasharray/strokeDashoffset`, with progress = `interpolate(frame, [start, start+durInFrames], [0,1], {easing: Easing.inOut(Easing.quad)})`; stagger the three strokes' start frames per gapBetween.
- (Field-tested variant) Numbered roll call: when naming 5 items at once, don't draw stroke by stroke — 5 hand-drawn arrows fan out and **fade in as one group**, then digits 1–5 pop in one by one at each arrow's tail (0.2s apart) — the drawing channel yields to the digit-pop channel, avoiding 5 strokes of drawing eating 3 seconds. See TheAIScaler (Apm_oCzPEQs).
- (Field-tested variant) Red diagonal strike-out (a2iG5GkM8KE): one thick red diagonal slashed fast across the word/option to negate — it's "crossing out," not "circling," opposite semantics and a faster stroke (0.2s class).
- (Field-tested variant) Highlighter smear-and-replace (i2fFSAZb5HM): a thick highlighter smear covers the old word while the new word presses in above the smear on the same frame — turning "correcting oneself" into a visible action; the smear then holds at rest, still no line boil.
- Editing-software equivalents: AE = Shape Layer "Trim Paths" keyframed drawing; CapCut has no draw-on channel — use "sticker → hand-drawn/doodle" circle stickers placed over the target (pick a static, jitter-free one), or substitute a "brush" asset pack.

## Scope
- Belongs to this card: **the binding between annotation geometry and the annotated target** (circle center = target ink center with outset radius, underline = 2–6px below the baseline slightly overshooting both ends, arrow tip = 5–10px outside the target's edge) — "landing accurately" is this card's semantics, not an implementation detail; each stroke's `stroke-dasharray` = full path length with `stroke-dashoffset` full-length→0 drawing (circle 0.55s power2.inOut, underline 0.4s power2.out, arrow shaft 0.35s power2.inOut + head 0.15s power2.out); the easing discipline of **attack and release** (constant speed reads as a loading bar); the arrow's two-stroke order of shaft-then-head; three strokes in series spaced 0.55s to match the narration's roll call; the footage sitting still 0.5s before playback; holding cleanly at rest once drawn — **no line boil / no stop-motion jitter** (a hard prohibition in this library); the hand-made feel carried by path shape itself (circle looping 1.6 turns, wonky, ends crossing; lines with a bow). The layering of the annotation layer over the footage with `pointer-events:none` belongs to this card too.
- Does not belong to this card: the mock product-page screenshot placeholder (copy, price, buttons, wireframe), which elements get annotated (that's a footage-side matter), the specific annotation colors #ff4d4d / #ffd23e, the screenshot's tilt and drop shadow (removed; a style matter).
- Migration interface: scale `strokeW` with the frame (6px at 960 wide, doubled at 1080p); `gapBetween`/`marks[].dur`/`headDur` set the rhythm; change the annotated target via `data-ink` + `marks[].target` (coordinates follow automatically, no path recomputation); the pixel quantities `padX/padY`, `baselineGap`, `overhang`, `tipGap` scale in step with `strokeW`; change colors via `marks[].color` (red/yellow on light grounds, bright hues on dark grounds). When the target is not DOM (video/image footage), swap `boxOf()` for a hand-filled target rectangle — the downstream geometry functions need no change.
- Background requirement: a white ground suffices (marker colors over a light ground are this card's native context). On dark grounds, switch the annotation colors to high-luminance hues, or the thick lines smear into the background.
