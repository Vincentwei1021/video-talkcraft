---
name: number-counter
title: A large number rolls from 0 to the target value over 1~1.5s, fast then slow, with a light scale pulse the instant it lands and a gain/loss arrow fading in afterward; the variant is a per-digit odometer where higher digits stop first
usage: The moments finance/science narration drops a key number (revenue, sales, growth rate); letting the number "grow" out rather than be pasted on; data-dense tonality
---

## Intent
Pasted straight onto the screen, a number is merely "seen"; rolled up from 0, the audience "counts" along with it — the sense of magnitude is rolled out.
Critical rules: **fast then slow** (easeOut makes the final digits clearly readable; linear rolling has no sense of landing),
**pulse once on landing** (scale 1→1.08→1, telling the audience "this is the number"),
**don't roll too long** (>2s the audience has finished hearing the sentence and the motion still running is scene-stealing).

## Motion Core
- Mode a (tween version): numeric object 0→target, 1~1.5s `power3.out`, real-time `toLocaleString` comma formatting in `onUpdate`; on the landing frame scale 1→1.08 (0.09s) →1 (0.18s `back.out(3)`, origin set at the number's bottom-left to avoid the whole line drifting); unit/gain-loss arrow then fades in over 0.25s + rises 6px
- Mode b (odometer version): one vertical reel per digit (a long strip of 0-9 repeated 2~3 loops, container overflow hidden); the reel's y rolls to the target position by "steps × row height" (demo row height 64px); higher digits get shorter durations, each lower digit adds 0.15~0.25s — high digits stop first, low digits converge afterward, and low digits must roll extra whole loops (must be a multiple of 10, otherwise they land on the wrong digit)
- Layout: large type (over 1/3 of screen width) + `font-variant-numeric: tabular-nums` (fixed-width digits prevent column jitter); a small side label explaining what the number is. Light or dark backgrounds both work, only requiring enough contrast between number and background
- Layers: label present first (or fading in simultaneously) → number rolls → unit/arrow last

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Count duration | 1.3s | Shortened to 0.8s it's crisp and suits fast cuts; >2s the audience grows impatient |
| Easing | power3.out | With power1.out the tail is still flipping digits, unreadable; expo.out's tail is too sticky |
| Landing pulse | 1.08 | >1.15 feels like a stress accent stealing the number's own scene; no pulse and "did it arrive or not" is unclear |
| Unit fade-in delay | Immediately after landing | Appearing with the number splits attention; more than 0.5s late looks like an omission |
| Odometer high-low digit offset | 0.22s/digit | Larger = stronger, more "mechanical" reel feel; at 0 everything stops together = ordinary digit flipping |
| Extra loops for low digits | 2 loops | More = more "slot machine"; at 0 loops the low digits barely move and the reels are wasted |

## Known Pitfalls
- Linear rolling — arriving at constant speed has no "landing" breath; the audience can't tell whether the number has stopped.
- Decimals/low digits rolling chaotically together — the magnitude is unreadable; either roll integers only, or use the odometer so high digits stop first and anchor the magnitude.
- Non-fixed-width digits — column widths jitter with the digits and the whole line jumps (must use tabular-nums or a monospaced font).
- Piling on the unit and arrow while still rolling — all the information arrives at once and the rolling's suspense is wasted; the unit is the reward for "landing."
- Rolling a target value that's too small (e.g. 0→7) — for two digits or fewer just pop it out; rolling looks affected.

## Reuse Guide
- HTML/GSAP: demos/number-counter/index.html. Mode a edits `CONFIG.target/countDur`, mode b edits `CONFIG.odoTarget` (a string, to preserve digit count); `buildOdometer()` auto-generates reels per digit, comma separators included.
- Remotion port: mode a `Math.floor(interpolate(frame, [0, dur], [0, target], {easing: Easing.out(Easing.cubic)}))` then toLocaleString; mode b one `<div>` per digit driving translateY with spring, delay incrementing by digit index.
- (Field-tested variant) ledger-card jump: in step-by-step account walkthroughs, don't roll — the line item's number **jumps instantly** to the new value, a small "+20" badge pops beside it, and the row lightly highlights on the same frame; because the audience needs to read "how much this step added," rolling would smear the delta. Suited to line-by-line accounting and cost-breakdown segments. See Xiao Lin Shuo · Korean stock crash.
- Editing-software equivalents: JianYing "text template → data/counter" category; AE with Slider Control + `Math.floor` expression (the classic approach); CapCut "Number counter" sticker.

## Scope
- Belongs to this card: mode a — the value's 0→target tween (1~1.5s, power3.out, real-time comma formatting in `onUpdate`), the scale 1→1.08→1 pulse the instant it lands (0.09s up + 0.18s back.out(3) return, origin at the number's bottom-left), gain-loss/unit fading in afterward over 0.25s + rising 6px; mode b — per-digit reel translateY rolling to the target position by "steps × row height" (power3.out), high digits shorter with each lower digit adding 0.22s (high digits stop first, low digits converge after), low digits' extra whole loops must be a multiple of 10. The layer order (label first → number rolls → unit/arrow last) also belongs to this card.
- Does not belong to this card: the host placeholder and column divider, the example values and label copy, font size/weight and layout beyond `tabular-nums`, the reel window's corner radius/border style, the specific gain-loss color values.
- Migration interface: `target` / `odoTarget` swap the values; `countDur`, `odoBase`, `odoStagger` scale with speaking pace (finish rolling within one narrated sentence as the benchmark); `landScale` tunes landing force; `spins` tunes the reels' mechanical feel; `digitH` must match the reel DOM's row height (change it in step with font size); the number uses the primary text color, gain-loss uses one semantic color token.
- Background requirement: white works (number in #1d1d1f). On dark, just invert the number and reel window colors; the counting and reel timing and easing are completely unchanged.
