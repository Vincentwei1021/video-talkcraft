---
name: crash-zoom-punch
title: Hold the full view for 1s so the viewer sees the whole page, then a 6-frame ease-in crash zoom onto the target text block in the screenshot (zoom 1→2.3, camera centre converging on the target centre); overshoot, then 5 frames pull back 4.5% to 2.2 and lock; the 6 zoom frames carry a short blur as motion blur, after which the picture is pinned — a one-shot accent that says "this line, right here"
usage: When narration says "this line / look here", slam the viewer's eye onto one row, cell or sentence in a screenshot (bills, settings, terms, chat logs, tables); ≤2 per video. Input is an image (or a B-roll frame); the presenter is not involved
---

## Input types
| Presenter video | B-roll video | Images |
|---|---|---|
| ✗ Not involved (changing the presenter's framing is a different card; this one only pushes on material) | △ Freeze a frame first, then punch (the crash zoom is a beat on still evidence) | ✓ (default) screenshots / tables / chat logs / documents |

The screenshot fills an 800×450 white card (1600×900 at 1080p); the target bbox (stage coordinates) is measured and injected via `target` — the zoom centre is its centre.

## Common scenarios
1. "This exact line": pin the key row in a bill / settings / terms screenshot (the demo: auto-renewal)
2. Crash into the one sentence in a chat-log screenshot
3. Crash into the anomalous cell in a data table
4. Crash into an object in live footage (freeze a frame first)

## Intent
When narration points at "this spot" in a screenshot the library has four routes: `slow-push-in` (a whole-shot slow push with no "this spot"), `cursor-locked-zoom` (a cursor as guide — an extra actor), `magnifier-detail` / `pip-zoom-box` (a separate magnified window — keeps the overview, adds a frame). The crash zoom is the fifth: **the whole camera slams onto it**, the strongest possible "look here", at the cost of losing the overview — so give 1s of overview first so the viewer knows where they are, then slam. It is a **cut**, not hold-time motion, so it doesn't fight the "camera only does slow push/pull" rule, which governs a different stretch of time. Four things make it work:
1. **Zoom in ≤8 frames**: >10 frames is an ordinary push-in; the impact is gone.
2. **Pin the target centre**: zoom and pull-back share one (px, py) — three framings of one shot, one beat; re-composing each stage makes three shots.
3. **Overshoot then pull back 3–6%**: no overshoot reads as sliding to a stop, >6% as a spring toy.
4. **Lock after landing**: everything then stays still for reading; ≤2 per video — repeated, it gets cheap.

## Motion core
- **Geometry** (960×540): stage #f5f5f7 (the parchment step, so the white card has an edge); screenshot card 800×450 at (80, 45), white with a 1px hairline and radius 14; the demo's fake settings page: 64px header + six 64px rows; target = row 3's "自动续费 / 下次扣款…" text block, measured bbox (108, 237, 208×64) in stage coordinates, centre (212, 269). **The target is the text block inside the row, not the whole row** — the row's centre is empty space.
- **Camera transform** (`.cam` wraps the screenshot, `transform-origin 0 0`): `camTo(z, px, py)` = `x = W/2 − z·px, y = H/2 − z·py`, then clamp `x ∈ [W − W·z, 0]`, `y ∈ [H − H·z, 0]` so the stage edge never shows.
- **Crash zoom**: from 1.0s, 0.2s (6f) `power3.in`, scale 1 → 2.3 with x/y 0 → camTo(2.3) on the same tween — one tween driving all three values keeps the centre from drifting.
- **Motion blur**: starts with the zoom, `blur 0→5px` over 0.12s `power2.in`, then back to 0 over 0.15s — only the zoom segment, the landed frame is sharp.
- **Pull-back**: from 1.2s, 0.17s (5f) `power2.out`, scale 2.3 → 2.2 and x/y → camTo(2.2); then pinned.
- **Exit**: at 4.0s opacity→0 over 0.4s `power2.in`, done at 4.4s. Optional **hard-stop variant** (not the default): no pull-back; from the landing frame the camera shakes `14px·e^(−t/1.8f)`, dying in 6 frames — it conflicts with the motion-subtraction rule, use sparingly.

## Parameters
| Parameter | Typical | Feel |
|------|--------|----------|
| `hold` overview | 1.0s | Time for the viewer to place the page; <0.6 they don't know where you landed, >2 feels slow |
| `punch` zoom length | 0.2s (6f) | 4–8 frames; >10 reads as an ordinary push-in |
| `zoom` overshoot peak | 2.3 | Frame the target at 60–75% of the picture; full-width rows 1.8–2.2, single cells 2.6–3.0 |
| `settle` landing zoom | 2.2 (4.5% pull-back) | 3–6%; more is a spring toy, none is a slide-to-stop |
| `settleDur` | 0.17s (5f) | >8 frames reads as a second push |
| `blur` peak | 5px | Only during the zoom; >8 the landed frame is still soft, 0 makes the zoom look like a jump cut |
| Zoom easing | `power3.in` | Hard acceleration is where the "slam" comes from; ease-out is a normal push |
| Target bbox | measured | Must be a readable content block (text / cell), not a whole row — a row's centre is mostly empty |

## Pitfalls
- Targeting the row's centre — after the zoom you see the blank middle of the row (first draft: target = the whole `.tg` row, at 2.6× only "9 / 月" was visible); target the text block.
- Zoom longer than 10 frames — it becomes a normal push-in; the "slam" is gone.
- Each framing centred separately — three shots, not one beat; zoom and pull-back must share one origin.
- Target too close to the screenshot edge — camTo clamps to the stage, not to the card, so the stage colour shows after the zoom; keep the target ≥ card width × (1 − 1/zoom) / 2 from the card edge.
- Continuing to push after landing — motion stacked on the accent reads as not having settled; pin it.
- Three or more per video — every slam numbs the viewer a little more; ≤2.
- Hard-stop shake as the default — a several-frame shake conflicts with motion subtraction; enable only when the user explicitly wants "weight".

## Reuse
- Remotion/tsx (preferred): template/cards/crash-zoom-punch.tsx — `src` real screenshot, `target={x,y,w,h}` bbox in stage coordinates; durationInFrames 144; overview length via `CONFIG.hold`, sentence length via `exitAt / end`; set `zoom / settle` by target size. `camTo` is inlined.
- HTML/GSAP: demos/crash-zoom-punch/index.html — drop an `<img>` into `.shot` for a real screenshot, give the target block the `.tg .k` classes (geometry still derived from offsets); pacing in `CONFIG`.
- Source: video-shotcraft `crash-zoom-punch`, bounce variant (product films crash onto a feature card; this card retargets the narration's screenshot evidence, approximates CameraMotionBlur with a short blur, and keeps the hard-stop variant optional).
- NLE equivalents: CapCut scale keyframes 6f ease-in + 5f bounce (or the built-in "crash zoom" transition); Premiere position/scale bezier keyframes + directional blur over 6 frames; AE camera Zoom keyframes + CC Force Motion Blur.
- Interface with layout.md: the screenshot card (80,45)–(880,495) sits 80 / 45 from the frame edges (§1, inside the 48 safe margin); after the zoom the target text block lands on the picture centre (§4 single subject on the centreline); target bbox measured (§3).

## Motion scope
- Belongs to this card: the 1s overview hold; the 6-frame power3.in zoom with synchronous centre convergence; the short blur during the zoom; the 5-frame 3–6% pull-back; the lock; the camTo clamp.
- Not this card: the CSS fake settings page, the target row copy, the parchment stage, the white card style.
- Migration interface: `src / target`; `zoom / settle` by target size; at 1080p blur 5→10px, everything else is proportional; on a dark stage deepen the card shadow.
- Background requirement: stage and screenshot card need a tonal step (the demo uses #f5f5f7 + white), otherwise the card has no edge in the overview; dark also works.

## Placement self-check (copy into the SHOTBOOK self-check column when selecting this card)
- Target bbox measured from the screenshot (DOM offsets / image annotation), taking the **readable content block**, not the row; write (px, py) into the SHOTBOOK.
- Check frame: at landing (`shot-at 1.4`) the target text block's centre is within 16px of the picture centre (480, 270); the target fills 60–75% of the picture.
- Overview frame (`shot-at 0.8`): the screenshot card is fully in frame, ≥48 from the edges.
- Any two frames between landing and exit have identical transforms (truly pinned).
- Target ≥ card width × (1 − 1/settle) / 2 from the card edge (demo: 800 × 0.545 / 2 = 218px), else the stage shows after the zoom.
- ≤2 per video; mutually exclusive with `slow-push-in` in the same shot (one camera action per shot).
