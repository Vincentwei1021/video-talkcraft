---
name: tilt-3d-page
title: A static page first rests front-facing for a beat so it can be read, then tilts from flat into a 3D facade over 1.2~1.8s (perspective 1000px + rotateY 12~25° with a touch of rotateX); the shadow deepens in sync and shifts toward the side opposite the tilt; once raised, it keeps drifting in slight perspective
usage: Moments when a webpage/landing page/UI is shown off as a "product" — portfolio pieces, product intros, "here's the thing we built", case walls; also for demoting a page from "document" to "background prop" so captions or charts can be layered in front of it
---

## Intent
A front-facing page screenshot is "information"; a tilted page is "an object" — the same image, once raised, shifts the viewer's reading from "I should read this"
to "I'm looking at a thing". This conversion has two uses: one is **giving the page an identity** (a work/product worth exhibiting),
and the other is **demoting the page** (it becomes a prop, so captions and charts can be pressed on top — whereas text over a front-facing page fights it). The vital points for doing it right:
**the tilt must stay within the readable range** (rotateY 12~25°; beyond 30° the body text at the page's far end becomes unreadable — if it never needed reading, that's a different design; see "Known Pitfalls"),
**the perspective value must not be too small** (900~1200px; at 400px it reads as fisheye distortion, not space),
**the shadow must change with the tilt** (deepening + shifting to the opposite side; a static shadow makes the page read as a sticker rather than a solid floating in space),
**no stillness once raised** (slight perspective drift, both axes continuing extremely gently).

## Motion Core
- Three-layer structure: `.world` (`perspective: 1000px` + `perspective-origin`, set on the **parent container**) → `.camera` (the transformed camera layer, `transform-style: preserve-3d`) → containing the `.shadow` shadow layer + `.page` page layer
- Shadow-layer construction: a dark block the same size as the page + `filter: blur(26px)`, sunk behind the page at `translateZ(-34px)`.
  Because it shares the same `preserve-3d` space as the page, tilting **automatically** flattens it in perspective and creates a positional offset from the page — this is where the "thickness" comes from;
  on top of that, an animation-driven `opacity` + `x/y` offset is layered (the light source is fixed and the object turned ⇒ the shadow must move)
- The page layer gets `backface-visibility: hidden` to avoid gray, semi-transparent edges while tilted
- Opening: front-facing flat (`rotateY: 0`) resting for `startHold` (0.5~1s) — first let viewers register "what page this is", then turn it into an object
- Raising: `rotateY 0 → −19°` (negative = right side leaning back, near-left/far-right) + `rotateX 0 → 4.5°` (a slight downward angle) + `scale → 0.94` (a light retreat),
  1.5s `power2.out`. **`power2.out` is permitted here** — raising is a "placement" action (an event with a start and an end), not a sustained camera move; coming to rest is correct
- Why pair in rotateX: pure rotateY reads as "a door turning on its hinge"; a touch of rotateX makes it read as "mounted on a display wall"
- Why `scale 0.94`: after tilting, the page's projected diagonal lengthens; without retreating it would hit the frame edge
- Shadow sync: `opacity 0.05 → 0.19` (nearly flush with the stage while front-facing → floating once raised) + `x/y` shifting toward the side opposite the tilt, with the raise's **same duration and same easing**
- Hold phase (slight perspective drift): `rotateY −19° → −22.5°`, `rotateX 4.5° → 3.2°`, `sine.inOut` over 3~10s.
  **The two axes are out of sync** (one keeps turning, the other pulls back) — that's the boundary between "a living camera" and "a motorized turntable"; the shadow shifts a little more along with it
- Text-readability check: once raised, the page's **far end** (the side leaning back) shrinks the most; sign off against the smallest font size at the far end, not the near end

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `perspective` (parent container) | 1000px (range 900~1200) | Spatial strength. <600px edges stretch like a fisheye and read as "distortion" not "space"; >1600px the perspective is too weak — after tilting it approximates a flat shear (the 3D is wasted) |
| `rotYTo` | -19° (range 12~25°, negative = right side leaning back) | Facade strength. <10° viewers can't tell it was raised; >30° the far-end body text is unreadable (never exceed this for a page meant to be read) |
| `rotXTo` | 4.5° | Downward angle. 0 = the door-hinge look; >10° the page's top edge compresses hard, like a desk-top overhead shot (that's the 2.5D variant of evidence-scroll-tour) |
| `scaleTo` | 0.94 | Retreat during the raise. 1.0 lets the tilted page hit the frame edge; <0.85 the page gets small and the showcase feel weakens |
| `tiltDur` | 1.5s (range 1.2~1.8s) | Raise duration. <0.8s reads as a "fling" (a transition's tone of voice); >2.5s drags the pace — the audience waits for it to finish turning |
| `startHold` | 0.5s (range 0.5~1s) | Front-facing rest. 0 = viewers get spun away before registering the page; >1.5s it becomes two shots |
| `shadowTo` | 0.19 | Facade shadow density. Below 0.05 there's no floating feel; >0.3 reads as dirty on white, and smears into a blob on dark |
| hold two-axis endpoints | rotY -22.5° / rotX 3.2° | Slow-drift targets. The two axes **must be out of sync** (one advancing, one retreating); synchronized reads as a motorized turntable |

## Known Pitfalls
- Tilting past 30° — the far-end body text becomes completely unreadable. Only two ways out: drop back within 25°, or admit "this segment doesn't need the page read" (pure prop usage) — in which case swap the body text for grayscale placeholders rather than letting viewers strain at it in vain.
- `perspective` at 400~600px — the page edges stretch violently, reading as a fisheye lens / warped decal, not "a page in space". 900~1200 is the safe zone.
- `perspective` written on the transformed element itself (rather than the parent container) — CSS `transform: perspective(...)` and the parent's `perspective` have different perspective centers; with multiple elements each spins on its own and the space falls apart. This card fixes it on the `.world` parent.
- Shadow not changing with the tilt (a fixed `box-shadow`) — the page reads as a sticker. The shadow must ① share the `preserve-3d` space and get perspective-flattened ② deepen with the tilt ③ shift toward the side opposite the tilt.
- Forgetting `transform-style: preserve-3d` — shadow and page layers get flattened onto one plane, `translateZ` is fully inert, thickness drops to zero (the easiest to commit and hardest to diagnose).
- Forgetting `backface-visibility: hidden` — page edges go gray / show the background through while tilted.
- Complete stillness after raising — this library's chronic disease. The facade hold must carry the slight perspective drift.
- Both axes continuing in the same phase and speed during the hold — reads as an electric turntable turning uniformly, mechanical; the axes must desynchronize (one in, one out).
- Raising with `linear` or uniform speed — "placement" is an event; uniform speed reads as a robot arm. Here you precisely **do** want `power2.out` to settle (opposite to [slow-push-in](slow-push-in.md)'s discipline, because the semantics differ: that is a sustained camera move, this is a single action).
- The tilted page hitting the frame edge (or getting cropped) — the `scale` retreat was forgotten during the raise. The bounding box grows after tilting; sign off by checking all four corners.

## Reuse Guide
- HTML/GSAP: `demos/tilt-3d-page/index.html`. Change the material by replacing the DOM block inside `.page` (or a full-bleed `<img>`); posture and rhythm all live in the top-level `CONFIG` (`rotYFrom` / `rotYTo` / `rotXTo` / `scaleTo` / `tiltDur` / `holdDur` / `holdRotY` / `holdRotX` / `startHold` / `shadowFrom` / `shadowTo`); the perspective value is `.world`'s `perspective`, and shadow texture is `.shadow`'s `blur` and `translateZ`. The extractable core: `CONFIG` + the `DemoShell.register` callback body + the few CSS lines of the three-layer structure (`perspective` / `preserve-3d` / `.shadow`).
- Remotion port: outer `<div style={{perspective: 1000, perspectiveOrigin: '50% 46%'}}>`, inner camera `<div style={{transformStyle: 'preserve-3d', transform: \`rotateY(${ry}deg) rotateX(${rx}deg) scale(${s})\`}}>`; `ry` uses `interpolate(frame, [t0, t1, t2], [0, -19, -22.5], {easing: Easing.out(Easing.quad), extrapolateRight: 'clamp'})` (raise segment `Easing.out(Easing.quad)`; the hold segment switching to `Easing.inOut(Easing.sin)` requires splitting into two interpolates or using `Easing.bezier`), `rx` / `s` the same way; the shadow is a same-sized `<div style={{filter: 'blur(26px)', transform: 'translateZ(-34px)', opacity: op, ...}}/>` placed before the page (lower in DOM order). Note Remotion's `<AbsoluteFill>` does not carry `preserve-3d` by default — it must be written explicitly.
- Editing-software equivalents: AE — put the screenshot in a 3D layer (enable the layer's 3D switch), keyframe `Y Rotation` 0→-19°, pair with a Camera whose Zoom corresponds to the perspective, and build the shadow from a duplicated layer + darkening + Fast Blur + a slight offset; or the pseudo-3D route via `CC Cylinder`/`Corner Pin` (not recommended — the perspective isn't true). Jianying — the clip's "3D rotation"/"tilt" keyframes (Y axis); the shadow relies on the "shadow" parameter (limited follow-through, a notch weaker). Premiere — the `Basic 3D` effect's `Swivel` parameter + `Distance to Image`. **This is the "3D mockup / device tilt" category on stock sites** (Envato has plenty of ready-made AE templates).

## Scope
- Belongs to this card: the complete **flat → 3D facade posture conversion** — front-facing rest 0.5~1s → `rotateY 0→12~25°` (negative, right side back) + `rotateX 0→~4.5°` + `scale→0.94` retreat, 1.2~1.8s settling with `power2.out` ("placement" is an event, terminal speed may reach zero — the opposite of the sustained-camera-move discipline); the three-layer structure (parent `perspective 900~1200px` / camera layer `preserve-3d` / independent shadow layer at `translateZ(-34px)` + blur); **shadow-tilt synchronized linkage** — perspective-flattened within the shared 3D space + density deepening 0.05→0.19 + position shifting opposite the tilt; the hold phase's **out-of-sync two-axis** slight perspective drift (one axis advancing, one retreating, `sine.inOut`); the two threshold disciplines "tilt ≤25° to keep body text readable" and "perspective 900~1200 to avoid reading as distortion".
- Does not belong to this card: the demo's grayscale wireframe product landing page (nav / hero headline / main-image placeholder / three-column feature cards / pricing bar and all their copy and layout), the specific choice of tilting the right side back, the shadow's specific blur radius and density values (tuned to the background), the material's entrance animation, and any captions or charts layered on the page.
- Migration interface: `perspective` (parent container) sets spatial strength; scale it proportionally with frame width when changing aspect (this card is designed at 960 width / 792px page width); `rotYTo` / `rotXTo` set the facade posture (**sign off by "is the smallest far-end font size readable"**, not the near end); `scaleTo` is back-derived from the tilt amount (the bigger the tilt, the more retreat, keeping all four corners in frame); `tiltDur` 1.2~1.8s matches the length of the spoken line "here's the thing we built"; the hold's two-axis endpoints only need to remain "out of sync" — exact values are free; the shadow's `blur`/`translateZ`/`opacity` all scale proportionally with the frame, and dark material halves the density.
- Background requirements: plain white is fine (the demo's white base + grayscale shadow already reads "the page floats"). Dark backgrounds also work, but the shadow must switch to a **bright edge** (a dark shadow on a dark base is invisible) — swap `.shadow` for a light glow layer, or give the page a 1px bright outline in place of the shadow; this is background adaptation at migration time.
