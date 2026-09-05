---
name: scanline-annotate
title: An accent-colored scan line sweeps down a screenshot at constant speed (zero easing); the instant it passes each target's bottom edge a viewfinder bracket snaps from 1.75× to 1 (back.out) with a 7% focus-confirm flash, the label fades in on the right 5 frames later and stays; the status line counts 0/4 → 4/4 → "analysis complete" — one sweep calls out N spots, all paced by the line
usage: A screenshot with 3–6 spots to review one by one (landing-page problems, feature points, contract clauses, report highlights); the "AI is reading this document" process shot. Input is an image (or a video frame); the presenter is not involved
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Not involved (with a person on screen, put the screenshot on the opposite side and push the label column one step outward) | △ Freeze a frame first, then scan (the line needs a still picture) | ✓ (default) landing page / document / contract / report screenshots |

The screenshot fills a 600×420 white card (1200×840 at 1080p); target bboxes are measured and injected via `targets`; labels sit in their own column to the right of the screenshot and never cover it.

## Common scenarios
1. "This landing page has 4 problems", reviewed spot by spot (the demo)
2. Comparative reviews: 3–5 feature points called out on one screenshot
3. Contract / policy / financial-report screenshots, clause by clause
4. "AI read this document for me": scanning = reading, labels = what it found

## Intent
When narration must point at several places on one image, chaining N `callout-line-label`s (dot → line → label) repeats the same ritual N times; by the third the viewer is bored, and `corner-bracket-frame` frames a single word. This card folds N call-outs into **one constant-speed pass of a single scan line**: the line is the metronome, whatever it reaches pops, and the viewer's eye is led top to bottom through the whole image. Four things make it work:
1. **Zero easing on the line**: constant speed reads as a machine scanning; any ease turns it into "someone dragging a progress bar".
2. **Trigger times derived from the target bbox**: the bracket pops the instant the line crosses the target's **bottom edge** — earlier is a giveaway, later is a miss.
3. **Frame first, name second**: the label lags the bracket by 5 frames; appearing together is noise.
4. **Labels stay**: this is narration, not a product self-demo — what was pointed out remains until the whole thing exits together.

## Motion core
- **Geometry** (960×540): screenshot card 600×420 at (80, 44), white with a 1px #e0e0e0 hairline, radius 12, shadow `0 12px 40px rgba(0,0,0,.08)`, 38px grey browser bar; four targets (relative to the screenshot): title block (26,66,320×44) / hero image (26,172,548×110) / CTA button (26,300,150×44) / price (26,358,170×38) — **one target per row**, otherwise the label column collides.
- **Scan line**: 600×2px, `linear-gradient(90deg, transparent, #0066cc 18%, #0066cc 82%, transparent)` + `box-shadow 0 0 14px rgba(0,102,204,.55)`; fades in over 0.15s at 0.35s, from 0.5s travels 2.4s with **ease none** from y=−30 to 440 (relative to the screenshot top), fades out 0.2s at 2.9s.
- **Trigger times**: `ft_i = t0 + ((y_i + h_i − yFrom) / (yTo − yFrom)) × dur`, then clamped in y order `ft_i = max(ft_i, ft_{i−1} + 0.15)`. The four demo spots ≈ 1.22 / 2.09 / 2.41 / 2.68s.
- **Viewfinder**: bbox expanded by 8px, four L corners 14px arms / 2px accent; from `ft` scale 1.75→1 over 0.4s `back.out(2)` with opacity on the same tween reaching full in the first half; the fill layer rises to 0.07 over 0.12s from `ft+0.12` and falls back over 0.35s from `ft+0.24` — a camera's focus-confirm blink.
- **Label**: x=712, width 200, 2px accent rule on the left + 14px padding; main line 20px/600 ink, sub line 14px/500 #7a7a7a; from `ft+0.17` 0.35s `power2.out` opacity 0→1, y 4→0; vertically centred on the target (top = target centre − 22).
- **Status line**: top right (right 80, top 22), 14px mono, 1.5px tracking, live `扫描 · fired/N`; 0.2s after the sweep ends it switches to `分析完成 · N 处` in the accent color.
- **Exit**: at 5.2s everything opacity→0 over 0.4s `power2.in`, done at 5.6s. Once landed, nothing idles.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `dur` sweep length | 2.4s / 470px | Derive from how long the narration takes to name N spots; <1.5s the labels can't be followed, >4s the line looks like a loading bar |
| Sweep easing | `none` | **The vital**: any ease reads as "someone dragging a progress bar" |
| `gap` min trigger spacing | 0.15s (≈5f) | Two targets close in y would pop on the same frame; spacing them makes each readable |
| `bkScale` bracket start | 1.75 | 1.75 is the floor for "closing in from outside"; 1.2 shows no aiming motion |
| Corner arm | 14px (within 1/3 of the target's short side) | Longer than 1/3 of the short side turns it into a full frame and loses the "viewfinder" meaning |
| `flashPeak` focus flash | 0.07 | >0.15 covers content and reads as a selection highlight |
| `labelLag` | 0.17s (≈5f) | The lag is the cause-and-effect of "frame first, name second"; simultaneous is messy |
| Label size | 20 / 14px | 20 ≈ 40@1080p, the list-item floor; if the 200px column can't fit, cut words, don't shrink |
| Target count | 3–6 | <3 is better served by a single callout; >6 the column overflows and the sweep gets too dense |

## Pitfalls
- Easing on the scan line — lose the constant speed and it stops being a machine scan.
- Hard-coded trigger times — the moment a bbox changes they no longer line up; derive from bboxes, and count `fired` live.
- Two targets on one row (the first draft had CTA and price side by side) — the label column collides; merge them into one box or split into two rows.
- Labels on top of the screenshot — in narration the screenshot is the evidence; covering it hurts both. Labels go in their own column.
- Label appearing on the same frame as the bracket — reads as two unrelated things popping; the 5-frame lag gives "frame, then name".
- Bracket start too small (1.2) — no visible aiming; focus flash too bright (>0.15) — reads as a selection highlight.
- Labels withdrawn when the sweep ends — fine for a product self-demo, but the narration isn't over; keep them until the group exits.

## Reuse
- Remotion/tsx (preferred): template/cards/scanline-annotate.tsx — `src` real screenshot, `targets=[{x,y,w,h}]` bboxes (relative to the screenshot's top-left, sorted by y), `labels=[{text,sub}]`; durationInFrames 180; sweep length via `CONFIG.dur`, sentence length via `exitAt / end`. Trigger times, bracket geometry and the counter all derive from `targets`.
- HTML/GSAP: demos/scanline-annotate/index.html — `.shot .tgt` coordinates and `CONFIG`; drop an `<img>` into `.shot` for a real screenshot (make the `.tgt` blocks transparent positioning boxes; geometry is still derived from their offsets).
- Source: video-shotcraft `scanline-annotate-focus` (dark HUD version; this card moves to a light stage with ink text, grows the 6.5px mono labels to a 20px separate column and keeps the labels on screen).
- NLE equivalents: CapCut "light sweep" effect + keyframed viewfinder stickers + text entrances; in AE one shape-layer position line with linear keyframes drives it, each bracket a Scale keyframe 175→100 easy-eased; Premiere has no direct equivalent — use a mogrt.
- Interface with layout.md: the card's left edge 80 snaps to the title margin; the label column at 712 = screenshot right edge 680 + 32 group spacing (§2); labels vertically centred on their targets (§3, block-level baseline alignment); bracket geometry measured from the bbox with an even 8px expansion (§3 annotation geometry).

## Motion scope
- Belongs to this card: the zero-easing scan line; the "trigger on crossing the bottom edge" bbox derivation; bracket 1.75→1 back.out + 7% focus flash; labels lagging 5 frames and staying; the live counter; the shared exit.
- Not this card: the CSS fake landing page, the four concrete coordinates, the label copy, the light stage.
- Migration interface: `src / targets / labels`; `dur` from narration; at 1080p line 2→4px, corner arms 14→28, expansion 8→16, labels 20→40 / 14→28; on a dark stage raise the glow to `rgba(41,151,255,.7)` and switch labels to light text.
- Background requirement: white is enough (the card lifts off via hairline + one shadow); dark also works.

## Placement self-check (copy into the SHOTBOOK self-check column when selecting this card)
- Every target bbox is measured from the screenshot (Playwright DOM coordinates / image annotation); bracket = bbox + 8, corner deviation ≤8px (layout.md §3).
- Targets sorted by y and **one per row**; any two labels' tops differ by ≥56 (label height 44 + 12).
- Two check frames: the instant a bracket pops (`shot-at <ft>`) — the bracket frames the target and the label is not yet visible; `ft+0.35` — the label is at the same height to the right.
- The scan line's y is a linear function of t throughout (sample two frames, slopes equal).
- Final frame: the status line reads `分析完成 · N 处` with N = number of targets; all labels still present.
- Screenshot card ≥48px from the frame edge at 960; label column right edge ≤912; nothing enters the subtitle band y ≥ 450.
