---
name: chart-grow
title: The axes fade in over 0.3s to set the stage, bars grow from 0 in a stagger with numbers popping onto each bar top, and the tallest key bar highlights and triggers a light punch
usage: Narration segments reciting data comparisons ("revenue grew sevenfold"); the staple of finance/science/review landscape videos, paced to match item-by-item enumeration
---

## Intent
Let the numbers "grow" out rather than be pasted on — the growth order is the narration's enumeration order, and the viewer's eyes follow the words.
Critical rules: **axes before bars** (without a coordinate system, bars have no magnitude), **bar-by-bar stagger** (growing simultaneously = losing the "item-by-item enumeration" cadence),
**the y-axis full range fixed throughout** (rescale midway and the comparison between bars is a lie).

## Motion Core
- First beat: axis lines + gridlines + chart title, opacity 0→1, 0.3s power2.out
- Bars: each scaleY 0→1 (transform-origin at the bottom), 0.5s power3.out, 100–150ms stagger between bars
- Bar-top numbers: at about 70% of a bar's progress, scale 0.4→1 + opacity pop (back.out(2)), nearly the same frame as the bar topping out
- Hierarchy color: regular bars in gray tones (the white-background demo uses #d2d2d7), the key bar (tallest/conclusion bar) in the semantic highlight color (demo #d8383a) with a larger number — what matters is the relation "one colored, the rest gray"; the color values swap with the style
- Finish: the instant the key bar tops out, the whole chart does a light punch, scale 1→1.03→1 (0.08s up + 0.22s back.out return)
- Line-chart variant: path stroke-dashoffset drawing over 1–1.5s, data points scale-popping along the way, the end value counting up

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Single-bar growth | 0.5s | >0.8s the viewer grows impatient; <0.3s five bars mash into one motion |
| Bar stagger | 130ms | >250ms drags into introducing each bar; <80ms reads as simultaneous growth |
| Number pop timing | 70% of bar progress | After the bar tops out it looks pasted on; right as the bar starts it spoils the final value |
| Key-bar color | One highlighted, the rest gray | Every bar colored = no conclusion; the gray bars exist as the red bar's backdrop |
| Punch amplitude | 1.03 | >1.06 the chart is dancing; without the punch the conclusion bar lacks the "hammer drop" |
| Y-axis full range | Fixed (demo 100) | Scaling dynamically with the max distorts all bar-height comparisons |

## Known Pitfalls
- All bars growing at once — no "year one, year two…" cadence; information density drops to zero.
- The y-axis changing scale midway — an 85 bar looks barely taller than a 45 one; instant data-fraud vibes.
- Labels out of sync with bars — the bar stops and the number saunters in later, like animation by two different people.
- Bars animated via height instead of scaleY — layout reflow jank; low-end devices drop frames.

## Reuse Guide
- HTML/GSAP: demos/chart-grow/index.html; change data by editing `.bar-col`'s `data-v` and the year text (heights computed automatically against `CONFIG.maxVal`); move the `hot` class to relocate the key bar; rhythm in `CONFIG`.
- Remotion port: each bar driven by `spring({frame: frame - i*4, config:{damping:14}})` on scaleY; number label delay = i*4 + Math.round(growDur*0.7); the punch uses interpolate over three keyframes [1, 1.03, 1].
- (Field-tested variant) Grouped stagger: with multiple grouped metrics, don't stagger per bar — appear **per group** left to right (about 0.5s between groups), with bars inside a group growing together — the stagger level lifts from "bar" to "group", matching narration's "first quarter… second quarter…"; after all groups finish, one large conclusion number pops on top to close. See TheAIScaler (Apm_oCzPEQs).
- Editing-software equivalents: Jianying's "chart" stickers offer only canned styles; the refined version needs AE (rectangle layers with scale keyframes + anchor at the bottom) or a PR MOGRT; an Excel screen recording is the cautionary counterexample.

## Scope
- Belongs to this card: the opening "establish the coordinate system" beat of axes + grid + title opacity 0→1 (0.3s, power2.out); each bar's scaleY 0→1 (0.5s, power3.out, transform-origin at the bottom) with 100–150ms stagger as the item-enumeration rhythm; the bar-top number's scale 0.4→1 + fade pop at about 72% of its bar's progress (0.25s, back.out(2)); the constraint of the y-axis full range fixed throughout; the whole-chart light punch scale 1→1.03→1 the instant the key bar tops out (0.08s up + 0.22s back.out(3) return); the "one highlighted, the rest gray" hierarchy-color relation (which bar gets highlighted belongs to this card; the specific color value does not).
- Does not belong to this card: the specific data and year copy, bar width/corner radius/spacing, gridline density, the caption line and chart-title text, the highlight color's specific value.
- Migration interface: change data via `.bar-col`'s `data-v`, move the highlight via the `hot` class; `maxVal` sets the full range (must stay fixed); `barGrow` / `barStagger` scale together with enumeration pace; `labelPopAt` tunes number-to-bar-top sync; `punchScale` tunes the conclusion's hammer force; the palette needs only two tokens — grayscale for regular bars + a semantic color for the key bar (the bar-top number and the caption's emphasized words follow the key-bar color).
- Background requirements: a white background suffices (axes #c8c8cc, grid #ececef, regular bars #d2d2d7). On dark, invert those three layers into dark grays and keep the key-bar color highly saturated; timing unchanged.
