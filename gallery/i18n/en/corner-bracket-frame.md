---
name: corner-bracket-frame
title: Two L-shaped corner brackets, top-left and bottom-right, translate in 20px from their respective outer diagonal directions **on the same frame**; the frame stands still for 0.22s before the two title lines fade in and float up with a 0.1s stagger, then everything holds perfectly still
usage: The "this episode covers exactly one thing" topic-setting moment of a narration — opening a thesis, chapter subheadings, "framing" one sentence out of the narration flow; restrained, viewfinder-like tones (knowledge channels, industry analysis, documentary-style voiceover); not for punchline sentences that need a heavy hit
---

## Intent
The most common failure in narration is "every sentence weighs the same" — after 30 seconds the viewer doesn't know which sentence is the thesis.
This card solves **drawing a boundary around one sentence**: the moment the brackets appear, the viewer knows "the sentence inside the frame is this section's topic".

It and the four-corner viewfinder are **two different languages**: four corners carry "viewfinder/monitor" semantics (what is being watched),
two diagonal brackets carry "selection/quotation" semantics (this block is the point). The library's other emphasis cards all signal
**words** (`keyword-pop-highlight` slams a stress, `highlighter-sweep` sweeps a highlighter,
`ink-underline` draws an ink line); this card is the only one that draws a boundary around a **whole block**.

Three vital constraints:
① **The two Ls must enter on the same frame with the same curve**. Diagonal symmetry is this composition's entire skeleton; a 0.05s stagger is enough to read
"one arrived first, one after", turning them into two independent elements drifting in — the framing relationship instantly falls apart.
② **Draw only two corners, with equal arm lengths**. Three corners, four corners, unequal arms — all three drop it
from "selection" back to "decorative corner trim".
③ **The frame stands first, the text enters after**. Frame and text fading in together read as one PNG; the frame arriving 0.22s early and then receiving the text
is what reads as "I mark the boundary first, then place the words inside".

## Motion Core
- **Structure**: an invisible box (470×200 @960×540 stage) positioned in the left blank area,
  with a 54×54 L placed at only the top-left / bottom-right corners (`border-left + border-top` / `border-right + border-bottom`,
  4px stroke, the sole accent color); the two title lines sit 34px inside the frame's left edge
- **① Bracket entrance**: `opacity 0→1` + translation along the outer diagonal. Top-left bracket starts at `(x:-20, y:-20)`,
  bottom-right at `(x:+20, y:+20)` — **the two share one tween** (`gsap.to([tl, br], ...)`),
  guaranteeing same-frame at the code level; `0.3s power3.out`
- **② Title lines**: `opacity 0→1` + `y +6→0`, each `0.3s power2.out`, staggered `0.1s`;
  start point = bracket start + `0.22s` (when the brackets are ~73% done, the frame's shape is already legible)
- **③ hold 1.7s**: everything still once drawn. No line boil / stop-motion jitter (design-language §4)
- **No underline/arc under the title** (user-finalized 2026-08-25): the brackets have already drawn the boundary;
  adding a horizontal line is a second "divider" signal, and the two signals fight; this card has only the single "frame" action
- **Layering**: white base → host (right column, demo context) → brackets and title (same layer)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `brTravel` | 20px | Bracket entrance travel along the diagonal; 0 = fade-only (losing the "gathering in from offscreen" viewfinder feel), >40px reads as brackets flying in and stealing the title's scene |
| `brIn` | 0.3s | Bracket entrance duration; <0.18s reads as popping in (the frame's "closing in" is invisible), >0.5s viewers wait for the frame to settle while the narration has moved on |
| Arm length | 54px (≈ 27% of frame's short side) | **Both arms must be equal**; shorter than 15% of the short side reads as decorative corner bits, longer than 40% nearly closes into a full frame (that's `outline-box-title`'s language) |
| Stroke width | 4px @540 stage height | Thinner than 2.5px drops out after compression; thicker than 6px the brackets outweigh the title — hierarchy inverted |
| `linesAt` | 0.22s | **How long the frame stands first — this card's third vital constraint**; 0 = frame and text enter together (reads as one PNG), >0.5s the dead beat feels like a stall |
| `lineStagger` | 0.1s | Two-line stagger; 0 = both lines fade together (usable but flatter), >0.25s reads as two independent motions |
| `lineRise` | 6px | Title float-up distance; 0 loses a bit of weight, >16px the sense of direction overwhelms "entering the frame" |
| `hold` | 1.7s | Final hold, sized to the two lines' character count (about 0.13s per character, plus half a beat after reading) |

## Known Pitfalls
- Brackets entering staggered — instantly reads as two independent elements drifting in; the diagonal-symmetry skeleton simply vanishes.
- Drawing four corners as a "viewfinder" — the semantics change ("what is being watched" instead of "this block is the point"), and four corners are very noisy on white.
- Unequal arm lengths (one long, one short) — reads as a crooked decoration, not a framing symbol; equal arms are the precondition for the L to become a "symbol".
- Frame and title fading in together — the whole group reads as a pre-baked PNG slapped on; the entire "I mark the boundary first" meaning is lost.
- Rounding the bracket corners — the L's right angle is its semantics (aligned, precise, machine-drawn); round it and it becomes a hand-drawn parenthesis.
- Brackets and title in two different colors — a second "look here" color on screen (design-language §1 red line); the brackets must be the sole accent color.
- **Adding an underline/arc under the title — removed by user decision 2026-08-25**. The brackets have already drawn this block's boundary;
  another horizontal line below is a second "divider" signal; with both on screen, the "selection" semantics get diluted,
  and the arc's hand-drawn feel directly clashes with the L brackets' machine precision. If you want an underline, use `ink-underline` (a different card).
- Adding drift/breathing to the brackets during the hold — the brackets are a precise framing symbol; once they move they become "out of alignment".

## Reuse Guide
- HTML/GSAP: demos/corner-bracket-frame/index.html. Change copy via the text in `.cb-line.l1 / .l2`;
  frame size via `.cb-frame`'s `width/height` (leave 30px of breathing room around the text block on all sides);
  accent color via the single `:root --acc` variable (bracket-only); rhythm all in `CONFIG`
  (`brTravel`/`brIn`/`linesAt`/`lineStagger`/`hold`).
- Remotion port: both phases fit in two groups of `interpolate` inside one `Sequence`, no timeline needed.
  Brackets: `x = interpolate(f, [0, 9], [∓20, 0], {easing: Easing.out(Easing.cubic), extrapolateRight:"clamp"})`,
  passing **the same f range** to both brackets (the same-frame guarantee); title lines use `f - i*3` as a local clock.
  Frame conversion @30fps: `brIn 0.3s ⇒ 9f`, `linesAt 0.22s ⇒ 7f`, `lineStagger 0.1s ⇒ 3f`.
- Editing-software equivalents: JianYing/CapCut — there's no ready-made "diagonal brackets"; use two "border" stickers, each keyframed on
  position + opacity, and **both stickers' keyframes must sit on the same frame** (alignment in JianYing relies on snapping —
  double-check it).
  AE — two shape layers each drawing an L (Rectangle stroke + Trim Paths at 25%, or simply two Strokes),
  parented to one Null that moves Position for both brackets simultaneously (the most reliable way to guarantee "same frame").
- Division of labor with same-family cards: `outline-box-title` = a fully closed stroked box (selecting a phrase, machine-drawn all the way around);
  `focus-dim-spotlight` = emphasis by dimming the surroundings (subtraction); `highlighter-sweep` / `ink-underline` /
  `scribble-annotation` = hand-drawn signals on words; `callout-line-label` = a leader line pointing to a spot in the frame;
  **this card = drawing a boundary around a block of content** (two diagonal corners, viewfinder/quotation semantics, the lowest-energy tier of "framing").

## Scope
- Belongs to this card: the "same frame, same curve" discipline of the two L brackets **sharing one tween**, translating 20px along their outer diagonals + fading in (0.3s `power3.out`); the shape discipline of drawing only **two diagonal** corners with equal arms; the frame standing 0.22s before the text enters; the two title lines' `opacity + y+6→0` staggered 0.1s; **no underline/arc of any kind under the title** (user-finalized 2026-08-25: the brackets are the sole boundary signal); complete stillness during the hold (no drift, no line boil).
- Does not belong to this card: the demo's specific copy (the two lines about "one idea / one thing explained clearly"), the 52px/700 font size and weight, the teal `#0aa3a3` value (the **position** of the sole accent belongs to the card, the value doesn't), the 470×200 frame size and 54px arm length as absolute pixels, the right-side host (digital human) placeholder, and the composition of placing the title in the left blank area (centered, right side, or upper half in vertical all work).
- Migration interfaces: one accent variable `--acc` (bracket-only; no second one allowed on screen); recompute frame size with 30px breathing room around the text block, arm length at 25~30% of the frame's short side, stroke width at 0.7% of stage height; rhythm lives in `CONFIG`, with the energy tier adjusted only via `brIn` and `brTravel` (move them together: larger travel should be slower); `linesAt` is a **feel constant** (the 0.22s the frame stands first) — don't touch it when changing sizes or speech pace; size `hold` to the title's character count (about 0.13s per character). For vertical formats put the frame in the top third at 80% of frame width, recomputing arm length from the new short side.
- Background requirements: white works. Dark backgrounds work equally (swap the brackets to the dark-mode accent, `#2997ff` family, and invert the title to white). The only constraint is that **the background must not have high-frequency detail** — the L brackets are just two 4px lines and will get eaten on a busy background; in that situation either thicken to 6px or lay a light backing plate first.
