---
name: parallel-items-with-host
title: When the narration lists "A, B, C" while the presenter stays in frame, the three items pop in one by one with the voice (0.6s apart), each with a large label pressed onto its image — seven layouts switchable on one card: head-row cards / three color-recovering bands / blurred-self column / top card stack / vertical thirds / diagonal thirds / background swap with big words
usage: Any parallel sentence — "three things / three places / three steps / three kinds" — with the presenter on camera (matted or raw); the single most frequent shot in knowledge, lifestyle, travel and productivity narration
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| **Required** (full-body matte / cropped small box / circular avatar / blurred as bed — form follows layout) | The four full-bleed layouts (② ⑤ ⑥ ⑦) accept video in their bands / strips / backgrounds | All layouts (the default input for the three items) |

The three small-card layouts (① ③ ④) have 200–340px cards — video is unreadable there, use images. Inject the presenter as an alpha video via `hostSrc` (`references/host-footage.md`).

## Common scenarios
1. The generic "three things": three weekend things, three habits, three reasons — ① head-row cards
2. All three items have strong full images (three trips, three cities), information outweighs the presenter — ② color-recovering bands / ⑤ vertical thirds
3. Three steps / three tools / a checklist (works with icon chips too) — ③ blurred-self column
4. Ordered steps (shoot → cut → post), progression, a stack of evidence — ④ top card stack
5. High-energy parallels (three ways to play / three camps) — ⑥ diagonal thirds
6. Each item deserves a full image and they need no side-by-side comparison — ⑦ background swap + big word (sequential, not simultaneous)

## Intent
"First… second… third…" is the most frequent sentence shape in narration, and the presenter is still in frame — where the three assets go is a question every video must answer.
Douyin editing tutorials have turned this into a copy-the-homework routine (@剪辑李一手 and @剪Bingo子, read frame by frame on 2026-09-05, de-duplicated and re-laid for landscape, seven layouts kept).
The seven look very different on the surface and share one discipline underneath. Three rules make them work:
1. **The presenter is always present**, but the form follows the layout: full-body at the bottom (① ⑤ ⑦) / shrunk into a small box (② ③ ④) / circular avatar (⑥) / blurred into the bed with a small box proving "I'm still here" (③). Once the person disappears, narration becomes a voiced slideshow.
2. **The three items appear one by one with the voice** (0.6s apart, one entrance each). Fading all three in together loses "first, second, third"; gaps over 1s scatter them into three unrelated cards. Color recovery and background swap are two renderings of the same rhythm.
3. **Labels sit on the image and are large**: 26px on the 960 stage (≈52px at 1080p), 36–40px for full-bleed splits, 84px for the big-word layout. Small equals absent (layout.md §5, items ≥40).

## Motion core
- One layout = one shot: `lead 0.4s` (the presenter stands a beat) → items enter at `0.4 / 1.0 / 1.6s` → `hold 0.8s` (stretches with the voice in production) → at `2.7s` all three exit over 0.35s (0.04 stagger) → done at `3.1s`. All seven share this table; ⑦ widens the gap to 0.75s (a full-screen swap needs a touch more time than a card).
- Four entrance grammars: **pop** (① ③ ④: `scale .8→1` / `x 60→0` / `x 120→0 + rotate +6→rest`, `back.out(1.7)` or `power3.out`, 0.45–0.5s); **color recovery** (②: `grayscale 1→0 + brightness .55→1` in 0.45s, label slides in from the right `x 40→0` on the same frame; the previous band **stays colored**, accumulating to all three); **wipe** (⑤: `clip-path inset(0 100% 0 0) → inset(0)` 0.5s); **slide** (⑥: whole diagonal band `translate(-140,-70)→0` 0.5s); **crossfade** (⑦: background fades in 0.3s + `scale 1.04→1` over 0.9s, previous one fades 0.05s after the next starts; big word `y 20→0` 0.4s, outgoing word rises 14px while fading).
- Presenter forms: full-body containers 410 / 455 / 477 tall (video = 88%) standing at the bottom; boxes 120×130 (②) / 120×126 radius 26 (③) / 180×220 (④) with `object-fit: cover; object-position: 50% 8%` for head and shoulders; avatar 170 diameter with `scale 1.35` on the face. Boxes and avatar have their own entrance (`scale .9→1` / `y −12→0` / `y 10→0` from 0.1s; the ⑥ avatar pops at 0.6s with `back.out(1.6)`).
- Geometry (960×540): ① three cards 200×124, 24 gaps, group width 648 centred, top 48 (card bottom ≥36 above the head); ② bands 180 tall, label right 60; ③ cards 300×96 centred at x 330, 18 apart; ④ cards 340×210 at (300, 36), tilts −4° / +3° / −2°, offsets (0,0) / (18,10) / (36,20), box 180×220 at (390, 286); ⑤ strips 320 wide, label top 40; ⑥ slope 260/540, band width 380, avatar 170 at (395, 185); ⑦ big word top 60 with a 35% black scrim over the top for legibility.
- The layout-name tag and grey placeholder images in the demo are demo context; in production inject real images via `srcs`, copy via `items`, and pick one `layout`.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `gap` | 0.6s | Follows the "first… second…" cadence; <0.45 reads as simultaneous, >1.0 scatters into three cards |
| `pop` | 0.45s | The back.out overshoot is the "slapped on" feel; >0.6 drags, <0.3 has no bounce |
| `hold` | 0.8s (demo) | In production = the length of the sentence; the viewer must finish reading the third label before exit |
| `exit` | 0.35s | Exits are faster than entrances; >0.5 looks reluctant |
| `swapGap` (⑦) | 0.75s | Interval between full-screen swaps; <0.6 flickers, >1.2 turns each image into its own shot |
| Label size | 26 / 36–40 / 84 | 960-stage values (×2 for 1080p); below 26 equals no label |
| Box / avatar position | see geometry | Only move where it stays out of the face safe zone and off the labels; ⑥ keeps ≥40 around the avatar |

## Pitfalls
- Fading all three in together — the ordering is lost, the viewer can't tell which is "second".
- Labels too small (<26@960) or placed off the image on their own line — image and word split apart; three nameless pictures.
- Cutting the presenter away or freezing them into a static headshot — narration becomes a voiced slideshow; the small box must contain the still-talking video.
- ② A band turning grey again after recovering — that's "focus switching", not "accumulated listing"; by the third band the viewer has forgotten the first.
- ④ The next card fully covering the previous one — reads as replacement, not a stack; leave a corner showing (18px offset + tilt).
- ⑥ Inconsistent slopes, or the avatar overlapping a label — the diagonal's energy depends on parallel edges; labels go in the band corner away from the avatar.
- ⑦ The big word over the face — the word lives only in the top 60–150 band above the head; the background changes, the person does not.
- Two layouts in one shot — layout is grammar, one sentence speaks one; the demo tours all seven to show them, production uses one per shot.

## Reuse
- Remotion/tsx (preferred): template/cards/parallel-items-with-host.tsx — `layout` picks one (default `"tour"` = the demo), `items` three labels, `srcs` three real images, `hostSrc` the presenter alpha video; duration via the exported `durationFor(layout)` (105 frames for one layout, 663 for the tour); stretch `CONFIG.hold` for longer sentences.
- HTML/GSAP: demos/parallel-items-with-host/index.html — the `PRESETS` array sets tour order and count (trim to one for a single-layout preview); `CONFIG` holds all timing; each layout is one `<div class="preset">`; swap `.ph` blocks for `<img>` for real images.
- Interface with layout.md: with a presenter present, the group goes on the opposite side / face safe zone wins (§4); labels ≥ the list-item tier (§5); the three-card group is centred as a bounding box with 24px inner gaps (§2 §4).
- NLE equivalents: CapCut/JianYing picture-in-picture + keyframes per card with "Bounce In"; template stores under "list / three things"; AE is three layers of scale/position keyframes with an Overshoot expression.

## Motion scope
- Belongs to this card: the 3.1s per-layout timetable (0.4 lead / 0.6 gap / 0.8 hold / 0.35 exit) and the seven entrance grammars (pop / accumulating color recovery / wipe / diagonal slide / crossfade + word swap); the four presenter treatments and their entrances; the three rules "one by one, on the image, large"; per-layout geometry (centred group, ≥36 above the head, label right 60 / top 40, slope 260/540, big word top 60).
- Not this card: the presenter video and grey placeholder images (demo context), the item copy, the three placeholder tones, the layout-name tag (tour only), the white stage.
- Migration: `layout` to pick; `items` / `srcs` for copy and images; `hostSrc` for the person; `CONFIG.hold` follows sentence length; scale geometry from 960×540 for other frames, and for portrait turn ①'s row into two rows or use ③.
- Background: white is fine; ② ⑤ ⑥ ⑦ cover the stage with material anyway; ③ brings its own mid-grey `#dfe1e6` bed.

## Placement checks (user-finalized 2026-09-05, copy into the SHOTBOOK self-check column when chosen)
- **Face safe zone first**: run `scripts/face_bbox.py` for the measured bbox; ① keeps card bottoms ≥36 above the head, ⑤ ⑦ labels / big words never enter the bbox, ⑥ keeps ≥40 around the avatar clear of labels — violate any and switch layout (layout.md §4).
- **One by one**: entrance starts differ by `gap` (0.6s); a still at the first item's landing frame shows the second not yet started.
- **Label size**: card layouts ≥26@960 (≥52@1080p), full-bleed splits ≥36, big word 84; still legible when shrunk to 390px wide (layout.md §5 ⑨).
- **Group geometry**: ①'s three-card bounding box centred horizontally (>48px off = rework), 24px inner gaps; ③ column centred and co-axial with the top box; ④ previous card shows a corner (offset ≥18).
- **One layout per shot**: the SHOTBOOK writes a single `layout` for the shot; adjacent shots don't reuse the same layout.
