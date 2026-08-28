---
name: evidence-scroll-tour
title: A long screenshot page taller than the screen scrolls upward at steady speed (about 10% of page height/s) as the frame's sole moving element, with pre-drawn red boxes/highlights riding along; approaching the key item it decelerates early, holds 1~2s, then scrolls out — the scroll speed is the narration's pacing
usage: When the narration presents long-page evidence — documents/agreements/READMEs/search results — and needs "let's read through from the top; the key is this one clause"; the calm evidence-laying tone of finance breakdowns, review comparisons, and event timelines
---

## Intent
When narration reads through long documentary evidence, cutting between cropped screenshots breaks the continuity of "this is the same document" — stretching the whole page into a long scroll the viewer watches roll by lets them see the full context with their own eyes, with the key point being something the scroll "passes by" and stops to look at; the credibility far exceeds jump cuts. Vital constraints:
**the page is the sole moving element** (annotations are pre-drawn and ride the page — never drawn live; live drawing splits the gaze and the "touring" feel of the scroll is gone),
**steady speed + deceleration and dwell at the key point** (scroll speed aligns to the telling: the steady stretch is setup pacing, the dwell is "look at this clause"),
**the dwell must be kept alive** (during the 1~2s stop the target annotation breathes continuously — not random jitter, and not a frozen frame).

## Motion Core
- A long page (a 2.5~4-screen-tall document/README/search-results screenshot) sits in a fixed viewport (optionally with a minimal window chrome signaling "this is a document"); the page's `y` is the card's only continuously animated property
- Scroll start: `power2.in` ease-in of about 0.5s into the steady speed (avoiding full speed at frame 0, which reads like a seek)
- Steady stretch: `ease: none`, speed about 10% of page height/s (130px/s in the 960×540 demo; converting to any size, the criterion is "viewers can skim the subheadings")
- Pre-placed annotations: red boxes/underlines/color blocks drawn directly on page elements (`position:relative` wrapper + absolutely positioned boxes), riding the scroll, with no entrance animation of their own
- Decelerated dwell: about 90px before the stop point (roughly 1s) decelerate with `power2.out`, letting the target item settle near the **viewport's vertical midline**; hold 1~2s aligned to the line "the key is this clause"
- Keeping the dwell alive: the target red box does one complete breath, scale 1→1.03→1 (`sine.inOut`, yoyo, duration ≈ the dwell), continuous easing with no jitter
- Restart: `power2.in` about 0.6s back up to steady speed, scrolling the remaining page and settling naturally at the page's end
- Variant ① (2.5D tilt): wrap the viewport in `perspective` + `rotateX 30~45°` — the page lies as if on a desk skimmed by the camera; the scroll logic is unchanged
- Variant ② (cursor companion): overlay a cursor asset that moves to the target item during the dwell, its pointing synced to the line; the cursor appears only during the dwell

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `scrollSpeed` | 130px/s (≈10% page height/s) | Faster feels like skipping past the evidence — viewers can't read subheadings; <70px/s the setup stretch drags and viewers finish reading ahead of the telling |
| `stopHold` | 1.5s | Dwell length aligned to the line; <0.8s viewers haven't focused yet, >2.5s it's time for the next card |
| `stopAlign` | 0.5 (viewport midline) | Where the target item settles; >0.7 sinks to the bottom as if it never stopped, <0.3 pressed against the window chrome, oppressive |
| `decelDist` | 90px | Deceleration lead distance; too short reads as slamming brakes (programmatic seek feel), too long viewers see the stop coming and the suspense is gone |
| `accelDist` | 45px | Acceleration distance at start/restart; 0 hits full speed instantly, reading as a jump |
| `breathScale` | 1.03 | Red-box breathing amplitude during the dwell; >1.06 looks like an alarm flashing, 1.0 is a frozen frame — the picture dies |

## Known Pitfalls
- Drawing the red box/underline live during the dwell — that's scribble-annotation's job; this card's annotations must be pre-placed and ride the page; live drawing steals the "page is the sole moving element" touring feel.
- Slamming to a stop from steady speed, or snapping to full speed after the dwell — a velocity step reads as programmatic seeking, not "a person dragging the page and stopping at the key point".
- The 1~2s dwell fully frozen — the picture dies and viewers assume a stall; keep it alive with the annotation's continuous breath, never random jitter.
- Scroll speed wavering or with hand-shake noise — the viewer is mid-skim; speed noise directly induces motion sickness.
- A page under 2 screens tall — no "long-scroll tour" sense of information volume; showing the whole page at once (media-pop-in) is more honest.
- The key item stopping at the viewport's edge — viewers don't know which line to look at; the dwell is wasted.

## Reuse Guide
- HTML/GSAP: demos/evidence-scroll-tour/index.html. Change the evidence via the content of `.doc-page` (the red-box stop point is `#stop-box`, movable onto any sentence — the stop position is measured at runtime); annotation color via `.mark-box`'s `border-color`; rhythm all in the top-level `CONFIG` (`scrollSpeed` / `stopHold` / `stopAlign` / `decelDist` / `accelDist` / `breathScale`). For multiple stop points, chain copies of the "decelerate → breathe → accelerate" triplet.
- Remotion port: break the position-time curve into a piecewise `interpolate(frame, [t0,t1,t2,t3,t4,t5]*fps, [0, -accelDist, -(stopY-decelDist), -stopY, -stopY, -(stopY+accelDist), -total])` with per-segment easings `Easing.in(Easing.quad)` / linear / `Easing.out(Easing.quad)` / constant (hold) / `Easing.in(Easing.quad)` / linear; segment durations from `distance/scrollSpeed` (accel/decel segments `2*dist/v`); the breath maps a single `Math.sin` cycle to scale inside the hold range.
- Editing-software equivalents: JianYing — import the long screenshot and keyframe "position": two linear points for the steady stretch, one extra keyframe on each side of the stop with right-click "ease out" at the deceleration point / "ease in" at the restart; AE — Position keyframes + Easy Ease on both sides of the stop (pull the stop's speed to 0 in the speed graph), red-box breathing via the scale expression `1+0.03*Math.sin(...)`; CapCut — same keyframe approach as JianYing.

## Scope
- Belongs to this card: the long page's steady upward `y` scroll (≈10% page height/s, ease none) and its complete velocity curve "eased start → steady → early deceleration (power2.out) → 1~2s dwell → accelerated restart (power2.in) → scroll out"; the target annotation's single continuous breath during the dwell (scale 1→1.03→1, sine.inOut); the principle of "annotations pre-placed and riding the scroll, never drawn live". One velocity curve + one keep-alive breath is this card's entirety.
- Does not belong to this card: the page's content and layout (the demo's fake agreement document, grayscale placeholder bars), the window chrome style, subtitle copy and cuts, the corner-badge host; the red box's draw-on entrance (live drawing belongs to scribble-annotation); the 2.5D tilt pose and the cursor asset itself (the variants define interfaces only; assets are supplied separately).
- Migration interfaces: `scrollSpeed` aligns to the telling's pace (convert by page-height ratio when resizing); a stop point = any in-page element (offset measured at runtime; content freely swappable); multiple stop points chain the "decelerate → breathe → accelerate" triplet; the annotation color is a single semantic color token (switch to a high-contrast color on dark screenshots); the 2.5D variant only adds perspective/rotateX to the viewport wrapper — the velocity curve reuses as-is.
- Background requirements: white works (the long page itself is usually a light document; dark terminal/IDE screenshots work equally — just change the annotation color to preserve contrast).
