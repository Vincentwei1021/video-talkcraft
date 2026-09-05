---
name: still-layout-relay
title: When one sentence needs several images at once, the hero (first) image lands first, the rest enter in the same direction 80–150ms apart, whichever is being talked about lights up (others brightness .6 / scale .985, the focus 1.03–1.04 + an outline ring) with a 0.4s handoff, everything returns to neutral and exits together — two layouts on one card: hero + two supporting / vertical triptych
usage: "Claim + two pieces of evidence" (review hero shot + details, main screenshot + two comments) → hero-duo; "three people / three periods / three portrait screenshots" → triptych; no presenter in this shot, the material itself is the subject
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ No presenter in this shot (with the presenter on camera use parallel-items-with-host) | Yes (① hero is often video with screenshot evidence; ② takes three portrait clips) | Yes (default input: screenshots / photos / posters) |

Images and video may mix, but keep one frame ratio per group (crop, don't scale). The tsx `srcs` go through `<Img>`; for video swap the `<Img>` for `<OffthreadVideo muted>` (grid-to-hero.tsx has a ready-made extension-based switch).

## Common scenarios
1. Review: product hero shot + two details (lens line-up / grip) — ① hero-duo (what the demo shows)
2. Opinion: main screenshot + two comments as evidence; case study: the work + two references — ① hero-duo
3. Three people: three interviewees / a team of three / three rivals — ② triptych
4. The same subject in three periods, three portrait screenshots side by side — ② triptych

## Intent
Multi-image shots slide into PowerPoint most easily: three images fading in together, each on its own, none the subject. Merged from the 2026-09-05 material-presentation lab (C1 hero + two supporting, C6 triptych); three rules make it work:
1. **Decide the relationship before the layout**: primary/secondary → hero + two supporting (hero 57% wide + two equal cards on the right); parallel → triptych (4+4+4 columns). Wrong relationship, wrong layout.
2. **Entrances have order and direction**: the hero (first) image lands first, the rest follow in the same direction 80–150ms apart (narrative tier 50–100ms per item, total <600ms); everything fading in at once at the same speed = PowerPoint.
3. **Only one subject at any moment**: the focus handoff works by demoting the others (brightness .6 / scale .985); the subject itself moves only 3–4%; switch in 0.4s with ≥1.4s between handoffs. When done, everything returns to neutral ("all three count"), then exits together.

## Motion core
- One layout = one shot. ① hero-duo: `0.3s` hero lands (`y 30→0 + scale .96→1`, power3.out 0.6s) → `0.8 / 0.95s` two supporting images slide in from the right (`x 40→0`, power3.out 0.55s, 0.15 stagger) → `1.3s` captions fade in (0.4s, 0.1 stagger) → `2.4s` light up supporting 1 → `4.2s` light up supporting 2 → `6.0s` all return → `7.6s` exit together (0.4s power2.in, each item = image + caption, 0.04 stagger) → ends `8.08s`. The hero's inner image pushes `1→1.06` at constant rate for the whole shot; duration = shot length − lead (push until exit; written as a rate, not a fixed number of seconds).
- ② triptych: `0.3 / 0.38 / 0.46s` three images slide in from the right (`x 40→0`, power3.out 0.5s, 0.08 stagger) → `0.8s` captions (0.08 stagger) → `1.4 / 2.8 / 4.2s` handoff left → middle → right → `5.6s` return → `6.6s` exit → ends `7.08s`. No push (three equals — whichever pushes becomes the subject).
- A handoff = three things on the same frame: the subject `brightness 1 / scale 1.04` (①) or `1.03` (②) + outline ring appearing in 0.25s (inset −6, 3px, single accent `#0066cc`); the others `brightness .6 / scale .985`; the subject's caption turns ink `#1d1d1f`, the others light grey `#9a9aa0` (all back to `#6e6e73` on return). Switch power2.inOut 0.4s; stations never overlap.
- Geometry (960×540): ① hero 546×388 at (62, 66), supporting 250×176 at (650, 66) / (650, 278), group bounding box 62–900 centred horizontally, bottom-right quadrant left empty; captions 14px 6px below the image, left edge aligned to the image (+2 for glyph side bearing). ② three 262×380 at x 66 / 349 / 632, top 70 (4+4+4 columns, 21 gaps), captions 16px 600 12px below the image, centred at image width. White-edge cards padding 8 / radius 12 / the one shadow `0 12px 40px rgba(0,0,0,.16)`, identical across the group.
- The layout-name tag and grey placeholders in the demo are demo context; in production inject real images via `srcs`, copy via `captions`, and pick one `layout`.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `stagger` | ① 0.15 / ② 0.08 | 80–150ms reads as "in order"; >300ms becomes one-by-one showcase, <50ms can't be counted |
| `dimB` others' brightness | 0.6 | .55–.65; lower looks broken, higher doesn't separate the subject |
| `focusScale` subject | 1.03–1.04 | The subject moves only 3–4% — it was already there, the others step back; >1.08 looks like a mouse hover |
| `switchDur` | 0.4s | power2.inOut; <0.25 flickers, >0.6 drags |
| Station interval | 1.4–1.8s | = the length of the sentence about that image; stretch to the script, ≥1.4 so the viewer finishes looking |
| `heroPush` | 1.06 | Only for ①'s hero; rate = .06 / shot length, the longer the shot the slower the push |
| `exit` | 0.4s + 0.04 stagger | Faster than the entrance; image and caption leave as one item |
| Caption size | ① 14 / ② 16 @960 | Caption tier (28–32@1080); below 14 equals no caption |

## Pitfalls
- All three fading in together at the same speed — PowerPoint; the viewer can't read "which came first", hence "which matters".
- Supporting images entering from different directions (one from the right, one from below) — scattered; one direction per group.
- Focus by enlarging the subject (1.1+) instead of demoting the others — looks like a hover effect; the subject "stands still, the others step back".
- Handoffs too dense (<1s) — the viewer hasn't finished the previous image; ≥1.4s per station.
- Exiting straight after the last handoff without returning — the last image is remembered as "the conclusion"; the return means "all three count".
- Inconsistent white edge / radius / shadow, or mixed orientations scaled individually — one style per group; unify mixed material to one frame ratio (crop, don't scale).
- Captions on top of the image or <14@960 — captions go below the image at caption tier.
- Two layouts in one shot — layout is relationship, one sentence has one relationship; the demo tours both only to show them.

## Reuse
- Remotion/tsx (preferred): template/cards/still-layout-relay.tsx — `layout` picks one (default `"tour"` = the demo), `captions` three captions, `srcs` three real images (① order: hero / supporting 1 / supporting 2; ② left to right), `accent` ring colour; duration via the exported `durationFor(layout)` (① 254 frames / ② 224 / tour 467); to stretch stations to the script edit `TABLE[layout].relays / reset / exitAt`.
- HTML/GSAP: demos/still-layout-relay/index.html — `ORDER` sets tour order and count (trim to one for a single-layout preview); `CONFIG` holds the shared rhythm, `TABLE` the two timetables; swap `.pic` blocks for `<img>` for real images.
- Interface with layout.md: no presenter → group bounding box centred (§4); ≥48@960 from the frame edge (§2); captions at caption tier (§5); one style per group (§8).
- NLE equivalents: CapCut/JianYing picture-in-picture × 3 with keyframes, plus brightness/scale keyframes on the non-subject layers; AE is Brightness & Contrast + Scale keyframes with an outline Shape Layer parented to the card.

## Motion scope
- Belongs to this card: the two timetables (hero/first lands → same-direction stagger → captions → handoff → return → exit together); the three-part handoff (others brightness .6 / scale .985, subject 1.03–1.04 + ring, caption recolour) with its 0.4s power2.inOut; ①'s hero 1→1.06 constant push (duration = shot); exit 0.4s + 0.04 stagger; both layouts' geometry (centred group, ≥48 margins, captions 6 / 12px below, consistent card styling).
- Not this card: grey placeholder images (demo context), caption copy, the six placeholder tones, the layout-name tag (tour only), the white stage.
- Migration: `layout` to pick; `captions` / `srcs` for copy and images; `accent` for the accent colour (one per film); `TABLE` relays / reset / exitAt follow sentence length; scale geometry from 960×540 for other frames; for portrait, ① puts the hero on top with the two supporting images in a row below.
- Background: white is fine (white edge + shadow separate on white; on dark beds raise the shadow to .35).

## Placement checks (user-finalized 2026-09-05, copy into the SHOTBOOK self-check column when chosen)
- **Group centred**: ① bounding box x 62–900, ② 66–894; centre off 480 by >48 = rework; ≥48 from the frame edge (① right column 60 from the right, captions ≥58 from the bottom).
- **Ordered entrance**: take the still at the hero's landing (① 0.9s / ② 0.8s) — the others are still sliding (x >0); all three landing on one frame is wrong.
- **One focus**: at any moment exactly one image has brightness 1 + ring, the others .6; on the return frame (① 6.4 / ② 6.0) all three are 1 with no ring.
- **Ring geometry**: inset −6, 3px, radius = card radius + 6, equal on four sides (>8px off = rework).
- **Caption size**: ① ≥14@960, ② ≥16@960 (≥28 / 32@1080), legible when shrunk to 390px; captions never over an image or a neighbour.
- **One layout per shot**: the SHOTBOOK writes a single `layout`; station count = the number of images the script names (① two, ② three).
