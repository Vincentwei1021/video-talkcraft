---
name: chapter-title-card
title: At a section break, a full-screen color slab wipes in over 0.3s to cover the frame; a chapter number at 40% of screen height lands first, the chapter name then reveals from a mask beside it; after a 1.2s hold, the slab sweeps out in the same direction, cutting back to the narration
usage: Section breaks in long narration (5 minutes and up); finance explainers, event retrospectives, documentary-style storytelling — any tonality that needs a "page-turn feel"
---

## Intent
By minute 4 of long narration the viewer's attention inevitably drifts — a chapter card is a forced "page turn", giving the viewer a breath and resetting expectations ("ah, a new topic begins").
Critical rules: **hierarchy** (the number lands first to establish the skeleton, the chapter name enters after — appear together and the hierarchy collapses),
**no dead air** (the whole group drifts extremely slowly during the hold; a full second of stillness reads as a frozen video),
**in fast, out fast** (≤2.5s total; a transition longer than the content upstages it).

## Motion Core
- Full-screen slab `.chapter-card` (brand color/dark, flex-centered number + text group): `xPercent -100 → 0`, 0.3s, `power4.inOut`, pressing in from the left to cover the narration frame
- Chapter number `.chapter-num` (serif Georgia/SongTi, 216px ≈ 40% of screen height): after the slab covers, opacity 0→1 + scale 1.3→1, 0.4s, `power3.out`
- Chapter name `.chapter-name`: inside an `overflow:hidden` container, a lateral mask reveal via `clip-path: inset(0 100% 0 0) → inset(0 0% 0 0)`, 0.35s, `power3.out`, starting 0.18s after the number
- Small stamp `.chapter-sub` (English chapter number + date, tracking widened): another 0.1s after the chapter name, opacity 0→1 + x -14px→0, 0.3s
- Hold: the number and text group drift together, x 0→10px linear, spanning the dwell (1.7s), preventing frozen-frame feel
- Exit: the slab continues in the same direction, `xPercent 0 → 100`, 0.3s, `power4.in`, revealing the narration frame beneath (host + caption area sat untouched under the slab the whole time)
- The demo plays two cards back to back (01 blue → 02 red) with 0.7s of narration between, illustrating real pacing

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `wipeIn` | 0.3s | >0.5s feels like a curtain dragged across with no "press-in" punch; <0.2s the viewer doesn't register that a transition happened |
| `numIn` | 0.4s | The number is the skeleton; too fast (<0.25s) it doesn't establish itself, too slow it squeezes the following beats |
| `nameIn` | 0.35s | Any slower and the mask reveal reads as "loading"; starting 0.18s after the number is where the hierarchy comes from |
| `subDelay` | 0.1s | Stagger between the small text and the chapter name; at 0 all three layers appear together and the hierarchy collapses |
| `hold` | 1.2s | The time viewers need to finish reading the title; >2s drags the pace, <0.8s long titles can't be finished |
| `driftPx` | 10 | Anti-dead-air drift during the hold; >20px reads as a camera-move mistake, 0 looks like a frozen frame |
| `wipeOut` | 0.3s | The exit may be slightly faster than the entrance; use `power4.in` to accelerate away for the "page turned" feel |
| `gapBetween` | 0.7s | The narration gap between two chapters, demo-only; in practice determined by the narration content |

## Known Pitfalls
- Number and chapter name appearing on the same frame — no sequencing means no hierarchy; reads as a static PPT slide suddenly pasted on.
- Everything completely still during the hold — the viewer suspects the video froze; ultra-slow drift is the cheapest possible proof of life.
- Total time over 2.5s — the transition becomes grander than the content, the viewer loses patience, instantly amateur.
- The number set in a thin small sans-serif — the chapter feel rests entirely on the oversized serif number's "bookish weight"; shrink it or thin it and it's instantly cheap.
- The slab exiting in the opposite direction (bouncing back from the right) — viewers expect a "page turn" to be one-way; swinging back and forth reads as an undo.

## Reuse Guide
- HTML/GSAP: demos/chapter-title-card/index.html. To change copy, edit the text inside `.chapter-num` / `.chapter-name` / `.chapter-sub`; to change colors, edit the `background` of `.chapter-card.c1` / `.c2`; all rhythm lives in the top-level `CONFIG` (`wipeIn`/`numIn`/`nameIn`/`subDelay`/`hold`/`driftPx`/`wipeOut`/`gapBetween`). Adding a third chapter = duplicate a `.chapter-card` DOM block + call `chapterBeat(tl, cards[2], at)` once more in register. The core beat function `chapterBeat` lifts out whole.
- Remotion port: one `<Sequence>` per chapter; the slab drives `translateX%` via `interpolate(frame, [0, wipeIn*fps], [-100, 0], {easing: Easing.inOut(Easing.quart)})`; the number's scale/opacity and the chapter name's `clipPath` inset percentage likewise use interpolate (`Easing.out(Easing.cubic)`); the hold drift is one linear interpolate spanning through; the exit sits at the tail of the same Sequence with `Easing.in(Easing.quart)`.
- (Field-tested variant) Dark textured version: black base + constellation particles + concentric rings as the backdrop; an English eyebrow line first, the serif main title after, the subtext delayed another 0.4s — the three-layer stagger skeleton stays, only the "brand color slab" is swapped for a textured dark field; suits heavier narrative long-form openers. See XiaoLinShuo · Korean stock-market crash.
- (Field-tested variant) Neon diamond badge version: instead of a full-screen slab pressing in, a diamond gradient badge carrying the chapter number pops from small to large in mid-frame, then a screenshot card rises in and takes over the frame — chapter card and asset entrance fused into one beat, saving 0.5s over "cover then reveal"; suits fast-paced vertical video. See TheAIScaler (Apm_oCzPEQs).
- Editing-software equivalents: Jianying's "text templates → opener/chapter" category + a "wipe right" transition layered over a color slab; in AE it's a solid layer with Position keyframes (Easy Ease weighted into the entrance) + text-layer Scale keyframes + a Track Matte for the chapter-name reveal; in CapCut search "chapter title" templates.

## Scope
- Belongs to this card: the full-screen slab's `xPercent -100→0` press-in cover (0.3s, `power4.inOut`); the number's opacity 0→1 + scale 1.3→1 landing (0.4s, `power3.out`, after the slab covers); the chapter name's `clip-path inset(0 100%→0)` lateral mask reveal (0.35s, starting 0.18s after the number); the small text's opacity + x −14→0 a further 0.1s later; the hold-phase group drift x 0→10px linear against frozen-frame feel; the slab's continued **same-direction** `xPercent 0→100` sweep-out (0.3s, `power4.in`). The sequencing of these five segments plus that one-way in-and-out movement language is this card in its entirety.
- Does not belong to this card: the slab's color, the number's serif typeface and 216px size, the chapter name/small text's specific copy and tracking, the narration frame beneath (host placeholder + captions), the demo's back-to-back two cards and the `gapBetween` interval (pacing illustration only; in practice set by the narration).
- Migration interface: **slab color = the reuser's brand-color interface** — edit the `background` of `.chapter-card.c1` / `.c2` (the demo converges on two neutral grayscale steps #1d1d1f / #55565a; swap in your brand dark), with the slab's text color inverted accordingly (currently #ffffff); all rhythm in the top-level `CONFIG` (`wipeIn`/`numIn`/`nameIn`/`subDelay`/`hold`/`driftPx`/`wipeOut`); the number's size converts as 40% of screen height, scaling proportionally when resizing; adding chapters = duplicate a `.chapter-card` DOM block + one more `chapterBeat` call. Wipe-in and wipe-out must stay same-direction; changing direction requires changing both places at once.
- Background requirements: a white background suffices (the slab brings its own full-screen cover; the background shows only in the two beats before and after the slab's entry and exit). The slab itself must differ sufficiently in luminance from the background — dark slab on white, bright slab on dark.
