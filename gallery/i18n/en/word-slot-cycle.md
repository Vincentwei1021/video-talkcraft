---
name: word-slot-cycle
title: The sentence stem "One AI helps you" is pinned at its left edge; a dark pill at the end of the sentence flips up one row every 0.7s to show the next phrase (8 frames of power2.inOut travel with motion blur, then 13 frames of rest to read), its width interpolating to each word's width, with two ghost rows at 13% above and below hinting "there's a list"; after 4 words the pill flies up and away in 0.23s and the conclusion "gets everything done" lands into the same slot from 90px below with a back.out(1.4) overshoot — the only overshoot on the card, saved for the conclusion — then rests ≥1.5s and exits with the stem
usage: "It helps you A / B / C / D" feature or use-case lists in narration, audience lists (students / office workers / creators → everyone), chapter previews (today: sourcing / pricing / ads), repeated constructions (not X, not Y, but Z); 4–6 phrases with the last one as the conclusion; faster than a bullet list, more rhythmic than fading words in one by one
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Text-only card; with a presenter on screen place the sentence in the opposite half (layout §4) | ✗ | ✗ |

Works on a headline / key-point layer, never on the bottom follow-along subtitle (plain-subtitle rule).

## Common scenarios
1. "It helps you write code / fix your résumé / build slides / look things up → gets everything done" feature or use-case lists (the demo)
2. Audience lists: "for students / office workers / creators → everyone", the last word being the conclusion
3. Chapter previews: "today we cover sourcing / pricing / ads — three things" (conclusion becomes "three things")
4. Repeated constructions: "not X, not Y, but Z" (the final beat switches to the accent colour; earlier words stay in the ink pill)

## Intent
When the narration lists four parallel things and there is **no presenter and no footage** on screen, a bullet list takes four lines and word-by-word fades have no rhythm — while the ear hears the same construction repeating. The picture should move only the slot that changes. Word-slot cycling pins the stem and swaps a single word at the end of the sentence: the minimal visual form of "a list". The viewer recognises the construction at once and then just reads the new word on each beat. Four things make it work:
1. **The stem is absolutely positioned and pinned at its left edge — never flex-centred**: a widening pill would reflow the stem and the whole sentence would lurch (shotcraft's first-round verdict). Centring here is computed once from "stem + gap + conclusion" total width.
2. **8 frames of travel, 13 frames of rest per beat**: the rest is reading time; a beat you can't finish reading is a beat that didn't happen. Below 0.55s a phrase can't be read, above 0.95s the metronome feel dissolves.
3. **New word decelerates in, old word accelerates away**: the reel eases at both ends (power2.inOut) like a drum starting and stopping; the pill's final exit uses power2.in — the direction reads as "page up".
4. **The card's only overshoot goes to the conclusion**: the list is flat; back.out(1.4) on the conclusion creates the hierarchy. It then rests ≥1.5s — that sentence is the point of the whole passage.

## Motion core
- **Geometry** (960×540): sentence 40px / 700 / letter-spacing −0.5 ink `#1d1d1f`, `.wsc-sent` absolute at `top 238` (line box 64, centre on y=270), `left = (960 − (stemWidth + 14 + conclusionWidth)) / 2` measured once with a hidden ruler; 14px between stem and slot.
- **Pill**: height 56, radius 999, `#1d1d1f` background, white 30px / 700, padding 24×2 → width = word width + 48; `overflow hidden`, the `.wsc-reel` inside stacks all words vertically (56 each). Pill text must be smaller than the stem (equal size reads as two competing headlines).
- **Ghost rows**: outside the pill at `top −50` / `top 62`, 30px / 700 ink, opacity 0.13, showing the previous / next word; hidden 0.1s before each swap, shown again 0.15s after.
- **Entrance**: stem at 0.2s, pill at 0.28s, each 0.5s `power3.out` (opacity 0→1, y 14→0); ghosts fade to 0.13 over 0.3s from 0.7s.
- **Swap** (the i-th at `1.1 + (i−1)·0.7`): reel `translateY → −i·56` over 0.27s `power2.inOut`; in the same window reel blur 0→4 (first 45%, power1.in) →0 (last 55%, power2.out); pill and slot width interpolate to the new word width with `power2.inOut`; the ghost text changes on the frame the swap ends.
- **Wrap-up** (`lastAt` = last swap + 0.7 + 0.35 = 3.55): ghosts hide 0.12s earlier; pill `y → −130 / blur 10 / opacity 0` over 0.23s `power2.in`; slot width changes to the conclusion width over 0.3s `power2.out`; the conclusion starts +0.12s later, `y 90→0` over 0.47s `back.out(1.4)`, opacity done in the first third, accent colour `#0066cc`.
- **Exit**: `exitAt = lastAt + 2.5 = 6.05`, stem + conclusion opacity→0 over 0.4s `power2.in`, done at 6.45s. Once landed everything rests; no idle.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `beat` | 0.7s / word | <0.55 can't read a phrase; >0.95 the metronome dissolves; 4–6 words, 8+ and viewers start counting |
| `swap` | 0.27s (≈8f) | Stretched to 0.4s+ old and new share the screen too long — two words fighting |
| `row` / `pad` | 56 / 48 | Pill height must equal reel row height; pad <32 the word touches the edge, >80 the pill turns into a button |
| `swapBlur` | 4px | Without it the swap reads as a hard snap; >8 the mid-frames smear into a blob |
| `ghostAlpha` | 0.13 | The sweet spot for "visible but not competing"; >0.25 reads as three rows of text; remove it and the "there's more" hint is gone |
| `flyOut` / `finalIn` | 0.23s / 0.47s back.out(1.4) | Exit is more decisive than entry; overshoot >2 looks cartoonish, no overshoot and the conclusion has no hierarchy over the list |
| `holdEnd` | 2.5s (≥1.5) | The conclusion is the point; no hold means the list was for nothing |
| `firstSwapAt` | 1.1s | Opening rest so the construction is recognised; <0.8 the stem isn't read before the first swap |
| Word length spread | ≤2× | Beyond 2× the pill jumps too hard and the sentence's weight lurches; split or shorten long phrases |

## Pitfalls
- Flex-centring the sentence — every width change moves the stem and the sentence lurches (verdict case); centre only via a one-time left computed from the total width.
- Too little rest (beat <0.55) — the phrase can't be read, the swap didn't happen.
- Swap without blur — reads as a hard snap; the drum feel comes from "fast then very slow + a touch of blur".
- Pill text ≥ stem size — two competing headlines; a badge attached to a sentence must be smaller.
- No overshoot on the conclusion, or overshoot given to a middle word — list and conclusion have the same weight and the viewer can't tell what matters.
- Cutting right after the conclusion lands — that line is the point; rest ≥1.5s.
- Ghost rows >0.25 — no longer an "outer ring" hint, reads as three parallel lines of text.

## Reuse
- Remotion/tsx (preferred): template/cards/word-slot-cycle.tsx — four props `stem / words / final / accent`; durationInFrames 206 for 4 words (recompute as `lastAt + holdEnd + exitDur` when the word count changes); word / stem / conclusion widths are measured once with `useLayoutEffect + delayRender` (static geometry, not a running animation).
- HTML/GSAP: demos/word-slot-cycle/index.html — edit `STEM / WORDS / FINAL` and `CONFIG`; the stem's left is derived from the total width by the script.
- Origin: video-shotcraft `pill-slot-cycle` (pinned stem + closing beat), `pill-chip-slot-cycle-handled` (per-frame pill width interpolation), `vertical-word-roll-blur-cycle` (drum-style neighbour rows), merged into one card.
- NLE equivalents: no direct preset in CapCut/JianYing — keyframe per word: a shape with width keyframes for the pill, position + blur keyframes for the words; in AE a Text Animator (Position + Blur, Range Selector by word) plus a shape layer whose width follows the text via a sourceRectAtTime expression.
- Interface with layout.md: single subject on the centre line y=270 (§1); the sentence's bounding box centred in its conclusion state (§4, offset ≤48); the 30px pill text is above the 20@960 list-item floor (§5).

## Motion scope
- Belongs to this card: pinned stem + single-slot swapping; the 8-frame travel / 13-frame rest ratio inside a 0.7s beat; power2.inOut reel with motion blur; pill width following the word; 0.13 ghost rows; the final pill fly-out and the conclusion's single overshoot; the conclusion's ≥1.5s hold.
- Not part of the card: the copy, the accent hex, the dark pill (a dark pill on a light background is the identity; a dark stage needs the whole palette inverted).
- Migration interface: `stem / words / final / accent`; at 1080p double the sizes (80 / 60), pill height 112, pad 96; place swap points where the narration says each phrase.
- Background requirement: white or parchment; on dark stages switch to a light pill with inverted text and raise ghost opacity to 0.18.

## Placement self-check (copy into the SHOTBOOK self-check column when selecting this card)
- Two hero frames: mid-swap (e.g. 1.9s) and after the conclusion lands (e.g. 4.6s); in the conclusion state the sentence's bounding box is horizontally centred within ≤48 and its centre y ≈ 270.
- On the mid-swap frame: one ghost row above and one below the pill, opacity 0.13 ± 0.03; the pill's word never overflows the pill.
- Before and after any swap: the x of the stem's first glyph doesn't move (pin criterion); only the pill's right edge follows the word width.
- At least 45 frames of complete stillness after the conclusion lands.
- With a presenter on screen, place the sentence at the centre of the opposite half (x = 240 or 720@960), outside the face-safe area.
