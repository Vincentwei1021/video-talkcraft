---
name: quote-bracket-pull
title: Two oversized quotation marks — three times the body text — push in **on the same frame** from opposite off-screen corners, bracketing a blank area into a "quotation zone"; only when the marks are halfway through do the three quote lines begin fading in and rising with a 0.09s stagger, and the key phrase on the last line is finally swept by a highlighter over 0.26s
usage: Moments when a quote needs to "be quoted" — citing someone else's words, reading back viewer comments, elevating one of your own sentences into a quotation; quotes that must not cover the host (this card lays down no panel — the host stays in frame throughout); restrained knowledge-channel / interview-style talking-head content. Not for bombastic hot-take quotes that need a "yielding ritual" (use quote-card for those)
---

## Intent
This library already has `quote-card` (the big quote card), whose mechanism is a **yielding ritual**: a panel covers the host, the text takes the full screen,
lines slam in one by one, hold for 2–4s, then the whole card slides down and exits. It's powerful, but the cost is that **the host disappears**,
and the entire screen is taken over — so it can only be used once or twice per video; overuse makes every occurrence feel like "scripture reading is about to begin."

This card solves the other half of the same need: **I want to elevate a sentence into a quotation without interrupting the talking-head**.
Its mechanism is entirely different — no panel, the host untouched; instead, **two large quotation marks bracket a blank area**,
carving out a live "quotation zone" within the frame. What the audience reads is not "the picture stopped" but "this sentence just got quotation marks."
This is the language of typography (quotation), not the language of the stage (yielding).

Three hard differences from `quote-card` — don't mix them up when reusing: (1) **no panel, the host doesn't exit**; (2) **the quotation marks are the primary action**
(the text is bracketed out, not slammed out on its own); (3) **a tighter stagger** (0.09s vs 0.15s) — this card's three lines are **one sentence**,
while `quote-card`'s lines are **slammed sentence by sentence**.

Two keys: (1) **the marks must share the same frame and the same curve**. That is the entirety of the "bracketing" action — offset the two marks by even 3 frames
and it reads as "two symbols each flying in on their own," and the composition falls apart on the spot; (2) **the marks must hold their own weight**: sized at more than twice the body text
(108px vs 32px in the demo — 3.4x), with `opacity` at 0.85–0.9. Too small or too faint and they degrade into decorative badges —
the "quotation" meaning is gone.

## Motion Core
- **Layering**: white ground → host (bottom-left badge, static throughout) → quote block (type area, `width: fit-content` hugging the longest line)
  → two large quotation marks (absolutely positioned outside the block's top-left / bottom-right) → highlighter swatch (**beneath** the last line's text)
- **(1) Quotation-mark push-in (this card's primary action)**, both marks **same frame, same curve**, `0.32s power3.out`:
  - Left mark: `x −30 → 0`, `y −14 → 0`, `opacity 0 → 0.9`
  - Right mark: `x +30 → 0`, `y +14 → 0`, `opacity 0 → 0.9` (displacements **mirrored and opposite** — that is the geometry of "bracketing")
  - Sized 108px / weight 700 / serif family (Georgia) — the serif quotation glyph itself carries the cultural encoding of "quotation"
- **(2) Three quote lines**: start when the marks are **halfway through** (`lead + markDur × 0.5` — no idle waiting),
  `opacity 0 → 1` + `y +6 → 0`, each line `0.30s power2.out`, **staggered 0.09s**.
  The rise is only 6px: just a touch of weight — any more displacement steals the marks' "bracketing"
- **(3) Highlighter** (after the last line lands + a 0.10s breath): `scaleX 0 → 1`, `transform-origin: left center`,
  `0.26s power2.inOut`. `#FFE949` @ `opacity 0.6` + `mix-blend-mode: multiply`
  (the marker token from design-language §1), with irregular rounding `9px 4px 8px 3px / 5px 9px 4px 8px` simulating a pen stroke.
  **The swatch sits beneath the text** (`z-index` and DOM order as double insurance) — it must not cover the letters
- **(4) hold 2.2s**: the quote must dwell. This is the card's longest segment, longer than any action
- **Placement discipline**: the quote block uses `width: fit-content`, not a fixed width — the marks are absolutely positioned on **the block's edges**;
  with a fixed block width the marks get pinned to the type area's corners, too far from the sentence, and the "bracketing" relationship breaks

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Mark size | 108px (3.4x the body text) | **Key**: the marks' weight; < 2x body text reads as decorative badges (the "quotation" semantics vanish), > 4.5x body text the marks become the star and the sentence becomes their illustration |
| `markOpacity` | 0.9 | The marks' settled opacity; <0.8 reads as a watermark (too light to anchor the composition), at 1.0 the marks are as black as the body and read as "two big symbols inside the sentence" |
| `markDx` / `markDy` | 30 / 14px | Mark push-in distance, **the two must be equal and opposite**; at 0 only the fade remains (the "bracketing" action disappears), >60px reads as two symbols flying in from afar (upstaging the whole sentence) |
| `markDur` | 0.32s | Mark push-in duration, this card's primary-action length; <0.2s reads as popping into place (the bracketing process is invisible), >0.5s the audience waits for two symbols to settle before the sentence even starts |
| Mark stagger | **0s (strictly same frame)** | **The first key — not a tunable parameter**; 3 frames of offset reads as "two symbols entering separately" and the composition falls apart |
| `lineStagger` | 0.09s | Line stagger; deliberately tighter than `quote-card` (0.15s) — the three lines are **one sentence**, not three; >0.15s reads as sentence-by-sentence slamming (at which point use quote-card), <0.05s the block fades in as one (losing the reading progression) |
| `lineRise` | 6px | Line rise displacement; >16px the lines' entrance outweighs the marks and the hierarchy inverts |
| Text start timing | Marks 50% through | Starting the text after the marks land reads as two disconnected effects; 0% (simultaneous) reads as "one block fading in," burying the bracketing action |
| `markerDur` | 0.26s | Highlighter sweep duration; follows reading pace, <0.15s flickers like a bug, >0.5s drags past the narration's stress point |
| Line count | 2–4 lines | 3 is most comfortable; >4 forces the marks too far apart and the "bracketing" tension slackens (and a quote over 4 lines isn't a quote anymore) |
| `hold` | 2.2s | Closing dwell, **this card's most important segment**; <1.5s cuts away the moment the audience finishes reading — no afterglow; a quote's entire value lives in this stillness |

## Known Pitfalls
- Staggering the two marks (doing a "bracket one after the other") — **this card's most fatal mistake**. "Bracketing" is one action,
  necessarily completed by two synchronized displacements; staggered, it reads as two independent symbols flying in, and the composition falls apart.
- Marks only slightly larger than the body (1.3–1.8x) — they degrade into "punctuation inside the sentence,"
  and the audience will never read them as the act of "quoting."
- Marks at `opacity: 0.4` for "lightness" — they become a watermark and can't anchor the composition; the marks are **symbols, not decoration**,
  and 0.85–0.9 is their floor.
- Marks in a sans-serif family (same as the body) — a sans-serif `"` is two small vertical blocks; blown up to 108px they're just two rectangles;
  serif quotation glyphs carry the cultural encoding of "quotation" for free.
- Quote block with a fixed width — the marks get pinned to the type-area corners, a dozen characters away from the sentence, and the "bracketing" relationship breaks
  (must use `width: fit-content` hugging the longest line).
- Highlighter without `multiply`, or the swatch layered above the text — the yellow block crushes the letters to gray, turning "highlighting" into "redacting."
- Highlighter with regular rounding (or a sharp rectangle) — reads as a text selection / background color, not a pen stroke.
- More than one highlight in a single sentence — a highlight on every line equals no highlight at all (same pitfall as `quote-card`).
- Adding a panel that covers the host — that's `quote-card`; this card's entire value is "not interrupting the talking-head."
- Marks that keep moving after entry (drift/breathing) — the marks are symbols and must be absolutely still once settled
  (design-language §4: elements that have finished drawing/settling stay cleanly at rest).
- Cutting hold below 1s — this card's three actions (bracket / text / sweep) total only 1.06s;
  the hold should be longer than their sum; cutting the hold is cutting the quote itself.

## Reuse Guide
- HTML/GSAP: demos/quote-bracket-pull/index.html. **To change content, edit the three lines of `.qb-line` copy**
  (wrap the highlighter's key phrase in `.qb-mark-wrap` — the swatch width auto-fits);
  add/remove lines by adding/deleting `.qb-line` elements (the stagger is computed via `stagger`, no delay edits needed),
  but the marks' placement `top/bottom` needs a matching nudge (`.qb-mark.open`'s `top`, `.close`'s `bottom`).
  **The mark size scales proportionally with the body size** (32px body ⇒ 108px marks, i.e. 3.4x); change both when changing sizes.
  Tune the rhythm only via `markDur` (the primary action) and `hold` (the afterglow); `lineStagger` is a feel constant.
  Do not touch the fact that "both marks are written in a single `tl.to([open, close], ...)`" — that line is the implementation of the first key.
- Remotion port: the two marks **must be written on the same local `interpolate` clock**
  (`const p = interpolate(frame, [0, 10], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateRight: "clamp"})`,
  then left mark `translate(${-30*(1-p)}px, ${-14*(1-p)}px)`, right mark multiplied by `+1`) —
  sharing one `p` is the structural guarantee of "same frame, same curve"; split them into two Sequences and someone will eventually stagger them by accident.
  Each of the three lines gets its own `<Sequence from={Math.round((5 + i*2.7) * 1)}>` (@30fps: marks 10 frames, text starts at frame 5, line stagger ≈2.7 frames, rounded to 3);
  the highlighter uses `scaleX` + `transformOrigin: "left center"`, and `mixBlendMode: "multiply"` works correctly in Remotion.
- Editing-software equivalents: CapCut — make the two marks two text layers and **keyframe them simultaneously**
  (box-select both layers and key them together; doing them one at a time guarantees a stagger); three text layers with "position + opacity,"
  each dragged 3 frames later; the highlighter is a yellow rectangle sticker + horizontal scale keyframes + layer blend mode set to "multiply,"
  with the anchor dragged to the left end (the default center anchor makes the swatch grow from the middle outward — that's `quote-hold-arrow`'s language).
  AE — parent both marks to **a single Null**, key one set of `Position` keyframes on the Null only,
  and mirror the marks with each one's `Scale` x-axis at ±100 (so "same frame" is structurally enforced, not manually aligned);
  the highlighter is a Shape Layer rectangle + `Scale` x keyframes + layer blend mode `Multiply`.
- Division of labor among this library's sibling cards (**required reading — the two quote cards are easy to confuse**):
  - `quote-card` = **yielding ritual** (panel covers the host, full-screen takeover, sentence-by-sentence slam, 0.15s line stagger, slide-down exit).
    For opinion peaks, hot takes, closing beats; at most once or twice per video.
  - **This card = typographic quotation** (no panel, host stays, marks bracket a quotation zone, 0.09s line stagger, no exit action).
    For citing others, reading comments, elevating a sentence into a quotation; restrained — usable two or three times in one video.
  - `quote-hold-arrow` = **the third kind of quote**: of three lines, **only the last upgrades** (plain first, then highlight + arrow);
    the emphasis is "this line within the sentence," not the whole quotation.
  - `tracking-in` = a one-shot entrance for a single-line headline (a title action for one line of text);
    `highlighter-sweep` = just the highlighter stroke alone (marking up an existing document/long text, without the quotation-mark composition).

## Scope
- Belongs to this card: the "bracketing" action of two large quotation marks pushing in from opposite corners **on the same frame with the same curve** (`x ∓30 / y ∓14 → 0` + `opacity 0→0.9`, `0.32s power3.out`) — **same-frame is this card's structure, not a parameter**; the weight discipline that the marks must exceed twice the body size and land at `opacity` 0.85–0.9 ("symbols, not decoration"); the overlap timing of text starting when the marks are 50% through; the three lines' `opacity` + `y +6→0` with the tight `0.09s` stagger (as opposed to `quote-card`'s 0.15s sentence-by-sentence slam); the last line's highlighter `scaleX 0→1 origin left` over `0.26s`, the swatch beneath the text using `multiply`, irregular rounding simulating a pen stroke; the proportion rule that `hold 2.2s` exceeds the sum of all actions; the compositional premise of **no panel, host does not exit**.
- Does not belong to this card: the demo's three specific quote lines and the key phrase "actively go solve the problem," the absolute values of 32px body / 108px marks (the ratio is the essence), Georgia as the specific serif family, the `#1d1d1f` ink color, the quote block sitting slightly above center, the bottom-left digital-host placeholder, any coloring beyond `#FFE949`, the white-ground stage.
- Migration interface: the content entry point is the `.qb-line` copy and line count (wrap the key phrase in `.qb-mark-wrap` for the highlighter); **the mark-to-body size ratio is 3.4:1**, change both proportionally together (mark placement `top/bottom` scales linearly with font size); scale `markDx/markDy` proportionally with stage width (double when going 960 ⇒ 1920), and the two **must keep the 30:14 mirrored-opposite relationship**; `lineStagger 0.09s` is a feel constant (unchanged even when speech pace changes); size `hold` by character count (about 0.1s per character, floor 1.5s); for vertical video, trim to 2–3 lines and drop the body to 28px (marks follow to 95px), keeping the mark placement rule of "hugging the block's top-left / bottom-right edges."
- Background requirement: **a white ground suffices**. A dark ground also works, with these swaps: body and marks invert to `#f5f5f7` (marks stay at `opacity` 0.9), and the highlighter's `mix-blend-mode` must switch from `multiply` to `screen` (on a dark ground, multiply multiplies the yellow swatch into black and the highlight simply vanishes). The only constraint is that no scene elements may sit where the marks land (the marks sit 30–40px outside the quote block — those two areas must be clear) — when a mark overlaps the host or footage, the audience can't read it as a symbol and takes it for a graphic in the scene.
