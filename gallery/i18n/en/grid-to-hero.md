---
name: grid-to-hero
title: A 2×2 grid lands with a 120ms stagger (parallel first); when the narration reaches one tile it grows in 0.8s into a 620×444 hero while the other three shrink on the same curve into a right-hand column of 220×132 thumbnails (they don't disappear); after 2s everything returns to the grid, then exits together
usage: "Out of four we picked this one" — cover candidates / the harshest of four comments / the final of four versions; any "parallel first, then focus" choice where the options must stay comparable
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ No presenter in this shot | Yes (mix images and video across the four tiles; `srcs` ending in .mp4 / .webm / .mov automatically use `<OffthreadVideo>` and are not reset by the reflow) | Yes (default input: covers / screenshots / comment cards) |

Tile ratios change during the reflow (2:1 → 1.4:1 → 1.67:1); material is cover-cropped, never stretched — keep subjects away from the material's edges.

## Common scenarios
1. "Out of four options we picked this one": cover candidates ①②③④ → pick ③ (what the demo shows)
2. The harshest / most representative of four comments
3. The final of four versions (see all, then the pick)
4. Any "parallel first, then focus" choice (three options: drop to 3 tiles)

## Intent
"We picked one out of several" is one of the most common narrative shapes. The two wrong ways: showing only the winner (the viewer doesn't know what it was chosen from), or a four-image slideshow (the comparison is lost). This card makes "parallel" and "focus" two states of one shot. Four rules:
1. **Grid first**: tiles land with a 120ms stagger (not four fading in at once) so the viewer counts them first.
2. **The hero grows and the others shrink on the same inOut curve, starting and ending on the same frame** — it is one reflow, not "one enlarges, three fly away".
3. **The others don't disappear**: they collapse into an equal-size, equally spaced column, keeping the meaning "chosen from these four"; the viewer can compare winner and losers at any time.
4. **Return to the grid before exiting**: symmetrical start and end, so what the viewer remembers is "one of four", not "this one".

## Motion core
- `0.3 / 0.42 / 0.54 / 0.66s` four tiles land (`y 24→0 + scale .97→1 + opacity`, power3.out 0.55s, 0.12 stagger) → grid holds 1.2s → `2.41s` reflow (power3.inOut 0.8s): the hero → 620×444 at (48, 48), the others in original order → right column 220×132 at x 692, y 48 / 204 / 360 (column top aligned to the hero top, 24 gaps) → hold 2.0s (hero inner image pushes `1→1.05` at constant rate from reflow start to grid return) → `5.21s` back to the grid (power3.inOut 0.8s, push eases back with power2.inOut) → hold 0.8s → `6.81s` exit together (0.4s power2.in, 0.04 stagger) → ends `7.33s`.
- Position via `transform: translate()`, size via interpolated width / height (**never left / top**): cover-cropped images re-frame as the box changes and never distort — pure FLIP (translate + non-uniform scale) would stretch both image and label and still require a swap to real dimensions at the end, so only FLIP's translate half is borrowed. Remotion renders each frame independently, so width / height interpolation has no live-layout jitter.
- The hero sits above the others in z-order (during the reflow the top-left tile collapses behind the hero); labels 16px 600 white with text shadow at bottom-left (left 20 / bottom 18).
- Geometry (960×540): 48 safe margin on four sides, 24 gaps → grid 420×210 at (48, 48) / (492, 48) / (48, 282) / (492, 282); hero 620 = 65% wide; column 220 wide, three 132-tall tiles + two 24 gaps = 444 = hero height. White-edge cards padding 8 / radius 12 / the one shadow.
- Grey placeholders in the demo are demo context; in production inject material via `srcs`, labels via `labels`, and pick the hero via `heroIdx`.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `stagger` grid | 0.12s | 100–150ms reads as "in order"; >250 looks like a showcase, <60 like one fade |
| `holdGrid` | 1.2s | = the narration finishing "four candidates"; <0.8 the viewer hasn't counted |
| `reflow` | 0.8s | power3.inOut; <0.5 feels like a cut, >1.2 drags; growth and shrink must share the value |
| `holdHero` | 2.0s | = the sentence about that tile; stretch freely |
| `heroPush` | 1.05 | Hero inner push, rate = .05 / (reflow + holdHero); longer hold → slower push |
| `holdBack` | 0.8s | The symmetrical "one more look"; >1.5 drags |
| Hero width | 65% (620/960) | 60–68%; wider and the column becomes unreadable, narrower and the hero isn't a hero |
| Thumbnail column | 220×132 / 24 gap | Equal size and spacing; column top = hero top, column height = hero height |
| `heroIdx` | 2 (third tile) | Content decides; not a rhythm parameter |

## Pitfalls
- Four tiles fading in together — the grid reads as one image; the "four" in "one of four" is gone.
- Hero grows in 0.6s while the others shrink in 0.9s — two events; the reflow must share one curve, start and end.
- The three losers fade out — degrades to a single-image display, comparison lost; they collapse into a column and stay.
- Animating left / top (live preview) or pure FLIP with non-uniform scale (distortion) — position via transform, size via width / height.
- Column unevenly spaced or its top not aligned with the hero's — instantly "thrown together".
- Exiting after the hero hold without returning — the viewer remembers the last image, not "we chose one".
- Grid <48@960 from the frame edge — edge-hugging (layout.md ①); the lab prototype's 40 margin became 48 on import.
- Labels <16@960 or without text shadow — unreadable on light material.

## Reuse
- Remotion/tsx (preferred): template/cards/grid-to-hero.tsx — `srcs` four items (extension-based `<Img>` / `<OffthreadVideo>`), `labels` four labels, `heroIdx` the hero tile; the exported `END` is the animation end in seconds; to stretch holds to the script edit `CONFIG.holdGrid / holdHero` (T1 / T2 / T_OUT recompute).
- HTML/GSAP: demos/grid-to-hero/index.html — `CONFIG` on top (rhythm + geometry in one place); swap `.pic` blocks for `<img>` / `<video>`.
- Interface with layout.md: 48 safe margin, 24 spacing token (§1 §2); no presenter → group bounding box centred (§4, grid 48–912 centred); one style per group (§8).
- NLE equivalents: CapCut/JianYing four picture-in-picture layers with position / scale keyframes over the same range and curve; AE four layers of Position + Scale keyframes sharing Easy Ease.

## Motion scope
- Belongs to this card: the timetable stagger-120ms landing → hold → one power3.inOut reflow (hero grows + others collapse into an equal column) → hold → back to grid → exit together; hero inner push 1→1.05 (reflow start to grid return); the transform-for-position / width-height-for-size convention; the grid / hero / column proportions (65% hero, column height = hero height, 48 margins, 24 gaps).
- Not this card: grey placeholders (demo context), label copy, the four placeholder tones, the white stage.
- Migration: `srcs` / `labels` / `heroIdx` for content and the winner; `CONFIG.holdGrid / holdHero` follow the narration; a 3-tile version trims `grid` to 3 and the column to two (raise `col.h` to 210 if the column runs short); scale from 960×540 for other frames; portrait becomes 2 rows × 2 columns → hero on top, three thumbnails in a row below.
- Background: white is fine (white edge + shadow separate the cards).

## Placement checks (user-finalized 2026-09-05, copy into the SHOTBOOK self-check column when chosen)
- **Grid geometry**: four 420×210 tiles, 48 from every frame edge, 24 gaps, bounding box 48–912 centred (>48 off = rework).
- **Reflowed geometry**: hero (48, 48, 620, 444), column x 692, y 48 / 204 / 360, 220×132, column top = hero top and column bottom = hero bottom (>8px off = rework).
- **Same start, same end**: on the reflow (2.41 → 3.21) the hero and the three thumbnails start and land together; the 2.8s still shows all four mid-way.
- **Losers stay visible**: during the hero hold (3.21–5.21) all three thumbnails visible, equal size and spacing.
- **Label size**: ≥16@960 (≥32@1080), white with text shadow; legible when shrunk to 390px.
- **Symmetry**: the grid-return frame (6.01) matches the landing geometry exactly; nothing new appears before the exit.
