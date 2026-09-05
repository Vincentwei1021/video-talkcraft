---
name: chip-grid-single-select
title: N candidate chips spread out 3+2 and centred so the viewer can read the question (first 2s); on the pick frame a 1-frame grey press is inserted, then a 5-frame linear blackout (bg→ink, text→white) plus a 1→1.04→1 sine bounce, while the other chips drop to 18% with their positions locked; after 1.5s the rest go to zero, the black chip rises 46px, shrinks to 0.82 and shifts horizontally back to the centre line, and an equation line fades in word by word — "pick it, and then…"
usage: Narration's "which of N plans / tiers / tools did I pick → what happens after" decision-plus-consequence shot; revealing poll or survey results; elimination down to the last one. Pure text input; the presenter is not involved
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Not involved (with a person on screen, put the whole group in the opposite half; chip rows ≤ half width) | ✗ | ✗ The card carries its own chips and equation; no assets |

Text only: one question line, 2–6 options, the selected index, one equation line (with accented words).

## Common scenarios
1. "Five plans, which do I pick → it saves 72 hours a month" (the demo)
2. Plan / tier / tool selection: "three editions, I bought Pro because…"
3. Poll / survey reveal: selected = the majority's choice
4. Elimination: dim as you rule out, the last one goes black

## Intent
When narration says "out of these I picked this one", `parallel-items-with-host`'s grey-to-colour **lights up all of them** (parallel, no choice) and `focus-dim-spotlight` brightens whichever is being discussed but **never chooses** (the focus moves on). Single-select blackout is **choice + consequence**: one frame pressed, turned black, the others retreat to 18% in place — "not chosen" rather than "gone"; after a full 1.5s the chosen one rises, narrows and centres, and the equation line continues with "and then…". Five things make it work:
1. **The grey flash is one frame only**: two or more frames read as hover, not press.
2. **Blackout is linear, no ease**: "turning black" should have no sense of process; eased is too soft.
3. **The others' positions are locked** (transform stays none): staying put at 18% reads as "not chosen"; any move reads as "dragged away / vanished".
4. **Wait ≥1.5s after the pick before collapsing**: the viewer must register the chosen state; 0.5s is rushed.
5. **Compensate horizontally on collapse**: without adding cx, the black chip rises in its old column and reads as dragged away.

## Motion core
- **Geometry** (960×540): question 30px/700 centred at top 116; chip container top 200, rows y=0 / 66; chip height 48, radius 24, padding 0 22, 1.5px #d6d6dc border, 20px/600 ink; at most 3 per row, widths measured then centred on 480 with 14px gaps; equation 30px/600 centred at top 300, accented words 700 in the accent colour.
- **Reading**: question from 0.1s over 0.4s `power3.out` (opacity + y 8→0); chips from 0.5s fade in one every 0.1s over 0.25s.
- **Pick FS = 2.0s**: grey layer `rgba(120,120,120,.5)` visible during [FS, FS+0.033) (one frame); from FS+0.033 a 0.17s linear blackout (bg #fff→#1d1d1f, text #1d1d1f→#fff, border→#1d1d1f); a 0.34s sine bounce `scale = 1 + sin(p·π)·0.04` starts together; the others fade to 0.18 over 0.34s `power2.out` with no transform.
- **Collapse LIFT = FS+1.5**: the others go to 0 over 0.3s; the black chip over 0.4s `power2.inOut` `translate(cx, −46) scale(0.82)`, `cx = 480 − (chip centre x)`; the equation fades in over 0.3s from LIFT+0.25 and from LIFT+0.3 its words deepen from 0.25 to 1 at 0.16s intervals.
- **Exit**: at 6.4s question + black chip + equation opacity→0 over 0.4s `power2.in`, done at 6.8s. Once landed, everything rests.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `FS` pick moment | 2.0s | First half reading, second half result; <1.2 the viewer hasn't finished the options |
| `flash` grey press | 0.033s (1 frame) | **Vital**: two or more frames read as hover |
| `black` blackout | 0.17s linear | Deliberately linear; eased is too soft |
| `bounceAmp` | 0.04 | Feather-light; 0.1 becomes a bouncy button that steals the scene |
| `dim` rest opacity | 0.18 | Position locked; 0 reads as vanished, >0.35 the choice doesn't read |
| `lift` collapse delay | 1.5s | The minimum dwell to register the chosen state |
| `liftY / liftScale` | −46px / 0.82 | Rising makes room for the equation; without cx it reads as dragged |
| `eqStagger` | 0.16s/word | Word-by-word deepening is "the conclusion forming"; all at once reads as pasted text |
| Option count | 2–6 (≤3 per row) | >6 won't fit two rows or get read; 2 options suit split-compare better |

## Pitfalls
- Grey flash of 2+ frames — hover, not press.
- Eased blackout — turning black gains a "process", goes soft.
- Moving or shrinking the others while dimming — reads as vanished / dragged; transform must stay none.
- Collapsing too early (<1s) — the viewer didn't see who was picked.
- Rising without cx compensation — the black chip sits off in its old column.
- Equation lit all at once — no sense of the conclusion forming.

## Reuse
- Remotion/tsx (preferred): template/cards/chip-grid-single-select.tsx — `question / options / selected / equation=[{text, accent}]`; durationInFrames 216; pick moment via `CONFIG.FS`, sentence length via `exitAt / end`. Chip widths are measured once in useLayoutEffect (delayRender); layout and cx derive from them.
- HTML/GSAP: demos/chip-grid-single-select/index.html — `.chip` copy and the `.sel` class, `.eq span` copy and the `.acc` class, `CONFIG`.
- Source: video-shotcraft `chip-grid-single-select-blackout` (a pricing-interaction version; this card swaps in narration copy, mechanism unchanged).
- NLE equivalents: one sticker per chip in CapCut/JianYing, a 1-frame grey mask on the pick frame plus 5-frame colour keyframes; opacity keyframes to 18% on the rest; in AE a Fill effect with linear colour keyframes plus Opacity.
- Interface with layout.md: chip rows measured and centred on 480 (§4 bounding box centred); chip text 20px = the item tier floor of 40@1080p (§5); the three groups (question / chips / equation) are 84 / 100 apart, ≥ the 14 inside a group (§2).

## Motion scope
- Belongs to this card: the three-stage pick (1-frame grey flash → 5-frame linear blackout → sine bounce); the others at 18% with locked positions; the 1.5s dwell then rise + shrink + cx recentring; the word-by-word equation; the shared exit.
- Not this card: the specific copy, the white stage, the exact chip size.
- Migration interface: `question / options / selected / equation`; `FS` follows the word anchor; at 1080p chips are 96 high, type 40 / 60, liftY −92.
- Background: white is enough (the blackout works on ink contrast); on dark, the chosen state becomes "white-out" (bg→white, text→ink), mechanism unchanged.

## Placement checks (copy into the SHOTBOOK self-check column)
- Each chip row's bounding-box centre x off by ≤48; both rows centred.
- `shot-at FS+0.02` frozen on the flash frame: only the chosen chip has the grey layer, nothing else changed; `shot-at FS+0.5`: chosen chip fully black with white text, the rest at 18% in exactly the same positions as the frame before the pick.
- `shot-at LIFT+0.5`: black chip centre x = 480 ± 8, the rest at opacity 0, the equation visible.
- Nothing enters the subtitle band y ≥ 450 (equation bottom ≈ 340).
- Final frame: only question + black chip + equation remain, all still.
