---
name: long-take-world
title: All content is pinned to different spots on one big canvas, a single camera glides between them continuously as the story unfolds, and new content only takes shape as the lens approaches — no cuts; space itself is the narrative structure
usage: Topics with a spatial/process/map metaphor (pipelines, timelines, ecosystem landscapes); passages that want the premium feel of "one continuous take"
---

## Intent
Multi-shot is "editing thinking"; the long take is "spatial thinking": viewers always know where they are, where they came from, and where they're going,
and the relationships between pieces of information are expressed directly by spatial layout (the next step is to the right, the cause is below, review means walking back).
Critical rules for getting it right: ① the camera never teleports (continuous curves within the speed cap); ② content starts taking shape as the camera is **about to arrive**, not playing its animation after arrival; ③ the camera keeps micro-drifting even at a station, and the yielding rules apply as usual.

## Motion Core
`WorldRig` holds a station table `stops: {t, x, y, zoom, rot}[]` (t = a word-level timestamp anchor),
interpolating the camera state from sparse per-field keyframes with inOutSine, layered with dual incommensurate sine micro-drift (±5px) and downbeat pulses.
`WorldPlane depth` does parallax (background follows at 0.5); `WorldItem x y` pins content into world coordinates.
Reveals hang on `useArrive(x, y, radius)`: it returns 0→1 as camera distance < radius, and content's opacity/translation/draw progress hangs on it,
achieving "the thing is still growing as the lens swings over". Finished regions can hang on `1-arrive` for an exit defocus.

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| Camera speed | ≤1.5 screen-widths/sec | Any faster and you should switch to a whip transition; <0.3 screens/sec viewers think nothing moved |
| Station zoom | 0.9~1.15 | Pull back slightly then push in while moving (breathing); constant zoom throughout reads as a panning scan |
| arrive radius | 900px (about half a screen) | Large = shaping begins well in advance (unhurried); small = things appear only as you brush up on them (tense) |
| drift micro-drift | ±5px | The anti-stillness floor at stations; turning it off is guaranteed to trip motion_check |
| World layout | Station spacing 1.2~2 screens | Too close and stations leak into each other's frames (the previous station still in view); too far and travel time is all empty space |

## Known Pitfalls
- Stations laid out in a horizontal straight line = conveyor-belt PPT; the layout must be two-dimensional (right → down → diagonally up), with the path carrying doublings-back and zoom changes.
- Adjacent stations' content leaking into frame mid-travel: compute the visible range per zoom when laying out; anything half-formed exposed en route must either shape up early or defocus.
- The long take is not exempt from the seven layers: the world canvas merely swaps L1 from "one curve per shot" to "one big curve"; idle/yielding/environment apply as usual.
- When mixing with multi-shot, keep the time bases straight: WorldRig's t and in-scene animation anchors use the same time source (absolute seconds, converted via time.ts).
- (Field-tested) Lay the world grid yourself as an oversized div covering all stations; AbsoluteFill screen elements like GridField collapse to zero inside WorldPlane's 0×0 container.
- (Field-tested) WorldItem's anchor = box center holds only for ordinary content; for stations spread out with absolutely positioned children, the visual center drifts off the anchor (measured 460px) — the content must guarantee (0,0) is its visual center itself.
- (Field-tested) ≥0.5s of fully empty stage mid-travel = a guaranteed review flag; seed the route with foreground parallax symbols as filler (outside the arrival composition, entering frame only en route, positions verified against the view frustum).

## Reuse Guide
- Remotion: `longtake.tsx`, with the station table written table-driven beside shots.ts; the composition paradigm is in the file-header comment.
- SHOTBOOK practice: sketch the world layout first (each station's world coordinates + camera route arrows), and section the layer matrix by "station".
- Status: field-verified (2026-08-19, the author's internal project, act V3: 23.1s, three stations, camera at 1.08 screens/s, no mid-travel leaks, all three acceptance passes cleared; that project is process material and does not ship with the library). The copyable implementation is the `longtake.tsx` above.
- Editing-software equivalents: an AE mega-comp + camera keyframes (the spatial narrative of Prezi/Motion).

## Scope
- Belongs to this card: one camera moving continuously over world coordinates (station-table sparse keyframes + `sine.inOut` interpolation, speed ≤1.5 screen-widths/s, never teleporting); the mechanism that the camera = the world layer's inverse transform (`scale(zoom) translate(-x,-y)`); **proximity reveal** `useArrive` — content starts taking shape about 0.4 screens before the camera arrives (opacity/translation/scale hanging on distance falloff, not an animation played after arrival); dual incommensurate sine micro-drift ±5px after arrival (no "arrived" moment is ever fully still); the two-dimensional station layout (right → down → diagonally up, with doublings-back and zoom changes).
- Not part of this card: the station cards' borders/radii/type sizes, the example copy, the waypoint dots' styling, captions, the stations' specific coordinate values. The world grid is an edge case — it is not decorative texture but the reference that **makes camera travel visible** (without it, continuous movement over a white base looks static), so it stays, but its line color is freely swappable.
- Portability interface: the station table `CONFIG.stops` (`x`/`y`/`zoom`/`hold`) + `travel` inter-station duration + `arriveLead` proximity radius + `drift` micro-drift amplitude; when resizing, scale station coordinates and `arriveLead` with stage width (keeping spacing at 1.2~2 screens); the grid's `background-size` and line color change via `#worldgrid`. **Accent-color interface**: the demo collapsed the original #0066cc into ink; the `.waypoint` stroke is the single reserved accent slot — swap the whole group to the brand color on reuse (likewise the `em` in station titles).
- Background requirements: white is fine. The one substantive requirement is a **recognizable spatial reference** on the base (grid/map/texture, any will do); otherwise the camera moving through a flat empty field gives viewers nothing to read "movement" from — it is the carrier of spatial continuity, not a style decoration.
