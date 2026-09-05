---
name: countdown-arc-scatter
title: A run of consecutive descending numbers 11 / 10 / 9 … 5 / 4 / 3 hangs tangentially on a 150px arc; the whole dial sweeps from 96° back to 0° (0.57s, power2.out hard stop) with numbers beyond ±70° fading by angle so they "turn into view"; the moment it stops, the chosen "5" sits at the top of the arc and glides 0.3s into the title's first-character slot while rotating upright, the other numbers blur out in place without moving, "minutes / to set up / a creative system" defocus in word by word and the last word turns accent at 1.75s; then everything rests until the 4.6s exit
usage: Titles whose number is the suspense — a time promise ("set up a creative system in 5 minutes"), a count reveal ("3 principles"), a countdown-flavoured opener, a short shot that wants dial vocabulary; the number is "stopped" out of a run of candidates before landing, more of a reveal than a number that simply drops in
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Text-only card; with a presenter on screen place the group in the opposite half (layout §4) | ✗ | ✗ |

Works on the headline layer, never on the bottom follow-along subtitle (plain-subtitle rule).

## Common scenarios
1. Time promise: "set up a creative system in 5 minutes" — the "5" is swept to a stop out of 11…3 (the demo)
2. Count reveal: "3 principles / 7 habits" — leave a few numbers above and below the target
3. Countdown-flavoured opener: "10 seconds to tell you…"
4. Data shorts that want dial vocabulary (revealing a score or rank)

## Intent
When a title carries a number, `count-badge-title` lands the number first and pushes the rest of the sentence out — the number is **given**. This card sweeps the number to a stop out of a run of candidates — the number is **chosen**, adding a layer of "why 5?" reveal, for titles where the number itself is the narration's suspense. The dial exists only for one opening beat; once landed the whole frame is still, so it doesn't break motion subtraction. Five things make it work:
1. **The sweep hard-stops with power2.out**: the decelerating stop is the entire force of "arrived"; inOut becomes a gentle glide with none of a gauge's snap.
2. **Opacity by angle**: fully transparent beyond |70°|, fading in from 70→48° — the numbers "turn into view"; no mask (a mask's hard edge exposes "a picture rotating").
3. **The chosen number leaves right as the sweep stops, no rest in between**: a pause splits it into two actions; landing and uprighting share one curve (power2.inOut).
4. **The others defocus away in place, no displacement**: movement would compete with the chosen number's glide; they start 0.02 earlier to clear the way.
5. **Ticks at 0.35× speed**: the ticks turn slower than the dial, creating the "face vs hand" layering; at equal speed it reads as one rotating bitmap.

## Motion core
- **Geometry** (960×540): zero-size pivot at (480, 318); numbers 52px / 600 / tabular-nums / letter-spacing −1 ink, the i-th at position angle `pa = (i − pickIdx)·24° + rot`, coordinates `(sin pa·150, −cos pa·150)`, self-rotated by `pa` (tangential, as if engraved on the face); 15 ticks (3×22, `#c9c9cf`) on the R+38 ring at `(k−7)·12° + rot·0.35`. Title `.cas-ttl` centred at (480, 250), 52px / 600, word gap 16, first child an invisible slot whose width equals the chosen number.
- **Sweep**: `rot = lerp(96, 0, tw(t, 0.3, 0.57, power2.out))`; number opacity `clamp01((70 − |pa|)/22)`; tick opacity `clamp01((80 − |pa|)/20)·0.8`.
- **Scatter**: from 0.85s over 0.3s `power1.in`, non-chosen numbers opacity ×(1−out) and `blur(out·3px)`, positions unchanged; ticks multiplied by (1−out) too.
- **Landing**: from 0.87s over 0.3s `power2.inOut`, the chosen number lerps from its arc position to the slot centre (relative to pivot `(slotW/2 − ttlW/2, −68)`), self-rotation `pa·(1−hand)` uprights, opacity `max(angle opacity, hand)`.
- **Title**: three words each 0.35s `power2.out`: opacity 0→1, blur 6→0, starting 0.95 / 1.10 / 1.25 (windows overlap ≈0.2); the last word's colour lerps ink → accent from 1.75s over 0.25s.
- **Exit**: at 4.6s pivot + title opacity→0 over 0.4s `power2.in`, done at 5.0s. Once landed everything rests; no idle.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| Number run | 9 consecutive descending, chosen one in position 7 (6 swept past, 2 spare) | Consecutive numbers read as a countdown / range; the chosen position decides how many are swept — ≥4 before it for a "sweep past a run" feel |
| `step` | 24° | <18° numbers crowd, >30° only 3 visible at a time |
| `R` | 150px | <100 a tight little circle, >220 the arc is nearly straight and the dial feel is gone |
| `sweepFrom` / `sweep` | 96° / 0.57s power2.out | 96° ≈ 4 slots; the hard stop is the only "arrived" signal, inOut loses the gauge snap |
| `visAngle` / `visFeather` | 70° / 22° | Fade width ≈ one slot; 40 makes numbers enter half-transparent and mushy, 0 is a hard pop-in |
| `handAt` / `handDur` | 0.87 / 0.3s power2.inOut | Right after the stop (0.87 = 0.3 + 0.57); a rest in between splits it into two actions |
| `outAt` | 0.85 (0.02 before landing) | Clears the way first; later than the landing reads as two groups moving at once |
| `tickRatio` | 0.35 | The speed difference is the "face vs hand" layering; 1.0 reads as one bitmap |
| `wordStagger` / `wordDur` | 0.15 / 0.35s | Windows overlapping ≈0.2 read as one sentence; queued they read as three separate words |
| `accentAt` | 1.75s | The card's only colour event; on the last word it is the sentence's landing point |

## Pitfalls
- Sweep with inOut easing — a gentle glide, no gauge snap; the core violation.
- Clipping numbers with a mask instead of angle-based opacity — the hard edge exposes "a rotating bitmap".
- A rest before the chosen number lands — splits into "dial stops" and "number flies".
- Other numbers scattering with displacement — competes with the chosen number's glide; the viewer doesn't know where to look.
- Ticks at the same speed as numbers — layering gone, reads as one block turning.
- Non-consecutive / unevenly spaced numbers (the source's 45 / 35 / 28…) — user decision 2026-09-06: use consecutive descending numbers; it reads as a countdown, not a gauge range.
- Title words queued without overlap — three separate entrances, not one sentence.

## Reuse
- Remotion/tsx (preferred): template/cards/countdown-arc-scatter.tsx — four props `numbers / pick / words / accent`; durationInFrames 162; the title width and the invisible slot width are measured once with `useLayoutEffect + delayRender` (the landing point is derived from them).
- HTML/GSAP: demos/countdown-arc-scatter/index.html — edit `NUMBERS / PICK / WORDS / ACCENT` and `CONFIG`; `apply()` places every number and tick as a pure function of three proxies (rot / hand / out).
- Source: video-shotcraft `countdown-arc-scatter` (number run changed from an uneven gauge range to consecutive descending; everything else as-is).
- Division of labour with `count-badge-title`: that card's number is given (scales 1.6× into place and pushes the rest out) — for ordinary counted titles where the number isn't the suspense; this card's number is swept and chosen — for titles where the number is the reveal. Stagger the two in different sections of one film.
- NLE equivalents: no CapCut equivalent; in AE parent 9 text layers to a Null pivot and keyframe its rotation (Easy Ease Out with high influence), drive opacity with an expression on `Math.abs(position angle)`, and keyframe the chosen number's position on its own layer.
- Interface with layout.md: title bounding box centred at (480, 250) (§4, offset ≤48); 52px is above the title-tier floor (§5); during the sweep the highest number sits at y ≈ 168 and ticks at ≈ 130, inside the safe margin.

## Motion scope
- Belongs to the card: tangential arc layout + full-dial sweep with hard stop; angle-based "turning into view"; chosen number landing + uprighting on one curve; the others defocusing in place; tick speed differential; word-by-word title defocus + last-word accent.
- Not part of the card: the specific number run and copy, the accent value, the white stage.
- Migration interface: `numbers / pick / words / accent`; at 1080p double the font (104) and R (300), keep step; place the "stop" on the word anchor where the narration says the number (`sweepAt = anchor − 0.57`).
- Background: white / parchment work; on dark backgrounds invert numbers and ticks (ticks `#5a5a60`).

## Placement check (copy into the SHOTBOOK self-check column when the card is chosen)
- Three stills: mid-sweep (e.g. 0.6s) 5–6 numbers visible on the arc with both ends fading; the stop instant (0.87s) the chosen number sits directly above the pivot at (480, 168); landed (e.g. 2.4s) the chosen number shares a baseline with the words, word gap 16.
- Title bounding box centred within ≤48px, centre y ≈ 250; the chosen number and the invisible slot centre coincide within ≤4px.
- After landing (≥2.0s) at least 60 frames of stillness (no tick, number or word moving).
- With a presenter on screen, centre the group in the opposite half (x = 240 or 720@960) and move the pivot with it.
