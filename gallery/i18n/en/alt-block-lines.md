---
name: alt-block-lines
title: Two lines of a couplet each sit on their own color block, block widths hugging their text, the two lines staggered by 0.12s — each line's block expands from the left via scaleX over 0.26s, while the text uses clip-path to shrink its right-side crop from 100% to 0 with the same curve and duration, **lagging 2 frames** so it gets "swept" out by the block's right edge; the couplet relationship is expressed through same-structure inverted colors (block 1 solid with white text / block 2 white with black text + 1px gray outline)
usage: Two contrasting sentences in narration — "subtract first / then add", "not A / but B", "used to be X / now Y"; methodology-driven, editorially toned knowledge-space narration; also works as a two-line subheading
---

## Intent
The hard part of a couplet is **making two lines read as one group rather than two items**. The laziest approach is fading each line in with a slight stagger —
the result is that viewers read "a line of text, then another line of text", and the **contrast relationship** between the two sentences is left for the copy to explain by itself.

This card hands the relationship over to form, with two devices:
① **Same-structure inverted colors** — the block structure of both lines is identical (same corner radius, padding, font size, expansion motion),
only the light/dark polarity is flipped (block 1 solid + white text / block 2 white + black text + 1px gray outline).
"Same structure" makes them a group; "inverted colors" makes them a pair.
② **Block sweeps out the text** — the text does not fade in on its own; it is swept out by the block's right edge.
The two tracks share the same curve and duration, with the text lagging 2 frames, so viewers read **one** action (a band of color sweeps across and the text materializes behind it),
not two actions ("block expands + text fades in").

One critical rule: **the text must be "swept" out by the block (clip follows); the block and text are never allowed to fade in separately**.
In the version where the block and text each fade in, the block runs independently underneath the text and the text runs independently on top —
in slow motion you can see "the text is already there but the block hasn't reached it yet", and that frame is fake.
Clip-following guarantees the text's reveal edge **always trails the block's right edge**, which is physically plausible.

## Motion Core
- **Each line has two tracks, which are two halves of the same event**:
  - Track ① color block: `scaleX 0 → 1`, `transform-origin: 0% 50%` (**expands from the left**), `0.26s power3.out`
  - Track ② text: `clip-path: inset(0 100% 0 0) → inset(0 0% 0 0)` (right-side crop amount 100% → 0),
    **same curve (`power3.out`) same duration (0.26s)**, start lags by `0.067s` (2 frames @30fps)
  - The curve and duration of the two tracks must match exactly: change either one and the text's reveal edge will "drift away and catch back up" against the block's right edge,
    reading as two elements racing each other
- **The 2-frame lag is the entire feel of this card**: at 0 frames the text edge coincides exactly with the block's right edge (reads as the block itself carrying the text,
  like a text-baked color-block PNG expanding); at >5 frames the block has laid down a stretch while the text hasn't appeared (reads as "the block is one thing, the text another").
  2 frames keeps the text always "a bit inside the block" — physically, the lag of "the ink hasn't dried yet"
- **The two lines stagger by 0.12s**: below 0.08s the two lines read as one expansion (the couplet relationship is lost);
  above 0.25s the two lines break into two separate effects ("a line of text, then another line of text" — back to the very problem being solved)
- **Implementation discipline for same-structure inverted colors**: both lines share the full structure of `.ab-row` (padding / corner radius / origin / timing),
  with only two CSS rules differing — `.ab-row.a`'s block is solid + white text, `.ab-row.b`'s block is white + black text +
  `box-shadow: inset 0 0 0 1px #d8d8d8` (**use inset shadow rather than border**:
  border changes the element's box-model dimensions, the two lines' block heights would differ by 2px, and "same structure" is instantly broken)
- **Block width hugs each line's text**: `.ab-row` is `inline-block`, its width driven by the text.
  When the two lines differ in character count the block widths naturally differ — this is a compositional trait of the reference image (not a bug);
  equal-width blocks would read as "two cells of a table"
- **Both blocks left-aligned**: `.ab-stack` uses `align-items: flex-start`. Left alignment is the skeleton of "two sentences in parallel";
  center alignment turns the two blocks into a centered graphic group (reads as a logo, not a couplet)
- **Three-layer DOM**: `.ab-row` (relative positioning + padding) → `.ab-bg` (absolutely positioned, fills the row, the only element receiving `scaleX`)
  + `.ab-t` (relatively positioned above the bg, the only element receiving `clip-path`).
  The two animated properties act on two different elements without interfering
- **Layering**: white stage → the two-line flex column → per line: block bg (bottom z) → text (upper z, clipped)
- **The accent color goes only on the first block**: `#0aa3a3` (teal family from the reference image). The second block is white with a gray outline and black text —
  the whole card has exactly one colored element

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `textLag` | 0.067s (2 frames) | **The card's critical rule** — the text's lag behind the block; at 0 the block and text edges coincide (reads as a color-block PNG expanding), at >0.17s the block lays a stretch before the text appears (block and text become two separate objects) |
| `dur` | 0.26s | Per-line expansion duration (shared by block and text), the energy knob; <0.16s reads as a hard-cut reveal (the "sweep" action disappears), >0.4s the viewer waits for one line to finish opening while narration has already reached the second sentence |
| Easing | `power3.out` (same curve on both tracks) | Block and text **must share one curve**; power3 on the block and power2 on the text makes the two edges visibly drift apart and catch up, reading as a race |
| `rowStagger` | 0.12s | Stagger between the two lines; <0.08s the two lines read as one expansion (couplet relationship lost), >0.25s they break into two separate effects |
| Two-line gap | 16px (≈24% of font size) | Vertical spacing between the blocks; <12% of font size the blocks fuse into one color-block cluster, >45% of font size they read as two independent titles |
| padding | 11/24/13 px @66px | How much the block outsizes the text; horizontal <14px the text hugs the block edge (looks cropped), >34px the block feels empty like a color strip; bottom 2px more than top (Chinese glyphs' visual center of gravity sits high) |
| Outline (block 2) | `inset 0 0 0 1px #d8d8d8` | The white block's boundary; **must use inset shadow, not border** (border alters the box model, making the two lines' block heights differ by 2px); remove it and the white block has no boundary on the white background — the second line reads as "no block" |
| `hold` | 1.8s | End freeze — **a couplet needs a long hold**; both lines must be read for it to become a "couplet"; <1.2s the viewer only reads the first line |
| Character count | 3–6 characters per line | The two lines may differ in count (block widths follow — that's a compositional trait); >7 characters the block grows past the safe area, and the couplet's sense of symmetry disappears |

## Known Pitfalls
- Block and text fade in separately (skipping clip-following) — in slow motion you can see "the text is already there but the block hasn't reached it yet"; instantly fake, and it's two effects instead of one.
- Text uses `opacity` to fade in character by character from the left (trying to simulate the "sweep") — per-character reveal is discrete while the block's right edge is continuous; the two can never line up. `clip-path` is the only implementation that matches.
- Block and text use different easings or different durations — the text's reveal edge "drifts away and catches back up" against the block's right edge, reading as two elements racing.
- Lag set to 0 (text and block edges coincide exactly) — reads as a text-baked color-block PNG expanding; the "swept out" action disappears.
- Block animated with `width: 0 → 100%` instead of `scaleX` — changing width reflows every frame, the text inside the block gets squeezed around frame by frame (and the clip's reference frame is also moving, so the combined result makes the text twitch).
- Block expands from center (`transform-origin: 50% 50%`) — that is the language of `slab-punch-title`, and when expanding from center the "right edge" moves right while the left edge moves left, so clip-following (which only crops the right side) can no longer match.
- Second line's white block uses `border: 1px` instead of `inset box-shadow` — border participates in the box model; the second line's block ends up 2px taller and 2px wider than the first, instantly breaking "same-structure inverted colors".
- Making the two blocks equal width (fixed width or `align-items: stretch`) — reads as two cells of a table, not two sentences.
- Center-aligning the two blocks — they become a centered graphic group (reads as a logo); the skeleton of "two sentences in parallel" collapses.
- Both lines using solid color blocks (only swapping hue, e.g. teal block + orange block) — violates the single-accent-color red line, and two solid blocks read as "two labels" rather than a pair; inverted polarity (solid/hollow) is what makes a "pair".
- Second line's black text swapped for gray (trying to make it "weaker") — the two sentences of a couplet are **equals**, not primary and secondary; gray text instantly reads as "an annotation".
- `rowStagger` pushed above 0.3s with a long hold — too much empty time between the lines; the viewer finishes the first line and starts waiting, and when the second arrives it is no longer a "couplet" but a "supplement".

## Reuse Guide
- HTML/GSAP: demos/alt-block-lines/index.html. **To change copy, edit two spots in the HTML** (the two `.ab-t` elements, 3–6 characters each) —
  block width is driven by the text automatically, and the two lines may differ in length.
  To change the accent color, edit one spot: the `background` of `.ab-row.a .ab-bg` (teal `#0aa3a3` / purple `#7A5AF8` / red `#e0452c`, any of these).
  To change the font size, edit `.ab-t`'s `font-size`, and proportionally adjust `.ab-row`'s padding and `.ab-stack`'s `gap` (about 24% of font size).
  Energy is tuned only via `dur`; `textLag` (2 frames) and `rowStagger` (0.12s) are feel constants — do not touch them when changing size or speech pace.
  **Adding a third line**: simply add another `.ab-row` inside `.ab-stack` (the script auto-iterates over `[data-bg]`/`[data-t]`,
  and the stagger sequence is computed at runtime) — but three or more lines is no longer a "couplet"; semantically you should switch to `line-by-line-slide`.
- Remotion port: `clip-path` is fully usable in Remotion (Chromium) — build it with a template string:
  `clipPath = "inset(0 " + (100 - p * 100) + "% 0 0)"`, where
  `p = interpolate(f, [start + 2, start + 2 + 8], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft:'clamp', extrapolateRight:'clamp'})`.
  30fps conversion: `lead 12f`, `dur 7.8f≈8f`, `rowStagger 3.6f≈4f`, `textLag 2f`.
  **The block and text must share the same `easing` constant** (hoist it into a `const EASE = Easing.out(Easing.cubic)` passed to both places) —
  that is the implementation guarantee of "one single event". Block: `transform: scaleX(...)` + `transformOrigin: '0% 50%'`.
  `extrapolateLeft: 'clamp'` cannot be omitted — without clamping, the second line computes `inset(0 130% 0 0)` before its own start,
  and negative-width clip behavior in Chrome is undefined.
- Editing-software equivalents: Jianying/CapCut — build each line as two layers, "color-block sticker + text layer";
  keyframe the block's "scale" X channel 0 → 100 (anchor set to the left edge — in Jianying change it under "Edit → Anchor");
  apply a **"Mask — Linear"** to the text layer (rotate the mask 90° into a vertical edge) and keyframe the mask position sweeping from right to left,
  starting 2 frames after the block with the same duration. Duplicate the whole group for the second line, offset it 4 frames, and swap the block for the white outlined variant.
  **Do not use Jianying's "wipe" entrance preset** — it wipes the entire layer and cannot produce the "block underneath, text on top, text following the block's right edge" relationship.
  AE — color-block layer `Scale` X channel 0 → 100 (`Anchor Point` moved to the left edge);
  text layer gets `Linear Wipe` (`Wipe Angle` 270°, `Transition Completion` 100 → 0),
  both layers' keyframes using **the same set of Easy Ease** with the text layer shifted 2 frames later overall; make the two lines two precomps, the second offset 4 frames.
- Division of labor with sibling cards in this library: `slab-punch-title` = one setup line + one payoff line, with the block **expanding from center** and the text **slamming** out (the semantics is the weight of a conclusion);
  `highlighter-sweep` = a highlighter sweeping across text **already on screen** (text first, color after; the block sits under the text and is semi-transparent);
  `line-by-line-slide` = multiple lines sliding in sequentially (lists/paragraphs of 3+ lines, no blocks, no inverted colors);
  `type-contrast-emphasis` = hitting the stress within one sentence via typeface character (no blocks);
  **this card = visualizing the contrast relationship of two sentences**, characterized by "same-structure inverted colors" + "block sweeps out the text";
  it does not do emphasis (the two sentences are equals) — it does **relationship**.

## Scope
- Belongs to this card: the discipline that the text must be "swept" out by the block's right edge — `clip-path: inset()` and the block's `scaleX` on the **same curve, same duration, lagging 2 frames** (`textLag 0.067s`, the "ink not yet dry" magnitude); the block's `transform-origin: 0% 50%` left-origin expansion direction; the two lines' `0.12s` stagger (the window between "one group" and "two items"); same-structure inverted colors expressing the couplet relationship (both lines share all structural parameters, only light/dark flipped; the white block uses **inset shadow rather than border** to keep the box model identical); block widths each hugging their text (unequal widths across lines is a compositional trait) + both blocks left-aligned; the three-layer DOM division of labor (padding layer / the only scaleX'd bg / the only clipped text); the `hold 1.8s` duration discipline of "a couplet must hold until both lines are read".
- Does not belong to this card: the demo's specific copy "subtract first / then add", the 66px font size and 700 weight, the teal `#0aa3a3` (any color in the family works), the white block outline's gray value `#d8d8d8`, the `padding: 11/24/13` pixel set and 4px corner radius, the 16px gap between lines, the host (digital human) placeholder on the right, and the placement of "two lines landing in the left white area, 82px left margin, vertically centered" (lower third or centered both work).
- Migration interface: the content entry point is two plain-text strings (3–6 characters each, counts may differ); block width auto-hugs so no width measuring is needed; energy is tuned only via `dur` (0.16–0.4s); `textLag` (2 frames) and `rowStagger` (0.12s) are feel constants — do not touch them when changing size or speech pace; when changing font size, scale `font-size`, `.ab-row`'s padding, and `.ab-stack`'s `gap` (24% of font size) by the same ratio; changing the accent color edits only `.ab-row.a .ab-bg`; set `hold` by the two lines' total character count (about 0.2s per character, and no less than 1.2s); the line count can extend to 3 (the script auto-iterates) but semantically it is then no longer a couplet; for vertical video, reduce font size to 48–56px (this card has no horizontal push-crowding; the only constraint is that the longer line's block must not exceed 88% of the available width).
- Background requirements: a white background suffices — **the second line's "white block with black text" depends on the white background to work** (it uses the background color itself as the block, with the 1px gray outline drawing its boundary). On a dark background this inverted pair must be rebuilt wholesale: block 1 keeps accent color + white text, block 2 becomes "background-matched dark + white text + 1px bright outline" (i.e. the same solid/hollow contrast done on the dark background). **Gradient backgrounds and live-action busy backgrounds do not work**: the white block's boundary depends on the 1px gray outline, and any high-frequency detail in the background will swallow that line, making the second line read as "no block".
