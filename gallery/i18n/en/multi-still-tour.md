---
name: multi-still-tour
title: Several images hang in one "world" and the camera docks on them one by one (move → truly still dock → next), then pulls back to the wide shot and exits with the text; two layouts on one card — wall (three 430×290 photos on a 3D wall at rotateY −12°, wide z .61 → dock z 1.15 per photo (1.0s move + 0.9s hold, others dimmed .5 + blur 3px, the current photo micro-pushes 1→1.03 inside) → pull back) / timeline (four 240×160 photos alternating above and below a timeline, the camera pans station to station (0.9s move + 1.0s hold, current station 1.03 and bright / others .7) → pulls out to z .62 to see the whole strip)
usage: "Let's look at three examples one at a time", portfolio / case-study tours, three options toured then compared (wall); growth stories, version evolution, four points in time, year in review (timeline); any passage that walks through items one by one and then needs the whole picture
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| Not applicable (camera moves are for material; with a person on screen use the D-group parallel-sentence cards) | Yes (a short clip per station; its moment is the 1s dock; unify mixed material to one frame ratio — crop, don't scale) | **Default input** (wall: three same-size images; timeline: 3–5 stations, one image each) |

Wall means "three peer cases", timeline means "several stations in order" — decide the relationship first, then the layout; never chain both in one shot.

## Common scenarios
1. "Let's look at three examples one at a time": three signature works hung on a wall, docked in turn, then pulled back to compare (demo wall)
2. Growth story / version evolution: "from one laptop to a studio of my own", four stations panned (demo timeline)
3. Portfolio / case-study tour; three options toured and pulled back to compare (wall)
4. Event walk-through / year in review: 3–5 points in time along one line, then the whole line (timeline)

## Intent
The lazy way to "talk through" several images is to cut each one full-screen — but the viewer ends up not knowing how they relate (three peer cases? four stations in order?).
Hanging them in a world with spatial relationships and touring it with a camera gives the viewer both layers at once: "one by one" and "where they sit". What makes it work:
1. **The camera layer is the only transformed element**: `transform-origin: 0 0`, and each station uses `camTo(z, px, py)` to solve `scale / x / y` so the target lands at frame centre — **the zoom happens around the current image**. A fixed origin plus offsets throws in a sideways drift whenever zoom changes, reading as "the camera is looking for something" (the same rule as `stage-keyframe-tour`).
2. **Docks are truly still, but the current image moves inside**: this is a docking card (the `stage-keyframe-tour` exception) — the camera does not keep drifting in the hold; keeping the picture alive is delegated to the current photo's 1→1.03 inner micro-push (wall) or the 1.03 highlight of the current station (timeline). Every frame changes, yet "we stopped to look at this one" stays intact.
3. **Always pull back to the wide shot**: after three close looks the viewer needs one glance at where they sit in the whole; the hold after the pull is deliberate (timeline 1.2s) and the exit follows it together with the text.

## Motion core
- Shared structure: `.cam` (camera layer, `position: absolute; inset: 0; transform-origin: 0 0`) → several `.photo`s in world coordinates (white frame padding 10, radius 12, shadow `0 12px 60px rgba(0,0,0,.22)`, inner `.frame` clip + `.ph` material). `camTo(z, px, py) = { scale: z, x: 480 − z·px, y: 270 − z·py }` — the camera layer is not full-bleed material and the backdrop is static, so there is no "edge exposure" and no clamping as in `slow-push-in`.
- **wall**: `.world` (`perspective: 1200px; perspective-origin: 50% 50%`, dark-grey radial backdrop) → `.cam` (`preserve-3d`) → `.wall` (1700×540, `rotateY(−12°)`, `transform-origin: 850px 270px`, with a `.floor` reflection at `rotateX(80°)`) → three 430×290 photos at `left 140 / 640 / 1140, top 125` (centres x 355 / 855 / 1355, y 270). Because the wall is rotated −12° about x=850, dock targets use the **rotated coordinate** `wallX(cx) = 850 + (cx − 850)·cos12°`, otherwise every dock is 11–14px off-centre. Wide shot `camTo(.61, 942, 270)`: under perspective the near side is wider; at .61 the three projected photos leave 53px on each side, and the target x 942 is solved from the projected bounding box (the lab's .72 / 850 cut off the third photo).
  Timetable: `0–0.8` wide → per station `move 1.0s power2.inOut` to `camTo(1.15, wallX(cx), 270)` + `hold 0.9` (the other photos go `brightness .5 + blur 3px` over 0.5s starting 0.5s into the move; the current photo's `.ph` scales 1→1.03 linear over 1.2s starting 0.7s into the move) → `6.5–7.7` pull back to wide (all restored over 0.6s from 6.8) → `7.7` photos exit 0.4 (0.04 stagger) → `8.2` end.
- **timeline**: white stage, `.cam` 1600 wide; one line (`left 60, top 300, 1500×3, #1d1d1f`) + four 240×160 photos alternating above/below (`(120, 90) / (480, 330) / (840, 90) / (1200, 330)`, centres x 240 / 600 / 960 / 1320, 360 apart); date captions 22px 700 on the line's side of each photo (top row below the line at 318, bottom row above it at 266), `nowrap`. Dock `camTo(1.05, cx, 270)`: 1.05 pushes neighbours 24px out of frame (at 1.0 they sit flush with the frame edge and their captions are 6px from it — reads as edge-hugging); top-row photos sit 49.5 from the top. Pull-out `camTo(.62, 780, 300)` shows the whole strip (71px on each side).
  Timetable: `0` first station centred, all `.7` → `0.4` first station lights (`brightness 1 + scale 1.03`, 0.4s) → `1.4 / 3.3 / 5.2` pan to stations two/three/four (`move 0.9 power2.inOut`, highlight starts 0.5s into the move) → `7.1–8.2` pull out (all restored over 0.5s from 7.4) → `8.2–9.4` deliberate hold → `9.4` captions + line exit, `9.44` photos exit (0.4, `power2.in`) → `9.9` end.
- The demo hard-cuts from wall (0–8.2) to timeline (8.2–18.1); the grey layout-name tag is demo context. The tsx takes `layout="wall" | "timeline"`, `durationFor(layout)` gives the single-layout length (258 / 309 frames), and the default `"tour"` = the demo (555 frames).

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `stopZ` | wall 1.15 / timeline 1.05 | Zoom ≤1.2; wall <1.05 doesn't read as "stopping to look"; timeline 1.0 leaves neighbours flush with the edge, >1.1 pushes the top row into the safe margin |
| `wideZ` | wall .61 / timeline .62 | The wide shot must fit every photo with ≥48 on each side; the wall has perspective (near side wider) — re-solve `wideAt` after changing the angle |
| `move` | 1.0 / 0.9s | <0.7 reads as a whip (transition voice), >1.5 the viewer waits for it to land |
| `hold` | 0.9 / 1.0s | **The information lives in the hold**; in production = how long that image is discussed; <0.6 is a wasted trip |
| `dim` / `blur` | wall .5 + 3px / timeline .7 | De-emphasis of the others; the wall's blur is a "near sharp, far soft" depth cue; the flat timeline doesn't blur |
| `push` / `focus` | 1.03 | Keeps the docked image alive / highlights the station; >1.05 reads as a second push-in |
| `pull` | 1.2 / 1.1s | Slightly longer than a station move (longer distance); a hold must follow the pull before the exit |
| `tailHold` (timeline) | 1.2s | Deliberate hold on the whole strip; in production = the closing sentence |
| `wallRy` | −12° | 3D wall tilt; ≤25° stays readable; changing it requires re-solving `wideZ` / `wideAt` |
| Station spacing | 360 (timeline) | With the dock zoom it sets how much of the neighbours shows; <300 shows three per screen (not a tour), >420 pans too fast |

## Pitfalls
- A fixed `transform-origin` (center) plus offsets to fake docking — zoom changes throw in a sideways drift, "the camera is searching"; every target must be solved to frame centre.
- Using un-rotated photo centres as wall targets — the wall is at −12°, projected centres are 11–14px off and every dock stops slightly wrong; use the rotated `wallX()`.
- Copying the lab's .72 wide shot — under perspective the near side is wider and the third photo gets cut; solve the wide zoom from the projected bounding box, not flat dimensions.
- Letting the camera keep drifting in the dock (`camEase` with non-zero end speed) — this is a docking card; drifting turns "we stopped to look" into "we passed by"; keep-alive belongs to the inner micro-push.
- Nothing moving in the dock (no micro-push / highlight) — 0.9s of total stillness reads as a frozen frame (motion_check FAILs too).
- Ending without a pull-back — the viewer has seen three details and doesn't know where they sit; the tour reads as three unrelated close-ups.
- Timeline dock at 1.0 with 360 spacing — neighbours flush with the edge and their captions 6px from it read as edge-hugging; 1.05 pushes them clearly out.
- Timeline photos not alternating — four in a row, neighbouring captions collide and the pan reads as a row of thumbnails.
- Chaining both layouts in one shot — wall is "peer cases", timeline is "stations in order"; different grammar. The demo tours both only to show them.
- Cutting right after the pull-back — the viewer just got the whole picture and is cut away; hold, then exit.

## Reuse
- Remotion/tsx (preferred): template/cards/multi-still-tour.tsx — `layout` picks one (`"wall"` / `"timeline"`, default `"tour"` = the demo), `srcs` real images (wall uses the first 3, timeline the first 4), `labels` captions; duration via the exported `durationFor(layout)` (wall 258 / timeline 309 / tour 555 frames); for a different station count edit `CONFIG.*.centers` (plus the photo `left`s for wall, or `TL_POS` and the line length for timeline); for longer holds edit `CONFIG.*.hold`.
- HTML/GSAP: demos/multi-still-tour/index.html — each `.preset` is self-contained, delete one for a single-layout preview; swap `.ph` for `<img>`, change `.tag` / `.cap` copy; portable core: `CONFIG` + `camTo()` + `wallX()` + the two timeline blocks.
- Boundary with `stage-keyframe-tour`: that card is one long page larger than the frame with multi-keyframe points of interest (`transform-origin` set to the POI every frame); this card is **several independent images** in a world with the camera layer solved from `origin 0 0` — same camera discipline, different material. One long image → that card; several images → this one.
- Interface with layout.md: wall wide shot keeps ≥48 on each side (measured 53), tag 20px (23 when docked ≈ 46@1080); timeline dock keeps the top row ≥48 from the top (49.5), caption 22px (23 docked / 13.6 pulled out ≈ 27@1080, the legibility floor), pulled-out strip 71 on each side; neighbours leaving the frame is camera semantics, not edge-hugging.
- NLE equivalents: AE — place the images in one comp (3D layers + a camera for the wall), keyframe the camera's Position / Zoom with two identical keyframes per station for the hold, Easy Ease then drag the handles into inOut; CapCut/JianYing — compose, then multi-segment position + scale keyframes, two identical keyframes per hold, dim the others with separate brightness keyframes. Stock sites call it a "gallery wall dolly" / "timeline photo strip".
- Sound: one `pk:counter-clock-tick-single` (vol .4, clip ~1) as each camera move starts, one lowered `pk:transition-air-whoosh-powerful` (vol ≤.3) on the pull-back / pull-out; **never any sound in a hold**.

## Motion scope
- Belongs to this card: the camera layer at `origin 0 0` + `camTo` solving targets to frame centre (zoom around the current image); the beat "move power2.inOut → truly still dock → next → pull back to wide → hold → exit with text" (wall 1.0 + 0.9 / pull 1.2; timeline 0.9 + 1.0 / pull 1.1 + hold 1.2); focus handling in the dock (current image 1→1.03 micro-push or highlight, others dimmed, wall also blur 3); the wall's 3D rig (−12°, perspective 1200, floor reflection, rotated coordinates `wallX`, wide shot solved from the projected bounding box); the timeline's alternating rows, captions on the line side and the 1.05 dock that pushes neighbours out of frame.
- Not this card: the demo's grey placeholders, the "case one–three" and "2019–2026" copy, the layout-name tag (tour only), the line colour (#1d1d1f, changeable), exact card radius / shadow values, the exact wall backdrop colours.
- Migration: `layout` to pick; `srcs` / `labels` for material and copy; `hold` / `tailHold` follow the narration; station count via `centers` (+ photo positions / `TL_POS`); scale geometry from 960×540 for other frames and replace 480 / 270 in `camTo` with the new frame centre; for portrait, run the timeline vertically (`camTo(z, 480, cy)` panning in y).
- Background: **the wall needs the dark-grey radial backdrop** (`radial-gradient(ellipse at 50% 40%, #26262e, #0f0f13 75%)`) — white-framed photos on a 3D wall only read as "hanging" against a dark ground with a floor reflection; on white, rotateY photos look like floating paper and the dim/blur of the others turns to grey slabs; the timeline is fine on white.

## Placement checks (user-finalized 2026-09-05, copy into the SHOTBOOK self-check column when chosen)
- **Dock centred**: a still mid-hold at each station shows the current image's centre within 8px of (480, 270) (wall >8 usually means `wallX` rotated coordinates weren't used).
- **Wide shot fits**: wall wide frame ≥48 on each side of the three (measured 53); timeline pulled-out frame ≥48 on each side of the four (measured 71); re-solve `wideZ` / `wideAt` after changing the wall angle / station spacing.
- **Hold truly still + micro-push running**: the camera transform is identical across hold frames; the current `.ph` scale walks monotonically 1→1.03 (or the timeline's current station is at 1.03 and brightness 1).
- **Neighbours not edge-hugging**: timeline dock frames show neighbours ≥16 out of frame (1.05 → 24), their captions cut by the frame rather than floating <48 from it.
- **Type size**: wall tag ≥20@960, timeline caption ≥22@960 (≥13.6 pulled out; years still legible at 390px wide).
- **One layout per shot + a pull-back**: the SHOTBOOK writes a single `layout`; the timetable ends with pull-back / pull-out + hold, and the exit lands on the end of the shot.
