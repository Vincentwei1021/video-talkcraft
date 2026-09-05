---
name: host-card-glass-board
title: The presenter lives in a 250×444 portrait card on the left third (radius 22, 2px translucent white border, studio backdrop); on the right two-thirds a 570×408 glass prop board swings in around its left edge from rotateY −18° to −10° with one sheen sweep; the board header lands (issue tag → title dissolving in letter by letter → spaced English line), then the props relay with the voice — three step tiles pop back.out one after another, connector lines grow left-to-right with an arrow, and a result pill lands last; at 6.1s board, presenter and decor close together
usage: Explaining a workflow / system / steps ("script → voice → render"); a toolchain (tiles become logos); multi-step tutorials (props swap on the board while the presenter stays); putting a vertical-phone presenter clip into a landscape video (the card is exactly 9:16). "The presenter stays, the props change" — one board can carry several props without cutting away
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✓ **Required** — the presenter sits in the left 9:16 card (`hostSrc` alpha video; a vertical original goes straight in, a landscape keyed clip is framed as a half-body close-up) | ✗ No live footage on the board (the glass board is a prop stage, not a player; use split-60-40-story for video) | ✓ Optional — the tile icon slot takes a logo / thumbnail; the tiles themselves are self-drawn UI |

The presenter has exactly one form: the portrait half-body card. The board eats text plus small icons / logos.

## Common scenarios
1. Workflow / system: "script → voice → render" three tiles + a result pill (the demo)
2. Toolchain: tiles become logo + tool name + one-line sub, connectors unchanged
3. Multi-step tutorial: props replace each other on the same board (previous tile dims, next one pops) while the presenter never moves
4. Vertical presenter footage in a landscape video: the 250×444 card is exactly 9:16 — no letterboxing, no cropping the person

## Intent
The usual ways to pair a presenter with a diagram are a split screen or a corner badge: `split-60-40-story` is a flat 60/40 (asset left, points right), `parallel-items-with-host` lays out parallel items around the presenter, `bed-echo-blur` puts vertical footage in a white-bordered card. This card is a fourth route: **the presenter sits in a persistent portrait card and a 3D prop board stands beside it** — the board itself is a stage, and props (flow tiles, logos, thumbnails, numbers) relay onto it while the person keeps talking on the left. The value is "the presenter stays, the props change": three steps, four tools or a whole pipeline without cutting to a new shot. Four things make it work:
1. **The presenter lands first and stays**: the card slides in at 0.3s and never moves again; however many rounds of props the board takes, the person never shrinks, hides or relocates.
2. **The board's perspective moves once**: −18° → −10° is the entrance; after landing the angle is fixed, and the sheen sweeps exactly once (a looping sheen is where cheap glass comes from).
3. **Prop relay, one protagonist per beat**: tile pops → connector grows → next tile, all with the same entrance (back.out), no mixing fades and fly-ins; a connector grows only after both of its tiles have landed.
4. **Board text stays legible under perspective**: angle −8 to −12°, title 46px, tile label 20px; the 9px monospace sub-line is decoration tier — text that must be read never goes into small lines.

## Motion core
- **Geometry** (960×540, dark `#12131a`): portrait card `left 64 / top 48 / 250×444`, radius 22, `2px rgba(255,255,255,.42)` border, studio gradient (`#3a2a58 → #1d2140 → #12131a`) plus a purple glow at the top; presenter video `height 106%`, bottom −6% (half-body close-up, the card is the viewfinder; container marked `data-crop-ok`). Glass board `left 340 / top 58 / 570×408`, radius 18, `perspective 1400` (`perspective-origin 30% 50%`), `transform-origin 0% 50%`, `rotateY −10°`; material = white 11%→3%→7% diagonal gradient + `1.5px rgba(255,255,255,.3)` border + 1px inner highlight + a large shadow. Card-to-board gap 26px (≥24, no overlap).
- **Board header**: issue tag `top 18` (Courier 13px, tracking 4); title `top 42` (46px 800, tracking 6, one span per character); English line `top 106` (Courier 12px, tracking 5).
- **Board props**: tile group `top 170`, N glass tiles 140×130 (white 8% fill + white 30% border + inner highlight), gap 41 = connector length; the group is horizontally centred on the board (`left = (570 − W)/2`, 34 for three steps); each tile has a 44px round icon slot (`#8ab4ff`) + 20px label + 9px monospace sub-line; connectors `top 63` (2px `#8ab4ff` with glow, `transform-origin 0 50%`) + a 12px L rotated 45° as the arrowhead; result pill `top 328` centred (`rgba(138,180,255,.16)` fill + 60% border, 17px 700 `#cfe0ff`). Corner ∿ marks (Courier 26px, white 35%); floor watermark words COPY / 19 / IDEA (Courier 22px italic, white 9%, y 498).
- **Timing**: 0→0.8 floor words fade in; 0.2 board `rotateY −18→−10` + opacity 0→1 (0.7s `power3.out`); 0.3 card `x −40→0` + opacity (0.5s `power3.out`); 0.6 sheen `x 0→900` (0.9s `power1.inOut`, skewX −18°); 0.9 issue tag (0.4s, y 6→0); 1.0 title characters `blur 8→0`, `y 8→0`, opacity (0.45s `power2.out` each, stagger 0.06); 1.45 English line; 1.6 / 2.5 / 3.4 tiles `opacity 0→1`, `scale .8→1` (0.5s `back.out(1.6)`); each tile start +0.45 the connector `scaleX 0→1` (0.35s `power2.out`), arrowhead lights 0.1s before the line arrives; 4.1 result pill `y 8→0` (0.45s `power3.out`); 6.1 board, presenter, corners and floor words opacity→0 (0.5s `power2.in`), done at 6.6. Once landed everything rests; no idle.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `rot` landed angle | −10° | −8 to −12; steeper distorts the title and makes the tile sub-lines unreadable; within −5 it stops reading as "a board" and becomes a flat split |
| `rotFrom` start angle | −18° | 8° from the landed angle is the perceptible "swinging in"; >20° reads as a page turn |
| `boardIn` / `hostIn` | 0.7 / 0.5s | Board starts first, presenter arrives second, both settled within 1s; presenter entrance >0.8s feels sluggish |
| `sheenDur` | 0.9s, once | A looping sheen is the root of cheap glass; removing it entirely also works |
| `tileAt` | [1.6, 2.5, 3.4] (one per 0.9s) | Follow the word anchors where the narration names each step; <0.6s apart reads as simultaneous; 2–4 tiles, five no longer fit the board |
| `connDelay` / `connDur` | 0.45 / 0.35s | The line grows only after the tile has landed (a line first reads as "the road is ready, waiting for people"); line 41px, >80 loosens the relationship between tiles |
| `tilePop` | 0.5s `back.out(1.6)` | The overshoot is the "placed onto the board" feel; a power fade turns it into a slide deck |
| `resultAt` | 4.1s | Result at last tile +0.7s — give the viewer time to take in the three steps before the conclusion |
| Card size | 250×444 (9:16) | A vertical original drops straight in; a landscape keyed clip is framed at 106% height as a half-body; below 220 wide the face is too small |
| Type sizes | title 46 / tile label 20 / result 17 / sub 9 | Label 20@960 = 40@1080p, the list-item floor; the 9px monospace sub-line is decoration tier and carries nothing that must be read |

## Pitfalls
- Looping sheen, breathing tiles after landing — "living glass" reads as a template; rest once landed.
- Putting the presenter card into the board's perspective — the person is a person, not a prop; the card always faces front.
- Card and board overlapping or closer than 24px — two subjects fighting; a tile group not centred on the board reads as "one is missing".
- Readable paragraphs or long sub-lines on the board — unreadable under perspective; text that must be read goes on a flat layer opposite the presenter or on another card.
- A connector appearing before its second tile — a line pointing at nothing; lines grow only after both ends have landed.
- Forgetting `data-crop-ok` — verify-demo flags the card's framing of the presenter as "cropped"; it is a deliberate close-up, exempt the container and say so here.
- Dropping this glass material onto a light video — glass fails on white; see "Motion scope" for re-skinning.

## Reuse
- Remotion/tsx (preferred): template/cards/host-card-glass-board.tsx — `hostSrc` (alpha video, the required input), `tag / title / en`, `steps: {icon,label,sub}[]` (2–4 steps, the group auto-centres), `result`; durationInFrames 210; move the tile moments via `CONFIG.tileAt`, sentence length via `exitAt / end`.
- HTML/GSAP: demos/host-card-glass-board/index.html — the `.host-placeholder` inside `.hostcard` gets the presenter injected by demo-shell; tile and connector `left` values step by 140 / 41 by hand, edit `CONFIG`.
- Source: the layout structure of a Douyin presenter screenshot supplied by the user (presenter portrait card left + 3D glass board right); the props on the board (three step tiles + connectors + result pill) are this library's design and do not replicate the screenshot's content.
- NLE equivalents: two picture-in-picture layers in CapCut / JianYing (portrait mask with rounded corners + one 3D-rotation keyframe on the board layer) + three stickers popping in one by one; in AE one 3D layer for the board + card precomps with spring entrances.
- Interface with layout.md: two-subject group (card + board) with a 250 : 570 ≈ 1 : 2.3 width ratio (§4 allows one step past the golden ratio because the board is a prop stage, not a parallel subject); the tile group is centred by bounding box (§4); the face safe area lies inside the card, and neither the board nor the subtitle band enters it (§6).

## Motion scope
- Belongs to this card: the two-subject layout of portrait card + 3D glass board; the board's single −18° → −10° entrance and single sheen; the title dissolving in letter by letter; the relay tile → connector → tile → result (same pop entrance, lines only after both ends land); rest once landed and closing together.
- Not part of this card: the presenter video itself (demo-context material), sample copy, tile count and icon glyphs, floor watermark words and corner ∿ (decoration), the exact colours of the dark stage and glass material.
- Migration interface: `hostSrc / tag / title / en / steps / result`; `tileAt` follows word anchors; ×2 px for 1080p; for vertical output stack them (presenter card top 40%, board bottom 60% with no rotateY).
- **Background requirement**: the demo is a dark studio look — this is the style profile of the tech / AI-creation domain (design-language §0); glass fails on white, so the demo is an exception to the white stage. On a light video re-skin per §0.4: glass board → white card + 1px hairline + the single shadow, tiles → pastel plates, connectors and icons → the video's accent, drop the floor words and ∿; the motion does not change.
- Framing note: the card frames the presenter as a deliberate half-body close-up (video height 106%, bottom −6%), the container is marked `data-crop-ok` to bypass the cut-off check; in production the face safe area is the card interior, and no board element or subtitle may enter the card.

## Placement checks (copy into the SHOTBOOK self-check column when choosing this card)
- Card-to-board gap ≥24 (demo 26), no overlap; the board's right edge ≥48 from the frame edge (measured after perspective).
- Landed angle −8 to −12°; read the board title and tile labels on a hero still — they must still read under perspective.
- Tile group bounding box centred on the board (>8px off = rework); each connector touches both tile edges and the arrowhead does not overlap a tile.
- Face safe area (measured with `scripts/face_bbox.py`) fully inside the card; the subtitle band y ≥450@960 does not enter the card (subtitles sit centred in the bottom band below the board).
- Three hero stills: 1.3s (board landed, title dissolving), 3.0s (two tiles + one line), 4.6s (everything landed); no still may show the sheen moving (no sheen outside 0.6–1.5s).
- With a landscape keyed `hostSrc`, check once that the card's left/right edges cut no further than the shoulders — shoulders cut is a close-up, face cut is a bug.
