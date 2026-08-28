---
name: outline-box-title
title: A rounded outline box draws itself **around in one stroke** along its path (0.42s near-constant speed, closing precisely with no overshoot); once the box closes, a solid chip expands from the left via scaleX over 0.2s with its white text fading in on a lag, and finally three chevrons light up in sequence
usage: The "my core point is…" moments in narration — **framing a conclusion**: stating a thesis, defining a term, marking a phrase as terminology; rational, orderly, clause-like tonality (industry analysis, product explainers, tutorials); not for emotional peaks or hand-drawn-styled pieces
---

## Intent
When the narration reaches "the core point," the audience needs an **explicit container** — not emphasis on a word, but the declaration
"the next few words are this segment's conclusion." The outline box provides exactly that container feel.

This card's entire character hinges on one thing: **the box is machine-drawn**.
`hand-drawn-ellipse` (the hand-drawn circle) and this card both look like "a line enclosing a phrase,"
but the semantics are opposite — the hand-drawn circle is **a person circling a highlight on paper** (overshooting crossings, varying weight, brush texture),
the outline box is **a system box-selecting in an interface** (near-constant speed, precise closure, uniform corners, constant stroke weight).
Mixing the two (say, giving the outline box an overshooting tail) makes the whole piece's character ambiguous: neither handcrafted nor interface.

The second design layer is the **box → chip inverted-color couplet**: the first phrase "core point" sits in an **empty box** (light — the container),
the second phrase "right here" sits on a **solid chip** (heavy — the landing point). Two uses of the same accent color draw
the "point → location" sentence structure directly onto the screen.

Three critical rules:
① **The box must be `power2.inOut` near-constant speed, closing precisely**. Using `power3.out` (fast start, slow tail)
reads as "a loop flung by hand," and the language goes off-flavor.
② **The chip enters only after the box has closed**. Entering together reads as two color blocks drifting in, losing the progression of
"box-selection complete → location given."
③ **The chevrons light up from 0.25 to 1, not fading in from 0**. Their semantics are "direction hints that were always there,
being lit up in sequence"; appearing from 0 reads as three decorations drifting in.

## Motion Core
- **Structure** (@960×540 stage): first row a 356×104 container holding 56px/700 ink text +
  a same-size SVG rounded-rectangle outline box (4px stroke, the single accent color, corner radius 14px);
  second row a 260×66 solid chip (`border-radius: 12`, the small-element radius tier) + 40px/700 white text;
  below, three 26×34 chevrons (`>` polylines, 5px stroke with `round` caps)
- **① Box-select**: the SVG path starts from **the top edge, left of center** (`M 34 2`), clockwise H → corner → V → corner →
  H → corner → V → corner → `Z` precise closure; `stroke-dasharray = len`,
  `stroke-dashoffset len→0`, `0.42s power2.inOut`.
  The start point is deliberately not at a corner — starting at a corner reads as "two edges growing simultaneously"; starting mid-edge reads as "one stroke around"
- **② Chip expand**: `transform-origin: left center`, `scaleX 0→1`, `0.2s power3.out`,
  starting at box closure + `0.04s` (nearly seamless, no dead beat);
  chip's white text `opacity 0→1` (`0.16s`), lagging the chip by `0.1s` —
  the chip is an independent background layer (`.ob-chip-bg`) and the text does not participate in scaleX (or the text gets stretched flat horizontally)
- **③ Chevrons light up**: `opacity 0.25→1` + `x +4→0`, each `0.16s power2.out`, staggered `0.08s`;
  starting at chip landing + `0.06s`
- **④ hold 1.6s**: everything still. No line boil / stop-motion jitter (design-language §4)
- **Layers**: white background → presenter (right column, demo context) → text → outline-box SVG / chip → chevrons

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `boxDur` | 0.42s | The box's full loop; <0.25s reads as "the box flashed on" (the drawing process invisible, effectively a hard appearance), >0.7s the audience watches a line crawl while the narration has moved on |
| Box easing | `power2.inOut` | **This card's first critical rule**; swap to `power3.out` and it instantly reads as a hand-flung loop (hand-drawn language); `linear` is also fine (more machine); `back` / `elastic` are strictly forbidden |
| Stroke start point | Top edge, left of center (`M 34 2`) | Starting at a corner reads as "two edges growing"; starting mid-edge is "one stroke around"; the closer to a corner, the weaker the machine feel |
| Stroke width | 4px @540 stage height | Thinner than 2.5px drops out under compression; thicker than 6px the box outweighs the text — the container upstages the content |
| Box corner radius | 14px | 0 (square) reads as a table cell; >24px becomes a pill (button semantics, not box-selection) |
| `chipGap` | 0.04s | **The gap from box closure to chip start, this card's second critical rule**; 0 also works (tighter join), but **never negative** (the chip appearing before the box closes is two motions colliding), >0.3s leaves an obvious dead beat |
| `chipDur` | 0.2s | Chip expansion; <0.12s reads as a hard appearance, >0.35s is as long as the box's 0.42s and the two beats collapse into one |
| `chipTxtLag` | 0.1s | The chip text's lag; 0 = the text gets "swiped" out along with the chip (the layering collapses into one event), >0.25s reads as the chip sitting empty waiting for text |
| `chevDim` | 0.25 | **Chevron starting opacity, this card's third critical rule**; 0 reads as three decorations drifting in, >0.45 the light-up contrast is too weak (the "in sequence" is invisible) |
| `chevStagger` | 0.08s | Chevron stagger; <0.05s the three fire nearly together (reading as one unit), >0.15s reads as three independent effects queuing up |
| `hold` | 1.6s | Closing hold, budgeted by the total characters in the box + chip (about 0.2s per character) |

## Known Pitfalls
- Box drawn with `power3.out` or `back.out` — instantly reads as a hand-flung loop; the "machine box-selection" semantics vanish and it collides with `hand-drawn-ellipse`'s language.
- Box overdrawn (tail passing the start point) — that's the hand-drawn circle's move; the slightest overshoot on an outline box looks "misaligned," not handcrafted.
- Starting the stroke at a corner — the audience sees "two edges growing simultaneously" and can't read "one stroke around."
- Box and chip entering together — two color blocks drifting in at once, the "box-selection complete → location given" progression disappears, and the group reads as one PNG.
- Chip text scaling with the chip's `scaleX` — the text gets stretched flat horizontally, glaring in slow motion; the text must be an independent layer above the chip background.
- Chip without `overflow: hidden` (or text not on its own layer) — mid-expansion the text is already showing outside the chip, reading as "text arrived first, block chasing after."
- Chevrons fading in from `opacity 0` — reads as three decorations drifting in; their semantics are "already there, being lit up."
- Chevron stagger over 0.15s — reads as three independent effects queuing; the single event of "a sweep lighting them up" gets split into three.
- Box in one color, chip in another — a second "look here" color on one screen (design-language §1 red line); box / chip / chevrons must share the single accent color, with contrast built from "empty box vs. solid."
- Box and chip corner radii from different tiers — mixing two radius grammars on one screen (design-language §6 Don't); box 14 / chip 12 are the same tier (small elements) — a 2px difference is a size difference, not a grammar difference.
- Adding breathing/drift to the box during hold — a machine-drawn box that moves becomes "misaligned."

## Reuse Guide
- HTML/GSAP: demos/outline-box-title/index.html. To change copy, edit `.ob-row1 .txt` and `.ob-chip-txt`,
  **and also** change the `width` of `.ob-row1` / `#obBox` and the `d` of `#obBoxPath` (the box is a fixed-size
  path that does not adapt to the text — deliberately: the box's size is a layout decision and shouldn't jitter with text width);
  chip width via `.ob-row2`'s `width`; change the accent color only via `:root --acc` (shared by box + chip + chevrons);
  rhythm all in `CONFIG` (`boxDur`/`chipGap`/`chipDur`/`chipTxtLag`/`chevDim`/`chevStagger`/`hold`).
  When resizing the box, the `d` formula: `M {r+20} 2 H {w-r} A {r} {r} 0 0 1 {w-2} {r+2} V {h-r} … Z` (`r` = corner radius).
- Remotion port: `strokeDasharray={len}` + `strokeDashoffset={interpolate(f, [0, 13], [len, 0],
  {easing: Easing.inOut(Easing.quad), extrapolateRight: "clamp"})}` — `len` must be **pre-measured and written as a constant**
  (no `getTotalLength()` in SSR; measure once in a browser, or estimate via the perimeter formula `2(w+h) - 8r + 2πr`).
  Chip via `scaleX` + `transformOrigin: "left center"`; chip text with its own `interpolate` opacity.
  The three chevrons use an `f - i*2` local clock. Frame conversions @30fps: `boxDur 0.42s ⇒ 13f`, `chipDur 0.2s ⇒ 6f`,
  `chipTxtLag 0.1s ⇒ 3f`, `chevStagger 0.08s ⇒ 2~3f`.
- Editing-software equivalents: AE — Shape Layer rounded rectangle (stroke only, no fill) + `Trim Paths`,
  `End` from 0→100%, **set `Offset` so the start point lands mid-top-edge**, easing with `Easy Ease` on both ends
  (F9 is very close to `power2.inOut`); chip as a Shape Layer + `Scale`'s X component 0→100%
  with the anchor moved to the left edge. JianYing/CapCut — "border" stickers can only fade/scale as a whole, **can't draw along a path**;
  the compromise is two "linear wipes" on the border sticker (horizontal then vertical) or accepting a "whole-box fade"
  (losing this card's first critical rule; it degenerates into an ordinary boxed title); chip as a color block with a "expand right" entrance.
- Division of labor with sibling cards in this library: `corner-bracket-frame` = draws only two diagonal corners (framing/quoting, not closed, lower energy);
  `hand-drawn-ellipse` (group B) = a hand-drawn ellipse circling a highlight (overshooting crossings, brush texture — a person circling);
  `info-term-card` = a term card appearing as a block; `quote-card` = a full quoted passage;
  `chapter-title-card` = chapter-level full-screen title;
  **this card = a machine-drawn "box-select a phrase" + an inverted-color chip giving the landing point** (the interface-feel, clause-feel tier).

## Scope
- Belongs to this card: the outline box drawn around via path `dashoffset`, `power2.inOut` near-constant speed, **precise closure with no overshoot**, stroke starting mid-edge not at a corner — these four together constitute the "machine-drawn box-selection" language (this card's core asset); the sequencing that the chip's `scaleX 0→1` expansion (origin left) comes **after** the box closes (`chipGap ≥ 0`); the chip text lagging the chip by `0.1s` and **not participating in scaleX**; the chevrons lighting from `0.25` to `1` + `x+4→0`, staggered `0.08s` as a "sequential sweep"; the layering relation of "empty box (container) + solid chip (landing point)" as an inverted-color couplet in the same accent color; everything still during hold.
- Does not belong to this card: the demo's specific line "core point / right here", the 56px and 40px font sizes, the specific purple `#7A5AF8`, the 356×104 and 260×66 absolute box/chip sizes, the chevrons' specific shape (`>` polylines swappable for triangles or arrows) and count (2~4 all work), the host (digital human) placeholder on the right, the composition placing the group in the left whitespace.
- Migration interface: one accent variable `--acc` (shared by box + chip + chevrons; no second one allowed on screen); box size = text width + 30px air on each side, `#obBoxPath`'s `d` rewritten accordingly (formula in the Reuse Guide), corner radius 12~16px, stroke width 0.7% of stage height; chip width = text width + 26px each side; rhythm in `CONFIG`, energy tier tuned only via `boxDur` (the slower the box draws, the more "solemn"); `chipGap`/`chipTxtLag`/`chevDim` are **feel constants — never touch them for size or speaking-pace changes**; budget `hold` by total character count (about 0.2s per character). For portrait, place the group in the top third, box width at 80% of the frame, and the chevrons can drop to two.
- Background requirement: white works. Dark works (box / chip / chevrons swapped to the dark-mode accent `#2997ff`, the first row's text inverted to white, chip text staying white — here the chip's contrast against the background rests on the accent's own luminance). The only constraint is **no high-frequency detail in the background**: a 4px outline gets eaten on a busy background; in such cases lay a light backing panel underneath first — don't fix it by thickening the stroke (a thicker stroke makes the box outweigh the text).
