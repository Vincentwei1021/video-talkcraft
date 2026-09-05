---
name: bed-echo-blur
title: A portrait clip (9:16) sits in a white-bordered card on the right while the very same footage — scaled 1.25, blur 26, brightness .45, saturate .8 — fills the frame as a bed at half speed; two title lines and two source lines rise on the left, the card lands then creeps 1→1.03, and at 7.2s text and card exit with the bed closing on the same frame
usage: Portrait footage in a landscape frame without black bars — vertical phone footage / vertical screen recordings / vertical interviews and viewer-submitted clips / tall images (posters, a slice of a long screenshot); shots with only one usable asset; neutral, restrained tone
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✓ Vertical presenter footage / interview clips — it becomes its own bed (a person never goes into someone else's bed, only their own) | ✓ Vertical B-roll (the main input) | ✓ Tall images: posters, a slice of a long screenshot; a still bed is effectively a freeze frame, the most stable case |

All three work because the bed *is* the foreground: one `src` is rendered twice (sharp foreground at 1× + bed at 0.5×). No second asset to find, and the colours always agree.

## Common scenarios
1. Vertical phone footage / vertical screen recording in a landscape frame, no black bars (the demo: "footage a viewer sent in")
2. Vertical interviews and viewer-submitted narration clips
3. A shot with only one usable asset — no need to scrape up a second B-roll
4. Tall images: posters, a slice of a long screenshot

## Intent
Portrait footage in a landscape frame is the most common awkwardness in narration: black bars look unfinished, stretching looks worse. "Blur fill" in editing apps is the standard answer, but its default scales and blurs the *same frame in sync* — the foreground and the bed share one motion and the viewer reads **ghosting**, not atmosphere.
From the 2026-09-04 bed research (`demos/_lab/material-presentation/README.md`, group A), the rules that apply directly here:
1. **A bed is not "lower the opacity"**: opacity only barely works on dark stages and washes light ones into grey fog. The processing chain is darken brightness .35–.50 + desaturate .5–.7 + very slow motion (zoom ≤0.6%/s), optionally blur 20–30. The same-source blurred bed is a special case of that chain — **blur ≥20 reads as "atmosphere", below that as "out of focus"**.
2. **The bed must be slowed (0.5×) or frozen**: same-source motion in sync ghosts; once slowed, the two layers keep their own time and the foreground stands up.
3. **Two layers, two speeds**: the bed creeps 1.25→1.295 at constant rate, the foreground card only 1→1.03, both for the length of the shot; the bed : content parallax rule is 0.5 : 1. Same speed = the whole screen is zooming and all depth is lost.
4. **White text stays readable through the bed's darkening (brightness .45), not through global opacity**, and no extra scrim is needed — the whole bed is already down.
5. **Text and picture start and end together** (user-finalized 2026-09-05): the bed's push runs for the shot's duration and closes within the same 0.4s as the text — no "text is gone but the picture is still moving" tail.

## Motion core
- Layers (bottom→top): bed echo → left text group → foreground white-bordered card.
- **Bed**: the same asset `object-fit: cover` over 960×540, then from `scale 1.25` pushing at `0.07/12 ≈ 0.0058 ×/s` linearly until the shot ends (7.7s → 1.295); `filter: blur(26px) brightness(.45) saturate(.8)` and the transform live on the **same element** (the blur scales with it and its soft edge is pushed off-frame); video `playbackRate 0.5`.
- **Foreground card**: 270×464 white-bordered card (inner 250×444 = 9:16, border 10, radius 12 / inner 5, shadow `0 12px 60px rgba(0,0,0,.22)`) at (590, 38); from 0.3s, 0.6s `power3.out`: opacity 0→1, scale .92→1, y 22→0; from 0.9s a linear push scale 1→1.03 until 7.2 (non-zero end speed).
- **Text group**: left 90 / top 150 / width 440, white; title 40px 700 line-height 1.25, two lines, tracking −0.6; source note 16px white 72% line-height 1.7, two lines, 16 above; four lines from 0.8s with stagger 0.11, each 0.5s `power3.out`, y 16→0.
- **Exit**: 7.2s text + card opacity→0 over 0.5s `power2.in`; 7.3s bed opacity→0 over 0.4s `power2.in`; all done on the same frame at 7.7s, revealing the white stage.
- The grey footage placeholder in the demo (light streaks drifting at 40px/s, 20px/s in the bed copy) is demo context; production injects real video via `src`.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `echoBlur` | 26px | 20–30; <20 reads as "out of focus", >34 becomes a flat colour field and the same-source feel is gone |
| `echoBright` | .45 | ≈.5 is the ceiling for readable white text; <.35 the bed turns into a blackboard and loses its colour |
| `echoSat` | .8 | Lower goes grey; 1 lets the bed's colour fight the foreground |
| `echoFrom` / `echoRate` | 1.25 / 0.0058 ×/s | Start <1.15 lets the blur's soft edge into frame; rate >0.01 and viewers see the bed moving |
| `echoSpeed` | 0.5× | 1× ghosts; 0 (freeze) is the most stable but a bed with obvious motion goes "dead" |
| `cardPush` | 1.03 | >1.05 erases the speed difference from the bed; 1 (static) also works |
| Card size | 250×444 + border 10 | Height ≤464 leaves 38 top and bottom; derive the width from the asset's real ratio, don't assume 9:16 |
| `textIn` / stagger | 0.8 / 0.11 | Four lines within one sentence; >0.2 becomes reading line by line |
| `exitAt` / `end` | 7.2 / 7.7 | In production = sentence length; the bed's duration follows `end`, the rate stays |

## Pitfalls
- Bed and foreground in sync at the same speed (the app default) — ghosting plus a whole-screen zoom, fake at a glance.
- Lowering the bed's opacity instead of darkening — white text washes into grey fog.
- blur <20 — the viewer reads "the background isn't in focus", not atmosphere.
- Foreground without a white border, sitting straight on the bed — the two merge; nobody sees "a card on top".
- Bed motion hard-coded to 12s while the text leaves at 7 — the bed spins on alone (exactly how the first lab version failed).
- Card dead-centre — nowhere for the text; the card always sits to one side, text in the opposite half.
- Vertical presenter footage as its own bed puts an enlarged blurred face in the middle — if it still reads as a face it's uncanny: shift the bed's `object-position` up or drop `echoBright` another step to .38.

## Reuse
- Remotion/tsx (preferred): template/cards/bed-echo-blur.tsx — `src` one portrait video (rendered twice: foreground 1× + bed `playbackRate 0.5`), `title` / `note` two lines each; durationInFrames 243; for other sentence lengths change `CONFIG.exitAt / end`. Asset spec: 1080p portrait for the foreground is enough, the bed needs nothing extra.
- HTML/GSAP: demos/bed-echo-blur/index.html — `CONFIG` holds all timing; replace `.fgcard .ph` and `.echo-inner .ph` with `<video>` (the bed copy at `playbackRate = 0.5`).
- NLE equivalents: CapCut/JianYing "Background → Blur" (in sync by default — slow the background layer to 50% and darken it by hand); Premiere: duplicate the track → Gaussian Blur 26 + Lumetri exposure −1.2 + saturation 80 + speed 50%; ffmpeg `split` + `gblur` + `setpts=2*PTS` (junian.dev's blur-fill recipe plus slow-motion).
- Interface with layout.md: the text group takes the half opposite the asset (§4); title 40@960 = 80@1080p in the title tier, source line 16@960 = 32@1080p in the caption tier (§5); the card's right edge is 100@960 from the frame, inside the safe margin (§1).

## Motion scope
- Belongs to this card: the same-source bed chain (cover fill + scale from 1.25, blur 26 / brightness .45 / saturate .8, 0.5× slow-motion, 0.0058 ×/s constant push, duration = shot); the foreground card's 0.6s power3.out landing and 1→1.03 creep; the two-speed relationship; four text lines rising with 0.11 stagger; the 7.2 / 7.3 → 7.7 same-frame exit; the layout relation "card to one side, text opposite".
- Not this card: the grey footage placeholder and its drifting streaks, the sample copy, the card's exact coordinates (re-lay per frame), the white stage (visible only in the last 0.4s).
- Migration: `src` for the asset; `CONFIG.end / exitAt` follow the sentence; ×2 every px for 1080p (blur 26→52, border 10→20, type 40→80); for portrait output enlarge the card to 70% of frame height centred and move the text above/below.
- Background: white is fine — the bed covers the stage and the stage only shows in the last 0.4s; if the asset is bright overall, drop `echoBright` to .38 to keep the white text.

## Placement checks (copy into the SHOTBOOK self-check column when chosen)
- Card ratio = the asset's real ratio (`ffprobe`), width = height × ratio, border 10 on all sides; never assume 9:16.
- Card and text group in opposite halves: text-group bounding box centred in the left half (x≈310@960, ≤48 off); card right edge ≥48@960 (≥96@1080p) from the frame.
- Bed legibility: sample the bed's luminance under the title on a still, L ≤110/255; white-text contrast ≥4.5:1; otherwise push `echoBright` down.
- No ghosting: two stills 1s apart, bed displacement ≈ 0.5 × foreground displacement (the slow-motion is in effect).
- Same-frame close: `node scripts/shot-at.mjs bed-echo-blur --play 7.72` must be pure white with nothing left over.
