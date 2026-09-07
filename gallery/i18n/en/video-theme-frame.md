---
name: video-theme-frame
title: When a shot holds a single video, give it a decorative frame with a real design vocabulary instead of a fake player — eight frames in one card (retro browser window / magazine figure / 35mm film / instant photo / blueprint / laptop / postage stamp / double hairline) sharing one beat: land 0.45s → decoration relay finishes within 1.35s and holds → whole-frame slow push 1→1.03 → exit 0.35s; the footage itself is untouched
usage: One-shot-one-video moments — screen recordings (web / desktop), a single B-roll clip as the subject, quoted footage or interview snippets. Pick one frame for the film's tone: tech / tutorial → retro browser · laptop · blueprint; culture / commentary → magazine · instant photo; documentary / quotation → 35mm film; light / cultural → stamp; minimal → hairline. Not a bed (use bed-echo-blur) — this is "the clip is the star of this shot"
---

## Input types
| Host footage | B-roll video | Image |
|---|---|---|
| Yes for quoted footage (someone else's talk / interview — "here is what they said"; the frame acts as the quotation marks); this film's own host never goes in the frame | **Default input** (a screen recording or a single live-action clip as the subject) | Not applicable (the frame says "this is a recording"; a still that doesn't move reads as fake — use media-pop-in / slow-push-in / tilt-3d-page) |

The vital: **the frame is an object with a provenance** — window buttons, sprocket holes, a figure caption, a dimension line can each be named in one sentence — and what's inside really moves.

## Common scenarios
1. Web / desktop recordings as evidence (retro browser · laptop: instantly "a screen", yet not this film's own UI)
2. Quoting someone else's video / interview (35mm film · magazine: turns "a quote" into "an archive")
3. A single B-roll clip carrying a whole sentence with nothing else in frame (instant photo · stamp: give it an object, don't paste full-frame)
4. Methodology / teardown films (blueprint: the same ink lines as the G5 schematic system, one visual system across the film)

## Intent
The three usual treatments of a single-video shot are all weak: **bare full-frame** — the viewer can't tell this film's picture from quoted footage and has nothing else to look at; **a bare white card** — a moving photo on a sticker; **a fake player** — the moment a progress bar, play button and timecode appear the viewer checks them against the picture, a mismatch is a lie, and a match is still just a UI control posing as design (user decision 2026-09-07: no progress bar / play button; frames with creative design elements instead).
A themed frame turns the clip into **an object with a provenance**: a retro window says "something on a screen", film says "an archive", a magazine caption says "a figure", a blueprint says "the thing being dissected". The frame's vocabulary states the footage's identity on the narration's behalf, and the shot gains a second thing to look at.

Vitals:
1. **The frame is an object, not UI**: every element belongs to that object (window buttons / sprocket holes / caption / dimension line / camera dot); no fake controls, and no invented "tech border" beyond the eight.
2. **Only four motions**: land 0.45s → decoration relay (draw / fade / extend, all finished and still within 1.35s) → whole-frame slow push 1→1.03 → exit 0.35s. No bounce, sway, breathing or sweep.
3. **The footage is untouched**: no filter / scale / fade; the picture's life comes from the whole-frame push (G1 camera). Effects on the video admit the video isn't worth watching.
4. **One frame per film**: every single-video shot in a film uses the same frame (design-language §0.4); write it in the SHOTBOOK skinning line. The demo tour exists only to show the set.

## Motion core
- **Landing** (shared): opacity 0→1 + scale .96→1 + y 16→0, 0.45s `power3.out` (instant photo: y 24→0 with a fixed −1.5° tilt).
- **Decoration relay** (from land start +0.5s, per frame, all done within 1.35s):
  - Retro browser / 35mm film / instant photo / laptop / stamp: **no decoration motion** — the object is enough; land and hold.
  - Magazine: full-width rule `scaleX 0→1` 0.4s (origin left) → caption and folio fade 0.3s (+0.15) → short rule 0.3s (+0.2).
  - Blueprint: outer line machine-drawn 0.6s (`pathLength=1` dashoffset, power2.inOut) → four corner crosses 0.25s each, stagger 0.06 (+0.45) → dimension line 0.4s (+0.65) → ticks 0.3s linear (+0.85) → mono labels fade (+1.05).
  - Hairline: outer faint ring fades in 0.3s → four corner ticks 0.25s each, stagger 0.06 (+0.15).
- **Whole-frame push**: after landing, scale 1→1.03 linear until exit (non-zero end speed) — the only continuous motion.
- **Exit**: opacity→0 + scale→.98, 0.35s `power2.in`.
- **Stage**: the stamp uses a very light grey `#f0f0f2` stage (so the white border shows); others white; film is the only dark tile on a light stage.
- Decorative text (Untitled / http:// / FIG. 01 / 024 / 24 · KODAK 400 / 768 · SCALE 1 : 1) **is ornament, not information** — replaceable or empty in production.

## Parameters
| Param | Typical | Feel |
|---|---|---|
| `frame` | one of eight / `tour` | Production picks one; `tour` is for the demo and for choosing |
| `hold` | narration length | Exit start; demo 1.85s; <1.5 leaves before it's seen |
| `landIn` | 0.45s | <0.3 reads as a popup; >0.7 the viewer waits for the frame |
| `decorAt` | 0.5s | Starting as the landing settles is smoothest; <0.4 fights the landing for the same eye line |
| `push` | 1.03 | Up to 1.05 for shots >10s; >1.06 the frame edge nears the safe area |
| `exit` | 0.35s | Align with the next shot's motion handoff (cinematography §3) |
| `ink` | the film's ink | Colour of decorative lines / text; dark films switch to a bright hairline |
| `label` / `sub` | per-frame default | Decorative text; empty string = hidden |

## Pitfalls
- Adding a progress bar / play button / timecode to "look more like a player" — the viewer checks progress against the picture; a mismatch is fake, a match is still a UI control, not design. Explicitly rejected by the user.
- Switching frames within one film (browser here, film there) — the frame states the footage's identity; switching scrambles it. One frame per film.
- A fade / Ken Burns / filter on the video — the frame is already pushing; the picture moving too is double motion.
- A still passed off as a recording inside the frame — the frame says "recording", nothing moves, instantly fake; stills go to media-pop-in / tilt-3d-page.
- Writing information into the decorative text (title / source in the window bar) — it's ornament at 9–12px and unreadable by design; information belongs to subtitles / title layers.
- Retro browser around this film's own product UI — two UI layers stacked, the viewer can't tell which is content; product-UI cards (chat-gpt / claude-code) never get a frame.
- Tilting the instant photo >3° or adding a "drop and bounce" — reads as a sticker / template; fixed −1.5°, straight drop.

## Reuse
- Remotion/tsx (preferred): template/cards/video-theme-frame.tsx — self-contained; `frame` picks the style, `src` injects the clip, `hold` is the narration length, `label` / `sub` swap the decorative text; `durationFor(frame, hold)` gives the composition length; CONFIG on top.
- HTML/GSAP: demos/video-theme-frame/index.html. Swap the eight `<video src>`; to view one frame shrink `ORDER` to one entry; timing lives in `CONFIG`, each frame's decoration relay in `DECOR`.
- Editor equivalents: CapCut / 剪映 "picture-in-picture + frame overlay / photo-frame sticker" (browser window, film strip and instant-photo PNG frames exist); AE: shape layers for the frame with the video as a masked child; search "retro browser frame" / "film strip overlay".
- Relations: bed another clip with `bed-echo-blur` first and place the frame on top; two clips compared → `split-compare-slider`; several clips toured → `gallery-wall-dolly`; the blueprint frame shares its ink vocabulary with the G5 `schematic.tsx`.

## Scope
- Owned by this card: the eight frame designs and their decoration relays (order and durations of draw / fade / extend); the shared beat — land 0.45s, whole-frame push 1→1.03, exit 0.35s; the three disciplines "frame is an object, footage untouched, one frame per film".
- Not owned: the sample clip (demos/_lib/media/v-typing.webm), the decorative text content, the demo tour order and 2.2s per frame (demo only), the light stage.
- Migration interface: **skin per the film's style profile** (design-language §0.4) — decorative lines / text take the film's ink; dark films: retro browser goes dark-platinum, magazine / blueprint / hairline switch to bright hairlines, instant photo / stamp stay white (they are white objects); frame size follows the clip's aspect (for 9:16 phone recordings turn the laptop into a phone: tall dark bezel + top pill) and the main column (≤1440 @1080p).
- Stage: white; the stamp needs a very light grey; on dark stages check the frame still reads as an object (film disappears on dark).

## Placement checks (copy into the shot's SHOTBOOK check column)
- All four frame edges inside action-safe (96 @1080p); ≥60px between the frame's bottom edge and the subtitle band; the frame's box does not intersect any other subject (film spans the width — the subtitle band must stay outside the strip).
- Every single-video shot in the film uses the same frame; the frame name is in each shot's skinning line; decorative line colour = the film's ink.
- The decoration relay is finished and still by land +1.35s (pull the +1.5s frame: nothing moves except the whole-frame push).
- No filter / second transform on the video layer; whole-frame push ≤1.05.
- No fake controls on the frame — no progress bar, play button or timecode (SKILL.md ③ "single-video shots get a themed frame").
