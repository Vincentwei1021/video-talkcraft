---
name: flying-words
title: On a dark stage 22 nouns are laid out by the golden angle on a flattened elliptical cross-section (radius 82–247) and fly along z at constant speed from −1750 to +800, through the camera plane and past the viewer; phases are spread i/N and two whole cycles loop seamlessly; the life curve [0,1,.5,.2,0] flares up in the first quarter, drops to half in the middle to make room for the foreground, and trails off at the end; words drift outward as they approach (drift .5→1.85) and blur when in your face (u>.86); a static central glow anchors the "end of the tunnel". It is a backdrop-level background layer — the foreground carries the presenter or the title
usage: The opening bed of a terminology explainer ("the 22 concepts in this episode"), an "information density" underlay for intros and outros, a moving background for capability lists (with a presenter or title in front), a depth-through-the-tunnel transition underlay; dark stage only (the whole card fails on white); ≤1 passage per video
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ The card takes no presenter, but a presenter can sit in front of it (it lives in the L5/L6 background layers) | ✗ | ✗ Takes only a word list (12–30 words) |

A background-layer card: its output is a "living bed"; the foreground (title / presenter / material cards) is layered on by the shot, and the rest-once-landed discipline applies to that foreground.

## Common scenarios
1. Opening bed for a terminology explainer: 22 AI terms fly past, the title "AI terms, explained once" in front (the demo shows only the bed, no foreground text — per the user)
2. "Information density" underlay for intros / outros: keywords fly, the channel name or presenter in front
3. A moving background for a capability list: "the things it can do" fly beneath while the foreground goes through them one by one
4. A depth-through transition underlay: previous shot fades, the tunnel runs one cycle, the next shot fades in

## Intent
"This episode covers a lot of concepts" has no picture of its own. A word cloud is the usual answer, but a static cloud is a slide and words popping in one by one are too slow. Let the words **fly from far away toward the viewer and past them**, using depth instead of layout: the viewer needn't read every word, only feel "many, coming at me". It is the library's only text-based background layer — not a title entrance, but the bed beneath the title. Four things make it work:
1. **The end point must pass the camera plane** (+800): stopping short of 0 gives "fly up to my face and stop", no brushing past.
2. **The 0.5 in the middle of the life curve makes room for the foreground**: fully bright all the way steals the lead; fading to zero too early empties the tunnel.
3. **CYCLES must be an integer**: frame t=0 and t=1 are identical, so the loop is seamless; a non-integer count jumps at the seam.
4. **Dark stage only**: bright glowing words on a dark ground are this card's identity; on white it simply fails (upstream verdict) — a light version would need dark words and no glow, which is a different card.

## Motion core
- **Scene** (960×540): `.fwd-scene` full-frame, `perspective 1100px`, origin 50% 50%, `overflow hidden`; central glow 220px radial `rgba(120,150,255,.28)→0` + blur 6, **static, no breathing** (motion subtraction; the upstream's two breaths were removed).
- **Layout** (per word i): angle `a = i·2.39996 + srand(i·7+1)·0.8` (golden angle, avoiding dead centre), radius `r = 82 + srand(i·11)·165`, y radius ×0.6 for a flattened ellipse; size `20 + srand(i·3)·16`, colour `hsl(200 + srand(i·5+1)·130, 80%, 78%)` (blue→violet). `srand` is a sine hash: frame-deterministic, identical in demo and tsx.
- **Travel**: `u = (t/dur·cycles + i/N) % 1`; `z = lerp(−1750, 800, u)`; `drift = .5 + u·1.35`; `x = cos(a)·r·drift`, `y = sin(a)·r·.6·drift`; `transform: translate3d(x,y,z) translate(−50%,−50%)`.
- **Opacity**: piecewise linear `OP=[0,1,.5,.2,0] @ OT=[0,.25,.6,.85,1]`.
- **Near-end blur**: for `u > .86`, `blur((u−.86)·26)px` (motion blur and modesty screen at once).
- **Layer in / out**: 0–0.6s fade in (power1.out), 5.5–6.0s fade out (power2.in); in a finished video drop these and cross-fade with the neighbouring shots.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| Word list | 22 words, 20–36px / 800 | Count and phase i/N are bound: <12 words is sparse, >30 smears near the camera; random sizes give depth, uniform sizes read as a sticker |
| `zFrom` / `zTo` | −1750 / +800, perspective 1100 | Start farther and words are unreadable; end before 0 and nothing passes through |
| `drift0` / `drift1` | 0.5 / 1.35 | <1 everything sprays from the centre like an explosion; >2 words leave the frame early and the tunnel becomes a fountain |
| Life curve | [0,1,.5,.2,0] @ [0,.25,.6,.85,1] | The mid 0.5 yields to the foreground; fully bright steals the lead, an early zero empties the tunnel |
| `cycles` | 2 (integer) | Non-integer jumps at the loop seam; more cycles = faster words; in a video use one cycle per 3s |
| `blurAt` / `blurK` | 0.86 / 26 | Threshold at 0.95 leaves huge hard-edged words; coefficient >40 turns the end into colour blobs |
| Colours | blue→violet light words + blue-violet glow | Glowing light-on-dark is the identity; the whole set fails on white |
| Glow | 220px, blur 6, static | Without it the tunnel has no focal end and words seem random; the upstream breathing was removed under motion subtraction |

## Pitfalls
- Using the card on white — light words vanish and the glow does nothing; a light stage means a different card.
- Nothing in the foreground — it's a bed; alone for 6s the viewer doesn't know where to look (the demo is the exception, to show the bed itself).
- Non-integer cycle count — a jump at the loop seam.
- Too many words / uniform sizes — smearing near the camera / sticker look.
- Adding breathing to the glow or rotation to words — violates motion subtraction; this card's only motion is the z travel.
- Foreground text in the same colour and size as the flying words — no layer separation; make the foreground white / larger / on a plate.

## Reuse
- Remotion/tsx (preferred): template/cards/flying-words.tsx — a single `words` prop; durationInFrames 192; for a video set `CONFIG.dur = shot length` and `cycles = round(dur/3)`. The foreground is layered on in your scene.
- HTML/GSAP: demos/flying-words/index.html — edit `WORDS` and `CONFIG`; `apply(t)` is the entire animation and can be lifted as is.
- Source: video-shotcraft `flying-words` (22-word golden-angle 3D tunnel + breathing central glow). Voiceover adaptation: Chinese word list, static glow, the upstream foreground text removed, filed as a background layer.
- NLE equivalents: AE 3D layers with a Position Z expression `linear(time, 0, dur, -1750, 800)` offset per word + a piecewise Opacity expression; no equivalent in CapCut/JianYing (pre-render to a transparent webm as background material).
- Interface with layout.md: background layers don't count toward the layout budget (cinematography §4.5's ≤3 subject groups); the foreground keeps the safe margins and subtitle band as usual.

## Motion scope
- Belongs to the card: z-axis travel + golden-angle layout + life curve + outward drift + near-end blur + seamless integer cycles; the static central glow.
- Not part of the card: the word list, everything in the foreground, the exact dark colour (`#1d1d1f` is this library's dark token).
- Migration interface: `words`, `CONFIG.dur / cycles`; at 1080p double zFrom/zTo/radii and type, perspective 2200.
- Background requirement: **a dark stage is a precondition** (the demo overrides the stage to `#1d1d1f`; see Intent point 4); don't use this card in a light video. It is a background layer; the foreground's rest-once-landed discipline is unaffected.

## Placement self-check (copy into the SHOTBOOK self-check column when selecting this card)
- Any frame: at least 6 words above 0.3 opacity (the tunnel isn't empty); no word above 0.55 opacity with z >600 at the same time (nothing near the camera covers the foreground).
- Word positions at t=0 and t=dur are identical (integer-cycle check).
- With a title / presenter in front, the foreground and flying words are clearly separate layers (white / larger / on a plate); flying words never hurt subtitle legibility in the y≥450 band (add a scrim there).
- The glow is unchanged throughout (no-breathing check).
- Recorded in the SHOTBOOK as an L6 environment layer, not counted as a subject group.
