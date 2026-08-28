---
name: tracking-in
title: A large one-line title's letter-spacing tightens from an extremely loose 0.5em down to −0.03em while the same spring simultaneously resolves a 9px blur — scattered characters converge and come into focus as one block, covering 80% of the distance in the first 0.3s and biting into place extremely slowly over the remaining 0.5s, with zero overshoot throughout
usage: Moments when the whole screen yields to one big title — opening titles, chapter theses, closing lockups, short brand lines (4~8 characters); single lines that need "cinematic / keynote gravitas"; not for multi-line text, not for regular captions (this is a title action, not a caption action)
---

## Intent
This library was missing one tier: **the title's entrance** — note, not a caption. Caption actions must be short, track speech pace, and chain together;
a title action may be long, happen only once, and make the whole screen stop for it. `chapter-title-card` is a "card" (with a color block pressing the screen, transitional in nature),
`quote-card` is "a multi-line pull quote + backing plate" — both come with a full frame structure of their own. This card has only **one line of text**,
landing on the existing frame, using a single action to pull the whole screen's attention in.

Its mechanism is singular: **tracking (letter-spacing)**. The characters converge from extremely far apart (0.5em ≈ half a character-width of gap) to normal;
what viewers perceive is "scattered things settling into place" — and this settling is horizontal, symmetrical, from both ends toward the middle —
overlapping with the motion direction of no other caption card in this library.

Two vital points: ① **Tracking and blur must be driven by the same spring**. The tracking is tightening while the blur is resolving; the two share one curve,
which is what makes them read as "one action" — the scattered characters converge into a block and focus into a block simultaneously. Split into two eases (even with very close parameters),
slow motion reveals the characters biting into place first and then de-blurring separately — that's two actions;
② **The spring is a long, zero-overshoot settle** (damping 18 / stiffness 90, ζ=0.949).
Its shape is "cover 80% in the first 0.3s, then bite the last 20% extremely slowly over the remaining 0.5s" —
that final slow bite is the entire source of this card's "gravitas". Swapping in something like `power2.out` reads noticeably flatter;
swapping in an elastic ease (a bouncy spring / `back.out`) makes the tracking overshoot into negative and bounce back — instantly cheap.

A third point worth noting: **the fade-in does not ride the spring** (the source keeps them as two separate interpolates).
Opacity runs an independent 0.5s linear — so while the text is still at half opacity, the tracking has already closed 90% of the way.
This offset means the "convergence" is mostly done before the text is fully visible; what viewers see is **the last stretch of the result**, not the whole process.

## Motion Core
- **One spring drives two things** (source: `spring({config: {damping: 18, stiffness: 90}})`, mass defaults to 1):
  - `letter-spacing: 0.5em → −0.03em` (the end state is **slightly tightened**, not 0)
  - `filter: blur(9px) → 0`
  - Both consume the spring's output `t` via `interpolate(t, [0,1], [start, end])` — **one action**
- **The spring's shape**: ζ = `18 / (2√90)` = 0.949 (underdamped), ω₀ = 9.487, ω₁ = 3.0.
  `x(t) = 1 − e^(−9t)·[3·sin(3t) + cos(3t)]`.
  x(0.3) = 0.800, x(0.5) = 0.966, x(1.0) = 1.00007 — the overshoot peak is only **8.1e-5** (t≈1.05s): to the eye, **zero overshoot**.
  It effectively completes in about **1.0s** (used in GSAP as a custom ease: feed the 0~1 progress × 1.0s into the closed-form solution)
- **Independent fade-in**: `opacity 0 → 1`, **0.5s linear**, unrelated to the spring (the source's second `interpolate(frame,[0,15])`).
  It is half the spring's length — by the time the text is visible, the tracking has closed ninety percent
- **`letter-spacing` must use em units**: 0.5em means "half a character-width of gap", scaling automatically with font size.
  Handing it to GSAP to tween directly converts it to px, breaking the proportionality across font sizes — the demo goes through a proxy object + `onUpdate` writing the style by hand
- **Blur amount is a constant 1/8 of the font size** (source: 12px @96px font; this library's 72px ⇒ 9px). A ratio constant — changing font size must scale it proportionally
- **`white-space: nowrap` is a hard requirement**: at 0.5em tracking the line is ~50% wider than its end state;
  without nowrap it wraps at the opening moment and snaps back to one line mid-convergence
- **The whole line is one element** (no per-character splitting): this card's animation target is "a line of text"; tracking is a property of the line.
  Splitting into characters with individual displacement is a different route (it loses CSS tracking's symmetry, and Chinese punctuation positions go wrong)
- **Zero displacement, zero scaling**: this card does not touch `transform`. All the "sense of motion" comes from tracking and blur
- **Layering**: white stage (the source explicitly sets `background: white` — the tracking convergence is only legible against "emptiness") → the line (the only animated element)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `startTracking` | 0.5em | Starting tracking, the card's energy knob; <0.25em the convergence isn't legible (degrading to "a slightly blurry fade-in"), >0.9em at the start the line is too scattered to read as one sentence, and its width approaches the frame (especially in Chinese — uniform character widths make the scattered line a row of isolated boxes) |
| `endTracking` | −0.03em | End-state tracking, **slightly tightened, not 0**; 0 loses the final "bite", and a positive value (relaxed) reads as unfinished |
| Spring config | damping 18 / stiffness 90 | **The card's second vital point: a long, zero-overshoot settle**; lowering damping (<14) produces visible overshoot — tracking dips negative then bounces back, instantly cheap; raising stiffness (>140) makes the whole action short and hard, gravitas gone |
| `springDur` | 1.0s | The spring's actual completion time (determined by damping/stiffness, not an independent parameter — change the config and this must be recomputed); this card's "long" is deliberate; under 0.7s it's no longer a title action |
| `startBlur` | 1/8 of font size (72px ⇒ 9px) | Starting blur, a **ratio constant**; 0 (no de-blur) reads as a pure tracking animation (mechanical, missing the "focusing into one block" layer), > font size / 5 the opening is a fog cloud — viewers don't know what to look at |
| `fadeDur` | 0.5s | Fade-in duration = half the spring — **this offset is part of the design**; = `springDur` and the audience sees the whole process (the scattered characters stay legible throughout, and "settling" turns into "waiting for them to line up"); <0.3s the text appears near-instantly, again exposing the whole process |
| Character count | 4~8 | The card's hard constraint; ≤3 the scattered result is a few isolated characters that don't read as a sentence; ≥10 at 0.5em tracking the line exceeds the frame (for Chinese, estimate opening width as font size × count × 1.5) |
| `lead` | 0.3s | Opening rest waiting for the narration to start |
| `hold` | 1.3s | Ending freeze — the fully bitten title is the card's landing point; since this is a title, the freeze may run past 2s |
| Displacement / scaling | **0 (unset)** | The card's hard constraint: all sense of motion comes from tracking and blur; adding displacement collides with `per-character-rise` |

## Known Pitfalls
- Tracking and blur split into two eases — even with close parameters, slow motion reveals the characters biting into place before de-blurring separately; "one action" becomes two; they must share one spring.
- Swapping in a bouncy ease (a low-damping spring / `back.out` / `elastic`) — tracking overshoots into negative (characters pressing into each other) then bounces back: instantly cheap, and the frame where Chinese characters crowd together is very ugly.
- `letter-spacing` in px units (or handed to GSAP's auto-tween, which converts to px) — the convergence no longer scales with font size: at large sizes it "never scattered", at small sizes it's "absurdly scattered"; must be em + hand-written styles in `onUpdate`.
- End-state tracking written as 0 — the final "bite" loses its force; the source uses −0.03em, and that 0.03 does real work.
- Line not locked with `white-space: nowrap` — at 0.5em the line is 50% wider, so it wraps at the opening moment and snaps back to one line mid-convergence (an obvious bug in slow motion).
- Fade-in riding the spring for the full 1.0s — the audience sees the scattered characters clearly the whole way; the "settling" surprise becomes "waiting for them to queue up"; the fade must be half the spring's length.
- `startBlur` reused as an absolute pixel value — after a font-size change, large text isn't blurry enough and small text loses the blur entirely; must scale as 1/8 of font size.
- Used on multi-line text — each line converges independently, the width changes fall out of sync line to line, and the whole block reads as breathing; this card is a **single-line** title action (multi-line bullet points go to `line-by-line-slide`).
- Used as a regular caption (applied to consecutive sentences) — the 1.0s action can't keep up with speech pace, and every sentence "settling once" makes the whole piece feel slow; use this card 1~2 times per video.
- More than 8 characters (Chinese) — at the start the line exceeds the frame and gets clipped at both ends by `overflow: hidden`; viewers see "two stubs of text squeezing toward the middle".
- Fine texture on the background — in the first half of the convergence the text is a "translucent smear", background detail bleeds through and mixes in, and it stops reading as text.
- On the opening frame, the line's visual center sits left of its end state by about `startTracking / 2` (CSS adds tracking after the last character too, so centering pushes the visible glyphs leftward) — **present in the source as well**, part of the faithful port; to truly cancel it, add `margin-right: −<current tracking>` to the line (updated along with `onUpdate`), at the cost of a subtle difference from the source's look.

## Reuse Guide
- HTML/GSAP: demos/tracking-in/index.html. **To change content, edit only `#tiTitle`'s copy** (4~8 characters, written in the HTML —
  this card doesn't split characters, so there is no content array). Energy is tuned solely via `startTracking`; changing font size means editing `.ti-title`'s `font-size`
  and setting `CONFIG.startBlur` to 1/8 of the new size (`startTracking` is em and scales automatically — leave it).
  The `remotionSpring(damping, stiffness, mass)` function returns the closed-form solution of Remotion's `spring()` —
  **copy it into any demo that needs to replicate the Remotion spring feel** (it includes the critical/overdamped branches, so parameter changes won't miscompute);
  changing the spring config requires recomputing `springDur` (run `SPRING(t)` and find where x(t) stabilizes at 1).
  The line's placement is `.ti-frame`'s flex alignment (the demo centers full-screen, because this card's semantics are "the whole screen yields").
- Remotion port: the source `registry/remocn/tracking-in/index.tsx` is the minimal form — copy it verbatim:
  one `spring({frame, fps, config: {damping: 18, stiffness: 90}})` feeding two `interpolate`s
  (tracking `[0,1] → [0.5, -0.03]` output as an em string, blur `[0,1] → [12, 0]`),
  opacity separately via `interpolate(frame, [0, 15], [0, 1], {extrapolate: "clamp"})`.
  **Frame↔second conversion (source is 30fps)**: opacity's `[0, 15]` ⇒ 0.5s; the spring has no explicit frame count —
  its duration is set by damping/stiffness (this config ≈ 30 frames = 1.0s); `durationInFrames 90` ⇒ 3.0s (freeze included).
  The `speed` prop is the source's time scaling (`frame × speed`); this library expresses rhythm via `lead` + `hold`, so it is not ported.
  Size conversion: source `fontSize 96` @1280 frame; this library's 960 stage ×0.75 ⇒ 72, `startBlur 12 ⇒ 9`;
  `startTracking` is em — no conversion across sizes.
- Editing-software equivalents: Jianying/CapCut — **letter-spacing is not a keyframable property** (Jianying's "character spacing" is a static slider),
  so this card cannot be made; the closest substitute is splitting the title into per-character text layers each doing horizontal displacement (costly, and losing CSS tracking's symmetry).
  For something off-the-shelf, switch to `soft-blur-in` (de-blur fade-in — Jianying can do that).
  AE — `Source Text`'s `Tracking` **is keyframable** (via an Animator or the layer's Tracking property):
  two keyframes (start 50 → end −3; AE's Tracking unit is 1/1000 em, so 0.5em = 500, −0.03em = −30) +
  `Fast Box Blur` (9 → 0) + `Opacity` (0 → 100, only 15 frames);
  **the Tracking and Blur curves must be exactly identical** (copy-paste the curve in the Graph Editor — don't Easy Ease each separately);
  to replicate the spring's shape exactly, write the formula above — `x(t) = 1 − e^(−9t)(3sin3t + cos3t)` — into
  the Tracking and Blurriness expressions (sharing the same `t = time - inPoint`); more accurate than hand-pulled curves.
- Division of labor with sibling cards: `chapter-title-card` = chapter card (color block pressing the screen + numbering, transitional — a switch of frame structure);
  `quote-card` = multi-line pull-quote card (backing plate + host yielding + whole-card exit);
  `behind-text-title` = title threaded behind the host (a layering trick; the host stays on camera);
  `soft-blur-in` / `per-character-rise` = single-sentence **caption** entrances (can track speech pace and chain);
  **this card = a one-time entrance for a single large title line** (no backing plate, no frame cut, not speech-paced — it pulls the whole screen's attention through tracking settling).
  The boundary against `chapter-title-card` is **whether to cut the frame**: chapter division with a color block pressing the screen goes to that card;
  a single line standing on the current frame goes to this one. Use this card 1~2 times per video (opening + closing lockup); overuse cheapens the gravitas.

## Scope
- Belongs to this card: the mechanism of `letter-spacing 0.5em → −0.03em` and `blur → 0` driven by **the same spring** (one action, not two); the spring config damping 18 / stiffness 90 (ζ=0.949, overshoot 8e-5, **a long zero-overshoot settle**: 80% in 0.3s, the remaining 0.5s biting in); starting blur fixed at **1/8 of font size**; the end-state tracking of −0.03em (slightly tightened, not zeroed) — that final bite; the fade-in being **independent of the spring** and only half its length (0.5s linear) — that offset; the implementation discipline that `letter-spacing` must use em units; the whole line as a **single element** (no character splitting) with `nowrap`; the hard constraint of **zero displacement, zero scaling**; the "4~8 characters" cap.
- Does not belong to this card: the demo's specific copy, the 72px font size and 700 weight, the ink color `#171717`, the sans-serif family choice, the white stage (the source is explicitly white, but inverting to light text on dark works equally), and the "centered full-screen, no host" placement — the demo omits the host because this card's semantics are "the whole screen yields to one title"; in application, keeping the host in frame also works (the title lands in the empty zone above or below the host, as long as that band is sufficiently empty).
- Migration interface: the title copy is written directly in the HTML (4~8 characters); energy is tuned solely via `startTracking` (em — no change across sizes); `startBlur` scales as 1/8 of font size; **the spring config, `endTracking`, and the `fadeDur`-to-`springDur` ratio are feel constants — do not touch them across sizes or speech paces** (changing the spring config requires recomputing `springDur`); `hold` may exceed 2s (this card is a title, not a caption); for portrait, use 4~6 characters with the font size reduced to 46~56px (opening width ≈ font size × count × 1.5 must stay under 90% of available width, or both ends get clipped).
- Background requirements: white is best (the source is explicitly white — **the tracking convergence is only legible against "emptiness"**: the characters need enough whitespace around them for viewers to see "the gaps shrinking"). Inverting to light text on dark works equally. Two hard constraints: ① the background must not carry fine texture or high-frequency detail (in the first half of the convergence the text is a translucent smear; bleeding detail makes it illegible); ② the background must not carry horizontal stripes or a horizontal gradient (the tracking convergence is horizontal motion, and directional horizontal patterning creates parallax illusions against it). A gradient background is fine; live-action busy backgrounds are not (this card carries no backing plate, and outlining is unsuitable — an outline fills the 0.5em gaps further and weakens the "scattered" read).
