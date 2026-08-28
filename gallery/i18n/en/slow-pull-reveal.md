---
name: slow-pull-reveal
title: The camera opens biting into one detail of the page (scale 1.25 + an offset pinning it to the frame center), then pulls out at constant speed over 8–15s back to the asset's original full-frame state; the audience receives the scale information at the instant of "oh, this is one whole dashboard"
usage: When the static asset being shown is itself "large in volume" — data dashboards, long lists, dense tables, panoramas; the two safest moments are the opening tease (show one number first, then reveal which table it lives in) and the section close (pulling back from detail to the whole for a summary)
---

## Intent
The slow push is "moving inward"; the slow pull is **an information-volume reveal** — its value is not in the motion, but in **the endpoint carrying more information than the start**:
the audience is first pinned onto one detail (this number is startling), then pulled out to see the whole it belongs to (turns out the entire table looks like this).
This order cannot be reversed: seeing the whole first and then pushing into detail is [slow-push-in](slow-push-in.md)'s job, with "focusing" semantics;
the slow pull's semantics are "expansion." The keys to getting it right:
**at the start the whole must genuinely be invisible** (1.2–1.35 with the point of interest pinned to frame center; starting at 1.05 means the whole is already there — pulling reveals nothing),
**the endpoint must return exactly to the asset's original state** (scale 1, zero offset — pulling past 1.0 exposes blank space beyond the asset, and the whole sense of reality collapses),
**constant speed as the base + a settle at the end rather than a slam-stop** (end velocity nonzero; the hold period walks out the final remainder).

## Motion Core
- Structure: the static asset fills the frame inside a **camera layer**; the camera layer is the only transformed element in the card; the asset itself has zero animation
- Opening framing: `transform-origin` fixed at **the frame center** (not the point of interest — the pull's endpoint is "the asset's original state," so the origin must be the frame center to finish with zero offset),
  using `scale = zoomFrom` (1.26) + a displacement `x = −dx, y = −dy` to pin the point of interest to frame center,
  where `dx/dy` = the point of interest's **unscaled** offset from stage center (derived at runtime from its bounding box; changing the point of interest only means moving the id)
- Main pull: `scale zoomFrom → 1`, with the displacement returning to zero in sync (both must live on the same timeline, or it reads as "shrinking while panning" — two separate actions)
- Easing: **constant speed** or this library's shared camera ease `p + (1−r)·p²·(1−p)` (`r = endRate ≈ 0.55`, more "settled" than the push).
  Nonzero end velocity is a hard requirement — `power2.out` ends at zero velocity and slams dead on the arrival frame
- Hold period: the main pull covers only fraction `k` of the total; the remaining `(1−k)` is walked out during hold **at the main pull's end velocity, at constant speed**, landing exactly on the asset's original state.
  `k = 1 − (endVelocity × holdDur) / total`; the two segments' velocities are continuous, so the audience can't read a segment change
- The duration-to-travel relationship matches the slow push: `pullDur` aligns with this passage's narration; `zoomFrom` is a perceptual constant — don't change it when the duration changes
- Asset resolution requirement: native resolution ≥ frame × `zoomFrom` (a 1080p frame starting at 1.26 needs ≥2420px width); a blurry opening is worse than no camera move at all

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| `zoomFrom` | 1.26 (range 1.2–1.35) | How tight the opening bite is. <1.15 the whole is already mostly visible, and the "reveal" drops to zero; >1.4 the opening is already soft, and the pull takes so long the audience gives up waiting |
| `zoomTo` | 1.0 (asset's original state) | **Do not change.** Pulling past 1.0 exposes blank space beyond the asset — instantly fake; only when the asset genuinely has margin around it may you go to 0.96 |
| `pullDur` | production 8–15s / demo 4.4s | As long as this passage's narration. Compressed to 2–3s it becomes "a pull shot" (an event, the register of pullback-cool-transition), not a slow pull |
| `endRate` | 0.55 | End velocity as a fraction of average velocity. A pull should settle more than a push (0.5–0.65); 1 = fully constant speed also works; <0.35 reads as letting go |
| `holdDur` | production 3–8s / demo 1.5s | Hold length follows the narration; this segment walks out the remaining `(1−k)` — the frame is still moving |
| Point of interest | any in-page element (tagged with an id) | Decides where the opening bites. Pick "the number/row that hooks people hardest"; choosing something at the asset's edge makes the opening framing expose blank space beyond the asset |

## Known Pitfalls
- Pulling to `scale < 1` — the stage background beyond the asset's edges shows, and the audience instantly knows this is "a pasted-on image shrinking," not a camera pulling out. The endpoint must be the asset's original full-frame state.
- `transform-origin` bitten onto the point of interest (copying the slow push's approach) — then the finish won't return the asset to full frame, forcing an extra corrective displacement, and the two actions fight. A pull's origin must be the frame center, with the point of interest pinned to center by **displacement**.
- Opening bite too loose (1.05–1.1) — the audience sees the whole from the start, and the subsequent "pull-out" reveals nothing new: a wasted camera move.
- Finishing with `power2.out` — zero end velocity, slamming dead on the arrival frame; a slow pull's finish must "settle" (decelerate) but never "stop."
- Scale and displacement on two timelines / two tweens — reads as "shrink a bit, then pan a bit," not one continuous shot. They must share one segment.
- Opening placement leaving the point of interest hugging the frame edge — it never reaches frame center, the opening composition is off, and the audience's first instinct is hunting for "where am I supposed to look."
- Insufficient asset resolution (a 1080p frame with a 1600px-wide screenshot starting at 1.26) — the blurriest moment is exactly the opening seconds that most need clarity.
- Using a slow pull while the narration in this passage is about "focusing on one point" — the camera direction contradicts the semantics. Focus inward with [slow-push-in](slow-push-in.md); only expand outward with this card.

## Reuse Guide
- HTML/GSAP: `demos/slow-pull-reveal/index.html`. Change the asset by replacing the DOM inside `.page` (or swapping in an `<img>` filling `.camera`); change the opening bite by moving `id="poi"` to any element (the offset is derived at runtime); all rhythm is in the top-level `CONFIG` (`zoomFrom` / `zoomTo` / `pullDur` / `holdDur` / `endRate`). The liftable core: `CONFIG` + `camEase` + the `DemoShell.register` callback body — three pieces.
- Remotion port: `transformOrigin: 'center center'` fixed, three `interpolate` calls on one timeline — `const z = interpolate(frame, [0, pullEnd, holdEnd], [1.26, zMid, 1], {easing: Easing.bezier(0.33,0.33,0.5,0.85), extrapolateRight:'clamp'})`, with `x` / `y` interpolating from `-dx/-dy` to `0` (`dx/dy` computed from the point of interest's percentage coordinates in the asset × the frame — hard-code as constants). For constant speed use `easing: Easing.linear` (**don't use the default bezier — it's ease-in**). Compute `zMid` and `k` by the card's formula: `k = 1 − (total/pullDur × endRate × holdDur) / total`. Compose as `transform: scale(z) translate(${x}px, ${y}px)`.
- Editing-software equivalents: this is **the pull half of Ken Burns** (the push half is [slow-push-in](slow-push-in.md)). CapCut — two "scale" keyframes on the image (126% → 100%) + two "position" keyframes (offset → 0,0), **both end keyframes set linear** (the default ease-in-out zeroes the end velocity); AE — Scale 126→100 + Position keyframes, anchor kept at the asset center, `Keyframe Interpolation → Linear`, or pull the end velocity nonzero in the speed graph; Premiere/CapCut likewise (in PR it's `Motion → Scale/Position` linear keyframes).

## Scope
- Belongs to this card: a single **slow-pull curve** over a static asset — `scale zoomFrom(1.2–1.35)→1` traversed over 8–15s (demo 4.4s), with the displacement **on the same timeline** returning from the "point of interest pinned to frame center" offset back to zero, eased at constant speed or an **extremely gentle deceleration with nonzero end velocity**; `transform-origin` fixed at frame center (the technical precondition for "the endpoint returning to the asset's original state with zero offset"); the opening offset derived at runtime from the point of interest's bounding box; the hold period walking out the remaining `(1−k)` at the main pull's end velocity, landing exactly on the asset's original state (velocity continuity, the camera never stops); the discipline that "the endpoint must be the asset's original full-frame state, never past 1.0"; the semantic direction of "start information < end information."
- Does not belong to this card: the demo's grayscale wireframe dashboard (top bar / sidebar / KPI cards / line chart / list / bottom cards and all their values and layout), the specific decision to bite into the "daily active users" card, the asset's entrance animation (belongs to media-pop-in), and annotations or spotlighting on the page (belong to focus-dim-spotlight / magnifier-detail).
- Migration interface: `zoomFrom` sets the opening bite tightness (capped by asset resolution); `pullDur` aligns with this passage's narration length (`zoomFrom` stays fixed when duration changes); `endRate` sets how much the finish settles; the opening bite point = any in-page element (tag an id; the offset is derived at runtime); `k` and the hold segment's endpoint are derived automatically from the end velocity — never hand-fill them; when the frame changes, `dx/dy` are re-measured from the bounding box and follow automatically.
- Background requirement: a white ground suffices — this card has zero color, zero decoration; it is just a transform curve, valid over any asset (light dashboards, dark terminals, photos, long tables). The one substantive requirement is that **the asset fill the frame** (an asset with margins will show blank space when pulled to its original state — an asset problem, not a camera problem).
