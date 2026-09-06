---
name: gallery-wall-dolly
title: Three peer case photos (430×290) hang on a 3D wall at rotateY −12° (dark-grey radial backdrop + floor reflection); the camera goes wide at z .61 → docks on each photo at z 1.15 (1.0s move + 0.9s hold; the zoom happens around the current photo, the others dim to .5 + blur 3px, the current photo micro-pushes 1→1.03 inside) → pulls back to the wide shot and exits with the text
usage: "Let's look at three examples one at a time", portfolio / case-study tours, three options toured then compared; three **peer** items (for stations in chronological order use timeline-photo-strip); passages that walk through items one by one and then need the whole picture
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| Not applicable (with a person on screen use the D-group card `parallel-items-with-host`) | Yes (a short clip per station; its moment is the 0.9s dock; unify mixed material to one frame ratio — crop, don't scale) | **Default input** (three same-size images; the wall means "three peer cases") |

## Common scenarios
1. "Let's look at three examples one at a time": three signature works hung on a wall, docked in turn, then pulled back to compare (demo)
2. Portfolio / case-study tour: each piece gets a beat, the pull-back shows them side by side
3. Three options toured and compared: see each, return wide, let the narration conclude
4. Three features / three evidence screenshots that are peers with no order

## Intent
The lazy way to "talk through" several images is to cut each one full-screen — but the viewer never learns how they relate. Hanging three images on a 3D wall with real spatial relationships and touring it with a camera gives both layers at once: "one by one" and "they hang side by side". What makes it work:
1. **The camera layer is the only transformed element**: `transform-origin: 0 0`, each station uses `camTo(z, px, py)` to solve `scale / x / y` so the target lands at frame centre — **the zoom happens around the current image**. A fixed origin plus offsets throws in a sideways drift whenever zoom changes, which reads as "the camera is searching" (same rule as `stage-keyframe-tour`).
2. **Docks are truly still, but the current image moves inside**: this is a docking card (the `stage-keyframe-tour` exception) — the camera does not drift in the hold; keeping the picture alive is delegated to the current photo's 1→1.03 inner micro-push.
3. **Always pull back to the wide shot**: after three close looks the viewer needs one glance at where they sit; the exit follows together with the text.

## Motion core
- Structure: `.world` (`perspective: 1200px; perspective-origin: 50% 50%`, dark-grey radial backdrop) → `.cam` (camera layer, `position: absolute; inset: 0; transform-origin: 0 0; preserve-3d`) → `.wall` (1700×540, `rotateY(−12°)`, `transform-origin: 850px 270px`, with a `.floor` reflection at `rotateX(80°)`) → three 430×290 white-framed photos (padding 10, radius 12, shadow `0 12px 60px rgba(0,0,0,.22)`, inner `.frame` clip + `.ph` material) at `left 140 / 640 / 1140, top 125` (centres x 355 / 855 / 1355, y 270).
- `camTo(z, px, py) = { scale: z, x: 480 − z·px, y: 270 − z·py }` — the camera layer is not full-bleed material and the backdrop is static, so there is no "edge leak" and no clamping.
- Because the wall is rotated −12° around x=850, dock targets use the **rotated coordinate** `wallX(cx) = 850 + (cx − 850)·cos12°`, otherwise every station is off-centre by 11–14px. Wide shot `camTo(.61, 942, 270)`: the near end is wider under perspective; at .61 the three projections leave 53px on both sides, and x 942 is solved by centring the projected bounding box (the lab's .72 / 850 cut off the third photo).
- Timetable: `0–0.8` wide → per station `move 1.0s power2.inOut` to `camTo(1.15, wallX(cx), 270)` + `hold 0.9` (the other photos go `brightness .5 + blur 3px` over 0.5s starting 0.5s into the move; the current `.ph` scales 1→1.03 linear over 1.2s starting 0.7s into the move) → `6.5–7.7` pull back (everything restores over 0.6s from 6.8) → `7.7` photos exit 0.4 (stagger 0.04) → `8.2` end.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `stopZ` dock zoom | 1.15 | Magnification ≤1.2; below 1.05 it no longer reads as "stopping to look at this one" |
| `wideZ` / `wideAt` | .61 / 942 | The wide shot must fit all three with ≥48 on both sides; perspective makes the near end wider — re-solve when the wall angle changes |
| `move` | 1.0s | <0.7 reads as a whip (transition voice), >1.5 the viewer waits for it |
| `hold` | 0.9s | **The information lives in the hold**; in delivery give it "how long this photo is talked about"; <0.6 is a wasted trip |
| `dim` / `blur` | .5 / 3px | Demotion of the other photos; depth blur is the "near sharp, far soft" spatial hint |
| `push` | 1.03 | The current photo's anti-freeze micro-push; >1.05 reads as a second push-in |
| `pull` | 1.2s | Slightly longer than a single move (it covers more distance) |
| `wallRy` | −12° | Wall tilt; readable up to 25°; changing it means re-solving `wideZ` / `wideAt` |

## Pitfalls
- Faking docks with a fixed `transform-origin` (centre) plus offsets — zoom changes throw in sideways drift, "the camera is searching"; every target must be solved to frame centre.
- Using the unrotated photo centre as target — the wall is rotated −12°, the projected centre is off by 11–14px, every station stops slightly off; use `wallX()`.
- Copying the lab's .72 wide zoom — the near end is wider under perspective and the third photo gets cut; solve the wide zoom from the projected bounding box.
- Letting the camera drift in the hold (a `camEase` with non-zero end speed) — this is a docking card; drifting turns "stop and talk about this one" into "passing by"; anti-freeze belongs to the inner push.
- Nothing moving in the hold (no push) — 0.9s of total stillness reads as a dropped frame (and fails motion_check).
- Exiting without the pull-back — the viewer never learns where the three sit; the tour reads as three unrelated close-ups.
- A 3D wall on a white stage — rotated photos look like floating paper and the dim / blur of the others turns into grey sheets (see background requirement).
- Forcing ordered stations onto this card — "three peers" and "stations in order" are different grammars; use `timeline-photo-strip` for order.

## Reuse
- Remotion/tsx (preferred): template/cards/gallery-wall-dolly.tsx — `srcs` three real images, `labels` the on-photo tags; 258 frames (8.2s + 0.4s), the exported `END` is the animation end in seconds; for a different station count change `CONFIG.centers` (and the photo `left`s), for longer holds change `CONFIG.hold`.
- HTML/GSAP: demos/gallery-wall-dolly/index.html — `CONFIG` is the whole rhythm; swap `.ph` for `<img>`, `.tag` for copy; the portable core is `CONFIG` + `camTo()` + `wallX()` + the timeline.
- Boundary with `timeline-photo-strip`: that card pans along a timeline through ordered stations; this one hangs three peers on a wall and opens wide — decide the relationship first, never chain both in one shot.
- Boundary with `stage-keyframe-tour`: that card tours points of interest on one oversized page; this one hangs **several independent images** in a world with an `origin 0 0` camera — same camera discipline, different material shape.
- layout.md interface: wide shot leaves ≥48 on both sides (53 measured), tag 20px (23 when docked ≈ 46@1080).
- NLE equivalent: in AE put three images in one comp (3D layers + camera), keyframe the camera's Position / Zoom, two identical keyframes per station form the hold, Easy Ease then pull handles to inOut. Stock sites call it "gallery wall dolly".
- Sound: one `pk:counter-clock-tick-single` (vol .4, clip ~1) at each camera start, one lowered `pk:transition-air-whoosh-powerful` (vol ≤.3) on the pull-back; **never a sound in the hold**.

## Scope
- This card: the camera-layer `origin 0 0` + `camTo` docking structure (zoom around the current image); the beat "wide → move power2.inOut → truly still dock → next → pull back → exit with the text" (1.0 + 0.9 / pull 1.2); the current photo's 1→1.03 push + others dim .5 + blur 3 focus handling; the 3D wall (−12°, perspective 1200, floor reflection, rotated coordinate `wallX`, wide zoom solved from the projected box).
- Not this card: the demo's sample photos (demo context, `demos/_lib/media`, not part of the card), the "case one–three" copy, the frame's exact radius / shadow, the backdrop's exact colours.
- Migration: `srcs` / `labels` for material and copy; `hold` to match narration; station count via `centers` (+ photo `left`); for another frame size scale the geometry from 960×540 and replace 480 / 270 in `camTo` with the new centre.
- Background: **needs the dark-grey radial backdrop** (`radial-gradient(ellipse at 50% 40%, #26262e, #0f0f13 75%)`) — white-framed photos on a 3D wall only read as "hanging" against a dark floor-reflected stage. Light-style pieces swap in a dark tile of the same style per design-language §0.4.

## Placement checks (copy into the shot's SHOTBOOK check column)
- **Centred dock**: grab a frame mid-hold at each station; the current photo's centre is within 8px of (480, 270) (more usually means `wallX` was skipped).
- **Wide shot fits**: ≥48 on both sides in the wide frame (53 measured); re-solve `wideZ` / `wideAt` after changing the wall angle.
- **Hold truly still + push running**: the camera transform is identical frame to frame in the hold; the current `.ph` scale runs monotonically 1→1.03.
- **Type size**: tag ≥20@960 (still legible at 390px wide).
- **Has the pull-back**: the timetable ends with a pull-back, and the exit aligns with the shot end.
