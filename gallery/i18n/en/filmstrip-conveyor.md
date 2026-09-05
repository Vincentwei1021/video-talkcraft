---
name: filmstrip-conveyor
title: Six 240×160 white-framed cards form a conveyor belt moving left at a constant 176px/s; the card passing the centre line scales continuously up to 1.08 and brightens by its distance from centre (not triggered at a point); when the narration reaches the fourth card the belt decelerates by a position–time piecewise integral (constant → 0.5s decel → 0.25× slow for 1.4s → 0.6s accel → constant) so the deceleration ends exactly with the fourth card centred; once all six cards have passed the centre the whole thing exits
usage: Lists of ≥5 items where only one deserves a closer look — six compositions, ten apps, a year of work, recaps / round-ups / end-credit portfolio streams; "the Nth one matters most" is where the belt slows
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| Not applicable (cards are 240 wide, a talking person is unreadable; use the D-group parallel-sentence cards) | Yes (a few seconds of video per card; its moment is the 2–3s while it crosses the centre) | **Default input** (≥5 same-size images: screenshots / covers / posters) |

Same-size cards are mandatory (mixed orientations get cropped to one 3:2 frame — crop, don't scale). Don't use a conveyor for fewer than 5 items — three or four can simply be laid out (`hero-duo-layout` / parallel-sentence cards); the conveyor only pays off when there are too many to lay out.

## Common scenarios
1. ≥5 items with one highlight: six compositions of last year's top covers, slowing on the fourth (demo)
2. Recaps / round-ups: ten projects this year, eight books read, flowing at constant speed
3. "The Nth one matters most": the key item docks at slow speed for 1.4s, the others just pass
4. End-credit portfolio stream: no slowdown, constant speed until the end (set `slowDur` to 0)

## Intent
When the narration lists more than five things, popping them in one by one (`media-pop-in`) is uncountable and a 3×3 grid shows everything at once with no order.
The conveyor turns "order" into physical motion: items flow right to left across the centre, and whichever one is being talked about is the one in the middle. What makes it work:
1. **Scale and brightness are computed continuously by distance**, not "triggered at the centre" — each frame derives a weight `k` from `|cx − 480|`, so a card grows and brightens gradually and fades back gradually, reading as "passing by"; a point trigger reads as a flash.
2. **The slowdown is a piecewise position–time integral**, not a hard stop — constant v → 0.5s decel to 0.25v → 1.4s slow → 0.6s accel back to v, with equal velocities at every joint; the decel start is back-solved so that decel ends exactly with the key card centred. A hard stop reads as "it froze"; a velocity jump reads as a stutter.
3. **Speed is the narration's rhythm**: constant = "and these too", slow = "this one deserves a word"; the viewer knows where the emphasis is from the speed change alone, no annotation needed.

## Motion core
- Structure: `.hdr` title (26px 700 #1d1d1f at 60/70, note 14px #8a8a8a) → `.center` dock zone (280×200 dashed frame, demo context) → `.strip` (`left: 0; top: 190; display: flex; gap: 24`, the whole strip `translateX(−x)`) → 12 `.item`s (240×160 white-framed cards, padding 6, radius 10, shadow `0 12px 40px rgba(0,0,0,.16)`; the last six are copies of the first six so the right end never goes empty); a 14px label pill bottom-left in each card.
- Geometry: pitch = 240 + 24 = 264, one set setW = 6 × 264 = 1584; constant speed v = setW / loopDur = 1584 / 9 = **176px/s** (≤220 ceiling; at 24fps drop to ~150 first if it judders).
- Displacement curve `stripX(t)` (five segments, equal velocities at the joints):
  - key card (fourth, idx 3) centred at `centerX = 3 × 264 + 120 − 480 = 432`
  - decel distance `dDecel = v × 0.5 × (1 + 0.25) / 2 = 55` → decel start `x0 = 432 − 55 = 377`, `t1 = 377 / 176 = 2.142s`
  - `t1–t2 (0.5s)` decel: `x = x0 + dDecel × e↓(s)`, `e↓(s) = 1.6s − 0.6s²` (starts at v, ends at 0.25v)
  - `t2–t3 (1.4s)` slow at 0.25v: `dSlow = 61.6`
  - `t3–t4 (0.6s)` accel: `dAccel = 66`, `e↑(s) = 0.4s + 0.6s²` (starts at 0.25v, ends at v)
  - then constant; the sixth card is centred at 6.92s
  - general form: `e↓(s) = 2/(1+r)·s − (1−r)/(1+r)·s²`, `e↑(s) = 2r/(1+r)·s + (1−r)/(1+r)·s²`, r = slowTo. The lab prototype used `power2.out/in` over the same distances, which starts at 3v and ends at 0 — a velocity jump at each joint; the library version uses these two velocity-continuous curves instead.
- Per-card weight: `cx = −x + i × 264 + 120` (card centre on screen), `d = min(1, |cx − 480| / 420)`, `k = (1 − d)²`; `scale = 1 + 0.08k`, `brightness = 0.5 + 0.5k`, `z-index = round(10k)`.
- Ending (library version, no infinite loop): `7.5s` title exits → `7.54` strip + dock zone exit (`power2.in` 0.4s, 0.04 stagger) → `7.94` end. The belt keeps moving during the exit (continuous motion lasts the whole shot).
- Everything is a pure function of `t` (`stripX(t)` + `weight(i, x)`); HTML and tsx share the same formula. The demo's GSAP tweens a single clock `o.t` and computes styles in `onUpdate`.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `loopDur` → v | 9s → 176px/s | Time for one set sets the speed; >220px/s card content is unreadable, at 24fps drop to ~150 |
| `slowIdx` | 3 (fourth card) | Which card to slow on; the decel start is back-solved from it |
| `slowTo` | 0.25 | Slow-segment speed; 0 = hard stop (reads as frozen), >0.4 doesn't read as "a word about this one" |
| `decel` / `accel` | 0.5 / 0.6s | Decel slightly shorter than accel ("arriving" is crisper than "leaving"); <0.3 feels like braking |
| `slowDur` | 1.4s | In production = the sentence about that card; 0 = a portfolio stream with no slowdown |
| `maxScale` | 1.08 | Scale at centre; >1.12 crowds the neighbours, >1.15 overflows the card |
| `dimTo` | 0.5 | Brightness furthest from centre; on white <0.4 cards go muddy, >0.7 no focus |
| `reach` | 420px | Influence radius of the weight; smaller = narrower "spotlight", <300 darkens neighbours like a slideshow |
| `gap` / `w` | 24 / 240 | Card spacing / width; changing pitch moves all geometry with it |
| `exitAt` | 7.5s | ~0.6s after the sixth card crosses centre (6.92); a portfolio stream may run until the copies finish |

## Pitfalls
- Point-triggered scaling (`if (cx ≈ 480) scale = 1.08`) — the card flashes at centre, jumping between frames; compute continuously by distance.
- Slowing by dropping `timeScale` to 0 and back (hard stop) — reads as "the video froze"; the slow segment must have non-zero speed.
- `power2.out/in` on trapezoid distances — starts at 3v, ends at 0, velocity jumps at the joints and the picture hitches; use the two velocity-continuous curves above.
- Decel not ending with the key card centred — the viewer sees it stop between two cards and can't tell which one is meant.
- Constant speed above 220 — card content becomes unreadable colour blocks; labels smear completely.
- Six cards with no copies — when the sixth crosses centre the right side goes blank and the "endless" cue breaks.
- Infinite loop — looping is a preview convenience; the finished shot must have a finite length with the exit on the end of the sentence (2026-09-05 duration rule).
- Mixed card sizes / orientations — the conveyor lives on even rhythm; one tall one short breaks it; crop everything to 3:2.

## Reuse
- Remotion/tsx (preferred): template/cards/filmstrip-conveyor.tsx — `srcs` (six real images, `<Img>` cover), `labels`, `title` / `note`; all timing in `CONFIG` (changing `slowIdx` / `slowDur` / `loopDur` recomputes the timetable), `meta.durationInFrames = 250`; for a different count change `CONFIG.n` and recompute `exitAt` as "last card centred + 0.6".
- HTML/GSAP: demos/filmstrip-conveyor/index.html — `.strip` is generated from `CONFIG.n × 2`, swap `.ph` for `<img>`, change `NAMES`; portable core: `CONFIG` + `stripX(t)` + `weight(i, x)` + `apply()` — four pieces that work in any clock-driven environment.
- Interface with layout.md: title 60 from the left / 70 from the top (≥48); belt y 190–350 centred on 270; card labels 14px (=28@1080 minimum legible); the belt running off both edges is semantic ("there's more"), not edge-hugging.
- NLE equivalents: CapCut/JianYing — compose the six images in a row and keyframe Position (two linear keyframes for constant speed, two more in the middle for the slowdown with curve editing); centre scaling needs per-image scale keyframes (tedious). AE — a Null drives Position and each image's scale/brightness is an expression on `Math.abs(thisLayer.position[0] − 960)`, i.e. this card's `weight()`. Stock sites call it a "filmstrip / carousel / conveyor belt showcase".

## Motion scope
- Belongs to this card: constant-speed belt + piecewise position–time integral slowdown (five segments, equal joint velocities, decel ending with the key card centred); per-frame distance-based scale 1.08 / brightness .5→1 / z-order; the six-plus-six-copies structure (no empty right end); the finite ending (whole exit ~0.6s after the last card crosses centre, 0.04 stagger, belt still moving during the exit).
- Not this card: the demo's six grey tones, the "composition one–six" labels and title copy, the dashed dock-zone frame (demo context, removable), the card's exact radius and shadow values, the white stage.
- Migration: `srcs` / `labels` for material and copy; `slowIdx` / `slowDur` follow the narration (which card, how long); `loopDur` sets the speed (slow to ~150px/s for 24fps); scale `w` / `gap` / `reach` with frame width, centre always = frame centre; for portrait, run the belt vertically (`translateY`, weight on `|cy − H/2|`).
- Background: white is fine — white-framed cards separate by shadow and `dimTo .5` reads as "receded" on white; on a dark background raise `dimTo` to .6 and brighten the shadow.

## Placement checks (user-finalized 2026-09-05, copy into the SHOTBOOK self-check column when chosen)
- **Key card centred**: freeze the clock at `t2` (decel end, 2.64s in the demo); the key card's centre is within 4px of x=480 (otherwise `centerX` is wrong or card width/gap disagree with the CSS).
- **Continuous velocity**: capture a frame before and after each of `t1` / `t2` / `t3` / `t4`; displacement deltas match (no jumps); no visible hitch in `--play`.
- **Gradual, not stepped**: the centre card and its neighbours transition monotonically in scale / brightness (no `if` thresholds).
- **Legible**: constant speed ≤220px/s (≤150 at 24fps), card labels ≥14@960, title ≥26@960; labels still readable at 390px wide.
- **Ending**: `exitAt` ≥ last-card-centred time + 0.4 and ≤ the second copy crossing centre (or the viewer sees "composition one" again); the exit lands on the end of the shot, no infinite loop.
