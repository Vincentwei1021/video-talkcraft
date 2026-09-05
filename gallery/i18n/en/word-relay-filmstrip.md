---
name: word-relay-filmstrip
title: A 360px-wide column of equal-height screenshot cards forms a filmstrip on the left with alternating dark / light frames; on the right two serif lines — the noun "One AI can" stays fixed while the verb relays in place: every 1.4s the old verb greys out and fades in 0.18s, the strip scrolls exactly one card height (212) in 0.4s power2.inOut at the same moment, and the new verb lands 0.2s later over 0.25s (out first, in second, never overlapping); the word block's vertical centre is pinned to the current card's midpoint y=264; the last verb turns accent, rests 0.9s, then strip and words exit together — every time the word changes, the evidence turns a page
usage: "One subject × many abilities" enumerations (an AI can write / draw / cut / voice — each verb with its screenshot), portfolio / case streams (one image and one word per case), product multi-scenario tours, personal-history lists ("over the years I have written a book / hosted a podcast / taught a course"); 4–6 words, one image each; no presenter on screen
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ The presenter doesn't take part (for lists with a presenter use parallel-items-with-host) | ✓ A filmstrip card may hold a clip (one per card, muted, plays once landed) | ✓ (default) one screenshot / photo per verb |

One verb maps to one card; one extra card = the "next one" peeking below the viewport, hinting there is more.

## Common scenarios
1. "One AI can write copy / make illustrations / cut video / add narration" — each verb paired with its screenshot (the demo)
2. Portfolio / case stream: case screenshots on the left, "I've worked in e-commerce / education / gaming" on the right
3. Product multi-scenario tour: the same product's UI in different scenes + the scene name
4. Personal history: "over the years I wrote a book / ran a podcast / taught a course"

## Intent
When the narration says "one subject can do N things", `word-slot-cycle` swaps only the word and shows no evidence; `filmstrip-conveyor` only streams images at constant speed with no words. Put together you get the editorial "word ↔ picture" pairing: the noun is pinned, the verb relays, and **each new word turns the evidence one page** — the viewer sees the screenshot at the moment they hear the verb. Four things make it work:
1. **The strip scrolls exactly one card height only inside the swap window**, zero displacement otherwise — continuous scrolling is a violation (reads as a conveyor); the "click" of a single step is this card's beat.
2. **Out first, in second, never overlapping**: the old word greys and fades in 0.18s, the new one lands 0.2s later; crossing in the same frame produces a double image (the upstream v2 "resebuilds" ghosting was caught); a gap over 10 frames reads as a dropout.
3. **The word block's centre equals the current card's midpoint** (to the pixel): the eye travels zero distance between word and picture; more than 8px is perceptible (an upstream user's single-point note).
4. **Alternating dark / light frames**: equal-height cards of the same colour don't read as "scrolled one step"; too narrow a card loses its weight as evidence.

## Motion core
- **Geometry** (960×540): viewport `.wrf-win` from 80×0, 360×540 `overflow hidden`; cards 360×200, gap 12 (one card height 212), radius 10, 6px border (odd cards `#1d1d1f` / even cards white + 1px hairline outline), a 13px label bottom-left inside the card; initial strip `y = 164` → first card midpoint 264. Word block `.wrf-words` at left 520, height 528 flex-centred (centre 264): noun 34px / 600 / `#7a7a7a` serif, tracking 2; verb 60px / 700 / ink serif, line-height 72, tracking 2, the last verb in the accent colour.
- **First word**: from 0.4s, 0.25s `power2.out` (opacity 0→1, y 12→0).
- **Swap** (the i-th at `0.4 + i·1.4`): old verb `opacity→0, color→#9a9da6` in 0.18s `power1.in`; strip `y → 164 − i·212` in 0.4s `power2.inOut` (starting together); new verb +0.2s later, 0.25s `power2.out`.
- **Exit**: `exitAt = last swap + 0.2 + 0.25 + 0.9 = 5.95`, viewport + word block opacity→0 in 0.45s `power2.in`, ends at 6.4s. Rest once landed, no idle.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `period` | 1.4s (upstream 45–60f) | Set by narration, 1.0–1.8, need not be uniform; <0.9 the word and the strip can't be read |
| `scroll` | 0.4s power2.inOut | Exactly one card height; continuous scrolling breaks the rule; over- or under-shooting reads as a mechanical fault |
| `cardH` | 212 = 200 + 12 | Card height and gap both enter the step; change one, change the other |
| `fadeOut` / `landIn` | 0.18 / 0.25s, 0.02 apart | Same-frame crossing ghosts; a gap >0.33s reads as a dropout |
| `startY` | 164 (card midpoint 264 = word centre) | >8px off is perceptible; re-tune when the word block height changes |
| Type size | noun 34 / verb 60 | Fixed by the user on 2026-09-06 (the first cut at 44 / 84 was too big); verb weight ≥ noun weight |
| Typeface | serif (Songti / Noto Serif CJK) | Sans-serif loses the editorial feel |
| Card count | verbs + 1 | The extra card peeking below says "more"; equal counts leave an empty slot under the last word |

## Pitfalls
- The strip keeps scrolling — reads as a conveyor (that's `filmstrip-conveyor`); this card's beat is the single click.
- Old and new words cross in one frame — ghosting; the old word must be fully gone before the new one enters.
- Word centre not on the card midpoint — the eye has to jump; >8px is perceptible.
- Cards not alternating — a one-step scroll of equal-height same-colour cards is invisible.
- Sans-serif — the editorial character is gone, it becomes a plain list.
- Cards too narrow (<300) — screenshots are unreadable, losing their weight as evidence.
- Image and word out of sync — two animations; strip and word swap must start together.

## Reuse
- Remotion/tsx (preferred): template/cards/word-relay-filmstrip.tsx — `noun / verbs / labels / srcs / accent`; durationInFrames 204 (4 words; recompute from `exitAt + exitDur` when the count changes); strip scroll and word relay are all functions of t.
- HTML/GSAP: demos/word-relay-filmstrip/index.html — edit `NOUN / VERBS / CARDS` and `CONFIG`; swap `.ph` for `<img>` / `<video>` for real material.
- Source: video-shotcraft `word-relay-filmstrip` (black / white page cards stepping on the left + Didot serif noun fixed, verb relaying on the right). Voiceover adaptation: page cards → evidence screenshots, word period 45–60f → 1.4s, smaller type, last word in accent.
- NLE equivalents: two tracks in CapCut/JianYing — image track with stepped "position" keyframes (one card height every 12 frames) + text track fading words in and out; in AE a Position expression with `valueAtTime` steps + Text Animator Opacity.
- Interface with layout.md: a two-element group (strip 360 + words) at roughly 1:1 (§4); the strip's left edge at 80 ≥ the 48@960 safe margin (§1); the 60px verb is far above the list-item tier; the word centre at 264 aligns with the card midpoint (§3 baseline alignment).

## Motion scope
- Belongs to the card: fixed noun + in-place verb relay (out first, in second); the strip stepping one card height only inside the swap window; word centre = card midpoint; alternating frames; accent on the last word.
- Not part of the card: the actual copy and screenshots, the specific serif family, strip-left / words-right (may be mirrored).
- Migration interface: `noun / verbs / labels / srcs`; at 1080p double the type (68 / 120), cards 720×400, step 424; swap points follow the narration.
- Background requirement: white / parchment works; on a dark stage invert the alternating frames and the word colours.

## Placement self-check (copy into the SHOTBOOK self-check column when selecting this card)
- Any resting frame: the current card's midpoint y (the card fully visible in the viewport) and the word block's (noun + verb) centre differ by ≤8px (the verb line alone sits ≈30px lower and is not the alignment reference).
- Any frame outside a swap window: strip y is exactly `164 − i·212` (zero-displacement check).
- Any frame during a swap: never two verbs above 0.2 opacity at once (no-ghosting check).
- ≥27 frames of complete stillness after the last verb lands.
- No presenter on screen; strip left edge x=80, word block left edge x=520, ≥80 between them.
