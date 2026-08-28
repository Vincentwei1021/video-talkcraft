---
name: magnifier-detail
title: A circular magnifier (1.8×, white stroke + large shadow) pops from the screenshot's target spot in 0.3s and lands in nearby empty space, the source dims in sync leaving a thin outline box on the target, and a connector line then draws back to the origin
usage: When a review/tutorial narration mentions a specific number, button, or clause inside a screenshot — "look right here"; a must-have for dense evidence screenshots, rational-explainer tone
---

## Intent
Screenshots are information-dense; when the narration reads out a number, viewers can't find it in the frame — the magnifier solves two problems at once:
**where it is** (a thin outline box at the origin + a connector pointing back) and **what it says** (1.5~2× makes it legible).
Critical rules: **pixel-true registration** (the magnified content must correspond to the source pixel for pixel; misregistration is instantly fake),
**land in empty space** (a magnifier covering the target body is blocking itself), and
**dim the source** (undimmed, inside and outside the lens fight for the gaze and the magnification loses its point).

## Motion Core
- Structure: a mock screenshot underneath; the magnifier = a circular container (`overflow:hidden`, 4px white stroke + large shadow) holding a clone of the same screenshot,
  the clone at `scale = zoom`, offset by `x = magSize/2 − zoom·px`, `y = magSize/2 − zoom·py` (px/py being the target point's coordinates within the screenshot), so the target lands exactly at the lens center
- Entrance: the magnifier springs from the target's original spot, scale 0.3→1 + travel to nearby empty space, 0.3s `power3.out`;
  on the same frame the base image goes `brightness` 1→`dimTo` (0.3s; 0.8 for light screenshots, 0.6 for dark ones) and an accent-colored thin outline box fades in on the target over 0.2s
- Connector line: as the entrance nears completion (popIn − 0.05s), an SVG line draws from the target point toward the lens center via `stroke-dasharray`, 0.25s `power2.out` — lens first, line second; the line means "pointing back at the origin", and reversing the order kills the causality
- Hold: the clone inside the lens pans ±(panPx×zoom) on x in a sine yoyo (1.4s half period), simulating a scanning gaze so the frame doesn't go dead
- Lead-in: the screenshot sits still for 0.45s before the lens pops, so viewers first grasp "what image this is" before diving into the detail

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `zoom` | 1.8 | Keep within 1.5~2; >2 the content blurs like mosaic, <1.4 the magnification is too weak — bold text instead |
| `magSize` | 210px | Magnifier diameter; too small is illegible, too large covers the layout (never exceed 1/3 of stage height) |
| `magX` / `magY` | 745 / 190 | Landing center, which must be empty space beside the screenshot; the farther from the target, the more the connector matters |
| `popIn` | 0.3s | >0.45s drags like a PPT fly-in; <0.2s the "popped from the origin" trajectory is invisible |
| `dimTo` | 0.8 (light screenshot) / 0.6 (dark screenshot) | Base-image dim level, chosen by the image's luminance: dimming a light screenshot to 0.6 turns it into one gray slab — 0.75~0.85 is "yielding without losing legibility"; 1.0 no dimming = emphasis fails |
| `startDelay` | 0.45s | One beat to take in the whole screenshot; 0 drags viewers into the detail before they've understood the whole |
| `panPx` | 7px | Hold-phase scan amplitude; >15 feels like a drifting camera, 0 makes the hold read as a static sticker |

## Known Pitfalls
- Magnified content misregistered against the source — the clone's offset wasn't calibrated by `magSize/2 − zoom·target coords` (or screen coordinates were used after the screenshot got scaled by its shell); one glance at the comparison and it falls apart.
- The magnifier landing on the target itself — covering its own origin; the reader can't tell what got magnified.
- No connector line / outline box — the lens floats orphaned; the reader can't find the origin in the source, and the magnification is wasted.
- Base image not dimmed — two equally bright copies fight for the gaze inside and outside the lens; the "look here" pointing collapses to zero.
- Completely static during the hold — the magnifier reads as a pasted static circle, not "actively looking".

## Reuse Guide
- HTML/GSAP: demos/magnifier-detail/index.html. Change the screenshot content via the lines in `.shot .body`; change the magnified target by simply moving `id="magTarget"` onto any element (target coordinates are derived at runtime, and clone registration and connector endpoints follow); change landing/zoom/dim via `CONFIG`'s `magX/magY`, `zoom`, `dimTo`; change the accent via `.target-box`'s border color and `#lline`'s `stroke` (currently #ffd23e), the magnifier stroke via `#magnifier`'s `border`; the narration caption sits in `.caption-zone`. The core is liftable: copy `CONFIG` + the `DemoShell.register` callback body.
- Remotion port: render the same screenshot as two `<Img>`s, the upper wrapped in a circular `borderRadius:'50%'; overflow:'hidden'` container, the inner one registered by the same formula via `transform: scale(zoom) translate(...)`; entrance driven by `spring({frame, config:{damping:200}})` on scale 0.3→1, position via `interpolate(frame, [t0,t1], [targetX, magX])`; dimming via `filter: brightness(interpolate(...))`; the connector SVG `<line>` via `strokeDasharray = \`${interpolate(frame,...,[0,len])} ${len}\``; hold scanning via `Math.sin(frame/fps * 2π/2.8) * panPx * zoom`.
- Editing-software equivalents: JianYing — picture-in-picture duplicating the same asset + "Mask → Circle" + scale-up, or search the sticker library for "magnifier"; AE — duplicate the layer with an elliptical mask + Scale keyframes, or use the built-in Magnify effect + a stroked circular solid; CapCut — "Magnifier" sticker / PIP + circle mask, same method.

## Scope
- Belongs to this card: the magnifier's **spring from the target's original spot** — `scale 0.3→1` + travel to nearby empty space (0.3s, power3.out); the same-frame base-image `brightness 1→dimTo` dim (0.3s) with the target's thin outline box fading in over 0.2s; the connector drawing from target to lens center via `stroke-dasharray` as the entrance nears completion (popIn − 0.05s; 0.25s, power2.out) — the **lens-then-line** causal order; the hold-phase clone panning ±(panPx×zoom) on x in a sine yoyo (1.4s half period) so the frame stays alive; the 0.45s lead-in stillness. The registration formula (`x = magSize/2 − zoom·px`) is the card's technical body and must travel with it.
- Not part of this card: the mock review-screenshot placeholder (window bar, body lines, data), the sample narration caption, the landing coordinates `magX/magY` (layout-dependent), the specific values of accent #ff4d4d and lens-ring color, and the lens's shadow finish (removed; a style matter).
- Portability interface: `zoom` sets magnification (1.5~2), `magSize` sets lens diameter (never over 1/3 of stage height), `magX/magY` set landing (must be empty space beside the target), `popIn` sets pop speed, `dimTo` **is chosen by the base image's luminance** (0.8 light / 0.6 dark), `panPx` sets hold scan amplitude; retargeting just moves `id="magTarget"` onto any element — coordinates derive at runtime and clone registration plus connector endpoints follow automatically; when resizing, scale magSize and ring stroke width with the canvas.
- Background requirements: white is fine (a thin dark-gray ring separates the lens from white without relying on a shadow). The only background-coupled value is `dimTo` — over-dimming a light screenshot yields one gray slab; see the parameter table.
