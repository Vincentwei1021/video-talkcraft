---
name: rack-focus-pair
title: Two white-bordered cards stacked front and back, always one sharp and one soft — when the narration turns to the other card the focus racks over in 0.7s power2.inOut (front blur 0→8 / brightness 1→.6 / scale 1.02→.97, back the reverse), racks back at 4.6s, and both exit together at 6.4s — like a lens focusing between two assets
usage: "A and B" mentioned back and forth (paper vs e-book, two products); two people / two viewpoints discussed alternately without cutting, only refocusing; old-vs-new; quote + rebuttal. Images or B-roll both work; the presenter is not involved
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ The presenter doesn't take part (person + assets → group D / host-shrink-to-chip) | ✓ Two clips, one sharp one soft, work the same way | ✓ (default) two screenshots / photos |

The two may differ in size and follow their real aspect ratios, but **the white border is identical and there is one shadow**.

## Common scenarios
1. "A and B" mentioned back and forth (the demo: paper book vs e-book)
2. Two people / two viewpoints in alternation — no cut, just a change of focus
3. Old vs new: talk about the old one first, then the new
4. Quote + rebuttal: the front card is the quoted screenshot, the back card is the data

## Intent
When narration speaks about A and B, cutting means two separate shots (the viewer re-orients each time) and a side-by-side split means comparison (`split-compare-slider` even demands matching composition). Rack focus is the third way: **both stay in frame and attention moves by demoting the other** — the two-asset version of the multi-asset research principle ③ "only one protagonist at any moment", the cinematographer's rack focus. Four things make it work:
1. **Always one sharp, one soft**: both sharp means no focus — just two pictures side by side.
2. **The soft card stays in place**: fading or shrinking it turns "focusing" into "switching".
3. **Scale moves with the filter** (1.02 ↔ .97): filter alone is a flat "getting blurry"; the 5% size difference adds depth.
4. **≥1.8s between racks**: the viewer must finish reading a card first; more than two racks makes them dizzy — for three or more objects use `focus-relay-triptych` / `hero-duo-layout`.

## Motion core
- **Geometry** (960×540): back card 480×320 at (400, 60), label bottom-right (right 24 / bottom 24); front card 380×270 at (100, 160), label bottom-left (left 24 / bottom 24); the front card covers the back card's bottom-left corner (overlap x 400–480, y 160–380). Border 10, radius 12 / inner 5, shadow `0 12px 60px rgba(0,0,0,.22)`; labels 20px 700 ink on white 94%, radius 8, shadow `0 4px 16px rgba(0,0,0,.18)`.
- **Two states**: in focus = `filter: blur(0) brightness(1)` + `scale 1.02`; out of focus = `blur(8px) brightness(.6)` + `scale .97`; `transform-origin 50% 50%`.
- **Entrance**: back card at 0.2s, front at 0.28s, each 0.5s `power3.out`: opacity 0→1, y 14→0; the front starts sharp, the back starts soft.
- **Rack**: at 2.0s front → soft and back → sharp, both tweens starting together over 0.7s `power2.inOut`; at 4.6s the reverse.
- **Exit**: at 6.4s both opacity→0 over 0.4s `power2.in`, done at 6.8s. Once landed they rest; no idle.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `softBlur` | 8px | 6–10; <5 doesn't read as focus, >12 the asset becomes unrecognisable |
| `softBright` | .6 | Works with the blur to hand attention over; >.75 both look sharp, <.5 the soft card turns into a black slab |
| `sharpScale` / `softScale` | 1.02 / .97 | The 5% difference is the depth; >8% reads as zooming rather than focusing |
| `shift` | 0.7s | The feel of a real lens racking; <0.4 looks like a hard switch, >1.0 the viewer waits |
| `focusAt` | [2.0, 4.6] | Follows when the narration names A / B; ≥1.8s apart |
| Card sizes | 480×320 / 380×270 | Derived from real ratios with identical borders; a slightly larger back card also works (it matters more when in focus) |
| Label size | 20px | ≈40@1080p, the floor of the list-item tier; labels go in the corner the other card can't cover |

## Pitfalls
- Both cards sharp at once — no focus, just two pictures side by side.
- The soft card fades or shrinks away — that's "switching", not "focusing"; it must stay put.
- Blur without darkening — the soft card stays bright and keeps grabbing the eye.
- Filter only, no scale — a flat "getting blurry" without depth.
- No overlap at all — reads as a split screen; the overlapping corner is the evidence of front and back.
- More than two racks — dizzying; three or more objects want the triptych or hero-duo cards.
- The back card's label under the front card — the back label must sit in the corner away from the front (bottom-right in the demo).

## Reuse
- Remotion/tsx (preferred): template/cards/rack-focus-pair.tsx — `srcs=[front, back]` two real images, `labels` two labels; durationInFrames 216; move the racks via `CONFIG.focusAt`, sentence length via `exitAt / end`.
- HTML/GSAP: demos/rack-focus-pair/index.html — sizes and positions on `.pf / .pb`, timing in `CONFIG`; swap `.ph` for `<img>` / `<video>`.
- NLE equivalents: two picture-in-picture tracks with 0.7s "blur" + "brightness" keyframes in CapCut/JianYing; two layers with Gaussian Blur + exposure keyframes easy-eased in Premiere/AE; a real 3D camera with focus-distance keyframes in AE (LinkedIn Learning "faking rack focus").
- Interface with layout.md: two-element group with a 480:380 ≈ 1.26:1 width ratio (§4, between 1:1 and 2:1); the deliberately unaligned top edges fall under the "annotation on top of material" layering exception (§6); the group's bounding box (100,60)–(880,430) is centred at x=490 ≈ 480 (§4).

## Motion scope
- Belongs to this card: the two-state definition (blur 8 / brightness .6 / scale 1.02 ↔ .97); the 0.7s power2.inOut rack with both cards starting together; the soft card staying in place; the one-corner overlap of the stack; the ≥1.8s interval; the 0.08-staggered entrance and joint exit.
- Not this card: the grey placeholders, the exact sizes and positions, the label copy, the white stage.
- Migration: `srcs` / `labels`; `focusAt` follows the narration; for 1080p blur 8→16, border 10→20, labels 20→40; on a dark stage deepen the shadow to `rgba(0,0,0,.4)`.
- Background: white is fine (the white border plus a single shadow lifts the cards off the stage); the lab prototype used a dark radial bed, the library version switched to white, and both hold.

## Placement checks (copy into the SHOTBOOK self-check column when chosen)
- The two cards overlap by one corner of 60–120px (80×220 in the demo): no overlap = split screen, >1/3 = occlusion.
- Each label sits in a corner the other card can't cover, 24 from its own card edges.
- Two stills — before the rack (<2.0) and after (>2.7) — must never show both cards sharp; in focus blur 0, out of focus blur 8.
- Without a presenter, the group's bounding box is centred within 48px; with one, the whole group goes to the opposite half.
- Border 10 on both, one shadow; card sizes derived from the assets' real ratios (`ffprobe` / image dimensions).
