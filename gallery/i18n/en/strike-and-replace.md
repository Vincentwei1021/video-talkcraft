---
name: strike-and-replace
title: A semantic-colored horizontal line strikes through the old value 0→100%; the instant the stroke completes, the old value fades out and the new value rises from 8px below the same position to take its place — the replacement feel comes from "occupying the same position", container width is held open by an invisible ruler, and the rest of the sentence has zero displacement
usage: The high-frequency narration pattern "not A, but B" — correcting old beliefs, voiding old prices/old specs, version comparisons, debunking; moments when exactly one value in a sentence gets replaced
---

## Intent
This library's emphasis cards are all about **amplification** — `keyword-pop-highlight` slams an accent, `highlighter-sweep` paints a highlight,
`magnifier-detail` magnifies a detail, `focus-dim-spotlight` dims to focus, `callout-line-label` draws a leader line,
`scribble-annotation` circles by hand. They can make a word heavier, but **none of them can express "negation"**.

Yet "not A, but B" is an extremely frequent pattern in narration: old belief → new belief, old price → new price,
last generation's spec → this generation's spec, rumor → fact. In those moments, merely highlighting the new value isn't enough —
the audience needs to see **the old one being struck down**. This card's value lies exactly here: **the act of striking through is itself the argument**.
A line sweeps from left to right, and before you even finish saying "that claim is outdated", the audience has already accepted it.

Three vital points: ① **The new value must appear at the old value's position** (the two absolutely positioned and stacked in the same place) —
starting a new line or placing them side by side reads as "here are two data points"; the replacement feel comes entirely from "occupying the same position";
② **The semantic color goes only on the line**, text stays ink-colored — coloring the new value too steals the audience's attention with "the new value looks nice",
and the "old value struck out" beat gets lighter (this library's "one semantic color per frame" convention is especially fatal on this card);
③ **The container width must be propped open first** — typeset whichever of `from` / `to` is longer inside a `visibility: hidden`
"invisible ruler" placeholder, so the rest of the sentence has zero displacement when the value swaps. This rule is borrowed from the sibling `value-swap`, and it is the entirety of variant b.

## Motion Core
Three-phase structure (cut by proportion of total duration; `CONFIG.total` is the only duration knob):

| Phase | Progress | Action |
|---|---|---|
| Strike | 0 → 40% | Horizontal line `scaleX 0→1` (`transform-origin: left`, `power1.inOut`) |
| Swap | 40% → 60% | Old value `opacity 1→0` (`power1.out`); new value `opacity 0→1` + `y +8→0` (`power2.out`), **same position** |
| hold | 60% → 100% | Strike line and new value freeze together on screen so the audience can finish reading the "old → new" argument |

- **Strike uses `scaleX`, not `width`**: `transform-origin: left center` + `scaleX 0→1`.
  Animating `width` reflows every frame (the first item on this library's anti-pattern list), and inside an `inline-block` slot it drags the whole sentence into jitter
- **Line spec**: height = font size × 8% (32px font → 3px, scaling with font size), 2px border radius, semantic color (red `#e0452c` / orange).
  It is a **child node** of `.word.from` — when the old value fades out, the line goes with it, leaving no stray line pressing on the new value
- **Strike easing `power1.inOut`**: uniform speed reads as a progress bar; accelerate then ease off to feel like "a hand sweeping across".
  But **no overshoot** (`back` / `elastic`) — this is a correction, not decorative type; a bounce turns a serious negation into variety-show antics
- **Same-position stacking**: old and new values are both `position: absolute` inside the same `.slot`,
  CSS `left: 50%` paired with GSAP `xPercent: -50` — both anchored to the slot's centerline.
  Thus **the shorter value centers within the reserved width**: the margin propped by the ruler is split to both sides, reading as typographic whitespace;
  left-aligning would leave a glaring void at the tail (which viewers read as "a character is missing here")
- **Invisible ruler (the core of variant b)**: a `<span class="ruler">` containing whichever of `from`/`to` is longer, `visibility: hidden`.
  It props open the slot's width; both values are absolutely positioned out of flow ⇒ **zero displacement on swap**.
  The demo's sentence-ending clause serves as the witness: if the width-propping is wrong, it jumps sideways on the swap frame
- **New value rises 8px (≈ 20% of font size)**: direction is upward — "the new one pushes up from below". Coming down from above reads as "another one arriving", reversing the causality
- **`keepStrike`**: defaults to `true` (the strike line stays on screen — the argument's evidence remains);
  set `false` and the strike fades out with the old value, reading as "corrected, traces erased" — use when you only want to swap a value without emphasizing negation
- **Layering**: white stage → sentence (one line, `nowrap`) → replacement slot (`inline-block`, width set by the ruler) → {ruler / old value + line / new value}

**Variant b · value-swap (in-place value swap)**: the same skeleton with the strike phase removed; `from/to` becomes a `values[]` multi-value sequence,
with each swap point performing "old value floats up and fades out + new value rises in from below" (12px, `Easing.inOut(cubic)`, ~0.33s).
Suited to continuously jumping numbers (three pricing tiers, specs across generations, staged progress) — **no negation semantics**, only "the value at this position changed".
The shared discipline of both variants is the invisible ruler: however the values change, the container width is fixed once and the layout never shifts.

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `total` | 4.0s | The only duration knob (three phases cut proportionally); <2.5s the strike is too fast and the "negation" lacks process, >6s the audience waits for it to finish |
| `strikeEnd` | 40% | Strike's share of total duration; <25% the strike flashes by and reads as a flickering underline, >55% the swap is squeezed to the tail and the hold isn't long enough to read |
| Swap segment | 40%→60% (20%) | This 20% is the "replacement" beat; <10% reads as a hard character swap, >35% the two values sit half-transparent on top of each other for too long and smear together |
| Line height | font size × 8% | 3px @32px font; <5% it breaks up after 1080p scaling, >12% it becomes a color bar covering the text (that's a highlight, not a strikethrough) |
| Line radius | 2px | Square ends read as a code underline; rounded ends look like a pen stroke; >4px the line becomes a capsule on short values |
| `toRise` | 8px (≈ 20% of font size) | New value's rise distance; 0 reads as an in-place fade-in (replacement feel halved), >20px reads as "flying in from below" and steals the scene |
| Strike easing | `power1.inOut` | Uniform speed reads as a progress bar; **`back`/`elastic` forbidden** (a correction is not decorative type; a bounce reads as variety-show antics) |
| New-value easing | `power2.out` | Pushes up then settles; `back.out` makes the new value bounce, clashing with the "serious correction" temperament |
| `lead` | 0.35s | Opening rest waiting for the narration to reach this value; 0 means the strike has finished before the audience even sees what the old value was |
| `keepStrike` | `true` | Whether the strike line stays on screen; `true` = evidence remains (default, heavier negation), `false` = traces erased after correction |
| Semantic color | red `#e0452c` / orange | **Only on the line**; putting it on text steals the "struck out" beat |

## Known Pitfalls
- New value on a new line or beside the old value — reads as "here are two data points"; the replacement feel disappears; the two must be absolutely positioned and stacked at the same spot.
- Container width not propped by the invisible ruler — the rest of the sentence jumps sideways on the swap frame, an instantly visible bug; the longer of `from`/`to` must hold the space first.
- Short value left-aligned within the reserved width — a glaring void at the tail, which viewers read as "a character is missing here"; both values anchor to the slot's centerline.
- Animating `width` for the strike instead of `scaleX` — per-frame reflow; inside the `inline-block` slot it drags the whole sentence into jitter (first item on this library's anti-pattern list).
- Strike's `transform-origin` left at default center — the line grows from the middle toward both ends, reading as "a strikethrough is being inserted" rather than "a hand sweeping across".
- Making the strike a sibling of the slot instead of a child of the old value — after the old value fades, the line stays on screen, pressing on the new value (the new value looks struck out too).
- Semantic color applied to the new/old value as well — attention gets stolen by "the new value looks nice", lightening the "old value negated" beat; one semantic color per segment, and only on the line.
- Adding overshoot easing to the strike — a serious correction reads as variety-show antics, ruining the temperament entirely.
- New value dropping from above — causality reversed (reads as "another one arriving" rather than "the new one pushing up"); it must rise from below.
- Swapping the value immediately after the strike (no swap segment) — a hard character swap; the audience can't register "it was this value that got struck out".
- Replacing more than one value in a sentence — two strike lines fight each other and the audience doesn't know which negation to watch; one sentence negates one thing.
- Hold too short (<1s) — the argument's landing point is the frame with "strike + new value together on screen"; no time to read it equals no argument.
- Sentence allowed to wrap (no `nowrap`) — text after the replacement slot gets pushed to a second line, and the "zero displacement" discipline becomes invisible (the demo hit this: a too-long sentence sent the witness clause onto the next line).
- Used in an "addition/emphasis" context — this card's motion semantics are **negation**; using it to emphasize a correct value makes viewers think it's being struck out.
- **Stacked on top of the previous topic's full frame** (user verdict, 2026-08-28 v4) — a pivot line like "but this time it's not X" is **the opening move of the next shot**;
  this card must go on a cleared stage. Squeezing it into a corner of the old shot (say, a screen full of statistics) makes the strike collide with old content
  and kills the drama of the turn. Move the cut point forward to the start of the pivot line (cinematography.md §4.5, item 2).

## Reuse Guide
- HTML/GSAP: demos/strike-and-replace/index.html. **To change content, edit only `CONFIG.from` / `CONFIG.to`** plus the text before and after the replacement slot in the sentence template
  (the line inside `.sr-line`); the invisible ruler automatically takes the longer value — no manual width edits needed.
  Rhythm changes only via `CONFIG.total` (three phases cut proportionally). Change the semantic color via `.strike`'s `background`,
  line height via `.strike`'s `height` (keep = font size × 8%). For variant b (in-place swap, no negation), delete the strike tween
  and expand `from/to` into an array of sequential values — the skeleton (slot + ruler + same-position stacking) is fully reused.
- Remotion port: both original sources are very short, copy directly against them —
  `registry/remocn/strikethrough-replace/index.tsx` is this card's body (cut the three phases with `durationInFrames × 0.4/0.6`;
  where `linePct` sets `width: ${linePct}%`, change it to `scaleX` plus `transform-origin: left`),
  `registry/remocn/value-swap/index.tsx` is variant b (`sizer = values.reduce((a,b)=> b.length>a.length ? b : a)`
  is the invisible ruler, `at` receives multiple swap frame numbers, `opacity = pIn × (1 − pOut)` cross-fades adjacent values).
  Line width uses `Math.max(2, Math.round(fontSize * 0.08))`; new value `y = interpolate(frame,[fadeStart,fadeEnd],[8,0])`.
- Editing-software equivalents: Jianying/CapCut — old and new values as two text layers **aligned to the same position** (key: don't use a "stacked vertically" template),
  the strike as a 3px color-bar layer entering via "scale" or "wipe" (`transform-origin` on the left — in Jianying drag the anchor to the left end),
  old value's opacity 100→0 over 0.2s starting on the strike-complete frame, new value's position +8px→0 with opacity 0→100 starting on the same frame.
  AE — the line uses a Shape Layer's `Scale X` keyframes (Anchor Point dragged to the left end) or `Trim Paths` `End 0→100%` (cleaner);
  two text layers share the same Position with opposing opacity ramps; the AE equivalent of the invisible ruler is **laying out with the longest value first, then changing the text**
  (or parenting both layers to the same fixed-width Null).
- Division of labor with this library's emphasis cards: `keyword-pop-highlight` (slammed accent) / `highlighter-sweep` (painted highlight) /
  `type-contrast-emphasis` (typographic contrast) / `magnifier-detail` (magnification) / `focus-dim-spotlight` (dimming) /
  `callout-line-label` (leader line) / `scribble-annotation` (hand-drawn circling) are all **amplification**;
  **this card is the only "negation"**. It is never mixed in the same sentence with any of the above —
  a sentence containing both "a struck-out old value" and "a slammed accent" leaves the audience unsure whether the sentence affirms or negates.
  The sibling `number-counter` is "a number rising" (process); this card's variant b is "a value replaced" (result) — different semantics.

## Scope
- Belongs to this card: the three-phase time structure (strike 0→40% / swap 40~60% / hold 60~100%, cut by proportion of total duration); the strike via `scaleX` + `transform-origin: left` (rejecting `width` animation) and the line spec of height = 8% of font size / 2px radius; the mechanism of the old value fading out while the new value pushes up 8px from below, **absolutely positioned and stacked at the same position** (the entire source of the replacement feel); the implementation discipline of the strike being a child of the old value, fading out with it; the invisible ruler propping the container width to guarantee zero displacement on swap (the core of variant b, shared by both variants); the shorter value centering within the reserved width (both values anchored to the slot's centerline); the trade-off of "semantic color only on the line, text stays ink"; strike easing `power1.inOut` with overshoot forbidden.
- Does not belong to this card: the demo's specific sentence and figures, the 32px font size and 700 weight, the specific red `#e0452c` (orange works equally), the `#1d1d1f` ink color, the white stage, the host (digital human) placeholder on the left, and the "replacement slot mid-sentence" position (start or end of sentence works equally).
- Migration interface: `CONFIG.from` / `CONFIG.to` is the only content entry point (the ruler automatically takes the longer one); `total` is the only duration knob; `toRise` and line height scale proportionally with font size (20% / 8%) — these two ratios stay fixed across aspect changes; `keepStrike` toggles "evidence stays / erased after correction"; swap the semantic color for the brand's warning color, but **only ever on the line**; for portrait, shorten the sentence (at least 3~4 characters must remain after the replacement slot as the "zero displacement" witness, and the whole sentence must stay single-line `nowrap`); for continuously jumping multi-values, use variant b (remove the strike phase, `values[]` + multiple swap points).
- Background requirements: white/light backgrounds are best (ink text + semantic-colored line hold up on contrast). On dark backgrounds, swap text to light colors and the line to a brighter warning color (red on dark needs to be brightened a notch, or it smears into the dark background); all other parameters unchanged. **The background must have no horizontal texture** — the strike is a horizontally growing line, and a horizontally textured background makes the line's endpoint position illegible.
