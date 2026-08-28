---
name: pip-zoom-box
title: A thin-stroke viewfinder frame first appears over the subject's face and holds a beat, then travels and enlarges over 0.5s — carrying the framed picture with it — to settle in an empty spot on the right; on landing it swaps to a white-bordered card + the sole drop shadow, and an arrow then sweeps from the person to it
usage: When the narration says "let's pull this part out and look at it" — needing to display a local detail long-term while keeping the wide shot; explaining hand movements/expressions/product details/screenshot regions; when the wide shot continues afterward (the detail stays parked at the side, not withdrawn)
---

## Intent
"Look here" has two implementations, one card each in this library, **differing in where the enlarged detail lives afterward**:

`magnifier-detail` is **in-place magnification** — the lens pops up near the source, the base dims, a connector points back; the semantics are
"I'm pointing this spot out to you right now." It is **patrolling**: the lens keeps lightly scanning during hold, withdraws once seen,
serves one sentence at a time, and the wide shot is a dimmed supporting player for those few seconds.

This card is **the frame flying its content to the side to settle** — the viewfinder frames the target in place, then moves **frame and picture together** to an empty
spot at the frame's edge, from then on hanging there long-term as an independent piece of material. The wide shot is **not dimmed, doesn't yield**, because it still has speaking to do.
The semantics are "I've taken this part out and put it beside us; from here on I'll narrate the wide shot while you can keep watching it."
It is **settling**: fully still after landing, because it is no longer an action but a resident asset.

So the card-selection criterion is one sentence: **is the enlarged part glanced at and withdrawn (magnifier), or kept hanging (picture-in-picture)?**

Two critical rules: ① While the frame moves, **the content must move with it**. The frame's geometry and the in-frame picture's compensation must be written from a single progress value at a single point —
split them into two tweens and easing drift will inevitably slide the content out of the frame, instantly reading as "an empty frame flew across."
② **The frame appears first, holds a beat, then flies**. Without that 0.15s aiming beat, it reads as a frame flying in from the right and grabbing something
— the action of "framing this spot" never happened.

## Motion Core
- **Three layers in the transform group, geometry written at a single point**:
  - `.pz-shell` (transform group): its four values `left/top/width/height` written by `setPip(t)`
  - `.pz-win` (viewfinder window): the only element doing `overflow: hidden`
  - `.pz-win > picture copy`: a second DOM copy **structurally and pixel-identical** to the base wide shot (in the demo, the second
    `.host-placeholder`; the shell injects the digital-human video into every one)
- **`setPip(t)` is this card's entirety** (t: 0 = a 1:1 viewfinder hugging the face, 1 = the zoomed picture-in-picture settled on the right):
  - `zoom = lerp(1, 2.2, t)`, `w = lerp(boxW/zoom, boxW, t)`, `h` likewise
  - center `cx = lerp(faceX·SW, targetX, t)`, `cy = lerp(faceY·SH, targetY, t)`
  - **Inverse compensation**: the copy gets `transformOrigin: 0 0`, `scale = zoom`,
    `x = w/2 − zoom·faceX·SW`, `y = h/2 − zoom·faceY·SH`
    ⇒ the face anchor stays pinned to the frame center, **the picture itself never distorts**
  - At `t=0`, `zoom=1` and the compensation exactly cancels the frame displacement ⇒ pixels inside and outside the frame are strictly continuous (the second layer is invisible)
- **Four-beat timing**:
  - ① Frame appears: the whole transform group `scale 0.9 → 1` + `opacity 0 → 1`, `0.20s power2.out`
    (scale acting on the **group** = the first declaration that "frame and content are one thing")
  - ② Aiming hold `0.15s` (this card's second critical rule)
  - ③ Travel and enlarge: `t: 0 → 1`, `0.50s power2.inOut` — **the sole camera-curve easing** (design-language §4),
    gentle at both ends; `power3.out` reads as "flung across"
  - ④ Arrow: 0.05s after landing, the shaft draws via `dashoffset` over `0.18s power2.out`, the arrowhead filling in over
    `0.1s` once the shaft is 70% done (one-way indication; the tip stops ~18px short of the frame, never poking it)
- **Trim handoff (two layers, geometry both riding the shell)**:
  - Start: `box-shadow: 0 0 0 1.5px accent` — a thin viewfinder stroke ("framing" is a machine action: thin line + accent color)
  - Landing: `0 0 0 8px #fff` (white-bordered card) + `0 12px 60px rgba(0,0,0,0.22)` (**the system's sole drop shadow,
    reserved for evidence assets sitting on the background**, design-language §3)
  - The thin stroke fades out at 60% of the flight over `0.22s`; the white card fades in `0.18s` starting 0.06s before landing ⇒ the handoff completes on the landing frame.
    **Both layers are box-shadow only, occupying no layout**, so they never misalign with the frame
- **Corner radius follows size**: `4px → 10px` (small frame, small radius; a fixed 10px on the 127px starting frame reads as a rounded sticker)
- **Fully still while settled**: no scanning, no breathing — it's now a piece of material, not an action
- **Layers**: base wide shot (z1) → arrow (z4) → picture-in-picture transform group (z5)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `zoom` | 2.2 | Magnification, the card's core knob; <1.8 the audience can't tell "this is enlarged" (reads as a small pasted image), >3 the asset's resolution can't sustain it (a 540p digital human already shows pixels at 3x). **It also determines the starting viewfinder's size** (`boxW/zoom`) — raise zoom and the starting frame automatically shrinks, framing more precisely |
| `boxW`/`boxH` | 280 / 280 px | Settled viewfinder-window size (excluding the white border); equal width and height = a square frame (the reference image's format). >340 crowds the wide shot, <200 is illegible even enlarged |
| `targetX/Y` | 764 / 270 | Settlement center (stage coordinates); must land in **the wide shot's whitespace side** — over the person it becomes occlusion, not "taken out and put beside" |
| `faceX`/`faceY` | 0.275 / 0.315 (ratios) | The framing anchor, **must be recalibrated for a new person/asset**. Calibration: lock `t` at 0 and check the thin frame exactly frames the target. Written as ratios not pixels, so a frame-size change needs no recalibration |
| `flyDur` | 0.50s | Travel-and-enlarge time; <0.32s reads as "flung across" (losing the weight of "carrying"), >0.8s the audience waits for it to land while the narration has moved on. Easing must be `power2.inOut` |
| `aimHold` | 0.15s | The aim hold between appearing and flying, **this card's second critical rule**; 0 reads as the frame flying in on its own ("framing this spot" never happened), >0.4s the rhythm drops a beat |
| `showDur` | 0.20s | Viewfinder appearance time; >0.35s the frame becomes its own effect (it's only a declaration — keep it light) |
| `hold` | 1.80s | Settlement duration; in production = until this passage ends, extendable at will (the card's value is precisely that it can hang long-term) |
| `radius0`/`radius1` | 4 / 10 px | Corner radius follows frame size; equal values = an oversized radius on the small frame reads as a sticker |
| `arrowDur` | 0.18s | Arrow shaft draw; it's a post-landing footnote — >0.3s and it upstages the subject |

## Known Pitfalls
- Frame and content animated by two separate tweens — the slightest easing mismatch slides the content out of the frame, reading as "an empty frame flew across" (this card's most fatal mistake). Geometry must be written at a single point.
- Flying only the frame with a fixed cropped image inside — on the opening frame the interior doesn't line up with the exterior (a visible misalignment seam) and the audience instantly knows it's two fake layers.
- Frame flying the moment it appears — "framing this spot" never happened; reads as a frame flying in from the right and grabbing something. The aiming beat is mandatory.
- Flying with `power3.out` — violent start, abrupt stop, reads as being flung; "carrying a piece of material" wants `power2.inOut` (gentle both ends, the camera curve).
- Giving the settled picture-in-picture scanning/breathing — that's `magnifier-detail`'s language (patrolling); this card settles, and micro-motion turns the "resident asset" back into "an action."
- No white-card swap on landing, thin stroke only throughout — losing the physicality of "an object placed on the surface"; it reads as a UI overlay.
- Rolling your own shadow for the white card (say `0 4px 12px`) — the system has exactly one shadow (`0 12px 60px rgba(0,0,0,0.22)`); changing it breaks design-language §3.
- Starting stroke never exiting, white card stacked on top of it — two trims present at once, the frame reads as "double-outlined." They must hand off.
- Corner radius as a fixed value — the starting frame is only `boxW/zoom` big (127px here), and a 10px radius on it reads as a rounded sticker.
- Dimming the base wide shot — that's the magnifier's grammar (the base yields); this card's wide shot keeps talking, and dimming it tells the audience "stop watching over there."
- Swapping the subject asset without recalibrating `faceX/faceY` — the opening frame lands on an ear or on thin air, and the first beat is ruined.
- The two video layers out of sync — mouths inside and outside the frame mismatch, instantly exposing two layers (the demo covers this with a `currentTime` alignment every 900ms; that's a demo-context engineering detail — in production both layers come from the same footage and the problem doesn't exist).

## Reuse Guide
- HTML/GSAP: demos/pip-zoom-box/index.html. **Swapping assets takes exactly two steps**: replace the content of `.pz-scene`
  (the two copies must be structurally identical — the one inside `.pz-win` is the duplicate), then recalibrate `CONFIG.faceX/faceY`
  (calibration: temporarily comment out the `tl` after `setPip(0)` and check the thin frame exactly frames the target).
  Change the settlement via `targetX/targetY`, the size via `boxW/boxH` (`zoom` automatically determines the starting frame size, no extra math).
  The `setPip(t)` function is generic — any "frame carries content while traveling and enlarging" can copy it outright,
  as long as the target layer is a `transform`-able DOM node (screenshot cards, charts, webpage iframes all work).
- Remotion port essentials: carry `setPip` over as a per-frame pure function —
  `const t = interpolate(frame, [flyStart, flyStart+15], [0,1], {easing: Easing.inOut(Easing.quad), extrapolateLeft:'clamp', extrapolateRight:'clamp'})`
  (30fps: `flyDur 0.5s = 15 frames`), then compute `zoom/w/h/cx/cy` all from `t` on the fly.
  The frame's outer layer is `<div style={{position:'absolute', left, top, width, height, overflow:'hidden'}}>`,
  inside it **a second instance of the same `<Scene/>` component** wrapped in `transform: scale(zoom) translate(...)`
  (`transformOrigin: '0 0'` is mandatory, or the compensation math is all wrong).
  For live footage, both layers use the same `<OffthreadVideo>` with the same `startFrom` ⇒ naturally synced, no need for the demo's alignment fallback.
  The white card and shadow switch as `boxShadow` strings on the landing frame (in Remotion, `frame >= landFrame ? cardShadow : hairline`
  plus a 3-frame opacity cross is cleaner).
- Editing-software equivalents: JianYing/CapCut — **duplicate the identical video track** onto an upper layer, give the upper layer a "mask · rectangle"
  (square frame), then **keyframe the upper layer's "scale/position" and the mask's "size/position" as one matched set** (the two sets of keyframes must align in time and
  curve one by one — that is the entire workload; JianYing has no "group" concept); easing set to "ease in-out."
  The white border via the mask's "stroke" or an overlaid white square block.
  AE — the correct approach is a **precomp**: put the zoom layer and matte into one comp, then keyframe only that comp's
  `Scale` + `Position` with two keys (that is "the single transform group" — AE supports it natively, half the work of JianYing);
  the in-frame content's inverse compensation is the comp's inner layer at `Scale = 220%` with the `Anchor Point` pinned on the face — no expressions needed.
  `Drop Shadow` (Distance 12 / Softness 60 / Opacity 22%) switched on at the landing frame.
- Division of labor with sibling cards in this library: `magnifier-detail` = **in-place magnification + withdraw after viewing** (round lens, dimmed base, connector pointing back,
  scanning during hold, serves one sentence); `cursor-locked-zoom` = **the camera pushes in following the cursor** (the whole frame moves, no second layer);
  `focus-dim-spotlight` = **no magnification, only dimming the surroundings** (detail at original size, guided by contrast);
  **this card = the frame flies its content to the side to settle** (the wide shot doesn't yield, the detail hangs long-term, still after landing).

## Scope
- Belongs to this card: the engineering discipline of `setPip(t)` — "the frame's geometry + the in-frame picture's inverse compensation written from one progress value at a single point" (this card's body); the constraint that pixels inside and outside the frame are strictly continuous at `t=0`; the four-beat timing "appear 0.2s → aim hold 0.15s → travel-enlarge 0.5s `power2.inOut` → arrow 0.18s"; scale acting on the whole transform group rather than frame or content alone; the two trims handing off on the landing frame (thin viewfinder stroke fading out, white card + sole shadow fading in); corner radius traveling from 4px to 10px with frame size; complete stillness once settled (no scanning/breathing); the arrow drawing only **after** landing with its tip stopping short of the frame.
- Does not belong to this card: the demo's digital-human presenter as the specific magnified object (screenshot cards, charts, webpages all work), the specific accent `#0066cc`, the specific `faceX/faceY` values (an asset property; recalibrate per asset), the specific `targetX/Y` "settle on the right" placement (left or above work equally), the square format (circles/tall strips work too, as long as frame and content share the group), the white stage, and the demo's two-layer video `currentTime` alignment fallback (a demo-context engineering detail, unneeded when both layers share one source in production).
- Migration interface: asset entry = `.pz-scene`'s content (both copies structurally identical) + recalibrating `faceX/faceY` (ratio values; frame-size changes need no edit); size entry = `zoom` (which also sets the starting frame size) + `boxW/boxH`; placement entry = `targetX/targetY`; rhythm entry = `flyDur` (easing locked to `power2.inOut`) and `aimHold`; budget `hold` by actual narration length. Changing frame size: `faceX/faceY/targetX/targetY` are all ratios or coordinates recomputed for the new stage, `boxW/boxH` scale with the stage's short edge (280/540 ≈ 52% of the short edge); portrait switches to "settle below" (portrait sides have no 280px of whitespace).
- Background requirement: white works. The only constraint is **the settlement zone must be clean whitespace** — the white card + sole shadow carry the semantics of "an object placed on the surface," and a shadow over content (text, graphics, people) reads as dirt; likewise on dark backgrounds the white border must become a dark one (`#2a2a2c`) with the shadow swapped for the design-language dark-mode glow, or the white border outshines the content.
