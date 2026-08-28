---
name: orbit-drift
title: A small-amplitude orbit around a static page in 3D space — rotateY and rotateX ride two sine waves phase-offset by 90°, composing a closed elliptical trajectory (amplitudes ±6°/±3.4°), layered with a front-back breathing and a counter-tracking shadow; no beginning, no end — the whole thing is hold
usage: Segments where a static page must stay on screen for a long time (extended narration, point-by-point analysis, talk-while-viewing), needing a sustained undercurrent that "never repeats too obviously"; also for keeping the page stable as a background prop with captions/charts/data layered in front
---

## Intent
This card is the advanced version of "camera breathing," built to solve one specific problem: **the page must stay on screen for a long time**.
[slow-push-in](slow-push-in.md)'s push is one-directional — push for 30s and you've pushed into blur;
[tilt-3d-page](tilt-3d-page.md)'s facade hold drift is one-directional — drift long enough and you drift into the boundary.
The orbit is the only camera move that **can sustain indefinitely** — the trajectory is closed, always returning to origin, yet every frame is in motion.
Critical rules to get it right: **the amplitude must be small** (rotY ≤7°, rotX ≤4°; larger and it becomes a 3D rotation show, body text unreadable),
**the phase offset must be 90°** (0 or 180° degenerates into a diagonal line, reading as "swaying" not "orbiting"),
**long stretches must let the ellipse precess slowly** (with both axes on the same period the trajectory closes exactly; past 2 loops the audience recognizes the repeated orbit and reads a mechanical turntable).

## Motion Core
- Three-layer structure: `.world` (`perspective: 900px` — a touch closer than [tilt-3d-page](tilt-3d-page.md), so the orbit's parallax is readable) → `.camera` (camera layer, `preserve-3d`) → `.shadow` shadow layer + `.page` page layer
- Pose = base pose + two sines:
  - `rotateY = baseRotY + ampRotY · sin(2π·t/orbit)`
  - `rotateX = baseRotX + ampRotX · sin(2π·(t/(orbit·ratio) + 0.25))` ← **0.25 = the 90° phase offset, the sole source of "orbiting"**
  - `z = ampZ · sin(2π·(t/orbit + 0.6))` (subtle front-back breathing, its phase offset from both axes, reading as a third independent layer of "life")
- Why 90° phase offset = orbit: when one `sin` reaches its extreme, the other axis crosses zero ⇒ the composed trajectory is an **ellipse**;
  at zero phase offset both axes reach their extremes together ⇒ the trajectory degenerates into a **diagonal line** — that's "swaying" (rocking back and forth), not "going around"
- Base pose (`baseRotY: -8°`, `baseRotX: 2.5°`): the orbit drifts around this pose, not around the head-on position.
  `0/0` also fully works (head-on micro-drift, even more invisible); a bit of base pose makes it feel more like "a page placed in space"
- The shadow tracks **inversely**: when the page tilts left (`sin` negative) the shadow shifts right by `shadowShift`, its density varying subtly with `z` — the light source is fixed, the object is orbiting, so the shadow must move the other way
- The implementation is **a single tween driving one time scalar** + three sines computed in `onUpdate`, one continuous curve throughout: no segments, no start or end, nothing besides the hold
- **Period strategy (this card's most critical production decision)**:
  - Short use (≤2 loops, or needing a seamless loop such as a gallery thumbnail): **all three axes on the same period**, trajectory exactly closed, returning to the start seamlessly every `orbit` seconds, loop with no frame jump (the demo uses this)
  - Long use (>2 loops, live narration 30s+): set `periodXRatio` to **0.75~0.8** (e.g. 9s / 6.8s); the two periods are incommensurable ⇒ the ellipse slowly **precesses**, the trajectory never repeats, the audience can't recognize the orbit
- Text readability: the orbit amplitude is small, body text stays readable throughout; but with a `baseRotY` base pose configured, validate readability at the worst pose of **base + amplitude** (this card's worst is -14.2°, still inside the 25° safe zone)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `orbit` | live 9~14s / demo 5.6s | Duration of one loop. <5s reads as "the page is shaking" (the audience gets dizzy); >16s the sense of amplitude dilutes toward stillness; the longer, the classier |
| `ampRotY` | 6.2° (range 3~7) | Horizontal orbit amplitude. <2° the motion is unreadable; >8° the page's left/right edges get too much perspective difference, far-side text distorts, and it becomes a 3D rotation show |
| `ampRotX` | 3.4° (about half of `ampRotY`) | Vertical amplitude. Half makes the ellipse wider and more natural; equal amplitudes read as a circular orbit (more "demo-like," less natural) |
| `phaseX` | 0.25 (= 90°) | **Do not change**. This is the sole dividing line between "orbit" and "sway"; 0 or 0.5 degenerates into a diagonal line |
| `periodXRatio` | 1.0 (short use) / 0.75~0.8 (long use) | The two axes' period ratio. 1.0 = trajectory exactly closed, seamlessly loopable; 0.75~0.8 = the ellipse precesses slowly, non-repeating over long stretches. **This is the short-use/long-use switch** |
| `baseRotY` / `baseRotX` | -8° / 2.5° | Base pose. `0/0` also works (head-on micro-drift, more invisible); with a base pose, validate readability at the "base + amplitude" worst pose |
| `ampZ` | 22px | Front-back breathing. 0 = rotation only, no advance/retreat (one notch weaker); >50px clearly reads as push-pull, upstaging the orbit |
| `perspective` (parent container) | 900px (range 800~1100) | The orbit's dedicated closer perspective. >1400px the orbit's parallax is invisible (wasted effort); <600px fisheye distortion |
| `shadowShift` | 20px | Inverse shadow tracking amount. 0 = the page reads as a sticker; >45px the shadow's motion outshines the page — cart before horse |

## Known Pitfalls
- Phase offset set to 0 (or 180°) — both axes reach their extremes in sync, the composed trajectory degenerates into a **diagonal line**, reading as "the page rocking diagonally back and forth." The orbit's entire technical substance lives in that 90°.
- Amplitude at 10°+ — no longer a "micro-drift"; the page's side edges get excessive perspective difference, far-side text distorts, the card's positioning (invisible undercurrent) is fundamentally changed, and it becomes a degraded [tilt-3d-page](tilt-3d-page.md).
- Same period on both axes over a long stretch (30s+) — the trajectory closes exactly and repeats every loop; the audience recognizes the orbit by the third loop, reading as an electric turntable turning at constant speed. Long use must let the ellipse precess (`periodXRatio` 0.75~0.8).
- The reverse: using incommensurable periods where a seamless loop is needed (gallery thumbnails, loop footage) — the loop point jumps a frame. Short use needs same periods.
- Orbit period too short (<5s a loop) — reads as the page shaking; the audience gets dizzy. This isn't "more visible" — it's broken. To be more visible, add amplitude (within the 7° cap), don't speed up.
- `perspective` at 1400px+ — perspective too weak; a ±6° orbit shows almost no parallax and the motion is wasted. The orbit needs closer perspective than the facade cards do.
- Shadow not tracking, or tracking the same way — same-direction tracking is especially bad (shadow and page shifting the same way is physically impossible), reading as a sticker or clipping. It must be inverse.
- Forgetting `transform-style: preserve-3d` — `translateZ` stops working, the shadow flattens, and the `ampZ` breathing disappears too.
- Adding `Math.random()` noise to make it "more natural" — this library does no stop-motion jitter/boil (user finalization); and random numbers break seek consistency in Remotion. Naturalness comes from stacking three sines at different phases, not from noise.
- Using this card as an entrance — it has no entrance and no exit. Asset entrances go to media-pop-in, pose establishment goes to [tilt-3d-page](tilt-3d-page.md) (facade first, then hang this card as hold undercurrent — chaining the two is the recommended combo).

## Reuse Guide
- HTML/GSAP: `demos/orbit-drift/index.html`. To swap assets, replace the whole DOM inside `.page` (or a full-bleed `<img>`); the trajectory lives entirely in the top-level `CONFIG` (`orbit` / `baseRotY` / `baseRotX` / `ampRotY` / `ampRotX` / `phaseX` / `ampZ` / `phaseZ` / `shadowShift` / `cycles` / `periodXRatio`); perspective via `.world`'s `perspective`. The core lifts out: `CONFIG` + the seven lines of trigonometry in `apply()` + the single tween driving it. **Long use changes one number**: `periodXRatio: 0.78`.
- Remotion port: this card is **the best fit for Remotion of them all** — a pure function of `frame`, naturally seek-safe, zero state: `const t = frame / fps;` then `const ry = baseRotY + ampRotY * Math.sin(2*Math.PI * t/orbit);`, `const rx = baseRotX + ampRotX * Math.sin(2*Math.PI * (t/(orbit*ratio) + 0.25));`, `const z = ampZ * Math.sin(2*Math.PI * (t/orbit + 0.6));` — **no interpolate needed**. Wrap in outer `perspective: 900` + camera layer `transformStyle: 'preserve-3d'` + `transform: \`rotateY(${ry}deg) rotateX(${rx}deg) translateZ(${z}px)\``; shadow layer `transform: \`translateZ(-40px) translate(${-sy*20}px, ${sx*10}px)\``. This code is the 3D version of global system G3's idle micro-motion (see `template/motion-systems/`) and can merge wholesale into CameraRig as hold-period undercurrent.
- Editing-software equivalents: AE — hang expressions on a 3D layer's `Y Rotation` / `X Rotation`: `value + 6.2*Math.sin(time*2*Math.PI/9)` and `value + 3.4*Math.sin(time*2*Math.PI/6.8 + Math.PI/2)` (**note the `+ Math.PI/2` in the second — that's the 90° phase offset**), a third expression on `Position`'s Z; this is the standard AE expression pattern for "idle breathing," far more accurate than keyframes. JianYing/CapCut — no expressions; you can only approximate an ellipse manually with "3D rotation" keyframes (4~6 keyframes per loop, set to ease in/out), or use a "gentle shake" style preset (amplitudes are usually too big; tune down). Premiere — same approach keyframing `Basic 3D`'s `Swivel`/`Tilt`, or expressions (PR's expression capability is weaker than AE's).

## Scope
- Belongs to this card: **the elliptical orbit composed from two sine axes phase-offset by 90°** (`rotateY` ±3~7° / `rotateX` ±2~4°, `phaseX = 0.25` being the technical divide between "orbit vs. sway"); the stacked third layer of front-back breathing `z` (phase offset from both axes); **the inverse-tracking shadow** (page tilts one way, shadow shifts the other, density varying subtly with `z`); the three-layer structure (parent container's **close perspective** requirement of 800~1100px / camera layer `preserve-3d` / shadow layer `translateZ`); the positioning of "the whole thing is hold — no entrance, no exit, indefinitely sustainable"; the **period strategy** — same period on all three axes for short use/seamless loops (trajectory exactly closed), `periodXRatio` 0.75~0.8 for long use (>2 loops) letting the ellipse precess so the orbit isn't recognized; the discipline that "naturalness comes from multi-phase sine stacking, not random noise" (this library does no boil/stop-motion jitter).
- Does not belong to this card: the demo's grayscale wireframe app interface (sidebar / top bar / card list / detail panel with all its copy and values), the specific base pose values `-8°/2.5°` (`0/0` works equally), the shadow's blur radius and density, the asset's entrance animation, any captions or charts layered on the page.
- Migration interface: `orbit` sets one loop's duration (live 9~14s; longer is classier); `ampRotY/ampRotX` set amplitude (caps 7°/4°; validate readability at the "base + amplitude" worst pose); `phaseX` **locked at 0.25**; `periodXRatio` is the sole short-use/long-use switch; scale `ampZ`/`shadowShift` proportionally with the frame (this card is designed at 960 wide / 700px page width); scale `perspective` proportionally with the frame but keep it "close." When chaining with [tilt-3d-page](tilt-3d-page.md): the facade card establishes the pose, and this card's `baseRotY/baseRotX` picks up the facade card's ending pose for a seamless handoff.
- Background requirement: white works — this card is zero color, zero decoration, just three sine-driven transforms. Dark assets work equally; only the shadow needs swapping for a bright edge (same as [tilt-3d-page](tilt-3d-page.md)).
