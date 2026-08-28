---
name: keyword-pop-highlight
title: The instant the caption reaches the keyword, that word — riding a color-block backing — pops from 0 to 1.65× and settles back to a 1.15× freeze, with the whole frame giving a micro-shake in sync
usage: The information peak of each narration passage (numbers, conclusions, twist words); works with or without an on-camera host — the first default emphasis move for narration
---

## Intent
Narration's auditory downbeat needs a visual downbeat to pair with — so viewers scrolling on mute still catch the point.
Critical rules: **fast** (pop ≤0.2s; slower reads as a PPT entrance), **half a beat late** (pop only when the voice reaches the word;
appearing with the full caption kills the "slammed out" force), **with recoil** (overshoot to 1.65 then settle;
linear scaling reads as zooming an asset, not emphasis).

## Motion Core
- Keyword wrapped in its own span, `transform-origin` at the word's bottom center (50% 80%)
- Entrance: scale 0→1.65 + rotate -8°→2°, 0.18s, `power4.out`
- Settle: scale 1.65→1.15 + rotate back to zero, 0.22s, `back.out(2.5)` — the freeze is slightly larger than body text
- Impact frame: at the pop instant, the whole frame shakes ±7px on x for 3 round trips (0.04s each), transmitting the "slam" force
- Color-block backing: dark-red block with skewX(-6°), popping together with the word; the keyword in high-saturation yellow sits on the block, pulled apart from the body text color
- Keyword span keeps ≥0.3em side margins: the 1.15× freeze + skew overflows horizontally, and insufficient margin lets the block cover adjacent characters

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Max scale | 1.65 | >1.9 reads as comedy/gag content; <1.3 not emphatic enough |
| Pop duration | 0.18s | >0.3s reads as a PPT animation; <0.1s the motion direction is unreadable |
| Freeze scale | 1.15 | Back at 1.0 the emphasis disappears; >1.3 wrecks the sentence's layout |
| Delay | 0.4~0.6s | Must align with the vocal stress; early is a spoiler, late reads as lag |
| Shake amplitude | 7px | >12px reads as a glitch; 0 halves the "slam" feel |
| Word side margin | 0.36em | Leaves overflow room for the enlarged freeze + skew; <0.2em the block covers adjacent characters |

## Usage Cap (user-finalized 2026-08-27)
- This card is **the only motion allowed to act on the bottom follow-along captions** (the plain-caption iron rule is design-language.md §5),
  and it may appear **at most 3 times per video** unless the user explicitly asks for more. Exceeding that isn't more emphasis — it dilutes emphasis into noise.
- The `keywords` prop of `template/motion-systems/Subtitles.tsx` has this cap built in as a self-check (more than 3 throws outright;
  pass `allowExtraKeywordPops` to override when the user explicitly asks).

## Known Pitfalls
- Appearing on the same frame as the full caption — no time gap, no emphasis; instantly fake.
- Default center transform-origin — the word bulges both up and down, squashing adjacent text; anchoring at the word's base makes it "grow out of the caption".
- Fading in instead of the scale pop — reads as a typewriter, not a downbeat.
- Popping two or more keywords in one sentence — downbeats fight each other; equivalent to no downbeat at all.

## Reuse Guide
- HTML/GSAP: demos/keyword-pop-highlight/index.html; edit the copy inside `.caption` and the `CONFIG` constants; the block color is in `.kw::before`.
- Remotion port: drive scale with `spring({frame, config:{damping:12, stiffness:200}})`, shake via `Math.sin(frame*3)*7*exp(-frame/4)` decay; convert the keyword delay to frames aligned with the audio waveform peak.
- Editing-software equivalents: JianYing "Text templates → variety show" category; in AE it's scale keyframes + an Overshoot expression; CapCut "text bounce".
- (Field-tested variant) The third emphasis channel is **typeface contrast** — beyond the scale bounce and color change, you can swap the stressed word into large serif italic type with deliberately light, non-overshooting motion, going for restrained editorial temperament instead of variety-show energy. That channel is now its own card: see references/cards/type-contrast-emphasis.md (the signature mechanism of TheAIScaler's 8/10 shorts). Division of labor: this card = the downbeat needs to "slam" (bounce + shake + color block); type-contrast-emphasis = the downbeat needs to "hold steady" (typeface contrast + light upward slide); **the two must never mix in the same sentence** — recoil and temperament contrast on the same screen instantly reads fake.

## Scope
- Belongs to this card: the keyword's scale 0→1.65 + rotate −8°→2° pop (0.18s, power4.out, transform-origin at the word base 50% 80%); the overshoot-and-settle of scale 1.65→1.15 + rotate to zero (0.22s, back.out(2.5)); the same-frame full-screen x ±7px shake, 3 round trips (0.24s, constant rate) as the impact frame; the color-block backing popping on the same transform as the word (skewX −6° as static deformation, never animated separately); the timing relationship of the keyword appearing 0.4~0.6s after the full caption.
- Not part of this card: the host silhouette and caption-zone placeholders, the example line, type size/weight/family, the specific colors of block and keyword (dark red / high-saturation yellow are just one instance of "block and word must contrast strongly").
- Portability interface: `popScale`/`restScale` set the emphasis magnitude, `popIn`/`settle` set the speed, `delay` aligns with the vocal-stress frame, `shakePx` sets the impact force; recoloring edits `.kw`'s color and `.kw::before`'s background (only requirement: three-way contrast among block, word, and body text holds); when resizing, padding/margins in em scale with type size, and the word's side margin never drops below 0.2em.
- Background requirements: white is fine (the block backing carries its own opaque background; the motion doesn't depend on the stage color; on dark, just invert the pairing of body-text color and keyword color).
