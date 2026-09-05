---
name: stack-fan-out
title: Five 220×150 cards sit in one stack (slightly offset) → fan open in 0.7s to −24°…+24° around an arc centre R=520 below the stack → hold 0.8s → flatten in 0.6s into one row of five equal cards (150 wide, 16 gaps, row centred, rotation zeroed) → exit together — "this pile" becomes "these five"
usage: "I collected these few / I shot five candidates this year / here's what this episode covers" — any summary-then-expand list (≤6 cards); images only (screenshots / photos / comment cards), no presenter in this shot
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ No presenter in this shot | ✗ Cards are only partly visible while stacked and fanned; video adds nothing | **Only** (screenshots / photos / comment cards / covers) |

Five cards of one ratio (220×150 ≈ 3:2); crop mixed orientations to one frame. Flattened cards are only 150 wide — text inside won't read; the images should be recognisable by look. To read content use grid-to-hero or media-pop-in.

## Common scenarios
1. Five candidates, first "a pile" then "five": this year's five cover candidates (what the demo shows)
2. "I collected these comments / screenshots" → talk through them after the flatten
3. Any summary-then-expand list (≤6: five reasons, five tool icon cards)
4. Cold-open preview of what the episode covers (the flattened row is the table of contents)

## Intent
"A pile of things" is the physical-world metaphor for a summary — a handful of photos spread out for you to see. Done right, the viewer first feels "there's a bunch", then sees "how many", and the final equal-spaced row means "now one by one". Three rules:
1. **The fan is rotation + translation around an arc centre** (below the stack, distance R), not each card spinning in place — when a hand spreads a stack, each card's position and angle are set together by the wrist.
2. **Fan and flatten must be separated by ≥0.6s**: one motion, one meaning — "a pile" → "five" needs the fanned state to be seen before it changes; run together they read as one messy fly-around.
3. **After flattening, every card is zero-rotation, equal width, equal spacing, row centred**: flattening is "lining up"; a degree of tilt left over means not lined up.

## Motion core
- `0.2s` title rises (`y 10→0`, power3.out 0.45s) + stack fades in (0.4s, 0.05 stagger): five 220×150 cards at (370, 170) (centre 480, 245), slight offsets `x (i−2)×3 / y (i−2)×−2 / rotate (i−2)×1.2°`, last card on top.
- `1.0s` fan (power3.out 0.7s): card i target angle `deg = −24 + 12i`, position = point on the arc centred R=520 below the stack centre `x = sin(a)·R, y = (1−cos a)·R`, rotation = deg. End cards centre at (268, 290) / (692, 290); leftmost edge ≈137 ≥48.
- `2.5s` flatten (power3.inOut 0.6s): `x = (i−2)×166, y = 0, rotate 0, scale 150/220` — five 150-wide cards, 16 gaps, row of 814 centred (73 from the edge), still on the y=245 midline.
- `5.8s` exit together (0.4s power2.in, five cards → title, 0.04 stagger) → ends `6.4s`. Between fan and flatten, and after the flatten, everything is static — no idle.
- Transform order matches GSAP: `translate(x, y) rotate(r) scale(s)`, origin 50% 50%; three states (stack → fan → row), two non-overlapping segments, sequential lerp.
- The 28px 700 centred title at top 60 is demo context (title tier); cards + title as a group sit around the upper third line (y 60–296). White-edge cards padding 8 / radius 12 / the one shadow.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `fanAngle` | ±24° | 12° per step for five; >30° the end cards start leaving the frame, <15° doesn't read as spread |
| `R` arc distance | 520 | Larger = "spread flat", smaller = "swung around a point"; R < 400 sinks the end cards into the caption band |
| `fanDur` | 0.7s | power3.out: fast start, steady finish; <0.5 flings, >1.0 drags |
| Fan → flatten hold | 0.8s | Must be ≥0.6 so "a pile" gets seen |
| `flatDur` | 0.6s | power3.inOut (eased both ends — the "lining up" feel); fan uses out, flatten uses inOut, don't mix |
| `flatW` / `flatGap` | 150 / 16 | Five = 814 centred; six → 130 / 14 (≈850) still ≥48 margins |
| `n` cards | 5 | ≤6; beyond that flattened cards are <120 wide and unrecognisable |
| `exitAt` | 5.8s | = done talking through them; the post-flatten hold follows the narration |

## Pitfalls
- Cards rotating in place with no arc translation — five cards jittering, not a stack being spread.
- Flattening right after the fan (<0.5s between) — the two motions blur into one fly-around; "a pile" is never seen.
- A degree or two of tilt left after flattening — "not lined up"; flatten = rotation zero.
- Uneven spacing or the row not centred — bounding box >48 off = P1 (layout.md §4).
- Perfectly coincident stack (no micro offset) — reads as one card, then five appear like a magic trick; 3px / 1.2° is enough.
- Video in the cards — unseen while stacked and fanned, five streams wasted; images only.
- More than 6 cards — <10° per fan step doesn't separate, flattened cards <120 wide.

## Reuse
- Remotion/tsx (preferred): template/cards/stack-fan-out.tsx — `srcs` five real images (array order = stack order, last on top), `title` (pass `""` to remove); the exported `END` is the animation end in seconds; stretch the post-flatten hold via `CONFIG.exitAt`.
- HTML/GSAP: demos/stack-fan-out/index.html — `CONFIG` on top (count / fan angle / arc / flat width & gap in one place); swap `.pic` blocks for `<img>`.
- Interface with layout.md: no presenter → row bounding box centred (§4); end cards ≥48 from the edge when fanned (§2); title at title tier (§5).
- NLE equivalents: CapCut/JianYing five picture-in-picture layers with position + rotation keyframes over the same range; AE five layers parented to one null with Rotation and Position expressions from the arc centre.

## Motion scope
- Belongs to this card: the timetable stack (micro offset) → fan (rotation + translation around the arc centre, power3.out 0.7) → hold ≥0.6 → row (equal width and spacing, centred, rotation zero, power3.inOut 0.6) → exit together; the ±24° / R=520 / 150-wide 16-gap proportions; transform order translate → rotate → scale.
- Not this card: grey placeholders (demo context), title copy and size, the five placeholder tones, the white stage.
- Migration: `srcs` for images; `title` to change or remove; `n` for card count (≤6, scale `flatW / flatGap` with it); `CONFIG.exitAt` follows the narration; scale from 960×540 for other frames; for portrait raise R to 700 and reduce the fan to ±18° to stay in frame.
- Background: white is fine (white edge + shadow separate the cards).

## Placement checks (user-finalized 2026-09-05, copy into the SHOTBOOK self-check column when chosen)
- **Fanned geometry**: end cards centred at (268, 290) / (692, 290), rotated ∓24°, leftmost / rightmost edges ≥48 from the frame; still at 1.7s.
- **Hold**: fan end (1.7) to flatten start (2.5) ≥0.6s, all five static in between.
- **Flattened geometry**: five 150-wide cards, 16 gaps, rotation 0, row bounding box 814 centred on 480 (>48 off = rework), midline y=245; still at 3.1s.
- **Stacked state**: micro offset visible (≥2px of each neighbour's edge showing), last card on top.
- **Title**: 28@960 title tier, never intersecting the stack / fan (title bottom ≤95, card top ≥137 when fanned).
- **Exit together**: from 5.8 the five cards then the title leave with 0.04 stagger, all gone by 6.4, nothing left over afterwards.
