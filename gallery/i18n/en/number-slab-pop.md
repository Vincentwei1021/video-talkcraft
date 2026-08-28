---
name: number-slab-pop
title: A solid slab first drops into place from above in 0.24s (the number is not yet present), then once the slab settles a huge integer pops out in one shot scale 0.72→1 (back.out 1.7), the decimal and unit fade in separately 6 frames later, and the caption line finally fades in rising 6px
usage: When the narration drops a conclusion number ("23.6% — that's last year's growth", "just 3 steps"); hook numbers, cover numbers, and single-point conclusions within a chapter that must stand up in one sentence; not for numbers that need to show "how they were computed" (use number-counter / metric-with-sparkline for that)
---

## Intent
A number in narration serves one of two roles: **process** or **conclusion**.

`number-counter` does process — reels turning, comma groups flipping, the audience watching it climb; those 1.3 seconds of "computing" are themselves the content
("the money burned away bit by bit"). `metric-with-sparkline` is also process (a 0.9s roll of 0→67 + a trend line drawn at the same instant).
The cost of process feel is that **the audience must wait**: while the number is moving, the conclusion hasn't landed yet.

This card is **conclusion feel**: the number gives no process — one pop and it's in place. Use it when the narration has finished the sentence
and now needs a "nail" to pin that sentence onto the screen — the audience doesn't need to see where it came from, only that it **stands**.
That's also why it works for cover numbers and hook numbers: within 0.3 seconds there's something repeatable on screen.

Two critical rules:
① **The slab and the number must not enter together**. Entering together is one big PNG flying in — the audience reads "an image was pasted on,"
and the number loses its status as the subject. **The slab lands first (0.24s), and only on the frame it settles does the number start popping**.
Those 0.24s of empty slab on screen are meaningful: it's the announcement that "the spot is claimed, the content is about to arrive."
② **The decimal fades in separately, delayed**. "23" stands first; ".6" is a precision supplement — this sequencing communicates
"the number is roughly 23, precisely 23.6," matching how people naturally report numbers. Popping "23.6" out all at once isn't wrong,
but it loses the "integer is the trunk, decimal is the detail" hierarchy and reads as one longer digit string.

## Motion Core
- **Layers** (bottom to top): white stage → solid slab (`display: inline-block`, corner radius 28px = design-language
  §3's card tier, padding 26/40/30) → number row (`display:flex; align-items:baseline`,
  `white-space: nowrap` + `font-variant-numeric: tabular-nums`, white text at 600) →
  caption line (outside the slab, 22px below, gray 20px). The host placeholder occupies the right 34%; the slab is left-aligned at 108px.
  **The slab's width is stretched by the number** (`inline-block` + padding), never hard-coded — swapping in a number with a different digit count adapts automatically.
- **① Slab lands first**: from `t = 0.30`, `opacity 0→1` + `y −20→0` + `scale 0.94→1`,
  0.24s `power3.out`, `transform-origin: 50% 50%`.
  Dropping from **above** (not rising from below) — "dropping" has weight, "rising" has lightness, and a conclusion number needs weight.
- **② Number pops**: `numAt = 0.30 + 0.24 = 0.54` (= the frame the slab settles),
  the whole row `opacity 0→1` + `scale 0.72→1`, 0.28s `back.out(1.7)`,
  `transform-origin: 50% 60%` (center of gravity slightly low: the type doesn't float upward while popping).
  **`back.out` is a restricted easing in this library** (design-language §4: only for exaggerated bounces) —
  this is one of the places it's justified: a one-shot "conclusion landing" wants exactly that bit of overshoot;
  the rebound of 1.7 is bouncier than `bar-chart-growth`'s chip (1.4, a seal stamp) but still far from cartoon bounce (≥2.2).
- **②b Decimal + unit delayed**: from `numAt + 0.20` (≈6 frames @30fps), `opacity 0→1` 0.18s `power2.out`.
  **They occupy their space from the start** (only `opacity` animates, never `display`) — otherwise the row width changes on the fade-in frame
  and the integer gets nudged sideways (this card's most hidden pitfall).
- **③ Caption line**: `capAt = numAt + 0.20 + 0.18 = 0.92`, `opacity 0→1` + `y +6→0`,
  0.24s `power2.out`. It sits **outside the slab** — the caption is an annotation, not the slab's content.
- **④ hold 1.8s**: complete stillness.
- **Single semantic color `#0066cc` (accent blue)**: applied only to the slab, text inside the slab inverted to white, caption line in gray.
- **`tabular-nums` is a hard requirement**: this card doesn't roll, but the moment a reuser plugs it into a "the number changes" scenario
  (say, the same component reporting different numbers), proportional digits make the slab width jump.

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `slabDur` | 0.24s | Slab landing duration; <0.15s the slab "flashes" out (the "spot is claimed" announcement is unreadable), >0.4s the audience stares at an empty slab waiting for content |
| `slabDrop` | 20px | The slab's drop displacement; 0 makes the slab a mere fade (no weight), >40px reads as the slab falling in from off-frame (transition language, stealing the number's scene) |
| `slabScale` | 0.94 | Slab starting scale; 1.0 (no scale) also works but loses a bit of the "settling into place" feel, <0.85 the slab becomes its own pop effect |
| `numScale` | 0.72 | **Number starting scale, this card's energy knob**; 0.9 reads as a slight enlargement (the conclusion doesn't "slam" enough), <0.5 the number explodes from a dot, reading as an effect not data |
| `numDur` | 0.28s | Number pop duration; <0.2s with `back.out(1.7)` the overshoot is too abrupt and reads as a twitch, >0.4s the elasticity goes soft and the conclusion feel loosens |
| `back.out(1.7)` | 1.7 | Rebound amount; 1.0 (= no overshoot) reads as an ordinary scale fade (losing the "nail" of the conclusion landing), >2.2 reads as cartoon bounce (a language data cards shouldn't speak) |
| `decLag` | 0.20s | **Decimal delay, this card's second critical rule**; 0 pops the whole string together (losing the "integer trunk / decimal detail" hierarchy), >0.4s the decimal arrives too late, reading as another number appended afterward |
| `capRise` | 6px | Caption rise; 0 is usable (quieter), >16px the caption becomes its own entrance effect, competing with the number |
| `hold` | 1.8s | Closing freeze; a conclusion number must hold long enough to be repeated, <1.0s the audience can't memorize it |
| Integer font size | 96px | 18% of stage height (540) — **this ratio is the card's skeleton**; <12% the number can't carry "conclusion", >25% the slab's padding gets squeezed out and the number hits the edges |

## Known Pitfalls
- Slab and number entering together — one big PNG flying in and the number loses its status as subject; the slab must land first, this card's number-one rule.
- Slab rising from **below** — "rising" is light (that's `media-pop-in`'s language); a conclusion number needs the weight of "dropping."
- Decimal and unit toggled via `display: none → block` (instead of `opacity`) — the row width changes on the fade-in frame,
  the integer gets nudged sideways, obvious in slow motion. They must occupy space from the start.
- Hard-coding the slab width — swap in a number with a different digit count (`8.2%` / `128.6%`) and you're guaranteed asymmetric side gaps or the number hitting the edge.
  The slab width must be stretched by the number (`inline-block` + padding).
- Number `transform-origin` left at the default `50% 50%` — the type floats slightly upward at the end of the pop (visual center of gravity sits lower than geometric center);
  `50% 60%` keeps it steady.
- Caption placed inside the slab — it becomes part of the slab (reading as "the slab contains two lines"); this card's caption is an annotation **outside the slab**.
- Rebound pulled above 2.2 and still calling it a data card — that's cartoon pop-in language;
  data bouncing three times reads as "this number is joking."
- Omitting `tabular-nums` — invisible in one playback since this card doesn't roll, but the slab width jumps once reused in a "same component, different numbers" scenario.
- Giving the number a rolling count — that turns it back into `number-counter` / `metric-with-sparkline`;
  this card's entire value lies in **having no process**. Want process, use those two directly.
- Adding drift/breathing to the slab or number during hold — a conclusion is "nailed"; moving it reads as "not settled yet."
- Semantic color reaching the caption beyond the slab — `design-language.md` §1: one screen carries one accent-color vehicle;
  the caption is a dim solid (`#8a8a8a`, and **never with opacity layered on top**, the §1 light-background red line).

## Reuse Guide
- HTML/GSAP: `demos/number-slab-pop/index.html`. **To change the number, edit three spans in the HTML**:
  `.int` (integer) / `.dec` (decimal, including the point) / `.pct` (unit); with no decimal, delete the `.dec` span
  and apply `decLag` to the unit (timing unchanged); change copy via `.slab-cap`.
  Change color via `.slab`'s `background` (text inside the slab stays white); slab width is adaptive, leave it alone.
  **The integer font size is the skeleton**: when changing `.num-row .int`'s `font-size`, `.dec` must follow (the two must be the same size —
  a size apart reads as two different numbers), and `.pct` takes 55% of the integer.
  Want more "slam": only tune `numScale` (0.72 → 0.6), don't touch `back.out`'s rebound (that changes the language category).
- Remotion port: compute the three layers per frame, no timeline:
  slab `opacity/y/scale` as three `interpolate(t, [0.30, 0.54], …, {easing: Easing.out(Easing.cubic), extrapolateLeft:'clamp', extrapolateRight:'clamp'})`;
  the number's `back.out(1.7)` approximated in Remotion with `spring({frame: frame - 0.54*fps, fps, config: {damping: 12, stiffness: 200, mass: 0.6}})`
  (or use `Easing.out(Easing.back(1.7))`, mathematically equivalent to GSAP's `back.out(1.7)` and simpler);
  decimal and unit share one `interpolate(t, [0.74, 0.92], [0, 1])` opacity,
  **both spans rendered from frame 0** (just at opacity 0) — no conditional rendering, or the width jump appears.
  `clamp` cannot be omitted: without it, the slab computes negative opacity and scale > 1 for `t < 0.30`.
- Editing-software equivalents: JianYing/CapCut — **two independent layers**: the slab (shape/background layer) keyed with two "position + scale + opacity"
  keyframes (0.24s), the number (text layer) with its in-point pinned to the slab's final frame, using an "elastic pop" or "scale-up entrance" preset
  (JianYing's "elastic" is the back family; the rebound isn't adjustable, just accept it); if the decimal should be separately delayed,
  **split ".6" into a third text layer** and align it manually (JianYing has no "intra-text segment animation") —
  this step is costly in JianYing, and doing only integer + unit as two layers is a reasonable trade-off (dropping this card's second rule to keep the first).
  AE — slab layer with `Position` + `Scale` + `Opacity`, two keys each; number layer with `Scale` two keys +
  `Easy Ease` with handles pulled into an overshoot, or an `Overshoot`-type script;
  the decimal as an independent text layer, in-point +6 frames. Remember to move the `Anchor Point` to `50% 60%`.
- Division of labor with sibling cards in this library: `number-counter` = the **process feel** of a rolling count (odometer reels + large comma-grouped amounts,
  "burning away bit by bit"); `metric-with-sparkline` = one number + its trend (also process feel, 0.9s roll + simultaneous sparkline);
  `count-badge-title` = a number as the stress of a title (the 3 in "3 methods" — the number is a sentence constituent);
  `behind-text-title` / `slab-punch-title` = slab + text title cards (the subject is text, not a number);
  **this card = a one-shot popped conclusion number** (no process, slab before number, integer trunk + decimal detail).
  After this card appears once on screen, all other numbers in the piece should go through the two process-feel cards — **overused, conclusion feel stops being a conclusion**.

## Scope
- Belongs to this card: the two-beat discipline of "slab lands first, and only on the frame it settles does the number pop" (including those 0.24s of empty slab as a "spot announcement"); the "weight" choice of the slab dropping from **above** (`y −20 → 0` + `scale 0.94`); the number's one-shot pop `scale 0.72→1` + `back.out(1.7)` with the slightly-low `transform-origin: 50% 60%`; the layering and implementation discipline that the decimal and unit **fade in separately 6 frames later** and **occupy space from the start, animating only opacity** (no display toggling); the caption **outside the slab**, fading in last with a 6px rise; slab width stretched by the number (never hard-coded); `tabular-nums`; complete stillness during hold.
- Does not belong to this card: the specific copy and values of "23.6% / up from last year", the blue `#0066cc` (any accent works), the 96px/52px/20px font sizes, the 28px corner radius and 26/40/30 padding, the host (digital human) placeholder on the right, and the "slab left-aligned at 108px, vertically centered" placement (centered, right-aligned, or dead center on a cover all work).
- Migration interface: the `.int` / `.dec` / `.pct` spans in the HTML are the only content entry points; take the integer font size at 18% of stage height (`.dec` same size, `.pct` at 55%), scale `slabDrop` at 20% of the integer font size, take `capRise` at 30% of the caption font size; tune energy only via `numScale` (never `back`'s rebound — that changes the motion's language category); with no decimal, transfer `decLag` to the unit with timing untouched; for portrait, take the integer font size at 22% of stage width (in portrait the bottleneck is usable width, not height).
- Background requirement: white works. Dark works and is even more common (slab swapped to a dark-mode accent like `#2997ff`, caption to `#a1a1a6`; text inside the slab stays white). The only constraint is **a clear luminance difference between slab and background** — this card's first beat is "an empty slab drops in," and if the slab can't be seen that beat is gone; on light backgrounds don't use a slab lighter than `#f5f5f7`, on dark backgrounds don't use one darker than `#2a2a2c`.
