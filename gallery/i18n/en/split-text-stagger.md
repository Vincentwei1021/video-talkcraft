---
name: split-text-stagger
title: Each of the 9 characters of the title "Make complicated things simple" rises inside its own clipping box (height = line height 78) from 115% below with a back.out(1.2) ≈10% overshoot, staggered 2 frames (0.067s) apart at 0.5s per character; at the same time a 3px baseline grows left-to-right (scaleX) to the full line width, its duration equal to the characters' total stagger so it completes on the very frame the last character lands — the characters seem to grow out of a line; the subtitle fades in at 1.4s and everything exits together at 4.4s
usage: Brisk entrance for chapter titles / key lines, film or channel name cards, key sentences stepping up one at a time (one rise each), pairing with underline cards (the baseline becomes the underline); the "clipped + baseline" variant of per-character-rise — pick this for typographic structure (characters cut by a line as they grow), pick per-character-rise for pure "one breath pushing up" momentum
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Text-only card; with a presenter on screen place the group in the opposite half (layout §4) | ✗ | ✗ |

Works on the headline layer, never on the bottom follow-along subtitle (plain-subtitle rule).

## Common scenarios
1. Brisk entrance for a chapter title / key line: "Make complicated things simple" (the demo)
2. Film / channel name card (the baseline doubles as a brand rule)
3. Key sentences stepping up one at a time: one rise each, the baseline adapts to each line's width
4. Hand-off to `ink-underline`: the baseline left behind is the line the later highlight draws on

## Intent
The library's per-character entrance is `per-character-rise` — each character rises 44% from below its own position with separate easing for movement and fade, staggered only 1 frame, reading as "one breath pushing up", with no clipping and no line. This card is its **typographic** variant: each character rises inside a clipping box, its lower half "cut" by the baseline as it emerges, while that baseline itself is growing — adding the "characters growing out of a line" structure that suits chapter titles and name cards that want a little ceremony. Four things make it work:
1. **10% overshoot** (back.out 1.2): the source's 6% is measurable but imperceptible; at normal speed the settle must be visible.
2. **Clipping box height = line height**: the character emerges "cut" from below the baseline — this cut is the entire difference from `per-character-rise`; extra headroom in the box turns it into ordinary displacement.
3. **Baseline growth duration = the characters' total stagger**: it completes on the frame the last character lands; a line finishing first, or still growing after the characters have landed, reads as two animations.
4. **True stillness ≥30f once everyone has landed**: rest once landed, no idle.

## Motion core
- **Geometry** (960×540): line 64px / 700 / letter-spacing −1 ink `#1d1d1f`, `.sts-line` centred (left 50% + translateX −50%) at `top 240`, character gap 2; each `.sts-ch` is 78 high / line-height 78 / `overflow hidden`, the inner span carries `translateY(%)`. Baseline `.sts-base` 3px ink at `top 322`, width = line width (measured once), `left 50%` + `translateX(−W/2)`, `transform-origin 0 50%`. Subtitle 20px `#7a7a7a` centred at `top 344`.
- **Rise**: character i starts at `0.3 + i×0.067`, 0.5s `back.out(1.2)`: `translateY 115% → 0` (the part outside the box is clipped). With 9 characters the last starts at 0.84 and lands at 1.34.
- **Baseline**: from 0.3s `scaleX 0→1` over `0.5 + 0.067×8 = 1.036s`, `power2.out`.
- **Subtitle**: fades in over 0.4s from 1.4s.
- **Exit**: at 4.4s line + baseline + subtitle opacity→0 over 0.4s `power2.in`, done at 4.8s.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `over` | back.out(1.2) ≈ 10% overshoot | <1.0 measurable but imperceptible; >1.7 the characters bounce like a cartoon |
| `stagger` | 0.067s (2f) | 0 and the whole line rises together like a fade-in; >0.12 reads as typing |
| `dur` | 0.5s | <0.3 the overshoot settle can't be seen; >0.7 drags |
| Clip box height | = line height 78 | Taller than the line height exposes the rise and the clipped feel is gone |
| Baseline weight | 3px | 2px reads as a hairline on the 960 stage, >4px as a colour bar |
| `subAt` | 1.4s (last landing +0.06) | A subtitle appearing before the last character lands steals the beat |
| Character count | ≤14 per line | Break the line rather than shrink the type (layout §5); a second line is a second group |

## Pitfalls
- Overshoot of 6% or less — measurable but imperceptible, same as none.
- Headroom in the clip box — the whole character slides up in view, ordinary displacement, no different from per-character-rise.
- Baseline and characters out of sync — the line finishes first or keeps growing after the characters land; two animations.
- Positive letter-spacing — large type with positive tracking reads as a banner; this card uses −1.
- Anything still moving after landing (a breathing baseline, floating characters) — violates motion subtraction.

## Reuse
- Remotion/tsx (preferred): template/cards/split-text-stagger.tsx — two props `text / sub`; durationInFrames 156; the line width is measured once with `useLayoutEffect + delayRender` for the baseline.
- HTML/GSAP: demos/split-text-stagger/index.html — edit `TEXT / SUB` and `CONFIG`; the baseline width is read from `line.offsetWidth`.
- Source: video-shotcraft `type-assembly-moves` style A split-text-stagger (styles B drift-assembly with a breathing merge, C tracking-expand and D text-on-path were not ported).
- Division of labour with `per-character-rise`: that card is "one breath pushing up" (1-frame stagger, no clipping, no overshoot) for key lines / emotional sentences; this card is "characters growing out of a line" (2-frame stagger, clipped, 10% overshoot, baseline) for chapter titles / name cards. Use both in one film by "emotion vs structure", never mixed in the same scene.
- NLE equivalents: CapCut's "text → in → rise per character" has no clipping — add a mask to the text; in AE use a Text Animator (Position Y + Range Selector) with an alpha matte on the text layer and Trim Paths on a shape layer for the baseline.
- Interface with layout.md: the line's bounding box is centred (§4, offset ≤48), centre y ≈ 279; 64px is in the title tier (§5); baseline-to-subtitle 22px and title-to-baseline 4px are in-group spacing (§2).

## Motion scope
- Belongs to the card: per-character rise inside clipping boxes (115%→0, back.out 1.2, 2-frame stagger); baseline growing in sync with the characters' total duration; subtitle following.
- Not part of the card: the copy, the type size (follow the film's type scale), the white stage, the baseline colour (the film's ink).
- Migration interface: `text / sub`; at 1080p double the font (128), box height 156, baseline 6px; place the first rise on the word anchor where the narration reads the title's first character.
- Background: white / parchment work; on dark backgrounds invert characters and baseline to white.

## Placement check (copy into the SHOTBOOK self-check column when the card is chosen)
- Two stills: mid-rise (e.g. 0.7s) the first characters have overshot and settled, the last few show only their upper halves, the baseline is ≈60% grown; landed (e.g. 2.0s) line, baseline and subtitle are all still.
- Line bounding box centred within ≤48px, centre y ≈ 279; the baseline's ends align with the first and last character edges (≤4px).
- The baseline completes on the same frame the last character lands (1.34s), within 2 frames.
- With a presenter on screen, centre the group in the opposite half (x = 240 or 720@960).
