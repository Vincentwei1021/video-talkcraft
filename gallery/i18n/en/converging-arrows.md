---
name: converging-arrows
title: Two hand-drawn arrows draw in from diagonal blank areas almost simultaneously toward a keyword (stagger of only 0.06s, shaft 0.26s + head 0.11s, tips stopping 16px short of the word so they never stab the text); the frame both tips land, the keyword switches to the accent color (color change only, no scaling), and the arrows hold on screen for 1.6s
usage: When the narration throws out "remember these 3 points" or "the key is right here" — moments that **pin the viewer to one word**; teaching, checklist, and methodology narrations; when you need stronger directionality than a hand-drawn circle (arrows have direction, circles don't); not suitable when the screen has multiple candidate words (twin arrows can only pinch one target)
---

## Intent
The difference between an arrow and a circle is **direction**. A circle says "just these few words"; an arrow says "look from here, toward that word" —
it carries an origin, so it can express "I'm pulling your gaze over". Two arrows arriving simultaneously from opposite diagonals add another layer of meaning:
**pinching**. The gaze is squeezed from two directions onto the word in the middle — the strongest directional emphasis device in the whole library.

Two vital constraints: ① **Arrows arrive first, the word changes after**. Only on the frame both arrow tips land does the keyword switch to the accent color.
Reversed (word moves first), it reads as "the word attracted the arrows" — the wrong agent; this card's semantics are
**the narrator pointing with arrows for you**, the cause lives in the arrows.
(**The keyword does no scaling** — finalized by the user on 2026-08-25: the arrows have already delivered the gaze;
having the text also pop bigger and smaller is a second motion competing with the arrows; the color change is the status confirmation, and it's enough.)
② **The arrow tips must keep clearance** (14~18px from the word). Stabbing into the text turns it into "strike-through/cross-out" — the semantics flip outright;
clearance is what makes it "pointing". This matters more than it looks: arrows that stab the text are the most common cheap mistake.

The third constraint isn't a vital one but is just as fatal: **the stagger between the two arrows is only 0.06s** (nearly simultaneous). Widen the stagger past 0.2s
and it reads as "two arrows flying in one after another" — that's two emphases; the simultaneity of "pinching" is gone.

## Motion Core
- **Arrow layer = a full-screen SVG laid over the text** (`viewBox="0 0 960 540"`, `pointer-events:none`),
  `fill:none` + `stroke-linecap/linejoin: round`
- **Coordinates bind to the keyword, never hardcoded**: tag the target DOM with `data-arrow="key"`, measure its box at runtime,
  and land the arrow tip **outside the box in the diagonal direction**, `tipGap / √2` away from it (vital constraint ②).
  Change the copy and the arrows follow automatically — they never stab the text and never point at nothing
- **Differences between the two arrows** (symmetric but not identical — two congruent arrows read as a mirrored graphic):

  | | Top-right arrow | Bottom-left arrow |
  |---|---|---|
  | Start time | +0 | +0.06s (nearly simultaneous) |
  | Aim angle | Keyword's top-right corner | Keyword's bottom-left corner |
  | Pen-start offset | (+176, −132) | (−124, +104) — shorter |
  | Shaft bow `bow` | +24 (bulges outward) | −20 (bulges the **opposite** way) |
  | Barb length/spread | 21px / 27° | 18px / 25° |

- **The shaft's curvature is the main source of the handmade feel**: along the chord from pen-start → tip, two control points (at 0.3 / 0.68) offset by `bow` along the chord's
  **normal**. A straight shaft reads as a UI leader line (a Figma connector), not a hand-drawn arrow
- **Thick at the pen-down, thin at the lift-off**: the shaft's single `d` is stroked in three layers (4.8 / 3.8 / 2.8px), each layer with
  `stroke-dasharray = [totalLength×frac, totalLength]` (frac = 0.16 / 0.46 / 1); all three layers' `dashoffset`
  driven by **one shared arc-length progress** (lockstep) — there is only one pen tip.
  The barbs use a single stroke width (they sit at the lift-off end and need no thickness variation)
- **Two-stroke order, shaft then head**: shaft `dashoffset` full length→0, 0.26s `power3.out`;
  the instant the shaft lands the barbs follow, 0.11s `power2.out`. **The two barbs differ slightly in length** (21 / 18.5px,
  spread 27° / −32°) — an arrow with equal symmetric barbs is a vector icon
- **Where vital constraint ① lands**: `allTipsAt = max(both arrows' shaft+head end times)` — the color changes only when both have landed.
  The keyword's `color` cuts from ink black to the accent color (0.1s linear, no gradient — the color change is a state switch, not a transition).
  **No scale** (user-finalized): the keyword stays at zero displacement and zero scaling throughout; color is the only changing channel
- **The keyword must start as plain black text**: the color change's power is the contrast against the first half-beat; starting in the accent color leaves no contrast
- **Layout is this card's precondition**: the arrows must draw in from diagonal **blank areas**, so the line above must be deliberately written short,
  leaving a runway in the upper right. This isn't motion — it's the layout you must cede to use this card
- **After drawing, hold clean and still**: no line boil / no stop-motion jitter (design-language.md §4)
- **Layering**: white stage → text (two lines, upper line in a dim solid) → arrow SVG layer → host placeholder (right 28%)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `tipGap` | 16px (14~18) | **This card's second vital constraint**; =0 the tip stabs into the text and reads as "strike-through/cross-out" (semantics reversed); >26px the pointing goes vague, reads as "the arrow points at this general area" |
| `arrows[1].at` | 0.06s | **Simultaneity**; =0 also works (even more "pinching"); >0.2s reads as two arrows flying in sequentially (two emphases, the pinch is gone) |
| `colorDur` | 0.1s | Keyword color-change duration; essentially a hard cut (the 0.1s with `ease: none` only exists to dodge a 1-frame pop); >0.3s becomes a color transition, reads as "the word slowly remembering it's important" |
| `bow` (+24 / −20) | Opposite directions | Shaft curvature; =0 is a straight line (UI leader line, instantly fake); same direction on both reads as two parallel arrows (not a pincer); \|bow\| >45 bends the shaft into a hook |
| `shaft` | 0.26s | Shaft draw time; <0.15s the arrow "flashes" in with no readable direction; >0.45s a single arrow reads like a progress bar |
| `headDur` | 0.11s | Barb draw time (a quick lift-off flick); >0.25s the head "arrives late" (shaft lands, head takes forever to grow) |
| `fromDX/DY` | (176,−132) / (−124,104) | Pen-start offset relative to the tip = arrow length and origin direction; equal lengths read as a mirrored graphic; shaft <90px reads as a small arrow icon, not "pointing from afar" |
| `headLen` / `headSpread` | 21 / 27° (barbs slightly unequal) | Barb length and spread; spread <18° reads as a thin spike (a needle, not an arrow), >40° reads as a V shape; perfectly equal symmetric barbs are instantly a vector icon |
| `tiers` (4.8/3.8/2.8) | frac 0.16/0.46/1 | The thinnest layer is the shaft's "base width"; <2px reads as a UI stroke, >6px a heavy shaft crushes the surrounding text |
| `startDelay` | 0.42s | Wait for the narration to reach "remember"; <0.2s the arrows arrive before the voice |
| `hold` | 1.6s | Final freeze; the arrows stay on screen so viewers can see exactly "these are the words being pinched" |

## Known Pitfalls
- Word moves first, arrows arrive after — this card's most fatal error. The causality is reversed, reading as "the word sucked the arrows in",
  while the card's semantics are the narrator pulling your gaze with arrows.
- **`gap` is the clearance from the arrow tip to the target's center, not to its edge** (field-tested pitfall, 2026-08-28):
  when the target is a full-line-wide phrase (hundreds of px), copying the demo's gap 16 makes the two collinear shafts plunge deep into the text —
  reading as a strike-through line. For wide targets compute the gap as "distance to exit the word box along the arrow direction + 8px breathing room"
  (word-box half-height / |normalized dirY component|), or simply move the target point to the word box's outer edge.
- Adding a punch scale to the keyword (the `scale 1.18→1` tier) — **deleted by user decision 2026-08-25**.
  The arrows have already delivered the gaze; having the text also "pop" is a second motion on the same beat, both fighting for attention;
  the color change is itself the confirmation — scaling is redundant.
- Arrow tips stabbing the text — the semantics flip from "pointing" to "crossing out". The most common cheap mistake.
- Stagger between the two arrows over 0.2s — reads as arrows flying in one after another (two emphases); the simultaneity of "pinching" is lost.
- Drawing the shaft as a straight line — instantly a Figma connector / UI leader line. A hand-drawn arrow's shaft always curves, and the two must curve opposite ways.
- Making the two arrows perfect mirror images (equal length, same bow, same barbs) — symmetric-but-unequal is what hand-drawn looks like;
  a perfect mirror reads as two halves of one vector graphic.
- Barbs of equal length and strict symmetry — the hallmark of a vector icon. A real arrow's two barbs are one long, one short, with slightly unequal spread.
- Using `<marker>` / `<polygon>` for the arrowhead — that's a geometric triangle (vector icon),
  and it can't participate in the "shaft first, head second" stroke order. The barbs must be two path strokes.
- Hardcoding the barb angles — the shaft is curved, so the tangent direction at its end is not the "start→tip" direction;
  barbs must be computed from the **shaft-end tangent** (`c2 → tip`), or the head will point askew.
- Tweening `stroke-width` for "thick pen-down, thin lift-off" — that thickens the whole shaft at once; pen pressure is distributed along the line.
- Each of the three stroke layers running its own tween — three pen tips overtaking each other. They must share one arc-length progress.
- Using this card without leaving a runway in the layout — the arrows will cross over other text, reading as "the arrow crossed out the previous line".
  This card requires clearing the two diagonal areas (the demo writes the previous line short precisely for this).
- The keyword starting in the accent color — the "pop" is the contrast against the first half-beat; without a plain first half there is no contrast.
- More than one candidate word on screen — twin arrows can pinch only one target. To call out multiple items, switch to `scribble-annotation`'s
  fan-arrows variant (whole group fades in + numbers pop in one by one).
- Adding line boil / stop-motion jitter after drawing — a finalized prohibition in this library (design-language.md §4).

## Reuse Guide
- HTML/GSAP: demos/converging-arrows/index.html. **Changing the keyword needs no coordinate edits**:
  add `data-arrow="key"` to the target element (tips are computed from its box; edit the copy and everything follows).
  Change the origin directions via `arrows[].corner` (pick two diagonals from `topRight`/`bottomLeft`/`topLeft`/`bottomRight`)
  + `fromDX/DY`; curvature via `bow` (the two must be opposite); rhythm via `shaft`/`headDur`/`arrows[1].at`;
  color via `color` (simultaneously the arrow color and the keyword's target color — one "look here" color per screen).
  Core logic = `CONFIG` + `boxOf()` + `arrowPaths()` + `inkStroke()` + the timeline inside `register`, liftable as a block.
  **Single-arrow version**: keep just one entry in `arrows` (semantics downgrade from "pinch" to "point", one energy tier lower — also very usable).
- Remotion port: pre-generate `d` with the same `arrowPaths()` outside the component (pure function, no randomness → frame-consistent).
  Hand-compute the three draw layers: layer k `strokeDasharray = [L·frac_k, L]`,
  `strokeDashoffset = max(0, L·frac_k − p·L)`,
  `p = interpolate(frame, [s, s+shaftF], [0,1], {easing: Easing.out(Easing.cubic), extrapolateLeft:"clamp", extrapolateRight:"clamp"})`;
  the barbs are the second segment (`[s+shaftF, s+shaftF+headF]`).
  The keyword has only one channel: switch `color` directly with `frame >= tipsF ? accent : ink`
  (do not interpolate the color, and **give it no scale**).
- Editing-software equivalents: AE = two shape layers, each with a pen-drawn **curved shaft** (two handles pulled into opposite bows) +
  Trim Paths End 0→100% (0.26s); barbs as a separate shape layer with a two-segment polyline path,
  in-point 8 frames after the shaft, Trim 0→100% over 3 frames; for pen pressure duplicate the shaft into three layers with different stroke widths +
  Dash set to 16%/46%/100% of the path length with keyframed Offset;
  the keyword hard-cuts its Fill color to the accent on the frame the tips land (**no scale keyframes**).
  JianYing/CapCut have no draw-on channel: from "Stickers → hand-drawn arrows" pick two **curved** ones (one bowing each way,
  choose a static jitter-free frame), approximate the draw direction with "wipe right/wipe left" entrances, offset the two starts by 2 frames;
  the keyword color change is faked by cutting to a same-position colored text layer on the frame the tips land (no entrance scaling).
- Division of labor with same-family cards: `scribble-annotation` = circle/line/arrow, three serial strokes annotating **positions inside an asset**
  (the context is "looking at this image together with you"; the arrow is just one of the strokes); `callout-line-label` = leader line + label
  (semantics: "naming this thing", with a text label); `hand-drawn-ellipse` = hand-drawn circle
  ("just these few words", no direction);
  **this card = two arrows pinching one word from opposite diagonals + the word changing color after** (the strongest directional emphasis card in the library;
  its split with `hand-drawn-ellipse` is exactly "directional vs non-directional" — use only one per screen).

## Scope
- Belongs to this card: the causal timing of **arrows first, word after** (`allTipsAt` = both arrows' shaft+head finished before the color change; the slower arrow determines the change moment); the **14~18px tip clearance** placement discipline (stabbing the text reverses the semantics); the **0.06s-only stagger** simultaneity (the entire source of the "pinch"); the shape requirement that the two arrows be **symmetric but not identical** (unequal lengths, opposite bows, slightly unequal barb lengths and spreads); shaft curvature achieved by offsetting control points along the chord normal by `bow` (a straight shaft is a UI leader line); the **shaft-then-head** two-stroke order with barbs computed from the **shaft-end tangent** (guaranteeing they always face the target); the `dashoffset` full-length→0 draw-on (shaft 0.26s `power3.out`, barbs 0.11s `power2.out`, with speed variation at start and end); "thick pen-down, thin lift-off" via **multiple stroke layers sharing one arc-length pen tip** (shaft in three layers 4.8/3.8/2.8px, frac 0.16/0.46/1; barbs single-width); the coordinate discipline of binding the tips to the keyword box's diagonal directions; the keyword's `color` **hard-cutting** to the accent on the frame the tips land (no color gradient), and the keyword **changing color only — no scale, no displacement** (user removed the punch on 2026-08-25); the keyword starting as plain black text (the first half of the contrast); the arrows staying on screen during the hold (no fade-out — they are the evidence of "pointing"); clean stillness after drawing — no line boil / stop-motion jitter; and the layering of the arrow SVG above the text with `pointer-events:none`.
- Does not belong to this card: the demo's specific copy (the two lines about "remember these 3 points"), the 32/40px two-tier font sizes and 400/600 weights, the upper line's dim-solid layout choice, the orange `#e8720c` value (same hue family as reference image ②; any accent works), the white stage, the right-side 28% host (digital human) placeholder, and exactly two arrows (the single-arrow version downgrades the semantics to "pointing" and works equally well). **But "the two diagonal areas must be cleared" is a precondition for using this card** — it isn't the motion itself, yet it is the layout constraint the motion needs; carry it along when reusing.
- Migration interfaces: `color` is the sole color entry (arrow color = keyword target color); `tipGap`, `fromDX/DY`, `headLen`, and the three stroke widths in `tiers` **scale proportionally** with the frame (values at 960 wide ×2 for 1080p), `bow` scales with `fromDX/DY` (curvature is relative to chord length), `headSpread` is an angle constant and does not scale; rhythm — `shaft`/`headDur`/`arrows[1].at`/`startDelay`/`hold` — is frame-independent and follows only the speech pace; to change origin directions edit `corner` + `fromDX/DY` (any two opposite corners of the four; two arrows on the same side read as parallel arrows and don't work); to move the keyword just change `data-arrow`; when the target isn't DOM (text inside video/image footage) replace `boxOf()` with a hand-filled rectangle — `arrowPaths()` needs no change. For vertical formats use `topRight` + `bottomLeft` with larger `fromDY` and smaller `fromDX` (a vertical frame's blank space runs top-to-bottom).
- Background requirements: white works (marker orange on white is this card's native context). On dark backgrounds swap `color` for a high-luminance value (`#ff9f45` tier) and raise the thinnest layer `tiers[2].w` from 2.8 to 3.6 — dark backgrounds eat the visual weight of thin lines, and a 2.8px lift-off end will break up on dark. **The background must not have high-frequency detail** — arrows are thin-line elements; on busy live-action backgrounds the pointing becomes illegible (either lay a semi-transparent backing plate first, or add a white outline layer).
