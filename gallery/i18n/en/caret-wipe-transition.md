---
name: caret-wipe-transition
title: A 3px text caret sweeps left to right over 1.33s to complete the scene change — wherever it has passed, the new scene shows through (settling and de-blurring, as if just typed); wherever it hasn't reached, the old scene remains (floating up and defocusing, as if being backspaced away); complementary clipping never shows a seam
usage: Shot boundaries about code/editors/documents/AI-generated content — "done editing", "rewrote this section", "swapped versions"; moments when the boundary itself carries meaning; not suitable for cuts between on-camera people (the caret metaphor has nothing to do with faces)
---

## Intent
This library's six momentum-handoff forms are all **camera-momentum handoffs** (push-through / page-flip / whip-pan / black slam / pull-back / weld) —
what happens at the boundary is "the camera moving"; the boundary line itself has no meaning. `shape-wipe-transition`'s color-block screen sweep is the same:
the block is an **opaque occluder** whose job is "keep you from seeing the frame where the scene changes".

This card is the library's first transition where **the boundary itself has semantics**: that vertical line is not an occluder — it is a text caret.
So a single wipe says two things at once — where the caret **has passed, things were "just typed"** (new content settles from below and resolves out of blur),
and where it **hasn't reached, things are "being backspaced away"** (old content floats upward and gradually defocuses).
When you're saying "I rewrote this passage", "this version was swapped for that one", "the AI changed it into this",
it fits better than any color block or camera move: the editor metaphor tells the causality by itself.

Three critical rules: ① **Complementary clipping** — the two layers' `clipPath` must be strictly complementary (`inset(0 (100−x)% 0 0)` against
`inset(0 0 0 x%)`), both sharing the same progress value x; half a percentage point of difference exposes a seam of background color at the boundary;
② **The two-sided micro-contrast is the soul** — new scene `y +3→0` / `blur 2→0`, old scene `y 0→−6` / `blur 0→4`.
Remove it and this degrades into an ordinary hard-edge wipe (which is already shape-wipe's territory);
the entire "typed out / being eaten" semantics comes from these two tiny opposing motions;
③ **No glow on white backgrounds** — the original gave the caret a `box-shadow: 0 0 18px` halo (a dark-background + neon-green design language);
moved onto this library's white stage it only smears a dirty edge at the boundary — use a solid thin bar instead.

## Motion Core
- **One progress value drives three things**: `p.x` runs from 0 to 100 (`cubic-bezier(0.65,0,0.35,1)`, 1.33s).
  In each frame's `onUpdate`, write three things: new scene `clipPath: inset(0 (100−x)% 0 0)`,
  old scene `clipPath: inset(0 0 0 x%)`, caret `translateX(x% × frame width)`
- **Clipping must be complementary**: the new scene shows only the `[0, x]` band, the old scene keeps only the `[x, 100]` band, the two bands meeting end to end.
  Both layers are same-size, same-position, full-bleed — so no x value ever exposes the background
- **Two-sided micro-contrast (each on its own curve, separate from the clip curve)**:
  - New scene: `y +3 → 0` (same EASE, running the full 1.33s) + `blur 2 → 0` (`power1.out`, running only 80% — by the moment it lands it is already sharp)
  - Old scene: `y 0 → −6` (`ease:none` constant-rate float-up) + `blur 0 → 4` (`power1.in`, **onset delayed 10%**, so "being eaten" starts only after the caret truly begins to move)
  - Displacements are deliberately small (3 / 6px): this is "content being edited", not a camera pushing
- **The caret bar**: 3px wide, 50% of screen height, `translateX(-50%)` riding the boundary, solid `#1d1d1f`, corner radius = width.
  **Fade in/out over the first and last 8% of progress** — otherwise the first and last frames show the caret "popping into/out of existence"
- **Easing `cubic-bezier(0.65,0,0.35,1)`**: fast through the middle, decelerating at the end, like a finger stopping after striking the last column.
  A constant-rate sweep reads as "a refresh bar"; a `power4.out`-style hard launch reads as a whip (that's whip-pan's territory)
- **The two layers' inset discipline**: `inset: -10px 0` — 10px of overflow top and bottom leaves headroom for the ±6px vertical micro-contrast (skip it and a hairline of white leaks at the top/bottom edges);
  **left and right must equal the frame exactly**: `clipPath`'s `inset(%)` is computed from the element's own width; overflow horizontally even slightly
  and the clip boundary drifts a few px from the caret position computed from the frame width (you instantly see the caret "sitting beside the seam" rather than "riding on it")
- **Write `style` directly in `onUpdate`, not via `gsap.set`**: `gsap.set` gets scheduled onto the next tick,
  putting caret and clip boundary one frame apart, which looks like "the caret can't keep up with the wipe line" (this demo hit it; probing measured 1 frame ≈ 30px)
- **Layering**: white stage → old scene (clipped to the right band) → new scene (clipped to the left band) → caret bar (unclipped, topmost)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `wipe` | 1.33s (≈40 frames @30fps) | Full-screen sweep; <0.7s reads as a hard-edged flash cut and the two-sided micro-contrast becomes invisible, >2.0s the viewer waits for it to finish and the rhythm collapses |
| Easing | `cubic-bezier(0.65,0,0.35,1)` | The end deceleration is "striking the last column"; constant rate reads as a refresh progress bar, a hard launch (`power4.out`) reads as a whip |
| `caretW` | 3px | Caret width; 1px flickers after 1080p scaling, >6px becomes a pillar and reads back into a color-block wipe |
| `caretH` | 0.5 (50% of screen height) | Caret height; <0.35 is too small to hold the eye, =1.0 (full-screen) reads as a split-screen divider rather than a caret |
| `caretFade` | 0.08 (8% of progress at each end) | Prevents edge-frame pop-in; 0 = the first/last frames show the caret appearing and vanishing out of nowhere, >0.2 the caret spends most of the trip semi-transparent |
| `inY` / `inBlur` | +3px / 2px | New scene settling and de-blurring ("just typed"); both at 0 degrades into an ordinary hard-edge wipe, >8px / >5px reads as a camera push (push-through's territory) |
| `outY` / `outBlur` | −6px / 4px | Old scene floating up and defocusing ("being backspaced away"); deliberately **double** the new scene's amounts — the side being eaten must be "looser"; equal amounts read as a symmetric transition with no hierarchy |
| Old-scene defocus onset delay | 10% of progress | Makes "being eaten" happen only after the caret truly starts moving; 0 = the frame is already blurring before the caret moves, reading as the player stalling |
| New-scene de-blur endpoint | 80% of progress | It must already be sharp at the moment of landing; =100% means the last frame is still resolving, and the ending goes "soft" |
| `dir` | `right` | Typing left to right (default, matching "being written"); `left` = reverse backspace, suited to "undo / back to the previous version" contexts |

## Known Pitfalls
- The two layers' clips not complementary (each writing its own percentage, or using different progress values) — a seam of stage background shows at the boundary; at 1080p it's a white line, instantly a bug.
- Both layers' `inset` overflowing horizontally too (e.g. `inset: -10px` all around) — `clipPath`'s `inset(%)` is computed from the element's own width, so the clip boundary drifts a few px from the frame-computed caret position; the caret sits beside the seam.
- Using `gsap.set` inside `onUpdate` for the clip/caret — scheduled onto the next tick, caret and boundary end up one frame apart (≈30px), reading as "the caret can't keep up with the wipe line"; write `element.style` directly.
- Dropping the two-sided micro-contrast — degrades into a hard-edge color-block wipe; the "typed out / being eaten" semantics disappears, and at that point you should just use `shape-wipe-transition` (it's faster and cheaper).
- Making the two sides' contrast equal (both ±5px) — reads as symmetric double doors opening, no hierarchy; the side being eaten must move noticeably more.
- Giving the caret a glow (`box-shadow` / `filter: drop-shadow`) — the original is a dark-background neon-green design language; on white it smears into a dirty edge (design-defaults also bans glow).
- Not fading the caret at both ends — the transition's first and last frames show it appearing/vanishing out of thin air; edge-frame pop-in is the cheapest tell.
- Displacements at camera magnitudes (±20px and up) — this card is "content being edited", not a camera moving; go big and you invade the six momentum-handoff forms' territory while the two rule sets conflict.
- Used between on-camera shots of people — the caret metaphor has nothing to do with faces; the viewer reads no causality, just an inexplicable vertical line sweeping across a face.
- Repeated within one film (≥3 times) — its semantics is too specific (an editor); by the third appearance the viewer starts thinking "this film only knows one trick". Limit to 1–2 per film, and only on boundaries genuinely about text/code.
- Both scenes' display type centered — the wipe boundary stops at arbitrary horizontal positions, and midway the two lines of type overlap into garbage at the boundary; the demo puts the new scene's label left (the earliest-revealed band) and the old scene's label right (the last band to be eaten).
- Scene content is flat color (no full-bleed texture) — past the midpoint the unreached side is a blank; you can't tell "this is still the old scene". Both sides need recognizable content filling the frame.

## Reuse Guide
- HTML/GSAP: demos/caret-wipe-transition/index.html. The core is the function `caretWipe(out, inn, at)` —
  pass in two full-bleed scene layers and it works, returning the moment the wipe ends (handy for scheduling the following hold).
  Change direction via `CONFIG.dir`; the `clipOld` / `clipNew` functions already handle the direction branches.
  `cubicBezier()` is a general-purpose easing solver (GSAP core lacks `CustomEase`) — feel free to copy it out.
- Remotion port: the original is a `TransitionPresentation` for `@remotion/transitions`
  (`registry/remocn/caret-wipe/index.tsx`); `presentationProgress` is exactly this card's `p.x/100`:
  the `entering` branch styles the new scene (`clipPath` + `translate` + `blur`), the `!entering` branch styles the old scene,
  and the caret is drawn only in the `entering` branch (otherwise two carets appear).
  If wiring it into this library's `template/motion-systems/transitions.tsx`, note it is **a different family** from the six forms —
  the six are CamKey generators (mutating the camera path); this card doesn't touch the camera — it is a pair of complementary `clipPath`s wrapped outside the Sequence;
  so don't force it into the `pushThroughOut/settleIn` interface — use it standalone as a presentation.
- Editing-software equivalents: Jianying/CapCut — a "linear wipe/linear slide" transition + manually adding a set of displacement and blur keyframes on each side
  (the preset only clips; it has no micro-contrast — the micro-contrast must be added by hand, and that is this card's entire difference); the caret is a separate 3px color-bar layer with position keyframes.
  AE — `Linear Wipe` (Feather 0) for the clipping, the caret a Shape Layer whose Position follows the same `cubic-bezier` (hand-drawn in the Graph Editor),
  with one set of `Fast Box Blur` + Position keys on each side; **avoid CC Light Wipe / Card Wipe** and anything with glow and shards.
- Division of labor within this library's transition class: **the six forms** (push-through / overexpose-flip / whip-pan / black-slam / pullback-cool / particle-weld)
  = camera-momentum handoffs; the boundary is "the camera moving" and works for any content; **shape-wipe** = the lightweight occluder when no camera system exists;
  **this card** = the boundary itself has semantics (the editor metaphor), used only when the content truly concerns text/code/documents/generated results.
  One boundary, one form — this card does **not stack** with the six (a camera pushing while a caret sweeps across is two spatial logics at war).

## Scope
- Belongs to this card: the mechanism of one progress value simultaneously driving "two complementary `clipPath` layers + the caret position"; the two-sided micro-contrast (new scene y +3→0 / blur 2→0 settling and de-blurring, old scene y 0→−6 / blur 0→4 floating up and defocusing, with the eaten side's displacement roughly double the new scene's); the two timing disciplines of the old scene's defocus onset delayed 10% of progress and the new scene's de-blur finishing before 80%; the end deceleration of `cubic-bezier(0.65,0,0.35,1)`; the caret spec of a 3px solid thin bar + 50% screen height + riding the boundary + fading over 8% of progress at each end; the "no glow on white" trade-off; the inset discipline of both layers exactly matching the frame horizontally and overflowing only vertically; writing style directly in `onUpdate` to avoid the caret trailing the boundary by one frame.
- Does not belong to this card: the demo's ruled-paper/dot-grid textures on the two scenes and the two form-identifying labels "just typed" / "being backspaced away", the grayscale values (`#ffffff` / `#f1f1f4` / `#8a8a8a`), the caret's `#1d1d1f`, the scheduling of hold A 0.8s and hold B 0.9s (application-side, decided by narrative length), and the fact that "the two scenes are static tiles" (in real use both sides are full shots).
- Migration interface: `caretWipe(out, inn, at)` is the only call entry — pass two full-bleed scene layers and a start time; `wipe` sets the speed (the only parameter commonly changed); `dir` sets "being written" (right) vs "undo back to the previous version" (left); `inY/inBlur/outY/outBlur` are **feel constants — do not scale them up with frame size** (they are the magnitude of "content being edited", not camera magnitudes); round `caretW` per resolution (3px at 1080p, 5–6px at 4K, avoiding half-pixel flicker); for vertical video raise `caretH` to 0.6–0.7 (a 50% caret looks too short in a portrait frame).
- Background requirements: white/light backgrounds are best (the caret is a dark solid bar; it works on contrast). For dark scenes swap the caret to a light solid bar; all other parameters unchanged. **The two scenes' backgrounds need not match** (the demo is white + light gray), but both sides must have recognizable full-bleed content — flat color makes the unreached side past the midpoint read as blank.
