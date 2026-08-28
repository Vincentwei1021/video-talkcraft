---
name: type-contrast-emphasis
title: Captions append word by word — ordinary words get a light sans-serif small-size pop; the instant the accented word is spoken it switches to serif italic scaled 1.5~2x (or to the single accent color); the emphasis is hammered entirely by the drop in typographic temperament, with the motion itself kept deliberately light — no bounce, no overshoot
usage: Each narration segment's judgment line / reversal line / conclusion word — especially "not A, but B" contrastive phrasing; restrained, editorially-minded knowledge and personal-opinion narration that wants emphasis without variety-show bouncing
---

## Intent
Word-by-word bouncing captions do emphasis by "moving bigger", at the cost of the whole sentence jumping — cheap over time. Typographic contrast takes the other road:
**emphasis via the drop in letterform temperament, not via scale bouncing** — ordinary words are the "narrating voice" of medium sans-serif, and the accented word switches to
the "quoting voice" of large serif italic; two voices share the screen, and viewers' eyes know which word matters before their ears catch up.
Vital points: **the drop must be large enough** (font size ×1.5~2 + a family change; scaling without switching family reads as stretched footage, switching family without scaling
is indistinguishable at a distance), **the motion must be light enough** (0.15s slide-up fade-in; adding a bounce degrades it to bouncing captions — mixing the two languages is instantly fake),
**one accent per sentence** (two large serif words fight each other, which equals no accent at all).

## Motion Core
- The whole sentence pre-reserves space per its final layout: all words get their DOM built up front with `opacity: 0` holding position, so word-by-word appending never reflows
- **All words share one baseline** (container `align-items: baseline`): the accented word's large glyphs grow upward from the shared baseline;
  if the baseline moves, the whole sentence scatters — this is the card's only hard layout constraint
- Ordinary words: sans-serif, weight 600, base font size; entrance `opacity 0→1` + `scale 0.95→1`, 0.1s `power2.out`,
  `transform-origin: 50% 100%` (anchored at the baseline — the light pop doesn't push it). No overshoot
- Accented word · Channel ① letterform: switch to a serif family (Songti/STSong/Source Han Serif; Latin: Georgia/Playfair) +
  font size ×1.5~2; Chinese has no true italics, so use `skewX(-6~-10°)` for explicit slant (consistent across platforms, not relying on synthetic italics)
- Accented word · Channel ② color: family unchanged, switch to the piece's single accent color + weight 800 + font size ×1.4~1.6
- Accented word entrance: `y +14px→0` sliding up from below the baseline and settling, same-frame `scale 0.92→1` + fade-in, 0.15s `power3.out` —
  "pushing up" into place, no overshoot
- The two channels are **alternatives** (pick one per word), never stacked: serif italic + accent color + scaling all together reads as sticker lettering
- Two modes: **append** (spoken words persist; the full sentence freezes on completion — suits contrastive phrasing) /
  **relay** (only the current word persists; the previous word hard-cuts away — suits fast-paced short lines)
- Layering: the accented word may sit on its own line, pressed over footage or the host — the large glyphs just need a white outline; the other words stay in the caption row

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `--tc-base` | 30~34px (960 wide) | Ordinary-word base font size; the accented word's size derives from it — change this one number to rescale everything |
| `--tc-serif-scale` | 1.6 | Serif accent scale factor; <1.4 the hierarchy is indistinguishable at a distance and emphasis fails; >2.1 one word eats half the row and the sentence stops reading as a sentence |
| `--tc-color-scale` | 1.5 | Color-channel accent scale factor; with color helping, it can sit slightly lower than the letterform channel — 1.3~1.6 all work |
| `obliqueDeg` | −7° | The explicit slant angle for Chinese italics; 0 makes the large serif read as a "headline" rather than an "accent", <−12° it starts reading as a crookedly pasted sticker |
| `accentIn` | 0.15s | Accent-word entrance; >0.3s reads as a PowerPoint entrance, <0.08s the "pushing up" is illegible |
| `accentRise` | 14px (≈30% of font size) | Slide-up distance; 0 leaves only a fade-in with no "push" energy, >60% of font size reads as flying in from the next line |
| `wordIn` | 0.10s | Ordinary word's light pop; >0.2s can't keep up with speech pace — the sentence never finishes laying out |
| `wordFromScale` | 0.95 | Ordinary word's starting scale; <0.85, or switching to `back.out`, instantly degrades into bouncing captions and the card's restraint is gone |
| `beat` spacing | 0.2~0.7s, uneven | Word-level speech timestamps, taken straight from forced alignment; uniform spacing instantly reads as a ticker |

## Known Pitfalls
- Scaling without switching family — pure scaling reads as "footage stretched", not an accent; switching family is the very body of this card.
- Switching family without scaling — on white, the serif/sans difference at small sizes is near zero from a distance; muted-scroll viewers can't catch the point.
- Adding `back.out`/`elastic` bounce to the accented word — degrades into keyword-pop-highlight's language; mixing temperament contrast with bounce emphasis is instantly fake; this card's accent must "push up steadily".
- Writing `font-style: italic` directly on Chinese accented words — most Chinese families lack italic glyphs; browser-synthesized italics are inconsistent across platforms (sometimes inert); must be an explicit `skewX` slant.
- Words lacking a common baseline (using `align-items: center`, or letting the large word stretch its own line-height) — the whole row jumps up and down when the large word arrives; viewers read it as a layout bug.
- Accented word without left/right margins — the slanted serif's top-right corner juts out and presses the neighboring characters; leave at least 4px (or 0.15em).
- Two or more serif large words in one sentence — the accents fight, which equals no accent (the two channels split across two words also counts as two accents).
- More than one accent color — this card's color channel must reuse the piece's single accent; one more color and it becomes sticker lettering.

## Reuse Guide
- Division of labor with keyword-pop-highlight: that card's accent must "slam" (scale 1.65 overshoot + color block + full-screen shake); this card's accent must be "steady" (letterform temperament drop + a 0.15s light slide-up, no overshoot). Within one sentence **only one card may be chosen** — bounce emphasis and temperament contrast on the same screen is instantly fake; within one video, split by segment tone (high-energy segments take keyword-pop-highlight, judgment/conclusion lines take this card). See references/cards/keyword-pop-highlight.md.
- HTML/GSAP: demos/type-contrast-emphasis/index.html. Change copy via `CONFIG.words` (`w` word split + `beat` word-level speech timestamp + `emph: "serif" | "color"` selecting the channel; omit for ordinary words); change size via the single CSS variable `--tc-base`; the drop magnitude lives in `--tc-serif-scale` / `--tc-color-scale`; the accent color in `.tc-word.emph-color`'s `color`; the feel in `accentIn` / `accentRise` / `obliqueDeg`. The extractable core = `CONFIG` + the innards of the `DemoShell.register` callback.
- Remotion port: ordinary word `opacity: interpolate(frame, [b, b+3], [0, 1])` + `scale: interpolate(frame, [b, b+3], [0.95, 1])` (b = the word's speech frame, `extrapolate*: 'clamp'`, `transformOrigin: '50% 100%'`); accented word takes `[b, b+5]` on the same range, `y: interpolate(..., [14, 0], {easing: Easing.out(Easing.cubic)})` + `scale [0.92, 1]`, writing `skewX(-7deg)` as a static term in `transform` (keep it out of the interpolation); the family/size drop lives entirely in style constants, never in interpolation; `beat` is filled straight from whisper/forced-alignment word-level timestamps converted to frames. Relay mode steps the previous word's opacity to 0 at frame `bNext`.
- Editing-software equivalents: Jianying/CapCut — split the accented word onto its own text track, switch the font to a serif family with slant enabled, scale to 1.5~2×, enter via "fade + slide up" (turn off every bounce/decorative preset); AE — the same text with two Text Animators (one Range Selector affecting only ordinary words doing scale 0.95→1, one affecting only the accented word doing Position + Scale), the family drop via Source Text keyframes or simply separate layers, slant via the Skew property; Jianying's "text template" presets are all off-limits (built-in bouncing and decoration destroy this card's restraint).

## Scope
- Belongs to this card: the word-by-word append timing (driven by word-level speech timestamps, unevenly spaced); the ordinary word's light pop (opacity 0→1 + scale 0.95→1, 0.1s, power2.out, origin anchored at the baseline, **no overshoot**); the accented word's entrance (y +14px→0 slide-up settle + scale 0.92→1 + fade-in, 0.15s, power3.out, no overshoot); the accented word's two alternative channels (① serif family switch + explicit skewX slant + font size ×1.5~2; ② the single accent color + font size ×1.4~1.6) with the "pick one, never stack" discipline; the whole sentence sharing one baseline with pre-reserved, reflow-free layout; one accent per sentence; the two persistence modes, append / relay.
- Does not belong to this card: the host placeholder (digital human), the sample script and word split, the caption's placement in the right white zone, the specific 32px `--tc-base`, the specific Songti/PingFang families (this card wants the "serif vs sans-serif" drop, not any particular font), the specific accent value `#0066cc`, the text color `#1d1d1f`.
- Migration interface: `beat` swaps to the target audio track's word-level timestamps; `--tc-base` is the single number that rescales everything (`accentRise` scales along at 30% of font size); the family drop swaps to the target style's "body family / quote family" pair (serif↔sans, regular↔heavy handwriting all work, so long as the temperament difference is legible at thumbnail size); the color channel's `color` swaps to the project's single accent; on dark or busy live-action backgrounds, invert text colors (ordinary words white, accented word accent) and give the large accent glyphs a 2~3px outline for readability; `mode` switched to `"relay"` runs relay mode (the previous word hard-cuts away on the next word's speech frame).
- Background requirements: plain white is fine (the letterform/size drop is background-independent — this card's most portable property). The only hard requirement is that "the ordinary-vs-accent contrast holds simultaneously" — on busy backgrounds give the large accent glyphs an outline, and never let the accent color fall into the background's brightness range.
