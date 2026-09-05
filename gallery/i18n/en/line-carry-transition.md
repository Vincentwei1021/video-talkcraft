---
name: line-carry-transition
title: An accent underline is drawn under shot A's title, rests a beat, then keeps running right out of the frame; the camera follows the line 960px (2s power2.inOut — during the pan the line grows exactly as far as the camera moves, so the pen tip stays pinned at screen x≈640, never leaving the frame and never falling behind), then the line turns hard right angles up, right, down and left to enclose a 560×330 frame; on the frame the frame closes the pen tip disappears and shot B's content fades in inside it — no cut anywhere, one line stitches the two shots together
usage: The seam between chapter A and chapter B (A's title underline becomes B's frame); between two shots with a graphic kinship — progress bar → chart axis, a data line → the next shot's card border; the single "signature transition" slot of a film (Saul Bass / Catch Me If You Can title grammar). Acts on the two adjacent shots; B's content can be an image / screenshot
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ No presenter in this shot (they appear in A's and B's own shots; the transition frames hold no person) | ✓ B's content can be a B-roll clip (cover inside the frame) | ✓ (default) B's content is a screenshot / photo; A has only a title + subtitle |

Acts on two adjacent shots (**scene**): A takes title text, B takes one picture + a title.

## Common scenarios
1. Chapter A → chapter B: A's title underline becomes B's frame (the demo)
2. Progress bar → chart axes: A's progress bar runs out of frame and its corners become the x/y axes of B's line chart
3. A data line → the next shot's card border (graphic kinship: it is the same line)
4. The film's one signature transition — leaving the hook and entering the first chapter

## Intent
The library's transitions come in two families: the **six motion-carry transitions** hand momentum over with the camera (push-through / flip / whip / black slam / pull-back cool / particle weld), and the **geometric wipes** (`shape-wipe` / `caret-wipe`) let a boundary sweep across. Line carry is a third family — **a graphic element in the picture runs off to become the container of the next shot**: A's underline is B's frame, the viewer's eye follows the pen tip all the way, and "changing chapters" is told by one line with not a single frame that is a "cut". Its value is **graphic kinship**: the two shots already share the semantics of a line (underline → border, progress bar → axis) and the transition merely hands that line's identity over. Four things make it work:
1. **During the pan the line grows exactly as far as the camera moves**: `drawn = underline + cam`, the pen tip pinned at screen x≈640 (about 67%) — centred reads as "the line chasing the camera", at the edge one tremor and it leaves the frame; lose speed and the viewer loses the line, which means losing the transition.
2. **Hard right angles, no rounding**: soft corners lose the drafting feel and the Saul Bass flavour with it.
3. **No B content before the frame closes**: the line's suspense pays off only on the closing frame; content first is giving the answer away.
4. **Unload the pen dot after closing**: a leftover dot ruins the stillness; after B fades in, rest ≥36 frames.

Relationship to the six motion-carry transitions: the six govern "how a shot boundary hands over momentum" (one style per boundary); this card governs "how one line relays between two shots"; **use it once per film** (signature slot, repetition cheapens it), and A's information must be finished before the pan (the pan carries A's title out of frame).

## Motion core
- **Geometry** (world canvas 1920×540, camera = world translateX): A title 48px/700 at (80, 150), subtitle 20px/500 grey with 12 above; underline at y=262 (subtitle bottom +18) from x=80 to 640 (560 long); run-out 640 → 1160 (520 long); B frame (1160, 110)–(1720, 440), 560×330 — once the camera arrives (cam 960) it spans screen x 200–760, bounding-box centre x=480 (layout §4); B content inside the frame at (1174, 142), 532 wide: picture 532×222 radius 6 + title 22px/700 + subtitle 16px grey, 32 above and below. Line 6px solid accent, `stroke-linejoin: miter` (right angles), pen tip an r=8 dot in the same colour.
- **Polyline path** (one path, `stroke-dasharray = total 2860`, `dashoffset = total − drawn`): (80,262) → (640,262) → (1160,262) → (1160,110) → (1720,110) → (1720,440) → (1160,440) → (1160,262) — entering at the frame's left midpoint and closing clockwise back at the entry. Segments 560 / 520 / 152 / 560 / 330 / 560 / 178.
- **A passage**: title in at 0.1s (0.4s `power3.out`, y 10→0); pen appears at 0.35s; underline 0→560 from 0.4s (0.6s `power2.out`).
- **Pan passage**: 1.2→3.2s camera cam 0→960 (`power2.inOut`). Drawn length `L = max(underline progress, camL(cam))`: for `cam ≤ 520`, `camL = 560 + cam` (line and camera at the same speed, pen tip fixed at screen x 640); for `cam > 520` the remaining 440px of travel draws the frame's 1780 perimeter (`camL = 1080 + (cam − 520) / 440 × 1780`, the pen running along the frame inside the screen).
- **Closing**: pen opacity→0 at 3.2s (0.2s); B content fades in at 3.3s (0.5s `power2.out`); true stillness 3.8→6.0s.
- **Exit**: at 6.0s B content and line opacity→0 over 0.4s `power2.in`, done at 6.4s.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| Line | 6px solid accent | Too thin gets lost during the pan; a dashed line reads as unfinished |
| `cam / camDur` | 960px / 2.0s (16px/f) | Longer pans scale the duration proportionally — **never speed up**; above 40px/f the pen tip smears and is lost |
| Pen screen position | x≈640 (about 67%) | Centred reads as the line chasing the camera; at the edge one tremor and it leaves the frame |
| Corners | hard right angles (miter), no rounding | Soft corners lose the drafting feel |
| `run` | 520 (= frame left − underline end) | Sets where B's frame sits in the world; once the camera arrives the frame must be centred (screen 200–760) |
| Frame | 560×330 | Unrelated to layout §4 two-element ratios — it's B's container; size it to B's material and `camL` follows the new perimeter |
| `bIn` | +0.1s after closing, 0.5s | Content before the frame closes wastes the suspense |
| Rest after closing | ≥36 frames (demo 3.8→6.0 = 2.2s) | The pen dot must be conditionally unloaded; a leftover ruins the rest |
| Underline | 560 / 0.6s `power2.out` | Rest a beat (1.0→1.2) before the pan so the viewer knows "this line is going somewhere" |

## Pitfalls
- Line and camera at different speeds — the pen tip drifts on screen and the viewer loses the line, i.e. the transition.
- Pen tip centred or at the edge — centred reads as chasing the camera, at the edge one tremor and it's gone.
- Rounded corners — the drafting feel is lost; it looks like a UI progress bar.
- B content before the frame closes — the suspense is wasted.
- Pen dot not unloaded after closing — one blue dot ruins the whole rest.
- A's information not finished before the pan — the camera carries A's title away while the narration is still on A: a narrated slideshow.
- Used twice in one film — the signature slot cheapens with repetition; use the six motion-carry transitions for the other chapter seams.
- B's frame off-centre after the camera arrives — `run` and the frame x must be computed together: frame left = 640 + run, frame centre = 960 + 480.

## Reuse
- Remotion/tsx (preferred): template/cards/line-carry-transition.tsx — `titleA / subA / titleB / subB / srcB`; durationInFrames 204; move the pan start via `CONFIG.camAt` (align with the chapter-change beat), sentence length via `exitAt / end`; resize the frame via `CONFIG.frame` (perimeter and `camL` follow). The polyline is all straight segments and point-along-line is computed analytically (no DOM).
- HTML/GSAP: demos/line-carry-transition/index.html — same `CONFIG` names; swap `.tb .ph` for `<img>` / `<video>` for real material; the demo uses SVG `getPointAtLength`.
- Source: video-shotcraft `line-carry-transition` (3840-wide world, progress bar 560 + run-out + right angle + 560×330 rectangle, pan-phase drawn = 1100 + cam, pen pinned at x≈1500/1920); the port scales to the 960 stage and changes the semantics from "progress bar → card frame" to "chapter title underline → chapter frame".
- NLE equivalents: not feasible in CapCut/JianYing (no path drawing + tracking); in AE drive the path with Trim Paths and give the camera / parent null Position and Trim End the same expression variable (`cam = ease(time,…)`; `trimEnd = (560 + cam) / total`); in Motion use Write On linked to the camera.
- Interface with layout.md: A's title left edge at 80 (title margin 80@960); B's frame after arrival has bounding box (200,110)–(760,440), centre x=480, bottom 440 < subtitle band 450 (§1 / §4); content inset 14 left/right and 32 top/bottom, title 22 / subtitle 16 (caption tier or above).

## Motion scope
- Belongs to this card: the whole causal chain underline → run-out → camera following at the same speed → right-angle frame → close and unload the pen → B content afterwards; the `drawn = underline + cam` same-speed discipline; the pen pinned at 67% of the screen; miter corners; ≥36 frames of rest after closing.
- Not this card: A / B copy and sizes, B's material, the frame size, the white stage, the grey placeholder.
- Migration interface: `titleA / subA / titleB / subB / srcB`; `CONFIG.frame` to match B's material ratio; at 1080p line 6→12px, pen r 8→16, pan 960→1920 (duration stays 2.0s = 32px/f, still <40).
- Stage colour: white works as is; on a dark stage the line becomes `#2997ff` and the B content card gets a hairline stroke.

## Placement self-check (copy into the SHOTBOOK self-check column when picking the card)
- Three stills: mid-pan (≈2.2s) — pen tip at screen x 640±8, the line's tail beyond the left edge; closing frame (3.2s) — pen gone, four sides closed, B content opacity 0; after closing (≥3.8s) — frame bounding-box centre x=480 within 48, bottom ≤440.
- No frame during the pan has the pen tip outside the screen (x ∈ [0, 960]).
- A's narration finishes before `camAt` (A's last word timestamp ≤ camAt in the SHOTBOOK).
- At most one use of this card per film.
- Line ≥6@960 with miter corners; B content text ≥16@960 (caption tier).
