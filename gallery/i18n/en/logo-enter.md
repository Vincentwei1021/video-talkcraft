---
name: logo-enter
title: The brand roundel springs into place from 0.5× (the only overshooting beat); 0.233s later the wordmark pushes out from the roundel's side, the tagline follows one more beat behind, while a stroked ring closes around the roundel — a three-beat close, and the settled frame is the final frame
usage: Identity statements at the opening ("I am…") and brand close-outs at the end; the fixed opener/closer of a video series; the formal nameplate of a product or institution. Once each per video (once at the start, once at the end)
---

## Intent
The ending is the beat most easily made tacky in a whole video: logo spinning in, light sweep, particle burst — viewers have seen them ten thousand times,
and they all steal the scene (the ending's job is "curtain down", not "one more climax").

remocn's `logo-enter` takes a restrained approach: one spring drives three things at once
(`opacity 0→1` / `scale 0.5→1` / `y 22px→0`), damping 13 / stiffness 130 / mass 0.8,
settling in about 0.60s with only 4% overshoot. No rotation, no glow, no second axis of motion.
This card ports its skeleton (the spring feel + the 0.233s beat spacing) and swaps the source's "row of sibling roundels staggering in"
for the standard narration-video closer arrangement: **roundel → wordmark → ring closing**, three beats.

Three critical rules:
① **Only the first beat overshoots** — the roundel is the sole elastic element (`back.out(1.1)` ≈ the spring's 4% overshoot).
The wordmark and the ring are pure ease-outs. Give the type a bounce too and two elastic elements fight each other — the closer turns into an opener;
② **Beat spacing 0.233s (source stagger: 7 frames)** — the three beats can't be simultaneous (reads as one flat image fading in),
nor stretched past 0.5s (reads as three unrelated events in sequence). 0.2~0.25s is the distance of "three parts of one event";
③ **The settled frame is the final frame — no idle micro-motion** — a closing frame should stop. This is one of the few places in the whole library that explicitly says **no**
breathing/drift (hold-phase micro-motion exists to keep frames from dying, but the ending's "death" is exactly the effect it wants).

One white-background adaptation: the source roundel is `border: 5px solid #fff` + `boxShadow 0 20px 48px rgba(0,0,0,0.5)`
(luminance layering on a dark base). On white, the white ring disappears and that heavy shadow smears into a dirty blotch —
switch to a light gray ring `#ececef` + a light shadow `0 10px 26px rgba(0,0,0,0.10)`.

## Motion Core
- **Beat ① · Roundel springs in** (from `lead = 0.35s`): three things on one curve —
  `opacity 0→1`, `scale 0.5→1`, `y 22px→0`, 0.60s, `back.out(1.1)`.
  Three properties sharing one curve is the source's formulation (one spring value driving all three);
  giving them separate easings scatters "springing into place" into three events
  - **Spring → GSAP conversion**: the source's `spring({damping:13, stiffness:130, mass:0.8})` @30fps
    ≈ settles in 18 frames (0.60s), peak overshoot about +4%. GSAP core has no spring; `back.out(1.1)`'s overshoot matches.
    `back.out(1.7)` (this library's `media-pop-in` value) overshoots ~10%, which in a closing context reads as variety-show energy
- **Beat ② · Wordmark pushes out** (`lead + 0.233s`): brand name `opacity 0→1` + `x −20px→0`, 0.45s, `power3.out`;
  the tagline follows one more beat later (`lead + 0.466s`) with identical parameters.
  The travel direction is "pushed out from the roundel's side" (roundel on the left → type pushes rightward), reading as the type being carried out by the roundel
  - Two weight tiers (brand name 800 / tagline 500) + wide tracking on the tagline — that is typography, not motion, but the stagger's **order** is motion:
    the heavy comes first, the light arrives after
- **Beat ③ · Ring closes** (`lead + 0.233s`, starting with the wordmark): a 2px hairline runs the roundel's rim via
  `stroke-dashoffset` from full length to 0, 0.70s, `power2.inOut` (fast attack, then the closing moment brakes to a stop;
  constant rate reads as a loading spinner). The stroke starts at 12 o'clock (`rotate(-90deg)`)
  - **`dasharray` = circumference + 3px**: exactly the circumference leaves a sub-pixel white seam at the start point, plainly visible at 1080p
  - The ring **starts with the wordmark, finishes slower** (0.70s vs 0.45s) — it is the line that "seals" the three beats;
    the last thing to settle should be it
- **Layering**: white base → roundel (fill + gray ring + light shadow) → logo mark (52% of the roundel, the source ratio) → stroked ring (absolutely positioned over the roundel) → wordmark (sibling, flex right)
- **Things not done**: no rotation, no glow, no particles, no separate entrance for the logo mark (the logo springs with the roundel —
  it is not an independent subject), no breathing after settling

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `lead` | 0.35s | Lead-in hold until the narration reaches "I am…"; 0 feels like an autoplaying intro, >1s viewers think it froze |
| `badgeDur` | 0.60s | Roundel spring-in (= the spring's settle time); <0.35s reads as a popup, >0.9s the elasticity stretches into slow enlargement |
| `badgeFrom` | 0.5 | Starting scale (source value); above 0.8 the travel is too short to read as a spring, <0.3 reads as flying in from afar (that's an opener, not a closer) |
| `badgeRise` | 22px | Starting drop (source value); 0 = pure scaling (loses a layer of "landing"), >50px reads as flying in from off-frame |
| `badgeEase` | `back.out(1.1)` | ~4% overshoot, matching the source spring(13/130/0.8); `back.out(1.7)` at 10% reads variety-show, `power3.out` with no overshoot leaves the close "soft" |
| `stagger` | 0.233s | Beat spacing (source: 7 frames); 0 = all three beats at once (reads as one flat image fading in), >0.5s reads as three unrelated events |
| `wordDur` | 0.45s | Wordmark push-out; faster than the roundel is correct (a follower should never be slower than the subject) |
| `wordShift` | 20px | Wordmark's horizontal push distance; 0 = pure fade (loses the "carried out" relationship), >50px reads as type sliding in from off-frame, unrelated to the roundel |
| `ringDur` | 0.70s | Ring closing; it must be **slower than the wordmark** (it's the sealing line, the last to settle); <0.4s reads as a loading spinner |
| `hold` | 1.30s | Closing freeze; at the video's end it can stretch to 2~3s (under the music tail), **with zero micro-motion throughout** |

## Known Pitfalls
- Giving the wordmark a `back.out` bounce too — two elastic elements fight, and the closer becomes an opener; the overshoot belongs to the roundel alone.
- All three beats at once (`stagger` at 0) — reads as a pre-baked logo image fading in; the arrangement was for nothing.
- Constant-rate ring (`ease:none`) — reads as a loading progress circle; viewers think something is loading; the closing moment must decelerate to a stop.
- The ring settling before the wordmark — the sealing line is gone first and the type settles last; the three beats' sense of closure scatters.
- `dasharray` exactly equal to the circumference — a sub-pixel white seam at the stroke's start, plainly visible at 1080p (this demo hit it); give circumference + 3px.
- Copying the source's white ring + `rgba(0,0,0,0.5)` heavy shadow onto white — the ring disappears and the shadow smears into a dirty blotch; use light gray ring + light shadow.
- Giving the logo mark its own entrance (the logo scaling/stroking again on its own) — it is not an independent subject and springs with the roundel; moving separately reads as two logos.
- Adding breathing/drift after settling — the ending's "stop" is its effect; adding motion makes it "not over yet". This is one of the library's few no-idle spots.
- Adding rotation/glow/particles — all three are the tackiest closer moves, and all steal the scene (the ending's job is curtain-down).
- The logo mark filling the roundel — the source's 52% is a whitespace ratio; filled up, the roundel reads as a button rather than a badge base.
- Using it 3+ times per video — it is an identity mark; once at the start and once at the end suffices; recurring in the middle reads as a watermark.

## Reuse Guide
- HTML/GSAP: demos/logo-enter/index.html. **Swap in your own logo**: replace the whole
  `<svg viewBox="0 0 100 100">…</svg>` block inside `.badge` (the demo uses a grayscale geometric placeholder mark: triangle + cut circle).
  Brand copy edits the `.brand` / `.tag` lines; all pacing is in the top-level `CONFIG`.
  The three beats are independent — no ring wanted, delete beat ③ (the `ring` block); no tagline, delete the `tag` tween.
- Remotion port: source `registry/remocn/logo-enter/index.tsx`. Its core is directly usable —
  `spring({fps, frame: frame*speed − i*stagger, config:{damping:13, stiffness:130, mass:0.8}})`,
  one value driving `opacity: s` / `scale: interpolate(s,[0,1],[0.5,1])` / `offset: interpolate(s,[0,1],[22,0])`.
  Seconds↔frames (30fps): hold 0.35s = 10.5 frames, roundel 0.60s = 18 frames (the spring settles naturally, no duration needed),
  beat spacing 0.233s = 7 frames, wordmark 0.45s = 13.5 frames, ring 0.70s = 21 frames.
  **Three library adaptations**: ring color `#fff → #ececef`, shadow `rgba(0,0,0,0.5) → rgba(0,0,0,0.10)`,
  and skip the source's `logos[]` multi-badge overlap (`overlap 38`) — this card is one badge + wordmark.
  The ring on the Remotion side is `strokeDasharray={len} strokeDashoffset={interpolate(frame,[a,b],[len,0])}`.
- Editing-software equivalents: JianYing/CapCut — the logo asset gets the "bounce in" entrance (scale + position, rebound dialed to the weakest tier),
  the wordmark on its own layer with "slide in right", the ring via a circle sticker's "stroke growth" or a stock ring MG clip;
  AE — hang the same `Overshoot` expression on the logo layer's Scale/Position/Opacity keys
  (or a spring from RubberHose/Motion plugins), the ring via Shape Layer + `Trim Paths` End keyframes,
  beats placed 7 frames apart. **Don't use** CC Light Sweep / Shine-style sweeps (this library's design-defaults ban glow).
- Division of labor with the rest of the family: `media-pop-in` / `motion-blur-slam-in` are **evidence footage** entrances (tilted, stacked, dense,
  stressing "slapped on one after another"); this card is the **identity mark's** entrance (upright, single, coming to rest, stressing "this is who").
  Their overshoots differing by 2× is no accident — slapping evidence wants 10%, planting a brand wants 4%.

## Scope
- Belongs to this card: the formulation of one spring value driving `opacity/scale/y` together (and its `back.out(1.1)` ≈ 4% overshoot conversion); the travel amounts of `0.5 → 1` scale + `22px → 0` drop; the three-beat arrangement at 0.233s spacing (roundel → wordmark → ring) with the "heavy first, light after" order; the discipline that **only the first beat overshoots**; the wordmark's 20px lateral push from the roundel's side expressing the "carried out" relationship; the ring's `dashoffset` full-length→0, `power2.inOut`, finishing slower than the wordmark (the last to settle); the `dasharray` = circumference + 3px seam treatment; the logo's 52% whitespace ratio within the roundel; the trade-off that **the settled frame is the final frame, with no idle micro-motion**; the white-background adaptations of ring color and shadow.
- Not part of this card: the demo's grayscale geometric placeholder mark (**replace with your own logo in application**), the sample brand name "Zhiyuan Institute" and its tagline, the 118px roundel and 46/17px type sizes, the specific values of roundel fill `#f5f5f7` and ring `#ececef`, the logo-left/type-right arrangement (mirroring works too), the `gap: 26px` spacing.
- Portability interface: swap the logo via the SVG inside `.badge` (or an `<img>`, keeping the 52% ratio); resize the roundel via `.badge`'s `width/height` (the `.ring` must sync at +10px and the `viewBox` recomputed); `badgeRise` / `wordShift` are **feel constants — don't scale them with the canvas** (they are magnitudes of "landing", not of the camera); `stagger` / `badgeEase` / the three-beat order must not change (they are the whole card); to lengthen the ending, change only `hold`. Vertical video stacks the lockup (`flex-direction: column`) and switches the wordmark's push direction to vertical accordingly.
- Background requirements: white/light is fine (the roundel layers via light gray ring + light shadow; ring stroke and type are dark). On dark, revert to the source's approach — white ring, shadow deepened to `rgba(0,0,0,0.5)`, ring stroke and type in light colors; every timing parameter unchanged.
