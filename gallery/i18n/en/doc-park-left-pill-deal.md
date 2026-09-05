---
name: doc-park-left-pill-deal
title: A 700×420 document sits full-frame for 0.9s, then instead of fading it parks — anchored at its left edge (0.8s power2.inOut, translateX −514 + scale .92) so only ~35% stays visible ("the source is still here") — while on the right three white outlined pills are dealt slowly to the narration every 1.3s (0.2s fade + 0.37s back.out(1.7) landing: solid first, settled second), and 0.3s after each pill lands the explanatory line beneath it deepens word by word and stays; the document content auto-scrolls at −18.75 px/s the whole time ("being read"); three pills landed form a static list of conclusions, everything exits together at 6.6s
usage: "I read this report / paper / long article and wrote down three things" takeaway shots; review comments given one by one (the thing being reviewed on the left); "this page tells me three things"; conclusion shots in document-understanding AI topics. Input is one document / long screenshot plus three conclusions; no presenter on screen
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ The presenter doesn't take part (for a presenter with bullet points use split-60-40-story with the person in the left cell) | ✗ The document is a static thing being read; a screen recording as the document works if slowed | ✓ (default) a long screenshot of a document / report / paper, still slow-scrolling after parking |

Takes one document plus three conclusion lines (+ one explanatory line each).

## Common scenarios
1. "Read 60 pages, wrote down three things" — the document parks left, three conclusions are dealt one by one (the demo)
2. Paper / long-form takeaways: paper front page on the left, three takeaways on the right
3. Reviews / critiques: the page or work being reviewed on the left, comments one by one on the right
4. "This page tells me three things": a web screenshot on the left, three points on the right

## Intent
When narration moves from "reading something" to "giving conclusions", the usual move is fade the document out, fade conclusions in — the source disappears and the conclusions seem to come from nowhere. `split-60-40-story` is split from the start and has no "reading" phase. This card's drama is the **parking** action: the document is shown full-frame first so the viewer sees what it is, then it **shrinks to one side without disappearing**, and the space freed on the right receives conclusions at the pace of the narration — the meaning is "read → distil", with the source on screen throughout. Four things make it work:
1. **Parking is not fading**: scaled about the left edge, the document's right edge stops at x≈260; the visible 35% is enough to recognise "that's the one from a moment ago".
2. **The parking window closes before the first pill** (1.7 < 1.9): overlap gives a muddy "document still sliding while pills are being dealt".
3. **Pills solid first, settled second**: the 0.2s opacity window is fast, the 0.37s travel with overshoot is slow — the feel of a card landing on a table; equal windows read as a plain fade.
4. **Explanatory lines deepen word by word and stay** (fixed by the user on 2026-09-06; upstream clears each before the next pill): three landed pills = a static list of conclusions the viewer can look back at.

## Motion core
- **Geometry** (960×540): document `.dpk-doc` from 130×60, 700×420, white with 1px hairline, radius 14, the one shadow, `transform-origin 0% 50%`; inner `.in` padding 34×40, title 26px / 700, grey bars 12 high (sub-heading bars 16 high, 60% wide). Hint `.dpk-hint` from 380×78, 16px `#7a7a7a`, tracking 1. Pill column `.dpk-pills` from 380×130, width 500: pills 52 high, radius 26, white with a 1.5px `#d6d6dc` outline, 22px / 600, a 10px accent dot on the left, 100 apart vertically; explanatory line 18px `#7a7a7a` 60 below each pill, word spans start at opacity .3.
- **Constant scroll**: `.in` `translateY(−18.75 px/s × t)` linear, duration = shot length (written as a rate, not seconds).
- **Park**: from 0.9s, 0.8s `power2.inOut`: `x 0→−514`, `scale 1→.92`; hint fades in from 1.4s over 0.4s.
- **Deal** (`T0 = [1.9, 3.2, 4.5]`): pill `opacity 0→1` 0.2s `power2.out` + `y 14→0 / scale .94→1` 0.37s `back.out(1.7)`; explanatory line appears +0.3s later over 0.1s, then words deepen to 1 over 0.12s each with spacing = `(next start − 0.1 − this start − 0.3) × 0.7 / word count` (the last 30% is quiet reading time); once deepened they never change.
- **Exit**: at 6.6s document + hint + pills + notes opacity→0 in 0.4s `power2.in`, ends at 7.0s.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `parkAt` / `parkDur` | 0.9 / 0.8s | ≥0.8s full-frame so the viewer recognises the document; parking must finish before the first pill |
| `parkX` / `parkScale` | −514 / .92 (≈35% visible) | <25% visible turns the document into decoration and loses the "source" meaning; >40% leaves no room for pills |
| `T0` | 1.9 / 3.2 / 4.5 (1.3 apart) | The spacing is one short line of narration; below 0.9 the word-by-word deepening can't finish |
| `pillIn` / `pillLand` | 0.2 / 0.37s back.out(1.7) | Opacity shorter than travel is deliberate (solid first, settled second); outCubic gives a flat float-in |
| `noteDelay` | 0.3s | Words start only after the pill has landed; earlier and the explanation precedes the conclusion |
| `noteShare` | 0.7 | Deepening takes 70% of the line's visible time, the last 30% is quiet reading; at 1.0 the next pill arrives as you finish |
| `scrollRate` | −18.75 px/s (≈0.6 px/f) | A hint-level "being read" speed; >3 px/f grabs attention and becomes a scrolling showcase |
| Pill / note type | 22 / 18 | Pills ≥ the 20@960 list-item tier; notes 18 ≥ the 14@960 minimum |

## Pitfalls
- The document fades instead of parking — the source vanishes, the conclusions float; this is the whole difference from cutting to a conclusion slide.
- Parking overlaps the first pill — document still sliding while pills deal; muddy.
- Pill opacity and travel windows equal — a plain fade, no "card on the table".
- Clearing each note before the next pill (the upstream move) — the user wants them kept; cleared notes can't be re-read.
- Document too hidden (<25%) — becomes a decorative strip; too visible and 22px pills don't fit on the right.
- Auto-scroll too fast — grabs attention, reads as a scrolling showcase; no scroll — the document dies, the "being read" hint is gone.
- Pill copy lengths too uneven — a ragged list; keep to 9–12 characters.

## Reuse
- Remotion/tsx (preferred): template/cards/doc-park-left-pill-deal.tsx — `docTitle / pills / notes / hint / docSrc / accent`; durationInFrames 222; with `docSrc` the real long screenshot fills the document card and slow-scrolls with it.
- HTML/GSAP: demos/doc-park-left-pill-deal/index.html — edit `PILLS / NOTES` and `CONFIG`; replace the whole `.dpk-doc .in` block with an `<img>` for a real document.
- Source: video-shotcraft `doc-park-left-pill-deal` (document parked to 35% + slow pill deal + subtitle deepening word by word). Voiceover adaptation: subtitles become explanatory lines that stay once landed; the document is read full-frame for 0.9s before parking.
- NLE equivalents: in CapCut/JianYing two keyframes on the document layer for scale + position with the anchor at left-centre, plus three text bars "popping" in one by one; in AE Anchor Point left-centre + Scale/Position keyframes easy-eased, pills as Shape Layers + Text Animator Opacity per word.
- Interface with layout.md: parked document right edge 260, pill column left edge 380 — group gap 120 ≥ inner gap 100 ≥ element padding 22 (§2 hierarchy); pills and notes left-aligned to the same column line (§3); the three pills + notes bounding box (380,130)–(880,410) is centred at x=630, 90 left of the right-half centre (720) — with a document on the left this is a "primary / secondary" layout, not judged by the no-presenter centring rule (§4).

## Motion scope
- Belongs to the card: the full-frame → park (left-edge anchor, 35% visible) action; parking before dealing; the solid-first / settled-second deal; explanatory lines deepening word by word and staying; the constant slow scroll of the document.
- Not part of the card: the document's content, the conclusion copy, the pill outline style (a style profile may swap in pastel fills).
- Migration interface: `pills / notes / docSrc`; at 1080p double the type, document 1400×840, parkX ×2; deal points follow the narration.
- Background requirement: parchment `#f5f5f7` by default (white document and white pills need to lift off the ground); on pure white strengthen the document and pill hairlines to `#d0d0d5`.

## Placement self-check (copy into the SHOTBOOK self-check column when selecting this card)
- Any frame after 1.7s: document right edge x ≈ 260 (±10), left edge not off-frame (left-anchor check).
- Before 1.7s the document never shares the frame with a pill (parking before dealing).
- At each pill's landing frame its explanatory line is not yet visible (noteDelay check); once deepened, no word's opacity ever drops (kept check).
- The three pills share the same left x and are 100 apart; pill text never overflows its pill.
- The document content moves throughout (slow-scroll check), but by ≤19px in any second.
