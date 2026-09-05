---
name: title-demote-to-label
title: The section title "Step 2 · Break down the brief" resolves from blur at 56px in the centre (blur 12→0, 0.4s), stands for 0.7s, then one power2.inOut curve over 0.67s does both "shrink to 0.4×" and "fly to the top-left (80,72)", landing as a 22px section label (the centring offset returns to zero along the same tween); 0.4s into the demotion three content rows already start growing beneath it one per narration beat (clip opening from 35% width + rising 28px, 0.55s apart) — the title never disappears, it becomes a persistent signpost; after the last row lands everything rests 2.7s and exits together
usage: Section hand-offs in tutorial / method narration (the title plays lead, then yields to the content), "point N" structures (each point's title demotes and stays top-left as a signpost until the next), Q&A (question demotes to a label, the answer unfolds below), pairing with chapter-progress-list to attach to a progress bar; ≤4 content rows
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Text-only card; with a presenter on screen put the whole group (label + content) in the opposite half and move the label's landing point to that half's column line | ✗ | ✗ Content rows can be image cards with the same growth motion; the demo shows text only |

Works on the section-title + key-point layer, never on the bottom follow-along subtitle.

## Common scenarios
1. Tutorial / method hand-offs: "Step 2 · Break down the brief" plays lead, then demotes to a signpost while three points grow beneath (the demo)
2. "Point N" structures: each point's title demotes and stays top-left until the next title resolves in the centre
3. Q&A: the question stands centred → demotes to a label → the answer unfolds below
4. With `chapter-progress-list`: the demoted label docks onto the progress bar as the current chapter

## Intent
`chapter-title-card` slams a colour block in, shows number + chapter name, wipes out and cuts back — the title **disappears**. In narration the need for a "where are we now" signpost is constant: a viewer whose attention drifted should see at a glance which section is playing. This card keeps the title **alive**: it announces itself once at hero scale in the centre, then shrinks and flies to the top-left as a persistent section label while the content grows beneath it — one element playing both "announcement" and "signpost". Four things make it work:
1. **Demotion is a single continuous tween**: scale and position ride the same inOut curve; splitting into "shrink, then fly" reads as two actions.
2. **Stand ≥18 frames after resolving, then demote**: shrink too early and the announcement beat is swallowed — the viewer hasn't finished reading.
3. **The centring offset returns to zero along the tween**: the centred state relies on `translate(-50%, -50%)`, the label end state is left-aligned to a column line — the offset `-(1-d)×50%` follows d, otherwise the end point is off by half a width.
4. **Content starts growing 12 frames into the demotion**: the title is still flying while content is already growing — no gap in the hand-off; waiting for the title to land leaves an 8-frame dead spot.

## Motion core
- **Geometry** (960×540): title 56px / 700 ink, centred position `(480, 270)` via `translate(-50%, -50%)`; label landing `(80, 72)`, `transform-origin 0% 50%`, scale 0.4 → 22.4px (above the caption tier). Content block `left 80 / top 150 / width 800`: rows 64 high with 22 gap, 26px ink text on pastel plates with 22px padding (layout §7 pastels: blue `#E8F0FF` / teal `#E6F7F2` / yellow `#FFF4DC`, no repeats within a group), an 8×40 accent bar at left, `gap 18`. Label left edge = content left edge = column line x=80 (title margin 160@1080). Label bottom 83 to first row top 150 = 67 ≥ 32 (§2).
- **Resolve**: from 0.2s over 0.4s `power3.out`, opacity 0 → 1, blur 12 → 0; stands until 1.3s.
- **Demote**: from 1.3s over 0.67s `power2.inOut`; progress d drives `left/top = lerp(from, to, d)`, `scale = lerp(1, 0.4, d)` and `translate(-(1−d)×50%, −50%)` together.
- **Content growth**: `growAt = 1.7` (demotion start + 0.4); row i starts at `1.7 + i×0.55`, 0.5s `power3.out`: `clip-path inset(0 65%→0 0 0)` (width 0.35 → 1) + y 28 → 0 + opacity 0 → 1.
- **Exit**: `exitAt = 1.7 + 2×0.55 + 2.7 = 5.5`, label + content opacity → 0 over 0.4s `power2.in`, done at 5.9s. Once landed everything rests.
- The origin's B variant (a "text-selection highlight sweeps in and out" on entrance) is an identity cue for text-editing products; not needed in narration, not ported.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `stand` | 0.7s (≥0.6) | Skip it and the title runs off before it's read — the demotion is wasted |
| `demote` | 0.67s (≈20f) power2.inOut | <0.47 reads as the title being flicked away; >1.0 the viewer waits |
| `endScale` | 0.4 (56 → 22px) | >0.45 the label is too big and crowds the content; <0.35 drops below the readable caption tier |
| `to` landing point | (80, 72) | Its left edge must snap to the content's column line (§3 same-group left alignment); too low and it crowds the content |
| `growDelay` | 0.4s (≈12f) | The "no gap" amount; 0 makes title and content move together like a page refresh, >0.67 leaves an 8-frame dead spot |
| `stagger` | 0.55s / row | One per narration beat; all at once reads as a page refresh, not growth |
| `clipFrom` / `rise` | 65% / 28px | Width 0.35 → 1 is the "growing" amount; with clip at zero only a fade-and-rise remains |
| Row count | 3 (≤4) | 4 rows at 64 + 22 = 322 from top 150 reach 472, past the subtitle band y 450 — with 4 rows use top 120 or 56-high rows |
| Row text size | 26px@960 | ≥ the 20@960 list-item floor (§5) |

## Pitfalls
- Demotion in two stages (shrink, then fly) — reads as two actions.
- Demoting right after resolving — the announcement beat is swallowed.
- Centring offset not returned to zero along the tween — the label lands half a width off and misaligns with the content.
- Content waiting for the title to land — an 8-frame dead spot; content moving with the title — a page refresh.
- Label landing point not snapped to the content's column line — two clumps each hugging an edge (layout §2 inverted spacing).
- Three plates in the same colour — three identical empty boxes (§7).
- Content appearing before the label — the signpost isn't up yet, the "yield" reads backwards.

## Reuse
- Remotion/tsx (preferred): template/cards/title-demote-to-label.tsx — `title / items / itemBg / accent`; durationInFrames 189 for 3 rows (recompute as `growAt + (n−1)×stagger + holdEnd + exitDur` when the count changes).
- HTML/GSAP: demos/title-demote-to-label/index.html — edit the `.tdl-ttl` copy and the three `.tdl-blk` rows; `CONFIG.to` moves the landing point.
- Origin: video-shotcraft `title-demote-to-label` variant A (the selection-highlight variant B is not ported).
- NLE equivalents: in CapCut/JianYing one text layer with scale + position keyframes sharing the same bezier ease-in-out and its anchor set to left-centre; points via rectangle mask + position + opacity keyframes one by one. In AE: Anchor Point left-centre + Scale/Position with one easy-ease; points via an expanding Rectangle Mask Path.
- Interface with layout.md: label and content rows snap their left edges to the same column line x=80 (§3); inner gap 22 ≤ group gap 67 ≤ outer margin 80 (§2); rows ≥20px, pastel plates without repeats (§5 §7); with 4 rows mind the subtitle band y≥450 (§6).

## Motion scope
- Belongs to this card: hero centred announcement → single-tween demotion to a top-left label; the ≥18-frame stand; the centring offset returning to zero along the tween; content growing from demotion +12 frames with stagger (clip opening + rise).
- Not part of the card: the copy, plate hex values, whether rows are text or image cards, whether the label lands top-left or top-right (mirror when a presenter is on screen).
- Migration interface: `title / items / itemBg / accent`; at 1080p double the sizes (112 → 45 label, 52 rows), landing point (160, 144).
- Background requirement: white or parchment; on dark stages swap plates for dark tiles (`#272729` family) and keep the accent bar.

## Placement self-check (copy into the SHOTBOOK self-check column when selecting this card)
- Three hero frames: standing (1.0s, title centred within ≤48), mid-demotion (1.6s), fully landed (3.6s).
- On the landed frame: the label's left x and the content's left x differ by ≤4 (same column line); label glyph height ≥14@960; label bottom to first row top ≥32.
- The three plates differ in colour; row text ≥20@960; row text stays within its own plate.
- The group's bounding box (label + content) stays out of the subtitle band y≥450; with a presenter on screen, the whole group goes in the opposite half.
- ≥45 frames of true stillness after the last row lands.
