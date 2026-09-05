---
name: split-compare-slider
title: Two identically framed images are stacked; the top one is cropped with clip-path and a 3px white divider (with a round knob) is driven by the same progress value as the crop — the "before" fills the frame for 0.6s → slides to the centre in 1.4s → holds 1.5s → nudges to 42% and back → slides to 8% to almost fully reveal the "after" → returns to centre, holds 1s → exits with both images; both images share one 1→1.04 ultra-slow push
usage: Any "before / after", "old / new", "A / B" moment with two identically framed images (or two same-camera video clips); retouching and colour grading, renovations, UI redesigns, parameter A/B; calm, evidentiary tone
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| Not applicable (people don't need a "before/after", and the divider would cut the person) | Yes (two clips from the **same camera position**, frame-aligned in the two layers) | **Default input** (two **identically framed** images; the demo uses one image with two filter sets) |

The critical requirement is that both layers share the exact same framing — position, crop and scale — so that what the divider sweeps across is *content*, not position. For two differently framed images use `hero-duo-layout` or `rack-focus-pair`.

## Common scenarios
1. Retouching / colour grading before and after: one image, two grades (demo: dull "before" on the left, clean "after" on the right)
2. Renovation before/after: a room, a desk, a UI redesign (re-shot from the same position / same-size screenshots)
3. Old vs new version / two points in time from the same camera (v1 vs v4 home page, the same corner last year vs this year)
4. Two settings of the same scene (quality settings A/B, two typefaces / colour schemes)

## Intent
When the narration says "look, after the change", placing two images side by side is the weakest option — the viewer has to hunt for the matching spot between two small images, comparing *position* instead of *content*.
The slide reveal stacks both images on one camera position; every pixel the divider passes is the same spot before and after, so no hunting is needed. What makes it work:
1. **Crop, don't move**: the top layer is cropped with `clip-path: inset(0 X% 0 0)`; neither image moves a pixel. Moving the images (one pushed left, one pulled right) makes the viewer think the framing changed.
2. **Divider and crop edge share one source**: both are driven by one progress value `p`, so they never drift apart; two separate tweens will eventually be a frame off.
3. **The divider must move, but never sweep back and forth endlessly**: reveal to centre → hold → one nudge ("look right") → one far position (almost fully "after") → back to centre. Each of the four moves has a narrative job; one more and it becomes a slider toy.
4. **Labels light up only when that side is ≥40% revealed**: a label on a sliver tells the viewer what it is before they can see it.

## Motion core
- Three layers: bottom `.pane.r` ("after", full-bleed) → top `.pane.l` ("before", same size and position, `clip-path: inset(0 (100−p)% 0 0)`) → `.divider` (3px white with `0 0 18px rgba(0,0,0,.6)` shadow, `left: p%`, centred 46px white knob with a double chevron); two `.lbl` labels (20px 700 white on an `rgba(0,0,0,.45)` pill, 48 from the top and 48 from the side).
- The progress value `p` = percentage of the "before" image revealed (100 = full "before", 0 = full "after"). Everything is written from `p` in one pass: crop edge, divider, left label visible at `p ≥ 40`, right label visible at `100 − p ≥ 40`.
- Timetable: `0–0.6` full "before" (see it first) → `0.6–2.0` p 100→50 `power3.inOut` → `2.0–3.5` hold (the viewer looks at both sides) → `3.5–3.95` p 50→42 `power2.inOut` (nudge, "look right") → `4.0–4.45` back to 50 → `4.5–5.5` p 50→8 `power3.inOut` (almost fully "after") → `5.5–7.0` hold → `7.0–8.0` back to 50 → `8.0–9.0` deliberate hold → `9.0–9.48` exit (labels → divider → both images, 0.04 stagger, `power2.in` 0.4s).
- Both images share one ultra-slow push `scale 1 → 1.04`, `ease: none`, **duration = the shot** (9.48s) — one curve for both layers is what keeps the seam from drifting.
- Easing: reveal and far moves use `power3.inOut` (soft start and stop, the feel of a hand pushing a slider); the short nudge uses `power2.inOut`.
- The demo guarantees identical framing by using one grey placeholder with two filter sets: left `saturate(.3) brightness(.82) contrast(.9) grayscale(.4)`, right `saturate(1.25) contrast(1.06)`; the tsx applies these automatically when given one image (or two identical ones), and skips them when given two different images.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `lead` | 0.6s | Full "before" first; <0.4 reveals before the viewer has seen it, >1.0 reads as a still |
| `slide` | 1.4s | Divider from the right edge to centre; <1.0 reads as a wipe transition, >2.0 drags |
| `hold` | 1.5s (≥1.5) | The viewer needs one look at each side; stretch to the sentence in production |
| `nudge` | 42% | An 8% wiggle from centre meaning "look right"; >15% becomes a second reveal |
| `farLeft` | 8% | Almost fully "after" with a sliver of "before" as reference; 0 = a full switch, reference lost |
| `farDur` | 1.0s | One-way to/from the far position; shorter than the reveal (no need to teach the rule twice) |
| `tailHold` | 1.0s | Deliberate hold after returning to centre (not a dead tail); in production = the rest of the sentence |
| `push` | 1.04 | Shared by both images; >1.06 softens bitmap edges and steals attention from the comparison |
| `showAt` | 40% | How much of a side must show before its label lights; <25 labels a sliver, >50 neither lights at centre |
| Divider | 3px white + 46px knob | The knob signals "a draggable boundary"; without it the frame looks cracked |

## Pitfalls
- Moving the two images instead of cropping the top one — left image drifts left, right drifts right; the viewer reads "the framing changed" and compares positions instead of content.
- Tweening the divider and the crop edge separately — one frame off shows a misaligned seam or shaves a line off the "before".
- Sweeping back and forth endlessly (slider toy) — every pass resets attention; this card has at most four moves (reveal / nudge / far / back).
- Starting at the centre with no full-frame lead — the viewer never saw the whole "before" and doesn't know what is being compared.
- Differently framed or differently scaled images — the two sides don't line up under the divider and read as a collage; use `hero-duo-layout` or `rack-focus-pair`.
- Labels lighting on a sliver — told what it is before seeing it; wait for ≥40%.
- Separate push curves per image — the two sides scale out of sync and the seam misaligns.

## Reuse
- Remotion/tsx (preferred): template/cards/split-compare-slider.tsx — `srcBefore` / `srcAfter` real images (`<Img>` cover), `labelBefore` / `labelAfter` copy; one image (or two identical) auto-applies the before/after grades; `meta.durationInFrames = 296`; for longer holds change `CONFIG.hold` / `CONFIG.tailHold` (the timetable is derived from CONFIG, don't edit T by hand).
- HTML/GSAP: demos/split-compare-slider/index.html — swap the `.ph` blocks in `.pane.r` / `.pane.l` for `<img>` (same size), change `.lbl` copy; all timing lives in `CONFIG`; portable core: `CONFIG` + `apply()` (four states from p) + the timeline.
- Interface with layout.md: labels 48@960 from the edges (=96@1080 safe margin), 20px (=40 body tier); the divider is a full-height element, not an edge-hugging one.
- NLE equivalents: CapCut/JianYing "Mask → Linear" with keyframes (mask position = p, feather 0) plus a 3px white rectangle on the same keyframes; AE is a `Linear Wipe` on the top layer with Transition Completion keyframed and a Shape line whose Position follows it by expression; Premiere is `Crop → Right` keyframes. Stock sites call it a "before / after slider" or "comparison wipe".

## Motion scope
- Belongs to this card: cropping the top layer with `clip-path inset` (not moving images) and driving divider and crop edge from one progress value; the four-move timetable (0.6 lead / 1.4 reveal to centre / 1.5 hold / 0.45 nudge to 42 and back / 1.0 to 8 / 1.5 hold / 1.0 back / 1.0 hold) and easings (`power3.inOut` for reveal/far, `power2.inOut` for the nudge); the "label lights at ≥40%" rule; the shared 1→1.04 ultra-slow push lasting the whole shot; the 0.04-stagger exit with both images.
- Not this card: the grey placeholder and the two grades (demo context for "colour grading"), the "before / after" copy, the white colour and knob shape of the divider (recolourable, but keep the "draggable boundary" cue), the white stage.
- Migration: `srcBefore` / `srcAfter` for material (same size, same framing); `hold` / `tailHold` follow the narration; `nudge` / `farLeft` follow which side to emphasise (to stress "before", nudge to 58 and far to 92); geometry scales with the frame (the divider is in percent, label offsets scale proportionally).
- Background: white is fine — the stage is invisible while the images cover it; white shows after the exit.

## Placement checks (user-finalized 2026-09-05, copy into the SHOTBOOK self-check column when chosen)
- **Identical framing**: same size, crop and scale; freeze p at 50 and check that horizons / edges continue across the divider (>8px off = rework by changing material, not position).
- **One source**: crop-edge x equals divider x at all times (check stills at t=1.3 / 3.7 / 5.5; >2px = rework).
- **Four moves, no more**: reveal → nudge → far → back; the SHOTBOOK must not add another round.
- **Labels**: ≥48@960 from top and side, ≥20@960; both lit at p=50, only the right one at p=8.
- **Holds carry speech**: `hold` / `tailHold` match the sentence; the exit lands on the end of the shot (no dead tail).
