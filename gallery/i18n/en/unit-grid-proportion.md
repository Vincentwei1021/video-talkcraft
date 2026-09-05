---
name: unit-grid-proportion
title: 100 small squares grow out of the grid centre ring by ring (4 frames per ring + ≤3 frames of deterministic jitter, filled in 1.1s; opacity + scale .8→1 only, no displacement), then from the top-left they are coloured one by one in reading order with the accent colour (0.035s per cell) while the 128px number on the right counts 0→37 on the same clock; the legend floats in last — "37%" laid out as 37 countable individuals
usage: Proportion conclusions ("N out of every 100 / 10 people"), conversion / retention / success rates, social statistics and survey narration; two proportions side by side can use two grids. Input is data only, the card ships its own vectors; the presenter is not involved
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Takes no footage; with a presenter on screen put the whole group on the opposite half (layout §4) or hand over with `host-shrink-to-chip` first | ✗ | ✗ The card ships its own vectors. Cells can become person icons / brand logos / product icons — **same shape within the group** (layout §8) |

Data only: one integer 0–100 + unit + label + legend copy.

## Common scenarios
1. A proportion conclusion: "37 out of every 100 viewers swipe away in the first 3 seconds" (the demo)
2. "7 out of 10 people…" social statistics / survey data (colour 70 cells, or use a single 10×1 row)
3. Conversion / retention / success / hit rate — two colours are enough, semantic colours stay out of the body
4. Two proportions compared: one grid left, one right; the second starts colouring 0.4s later, numbers side by side

## Intent
`number-counter` abstracts a proportion into a rolling number, `bar-chart-growth` into a length — both make the viewer convert "37%" back into people themselves. The unit grid (the data-viz unit chart / isotype) **lays the proportion out as countable individuals**: one cell per person, the viewer can count across, and "37 out of 100" needs no conversion. When the narration talks about people, this beats a bare number by a wide margin. Four things make it work:
1. **Cells grow, they don't fly in**: opacity + scale .8→1 only, no displacement — displacement reads as cards entering, not as "a crowd lining up".
2. **Ring-by-ring growth with in-ring jitter**: ring = the Euclidean distance to the centre, rounded; 4 frames per ring; ≤3 frames of deterministic jitter within a ring — remove the jitter and the wavefront looks like a machine scan.
3. **Colouring in reading order on the same clock as the count**: cells are coloured from the top-left one by one and the big number is `round(progress × target)`; if the number arrives before the cells it reads as two separate events.
4. **Accent + grey only**: uncoloured cells are `#e3e3e8`, coloured ones the single accent; positive/negative green and red stay in legend semantics and never land on the cells (design-language §1 red line).

## Motion core
- **Geometry** (960×540): 10×10 grid at (176, 82), cell 28, gap 6 → 334×334; number group at (584, 140): big number 128px/600 (hero tier, `tabular-nums`, letter-spacing −4) + 44px unit after it, two-line label 26px/600 (body tier), 18 above; legend 16px grey at (176, 428), three items with gap 18, swatches 12×12 radius 3. Group bounding box (176, 82)–(~784, 448), centre x≈480 (layout §4); legend bottom 448 < subtitle band 450.
- **Growth**: cell i (column c, row r) has `ring = round(hypot(c−4.5, r−4.5))`, start `0.2 + ring×0.13 + srand(i)×0.1`, 0.3s `power2.out` per cell: opacity 0→1, scale .8→1 (`transform-origin 50% 50%`); filled in ~1.1s. `srand` is a sine hash (same seed same value; demo and tsx share the formula).
- **Number group**: big number at 1.4s, label at 1.5s, each 0.5s `power3.out`: opacity 0→1, y 14→0.
- **Colouring + count**: from 1.7s cell i (i < target) starts at `1.7 + i×0.035`, 0.25s `power2.out` background `#e3e3e8 → accent` (linear RGB); the big number runs `1.7 → 1.7 + target×0.035` linearly 0→target, rounded. 37 cells ≈ 1.3s.
- **Legend**: floats in 0.2s after colouring ends, 0.4s (opacity + y 14→0).
- **Exit**: at 5.7s everything opacity→0 over 0.4s `power2.in`, done at 6.1s. Once landed it rests; no idle.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `target` coloured cells | 37 (= percent) | <8 the viewer may miss it; >60 colour "the other side" (the 40 who stayed) or the reading flips |
| `cols × total` | 10 × 100 | 10×10 is the most legible scale; 8×7 = 56 needs conversion; a 10×1 row suits "N out of 10" |
| `ringDur` per ring | 0.13s (≈4 frames) | <0.1 reads as a flash; >0.2 the growth drags to 2s and steals the number's moment |
| `jitter` within a ring | ≤0.1s | Zero makes the wavefront machine-neat; >0.2 the ring order disappears into random flicker |
| `growDur` per cell | 0.3s, scale .8→1 | Starting below .7 reads as a pop; adding displacement turns it into card entrances |
| `fillEach` colouring interval | 0.035s | 37 cells in 1.3s; <0.02 reads as one brush stroke, >0.06 the count drags past 2s |
| `fillDur` per cell | 0.25s | Too short looks like hard-cut pixels, too long stretches neighbouring cells into a gradient strip |
| Big number size | 128px/600 | Hero tier; ≥2:1 against the 26px label (layout §5) |
| Colours | accent `#0066cc` + base `#e3e3e8` | These two only; a second colour is a violation |

## Pitfalls
- Cells fly in with displacement — reads as a pile of cards entering, not "a crowd lining up".
- Rings grow without jitter — the wavefront looks like a radar sweep, mechanical.
- Random scattered colouring (the shotcraft original's "anomalies surfacing") — narration wants "37 of them"; random colouring can't be counted, sequential colouring is the proportion.
- Number and colouring on two clocks — the number lands first, the cells later; two events.
- Non-100 grids (8×7, 6×6) — the viewer has to convert; the unit chart's advantage is gone.
- Semantic red / green on the cells — colouring "swiped away" red is a judgement, not a statistic; the body uses the accent only.
- Legend inside the subtitle band (y ≥ 450) — the legend bottom must be ≤ 448; with subtitles move it under the number group.

## Reuse
- Remotion/tsx (preferred): template/cards/unit-grid-proportion.tsx — `target`, `unit`, `label` lines, `legend` triple, `accent`; durationInFrames 195; move the colouring start via `CONFIG.fillStart` (align with the spoken number), sentence length via `exitAt / end`.
- HTML/GSAP: demos/unit-grid-proportion/index.html — `CONFIG.target` and the `.stat` / `.lgd` copy; to use icons swap `.cell` for an `<svg>` and animate `fill`.
- Source: video-shotcraft `avatar-grid-radial-build-colorize` (ring growth + colouring) plus the "each dot is a person" semantics of `chart-live-moves` B unit-dot-swarm; the port turns the 8×7 avatar cards into a 10×10 grid and the random colouring into sequential colouring synced to the count.
- NLE equivalents: no native unit chart in CapCut/JianYing — 100 rectangle stickers with colour keyframes (heavy; render with Remotion instead); AE Grid effect with an `index < target` expression; Flourish / Datawrapper "pictogram" charts export mp4 but have no growth beat.
- Interface with layout.md: grid + number group is a two-element group (§4) with a 334 : ~200 ≈ 1.7:1 width ratio; the deliberately unaligned top edges centre the big number on the grid's middle band; three type tiers 128 / 26 / 16 (§5: legend 16@960 = 32@1080, caption tier).

## Motion scope
- Belongs to this card: ring growth (ring = rounded Euclidean distance, 4 frames per ring + ≤3 frames jitter, opacity + scale only); sequential colouring at 0.035s per cell; the big number rounded on the same clock as the colouring; the legend after colouring ends; everything exits together.
- Not this card: the copy, the unit, the 10×10 coordinates, the white stage, the cell shape (squares / person icons / logos all work).
- Migration interface: `target / unit / label / legend / accent`; at 1080p cell 28→56, gap 6→12, big number 128→256, label 26→52, legend 16→32; for a two-grid comparison the second card's `fillStart` runs 0.4s later.
- Stage colour: white works as is; on a dark stage base becomes `rgba(255,255,255,.14)` (the dark hairline value) and accent `#2997ff`.

## Placement self-check (copy into the SHOTBOOK self-check column when picking the card)
- Grid + number group bounding box horizontally centred: deviation ≤48 (no presenter); with a presenter, the group sits on the opposite half's centre.
- Legend bottom ≤ 448@960 (outside the subtitle band); with subtitles move it under the number group.
- Two stills: mid-colouring (≈2.4s) — coloured cells = the big number; after colouring (≥3.2s) — coloured cells = target, number = target.
- Coloured cells use exactly one accent; uncoloured cells and the legend swatch share the same grey.
- Big number : label ≥ 2:1; label ≥ 26@960 (body tier).
