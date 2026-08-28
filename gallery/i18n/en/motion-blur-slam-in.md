---
name: motion-blur-slam-in
title: A card built to pair with the digital host — the asset card flies in at high speed with horizontal motion blur from off-screen beside the presenter, slams to a stop within 0.2s, the blur amount tracking velocity from heavy to clear and zeroing on the frame it stops, then overshoots 2~3px and settles back
usage: The "throw it right in your face" moments when the narration hits a punchline (data cards, product screenshots, comparison charts); sharp, aggressive high-energy segments; AI tool roundups, hot-take breakdowns, hard-hitting opinion pieces
---

## Intent
**2026-08-26 user finalization: this card is designed to pair with the digital host** (the original demo was a split-screen
"control-group plain fade vs. this card's slam-in" teaching version). This card's real use is slamming an asset on screen the moment the narration hits a punchline —
what the audience watches is "a person talking + an asset smashing in beside them"; the split-screen comparison was for teaching, not what it looks like in a film.
The half-screen that held the control group is exactly where the presenter should stand — so the person occupies the left 46%, and the asset whips in from outside the clean white area on the right.

Both are "pressing an asset onto the screen," but bounce entry (media-pop-in) is a "slap" onto the table, with handcraft and playfulness;
slam-in is a "wham" right up in your face, with speed and pressure. Use it when the narration hits a punchline and you want the audience to shut up and look at the picture instantly.
Three critical rules: **the blur must have direction** (isotropic `blur()` reads as defocus, not speed),
**blur amount follows velocity and must zero on the frame it stops** (still blurred when stopped = a render-not-finished bug feel),
**the stop must be a true slam** (power4/expo.out hard deceleration; power2.out reads as "sliding in" and the attitude instantly goes soft).

## Motion Core
- Elements: asset card (screenshot/data card), with one light drop shadow separating it from the white background (the shadow makes the streak more readable, but the shadow itself is not this card's motion)
- **Fly-in direction must face away from the presenter**: person on the left ⇒ asset enters from the outer right. Flying toward the person would cross over their body,
  and the asset zone's `overflow: hidden` would clip off the half that crosses the boundary
- Displacement: flies in along a single straight line from off-stage, travel ≥ half a screen (560px class), 0.2s, `power4.out` — fast launch + hard deceleration = slam-stop feel
- Directional blur: SVG `feGaussianBlur stdDeviation="σ 0"` (horizontal-only blur = has direction), σ driven by **velocity**:
  `σ = blurMax * (1 - p)^0.75` (p is the **already-eased** progress of the displacement; the exponent 0.75 is power4.out's velocity decay law) —
  one tween drives both displacement and blur, naturally aligned, so "still blurred when stopped" cannot occur
- Landing overshoot: overshoot the fly-in endpoint by 2~3px (along the direction of motion), then settle back over 0.1s `power2.out` — a frame-level "hit-the-wall" rebound, not a big back.out bounce
- Multi-card bursts: same direction, 0.3~0.5s apart, later cards higher in the stack and covering a corner (20~30%) of the earlier ones; directions must be uniform to read as "stacks slamming in one after another"
- Layers: base UI/presenter < earlier cards < later cards; the blur filter hangs only on the card itself, never blur the background along with it

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `fromX` | 560px (≥ half screen) | Off-screen starting distance = velocity accumulation; <200px feels like "it shifted a bit" and the blur has nowhere to happen; too large and the first few frames are entirely off-screen, visually equivalent to appearing from nowhere |
| `slam` | 0.2s | 0.15~0.25 is the "whip" window; >0.35s becomes a translating slide-in and the sharpness disappears; <0.12s the audience only sees the result, not the process |
| `slamEase` | `power4.out` | The life of the slam stop; `expo.out` is fiercer, `power2.out` reads as a slide-in, `linear` reads as a program dragging the element |
| `blurMax` | 18 (for a 240~300px-wide card) | Starting horizontal σ; the visual streak is roughly 2~3σ; >25 blurs into a cloud where you can't tell what the asset is, <8 is as good as no blur |
| `blurFalloff` | 0.75 | Exponent of blur decay with velocity; smaller (0.4) drags the blur longer and harder but risks "still blurred when stopped," larger (1.5) makes the blur flash for barely one frame |
| `overshoot` | 3px | Landing overshoot; 0 makes the ending dead, >8px turns it into a bounce entry (that's media-pop-in's attitude) |
| `settle` | 0.1s | Time to settle back from the overshoot; >0.2s the settle reads as a second movement and the "hit-the-wall in one frame" crispness is gone |
| `burst` | 0.4s | Multi-card burst interval; <0.2s the audience can't count how many cards, >0.6s it breaks into two independent events |

## Known Pitfalls
- Using `filter: blur(Npx)` overall — isotropic blur instantly reads as defocus/depth of field, conveys no motion direction at all, wasted effort.
- Blur not zeroed on the frame it stops (or σ>0 hanging on the whole time) — a static image still trailing a streak reads as a dirty, unfinished render frame.
- Easing with `power2.out` or constant speed — becomes "the asset slides in by translation," same class as cheap template transitions; the slam must be power4/expo-grade hard deceleration.
- Overshoot at 8px+ or using `back.out(1.7)` — the attitude flips back to bounce entry, and this card becomes indistinguishable from media-pop-in.
- Multiple cards each flying their own direction (one from the left, one from the top) — reads as "some entrance effects slapped on at random"; same-direction bursts are what give the "stacks slamming in" momentum.
- Blurring the background/presenter along with the card — becomes a full-screen motion-blur transition and the asset loses its starring role.
- Fly-in distance of only one or two hundred px — no velocity accumulation, the blur has nowhere to happen, and it ends up just a displaced fade-in.

## Reuse Guide
- HTML/GSAP: demos/motion-blur-slam-in/index.html. Directional blur = one `feGaussianBlur stdDeviation="σ 0"` filter per card in `<defs>` (the card points to it via `data-mb="mbA"`); `setSigma()` writes σ and unsets `filter` to `none` when σ→0; rhythm and feel all live in the top-level `CONFIG` (`fromX`/`slam`/`slamEase`/`blurMax`/`blurFalloff`/`overshoot`/`settle`/`burst`). To swap assets, replace the whole interior of `.shot` with an `<img>`; to change direction, swap `fromX` to the y channel and write σ as `"0 σ"` (vertical slam-in).
- Remotion port: `const p = interpolate(frame, [f0, f0 + slamF], [0, 1], {easing: Easing.out(Easing.poly(4)), extrapolateRight: 'clamp'})`, displacement `translateX(${fromX * (1 - p) - overshoot * p}px)`, blur `σ = blurMax * Math.pow(1 - p, 0.75)` written into the same composition's `<svg><filter>` as `stdDeviation={`${σ} 0`}` (or a `filter: url(#mb)` style); the overshoot settle is a separate `interpolate(frame, [f0+slamF, f0+slamF+settleF], [-overshoot, 0], {easing: Easing.out(Easing.quad)})`. Multi-card is just `f0 = start + i * burstF`. When σ reaches 0, clear style.filter to avoid running a useless filter every frame.
- Editing-software equivalents: JianYing — "entrance animation → whip in / slide left" shrunk to 6~7 frames, then layer a "motion blur / streak" effect (or duplicate two layers at reduced opacity for afterimages); AE — position keyframes + Easy Ease with the curve pulled into a hard stop, layer Motion Blur on (or ReelSmart/CC Force Motion Blur / Directional Blur keyframes); CapCut — "Slide in" + Motion Blur effect with a wide shutter angle.

## Scope
- Belongs to this card: the card flying in along a single straight line from off-screen (travel ≥ half screen, 0.15~0.25s, power4.out hard-deceleration slam stop); **directional** blur σ driven by the displacement's already-eased progress `σ = blurMax * (1 - p)^0.75` and zeroed on the frame it stops; 2~3px same-direction landing overshoot + 0.1s power2.out settle; multi-card same-direction bursts at 0.3~0.5s intervals with the "later cards cover a corner of earlier ones" stacking.
- Does not belong to this card: the demo's grayscale mock-screenshot content and layout, the card's specific landing coordinates and size, the shadow and border styles (the shadow is just a demo choice that makes the streak more readable), the digital-host placeholder and the "person left 46% / asset zone right 54%" layout ratio (**but the "pairs with a digital host" context does belong to this card** — see the Intent section).
- Migration interface: scale `fromX` proportionally with output width (keep "≥ half screen," and the direction must face away from the presenter's side), scale `blurMax` proportionally with card width (18 for a 240~300px card; double the size, double σ); changing fly-in direction = swapping the displacement channel + writing σ onto the corresponding axis (`"0 σ"` for vertical); scale `slam`/`burst` with narration pace, and when scaling, `slam` and `settle` must scale at the same ratio or the crispness changes; colors/fonts/shadows are all swappable — the motion depends on no color.
- Background requirement: white works. The only constraint is the filter must set `color-interpolation-filters="sRGB"`, otherwise the default linearRGB produces grayish dirty edges on the blur against white; dark backgrounds work equally (streaks are more visible on dark, so consider lowering `blurMax` by 20%).
