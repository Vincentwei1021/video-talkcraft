---
name: freeze-frame-annotate
title: B-roll plays normally for 1.3s, then freezes instantly (a 4-frame 18% white flash as the shutter); after an 8-frame pause so the viewer registers "it stopped", a hand-drawn marker-yellow ellipse strokes on over 8 frames around the target, an arrow points in 6 frames, the label floats up, hold 1.6s; on the frame the annotation fades the video unfreezes at 1.4× for one second to make up the time, then back to 1× — during the freeze the picture is absolutely still, only the ring and the words move
usage: "Notice this detail" in tutorials / documentaries / sports and game commentary / viewer-submitted clips — stop the moving picture, point at one thing, let it go. Input is B-roll video (the only annotation card in the library that takes video); the presenter is not involved
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Not involved (freezing the presenter is a different card) | ✓ (default) live footage / screen recordings / submitted clips, cover-fit | ✗ Stills don't need a freeze — use `hand-drawn-ellipse` / `scribble-annotation` directly |

Real B-roll is injected via `src`; in Remotion the time remap wraps `<OffthreadVideo>` in `<Freeze frame>` (normal segment = current frame, frozen segment pinned, unfreeze segment 1.4× catch-up); the demo uses a footage placeholder (grey gradient + constant-drift light bands, freeze = drift phase pinned).

## Common scenarios
1. Freeze a tutorial B-roll to point at a gesture / key (the demo: "watch his left hand")
2. Documentary style: "notice the background in this shot"
3. Sports / game commentary action breakdown: stop and ring that one step
4. Ring a detail in a viewer-submitted clip

## Intent
Every annotation card in the library (highlighter, ring, arrow, magnifier, focus-dim) takes an image or text — the "emphasis × B-roll video" cell in the taxonomy's input-type index was empty. Video moves; an annotation painted on it either loses the target (no tracking) or costs a tracking pass; film and sports commentary solve it by **stopping time first**: freeze → ring → release, and the viewer knows from "it stopped" that a key point follows. Five things make it work:
1. **The freeze is abrupt**: the source-time slope drops to zero instantly (no ease-in); any deceleration into the freeze reads as stutter or dropped frames.
2. **Frozen ≥45 frames**: the gaze must be long enough for the ring to mean anything (slower beats faster).
3. **Sharp target, static ring**: if the frozen frame is blurry pick another; once drawn the ring doesn't wobble (the user banned line boil — the hand-drawn feel comes from the path's irregularity).
4. **Make up the time on release**: 1.4× for one second buys back the frozen stretch, then 1×; >2× reads as fast-forward.
5. **One time-manipulator per shot**: mutually exclusive with `evidence-scroll-tour` or any other card that bends the timeline.

## Motion core
- **Geometry** (960×540): B-roll cover-fills the frame (stage #1d1d1f as fallback); the hand-drawn ellipse is centred on the target (demo: picture centre (480, 268), rx ≈150 / ry ≈96, four slightly irregular cubic segments, length 786); the arrow runs from the label's lower right to the ellipse's upper-left edge ((296,166) → (366,196), length 114, two-stroke head); label at (92, 96) 30px/700 white with `text-shadow 0 2px 10px rgba(0,0,0,.7)`, sub line 16px/500 white 80%; freeze badge top right (right 40, top 30), 14px mono, 1.5px tracking, white 75%, text `FREEZE · 00:01.30` generated from freezeAt.
- **Source-time remap** `src(t)`: `t < 1.3 → t`; `1.3 ≤ t < 3.64 → 1.3` (pinned); `3.64 ≤ t < 4.64 → 1.3 + 1.4·(t − 3.64)`; afterwards `2.7 + (t − 4.64)`. Remotion: `<Freeze frame={round(src·fps)}><OffthreadVideo/></Freeze>`; demo placeholder: bands `translateX(−40·src)`.
- **Freeze frame**: white flash 0 → 0.18 over 0.04s (≈1f), back over 0.12s; badge fades in over 0.2s.
- **Annotation**: from 1.57s ellipse `stroke-dashoffset 786→0` over 0.27s (8f) `power1.inOut`; from 1.84s arrow `114→0` over 0.2s (6f) `power2.out`; from 1.94s label 0.3s `power2.out` opacity 0→1, y 6→0. Marker yellow #ffd60a, 5px, round caps.
- **Release**: from 3.37s ring / arrow / label / badge fade together over 0.27s; on the 3.64s frame the source time resumes at slope 1.4, back to 1 at 4.64s.
- **Exit**: at 5.5s picture opacity→0 over 0.4s `power2.in`, done at 5.9s.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `freezeAt` | 1.3s | Land it on the word "notice" in the narration; play ≥1s normally first so the viewer knows the picture moves |
| `flash` shutter | 0.18 / 4f | 0.12–0.25; >0.30 reads as an exposure accident, 0 makes the freeze look like a dropped frame |
| `drawDelay` | 0.27s (8f) | Let "it stopped" register before drawing; <4f the ring and the freeze read as one event |
| `draw` / `arrow` | 8f / 6f | Slower looks like a loading animation; faster hides the act of drawing |
| `hold` | 1.6s | Total freeze ≥45 frames (slower beats faster); stretch to the sentence about this spot |
| `catchup` | 1.4× / 1.0s | 1.25–1.6; >2× reads as fast-forward, 1.0 = no make-up (the shot runs long by the frozen stretch) |
| Ring colour | marker yellow #ffd60a, 5px | Blue lines often match skies / screens / clothes in footage; yellow is the safest on live footage, white on dark frames |
| Ring geometry | ellipse = target bbox + 20–30 | Too tight reads as an outline, too loose as "somewhere around here" |

## Pitfalls
- Easing into the freeze (speed ramping down to 0) — reads as stutter / dropped frames; the slope must hit zero instantly.
- Frozen for under 45 frames — released before the ring is read; the gaze never lands.
- feTurbulence wobble / line boil on the ring — banned by the user's 2026-09-04 decision; static once drawn, hand-drawn feel via path irregularity.
- Blurry frozen frame (a motion-blurred frame) — the target must be sharp; step a few frames either way for a clean one.
- Accent blue for the ring — sky / screens / clothes in footage are often the same blue; use marker yellow or white.
- Resuming at 1× — the shot runs long by the frozen stretch while the narration has moved on; 1.4× for one second buys it back.
- Sharing a shot with `evidence-scroll-tour` / speed-ramp cards — two time-manipulators fight; one per shot.
- Freezing via `playbackRate` or a real pause in Remotion — OffthreadVideo doesn't do per-frame speed; the answer is a `<Freeze frame>` time remap.

## Reuse
- Remotion/tsx (preferred): template/cards/freeze-frame-annotate.tsx — `src` real B-roll (`<Freeze>` around `<OffthreadVideo>`; `srcTime(t)` is exported for reuse), `label / sub` copy, `ellipsePath / arrowPath` (960×540 coordinates, derived from the target bbox) plus matching `ellipseLen / arrowLen`; durationInFrames 189; freeze moment via `CONFIG.freezeAt`, sentence length via `hold / exitAt / end`.
- HTML/GSAP: demos/freeze-frame-annotate/index.html — to use a `<video>` instead of `.ph`, write `o.src` to `video.currentTime` (or keep the placeholder); paths on `.ell / .arr` and pacing in `CONFIG`.
- Source: video-shotcraft `speed-ramp-freeze`, freeze variant (the speed-ramp "fast → 0.2× gaze → fast" variant is not ported; this card drops the feTurbulence wobble, switches the ring to marker yellow and adds the 1.4× make-up).
- NLE equivalents: CapCut "freeze frame" (right-click → freeze 1.6s) + a hand-drawn ring sticker + 1.4× speed on the tail; Premiere Add Frame Hold + mask-path stroke animation + 140% speed; AE Time Remap keyframes (hold keyframe + slope 1.4) + Trim Paths.
- Interface with layout.md: the label at (92, 96) sits inside the safe margin at the title tier below hero (§5); label and ring stay out of the subtitle band y ≥ 450 (§6); on B-roll with faces run `scripts/face_bbox.py` first and keep ring and label out of the face safe zone (§4).

## Motion scope
- Belongs to this card: the source-time remap (normal → pinned → 1.4× catch-up → 1×); the 4-frame flash + badge on the freeze frame; the serial 8-frame ellipse + 6-frame arrow + label; the static ring; the annotation fading on the release frame.
- Not this card: the footage placeholder, the concrete path coordinates, the label copy, colour choices other than marker yellow.
- Migration interface: `src / label / sub / ellipsePath / arrowPath`; `freezeAt / hold` from narration; at 1080p stroke 5→10px, label 30→60 / 16→32, badge 14→28.
- Background requirement: the B-roll is its own background; the demo placeholder fills the stage, the delivery uses real B-roll (cover); pick the ring colour against the picture's dominant hue (yellow / white).

## Placement self-check (copy into the SHOTBOOK self-check column when selecting this card)
- Freeze frame = the frame of the narration's "notice" word, and it is sharp (pick the cleanest within ±3 frames; extract with `ffmpeg -ss` to check).
- Ellipse geometry derived from the target bbox (+20–30, centres coincide); the arrow tip lands on the ellipse edge without stabbing the target; the label doesn't cover the target, the subtitle band or the face safe zone.
- Two check frames: during the freeze (`shot-at 2.2`) — ring, arrow and label present, picture still; after release (`shot-at 4.2`) — annotation fully gone, picture moving.
- Frozen stretch ≥45 frames (demo 1.3→3.64 = 70f); catch-up ≤1.6×.
- No second timeline-bending card in the shot; shot length = narration length (after the make-up the source position realigns with real time).
