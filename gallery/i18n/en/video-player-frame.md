---
name: video-player-frame
title: When a shot has only one video, house it in a "player" skinned to the film — a white-bordered evidence card lands in 0.5s, the control bar slides up 0.15s later, the play button punches and the progress bar then runs on real playback time with a ticking timecode and chapter marks that light as they pass; the whole frame pushes 1→1.03, and on exit the bar goes 0.2s before the frame
usage: One-shot-one-video moments — screen recordings (web / phone / desktop), a single B-roll clip as the subject, quoted footage or interview snippets; reviews, tutorials, case studies, news quotes. Not a bed (use bed-echo-blur) — this is "the clip is the star of this shot"
---

## Input types
| Host footage | B-roll video | Image |
|---|---|---|
| Yes for quoted footage (someone else's talk / interview — "here is what they said"; the frame acts as the quotation marks); this film's own host never goes in the frame | **Default input** (a screen recording or a single live-action clip as the subject) | Not applicable (a still inside a player is a lie — the progress bar moves while the picture doesn't; use media-pop-in / slow-push-in) |

The vital: **what's in the frame is a video that is playing**. Progress bar, timecode and play button all say "this is a recording, not a screenshot", so the content must really move.

## Common scenarios
1. A screen recording of a product / AI output as evidence (the demo: a typing clip + "录屏 · 案例 01" + a source pill)
2. "Watch me do it" desktop recordings in tutorials (`chrome: "browser"` variant: three dots + address bar)
3. Quoting someone else's video / interview (title chip names the origin, source pill names the platform)
4. A single B-roll clip carrying a whole sentence with nothing else in frame (don't paste it full-frame — give it an object)

## Intent
The two usual treatments of a single-video shot are both weak: **pasting it full-bleed** (the viewer can't tell your footage from quoted material, and there is nothing else to look at) or **dropping it on a bare white card** (a moving photo with no "playing" grammar).
The player frame turns the clip into an **object with an identity**: the title says what it is, the source says where it came from, the progress bar says how long it is and where we are, the play button says "starting now". Those four things turn footage into evidence and give the shot a second watchable layer besides the video itself (user feedback 2026-09-07: video-only / text-only shots "have just one thing moving, too flat").

Critical rules:
1. **Progress = real playback** (same clock as the video; in production `startFrom + frames played`). A decorative constant-speed bar that disagrees with what happens in the picture is instantly read as fake.
2. **Press first, then move**: the play-button punch (1.15→1, 0.2s) and the progress start share a frame; button before bar is player grammar — the reverse reads as a GIF.
3. **Frame is a container, bar is a control — never the same frame**: the bar slides in 0.15s after the frame and leaves 0.2s before it; enter/exit together and it becomes a sticker.
4. **No filter / zoom / fade on the video itself**: the life comes from the whole frame's slow push 1→1.03 (G1 camera). Effects on the footage admit the footage isn't worth watching.

## Motion Core
- Layers (bottom→top): white stage → frame (8px white border + 1px hairline + the single shadow `0 12px 60px rgba(0,0,0,.22)`, radius 16) → video (`object-fit: cover`, radius 8) → title chip (top-left) + source pill (top-right) → control bar (bottom 56px gradient scrim).
- **Frame lands**: opacity 0→1 + scale .96→1 + y 16→0, 0.5s `power3.out`; then scale 1→1.03 linear until exit (non-zero end velocity).
- **Bar / chip / pill**: from +0.15s, opacity 0→1 + y ±12→0, 0.35s `power3.out` (bar from below, chip/pill from above).
- **Press play** (`playAt` 0.5s): glyph ▶ → ❚❚, scale 1.15→1 in 0.2s `back.out(1.7)`; `played = t − playAt` starts the same frame.
- **Progress**: `progress = played / clipSec`; fill width, knob position and the tabular `mm:ss / mm:ss` timecode all derive from that one `played`; chapter marks (`markers` ratios) go from 30% to 100% white once `progress ≥ m`.
- **Exit**: at `exitAt` bar / chip / pill fade 0.2s → +0.2s the frame scales to .98 and fades 0.35s `power2.in`; the video stops on the frame the card finishes.
- **browser variant**: a 36px light top bar (three dots + white address pill with the source domain), video corners rounded only at the bottom; all beats unchanged.

## Parameters
| Parameter | Typical | Feel |
|---|---|---|
| `frameIn` | 0.5s | <0.3 reads as a popup; >0.7 the viewer waits for the frame |
| `chromeDelay` | 0.15s | 0 = frame and bar in one frame = sticker; >0.3 the bar looks like a late subtitle |
| `playAt` | 0.5s | Best right as the frame lands; later than 1.0 the viewer asks "why isn't it playing" |
| `clipSec` | real clip length | A wrong denominator is a lie — use ffprobe duration, not shot length |
| `markers` | [0.35, 0.72] | Hints "this clip has a few moments"; >4 becomes a ruler, 0 is fine too |
| `push` | 1.03 | Up to 1.05 for shots >10s; >1.06 the frame edge approaches the safe area |
| `barH` | 56 | Taller = heavier scrim; <44 the play button hits the edge |
| `exitAt` / `exit` | 7.6 / 0.35 | The 0.2s bar-before-frame offset is rule 3 — don't merge them |
| `chrome` | `player` / `browser` | browser for web recordings; phone recordings use player with a 9:16 frame (243×432) |

## Known Pitfalls
- A progress bar that runs the whole shot at constant speed regardless of clip length — the viewer checks it against the picture, and once it disagrees it is worse than none.
- Another fade-in / Ken Burns inside the video — the frame is already pushing; double motion, and "effects on the footage" reads as footage not worth watching.
- Play glyph stays ▶ while playing (grammar inverted), or the glyph flips but the bar doesn't move (reads as stuck).
- Frame touching the picture edge or invading the subtitle band — it's an evidence card: action-safe 96, ≥60px above the subtitles.
- A still image posing as a recording — bar moves, picture doesn't; use media-pop-in for stills.
- Proportional digits in the timecode — width jitters on every tick; monospace / `tabular-nums` is player common sense.

## Reuse Guide
- Remotion/tsx (preferred): template/cards/video-player-frame.tsx — self-contained; inject the clip via `src`, text via `title` / `source`, start via `startFrom` (s), variant via `chrome`; CONFIG on top, `clipSec` = ffprobe duration.
- HTML/GSAP: demos/video-player-frame/index.html — swap `<video src>`, edit `.chip` / `.pill`, rhythm lives in `CONFIG`; one `.to({p})` `onUpdate` drives fill, knob, timecode and marks.
- Editor equivalents: CapCut/JianYing "picture-in-picture + border" plus a progress-bar overlay (match the duration by hand); AE shape-layer bar with expression `time/clipDur` bound to the video layer.
- With other cards: need a bed behind it → `bed-echo-blur` first, frame on top; two clips compared → `split-compare-slider`; several clips toured → `gallery-wall-dolly`.

## Scope
- Belongs to this card: frame landing (opacity + scale .96→1 + y 16→0) and the whole-frame slow push 1→1.03; bar / chip / pill entering 0.15s late and leaving 0.2s early; the play punch (1.15→1, back.out) starting with the progress on the same frame; fill / knob / timecode / chapter marks all derived from one `played`; exit bar-then-frame.
- Not this card: the sample clip (demos/_lib/media/v-typing.webm), the chip / pill copy, the exact card colours and shadow values, the white stage.
- Migration interface: **skin per the film's style profile** (design-language §0.4) — light = white-bordered card + hairline + the single shadow (demo); dark = dark tile + bright hairline, scrim rgba(0,0,0,.7); fill and lit marks in the film's accent, timecode in the film's numeral face; frame size per the clip's aspect (16:9 / 9:16 / 4:3) and the main column (≤1440 @1080p); `clipSec` = real clip length.
- Background: white is fine (the shadow does the layering); on dark stages swap the frame base for a dark tile and the white border for a 1px bright hairline.

## Placement checks (copy into the shot's SHOTBOOK check column)
- All four frame edges inside action-safe (96 @1080p); ≥60px between the frame's bottom edge and the subtitle band; the frame's box does not intersect any other subject on screen.
- `clipSec` = the clip's ffprobe duration; `startFrom` aligned to the narration anchor (the second on screen is the one being talked about).
- Play-button punch frame = progress start frame (the same `playAt`); on exit the bar leaves 0.2s before the frame (check two frames).
- No filter / second transform on the video layer; whole-frame push ≤1.05.
- Every single-video shot must use this card or its variant (SKILL.md ③ "single-video shots get a player"); bare full-frame video is only allowed as a bed, never as the subject.
