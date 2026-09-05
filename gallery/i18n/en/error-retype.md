---
name: error-retype
title: The stem "What makes a talking-head video good is" is already there; the second half is typed out at typewriter pace (0.09s per character, frame-exact hard cuts) as "model size" → a 0.55s pause while the cursor blinks twice on a 4-frame half-period (hesitation) → the characters are deleted faster at 0.06s each → the correct half "how you tell it" is retyped at the same speed with zero hesitation → after finishing, the cursor blinks twice and is removed; the sentence rests ≥2.6s and exits together. The three-speed contrast is the whole drama; the cursor is the actor's face
usage: Negation copy ("it's not X, it's Y"), correcting a common misconception ("people think A, actually B"), a punchline reversal (type the wrong half first), a self-correcting hook in the opening; works on a headline / claim layer, never on the bottom subtitle
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Text-only card; with a presenter on screen place the sentence in the opposite half (layout §4) | ✗ | ✗ |

Works on a headline / claim layer, never on the bottom follow-along subtitle (plain-subtitle rule).

## Common scenarios
1. Negation copy: "What makes a talking-head video good is ~~model size~~ how you tell it" (the demo)
2. Correcting a misconception: "people think A, actually B" — type A, then delete it
3. Punchline reversal: type the wrong half first, pause, then change it to the right one
4. A self-correcting opening hook: "today: how to gain followers → how not to lose them"

## Intent
When the narration says "not X, but Y", showing Y directly loses the "wrong first, then right" you hear; a strike-through (`strike-and-replace`) marks the error **in space**. Error-retype corrects **in time**: the viewer watches the characters get typed, hesitate, get deleted and retyped — the emotion is "said it wrong, fixed it", closer to a person speaking than to marking a mistake. Four things make it work:
1. **The three speeds must be perceptible**: type 0.09 / delete 0.06 / retype 0.06 s per character. Equal speeds read as a bug, not a beat.
2. **Three cursor states**: solid while typing and deleting = decisive; blinking only during the pause (two blinks on a 4-frame half-period) = hesitation; two blinks after finishing, then **conditionally removed** — even 0.05 opacity left over ruins true stillness.
3. **Fixed-width character slots, anchored at the left edge**: measuring a proportional string reflows and jitters every frame; the cursor is pinned after the last character with an x offset (empty slots still occupy space).
4. **Characters appear as frame-exact hard cuts**: any eased typing reads as a loading animation.

## Motion core
- **Geometry** (960×540): sentence 40px / 700 / letter-spacing −0.5 ink `#1d1d1f`, `.ert-tw` absolute at `top 240` (line box 60, centre on y=270); `left = (960 − (stemWidth + N×44 + 4 + 6)) / 2` measured once with a hidden ruler (N = the longer of the two halves). Slots 44px per character, centred; cursor a 6×46 accent block with 4px left margin.
- **Schedule**: `tType = 0.7`; `tB1 = tType + 4×0.09 = 1.06` (two blinks); `tDel = tB1 + 0.55 = 1.61`; `tRe = tDel + 4×0.06 + 0.12 = 1.97`; `tB2 = tRe + 4×0.06 + 0.3 = 2.51` (two blinks); `tOff = tB2 + 0.55 = 3.06` cursor removed; `exitAt = tB2 + 2.6 = 5.11`, 0.4s `power2.in` exit, done at 5.51.
- **Type / delete / retype**: the typed count n is a frame-exact staircase — typing `n = floor((t−tType)/0.09)+1`, deleting `n = 3 − floor((t−tDel)/0.06)`, retyping `n = floor((t−tRe)/0.06)+1`; cursor `translateX(−(N−n)×44)`.
- **Cursor**: opacity 1 by default; inside the two blink windows `[tB1, tB1+0.52)` / `[tB2, tB2+0.52)` a square wave on a 0.13s half-period (off-on-off-on); 0 from `tOff`.
- **Entrance / exit**: stem fades in over 0.3s from 0.1s; at `exitAt` stem + slots opacity→0 (the cursor is already gone). Once landed everything rests; no idle.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `type` / `del` / `retype` | 0.09 / 0.06 / 0.06 s per char | The three-way contrast must be perceptible — equal speeds read as a bug; typing <0.07 Chinese can't be read, deleting >0.08 isn't decisive enough |
| `pause` | 0.55s | Length of the hesitation: <0.4 can't fit two blinks, >0.9 reads as frozen |
| `blink` | 0.13s (4f half-period) | Faster than 3f looks like a glitch; slower than 6f two blinks take 0.8s and drag |
| `gap` | 0.12s | Gap between deleting and retyping: 0 reads as one breath, >0.3 becomes a second hesitation |
| `cursorOff` | 0.55s | One more beat after the final two blinks, then remove; a lingering cursor ruins true stillness |
| `holdEnd` | 2.6s (≥50f) | The correct half is the point of the passage; rest long enough to read it |
| `slotW` | 44px | ≈ character width at 40px plus breathing room; too narrow crowds, too wide reads as letter-spacing |
| Half-sentence length | 2–6 chars, both halves similar | A difference >2 characters shows empty slots; the longer half sets N |

## Pitfalls
- Type / delete / retype at equal speed — reads as a bug rather than "correcting"; the core violation.
- Cursor blinking all the way through — the cursor is the actor's face; blinking constantly removes the hesitation beat.
- Cursor still present after finishing — even 0.05 opacity ruins true stillness; must be conditionally removed.
- Measuring a proportional string — the sentence reflows with every character; fixed-width slots are mandatory.
- Eased or faded typing — a loading animation, not a typewriter.
- Wrong half and right half very different in length — the empty slots read as a spacing glitch; rewrite so the halves are close in length.

## Reuse
- Remotion/tsx (preferred): template/cards/error-retype.tsx — four props `prefix / first / second / accent`; durationInFrames 177 for 4 → 4 characters (recompute as `tB2 + holdEnd + exitDur` when lengths change); the stem width is measured once with `useLayoutEffect + delayRender`.
- HTML/GSAP: demos/error-retype/index.html — edit `PREFIX / FIRST / SECOND` and `CONFIG`; characters appear via `tl.call` hard cuts, the cursor x is compensated in `put()`.
- Source: video-shotcraft `typewriter-moves` style B error-retype (style A, a terminal command with a crash zoom, is a developer-product opener and was not ported).
- NLE equivalents: CapCut's "typewriter" text effect can only type, not delete — use two text layers with hand-placed keyframes; in AE use a Text Animator Range Selector with hold keyframes for typing / deleting, and a shape-layer cursor driven by a square-wave expression `Math.floor(time/0.13)%2`.
- Interface with layout.md: single subject on the centre line y=270 (§1); the sentence is centred by its "stem + N slots + cursor" total width (§4, offset ≤48); 40px is above the 20@960 list-item floor (§5).

## Motion scope
- Belongs to the card: the four-part structure type → hesitate → delete → retype; the three-speed contrast; the three cursor states (solid / two blinks / removed); fixed-width slots with cursor x compensation; frame-exact hard cuts.
- Not part of the card: the copy, the cursor colour (use the film's accent), the white stage.
- Migration interface: `prefix / first / second / accent`; at 1080p double the font (80), slot width 88, cursor 12×92; place the "start deleting" moment on the word anchor where the narration says "not".
- Background: white / parchment work; on dark backgrounds invert the text to white and keep the accent cursor.

## Placement check (copy into the SHOTBOOK self-check column when the card is chosen)
- Three stills: mid-typing (e.g. 1.0s) the cursor hugs the last visible character (4px gap); half-deleted (e.g. 1.7s) it still hugs; finished (e.g. 4.0s) the cursor is gone and the sentence is still.
- Sentence bounding box centred within ≤48px, centre y ≈ 270; with a presenter on screen, centre it in the opposite half (x = 240 or 720@960).
- Check with `shot-at --play` that nothing moves after 3.1s (true cursor stillness).
- The three speeds are distinguishable at 30fps in the final render: typing ≈3f/char, deleting / retyping ≈2f/char.
