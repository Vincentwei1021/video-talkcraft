---
name: quote-hold-arrow
title: Three quote lines first fade in staggered, all in plain styling; the last line sits plainly in place for 0.34s, and only then **upgrades** — a yellow highlight box spreads from the last line's text center via scaleX over 0.24s, the text punches once after the box lands, then everything holds
usage: The "this is where it gets important" moment in a talking-head — two setup lines landing on a conclusion, a pivot line, the sentence before a call to action; situations where the audience must remember **which line of the passage** (not which word). Not for hook lines that must hit the instant they appear (there's no setup to upgrade from)
---

## Intent
Quote cards usually make one mistake: **highlighting on arrival**. Of three lines, the third flies in with its yellow box already attached — what the audience sees is
"a pre-composed graphic," reading as design, not narrative. The real rhythm of a talking-head is never like that: the host delivers two setup lines,
and only on the third does **the tone change** — that instant is when the audience learns "oh, everything before was for this line."

This card turns that "the tone changed" instant into motion: **the last line lands in plain styling, sits plainly for a beat, and only then upgrades**.
The audience's experience is two-staged — first reading a flat passage, then watching one of its lines get lit up. That "realizing after the fact" structure
is this card's entire value: it reproduces **the temporal order in which the point surfaces in speech**, instead of pasting the conclusion on directly.

The two actions have distinct jobs — don't blend them: **the box** says "it's this line" (scope); **the punch** says "it's right now" (timing).
Box first, text answers after — the order cannot be reversed.

**2026-08-26 user sign-off: the arrow that originally extended from the box's right edge in the third beat was removed.**
Rationale: the quote's landing point is "this line lights up, then holds" — the arrow led the eye from the sentence toward off-screen,
undercutting the afterglow of that 2.2s hold; it also occupied 104px of layout to the right of the last line, exactly where the host stands.
For a "toward the next step" pointer, use a dedicated transition card — don't cram it into the quote.

Two keys: (1) **the last line must have two beats** (plain → upgrade); the 0.34s in between is this card's one non-negotiable blank;
(2) **the box beneath the text, and the text stays black** — that's highlighter semantics (a stroke across the paper), not an inverted chip (text set inside a color block).
The latter is the language of `alt-block-lines` / `slab-punch-title` and reads entirely differently.

## Motion Core
- **Layering**: white ground → host layer (right column) → three quote lines (left, vertically centered) → last line: highlight box (`z-index: 0`)
  **beneath** the text (`z-index: 1`)
- **(1) Three lines fade in (first beat: everything plain)**: `opacity 0 → 1` + `y +8 → 0`, each line `0.28s power2.out`,
  staggered `0.12s`. **At this moment the last line is identical to the first two** — no box, no color, no accent
- **(2) Plain dwell `0.34s` (this card's key blank)**: nothing happens. This beat lets the audience read the three lines as one passage
- **(3) Last-line upgrade**:
  - Highlight box `scaleX 0 → 1`, `transform-origin: 50% center` (**spreading from the text center toward both sides**),
    `0.24s power3.out`. `#FFE949` @ `opacity 0.62` + `mix-blend-mode: multiply`
    (the marker token from design-language §1), irregular rounding `11px 5px 9px 4px / 6px 11px 5px 9px` simulating a pen stroke
  - **After the box lands** the text punches `scale 1.05 → 1`, `0.17s` (5 frames @30fps) `power2.out`,
    `transform-origin: 50% 50%`. Box first, text answers — reversed, it reads as "the text getting caught by the box"
- **(4) hold 2.2s**: the quote must dwell — the punch settling is this card's landing point, with no further action afterward
- **Total duration ledger**: `0.4 + (0.12×2 + 0.28) + 0.34 + 0.24 + 0.17 + 2.2` ≈ 3.9s

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `plainHold` | 0.34s | **The first key**: the last line's "plain" dwell; at 0 the box arrives with the text and the two beats collapse into one — the "the point is this line" progression vanishes (you get a pre-composed graphic); >0.8s the audience assumes the effect is over and the upgrade reads as a second effect |
| `lineStagger` | 0.12s | Three-line stagger; >0.2s reads as sentence-by-sentence slamming (upstaging the upgrade beat), <0.06s the block fades in as one (usable, but loses the reading order) |
| `hlDur` | 0.24s | Highlight-box spread duration; follows reading pace, <0.15s flickers like a bug, >0.45s the box is still growing while the narration has finished the line |
| Box `transform-origin` | `50% center` (center) | **The boundary between this card and `highlighter-sweep`**; change it to `left center` and it becomes "swept from the left" (reading-style underlining that follows the narration); spreading from center reads as "this whole line got boxed" (conclusive, formed in one go) |
| `punchScale` | 1.05 | Text punch start factor; <1.03 the accent doesn't register, >1.12 reads as the text trying to jump out of the box (box and text decouple) |
| `punchDur` | 0.17s (5 frames) | Punch duration; >0.3s reads as the whole line scaling (an animation, not an accent) — it must be short |
| Punch timing | **After** the box lands | **Never simultaneous with the box**; simultaneous reads as "the text getting caught by the box"; box first, text after is the causality of "boxed, therefore this line is heavy" |
| `hold` | 2.2s | Closing dwell; the quote's afterglow lives entirely in this stillness, <1.5s cuts away just as the audience finishes reading |

## Known Pitfalls
- **Multi-line needs a "block-level shell + inner inline-block" two-layer structure** (2026-08-27 production addendum): the highlight box must hug the text width,
  so the inner layer must be `inline-block`; but several inline-blocks **flow horizontally onto one line** (in testing, three quote lines collapsed into one).
  Wrap each line in an additional block-level div.
- The last line arriving with its box already on — **this card's most fatal mistake**. With the two beats collapsed into one, the audience reads a pre-composed graphic,
  and the "the point is this line" narrative disappears entirely (at that point you actually want `keyword-pop-highlight` or plain static typesetting).
- Box spread and text punch on the same frame — reads as "the text getting caught by the box." Box lands first, text answers after;
  that half-beat of ordering is the causality of "because it got boxed, this line is heavy."
- Making the box a solid inverted chip (yellow ground with white/black text covering the original) — that's **block language**
  (`alt-block-lines` / `slab-punch-title`), reading as "this line sits on a block";
  highlighter language is "the text is still on the paper; the paper got a stroke" — two entirely different narratives.
- Box without `multiply` (or layered above the text) — the yellow block crushes the black text to gray, turning "highlighting" into "redacting."
- Box with regular rounding / sharp corners — reads as a text selection or background color, not a pen stroke.
- Forgetting to change `transform-origin` to center (leaving the default or `left`) — that's `highlighter-sweep`'s
  "sweeping along with the narration"; this card wants the conclusive feel of "boxing this whole line in one go."
- Highlights/accents added to the first two lines as well — if all three lines are heavy, there is no point; this card's structure is "two setup lines + one conclusion line."
- Adding anything after the punch (arrow, underline, icon) — that 2.2s dwell is this card's landing point; adding anything fills in the afterglow.

## Reuse Guide
- HTML/GSAP: demos/quote-hold-arrow/index.html. **To change content, edit the three lines of `.qh-line` copy**
  (the last line's text goes inside `.qh-last-txt`; the box automatically follows its width).
  Tune the rhythm only via `plainHold` (the blank between the two beats — this card's energy knob) and `hold` (the afterglow).
  To make the box "sweep along with the narration":
  change `.qh-hl`'s `transform-origin` to `left center` — but that turns it into `highlighter-sweep`;
  don't mix the two styles in the same video.
- Remotion port: each of the three lines gets a `<Sequence from={Math.round(i*0.12*fps)}>`.
  The upgrade beat gets its own `Sequence from={upFrame}` (`upFrame = end frame of the three lines + Math.round(0.34*fps)`):
  the box uses `interpolate(f, [0, 7], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateRight: "clamp"})`
  driving `scaleX` + `transformOrigin: "50% center"`; the punch runs from frame 7 as
  `interpolate(f, [7, 12], [1.05, 1], {easing: Easing.out(Easing.quad), extrapolateLeft: "clamp", extrapolateRight: "clamp"})`
  (**neither clamp can be omitted** — without clamping, `f < 7` computes a scale >1.05, and the last line opens already enlarged).
  `mixBlendMode: "multiply"` renders correctly in Remotion.
- Editing-software equivalents: CapCut — three text layers each keyed with "position + opacity," each dragged 4 frames later;
  on the last line, **only after the first beat**, add a yellow rectangle sticker with "scale (horizontal)" keyframes,
  **anchor kept at center** (CapCut's default is center — for once that's correct) + blend mode set to "multiply";
  the punch is two "scale" keys on the last line's text layer (105% → 100%, 5 frames, ease-out).
  AE — the last line's text layer + a Shape Layer rectangle (`Scale` x from 0 to 100, anchor at center) + blend mode `Multiply`;
  separate the two actions on the timeline by `plainHold`'s frame count manually (the only alignment this card requires watching).
- Division of labor among this library's sibling cards:
  - `highlighter-sweep` = **just the highlighter stroke alone**, swept from the left (following the narration), for marking up long text/documents,
    without the "two-beat upgrade" structure.
  - `keyword-pop-highlight` = slamming **one word** in a sentence (word-level accent); this card emphasizes **a whole line**.
  - `quote-card` = the yielding ritual (panel + full-screen takeover + sentence-by-sentence slam); `quote-bracket-pull` = typographic quotation
    (quotation marks bracket a quotation zone, the whole passage equally weighted); **this card = of three lines, only the last upgrades** (with setup and a pivot).
  - One-line card picker: **marking a passage inside a document → highlighter-sweep; slamming one word → keyword-pop-highlight;
    elevating a whole quotation → quote-bracket-pull; "two setup lines landing on this one" → this card.**

## Scope
- Belongs to this card: **the last line's "plain first, upgrade later" two-beat structure** (the `plainHold 0.34s` blank in between is this card's essence); the three lines' `opacity` + `y +8→0` staggered fade-in at `0.12s` (in the first beat the last line is identical to the first two); the highlight box's `scaleX 0→1` spreading from **the text's center** (`0.24s power3.out`), sitting **beneath** the text with `multiply`, irregular rounding simulating a pen stroke, and the highlighter semantics of the text staying black; the causal ordering of the text punching only **after the box lands** (`1.05→1`, 5 frames); the discipline that the punch settling is the close, with `hold 2.2s` and no further action.
- Does not belong to this card: the demo's three specific quote lines and the last line "it's because you are stepping out of your comfort zone," the 33px size and 600 weight, the `#1d1d1f` ink, any coloring beyond `#FFE949`, the quote sitting on the left (right column yielded to the host), the right column's digital-host placeholder, the white-ground stage.
- Migration interface: the content entry point is the three lines of `.qh-line` copy (last line wrapped in `.qh-last-txt`); tune energy only via `plainHold` (the blank between the beats) and `hold` (the afterglow); `lineStagger` / `punchDur` are **feel constants — never touch them for size or speech-pace changes**; size references — the box's `left/right/top/bottom` outsets (12/14/4/4px) scale with font size, `lineRise 8px` scales with stage height; two color tokens — marker (`#FFE949` @0.62) and ink; for vertical video keep 3 lines but drop the size to 28px (box scales along).
- Background requirement: **a white ground suffices**. A dark ground also works, with two swaps: text inverts to `#f5f5f7`, and the highlighter's `mix-blend-mode` must switch from `multiply` to `screen` (on a dark ground, multiply multiplies the yellow block into black and the highlight box simply vanishes) — note that on dark + `screen` the yellow box gets noticeably brighter, so pull `opacity` from 0.62 down to about 0.45, otherwise the box outshines the text and reads as "the text smeared by light." The only constraint is that the background must have no pattern in the last line's area: the highlighter works because "translucent yellow × white ground = yellow"; over a pattern, the yellow block multiplies the pattern darker and reads as a stain.
