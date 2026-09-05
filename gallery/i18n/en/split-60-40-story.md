---
name: split-60-40-story
title: The left 60% (576px) holds one asset slowly pushing 1→1.06 as the lead (for the length of the shot), a 3px white seam, and the right 40% a 30px two-line title plus three pastel chips (24px bold) popping in with the voice at 1.0 / 1.6 / 2.2s (back.out); at 6.8s asset, seam and text all close on the same frame
usage: "Watch it work while you note the points" — screen recording / live footage + three points; presenter + points (the presenter in the left pane); product demo + three selling points; tutorial steps with narration. ≤4 points
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✓ The presenter in the left pane (`hostSrc` alpha video, standing at the pane's bottom, pushed with the pane) | ✓ The left pane's main input: screen recording / live footage (`src`, cover fill) | ✓ One large image slowly pushed in the left pane |

The left 60% takes anything; the right 40% is **always text**.

## Common scenarios
1. Watch the video, hear the points: screen recording / footage + three chips (the demo: "it did three things overnight")
2. Presenter + points: the presenter on the left, the points on the right
3. Product demo + three selling points
4. Tutorial steps with narration

## Intent
The first multi-asset research rule is "decide the relationship before the layout": primary/secondary → hero + two, comparison → split, **lead/follow → 60/40**. The left is the lead (one moving asset the viewer watches), the right the follower (points the viewer notes while listening) — not a 50/50 comparison. Four things make it work:
1. **The left pane's push runs for the shot's duration**, constant rate, non-zero end speed (`slow-push-in`'s rule: the camera never stops dead).
2. **Chips appear one by one with the voice** (0.6s apart, back.out overshoot = "slapped on"); three fading in together is a slideshow.
3. **The right column's left edge snaps to one grid line**: the title's first glyph and the chip's colour block share x 620@960 (layout.md §3); chips share height and padding; pastel backgrounds **don't repeat within the group** (§7's counter-example is three white same-colour chips).
4. **Chip type 24@960 ≈ 48@1080p** meets the list-item tier ≥40 — "too small equals absent" is the defect the user caught on 2026-09-05.

## Motion core
- **Geometry** (960×540): left pane x 0–576, height 540, `overflow: hidden` (what pushes out never crosses the seam); seam x 576–579 white; right column from x 620: title top 78 (30px 700 line-height 1.3, two lines), chips top 216 / 290 / 364 (≈54 tall, 20 apart), padding 10×20, radius 14, backgrounds `#E8F0FF / #FFE9F0 / #E6F7F2`, type 24px 700 `#1d1d1f`.
- **Left pane push**: camera layer `scale 1→1.06` linear, duration = `end` (6.8s), origin 50% 50%; with `hostSrc` the presenter stands at the pane's bottom (video = 88% of pane height) and is pushed too.
- **Title**: from 0.3s, 0.5s `power3.out`: opacity 0→1, y 12→0.
- **Chips**: from `1.0 + i×0.6`, each 0.45s `back.out(1.7)`: opacity 0→1, scale .9→1, y 10→0.
- **Exit (end-aligned)**: the text group leaves at 6.28 / 6.32 / 6.36 / 6.40, each 0.4s `power2.in` (title first, last chip done at 6.8); asset + seam 6.4–6.8 `power2.in`; everything closes within the frame at 6.8.
- The grey footage placeholder in the left pane (light streaks drifting at 40px/s) is demo context; production uses `src` / `hostSrc`.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `split` | 576 (60%) | 55–65%; ≤50% flips lead/follow into comparison; the right column must be ≥ the longest chip + 2×padding |
| `push` | 1.06 | 1.04–1.08; >1.1 softens screen-recording text; rate = 0.06/end, longer sentences push slower |
| `gap` | 0.6s | The point-by-point cadence, 0.5–0.7; >1.0 scatters into three cards |
| `pop` | 0.45s | The back.out overshoot is the "slapped on" feel; <0.3 has no bounce |
| Chip size | 24@960 | ≈48@1080p list-item tier; <20@960 equals absent |
| Chip count | 3 (≤4) | For 4, tops 200 / 268 / 336 / 404; ≥5 use `chapter-progress-list` |
| `chipBg` | three pastels | Never repeat within the group; the film has one accent colour and chip beds don't count as it |
| `stagger` | 0.04 | End-aligned to `end`; 0 (all together) also works |

## Pitfalls
- Three chips fading in together — slideshow.
- Same-colour chip beds (three white boxes) — read as three identical empty frames (layout.md §7 counter-example).
- Chip type <20@960 — "too small equals absent".
- Push layer not clipped — the pushed asset crosses the seam into the right column (the lab prototype didn't clip; the library version gives the left pane `overflow: hidden`).
- Push with a fixed duration: shorter than the shot and the asset stops dead, longer and it keeps moving after the text has left — duration must equal the shot.
- Title and chips aligned independently (chips nudged with margins to match the text) — ragged; both containers snap to x 620.
- The presenter in the left pane touching the top or cut by the pane edge — the presenter container is 88% tall and centred, 576 is wide enough; if not, shorten the right column's copy rather than shrinking the person.

## Reuse
- Remotion/tsx (preferred): template/cards/split-60-40-story.tsx — `src` (B-roll) / `hostSrc` (the presenter, takes precedence over src) / `title` line array / `chips` / `chipBg`; durationInFrames 216; sentence length via `CONFIG.end` (push and exit follow automatically).
- HTML/GSAP: demos/split-60-40-story/index.html — `CONFIG` holds all timing; replace `.cam .ph` with `<video class="fill">`; chip `top` and `background` are inline and directly editable.
- NLE equivalents: CapCut/JianYing picture-in-picture cropped to 60% + scale keyframes 100→106 over the whole shot + "label" text templates entering one by one; CapCut's Split Screen has no 6:4 preset so crop by hand; AE left layer with linear Scale keyframes + a right-side shape+text precomp with Overshoot.
- Interface with layout.md: the right column at x 620@960 = 1240@1080p is <32 from the 8th grid line at 1269, acceptable (the natural 60/40 grid line sits at 1152 + gutter); chips ≥ the list-item tier (§5); pastel beds within the group (§7); text inside the left asset must not collide with the right column (§6).

## Motion scope
- Belongs to this card: the 60/40 lead/follow relationship and the 3px seam; the left pane's 1→1.06 push for the shot's duration with in-pane clipping; the 0.3s title rise; chips popping 0.6s apart with back.out; the right column's shared grid line, equal chip height and padding, non-repeating pastels; the end-aligned joint exit.
- Not this card: the footage placeholder and its drifting streaks, the sample copy, the exact pastel values (swappable but never repeating in a group), the presenter video, the white stage.
- Migration: `src` / `hostSrc` / `title` / `chips` / `chipBg`; `CONFIG.end` follows the sentence; for portrait output stack 60/40 vertically (asset above, chips below); ×2 every px for 1080p.
- Background: white is fine; the lab prototype's right column was `#f5f5f7`, and after the switch to white the seam matches the right column — it stays, because it becomes the divider the moment the right column gets a light bed.

## Placement checks (copy into the SHOTBOOK self-check column when chosen)
- Right column left edge: the title's first glyph and the chip colour blocks share one x (620@960), >4px off = rework; chips share height (padding 10/20) and radius.
- Chip type ≥24@960 (≥48@1080p); still legible when shrunk to 390px wide.
- On the last frame of the push the asset is still inside the pane (`overflow: hidden`), nothing spills onto the seam.
- With `hostSrc` the presenter is not cut by the pane's left/right edges, breathing margin ≥10 (verify checks this); the face safe zone stays inside the left pane and clear of the right column.
- Text inside the left asset (recording UI) must not collide with the right column; if it does, drop `push` to 1.04 or re-crop the asset.
