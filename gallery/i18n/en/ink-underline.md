---
name: ink-underline
title: An ink ribbon — full pen pressure at the start, tapering thin at the release — grows beneath a keyword over 0.4~0.5s; the width variation isn't stroke thickness but the path's own two computed edges, the width at the moment the pen tip passes is its final width, and it holds still once drawn
usage: The moment the narration says "the point is these three words"; underlining 1~2 keywords within a sentence (especially contrastive arguments: underline the wrong claim first, then the right one); book-review / breakdown / teaching tones with an "I'm annotating this for you" register
---

## Intent
This library already has two ways to "mark up text": `highlighter-sweep` is a **highlighter color block** (one multiply rectangle sweeping the whole sentence,
emphasizing "this entire sentence", pinning the gaze by area); `scribble-annotation` is a **circle-and-arrow annotation** (circling a target, drawing a line,
emphasizing "this thing on screen", acting on footage rather than text).

This card fills the third slot: **a line with pen pressure, acting on one word within the sentence**.
It's lighter than the highlighter — no area, no change to the type's background, so you can underline two words in one sentence without dirtying the frame;
it's more precise than the scribble — the line's two ends are the word's two ends, so the viewer reads "exactly these two characters", not "this region".
Its most common narration context is **contrastive argument**: draw one line under the wrong claim, then one under the right one —
the mere existence of the two lines finishes saying "not this, but that".

Three critical rules:
① **Width variation comes from the path, not the stroke** — `stroke-width` is a constant and can't express pen pressure. You must walk the spine point by point, compute normals,
push out half-widths on both sides per the taper, and close the left bank forward + right bank backward into a single **filled path** (`fill`, `stroke:none`).
That is the entirety of `brushRibbon` in the source's `brush.tsx`, and the entire difference between this card and "a 6px round-cap line";
② **Truncate the spine, don't dashoffset** — the draw-on is implemented as "each frame, cut the spine to progress and recompute the ribbon".
The key is that the taper's t is still computed against **the whole spine** (not normalized to the drawn portion),
so the pen tip's width at any instant is its final settled width, reading as "the pen passing through";
normalized to the drawn portion, every frame's release end would be the thinnest, looking like a rubber band that thickens later.
Using `stroke-dasharray` to trace a filled path is even more wrong — it would run around the ribbon's **outline**;
③ **Hold still once drawn** — the source uses "5 freeze poses + per-step re-hashed jitter" (`steppedRamp` 3 frames per step + `hashRange`),
which collides head-on with this library's finalized "no boil / no stop-motion jitter" preference. This card replaces it with a single continuous eased growth;
the handmade feel is carried entirely by shape (the spine's curvature + the taper's thinning + edge grain), with zero change after settling.

## Motion Core
- **Spine**: one cubic Bézier, sampled at 40 points. The two control points offset **in opposite directions** vertically by `wobble` px
  (`+w` at 30%, `−w` at 70%, `+0.6w` at the end) — an extremely shallow S-curve, the dividing line between "a hand-drawn line" and "a CSS border-bottom".
  `wobble` is only ±1px; any larger and it instantly reads as a wavy line (that's the spelling-error mark). The two lines take **opposite signs** of `wobble`,
  so two side-by-side lines don't curve identically and read as batch-generated
- **Ribbon**: walk the spine computing per-point normals (perpendicular to the line joining neighboring points); half-width
  `half(t) = thickness/2 × (pressure + (release − pressure) × t)`.
  `pressure 1 → release 0.15`: full pressure at the start, lifting to 15% at the release — the pen leaving the paper.
  Left bank `spine[i] + normal × half`, right bank `spine[i] − normal × half`; the right bank reversed appends to the left bank, closed with `Z`
- **Each bank smoothed independently** (Catmull-Rom → cubic Bézier): connecting sample points with raw `L` shows 40 polyline segments on the ribbon edge
- **Growth**: `progress 0→1`, `power1.out`, 0.4~0.5s. Each frame `drawn = round(progress × 39) + 1` truncates the spine and recomputes the path.
  **Write `setAttribute("d", …)` directly rather than `gsap.set`** — the latter is queued to the next tick, and the draw lands one frame behind the sound effect
- **Edge grain**: `feTurbulence(fractalNoise, baseFrequency 0.7, numOctaves 3)` + `feDisplacementMap`,
  displacement `thickness × 0.5 × grain`. **Seed fixed, never varying over time** — the ragged edge is part of the shape, not a boil.
  `grain 0.5` is this library's value (source uses 1.0): 1.0 on a 10px line bites the release end apart into a few ink specks
- **Ink translucency `opacity 0.85`**: 1.0 reads as a vector color block, <0.7 reads as an under-inked pen
- **Coordinates never hard-coded**: each line binds a `data-ink="…"` target; at runtime, canvas `measureText`'s
  `fontBoundingBoxAscent` yields the true **baseline** (the line box's bottom edge has font padding — drawing against the line box floats the line a notch too low),
  and the line's center lands at `baseline + baselineGap`. Change copy or type size and the line follows automatically
- **Layering**: text layer → ink SVG layer (`pointer-events:none`, above the type but never covering it since the line sits below the baseline)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `dur` | 0.4~0.5s | Per-line draw duration, sized to word length (4 characters 0.5s / 2 characters 0.4s); <0.25s reads as a line popping into existence, >0.8s the viewer finishes reading before the pen does |
| `thickness` | 10px | Line width at the start (the release end is 15% of it); <6px the pressure taper is invisible (width variation becomes noise), >16px reads as a highlighter block and fights the type |
| `pressure` / `release` | 1 / 0.15 | Start pressure / release pressure. Equal = constant-width line (zero pen feel); `release` >0.5 isn't thin enough at the release, reads as a marker; inverted — small `pressure`, large `release` — is a "light entry, pressed finish" stroke, also legitimate |
| `wobble` | ±1px | Spine curvature; 0 = a line drawn with a ruler, >3px reads as a wavy line (spelling-error mark). Opposite signs for the two lines |
| `baselineGap` | 6px | Line center's distance from the baseline; <3px it presses on descenders (hitting the vertical hooks of glyphs), >12px the line floats outside the sentence |
| `overhang` | 8~9px | How far each end extends past the text; 0 = line exactly matches text length, reads as a table border; >20px reads as striking through the neighboring characters |
| `grain` | 0.5 | Edge grain; 0 = clean vector edge (tidy but loses the paper feel), ≥1 bites the thin release end apart into ink specks |
| `inkOpacity` | 0.85 | Ink translucency; 1.0 reads as a vector block, <0.7 reads as an under-inked pen |
| `gapBetween` | 0.75s | Interval between the two lines, matched to the narration naming them one by one; <0.3s the two lines seem simultaneous and the contrast vanishes |
| `samples` | 40 | Spine sample count; <20 shows polyline edges on the ribbon, >80 is wasted computation |

## Known Pitfalls
- Drawing with `stroke-width` and hoping for pen pressure — stroke width is a constant; no tuning gets you anything but a uniform line. Width variation must come from the filled path's two computed edges.
- Tracing this filled path with `stroke-dasharray/dashoffset` — the dash runs around the ribbon's **outline** (top edge first, then bottom), looking like a line circling the shape, not a pen moving.
- Normalizing the taper's t to the "drawn portion" — every frame's pen tip is the thinnest, then thickens after settling; reads as an inflating rubber band. t must be computed against the whole spine.
- Deriving the baseline from the line box (`getBoundingClientRect`) — CJK font line boxes have bottom padding, so the line floats outside the sentence; you must use `measureText`'s `fontBoundingBoxAscent`.
- Adding boil / stop-motion jitter after drawing (the original source is exactly 5 freeze poses + per-step re-hashing) — collides with this library's finalized preference, and reads as unstable rendering at 1080p.
- Copying the source's `grain` of 1.0 — on a 10px line the displacement is 5px, and the release end (only 1.5px wide) gets bitten apart into ink specks, reading as dried-out ink.
- Underlining 3+ words in one sentence — only one downbeat per screen; by the third line viewers no longer know where to look. Cap at 2.
- Line width of 16px or more — reads as a highlighter; that's `highlighter-sweep`'s territory, and the block covers the type's descenders.
- Both lines with the same sign and amount of `wobble` — side by side they curve identically, reading as batch-generated (a hand never draws two identical arcs in a row).
- Using `gsap.set` to change `d` inside `onUpdate` — queued to the next tick; the draw lands one frame behind the scratch sound effect.

## Reuse Guide
- HTML/GSAP: demos/ink-underline/index.html. The core is three functions — `spineOf()` (spine),
  `ribbon(spine, o, progress)` (variable-width ribbon — **this function can be lifted wholesale**; it has no coupling to the rest of the card), and
  `baselineOf()` (measures the true baseline). To add a line, add an entry to `CONFIG.marks` and tag the target element with `data-ink`.
- Remotion port: source at `registry/remocn/ink-underline/index.tsx`; the ribbon generator lives in
  `registry/remocn/brush/index.tsx` (`brushRibbon` / `brushHalfWidth` / `sampleCubic` / `BrushGrain` are directly usable).
  Seconds↔frames (30fps): draw 0.5s = 15 frames, lead-in hold 0.55s = 16.5 frames, gap 0.75s = 22.5 frames.
  **The one thing to change**: the source uses `steppedRamp(frame, delay, delay + durationSteps × step, {step: 3})`
  for 5 freeze poses (3 frames per step); swap it for a continuous
  `interpolate(frame, [d, d + 15], [0, 1], {easing: Easing.out(Easing.quad), extrapolateRight: 'clamp'})`
  to comply with this library's "no stop-motion" discipline; also remove `hashRange`'s per-step rerolling (make wobble a constant).
  Pass `grain` as 0.5 instead of the default 1.
- Editing-software equivalents: AE — Shape Layer Stroke + **Taper** (built into AE 2020+, start/end thinning — exactly this card's taper)
  + Trim Paths End keyframes for the growth, Roughen Edges for grain;
  JianYing/CapCut — no true variable-width brushstroke; fall back to "handwriting/brush" stickers' draw-on animation (fixed shapes, presets only),
  or pre-render the ribbon as an image sequence in AE/Figma and use it as footage.
- Division of labor among the rest of this family: **this card** = a pressured line acting on **one word** in a sentence (no area, up to two per sentence);
  **highlighter-sweep** = a fluorescent block sweeping the **whole sentence** (pins the gaze by area; must dim the remaining text);
  **scribble-annotation** = circles/arrows acting on **elements in footage** (circling a price, pointing at a button).
  The three never stack within one sentence.

## Scope
- Belongs to this card: the variable-width ribbon's generation mechanism (spine → per-point normals → tapered half-widths → left bank forward + right bank backward closed into a filled path); the `pressure 1 → release 0.15` full-pressure start and thin release; growth by spine truncation with **the taper's t computed against the whole spine** as discipline; the spine's two control points offset oppositely by ±1px into a shallow S-curve, with the two lines taking opposite signs; static `feTurbulence + feDisplacementMap` edge grain (seed fixed, never time-varying); the `opacity 0.85` ink translucency; line center at true baseline + 6px; the draw at `power1.out` 0.4~0.5s with a 0.75s inter-line beat; the "hold still once drawn, no jitter" trade-off; writing `setAttribute` directly inside `onUpdate` to avoid the one-frame lag.
- Not part of this card: the demo's two example lines and its "cost increase / channel structure" contrast copy, the 30px type size and 1.95 line height, the ink color `#6f7f35` (any dark color works — it only needs contrast against the background), the typographic choice of bolding-not-coloring the underlined word, the host placeholder (demo-context footage), the right-side 70% layout.
- Portability interface: each entry in `CONFIG.marks` = one line, with `target` pointing at a `data-ink` element; `color` swaps the ink (light ink on dark backgrounds, everything else unchanged); `thickness` scales proportionally with type size (a 10px line on 30px type ≈ 1/3 of the type size; give 20px for 60px type at 1080p); `dur` sized to word length; `baselineGap` / `overhang` are **feel constants**, scaled proportionally with type size; `grain` tuned inversely with `thickness` (the thinner the line, the smaller the grain, or the release end gets bitten apart).
- Background requirements: white/light is best (the ink is dark and lives on contrast). On dark, switch `color` to a light ink; `inkOpacity` may rise to 0.9 (light ink that's too translucent on dark reads gray).
