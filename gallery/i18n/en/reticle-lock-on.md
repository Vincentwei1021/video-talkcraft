---
name: reticle-lock-on
title: Four L-shaped corners fly in from four off-screen directions (±700, ±500) in 10 frames toward a target on a screenshot; on arrival the frame is still 2.2× the target bbox, then shrinks past to 0.94 in 6 frames and back.out-snaps to 1 — the "click" of locking on comes from the overshoot; on that lock frame the target flashes white .55→.28 and stays lit, the label springs out on the right in the same frame, then everything freezes
usage: Narration's "this button / this number / this line" emphasis; locking a key spec in a review; target call-outs on a sound-effect hit; replaces arrow-and-circle without freezing the picture. Input is a screenshot (or a video frame); the presenter is not involved
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Not involved (with a person on screen, put the screenshot on the opposite side, label facing outward) | △ Freeze a frame first, then lock (the picture must be still after the lock) | ✓ (default) settings / billing / table / landing-page screenshots |

The screenshot fills a 700×420 white card (1400×840 at 1080p); the target bbox is measured and injected via `target`; the label sits 18px to the right of the target.

## Common scenarios
1. "This button": locking a button on a settings / paywall page (the demo)
2. Locking a number in a bill or a table
3. Locking a key spec in a review (with a sound-effect hit)
4. Replacing "arrow + red circle": no freeze, with the snap of a lock

## Intent
The library already frames a target two ways: `corner-bracket-frame` appears in place around a word, and `scanline-annotate` snaps a viewfinder from 1.75× wherever the scan line reaches. Both are "a frame appears on the target". Reticle lock-on differs in the **entrance choreography**: the four corners charge in from four off-screen directions (≥1000px of travel), arrive still more than twice the target's size, then shrink past and snap back — the "click" of a reticle locking on, one notch more impact than appearing in place, right for a "that's the one" stress in narration. Four things make it work:
1. **Travel ≥1000px**: shorter reads as "corner marks appear", not "charge in".
2. **Fly-in and shrink decoupled**: the frame is still 2.2× on arrival; shrinking is the second beat — done together there is no "arrive, then bite".
3. **Overshoot snap**: past 0.94 then back to 1; without it there is no click.
4. **Three things on the lock frame together**: snap start, target glow, label pop — off by a frame and it falls apart.
Then everything freezes: this is a one-shot accent, not hold-time motion.

## Motion core
- **Geometry** (960×540, light #f5f5f7): screenshot card 700×420 at (130, 60), white with a 1px hairline, radius 12, 40px browser bar; the demo target (relative to the screenshot) is a button at (30, 300, 190×50); frame = bbox padded by 10 → (bx, by, bw, bh) with centre (cx, cy); corners 22×22, 3px accent L shapes, endpoints = the frame's four corners; label 22px/700 ink on white with a 1.5px accent border, radius 8, at (bx+bw+18, cy−22).
- **Fly-in**: from 1.3s over 0.33s `power2.out`, each corner travels from its endpoint offset by (−700,−500) / (700,−500) / (−700,500) / (700,500); during the flight the scale s stays 2.2 (corners about the centre: `pos = c + (corner − c)·s`).
- **Shrink**: from 1.63s over 0.2s `power2.in`, s 2.2→0.94 (past).
- **Lock LOCK = 1.83s**: s 0.94→1 over 0.15s `back.out(2)`; the target's white glow layer opacity 0→.55 in 0.04s then →.28 in 0.2s and stays; label opacity + scale .6→1 over 0.35s `back.out(1.8)` — all three start on the same frame.
- **Exit**: at 5.6s screenshot + corners + label opacity→0 over 0.4s `power2.in`, done at 6.0s.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `off` off-screen start | (±700, ±500) | ≥1000px of travel is "charging in"; <500 reads as marks appearing |
| `fly` | 0.33s (≈10 frames) power2.out | <6 frames the path is invisible; >15 frames they drift in |
| `big` arrival scale | 2.2 | Must be clearly larger than the target on arrival; 1.3 shows no "then bite" |
| `under` overshoot | 0.94 | No overshoot, no click; <0.9 covers the target's edge |
| `shrink` / `snap` | 0.2s power2.in / 0.15s back.out(2) | Accelerating shrink and an overshooting snap — the feel of a mechanical lock |
| `pad` | 10px | Breathing room between frame and target; 0 is glued, >20 looks like framing something else |
| `flashPeak` / `flashHold` | .55 / .28 | The lingering glow is the "locked" status light; a peak >.7 washes the target out |
| Label position | 18px right of the target, vertically centred | Put the label on the left (same 18px) when the target is in the right half |

## Pitfalls
- Corners appearing from nearby — no charge; degrades into corner-bracket-frame.
- Fly-in and shrink at the same time — one continuous shrink to position, no "arrive, then bite".
- No overshoot — slides to a stop, half the mechanical feel gone.
- Glow and label off by a frame — two separate events instead of one.
- Anything still moving after the lock (breathing corners, floating label) — after the accent, true stillness.
- Locking two targets in one shot — a reticle locks one; for several call-outs use `scanline-annotate`.

## Reuse
- Remotion/tsx (preferred): template/cards/reticle-lock-on.tsx — `src` real screenshot, `target={x,y,w,h}` (relative to the screenshot's top-left), `label`; durationInFrames 192; launch moment via `CONFIG.at`, sentence length via `exitAt / end`. All corner geometry derives from target.
- HTML/GSAP: demos/reticle-lock-on/index.html — `.shot .tg` coordinates and `CONFIG`; swap in `<img>` inside `.shot` for a real screenshot (turn `.tg` into a transparent positioned block; geometry still derives from its offsets).
- Source: video-shotcraft `fui-hud-moves` style B reticle-lock-on (dark HUD version; this card moves to a light stage with accent corners and an ink-on-white label).
- NLE equivalents: four L-shaped stickers in CapCut/JianYing, each with a "fly in from off-screen" keyframe plus a group scale 220%→94%→100%; in AE four Position-keyframed layers parented to a Null whose Scale goes 220→94→100 with an easy-eased overshoot on the last step; put one `pk:mech-lock-quick` hit on the lock frame.
- Interface with layout.md: the 700-wide card at 130 → centre 480 (§4); label 22px ≥ item tier (§5); frame geometry measured from the bbox and padded 10 evenly (§3 annotation geometry); the label never covers screenshot content (it sits in the whitespace right of the target).

## Motion scope
- Belongs to this card: the ≥1000px off-screen charge; fly-in / shrink decoupling; the 2.2→0.94→1 overshoot lock; target glow + label on the lock frame; the freeze afterwards; the shared exit.
- Not this card: the CSS mock settings page, the target coordinates, the label copy, the light stage.
- Migration interface: `src / target / label`; `at` follows the word anchor; at 1080p corners are 44 / 6px, padding 20, label 44px, starts at (±1400, ±1000).
- Background: light parchment #f5f5f7 (the white card lifts via the hairline); pure white also works; on dark, corners become #2997ff and the label a dark tile with light text.

## Placement checks (copy into the SHOTBOOK self-check column)
- **Corner geometry derived from the measured target bbox** (Playwright DOM coordinates / image annotation); frame = bbox padded 10; after the lock, corners off the frame corners by ≤8px (layout.md §3).
- `shot-at 1.5` (mid-flight): corners on screen, not yet arrived, scale 2.2; `shot-at 1.85` (lock frame): corners around the target, target glowing, label already at the right at the same height.
- Label vertically centred on the target (off by ≤8); label right edge ≤ 912; nothing in the subtitle band y ≥ 450.
- Final frame: corners / label / glow all still (two consecutive frames diff to zero).
- One target per shot.
