---
name: info-card-assemble
title: An info card (a book / a tool / a person) assembles itself as if its fields were being extracted one by one — cover rises → title rises → three tag pills pop → price line rises → three bullet lines rise one after another with two of them swept by a marker block in 5 frames → three color swatches pop; adjacent fields are only 2 frames apart (recipe frames) while each field's travel is 0.5s, so the picture "surges" rather than "ticks", and the whole card pushes in 1→1.06 very slowly
usage: Narration introducing "a book / a tool / a person / a course" as an info card; demos of "structured extraction / auto-fill / data growing itself" in AI topics. Input is text plus one cover / avatar image; the presenter is not involved
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Not involved (with a person on screen, put the whole card in the opposite half — 420px wide fits one side) | ✗ No video in the cover slot (a moving cover fights the field landings) | ✓ (default) one cover / avatar / product image |

Takes one image plus text (title, ≤3 tags, a price or key number, ≤3 bullet lines, swatches).

## Common scenarios
1. A book recommendation card: cover → title → tags → price → three bullets (the demo)
2. A person card: avatar → name → identity tags → three representative works
3. A tool / course / service card: image → name → tags → price → bullets
4. "Structured extraction" AI topics: "it pulled these fields out of a paragraph"

## Intent
When narration introduces "this book / this tool", `media-pop-in` pops a whole screenshot and `info-term-card` slides a whole definition card in — both are **one block landing at once**, viewed as a whole. Field-by-field assembly splits one card into a dozen fields that **grow in reading order by information group**: image, then name, then tags, then bullets — the order of appearance is the order of reading, the densest beat in the library. Four things make it work:
1. **Write the field timetable in "recipe frames"** (a 60-denominator folded into seconds): same-group fields 2 frames apart, groups 4–14 frames apart — the spacing is the grouping; equal spacing reads as mechanical roll-call.
2. **Each field's travel far exceeds the spacing** (0.5s vs 2 frames): five or six fields move at once and the picture surges; below 0.13s it degrades into hard blinks.
3. **Small items pop, large items rise**: tags and swatches pop from 0.4 to 1 (small, the overshoot hits no neighbour); image / title / bullets only sink 6px (large items popping look cheap).
4. **The whole card pushes in 6%** spread over the first 75%: unrelated to any field, it keeps the picture advancing between dense micro-events.
The source card had a "hard-cut strike-through of the old price + spring of the new price" segment; the user removed it — in narration the price line lands like any other field, no reversal drama.

## Motion core
- **Geometry** (960×540, light #f5f5f7): card 420×460 at (270, 40), white with a 1px #e0e0e0 hairline, radius 18, padding 18, `transform-origin 50% 50%`; top to bottom: cover 150 high (radius 10) → title 24px/700 (14 above) → tag row (14px/600, #f2f2f5 pills, gap 8) → price row 34 high (28px/700 accent, tabular-nums) → three bullets 17px (line-height 1.5, gap 4) → three 26×26 swatches, radius 8. Left caption 20px #7a7a7a at (80, 60), width 160.
- **Recipe frames** `F(f) = f / 60 × D`, D = 5.0s: cover 0 / title 4 / tags 8·10·12 / price 16 / bullets 30·32·34 / marker 34·36 / swatches 40·42·44 → seconds 0 / 0.33 / 0.67·0.83·1.0 / 1.33 / 2.5·2.67·2.83 / 2.83·3.0 / 3.33·3.5·3.67.
- **rise** (image / title / price / bullets): opacity 0→1 + y 6→0, 0.5s `power2.out`. **pop** (tags / swatches): opacity 0→1 (power2.out) + scale 0.4→1 (`back.out(1.7)`), 0.5s.
- **Marker block**: an absolutely positioned `#E8F0FF` block inside the bullet line (4px wider each side, 3px inset top/bottom, radius 4, z-index −1), `transform-origin 0 50%`, scaleX 0→1 in 0.17s `power1.out` — faster than a field landing, reads as one stroke of a pen.
- **Card push-in**: scale 1→1.06 from 0 to 3.75s (D×0.75) `power1.out`.
- **Exit**: at 6.4s card + caption opacity→0 over 0.4s `power2.in`, done at 6.8s. Once landed, everything rests.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `frames` field recipe frames | 0/4/8·10·12/16/30·32·34/34·36/40·42·44 | Same group 2 frames apart, groups 4–14 apart: spacing is grouping; all-equal reads as roll-call |
| `D` time base | 5.0s | The source's 60 frames map to D; slow down for narration by raising D, relative rhythm unchanged |
| `fieldDur` | 0.5s | Far longer than the spacing → surge; <0.13s becomes hard blinks |
| `riseY` | 6px | Large items only sink a little; >20px fights the card's push-in direction |
| `popFrom` | 0.4 | A clear "from nothing"; only small items pop, large ones look cheap popping |
| `hlDur` marker sweep | 0.17s (≈5 frames) | Marker-pen speed; >0.5s reads as a background fade, not a stroke |
| `push` / `pushEnd` | 1.06 / 0.75 | 6% over 3.75s is pure breathing; >12% the card hits the frame and text is pushed out of the padding |
| Field count | image + title + ≤3 tags + price + ≤3 bullets + ≤3 swatches | Extras continue 2 frames apart; >3 bullets don't fit — cut words, don't shrink type |

## Pitfalls
- Equal spacing between fields — mechanical roll-call, grouping lost.
- Field travel shortened to near the spacing — hard blinks, the surge density is gone.
- Large items popping too — image and title bursting from 0.4 read as cheap pop-ups.
- 2-frame stagger is dense for narration — in production group fields into 3–4 sets by word anchor (image+title / tags+price / bullets / swatches), keeping the 2-frame stagger inside a set.
- Card push over 12% — the card hits the frame and text inside the 18px padding gets pushed out.
- The source's "strike old price + spring new price" — not used in narration (user decision); the price line lands normally.

## Reuse
- Remotion/tsx (preferred): template/cards/info-card-assemble.tsx — `src` cover, `title / pills / price / lines / highlightLines / swatches / caption` copy; durationInFrames 216; slow down via `CONFIG.D`, sentence length via `exitAt / end`.
- HTML/GSAP: demos/info-card-assemble/index.html — field elements inside `.pc` and `CONFIG.frames`; swap `.ph` for `<img>` for a real cover.
- Source: video-shotcraft `product-card-progressive-assemble` (a product detail card; this card becomes a narration info card, drops the price-strike segment, light palette).
- NLE equivalents: in CapCut/JianYing give every field its own "fade + slight rise" entrance offset by 2 frames and use "pop" for tags; in AE, Position/Scale keyframes with layers sequenced 2 frames apart; the marker block is a Shape Layer with a Scale X keyframe.
- Interface with layout.md: card 420 wide at 270 → centre x=480 (§4); in-card type sizes 24 / 17 / 14 (14 is the pill text, below the item tier but inside a pill; 28 at 1080p still ≥ minimum readable); the left caption at 80 snaps to the title edge (§1); the card bottom at 500 exceeds the 450 subtitle band — **with subtitles, shrink the card to 400 high or move it to top 24** (§6).

## Motion scope
- Belongs to this card: the recipe-frame field timetable (2 frames within a group, 4–14 between groups); the rise / pop split; the 5-frame marker sweep; the 1→1.06 card push-in; the shared exit.
- Not this card: the grey cover placeholder, the specific copy, the light stage, the exact card size.
- Migration interface: `src / title / pills / price / lines / highlightLines / swatches`; `D` follows narration; at 1080p the card is 840×920, type ×2, riseY 6→12.
- Background: light parchment #f5f5f7 (the white card lifts off via the hairline); pure white also works; on dark, swap the card for a dark tile with light text.

## Placement checks (copy into the SHOTBOOK self-check column)
- Card bounding box horizontally centred (centre x off by ≤48); with a person on screen, the card sits at the centre of the opposite half.
- Card bottom ≤ 430@960 when subtitles are present — the demo's 500 is a subtitle-free showcase; move up or shrink per §6.
- Two stills: `shot-at 1.0` (three tags just landed, no price yet) to check grouping; `shot-at 3.0` (marker mid-sweep) to check the block stays inside the bullet line and never covers text.
- Field order = reading order (image → name → tags → price → bullets → swatches); no field may appear before its previous group.
- Final frame: card still, scale = 1.06, every field at opacity 1.
