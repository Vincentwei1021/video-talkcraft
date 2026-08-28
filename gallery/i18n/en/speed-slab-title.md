---
name: speed-slab-title
title: After the main title pops in hard, the subtitle's slanted slab crashes in from **off-screen left** (start −580px, fully invisible on the first frame) and lands (0.28s power4.out); on the landing frame three speed lines of unequal length (42/30/22px, staggered 2 frames) snap open from the slab's left edge and fade out within 0.2s — the text inside the slab lags with a 40px reverse offset and gets clipped, reading as "the text chasing the slab half a beat behind"
usage: Titles that need the semantics of "fast" — efficiency / speed-up / first-mover / right-now opinion lines; the opening or section accent of fast-paced short talking-heads (under 60s); not for calm conclusion lines or quotes that need dwell time for reading
---

## Intent
"A slab rushing in from the side" is by itself just a translation entrance — it conveys **direction**, not **speed**; the audience reads "this slab came from the left."
Making it read as speed requires a physical cue: **the afterimage**. Three parallel short lines grow out of the slab's left edge on the frame the slab stops,
then vanish immediately — the visual lie of "the slab moved so fast just now that the air still holds its trail."
This card's entire information payload lives in those 0.4 seconds of lines.

Two keys:
(1) **The speed lines must vanish within 0.2s**. An afterimage is by definition "a thing that should be gone but lingers";
lines staying on screen past half a second turn into decorative triple bars — a flat logo element, not a motion trace.
The lingering version is not "a prettier version of this card"; it is a different card (decorative slanted-slab title), and actually a lower energy tier.
(2) **The text inside the slab must lag half a beat**. Text hard-bound to the slab reads as one PNG translating;
give the text a 40px reverse offset (the slab's `overflow: hidden` clipping a strip of it) + a chase duration 0.06s longer than the slab's,
and the text acquires its own inertia — the audience reads "the slab rushed in carrying the text; the text got flung behind and caught up."
That 40px is where this card's "expensive" feel comes from, and the step most easily skipped.

## Motion Core
- **Four beats, of which beats (3) and (4) are two halves of one thing**:
  - Beat (1) `t=0.40` main title: `scale 1.04 → 1` + `opacity 0 → 1`, `0.18s power3.out`, no displacement,
    `transform-origin: 0% 50%` (protecting the left baseline)
  - Beat (2) `t=0.66` purple slab: `x -580 → 0`, `0.28s` **`power4.out`** — the only power4 in the card;
    its "violent attack, extremely long tail" is the braking feel.
    **The start point must place the slab fully off-screen**: criterion `|slabFrom| > distance from slab's right edge to stage's left edge ÷ cos(slant angle)`
    (this demo: slab right edge x≈562, −3° ⇒ threshold 563; −580 leaves 17px margin).
    Any part of the slab visible on the first frame reads as "the slab was already there and just slid a bit" — "crashing in from off-screen" is gone
  - Beat (2b), same frame: slab text: `x -40 → 0`, `0.34s power3.out` — **0.06s longer** than the slab, easing **one order lower**;
    both are implementations of "the text is slower" (changing duration alone without the easing also works, but the lag feel is half as strong)
  - Beat (3) `t=0.94` (= the frame the slab stops): three speed lines, each `scaleX 0 → 1` (`transform-origin: 100% 50%`
    ⇒ growing **leftward** from the slab's left edge), each `0.09s power3.out`, line stagger `0.067s` (2 frames @30fps)
  - Beat (4): as each line finishes opening, immediately `opacity 1 → 0`, `0.20s power2.in` (**in**, not out: erased slow-then-fast,
    like being swallowed by the air; out reads as "a deliberate decorative fade")
- **The speed lines must be unequal in length**: `42 / 30 / 22px` (≈ 0.55 / 0.39 / 0.29 × font size).
  Three equal lines are a print symbol (≡); only unequal lengths read as a trail. Vertical placement ratios `0.24 / 0.50 / 0.76 × slab height` —
  a longest middle line would read as an arrow tail, so the longest line goes on top
- **The speed lines share the slab's single static slant**: the three lines are children of `.ss-row` (`rotate(-3deg)`),
  hence naturally parallel to the slab. Rotating each separately will always misalign, and changing the angle would mean editing four places
- **The clearance between the two lines is a hard constraint**: after the −3° slant the slab's **top-right corner is its highest point**, landing right under the main title's last character.
  `.ss-row`'s `margin-top: 36px` leaves the slab's highest point **14px** clear of the main title's **glyph bottom** (not line-box bottom)
  (12–16px is the sweet spot). Give 14px by `margin-top` intuition and
  the slab's top-right corner presses 7px into the main title's last glyph — line-box bottom and glyph bottom differ by a dozen-plus px; compute from the glyph
- **The slab's `overflow: hidden` is a hard requirement**: the text's 40px reverse offset only reads through this clipping.
  Without clipping, the text merely "slides in from outside the slab," reading as two objects each translating
- **Layered `x` separation**: the slab is translated by `x` (`.ss-slab`), and the text is translated by `x` again **within the slab's local coordinates** (`.ss-slab-t`) —
  two stacked transforms, so the text's actual displacement = the slab's displacement + its own offset. Written on one element, the chase cannot be produced
- **The three lines are generated at runtime from the slab's height** (`slab.offsetHeight`), so font-size changes need no placement-constant edits
- **Layering**: white stage → main title → subtitle row (static slant) → speed lines (left of the slab, absolutely positioned `right: 100%`) + purple slab (containing the clipped text)
- **The accent color goes only on the slab and the lines**: `#7A5AF8` (the reference image's purple family). Main title black `#1d1d1f`, slab text knocked out white

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| `lineFade` | 0.20s | **This card's first key**; >0.5s the lines become decorative triple bars (speed semantics vanish, the card downgrades), 0 makes the lines flash one frame and go unseen (an afterimage must be "seen in the act of vanishing") |
| `lagPx` | 40px (≈0.53 character width) | **This card's second key**, the text's reverse offset; 0 makes slab and text read as one PNG translating, >0.9 character width the text exposes a blank strip inside the slab (the audience reads "the text failing to keep up" as a bug) |
| `lagDur` | 0.34s (= 1.2x the slab's) | The text's catch-up duration; = `slabDur` makes text and slab stop together (the chase vanishes), >1.6x the text is still crawling after the slab stops, reading as slow-loading subtitles |
| `slabFrom` | -580px | The slab's start point, **must be fully off-screen**: `|slabFrom| > distance from slab's right edge to stage's left edge ÷ cos(slant angle)` (this card: 563, taking -580). Too small and the first frame shows a strip of the slab (the mistake flagged in the user's 2026-08-25 review) — "crashing in from off-screen" downgrades to "sliding in place" |
| `.ss-row`'s `margin-top` | 36px (14px clearance) | The vertical gap between the two lines; after the slant the slab's **top-right corner** is the highest point, and it must stay 12–16px clear of the main title's **glyph bottom**. Giving 14px by line-box intuition presses the slab 7px into the main title's last glyph (user's 2026-08-25 review); >60px the two lines detach and the subtitle reads as an independent second element |
| `slabDur` | 0.28s | Slab crash-in duration, the energy knob; <0.2s the slab teleports (no "rush" process), >0.4s power4's violence flattens out, reading as an ordinary slide-in |
| Slab easing | `power4.out` | **The card's only power4**; swap in power2 and it instantly reads as "sliding in" (leaving the speed lines with no reason to exist) |
| `lineLens` | [42, 30, 22] px | Three line lengths, **must be unequal**; equal reads as the print symbol ≡, differences <5px equal equal; the longest exceeding 0.8 character width grows past the frame's left edge |
| `lineStagger` | 0.067s (2 frames) | Line stagger; 0 opens all three together (reading as one solid graphic), >0.15s reads as three independent effects appearing in turn |
| `lineOpen` | 0.09s | Single-line opening duration; >0.2s the "drawing" of the line becomes visible and the afterimage turns into a hand-drawn line (that's group B's language) |
| `hold` | 1.5s | Closing freeze; this card is fast-paced — a hold past 2s dilutes the "fast" semantics in the waiting |

## Known Pitfalls
- Speed lines staying on screen (no fade, or fading >0.5s) — they turn from motion afterimage into decorative triple bars, and the card's most expensive 0.4s is wasted.
- Text hard-bound to the slab (skipping `lagPx`) — the whole reads as one PNG translating; with no inertia difference between slab and text, slow motion exposes a template.
- Slab missing `overflow: hidden` — the text's reverse offset becomes "the text sliding in from outside the slab"; on the opening frame the text pokes out left of the slab and the composition is simply wrong.
- **`slabFrom` not far enough (a strip of the slab visible on the first frame) — the mistake observed in the user's 2026-08-25 review**.
  The original −180 gave the slab only 180px of travel, leaving most of its right side in frame at the start, reading as "the slab was already there and slid a bit,"
  and the "crashing in from off-screen" premise is gone. Compute the start from the criterion: slab's right edge to stage's left edge ÷ cos(slant angle), plus a margin.
- **The subtitle slab pressing into the main title** — after the slant, the slab's top-right corner is the highest point, right under the main title's last character.
  Giving the line gap by `margin-top` intuition (the 14px tier) presses the slab 7px into the main title's glyphs.
  Compute clearance from the **glyph bottom** (not the line-box bottom), leaving 12–16px.
- Three equal-length speed lines — reads as the print symbol ≡ or a "signal-strength icon," not a trail.
- Speed lines fading with `power2.out` (instead of `power2.in`) — the fade's first half is slow, the lines "loiter" on screen, reading as a deliberate decorative fade rather than being erased.
- Each line rotated separately (not hung under the slab's slant container) — guaranteed non-parallel with the slab (floating-point error + differing origins), and an angle change means editing four places.
- Slab crashing in with `power2.out` — the braking feel is gone, and the speed lines lose their reason to exist (no "too fast," no afterimage).
- Line `transform-origin` at the left end (`0% 50%`) — the lines grow from the slab's left edge toward **their own left endpoints**, reading as "lines shrinking rightward": the direction is exactly backwards.
- The slab text's `x` and the slab's `x` written on one element (values summed) — the chase can't be produced: a single transform has one position; a chase needs two stacked coordinate levels.
- Speed lines in any color other than the accent (e.g. gray) — they are the slab's afterimage and must match its color; gray lines read as "another element" and are nearly invisible on white.
- The main title also crashing in (for "overall unity") — two directional entrances on one screen, the audience doesn't know where to look, and once the main title moves, the slab's "rush" is no longer the only motion.

## Reuse Guide
- HTML/GSAP: demos/speed-slab-title/index.html. **To change copy, edit two HTML text nodes** (`#ssL1` main title 4–7 characters,
  `#ssSlabT` subtitle 4–7 characters) — slab width auto-fits the text, and the three lines' placement is measured from slab height, so no constants change;
  **but when slab width changes, `CONFIG.slabFrom` must be recomputed** (criterion in the parameter table: slab's right edge to stage's left edge ÷ cos(3°) + margin).
  To change the accent, edit two places: `.ss-slab`'s `background` and `.ss-line`'s `background` (must match).
  To change the font size, edit `font-size` on `.ss-l1` and `.ss-slab-t` (the two must match), and scale `CONFIG.lagPx` (≈0.53 character width)
  and `CONFIG.lineLens` (≈0.55/0.39/0.29 character width) proportionally.
  Tune energy only via `slabDur`; `lineFade` and `lagPx` are key constants — never touch them for size or speech-pace changes.
- Remotion port: **the crux is that the two transform levels must not collapse into one** — an outer div takes the slab's `x`, an inner span takes the text's `x`.
  30fps conversion: `lead 12f`, `l1Dur 5f`, `gap 2.4f≈2f`, `slabDur 8.4f≈8f`, `lagDur 10f`,
  `lineStagger 2f`, `lineOpen 2.7f≈3f`, `lineFade 6f`.
  Slab `translateX: interpolate(f, [26,34], [-580,0], {easing: Easing.out(Easing.poly(4)), ...clamp})`
  (recompute `-580` by the same criterion: slab's right edge to frame's left edge ÷ cos(slant angle); in Remotion hard-code the off-screen start as a constant)
  — `Easing.poly(4)` is power4; the text runs `Easing.out(Easing.cubic)` over `[26,36]`.
  Each line gets two segments: `scaleX: interpolate(f, [34+2i, 37+2i], [0,1], {...clamp})` and
  `opacity: interpolate(f, [37+2i, 43+2i], [1,0], {easing: Easing.in(Easing.quad), ...clamp})`
  (**`extrapolateRight: 'clamp'` cannot be omitted** — otherwise the hold period computes negative opacity, and in Chrome the line flashes back for a frame).
  The slab's `overflow: hidden` is equally required in Remotion, and must sit on the layer that takes the `x` (not on its parent).
- Editing-software equivalents: CapCut — slab and text must be **two layers** (slab as a color-block sticker, text as a text layer),
  both keyed on "position"; the text's start point offset 40px further left than the slab's, its end frame 2 frames later; on the slab layer apply "mask-rectangle" fit to the slab edges for clipping
  (CapCut stickers have no overflow — clipping only via masks). The three speed lines are three thin color-block stickers,
  each keyed "scale" X channel 0 → 100 + "opacity" 100 → 0, starts offset 2 frames apart.
  **Do not use CapCut's "speed lines" effect** — that's full-screen radial lines, a comic burst, not the slab's afterimage.
  AE — slab layer `Position` two keys with `Easy Ease Out` and the handle pulled to 90% (approximating power4);
  text layer parented to the slab layer, with its own set of `Position` keyframes — two-level stacking comes naturally;
  three lines via `Scale` X channel + `Opacity`, auto-staggered with `Sequence Layers` (2-frame interval).
- Division of labor among this library's sibling cards: `slab-punch-title` = the slab **stretching open in place from center** + text slam (semantics: weight/conclusion);
  `motion-blur-slam-in` = footage slamming in with motion blur (its object is a footage card, not a title, and it uses blur rather than afterimage lines);
  `alt-block-lines` = two blocks each unrolling from the left sweeping out text (a paired-line relationship, no speed semantics);
  `whip-pan-transition` = a full-screen whip (a transition, not a title);
  **this card = the only title card that expresses speed through "afterimage lines"** — its semantics anchor on the word "fast"; used on a sentence that doesn't need "fast," it just spins idle.

## Scope
- Belongs to this card: the definition that the speed lines are **the crash-in's afterimage** (they must fade out within 0.2s of opening, erased via `power2.in` rather than faded via `out`); the shape discipline of three lines of **unequal length** (0.55/0.39/0.29 character width) + 2-frame stagger + `transform-origin: 100% 50%` growing leftward from the slab's left edge; the slab text's `lagPx 40px` reverse offset + `lagDur` 20% longer than the slab's "chase feel"; the slab's `power4.out` (the card's only power4) braking curve; **the slab's start point fully off-screen** (criterion: `|slabFrom| > distance from slab's right edge to frame's left edge ÷ cos(slant angle)`; no part of the slab visible on the first frame — user sign-off 2026-08-25); **the subtitle slab never pressing into the main title's glyphs** (after the slant the slab's top-right corner is the highest point, kept 12–16px clear of the main title's **glyph bottom**, computed from glyphs rather than line boxes — user sign-off 2026-08-25); the implementation discipline of the slab clipping the text via `overflow: hidden`, with text and slab on **two transform levels**; the speed lines hung under the slab's static slant container (shared slant, naturally parallel); the three lines generated at runtime from slab height (no hard-coded placement); the division of labor that the main title "pops in hard and joins no directional motion."
- Does not belong to this card: the demo's two specific lines "efficiency isn't being faster / it's not doing the wrong things," the 76px size and 700 weight, this purple `#7A5AF8` (anything in the family works; the reference image is just one sample), the specific -3° slant angle, the `padding: 10/20/12` pixels, the slab's 4px rounding, the lines' 7px thickness and 4px round caps, the right-side host (digital human) placeholder, and the "title in the left white area, 84px left margin" placement. The **specific values** `slabFrom -580` and `.ss-row`'s `margin-top: 36px` don't belong to the card either (computed from this demo's slab width and font size) — what belongs are the two **criteria** (fully off-screen / 12–16px clearance).
- Migration interface: the content entry point is two plain-text strings (4–7 characters each); slab width auto-fits; tune energy only via `slabDur` (0.2–0.4s); `lineFade 0.2s` and `lagPx ≈0.53 character width` are key constants — scale them only with font size, never with speech pace; when changing font size, scale `font-size` (two places, same value), `lagPx`, `lineLens`, and `.ss-slab`'s padding by one ratio; change the accent via `.ss-slab` and `.ss-line`'s `background` in two places (must match); `slabFrom` **is not a feel parameter — it is computed**: slab's right edge to frame's left edge ÷ cos(slant angle) plus 15–20px margin, and it must be recomputed whenever copy, font size, or placement change (slab width changes the threshold); the two-line clearance (`.ss-row`'s `margin-top`) is recomputed as 12–16px between the main title's **glyph bottom** and the slab's **top-right corner**, following font-size changes. For vertical video pull the size to 52–60px and recompute `slabFrom` from the new slab right-edge position (narrower slab, far smaller threshold).
- Background requirement: a white ground suffices. A dark ground also works (main title inverted, slab and lines keeping the accent), but the afterimage lines are less visible on dark — widen `lineFade` to 0.26s so the "vanishing in progress" stays visible. **Gradient grounds and live-action busy grounds do not work**: the speed lines are only 7px wide with a 0.2s lifespan, and any high-frequency detail in the ground swallows them.
