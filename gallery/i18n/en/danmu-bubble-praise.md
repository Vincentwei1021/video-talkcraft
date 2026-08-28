---
name: danmu-bubble-praise
title: Four comment bubbles drift in from their nearest edge at a 0.55s stagger, each lingering only 0.75s before rising 18px and fading out — entrances and exits overlap so that by the time the 3rd enters the 1st is already leaving, and only one of the four carries the accent color
usage: When the narration says "the comments all say this" or "the most common feedback is exactly this point"; opening proof that the content has consensus; the setup before a closing call-to-interact; community-feel, light-paced narration (knowledge channels, reviews, lifestyle)
---

## Intent
"Everyone's saying it" is the line most likely to ring hollow in narration — the mouth claims consensus while the picture shows nobody speaking.
Comment bubbles turn that line into visible **crowd presence**: four short comments by other people drift across the frame's sides, and the viewer reads not
"the host pasted four labels" but "people are genuinely chatting under this content".

Its division of labor with the library's `chat-message-flow` differs: that card is **a conversation** (with sequence, replies, bubbles stacking along an axis —
a narrative vehicle); this card has no dialogue relations — four unrelated comments enter and exit from their own edges. It is an **atmosphere layer**:
it carries no information, only the feeling of "many people here", which is why it can sit on top of any narration line without stealing the content.

Two vital constraints: ① **Entrances and exits must overlap**. All-in-all-out (four appearing together, vanishing together) reads as "a set of labels" —
that's layout, not a comment stream; only when the 3rd enters while the 1st is leaving does the viewer infer "more comments scrolling just offscreen" —
a quantity that lives beyond the frame. ② **Only one bubble carries the accent color**; the rest run grayscale solids. All four in color = visual noise,
and the single semantic handle of "which comment matters most" is gone.

## Motion Core
- **Each bubble's three beats are a fixed template** (all four fully congruent; only start time and placement differ):
  - In: `x ±26 → 0` + `scale 0.88 → 1` + `opacity 0 → 1`, `0.30s power3.out`.
    Horizontal direction = **toward frame center** (left-side bubbles push in from −26, right-side from +26); a comment enters from its nearest edge
  - Hold: `0.75s` completely still (no drift, no breathing — micro-motion turns it from "someone else's comment" into "an animated sticker")
  - Out: `y 0 → −18px` + `opacity → 0`, `0.40s power1.in`. **Exit moves only opacity and y; scale never moves again**
    (exits are always lighter than entrances, design-language §4); the upward drift is the minimal expression of "scrolling up and away", the comment-stream direction
- **The 0.55s stagger and 0.75s hold are a pair**: one bubble's full run = `0.30 + 0.75 + 0.40 = 1.45s`,
  2.6× the stagger ⇒ at any moment 2~3 bubbles are on screen, and one is always entering or leaving.
  The overlap criterion: `inDur + hold ≤ 2 × stagger` (this card: 1.05 ≤ 1.10, right at the threshold — maximum density)
- **Placement distribution**: two per side, all four `top` values distinct (92 / 158 / 296 / 372),
  vertical gaps unequal (66 / 138 / 76). Equal spacing reads as a column list; left-right alternation (L·R·L·R) swings the gaze back and forth
- **Static tilt ±1.2~1.8°** (`-1.5 / +1.5 / +1.2 / -1.8`): the pasted-askew feel is a **shape property**;
  no jitter at all once settled (design-language §4 bans stop-motion freeze jitter)
- **Bubble form**: `border-radius: 999px` pure rounded capsule. **No tail triangle**
  (removed by user decision 2026-08-25 — a comment stream is a passing overlay; a tail carries the speech-balloon semantics of "who is saying this"
  and would drag it back into `chat-message-flow`'s language); no shadow, no stroke —
  it isn't "an object resting on the surface", it's an overlay. `side-l/side-r` decides **entrance direction only**, no longer tail orientation
- **Four-step color scale (one accent + three grayscale solids)**: accent bubble `#e0452c` base / white text;
  the other three on `#e8e8ec`·`#f2f2f4`·`#e8e8ec` bases with `#1d1d1f`·`#6e6e73`·`#545458` text —
  **hierarchy through base and text luminance, never stacked opacity** (design-language §1 red line)
- **Layering**: full-body host (z1) → bubbles (z3). Bubbles always sit over the person (comments are overlays on the picture)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `stagger` | 0.55s | **The bubble-to-bubble entrance offset, this card's first vital constraint**; together with `hold` it sets the overlap. >0.9s each bubble appears in isolation — four independent animations; <0.35s all four smear into one wave and the viewer finishes none of them |
| `hold` | 0.75s | Each bubble's on-screen dwell; criterion `inDur + hold ≤ 2 × stagger`. Past 1.4s all four sit on screen together = a label set (the card is dead); <0.5s a short comment can't be read |
| `inDur` | 0.30s | Entrance duration; >0.45s every bubble seems to make a "grand entrance" — a comment stream should drift in casually |
| `outDur` | 0.40s | Fade-out duration; longer than `inDur` is correct (entrances need a landing, exits should go unnoticed), but >0.6s leaves bubbles hanging half-transparent |
| `inX` | 26px | Entrance horizontal travel; 0 becomes an in-place fade (losing the "drifting in from beyond the edge" direction), >50px reads as being flung in |
| `outY` | −18px | Departure rise; 0 becomes a pure fade (losing the upward-scroll direction), >40px reads as a balloon lifting off |
| `inScale` | 0.88 | Entrance start scale; <0.7 reads as a pop (a different language — bubbles should drift); 1 loses a touch of depth |
| `tilt` | ±1.2~1.8° | Per-bubble static tilt; 0 reads as system UI components (clean but lacking the handmade touch), >4° reads as a sticker wall |
| Count | 4 | 3 bubbles under-overlap (stretches where only one is on screen); 6+ can't be read in one screen — for more, extend total duration rather than tightening the stagger |
| Accent count | 1 | **Always 1**, this card's second vital constraint. From 2 up there's no "which one matters"; four in color is visual noise |

## Known Pitfalls
- All four in together, out together — reads as "a set of labels" (one layout); the comment-stream semantics vanish outright; overlap is mandatory.
- Holding each bubble 2s+ "so it can be read" — four on screen at once, effectively turning the stream into four caption lines; the frame fills up yet nothing feels like it's "scrolling".
- All four in color (one hue each) — visual noise, and the gaze has no anchor; three grayscale steps + one accent is what creates hierarchy.
- Dimming the grayscale bubbles with `opacity: 0.5` — dim elements with stacked transparency on white always fall out of the readable range (design-language §1, measured red line); to go lighter, use a lighter solid base — never touch the text's opacity.
- Equal vertical spacing — the four read as a vertical list, the opposite of comments drifting in from the sides; the gaps must be unequal.
- Adding float/breathing micro-motion after settling — it instantly turns from "someone else's comment" into "an animated decorative sticker", and violates the §4 finalized preference.
- Scaling on exit too (shrinking away) — the exit outweighs the entrance, and the viewer's eye gets yanked by the disappearance.
- Adding shadows or strokes to bubbles — they're overlays, not evidence assets; shadows are reserved for screenshots/photos (design-language §3).
- **Adding tail triangles to the bubbles — removed by user decision 2026-08-25**. A tail is speech-balloon semantics ("a specific person says this"),
  while a comment stream is an anonymous passing atmosphere layer; with tails, the four read as four people surrounding the host, and it collides with
  `chat-message-flow`'s language. The pure capsule is enough.
- Bubbles covering the person's face — they may overlap the body; covering the face reads as occlusion; placement must first avoid the head rectangle.
- Using `Math.random()` for placement or stagger — two replays differ; the card library requires reproducibility (use fixed arrays).

## Reuse Guide
- HTML/GSAP: demos/danmu-bubble-praise/index.html. Change copy via the four `.db-b` text nodes (4~8 characters each;
  `white-space: nowrap` is a hard requirement); placement via `#b1~#b4`'s `left/top`, updating `side-l/side-r`
  to "enter from whichever edge is nearer" (that class decides entrance direction only).
  Energy adjusts only via the `stagger` + `hold` pair; after changing, re-check the criterion `inDur + hold ≤ 2 × stagger`.
  Change the accent via `#b2`'s `--fill`/`--ink` variables only; the other three stay grayscale forever.
- Remotion port notes: one bubble = one `<Bubble>` component, props `enterFrame / side / tone`.
  Each bubble's three segments of `interpolate` share one local clock `local = frame - enterFrame`:
  `opacity` runs `[0, 9, 9+23, 9+23+12] → [0,1,1,0]` (30fps: in 9 frames, hold 23, out 12),
  `translateX` only over the first 9 frames `[±26 → 0]` (`Easing.out(Easing.cubic)`),
  `translateY` only over the last 12 frames `[0 → −18]` (`Easing.in(Easing.quad)`),
  `scale` over the same first 9 frames `[0.88 → 1]`. `extrapolateLeft/Right: "clamp"` cannot be omitted.
  The four `enterFrame`s = `12 + i * 17` (0.4s + i×0.55s @30fps). Tilt is hardcoded in styles, never interpolated.
- Editing-software equivalents: JianYing/CapCut — four text stickers each with "Entrance: slide left/right 0.3s" +
  "Exit: slide up 0.4s", then **manually offset the four tracks by 0.55s** into a staircase (the stagger is the one manual step —
  JianYing has no stagger concept); the bubble base via "text background" with corner radius maxed.
  AE — one `Bubble` precomp performing all three beats, duplicated four times and offset with `Sequence Layers` (Overlap checked,
  Duration 0.9s), or simply nudge the four layers' In points by +17 frames; tilt hardcoded on layer Rotation.
- Division of labor with same-family cards: `chat-message-flow` = **a conversation** (sequenced, with replies, stacking along an axis, carrying information);
  `subscribe-cta` = a one-off call to action (a single bubble that must hold long enough to be read);
  **this card = atmosphere-layer crowd presence** (unrelated, overlapping in and out, carrying no information).
  It can sit on any narration line, and for that same reason it must carry no specific information — if a comment truly must be remembered,
  give it its own screen with `quote-card`.

## Scope
- Belongs to this card: the per-bubble "in 0.3s / hold 0.75s / out 0.4s" three-beat template; the `stagger 0.55s` + `hold 0.75s` pair (and the `inDur + hold ≤ 2×stagger` overlap criterion); the discipline of entering toward frame center `x ±26 → 0` + `scale 0.88→1` and exiting with only `y −18` + `opacity` (no scale on exit); the distribution rule of unequal vertical placement + left-right alternation; complete stillness after settling (no drift, no breathing); static tilt ±1.2~1.8° as a shape property; the color discipline that "exactly one of the four carries the accent, the rest layered by base/text luminance in three grayscale steps, never by transparency".
- Does not belong to this card: the demo's four specific comment lines, the specific accent `#e0452c` (any same-family hue from the reference image works), the 21px size and 600 weight, the specific `border-radius: 999px` capsule form (square chips or rounded-rect chips don't affect the motion; **but the tail triangle may not come back** — that's speech-balloon semantics, see Known Pitfalls), the four bubbles' specific `left/top` values, the white stage, and the full-stage digital-human host placeholder.
- Migration interfaces: content entries = the four `.db-b` texts + `side-l/side-r`; placement entries = each bubble's `left/top`; color entries = each bubble's `--fill`/`--ink` CSS variables (exactly one accent bubble); energy entry = the `stagger` + `hold` pair (re-check the criterion after changes); total duration = `startDelay + (n−1)×stagger + inDur + hold + outDur + tailHold` — to add bubbles, extend the total rather than tightening the stagger. Vertical: place them "two top, two bottom" (a vertical frame's sides can't fit 4~8-character bubbles), swap `inX` for `inY ±26`, all other timing unchanged.
- Background requirements: white works. The one constraint is that **the background must not collide in luminance with the bubbles' three grayscale steps** — the grayscale bubbles are layered by base luminance; on dark backgrounds the whole set must invert (bubble bases to three dark-gray steps, text to white) — inverting only the text is not enough.
