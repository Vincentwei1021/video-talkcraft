---
name: slow-push-in
title: A static page (screenshot/document/image) pushes in slowly at constant speed or an extremely gentle deceleration, scale 1→1.08–1.15, with the transform-origin bitten onto the point of interest and the frame drifting slightly to place it at a compositional position; over 8–15s no single frame reads as moving, yet it never stops
usage: The default underlying camera move whenever a talking-head shows a web screenshot / document / image / UI — a static asset should carry this curve the moment it appears on screen; explainers, reviews, finance breakdowns and other calm evidence-presenting tones; also the means of "gathering the viewer's gaze onto this one spot as the narration reaches it"
---

## Intent
Slap a static screenshot on screen and the frame instantly goes "dead" — the audience's eyes have no reason to stay on it, attention falls back to the audio,
and within a second or two they start wanting to swipe away. The slow push is the cheapest and most universal antidote: the camera moves toward the point of interest at a speed the audience cannot perceive,
every frame changes, and the feeling of "I haven't finished seeing this" is continuously sustained. The keys to getting it right:
**it must be constant speed or an extremely gentle deceleration** (a `power2.out`-style fast-then-slow reads as "a lunge"; the slow push's entire character is "imperceptible"),
**the travel must be small** (1.08–1.15; past 1.2 raster assets start softening and the audience notices image quality instead of content),
**it must not stop dead on arrival** (the hold period continues at the main push's end velocity — the most basic clause of this library's "the camera never stops" creed).

## Motion Core
- Structure: the static asset (screenshot/image/DOM page) fills the frame inside a **camera layer**; the camera layer is the only transformed element in the card; the asset itself has zero animation
- `transform-origin` bites onto **the point of interest's center** (a pull quote / key number / button), with coordinates derived at runtime from that element's bounding box — changing the point of interest just means hanging the id on another element
  The point of interest stays put while everything else grows around it, reading as "the camera is moving toward it"; an origin at frame center reads as "overall enlargement" (weaker but safer)
- Main push: `scale zoomFrom → zoomTo` (1.0 → 1.10), duration = this passage's narration length (8–15s in production)
- Easing: **constant speed** (`ease: none`) or **an extremely gentle front-loaded deceleration** — this library's shared camera ease: `p + (1−r)·p²·(1−p)`,
  start velocity = average velocity, end velocity = `r ×` average velocity (`r = endRate ≈ 0.6`). The critical property is **nonzero end velocity**: `power2.out` ends at zero and the camera stops dead
- Focus micro-drift: layered on the main push, `x/y` drift 5–15px each, easing the point of interest off "dead center" toward a compositional position (near a third line); the direction cooperates with the push — it is not random jitter
- Hold period (the seconds the narration dwells on this page): **continue pushing at the main push's end velocity, at constant speed** (`scale` travels another 3–5%, the drift extends proportionally).
  Velocity continuity ⇒ the audience can't read a "segment change," only that the camera keeps walking
- Asset size requirement: a raster asset's native resolution must be ≥ frame × `zoomTo` (a 1080p frame pushing to 1.15 needs a ≥2210px-wide screenshot), or the push-in immediately blurs

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| `zoomTo` | 1.10 (range 1.08–1.15) | Total travel. <1.06 the audience can't read any motion (equivalent to no camera move); >1.20 raster softens, and "pushing" becomes "enlarging," upstaging the content |
| `pushDur` | production 8–15s / demo 4.2s | As long as this passage's narration. The same `zoomTo` compressed to 3s becomes "a push shot" (an event); stretched to 20s it's completely imperceptible |
| `endRate` | 0.6 | End velocity as a fraction of average velocity. 1 = fully constant speed (safest); 0.6 = an extremely gentle "arriving" feel; <0.35 reads as letting go, and too small a value can't hand off to the hold |
| `driftX` / `driftY` | -13 / -7 px | Focus micro-drift amount. 0 = pure enlargement (usable but stiffer); >25px the audience notices "the frame is panning" — that's sway-parallax's job |
| `holdDur` | production 3–8s / demo 1.6s | Hold length follows the narration; what matters isn't the length but that this segment **must still be moving** |
| `transform-origin` | point-of-interest center | Biting the point of interest = "the camera walks toward it"; frame center = "overall enlargement" (one notch weaker but always safe — use it when you don't know where the point of interest is) |

## Known Pitfalls
- Using standard ease-outs like `power2.out` / `power3.out` — zero end velocity means the camera **stops dead** on arrival and the frame instantly reads as a frozen frame; the fast front section also reads as "a lunge," losing the slow push's "imperceptible" character entirely. A slow push may only be constant speed or an extremely gentle front-loaded deceleration.
- Travel pushed to 1.3+ — raster blurs and the audience notices image quality instead of what you're saying; vector/DOM assets don't blur, but the move still shifts from "push" to "enlargement" — different things.
- Stopping when the push completes (zero motion during hold) — this card's most common mistake. Audiences are acutely sensitive to complete stillness (motion_check will FAIL too); the hold must continue at the end velocity.
- Opening with both displacement and scale as big moves + a fade-in stacked on top — the slow push is **an undercurrent**, not an entrance effect. The asset's entrance belongs to media-pop-in / motion-blur-slam-in; the slow push starts only after the asset has settled.
- Resetting `transform-origin` per segment (e.g. switching origin during hold) — the moment the origin changes, the frame visibly jumps. Within one curve the origin must be constant.
- Pushing anyway on an under-resolved asset — a 1080p frame with a 1280px-wide screenshot is already interpolating at 1.15, and fuzzy edges are worse than no camera move.
- Both pushing and pulling in one passage (pushing halfway then pulling back) — the audience reads "a hand tremor" or "indecision." One direction per passage; to reverse, change shots.

## Reuse Guide
- HTML/GSAP: `demos/slow-push-in/index.html`. Change the asset by replacing the DOM inside `.page` (or swapping in an `<img>` filling `.camera`); change the point of interest by moving `id="poi"` to any element (origin coordinates derived at runtime); all rhythm is in the top-level `CONFIG` (`zoomFrom` / `zoomTo` / `pushDur` / `holdDur` / `endRate` / `driftX` / `driftY`). The liftable core: `CONFIG` + `camEase` + the `DemoShell.register` callback body — three pieces.
- Remotion port: the whole thing is one `interpolate` — `const z = interpolate(frame, [0, pushEnd, holdEnd], [1, 1.10, holdZoom], {easing: Easing.bezier(0.33, 0.33, 0.5, 0.85), extrapolateRight: 'clamp'})`, `x` / `y` likewise one each; applied as `transform: scale(z) translate(x, y)`, with `transformOrigin` at the point of interest's percentage coordinates. **For constant speed use `easing: Easing.linear` directly** (the default `Easing.bezier(0.42,0,1,1)` is ease-in and reads as accelerating); for an extremely gentle deceleration use the bezier above (velocity remains at the tail). `holdZoom = zoomTo + (zoomTo−1)/pushDur × endRate × holdDur`, keeping the two segments' velocities continuous without splitting Sequences. For image assets remember `<Img src={staticFile(...)}/>` and ensure the original ≥ frame × zoomTo.
- Editing-software equivalents: CapCut — two "scale" keyframes on the image (100% → 110%), **both keyframes must be set linear** (right-click to remove the default ease-in-out), position keyframes likewise; AE — two Scale keyframes + right-click `Keyframe Interpolation → Linear`, drag the Anchor Point onto the point of interest, or use Transform's `Position` in tandem; this is what asset marketplaces call **Ken Burns** (this card is its push half; the pull half is [slow-pull-reveal](slow-pull-reveal.md)); CapCut/Premiere likewise (in PR use `Motion → Scale` linear keyframes + `Anchor Point`).

## Scope
- Belongs to this card: a single **slow-push curve** over a static asset — `scale zoomFrom→zoomTo` (1.0→1.08–1.15) traversed over 8–15s (demo compressed to 4.2s), eased at constant speed or an **extremely gentle front-loaded deceleration with nonzero end velocity** (`camEase(endRate)` — the technical answer to "why not power2.out"); `transform-origin` bitten onto the point of interest's center and **constant throughout**; the simultaneous 5–15px focus micro-drift easing the point of interest toward a compositional position; the hold period **continuing at the main push's end velocity, at constant speed** (velocity continuity, the camera never stops); the structure of "the camera layer is the only transformed element; the asset itself has zero animation."
- Does not belong to this card: the demo's grayscale wireframe article page (nav bar / headline / bar chart / pull-quote block / related-reading rail and all their copy and layout), the specific decision to pick the pull-quote block as the point of interest, the signs of `driftX/driftY` (set by composition), the asset's entrance animation (belongs to media-pop-in / motion-blur-slam-in), and any annotation on the page (belongs to highlighter-sweep / scribble-annotation / focus-dim-spotlight).
- Migration interface: `zoomTo` sets the travel (capped by asset resolution, 1.08–1.15); `pushDur` aligns with this passage's narration length (when the duration changes, `zoomTo` **stays fixed** — travel is a perceptual constant, duration is a rhythm variable); `endRate` sets "constant speed vs extremely gentle arrival"; `driftX/driftY` scale proportionally with frame width (this card is designed at 960 wide); point of interest = any in-page element (tag an id; coordinates derived at runtime); `holdZoom` is derived automatically from the end velocity — never hand-fill it.
- Background requirement: a white ground suffices — this card has zero color, zero decoration; it is just a transform curve, valid on any background and any asset (light documents, dark IDE screenshots, photos).
