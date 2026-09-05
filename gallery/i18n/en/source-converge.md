---
name: source-converge
title: Four thin Bézier curves are drawn on left to right, staggered 0.15s; four source pills slide along their own real curves for 1.5s toward the merge point on the right, shrinking in three stages (1→.34 slowly over the first 75%, then dropping to nothing over the last 25% — "sucked in") while accent-coloured data packets travel the lines for two full cycles; at the moment of absorption the "one table" pill pulses +12%, the curves erase from their start, and the result pill + caption glide 0.6s to the centre of the frame and rest
usage: Workflow explanations of "N sources merged into one place"; "these things all point to the same conclusion"; many channels → one entry point (support / inbox / data platform); played backwards it is "one splits into many". Input is text only (source names / hub / caption), the card ships its own vectors; the presenter is not involved
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Takes no footage; with a presenter on screen put the whole diagram on the opposite half (layout §4) | ✗ | ✗ The card ships its own vectors. Source pills can become logo icons (same shape within the group); the hub can become a product thumbnail |

Text only: 2–6 source names + hub copy + one caption line.

## Common scenarios
1. "How data from four platforms becomes one table" — a workflow explanation (the demo)
2. "These things all point to the same conclusion" — sources become arguments, the hub becomes the conclusion
3. Many channels → one entry point: support channels / inbox / data platform / single account
4. Played backwards it is "one splits into many" (reverse `conv` in the tsx)

## Intent
The library has only two cards about "relationships": `converging-arrows` (two arrows pointing at a word, annotation semantics) and `map-route-pin` (a path on a map). **There is no animated process / mechanism diagram.** Source converge is the simplest "many-to-one": the viewer watches four names slide **along their own lines** into the same point, shrinking as they approach, finally swallowed — "merging" never has to be said. Four things make it work:
1. **Nodes travel along the real curve** (`getPointAtLength` / arc-length table lookup), not a straight-line interpolation between two points — a straight line leaves its own path and the "entering through the channel" meaning is lost.
2. **Three-stage shrink with the knee at 75%**: slow slimming (1→.34) over the first three quarters, then dropping to nothing over the last quarter — the rate of size change in the last stage is over 4× the first, which is the "sucked in" acceleration; moving the knee to 50% makes it "shrink all the way" and the absorption beat disappears.
3. **Erase only after every node is gone, and from the start end**: reads as "the channel being withdrawn"; lines vanishing while nodes hang in mid-air is a bug.
4. **Centre the result after the merge** (user decision 2026-09-05): once the sources are gone, a result still sitting on the right reads as "half the frame is empty"; the pill and caption glide together 0.6s to x=480 and then rest ≥1.2s — that rest is the point of the card; no hold, no merge.

## Motion core
- **Geometry** (960×540): title 26px/700 at (80, 60); source pills 128×44 radius 22 (white with a 1.5px `#d6d6dc` stroke, 20px/600 text), centre x=200, y = 170 / 230 / 310 / 390; hub pill 152×60 radius 30 (solid accent + white 22px/700 text) at (700, 290); caption 22px/600 centred under the hub at y=372. Curves `M 200,y C 380,y 520,290 700,290` (`#c9c9cf` 2px) — the four differ only in the start y, so their curvature and angle of arrival differ naturally.
- **Connecting**: from 0.3s the pills fade in staggered 0.08 (0.3s); from 0.5s the four lines draw on staggered 0.15 (`stroke-dasharray = len`, `dashoffset = len×(1−draw)`, 0.5s `power2.out` each).
- **Hub entrance**: 0.8s, 0.4s `power3.out`: opacity 0→1, scale .7→1.
- **Data packets**: 0.9→3.0s linear over two full cycles, phase +i×0.13 per line, `cycle = (pk×2 + i×0.13) % 1`, position = `cycle×len` along the curve, opacity `1 − |cycle − .5|×.6` (brightest mid-line, fading at both ends so no packet appears from nowhere at the start); shown from 0.9 over 0.3s, hidden from 2.8 over 0.2s.
- **Merge**: 1.5→3.0s `power2.inOut`, node position = `conv×len` along the curve; size `conv < .75 ? 1→.34 : .34→0` (text scales with the group and never detaches).
- **Absorption pulse**: at 2.85s the hub scales 1→1.12 (0.25s `back.out(2)`) → back to 1 at 3.1s (0.25s `power2.out`).
- **Erase**: at 3.25s `dashoffset = −erase×len` (0.4s `power2.out`), retreating from the start.
- **Caption**: fades in at 3.5s over 0.4s.
- **Centring**: 3.8→4.4s the pill and caption move x 700→480 `power2.inOut`; then still until 5.8s.
- **Exit**: at 5.8s title / pill / caption opacity→0 over 0.4s `power2.in`, done at 6.2s.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| Source count | 4 (y 170/230/310/390, spacing 60–80) | Four is the sweet spot: clearly different curvature without tangling; >6 the middle Béziers almost coincide; 2 reads as a comparison, not a merge |
| `drawStagger` | 0.15s | Zero makes all four lines draw at once and loses "connected one by one"; >0.3 looks like separate batches |
| `convDur` merge window | 1.5s (24% of the card, the main passage) | `power2.inOut`: the slow start is "launch", the slow end is "arrival"; linear turns it into a conveyor belt |
| `shrinkKnee` | 0.75 | The later the knee the sharper the suction; 0.5 becomes "shrinking all the way" and the absorption beat disappears |
| Packet cycles | 2 full cycles | Non-integer cycles leave a packet mid-line on the last frame; 4 cycles read as a frantic stream and collide with nodes |
| `pkPhase` | 0.13 per line | Zero makes four packets march in a neat row like one departure |
| Pulse | +12% (back.out(2)) | The scale of "received"; >25% upstages the merge itself |
| `eraseAt` | 3.25s (after nodes vanish at 3.0) | Earlier than that and nodes hang in the air with no line |
| `centerDur` | 0.6s `power2.inOut` | <0.4 looks flicked to the centre; >0.9 the viewer waits |
| Curve colour | `#c9c9cf` 2px | Must stay light or four lines out-shout the pills; pill text ≥20px (list-item tier) |

## Pitfalls
- Nodes interpolated on a straight line — they leave their curve and "entering through the channel" is gone.
- Uniform shrinking (knee at 0.5) — no "sucked in" beat.
- Lines erased before the nodes vanish — nodes hang in mid-air.
- Erasing from the hub end — reads as the hub spitting the line back; erase from the start (channel withdrawn).
- Result left on the right after the merge — the left half sits empty and reads as a composition accident; centre it, then rest.
- Non-integer packet cycles — a packet stops mid-line on the last frame.
- Mixing colour logos with text pills as sources — different shapes in one group (layout §8); all logos or all text.
- Curves too dark / too thick — the lines out-shout nodes and pills.

## Reuse
- Remotion/tsx (preferred): template/cards/source-converge.tsx — `title / sources[] / hub / caption`; durationInFrames 198; move the merge start via `CONFIG.convAt` (align with "merged into one" in the narration), sentence length via `exitAt / end`; for ≠4 sources the y positions are spread evenly between 170 and 390. Point-along-curve in the tsx is a pure function (the cubic Bézier is sampled into 200 segments, an arc-length table is built and looked up by length), deterministic for rendering, no DOM `getPointAtLength`.
- HTML/GSAP: demos/source-converge/index.html — the `SOURCES` array and `CONFIG`; the demo uses SVG `getPointAtLength`.
- Source: video-shotcraft `bezier-source-converge-merge` (four-line draw-on → nodes slide along the curve with a three-stage shrink → badge pulse → reverse erase); the port swaps the small icon nodes for readable text pills (the narration has to be able to name the sources), the round badge for a text pill, and adds the "centre the result after the merge" passage.
- NLE equivalents: CapCut/JianYing has no path following — keyframe point by point; in AE paste the mask path into Position and drive Scale with a two-stage `linear(time, t0, t1, 100, 34)` expression; Motion / Keynote "move along path" handles nodes, Trim Paths draws the lines.
- Interface with layout.md: the source column's left edge at 136 (pill left) and the title's at 80 both snap near grid lines; after centring, the result group's bounding-box centre is x=480 (§4, no presenter); caption 22px (above body tier); every element's bottom ≤ 412 < the subtitle band.

## Motion scope
- Belongs to this card: staggered 0.15 draw-on; nodes merging along the real curve with a three-stage shrink (knee .75); packets over two full cycles with phase offsets and brightest mid-line; the +12% absorption pulse; erasing from the start; the 0.6s centring followed by true stillness; exiting together.
- Not this card: the copy, the four y coordinates, the pill styling (white stroke / solid accent), the white stage.
- Migration interface: `title / sources / hub / caption`; at 1080p lines 2→4px, pills 128×44 → 256×88, text 20→40 / 22→44; with logo sources swap `<text>` for `<image>`, the group scaling stays the same.
- Stage colour: white works as is; on a dark stage curves become `rgba(255,255,255,.2)`, source pills a dark tile (`#272729` + hairline stroke), and the hub accent `#2997ff`.

## Placement self-check (copy into the SHOTBOOK self-check column when picking the card)
- Three stills: connected (≈1.5s) — all four lines reach the hub, all four pills at their start; mid-merge (≈2.4s) — every pill sits on its own line and is visibly smaller; after centring (≥4.4s) — pill + caption bounding-box centre x=480, deviation ≤48.
- On the frame the erase begins (3.25s) no source pill may remain anywhere in the frame.
- Source pill text ≥20@960; equal spacing between pills (60–80), same shape within the group.
- Curve colour lighter than the pill stroke; packets use the accent only.
- With a presenter on screen the diagram sits on the opposite half and the centring target becomes that half's centre (240 / 720 in 960 terms).
