---
name: soft-blur-in
title: A sentence appears as if being focused by a lens — the whole line starts from blur (1/6 of the font size), de-blurring and fading in over the full 0.9s, while a settle displacement of 22% of the font size occupies only the first 0.3s; the per-character stagger is just 1 frame (0.033s), leaving a barely readable left-to-right sweep
usage: Subtitle entrances that need to be "light" — calm narration lines, conclusion lines, small headings within a chapter; soft-toned talking-heads (knowledge channels, interviews, brand films); the first line on screen after a footage cut; not for accented words that need punching, nor for continuous read-along subtitles that track speech pace
---

## Intent
This library's existing subtitle cards all "punch": `keyword-pop-highlight` slams accents, `typewriter-reveal` types character by character.
They all have explicit beats,
and so share one cost — **they all compete for attention**. Fill a passage with such text and the audience's eyes are constantly being yanked.

This card fills in **the lowest-energy subtitle entrance**: the text doesn't "appear," it gets **focused into view**.
What the audience perceives is "this sentence was always in the frame — I only just now saw it clearly," not "a sentence flew in."
That's why it works where text is plentiful and frequent — narration lines, conclusion lines, the first line after a footage cut —
five in a row and the frame still never feels busy.

Two keys: (1) **de-blur and fade run the full 0.9s; displacement occupies only the first 33% (0.3s)**. If displacement and de-blur stop together, it reads as
"the block being pushed up" (a directional entrance); with displacement stopping first, the remaining 0.6s is pure de-blur — that is the "focusing" semantics;
(2) **the per-character stagger is only 1 frame (0.033s)**. This value is small enough to barely count as "per-character" — a 9-character sentence spans only 0.27s from first to last;
the eye reads it as one block, yet a faint left-to-right progression remains. Enlarge the stagger past 0.1s and it instantly becomes
a different card ("per-character soft focus" — the energy tier jumps whole levels, and it's no longer this card).

## Motion Core
- **Three properties on one timeline, but the displacement stops earlier than the other two**:
  - `opacity 0 → 1` and `filter: blur(fontSize/6) → 0` (demo 72px ⇒ 12px): run the full `dur = 0.9s`
  - `translateY +12px → 0`: runs only `travel = 0.3s` (= 33% of `dur`)
  - All three start together; the displacement stops first — **the entire source of the softness**
- **Per-character stagger 0.033s (1 frame in the source @30fps)**: the i-th character starts at `lead + i × 0.033`.
  Chinese splits by code point (`Array.from`), i.e. per hanzi; punctuation counts as a character too and correctly rides along
- **One easing for the whole card, `cubic-bezier(0.22, 1, 0.36, 1)`** (easeOutQuint family): extremely fast attack, a long decelerating tail.
  Displacement and de-blur share the same easing family so their "deceleration feel" reads as one thing. GSAP core lacks `CustomEase`;
  the demo solves `x(t)=p` by Newton iteration and takes `y(t)` (8 iterations, error <1e-5)
- **The blur amount is fixed at 1/6 of the font size** (12px @72px in the source; this library's demo is likewise 72px ⇒ 12px). This is a ratio constant, not an absolute —
  changing the font size means scaling it proportionally, or big type "doesn't blur enough" and small type "gets blurred away"
- **Each character is its own `inline-block`**: `transform-origin: 50% 55%` (center of gravity slightly low, so characters don't float upward at the end of de-blur),
  `backface-visibility: hidden` (avoiding Safari's compositing-layer jitter when filter and transform run together)
- **The whole line uses `letter-spacing: -0.05em`** (the source value): slightly tightened, so the de-focused sentence reads as "one block," not "a row of characters"
- **`white-space: nowrap` is a hard requirement**: every character is an independent inline-block; without nowrap the browser will wrap between any two characters
- **Layering**: white stage → the line flex-centered → single characters (the only elements receiving transform / filter)

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| `dur` | 0.9s | Total de-blur + fade duration, this card's energy knob; <0.5s reads as an ordinary fade (losing the soft-focus semantics), >1.4s the audience waits for the text to clear while the narration has moved on |
| `travel` | 0.3s | **Displacement occupies the first 33% of `dur` — this card's first key**; = `dur` (displacement and de-blur stopping together) instantly reads as "the block being pushed up," no longer focusing; 0 removes all weight and the text floats in mid-air de-blurring |
| `stagger` | 0.033s | **Per-character stagger, this card's second key**; 0 = pure block (losing the faint progression — acceptable but flatter), >0.1s becomes "per-character soft focus" (a different card, one full energy tier up) |
| `blur` | fontSize/6 (72px ⇒ 12px) | Starting blur amount, **a ratio constant**; < fontSize/12 reads as mild defocus with no visible "focusing" process, > fontSize/4 the opening is a fog and the audience doesn't know where to look |
| `rise` | 16px (≈22% of font size, 72px ⇒ 16px) | Starting settle amount; 0 loses that touch of weight (usable but floatier), >40% of font size reads as "slide-up fade-in" (direction overpowers the soft focus) |
| `lead` | 0.3s | Opening stillness waiting for the narration to start; at 0 the text and the frame appear together and the audience has no time to shift attention |
| `hold` | 1.2s | Closing freeze — the clear full sentence is this card's landing point; size by character count (about 0.15s per character, plus half a beat after the read-through) |
| Character count | 6–12 | Longer sentences accumulate stagger into a wide head-to-tail gap (20 characters ⇒ 0.67s, and the sentence reads as "swept" rather than "one block") — either cut `stagger` to 0.02s or split the sentence |

## Known Pitfalls
- Displacement and de-blur ending together — the sentence reads as "pushed up," and the focusing semantics vanish outright; displacement must occupy only the first 33%.
- Stagger enlarged past 0.1s while still calling it soft-blur-in — that's already "per-character soft focus"; the energy tier jumps from low to medium and it upstages narration lines.
- `blur` written as an absolute pixel value and reused as-is — after a font-size change, big type under-blurs and small type gets blurred away; the blur amount must scale at fontSize/6.
- The line not locked with `white-space: nowrap` — every character is an independent inline-block, so the browser wraps between any two characters, and the opening frame's line layout is simply wrong.
- Applying `filter: blur()` to the whole line (rather than single characters) — the line becomes one compositing layer, the per-character stagger is entirely lost, and a CJK line smears into one gray band.
- Displacement and de-blur on two different easings — their "deceleration feel" stops being one thing; in slow motion you can see the characters stop first and then de-blur separately: disjointed.
- Forgetting `backface-visibility: hidden` on characters — with filter and transform running together, Safari's compositing layer jitters at the tail of the de-blur.
- Used on a sentence that needs an accent — nothing in this card ever weighs one character over another; to slam an accent, switch to `keyword-pop-highlight` or `type-contrast-emphasis`.
- Copying the ink color `#171717` straight onto a dark ground — on dark, this card only needs the text inverted, but blur "halos" show more on dark grounds, so pull `blur` in to fontSize/8.
- Replaying by resetting transforms without rebuilding the DOM — after a copy change the character count differs, old spans linger, and the stagger sequence no longer matches the actual characters.

## Reuse Guide
- HTML/GSAP: demos/soft-blur-in/index.html. **To change content, edit only the `CONFIG.text` string** (6–12 characters);
  character splitting and the stagger sequence are computed at runtime. Tune energy only via `dur` (`travel` must keep its ~33% ratio — the ratio is the feel);
  to change the font size, edit `.sb-text`'s `font-size`, then set `CONFIG.blur` to 1/6 of the new size and `CONFIG.rise` to 22% of it.
  The line's placement is `.sb-line` (the demo uses `inset: 0` + full-screen flex centering — **a pure text card**, no host;
  to keep a person in frame, shrink `.sb-line` to a white column and pull `font-size` back for the new width).
  The `cubicBezier()` solver is general-purpose — other demos needing `cubic-bezier` easing can copy it directly.
- Remotion port: the source `registry/remocn/soft-blur-in/index.tsx` is a per-frame lookup implementation (no timeline; each frame computes how blurred each character should be),
  more direct in Remotion than porting a GSAP timeline — copy it as-is. **Frame↔second conversion (source 30fps)**:
  `charDurationFrames 27` ⇒ `dur 0.9s`, `charTravelFrames 9` ⇒ `travel 0.3s`, `staggerFrames 1` ⇒ `stagger 0.033s`.
  Three `interpolate` calls per character, all passed `easing: Easing.bezier(0.22, 1, 0.36, 1)` +
  `extrapolateLeft/Right: "clamp"` (**clamp cannot be omitted** — without it, characters with `local < 0` compute negative opacity and negative blur;
  Chrome refuses to render `blur(-3px)` and that character flashes before its start):
  `local = frame - i * staggerFrames` is the local clock shared by the three interpolates.
  Size conversion: the source `fontSize 72` is for a 1280×720 frame; this library's demo is **full-screen pure text**, using 72px directly on the 960 stage,
  so `blur 12` and `distance 16` match the source (ratios unchanged: blur = fontSize/6, distance = 22% of font size).
- Editing-software equivalents: CapCut — the "blur entrance" and "fade in" presets on a text layer are **both wrong** (the former has no displacement, the latter no blur);
  the correct build is one text layer + a "Gaussian blur" effect with two keyframes (9 → 0, 0.9s) + two opacity keys (0 → 100, 0.9s) +
  two position keys (12px below → 0, **only 0.3s**); the per-character stagger can't be built in CapCut ("character-by-character reveal" is a hard cut, not soft focus),
  and since a 0.033s stagger is barely readable anyway, **dropping the stagger and doing the block version is a reasonable trade**.
  AE — one text layer, `Fast Box Blur` (Blurriness 9 → 0) + `Opacity` + `Position`, three keyframe groups,
  the curve hand-shaped in the Graph Editor to `(0.22,1,0.36,1)` (or `Easy Ease Out` with the handle pulled all the way — close enough);
  for the stagger use a `Text Animator`: Blur + Opacity + Position properties, with the `Range Selector`'s `Offset` running from −100% to 0%,
  **`Advanced → Ease High` maxed out** (otherwise the default linear range selector makes the stagger read as a visible light sweep).
- Division of labor among this library's sibling cards: `keyword-pop-highlight` = one accent slammed per sentence;
  `typewriter-reveal` = typed out character by character (an archival beat); `per-character-rise` = characters rising one by one (a directional entrance);
  **this card = the lowest-energy whole-line entrance** (no beats, no direction, no accent — just focusing the text into view).
  It is the only subtitle card you can **use five lines in a row without the frame getting busy**, and for that same reason it can carry no emphasis duty.

## Scope
- Belongs to this card: the timing discipline of `opacity 0→1` and `blur → 0` running the full 0.9s while `translateY` occupies only the first 0.3s (33%); the ratio that the starting blur is fixed at **1/6 of the font size**; the `stagger 0.033s` (1 frame in the source) magnitude of "so small it's barely per-character"; displacement and de-blur sharing one `cubic-bezier(0.22, 1, 0.36, 1)`; the slightly low `transform-origin: 50% 55%` center of gravity; the starting settle of ≈22% of font size; the implementation discipline of per-character `inline-block` + whole-line `nowrap` (refusing filter on the whole line).
- Does not belong to this card: the demo's specific sentence "the answer is usually simpler than that," the 72px size and 600 weight, the `#171717` ink, `letter-spacing: -0.05em` (a tightening value for Latin type; CJK may take anything from 0 to −0.05em), the sans-serif family choice, the white-ground stage, and the "line centered on stage" placement (frame center, lower third, and the caption safe area all work). **The demo is a pure text card with no host** (user sign-off 2026-08-25) — because this card's action is "a sentence being focused into view," a person in frame pulls attention away from this extremely low-energy action; but keeping a person in frame on the application side is equally valid (the sentence sits in the empty column beside them or in the caption safe area, as long as that zone is clear) — placement is not part of this card's motion proper.
- Migration interface: `CONFIG.text` is the sole content entry point (6–12 characters); tune energy only via `dur`, with `travel` keeping its ~33% ratio; scale `blur` at fontSize/6 and `rise` at 22% of font size; `stagger` is a **feel constant — never touch it for size or speech-pace changes** (only cut to 0.02s past 12 characters); size `hold` by character count (about 0.15s per character); for vertical video use 6–9 characters and pull the size to 40–46px (this card has no horizontal crowding; the only constraint is the `nowrap` line staying within 90% of the available width).
- Background requirement: white or dark grounds both work (on dark, just invert the text color). The one constraint is that **the ground must have no fine texture or high-frequency detail** — through the 0.9s of de-blur the text is a "translucent smudge," and ground detail bleeding through mixes with the smudge until the audience can't read it as text. Gradient grounds are fine (low frequency); live-action busy grounds are not (either press a translucent panel underneath first, or switch to high-contrast subtitles — white text with a dark stroke/shadow).
