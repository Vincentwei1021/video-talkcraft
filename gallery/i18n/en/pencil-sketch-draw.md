---
name: pencil-sketch-draw
title: A hand holding a pencil draws the card/graphic live along real strokes — the line appears exactly where the pencil tip travels; when finished the pencil lifts away and the line stays clean and still
usage: "Drawing it for you on the spot" when explaining concepts/flows; warm, handcrafted, low-tech tonality; graphics appear stroke by stroke paced to TTS narration
---

## Intent
Screenshots and charts "show you the conclusion"; hand-drawing "walks you through the process" — the audience predicts the next stroke along with the pencil tip, their attention held hostage.
Critical rules to get it right: ① the pencil tip must genuinely ride the path (not a line growing on its own); ② the drawing speed needs stroke attack and release — constant speed looks like a loading bar.
Library finalization: **no line boil / stop-motion jitter** (user preference; see the motion-token note in design-language.md §4).
The hand-drawn feel comes from the stroke shapes themselves (skew, curvature) and the pencil's tracking; the frame's "life" is delegated to the global systems (camera drift/ambient breathing), never to line wobble.

## Motion Core
SVG path + `pathLength=100` + `strokeDashoffset` decreasing from 100 to 0 does the drawing; on the same frame, `@remotion/paths`'
`getPointAtLength(d, len*p)` samples the point on the path, the pencil group translates to it, with `rotate(grip angle)` for the tilt.
The instrument is **a photographed hand holding a pencil (green-screen keyed transparent PNG, pencil tip anchored at the local origin)** — a photo of a right hand gripping a yellow hexagonal pencil,
giving more "someone is drawing" presence than a vector pencil (finger joints, fingernails, skin texture are things vectors can't supply).
The key is aligning the photo to the same coordinate contract as the vector pencil: **graphite tip = local origin (0,0), pencil body growing toward −Y**.
Three nested layers complete the alignment: outer `<g>` written by `placePencil` with translate+rotate+scale / inner `<g>` fixed at
`rotate(−axisDeg)` straightening the photo's slanted pencil axis to −Y / `<image>` using `x=−tipX, y=−tipY` to move the tip pixel to the origin.
Thus translating to the growth point equals a zero-offset tip landing; the tilt is handled entirely by the outer rotate, so changing scale/tilt never detaches the tip from the stroke.
Pencil-body angle = fixed grip angle **+42°** (the photo is a right hand, pencil pointing upper-right, hand sitting upper-right of the stroke — matching right-handed writing occlusion)
+ `follow` × the vertical component of the travel tangent (slight tracking in turns; the composite angle always stays within +37°~+47°).
When done (p≥1) the pencil lifts **along its own axis** by 26px and fades (not a translation — that's what makes it look "picked up"); `keepPencil` can leave the pencil on the paper.
(`template/components/pencil.tsx` still keeps the pure vector pencil: same origin contract; use it when you need no photo dependency / recolorability.)

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| dur | 24 frames | Smaller = sketchy dash; >40 frames the audience gets impatient |
| width | 5px | Pencil lines 4~6; for a marker feel push to 8+ and change color |
| pencilScale | 0.5 (for the 640px-tall photo asset) | Hand+pencil at 55~65% of screen height is safest; <0.4 the hand is too small for presence, >0.6 the hand covers already-drawn lines |
| tilt (grip angle) | +42° (photographed right hand) | Outside +37°~+47° it stops looking like handwriting: too upright looks like stabbing, too flat like smearing. The vector pencil (left-handed orientation) takes −40° |
| follow (turn tracking) | 5° | 0 = the pencil body is rigid, not following the hand; >12° the pencil spins with every stroke like a weather vane |
| Lift distance | 26px | For a "setting the pen down" ceremonial feel, increase it + decelerate |

## Known Pitfalls
- The line grows on its own while the pencil hangs motionless — instant giveaway; the tip must sample `getPointAtLength` every frame.
- **Tip not at the origin**: drawing the pencil as "a shaft rect + rotation" and guessing the offset with translate — one change to scale/tilt and the tip drifts off the stroke.
  The right way is the graphite tip sitting at local (0,0), body toward −Y, every other part derived from that axis.
- **Measure the photo asset's anchors, don't guess**: `tipX/tipY` (tip pixel coordinates) and `axisDeg` (the pencil axis's angle from vertical-up)
  must be measured on **the final PNG** — cropping and scaling both change coordinates; finalize the asset first, measure, then never touch the image again.
  Tip: take the point in the dark graphite pixel cluster at bottom-left that projects farthest along the axis (not the bbox corner — the wooden cone skews the corner point).
  Axis angle: run PCA on the yellow-shaft pixels for the principal axis, orient it toward the eraser end, then compute the angle from −Y (clockwise positive).
  Verify: draw the tip circle + a ray from the tip along axisDeg on the image; the ray must hug the shaft's centerline, or the animated pencil will "scrape at a slant."
- **No global despill when keying**: the yellow shaft = R+G, and `despill=type=green` washes the yellow pencil red (it discolors at mix 0.05).
  The right way: after `colorkey`, erode the matte 1px inward (`MinFilter(3)`) to drop the outermost green fringe, then suppress green **only on semi-transparent edge pixels**
  (G never exceeding max(R,B)) — skin tones and the shaft are untouched. Determine the green value first by sampling corner pixels with PIL (this asset: 0x09EE20).
- **Feather the forearm cut off by the photo edge**: the original photo's right/bottom edges slice the arm flat; pasted onto white it reads as a "severed arm."
  Apply an alpha smoothstep falloff along those two edges (about 150/110px) so the forearm dissolves out of frame.
- Pencil drawn as "a yellow rectangle + small triangle" — unreadable as a pencil. At minimum it needs the metal ferrule and eraser (recognition lives in those two segments),
  the shaft needs 2~3 color facets for the hexagonal volume, and the wooden cone's ridge lines must align with the shaft's ridges or it looks like two glued pieces. (Applies to the vector pencil)
- Finished lines are static elements: the shot's motion quota is backstopped by the camera curve/idle/ambient layers (the motion_check standard) — never pad it with line wobble.
- A too-complex path drawn in one stroke — no human draws a whole car in one stroke; split by "strokes" into multiple chained paths (fast attack, gentle release).

## Reuse Guide
- **Pick one of two instruments**: for presence → the photographed hand-with-pencil asset (`demos/pencil-sketch-draw/hand-pencil.png`, green-screen keyed transparent PNG,
  817×640, `tip=(1,552)`, `axisDeg=44.24`); for recolorability / zero asset dependency → the pure vector pencil (`pencil.tsx`).
  Both share the same coordinate contract (tip = local origin, body toward −Y); swapping instruments only changes `makePencil()` — `placePencil` stays untouched.
- **Swapping in your own hand asset**: shoot on green screen / generate (the tip must be clearly visible and unobstructed by fingers) → produce the transparent PNG via the keying and feathering flow in Known Pitfalls
  → measure `tipX/tipY` and `axisDeg` into `ASSET` → for a left-hand asset negate `tilt` (body pointing upper-left, hand upper-left of the stroke).
- Remotion: `PencilDraw` in `template/components/pencil.tsx`; pass `d` (SVG path) + `at` (frame) + `viewBox` and it works; multiple strokes = multiple instances staggered by at.
- Sources for hand-drawn paths: draw in Figma/Illustrator and export the path, or have a model write the d for simple geometry directly.
- Editing-software equivalents: JianYing's "hand-drawn animation" stickers; AE stroke draw-on + a keyframed pen Null parented on.

## Scope
- Belongs to this card: the `strokeDashoffset` full-to-0 drawing progress (fast attack, gentle release, `power2.inOut`, 0.6~1.2s per stroke); the hand-held pencil riding the tip via per-frame `getPointAtLength`, the tip landing zero-offset on the growth point, grip angle +42° ± turn tracking (always within +37°~+47°); multiple strokes chained in stroke order (one finishes before the next begins); the pencil lifting 26px along its own axis and fading when done; the trailing label's 0.35s follow-up. Finished lines staying clean and still — **no line boil / stop-motion jitter** is part of this card's finalization.
- Does not belong to this card: paper/background color (the demo is now pure white), the specific paths of the example car and card frame, label copy, line width and font size, the photographed hand's skin tone/gender/grip style. The hand-drawn feel comes from the stroke shapes themselves (skew, curvature), not from any texture or wobble.
- Migration interface: line color via `CONFIG.stroke` (default ink #1d1d1f); the stroke table via `CONFIG.strokes`' `d` / `dur` / `width` (each entry = one stroke); for a sketchy dash lower `dur` (from 24 frames), for a marker feel push `width` to 8+ and recolor; the pencil's landing behavior via `CONFIG.pencil`'s `scale` / `tilt` / `follow` / `lift`; swapping the hand asset via `ASSET` (`href` / `w` / `h` / `tipX` / `tipY` / `axisDeg` — the last three must be re-measured on the new image). The asset is a real photo: skin tone and pencil yellow are never grayscaled — a gray hand and gray pencil can't read as "someone drawing"; with the vector pencil, likewise keep the wood #e8c39a, shaft yellow #FFD400, ferrule gray, and eraser pink #E79E96 (those segments are what make it read as a pencil rather than a yellow stick).
- Background requirement: white works. The paper color (formerly #f5f2ea) belongs to the style layer; reusers wanting paper texture lay their own underneath — the motion doesn't depend on it.
