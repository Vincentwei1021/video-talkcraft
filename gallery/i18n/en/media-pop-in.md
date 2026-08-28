---
name: media-pop-in
title: Screenshots/photos with white borders and shadows bounce from 80% to 100% with a rebound, randomly tilted 5~10°; multiple pieces "slap" on one after another at a 100~150ms stagger, stacking corner over corner
usage: The moments the narration throws down evidence (screenshots, chat logs, transfer slips, news reports); the "one by one, look" enumerating register; exposé, debunking, and roundup tones
---

## Intent
Evidence footage needs an entrance ritual — the density of "slap, slap, slap" onto the table is what makes viewers believe "the evidence is solid"; a tidy carousel is mere illustration.
Critical rules: **tilt and stack** (random ±5~10° rotation + each newcomer pressing a corner of the last; neat alignment = PPT),
**rebound finish** (back.out overshooting to 1.02 then settling to 1; linear enlargement has no "slap" in the hand), and
**tight stagger** (100~150ms apart; stretched past 0.5s the "flung" momentum is gone).

## Motion Core
- Each asset: 6~10px white border + shadow (on white, `0 12px 26px rgba(0,0,0,.16)` separates the layers; heavier on dark) + 4px corner radius
- Entrance: scale 0.8→1 (`back.out(1.7)` overshooting to ~1.02 on its own) 0.25~0.35s; opacity 0→1 completed in the first half; rotation settles from "target angle plus another 6° of tilt" back to the target angle (the rotation settling with it lands better than a fixed angle)
- transform-origin at 50% 60% (slightly below center, like being pressed down by a hand)
- Multiple pieces stagger 100~150ms, positions offset by hand, later pieces on higher layers pressing a corner of the earlier ones
- After all land, the whole group breathes ultra-lightly (scale ±0.8%, 2~3s period, optional) to keep the frame from dying
- Exit: the group or each piece at 0.15s scale→0.9 + opacity→0, faster than the entrance (entrances hit harder than exits — a general rule)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Per-piece duration | 0.3s | >0.4s drags like a slideshow; <0.2s too dense to see what the asset even is |
| Rebound strength back.out | 1.7 | Up at 3 it's variety-show "wham-wham" slamming; below 1.2 there's barely any overshoot — just a plain fade-and-scale |
| Starting scale | 0.8 | Smaller (0.5) hits harder but looks like flying in from afar; above 0.9 the travel is too short to read as a bounce |
| Rotation scatter | ±5~10° | All at the same angle = template feel; past 15° the asset content is illegible |
| Inter-piece stagger | 150ms | The lifeblood of density: >300ms becomes one-at-a-time display, <80ms viewers can't count the pieces |
| White border width | 8px | The white border is the "physical photo" cue; without it these are just floating screenshots |

## Known Pitfalls
- No rotation, no stacking — arranged neatly it's PPT SmartArt; the "throwing down evidence" immediacy is gone.
- Each piece bouncing to dead center then rotating through — density vanishes, and viewers can't remember the previous piece either; they must coexist stacked on one screen.
- Entrance over 0.4s — at narration pace the next sentence covers 3 words and the asset still hasn't landed.
- Zero overlap between assets — each in its own cell like a grid; a 10%~20% corner press is what reads as a pile slapped down by hand.
- Shadow too small or absent — assets sit dead on the background; the spatial layering of "slapped on top" disappears.

## Reuse Guide
- HTML/GSAP: demos/media-pop-in/index.html. The three mock screenshots are pure CSS (`.shot-browser/.shot-chat/.shot-pay`); swap each block for an `<img>` to use real assets; each piece's landing angle is in `data-rot`, pacing in `CONFIG.stagger/popDur`.
- Remotion port: one `spring({frame: frame - i*4, config: {damping: 12, stiffness: 200}})` per piece driving scale, opacity clamped to the same spring's first half; rotation interpolated from rot-6 to rot.
- (Field-tested variant) Split-screen takeover: rather than piling assets beside the host, the host shrinks into a rounded card at the bottom while the B-roll drops into the upper half, the two staggered 3~5 frames — one full-layout costume change, cleaner than slapping pieces on one by one, suited to moments with a single asset to view. The host-shrink half is its own card now (see references/cards/host-shrink-to-chip.md). See TheAIScaler (Apm_oCzPEQs).
- (Field-tested variant) Blur slam-in: swap the scale-bounce channel for "travel + directional motion blur + a 0.2s hard stop" — a sharper temperament, now its own card (see references/cards/motion-blur-slam-in.md); for a given passage of assets, pick one of the two, never stack them.
- Editing-software equivalents: JianYing "Entrance animation → bounce in / fling in" placed piece by piece with frame offsets; AE is scale + rotation keyframes with an Overshoot expression; CapCut "Bounce In".

## Scope
- Belongs to this card: each asset's scale 0.8→1 landing with back.out(1.7) overshoot (0.25~0.35s), opacity completing in the first half; rotation settling from "landing angle plus 6° extra tilt" back to the landing angle (the settling rotation is what gives the "slap"); transform-origin 50% 60% (slightly below center, like being pressed down by a hand); the density of a 100~150ms multi-piece stagger and the "newcomer presses a corner of the last" layer stacking; the white-border + shadow "physical asset" semantics (only lifted a layer off the background does it count as "slapped on"); the whole group's ±0.8% ultra-light breathing after landing; the exit faster than the entrance (0.15s scale→0.9 + fade).
- Not part of this card: the three mock screenshots' content and gray-bar layouts, the assets' specific positions and landing-angle values, caption copy, the host placeholder.
- Portability interface: for real assets, replace each `.shot-*`'s interior wholesale with an `<img>`, keeping `.shot`'s white border + shadow and `data-rot`; scale `popDur` / `stagger` to the "throwing evidence" speech pace (stagger never over 300ms or density is lost); `overshoot` tunes slap force, `fromScale` tunes travel, `preTilt` tunes the settling amount; scale border width and shadow strength proportionally with output size.
- Background requirements: white is fine, but **the assets' white borders and shadows must stay** — on white it is this shadow layer that separates assets from the stage; if the goal is pure-white minimalism, weaken the shadow to 8%~10% black, never to zero.
