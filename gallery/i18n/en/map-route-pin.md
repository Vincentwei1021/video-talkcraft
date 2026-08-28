---
name: map-route-pin
title: A dashed route grows across the map from city A to city B; on arrival a pin slams down from above with one squash-and-rebound, and the place-name label slides out from its side
usage: When the narration covers geographic movement, itineraries, or event chains ("from Beijing to Shanghai, then to Shenzhen"); documentary explainer, business analysis, and incident-retrospective tones
---

## Intent
When narration tells a spatial story (migration, itinerary, supply chain, event chain), words alone won't make viewers retain the geography —
routes "grow" segment by segment in narrative order, translating temporal order into spatial order so viewers follow the line's tip.
Critical rules: **arc + easing** (a constant-rate straight line instantly reads as a PPT connector), **the pin must slam down** (accelerated fall +
landing squash-and-rebound gives arrival its weight; a faded-in pin is a sticker), **only one route grows at a time** (narrative order is
route-growth order; grown together, it's all lost).

## Motion Core
- Base map: an inline-SVG abstract map — one very light land fill (demo #f5f5f7) + grayscale-stroked coastlines/islands + a faint graticule; no real map data. What matters is land/sea being distinguishable so the route's course reads
- Origin pin lights first: at t≈0.15s the origin pin drops first, in a distinguishing color (yellow), answering "where we start" up front
- Route growth: a Bézier dashed line (Q control point bowing outward), with a same-shaped solid path inside a mask, `strokeDashoffset: L→0`
  over 1.1s `power1.inOut` revealing the dashes; the mask path uses butt line caps (a round cap at offset=L leaks a dot at the start)
- Tip follower: a small nose-cone graphic (the demo uses a grayscale SVG, not a colored emoji) rides the tip via `getPointAtLength(progress*L)`, sampling a point 2px ahead to compute the tangent angle and rotate to heading
- Pin drop: y -60px→0, 0.25s `power2.in` accelerating down; one squash frame on landing (scaleY 0.7 + scaleX 1.3, 0.06s)
  then a `back.out(3)` rebound over 0.28s; `transform-origin: 50% 100%` (pin tip as the axis, or the squash lifts off the ground)
- Landing feedback: a ground dust ring scale 0.2→1.6 fading out over 0.45s; the place-name label slides out from the pin's side, x -14→0 + fade, 0.2s
- Third stop joins late: after the previous pin settles, pause 0.4s before growing the second leg, with the matching city name lighting up in the caption in sync

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| routeGrow | 1.1s | Above 1.5s viewers are waiting on the map and the pacing drags; below 0.8s the course is unreadable, reads as teleporting |
| routeEase | power1.inOut | Switched to none (constant rate) it instantly becomes a PPT connector; over-heavy easing (power3) makes the tip look stuttery |
| pinDropFrom | 60px | Larger = heavier slam, but >100px reads as a "pin from outer space"; smaller lacks drop height, like popping up in place |
| pinDrop | 0.25s | Larger becomes slow motion and the weight vanishes; <0.15s the fall is invisible, just a flash |
| squashX / squashY | 1.3 / 0.7 | Larger is more cartoonish, gag-leaning; back to 1.0 the landing is feather-light and the "pinned" feel is halved |
| labelSlide | 0.2s | Larger makes the label a late afterthought; smaller lands on the same frame as the pin and steals the slam's visual downbeat |
| legPause | 0.4s | Larger makes an audible pause, good for one-place-per-sentence narration; smaller joins the legs into one stroke and the "then to" layering vanishes |
| planeAngle | 32° | If the nose isn't hugging the tangent, tune this; 90° off is a plane flying sideways — instantly fake |

## Known Pitfalls
- The route as a constant-rate straight line — no arc, no easing; reads as a PPT connector, not a journey.
- The pin fading in or descending at constant speed with no squash — weightless, no arrival; like a pasted sticker.
- Multiple routes growing at once — all sequence lost; viewers don't know which line to watch.
- A real map screenshot as the base — detail noise steals the scene, plus copyright risk; abstract coastlines actually read more "explainer".
- No pre-lit origin marker — viewers don't know the starting point, and only work out the direction halfway through the route.

## Reuse Guide
- HTML/GSAP: demos/map-route-pin/index.html. Changing cities: edit the three `.pin-anchor`s' left/top and label copy,
  and update the two `route`/`reveal` mask path `d`s in sync (endpoints aligned to city coordinates, Q control point bowing outward);
  pacing and slam feel are all in the top-level `CONFIG`; the origin pin's color is in `.pin-anchor.start .pin-head`.
- Remotion port: routes via `@remotion/paths`' `evolvePath(progress, d)` for strokeDasharray/offset,
  progress via `interpolate(frame, [0, dur], [0, 1], {easing})`; the pin's y via
  `spring({frame, config:{damping:10, stiffness:180}})`, mapping the same spring's overshoot inversely onto
  scaleX/scaleY for the squash; the plane samples the same `path.getPointAtLength(progress * L)`.
- Editing-software equivalents: AE is "Trim Paths" + pin Scale keyframes with an Overshoot expression;
  JianYing "Stickers → map/pin" + hand-keyed position keyframes; CapCut's template market under "travel map" can substitute wholesale.

## Scope
- Belongs to this card: the origin pin dropping first (t≈0.15s, in a distinguishing color answering "where we start"); routes growing leg by leg along Bézier arcs — the solid path inside the mask at strokeDashoffset L→0 (1.1s, power1.inOut, mask strictly butt-capped) progressively revealing the dashes; the tip follower riding the tip via `getPointAtLength` and rotating to the tangent sampled 2px ahead; the pin's y −60px→0 accelerated slam (0.25s, power2.in) → one squash frame (scaleX 1.3 / scaleY 0.7, 0.06s, origin 50% 100% at the pin tip) → back.out(3) rebound 0.28s; the ground dust ring scale 0.2→1.6 fading over 0.45s; the place-name label x −14→0 + fade 0.2s sliding from the pin's side; the 0.4s narrative pause before the second leg joins; the matching city name in the caption lighting on the pin's landing frame + one 1.12 bounce.
- Not part of this card: the base map's shapes/coastlines/graticule density (the abstract wireframe is a placeholder; any base works), the pin and label's styling and colors, city names and caption copy, the presenter window, the tip follower's specific graphic (the grayscale nose cone swaps for any small icon).
- Portability interface: changing cities edits the three `.pin-anchor`s' left/top + label copy, updating the `route-*` and `reveal-*` mask path `d`s in sync (endpoints on the coordinates, Q control point bowing outward); scale `routeGrow` / `legPause` to narration speed; tune slam weight via `pinDropFrom` / `pinDrop` / `squashX,squashY` / `rebound`; correct `planeAngle` per the follower graphic's facing (this demo's nose points right, hence 0); color needs two tokens — the waypoint/route semantic color + the origin distinguishing color, with the caption highlight following the route color.
- Background requirements: **a minimal exception is allowed** — land in very light gray #f5f5f7, sea left white (#ffffff), because "route crossing land/sea" carries this card's geographic semantics, and on pure white the course is unreadable. Beyond that one light-gray layer, everything is grayscale strokes (#d2d2d7 coastlines, #ececef graticule), no gradients, no texture. Swapping in a real base map or a dark map only requires pin/route colors to hold contrast against it; motion timing unchanged.
