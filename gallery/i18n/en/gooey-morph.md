---
name: gooey-morph
title: n images each fly in from offscreen along an L-shaped path — sliding horizontally to their column first, then dropping vertically into their row slot; launch times deliberately ignore left-to-right order, and the images assemble nearly edge-to-edge into one horizontal strip — assembled is the final state
usage: Moments that lay out 3~6 parallel pieces of evidence at once — "these cases / these four platforms / these comparison shots"; the semantics of "they are one set" rather than "one at a time"; grouped images, grid-style assets, multi-platform rows
---

## Intent
User-finalized 2026-08-26: this card was originally **gooey text morph** — four color blocks fly in, line up, then run the goo three-stage pipeline
(Gaussian blur → alpha threshold re-tightening → turbulence displacement) and melt into four characters. Now **only the first half is kept**:
the blocks themselves are the content being shown (images), assembled is the final state, and nothing melts into anything anymore.

Dropping the second half was right, and the reason is mechanical: the goo pipeline's purpose is "blocks reshaping into type",
which requires smearing the frame into an alpha field before re-tightening hard edges. But an image is something whose content must stay legible —
blur an image and re-tighten it and the viewer just thinks the render broke. **The L-shaped entrance that remains is the genuinely valuable part of this card.**

So it moved from "decorated type" into **asset presentation**, alongside `media-pop-in` / `motion-blur-slam-in`.
The three split as follows: `media-pop-in` is **tilted stacking** (three images each with rotation, layered on top of one another, reading as "a stack of photos slapped on a desk");
`motion-blur-slam-in` is **same-direction slamming** (directional-blur high-speed fling with a hard stop, reading as "shoved in your face");
this card is **parallel assembly** (several images fitting snugly into one strip, reading as "this is a set — they're parallel").
For "a set of parallel evidence" use this card; for "piling" or "slamming" use the other two.

Two vital constraints:
① **The L-shaped path** — x travels the first half, y the second, axes split. Both axes moving together is a diagonal fly-in (a generic fly-in);
that corner hit of "reached my column, then dropped into my slot" is the Tetris hand-feel;
② **Launch times ignore left-to-right order** (0 / 0.13 / 0.27 / 0.43s — the 2nd lands first, the 4th last) —
sequential arrival reads as a program looping over the DOM; scrambled launches read as "each arriving from offscreen on its own".

## Motion Core
- **Slots are computed, not hardcoded**: one horizontal strip, centered as a whole within the image area.
  `stripWidth = count×picW + (count−1)×gap`, left end = `(areaWidth − stripWidth)/2`, accumulated one by one.
  **`count` is the sole "how many images" entry** — per-image width caps at `picW`; when the strip won't fit, it auto-narrows proportionally to the area's usable width
  (`picW = min(picW, ⌊(areaWidth − 2×sideMargin − gap×(count−1)) / count⌋)`, height following via `picAspect`).
  So 3 to 6 images means changing that one number, and no image ever gets clipped by the area's `overflow`
- **The L-shaped path**: per-image travel 1.0s, `k = ease(local progress)`, then
  `kx = min(1, k×2)` (x completes in the first half), `ky = max(0, k×2 − 1)` (y completes in the second).
  One easing curve thus describes both segments, and the corner lands automatically at k=0.5
- **Entrances always come from the image area's right exterior** (`entryFrom` x all positive): the area's left edge borders the digital human;
  flying in from the left would cross the person's body and get half-clipped by `overflow: hidden`. Vertical offsets half from above, half from below (±150 or more),
  so the four tracks don't read as one queue lining up
- **Easing `cubic-bezier(0.88,0.14,0.12,0.86)`** (the source's travelEase): **an extremely steep midsection** —
  slow start, fierce middle, steady finish. That's the "block sucked into place" feel; constant speed reads as a program dragging elements, `power2.out` as coasting
- **One image = white border + shadow**: the same "physical asset" material convention as `media-pop-in` (4px white border + soft shadow).
  The demo's grayscale placeholder art (a sun + two minimal mountain silhouettes) is a stand-in; in application swap the whole block for an `<img>`
- **The implementation is per-frame evaluation**: one linear virtual-clock tween + `frameAt(t)` (position as a pure function of t),
  isomorphic to Remotion's `useCurrentFrame` — seek / slow-motion / replay all behave identically
- **Layering**: white stage → person column (47%) → image area (right 53%, `overflow: hidden`) → the images (the only transformed elements)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `count` | 4 (3~6) | **The sole count entry**, width auto-adapting; at 3 the "assembled into one strip" parallel feel is strongest; at 6 each image is only ~70px wide and content starts to blur; >6 switch to a two-row grid (that's not this card) |
| `gap` | 5px | Inter-image seam; **a tight seam is what reads as "assembled into one strip"**, >20px it's just several images sitting around (for that, use media-pop-in) |
| `travel` | 1.0s | Per-image travel; <0.5s reads as popups, >1.6s viewers wait for the blocks to finish walking |
| `entryAt` stagger | 0 / 0.13 / 0.27 / 0.43s | Per-image launch times, **deliberately out of left-right order**; all simultaneous = one bulk translation, sequential = program-loop feel |
| `entryFrom` | x 300~500 (**must be positive**) / y ±175~195 | Start offset relative to the slot; negative x makes images cross the person and get clipped; \|y\| <100 hides the "dropping into the row" hit |
| `picW` / `picAspect` | 106px / 0.755 | Per-image width cap and aspect; 4:3-ish reads as photos, 1:1 reads as color blocks (right back to the old "block" semantics) |
| `sideMargin` | 34px | Minimum margin on both sides of the strip, doubling as the auto-narrowing basis; at 0 the end images hug the area's edge — reads as unlaid-out |
| `hold` | 1.4s | Final freeze — the assembled strip is this card's destination; <0.8s viewers can't finish looking at the images |

## Known Pitfalls
- Both axes moving together (one x/y tween) — becomes a diagonal fly-in, the most generic fly-in there is; the L-corner's "block feel" vanishes entirely.
- Images launching left to right in order — reads as a program looping over the DOM. The stagger order must be scrambled.
- Negative `entryFrom` x, flying in from the left — the image crosses the digital human's body and gets half-clipped by the area's `overflow`. Always enter from the right exterior.
- Setting the seam to a "comfortable-looking" 20~40px — the "assembled into one strip" parallel semantics are gone; it becomes several images sitting around. The seam must be ≤8px.
- Changing `count` while hardcoding `picW` — the strip bursts the area and end images get silently clipped by `overflow` (this demo hit it: at count=6 half an image was cut off each end). Leave the width to auto-adaptation.
- Easing with constant speed or `power2.out` — constant speed reads as a program dragging elements, `power2.out` as coasting; what's wanted is the steep-midsection "sucked into place".
- Adding rotation to "liven up" the images — that's `media-pop-in`'s semantics (tilted stacking). This card's entire point is **parallel tidiness**; one tilt and "this is a set" is gone.
- Using it as a transition (last shot's images assembling into the next) — this card operates inside one shot; it's an asset entrance; for cross-shot shape-shifting use `particle-weld-transition`.
- Using it repeatedly in one piece — parallel assembly is a "laying out the evidence" gesture; appearing twice in one narration stretch, viewers assume the previous set is still around.

## Reuse Guide
- HTML/GSAP: demos/gooey-morph/index.html. **To change the count, edit only `CONFIG.count`** (width auto-adapts);
  to change content, swap the three grayscale divs inside `.gm-pic` wholesale for an `<img>` (keep the white border and shadow — that's the "physical asset" semantics).
  Rhythm moves only `travel` and `entryAt`. `cubicBezier()` is a general easing solver, liftable as-is.
  The structure is "one linear virtual-clock tween + `frameAt(t)` per-frame evaluation", so seek / slow-motion / replay stay consistent.
- Remotion port: position is a pure function, port verbatim —
  `const k = Easing.bezier(0.88,0.14,0.12,0.86)(clamp((frame - startF)/travelF))`,
  then `kx = min(1, k*2)`, `ky = max(0, k*2-1)`, `x = lerp(fromX, restX, kx)`, `y = lerp(fromY, restY, ky)`.
  Seconds↔frames (30fps): staggers 0/0.13/0.27/0.43s = 0/4/8/13 frames, travel 1.0s = 30 frames.
  The source `registry/remocn/gooey-morph/index.tsx`'s `barRestPositions` / `barStartPositions` /
  `barEntryFrames` props map one-to-one to this card, **but its second-half goo filter chain is no longer used here** (drop it along with `morphStartFrame` and friends).
- Editing-software equivalents: JianYing/CapCut — two position-keyframe segments per image (horizontal first, then vertical), easing hand-pulled into a steep midsection;
  AE — three Position keys (start / corner / slot), setting the corner key's x to the slot x while y stays at the start y — that is the L;
  offset each image's start frame. This card is the easiest of all to make in an editor, because it has no filters — only displacement.
- Division of labor with its siblings, see the Intent section: `media-pop-in` tilted stacking / `motion-blur-slam-in` same-direction slamming / this card parallel assembly.
  The three **never mix within one narration stretch** (three asset-entrance logics fighting).

## Scope
- Belongs to this card: the L-path mechanism (x in the first half, y in the second, corner at easing progress 0.5); the deliberately out-of-order launch stagger (0/0.13/0.27/0.43s); the steep midsection of `cubic-bezier(0.88,0.14,0.12,0.86)`; the layout discipline of slots auto-computed into "one horizontal strip, centered as a whole, seams ≤8px" (including proportional per-image narrowing when the strip won't fit); entrances always from the image area's exterior (the side away from the person); the white-border + shadow "physical asset" material convention; and the timing discipline that assembly is the destination — no subsequent shape change of any kind.
- Does not belong to this card: the demo's grayscale placeholder art (sun + two mountain silhouettes), the specific `count = 4`, the specific 106×80 size, the host placeholder and the "person left 47% / images right 53%" layout, and the area's specific margin values.
- Migration interfaces: `count` is the sole count entry (3~6, width auto-adapting); swap assets by replacing the content inside `.gm-pic`; `entryFrom`'s x sign is decided by "which side the person is on" (person left ⇒ positive x, entering from the right; person right ⇒ negative x, from the left); `travel` / `entryAt` scale with narration pace; `picW` scales proportionally with output width, but `gap` **must not** scale up (widen the seam and it scatters into images sitting around).
- Background requirements: white works. On dark backgrounds swap the `.gm-pic` white border for a dark stroke (or drop the border and keep only the shadow); this card has no filters at all and doesn't depend on the background's color space.
