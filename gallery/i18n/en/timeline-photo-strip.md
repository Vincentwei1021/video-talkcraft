---
name: timeline-photo-strip
title: Ordered stations (four 240×160 photos by default) alternate above and below one timeline with date captions on the line side; the camera pans station to station (0.9s move + 1.0s hold, dock zoom 1.05 so neighbours clearly leave frame, current station 1.03 bright / others .7) → pulls out to z .62 to show the whole strip, holds 1.2s on purpose → exits with the text
usage: Growth stories, version evolution, four points in time, year in review, event walk-throughs — 3–5 stations **in order** (for three peer examples use gallery-wall-dolly); passages narrated station by station that then need the whole line
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| Not applicable (with a person on screen use the D-group card `parallel-items-with-host`) | Yes (a short clip per station; its moment is the 1s dock; unify mixed material to one frame ratio — crop, don't scale) | **Default input** (3–5 stations, one image each; the timeline means "stations in order") |

## Common scenarios
1. Growth story / version evolution: "from one laptop to a studio of my own", four stations panned (demo)
2. Event walk-through / year in review: 3–5 points in time along one line, then the whole line
3. Product version history: one screenshot per version, dock on the version being discussed
4. "What happened in these three years" — the pull-out shows the whole timeline

## Intent
Cutting ordered images full-screen one after another loses the order. Hanging them on one timeline and panning the camera station to station gives both layers at once: "one by one" and "where each sits in time"; the pull-out to the whole strip is the card's concluding shot. What makes it work:
1. **The camera layer is the only transformed element**: `transform-origin: 0 0`, each station uses `camTo(z, px, py)` to solve `scale / x / y` so the target lands at frame centre.
2. **Docks are truly still; the current station lights up**: the camera does not drift in the hold; the current station goes `brightness 1 + scale 1.03`, the others .7 — the picture changes without breaking "stop and look at this one".
3. **Dock zoom 1.05 pushes neighbours clearly out of frame**: at 1.0 the neighbour aligns with the frame edge and its caption sits 6px from the edge, which reads as edge-hugging; at 1.05 neighbours leave frame by 24px — camera grammar, not a layout fault.
4. **Always pull out to the whole strip and hold on purpose**: 1.2s after the pull (in delivery, the narration's closing line), then exit with the text.

## Motion core
- Structure: white stage; `.cam` (camera layer, width 1600, `transform-origin: 0 0`) → one timeline (`left 60, top 300, 1500×3, #1d1d1f`) + four 240×160 white-framed photos alternating above / below (`(120, 90) / (480, 330) / (840, 90) / (1200, 330)`, centres x 240 / 600 / 960 / 1320, pitch 360); date captions 22px 700 on the line side (upper row below the line at 318, lower row above it at 266), `nowrap`.
- `camTo(z, px, py) = { scale: z, x: 480 − z·px, y: 270 − z·py }`; dock `camTo(1.05, cx, 270)` (upper-row photos 49.5 from the top); pull-out `camTo(.62, 780, 300)` shows the whole strip (71 on both sides).
- Timetable: `0` first station centred, everything `.7` → `0.4` first station lights up (`brightness 1 + scale 1.03`, 0.4s) → `1.4 / 3.3 / 5.2` pan to stations two to four (`move 0.9 power2.inOut`, lighting starts 0.5s into the move) → `7.1–8.2` pull out (everything restores over 0.5s from 7.4) → `8.2–9.4` deliberate hold → `9.4` captions + line exit, `9.44` photos exit (0.4, `power2.in`) → `9.9` end.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `stopZ` dock zoom | 1.05 | 1.0 aligns the neighbour with the frame edge (edge-hugging), >1.1 pushes the upper row into the safe margin |
| `wideZ` pull-out zoom | .62 | Must fit every station with ≥48 on both sides (71 measured) |
| `move` | 0.9s | <0.7 reads as a whip, >1.5 the viewer waits |
| `hold` | 1.0s | **The information lives in the hold**; in delivery give it "how long this station is talked about" |
| `dim` / `focus` | .7 / 1.03 | Demotion of other stations / highlight of the current one; no blur on a flat strip |
| `pull` | 1.1s | Slightly longer than a single pan |
| `tailHold` | 1.2s | The deliberate hold on the whole strip; in delivery = the narration's closing line |
| pitch | 360 | With the dock zoom it decides how much of the neighbours shows; <300 shows three stations per screen and stops reading as a tour, >420 pans too fast |

## Pitfalls
- Faking docks with a fixed `transform-origin` (centre) plus offsets — zoom changes throw in sideways drift; every target must be solved to frame centre.
- Dock at 1.0 with pitch 360 — the neighbour aligns with the frame edge and its caption sits 6px from the edge, reads as edge-hugging; 1.05 pushes neighbours clearly out.
- Photos not alternating above / below — four in a row, adjacent captions collide, and the pan reads as a strip of thumbnails.
- Nothing moving in the hold (no highlight) — 1s of total stillness reads as a dropped frame (and fails motion_check).
- Cutting right after the pull-out — the viewer just got the whole picture and is yanked away; hold, then exit.
- Forcing three peers onto a timeline — the viewer looks for an order that isn't there; use `gallery-wall-dolly`.

## Reuse
- Remotion/tsx (preferred): template/cards/timeline-photo-strip.tsx — `srcs` four real images, `labels` the date captions; 309 frames (9.9s + 0.4s), the exported `END` is the animation end in seconds; for a different station count change `CONFIG.centers` (plus `POS` and the line length), for longer holds change `CONFIG.hold` / `tailHold`.
- HTML/GSAP: demos/timeline-photo-strip/index.html — `CONFIG` is the whole rhythm; swap `.ph` for `<img>`, `.cap` for copy; the portable core is `CONFIG` + `camTo()` + the timeline.
- Boundary with `gallery-wall-dolly`: that card hangs three peers on a 3D wall and opens wide; this one pans ordered stations and closes with a pull-out — decide the relationship first.
- Boundary with `step-timeline-vertical◈`: that card is a text-only vertical step timeline; here every station is an image.
- layout.md interface: docked upper-row photos ≥48 from the top (49.5), caption 22px (23 docked / 13.6 pulled out ≈ 27@1080, the minimum legible edge), 71 on both sides when pulled out; neighbours leaving frame is camera grammar, not edge-hugging.
- NLE equivalent: in CapCut / 剪映 composite the photos and a line, then keyframe "position + scale" in segments, two identical keyframes per station form the hold, dim the others with separate brightness keyframes. Stock sites call it "timeline photo strip".
- Sound: one `pk:counter-clock-tick-single` (vol .4, clip ~0.9) at each pan start, one lowered `pk:transition-air-whoosh-powerful` (vol ≤.3) on the pull-out; **never a sound in the hold**.

## Scope
- This card: the camera-layer `origin 0 0` + `camTo` pan-and-dock structure; the beat "first station → pan power2.inOut → truly still dock → next → pull out to the whole strip → deliberate hold → exit with the text" (0.9 + 1.0 / pull 1.1 + hold 1.2); the current station 1.03 highlight + others .7 focus handling; the alternating layout + captions on the line side + dock 1.05 geometry.
- Not this card: the demo's sample photos (demo context, `demos/_lib/media`, not part of the card), the "2019–2026" copy, the line colour (#1d1d1f, changeable), the frame's exact radius / shadow.
- Migration: `srcs` / `labels` for material and copy; `hold` / `tailHold` to match narration; station count via `centers` (+ `POS` / line length); for another frame size scale the geometry from 960×540; for portrait make the timeline vertical (`camTo(z, 480, cy)` pans vertically).
- Background: white is fine; on a dark-tile style, the line and captions switch to light colours.

## Placement checks (copy into the shot's SHOTBOOK check column)
- **Centred dock**: grab a frame mid-hold at each station; the current station's centre is within 8px of (480, 270).
- **Pull-out fits**: ≥48 on both sides in the pulled-out frame (71 measured); re-solve `wideZ` after changing the pitch.
- **Hold truly still + highlight in place**: the camera transform is identical frame to frame in the hold; the current station is at 1.03 and brightness 1.
- **Neighbours not edge-hugging**: in a docked frame neighbours leave frame by ≥16 (1.05 → 24); a neighbour's caption is cut by the frame rather than hanging <48 from the edge.
- **Type size**: caption ≥22@960 (≥13.6 pulled out; years still legible at 390px wide).
- **Has pull-out + hold**: the timetable ends with the pull-out and a hold, and the exit aligns with the shot end.
