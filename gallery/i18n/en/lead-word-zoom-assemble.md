---
name: lead-word-zoom-assemble
title: The lead word "Efficiency" owns the centre of the frame at 2.3× and keeps pushing in 6% during a 0.4s hold; then one power3.inOut curve does both "shrink back to final size" (0.4s) and "slide the whole line left into place" (0.8s, same start, same curve, twice the length), the following words are each pushed in from 28px right of their slot (0.4s power4.out, only 2 frames of fade), the conclusion word lands in the accent colour; once settled the line rises 28px while a sub-line surfaces in the same window, rests 3s and exits together
usage: A one-sentence claim whose subject must land first ("Efficiency — is the only moat"), product / person "introducing" cards, number-first lines ("3× — the output, same hours"), reversals that flash the negation first ("Not → Not a lack of effort, the wrong direction"); the text plane of quote / turning-point shots, lead word ≤4 characters
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Text-only card; with a presenter on screen place the line in the opposite half, and the 2.3× lead word must stay out of the face-safe area | ✗ | ✗ |

Works on the quote / claim / headline layer, never on the bottom follow-along subtitle.

## Common scenarios
1. A claim whose subject lands first: "Efficiency → Efficiency is the only moat" (the demo)
2. Product / person "introducing" cards (lead word in the accent colour, `accentIndex = 0`)
3. Number first: "3× → 3× the output, same hours"
4. Reversal: flash the negation "Not" → complete "Not a lack of effort — the wrong direction"

## Intent
When the narration delivers a claim, the stress usually sits on the first word ("Efficiency — is the only moat"). `type-contrast-emphasis` enlarges the stressed word when it is spoken; this card does the opposite: **the stressed word appears first at a size that fills the frame, then shrinks back so the sentence can complete around it** — the viewer is hit by one word, then understands where it sits in the sentence. The scale gap (2.3×) is the impact; "one curve" is the cinematic feel. Four things make it work:
1. **Shrink and slide share one easing**: the tail where the size has landed but the position is still travelling is the cinematic part; separate curves break it into "shrink, then slide".
2. **The following words are pushed in, not faded in**: 28px of travel over 0.4s with only 2 frames of fade; a longer fade makes them "appear" and the mechanical push is lost.
3. **The pivot is pinned to the lead word's centre**: transform-origin = the lead word's centre as a fraction of the line, so the lead word never moves while scaling and the viewer's anchor holds.
4. **Rise and sub-line in the same window**: the space the line vacates is filled by the sub-line on the same frame; rising first and then revealing leaves an empty beat.

## Motion core
- **Geometry** (960×540): line 56px / 600 / letter-spacing −1 ink, `.lwz-line` absolute at `left 50% / top 250` with a base `translate(-50%, -50%)`; gaps between words are separate inline-block `.lwz-sp` (0.28em wide) — a trailing space inside a word span gets clipped by the line box (origin verdict); conclusion word `#0066cc`. Sub-line 22px `#7a7a7a`, `top 318`, centred. After the rise, the line + sub-line group centres at ≈ y 270.
- **Pivot measurement**: `L = line width`, `c = lead offsetLeft + width/2`, `ratio = c/L` → `transform-origin: ratio×100% 50%`; eccentricity `slide = L × (0.5 − ratio)` puts the 2.3× lead word at the exact centre.
- **Lead solo**: at 0.1s the lead fades in over 0.15s; the line scales 2.3 → 2.438 (×1.06) over 0.4s `power2.out` (still coming at the viewer during the hold).
- **Shrink + slide**: from 0.5s scale 2.438 → 1 over 0.4s `power3.inOut`; x slide → 0 over 0.8s `power3.inOut` (same start, same curve, double length).
- **Following words**: word i starts at `0.5 + 0.2 + i×0.13`, x 28 → 0 over 0.4s `power4.out`, opacity 0 → 1 in 0.07s; its gap span hard-cuts on the same frame.
- **Rise + sub-line**: at 1.4s the line y 0 → −28 over 0.53s `power2.out`; sub-line opacity 0 → 1 and y 16 → 0 in the same window and curve.
- **Exit**: at 4.4s line + sub-line opacity → 0 over 0.4s `power2.in`, done at 4.8s; the origin's closing crash-zoom is dropped (in narration the line rests once landed; transitions belong to the six motion-carry cards).

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `leadScale` | 2.3 | Lets the lead word spill slightly past the sides ("too big to fit"); <1.8 is just a bigger word; a lead word >4 characters overflows at 2.3× |
| `pushScale` | 1.06 | The minimum perceptible "still coming at you" during the hold; >1.15 reads as a reverse bounce when shrinking |
| `hold` | 0.4s (≈12f) | <0.27 the word can't be read; >0.67 the sentence's rhythm collapses |
| `shrink` / `slide` | 0.4s / 0.8s, same power3.inOut | The slide at double length is the gliding tail; a faster separate curve for the shrink makes the line "finish shrinking, then slide" |
| `wordDelay` / `wordStagger` | 0.2s / 0.13s (≈4f) | Following words only start once the lead begins shrinking; zero stagger makes the whole suffix enter at once — back to "whole-sentence fade" |
| `wordPush` / `wordFade` | 28px / 0.07s | 28px ≈ 0.5em is "just outside the slot"; >1em reads as flying in from off-screen; fade >0.2s and words "appear" |
| `up` / `upDur` | −28px / 0.53s | Makes room for the sub-line; the sub-line must share the window |
| `holdEnd` | 3.0s | Time to read the sentence and sub-line; <1.5 the sub-line goes unread |
| Letter-spacing | −1px (negative) | Negative tracking keeps the 2.3× word from falling apart; positive tracking reads as a banner |

## Pitfalls
- Shrink and slide on separate curves — breaks into "shrink, then slide".
- Word fade stretched to 0.2s+ — words "appear" instead of being pushed into their slots.
- Spaces inside word spans — all words stick together once landed (origin verdict); use separate inline-block gaps.
- A lead word longer than 4 characters — overflows both sides at 2.3×; shorten it or drop to 1.8× (and accept half the impact).
- Keeping the origin's closing crash-zoom — played alone it looks unfinished; in narration the line rests once landed.
- Sub-line waiting for the rise to finish — an empty beat.
- Positive tracking on the big word — reads as a slogan banner, not a word hitting you.

## Reuse
- Remotion/tsx (preferred): template/cards/lead-word-zoom-assemble.tsx — `words` (lead word first) / `subline` / `accentIndex` / `accent`; durationInFrames 156; the pivot is measured once with `useLayoutEffect + delayRender`.
- HTML/GSAP: demos/lead-word-zoom-assemble/index.html — edit the words inside `.lwz-line` and the `.lwz-sub` copy, timing in `CONFIG`; the pivot is measured by the script.
- Origin: video-shotcraft `lead-word-zoom-assemble` (closing crash-zoom handoff removed; baseline measurement replaced by the line box's vertical centre).
- NLE equivalents: in CapCut/JianYing give the lead word its own text layer with scale + position keyframes and the other words position + opacity keyframes (opacity finishing within 2 frames); in AE pin the text layer's Anchor Point to the lead word's centre and drive Scale/Position with one easing, following words via a Text Animator Position range by word.
- Interface with layout.md: the line + sub-line group centres on the y=270 midline (§1); horizontal centring within ≤48 (§4); hero-tier single line 56px@960 (§5); with a presenter, place the line on the opposite side and keep the 2.3× lead word out of the face-safe area.

## Motion scope
- Belongs to this card: the 2.3× solo lead + 6% push during the hold; shrink and slide starting together on one curve at a 1:2 length ratio; the 28px push / 2-frame fade ratio of the following words; pivot pinned to the lead word; rise and sub-line in one window.
- Not part of the card: the copy, the accent hex, whether a sub-line exists (optional).
- Migration interface: `words / subline / accentIndex / accent`; at 1080p double the sizes (112 / 44), wordPush 56, up −56.
- Background requirement: white or parchment; on dark stages just invert the colours.

## Placement self-check (copy into the SHOTBOOK self-check column when selecting this card)
- Three hero frames: lead solo (0.3s), mid-shrink (0.9s), landed (2.6s). On the solo frame the lead word is horizontally centred within ≤48 and does not cross the 48px safe margin on either side.
- On the mid-shrink frame the lead word's centre x matches the solo frame (pivot criterion); following words are partly visible with their fade already complete.
- After landing, the line + sub-line group's bounding-box centre is at y ≈ 270 ± 16, horizontally centred within ≤48.
- The colour change happens only on the conclusion word; no second accent colour appears in the sentence.
- ≥45 frames of true stillness after landing.
