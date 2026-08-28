---
name: shape-wipe-transition
title: Two or three color blocks in the same color family sweep across the full screen from the same direction, staggered 50–80ms; by the time the last layer sweeps off, the frame has already switched to the next scene
usage: Chapter changes, topic changes, "concept done, now the data" rhythm breaks in a talking-head; variety-show / fast-paced tones — common in both full episodes and vertical clips
---

## Intent
Hard-cutting between topics in a talking-head leaves the audience "not keeping up"; the shape wipe delivers a 0.6s strong rhythmic signal: the previous chapter has turned over.
Keys: **multi-layer stagger** (a single layer is just pulling a curtain; only 2–3 staggered layers give the "swoosh" its depth),
**hide the content swap inside the fully-covered frame** (the audience never sees the instant of the switch — only that the world changed after the sweep),
**fast in, fast out** (power4.inOut is extremely fast through the middle; any slower and the transition becomes an animation performance).

## Motion Core
- 3 color-block layers (same family, light→mid→dark, later layers stacked on top), rectangles with a `skewX(-12°)` slant
- **The blocks must be wide**: each layer about 2.6x screen width — in power4's high-speed segment, a 70ms time stagger opens up roughly 2 screen widths of spatial gap; a block only one screen wide will inevitably show a seam mid-sweep
- Each layer `xPercent -75 → 75` (computed for 2.6x screen width, exiting the frame at both ends with slant margin), single layer 0.45s `power4.inOut`, layer delay 60–80ms
- Mid-flight stretch: the block does `scaleX 1 → 1.22 → 1` through the middle of the sweep (a sense of speed); can be split into power4.in + power4.out halves with the stretch peak synced to the midpoint
- **Content-swap callback**: at the second layer's motion midpoint (= the frame where that layer fully covers the screen), use `tl.call()` to `set` scene A directly to scene B — instantaneous, no crossfade
- Visual read: the leading edge is two thin bands of light→mid color, with the dark body pressing behind; after the sweep, the new scene is simply revealed

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Single-layer sweep duration | 0.45s | >0.7s reads as a curtain being slowly dragged across and the rhythm collapses; <0.3s leaves only a flicker with no readable direction |
| Layer stagger | 60–80ms | >120ms opens seams between layers and half the old frame shows through; <40ms the three layers blur into one, defeating the purpose |
| Slant angle | -12° | 0° reads as a PowerPoint "push" transition; >20° the blocks become daggers and the corners tend to go uncovered |
| Mid-flight stretch factor | 1.22 | 1.0 is a flat constant-speed push with no sense of speed; >1.4 the block visibly deforms, reading as jelly/glitch |
| Content-swap timing | Second layer crossing the midline | Too early = the old scene vanishes while still visible (a black-flash giveaway); too late = the new scene peeks out through the block seams early |
| Layer count | 3 | 2 barely works; 1 = pulling a curtain; >4 reads as advertising ribbons, upstaging the content |
| Block width | 2.6x screen width | Narrower than 2.4x screen width the high-speed segment opens seams and old/new content flashes through; too wide is merely wasteful, with no side effects |

## Known Pitfalls
- A single block sweeping across — that's just dragging a curtain, zero production value, instantly cheap-looking.
- Layer stagger pushed past 120ms — seams open between layers, the audience glimpses the old frame through the gap: a giveaway.
- Content switch not locked inside the fully-covered frame — the swap instant gets seen and the transition's "magic trick" is exposed on the spot.
- Three layers in three different color families — reads as rainbow ad ribbons rather than one transition; must be one family, dark/mid/light.
- Sweeping with linear/power1 constant speed — no acceleration means no "swoosh"; it reads as a screensaver.
- Blocks only one screen wide — power4's mid-segment speed is 4x the average, so a 60–80ms stagger gets magnified into roughly a 2-screen-wide gap in space, and the new scene flashes through the seam: an instant giveaway.

## Reuse Guide
- HTML/GSAP: demos/shape-wipe-transition/index.html. Change `CONFIG.colors` to swap the color family (three values, light→mid→dark); tune the feel via `CONFIG.wipeDur / layerDelay / skew / stretch`; replace scene A/B content inside `.scene-a` / `.scene-b` — the content-swap callback needs no changes.
- Remotion port: each layer `interpolate(frame, [start, start+half, start+dur], [-75, 0, 75])` with the easing split in two (first half Easing.in(Easing.quart), second half Easing.out(Easing.quart)); swap content with a same-frame check `frame >= swapFrame ? <SceneB/> : <SceneA/>` switching Sequences, swapFrame = the second layer's midpoint frame.
- Editing-software equivalents: CapCut "transition → MG animation / wipe" category; CapCut "shape wipe / MG transition"; in AE use 3 solid layers with position keyframes, each offset 2 frames, Easy Ease 100%, with the edit point on the middle frame.

## Scope
- Belongs to this card: each of the three blocks' `xPercent -75→75` crossing (single layer 0.45s, `power4.in` + `power4.out` split in two = `power4.inOut` overall); the 60–80ms layer stagger (the three layers' ordering and the dark layer stacked on top); the mid-sweep `scaleX 1→1.22→1` stretch peak synced to the midpoint; the `skewX(-12°)` slant; blocks 2.6x screen width (the stagger gets magnified to roughly 2 screen widths of spatial gap in power4's high-speed segment — narrower necessarily shows seams); **the content-swap callback locked to the frame where the second layer fully covers the screen** doing the instantaneous switch.
- Does not belong to this card: the blocks' colors, all of scene A/B's content (host placeholder, mock chart, bars growing in, subtitle copy), the chapter badge. The bar chart growing bar by bar and the subtitles following are merely evidence that "the world changed after the transition" — replace them wholesale when changing scenes; the callback needs no edits.
- Migration interface: **the block colors = the reuser's brand-color interface** — change the `CONFIG.colors` array of three values, which must be **one family, light→mid→dark** (the demo uses three steps of neutral ink #d8d8dc / #8a8a8e / #1d1d1f; three different families read as rainbow ad ribbons); the feel lives in `CONFIG.wipeDur / layerDelay / skew / stretch`; when resizing, recompute block width to "≥2.4x screen width" — the ±75 in `xPercent` was derived from the 2.6x width, so changing the width means changing it too; to flip direction, negate `xPercent` and `skew` together.
- Background requirement: a white ground suffices (during the transition the blocks cover the whole screen, so the background doesn't participate). The only constraint is that the darkest layer must be able to cover both the old and new scenes — insufficient luminance contrast between block and scene background lets content bleed through mid-sweep.
