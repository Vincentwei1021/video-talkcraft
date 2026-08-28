---
name: ui-prop-theater
title: Skeuomorphic UI props (progress bar / task checklist / slider) change state step by step on the voice's beats: progress jumps forward in segments 17%→96%, checklist items get ticked one by one, a slider drags with its number linked — the interface acts its own scene, it is not running a loading screen
usage: Narration explaining "how this thing runs", "how long the wait is", "which conditions must be met", "what happens when you adjust this parameter" — the default presentation for progress / checklist / parameter content; tool reviews, AI product explainers, tutorial and process-breakdown narration
---

## Intent
When narration covers processes and progress, what viewers want is a tangible sense of "which step we're on". A real loading bar crawls uniformly — it looks like a busy program,
completely decoupled from the narration; hard-cut screenshots lose the causality of "it's moving forward". UI prop theater treats the UI as an **actor**:
the progress bar doesn't fill uniformly but **jumps** a segment on each stressed word of the voice; the status copy swaps in that same jump; the checklist ticks the item just spoken.
The audience hears "first, download" and sees progress jump to 17%; hears "then, extract" and sees a tick land — voice and interface caption each other.
Vital points: **state changes must anchor on the voice's beats** (uniform auto-play = viewers read it as a real loading screen and their attention instantly shifts from the narration to "how much longer"),
**jumps must leave still segments** (only a completely motionless frame between segments makes "this jump was triggered by that word" legible),
**one beat pushes one thing** (a progress jump + copy swap + tick may share a beat, but only as three faces of the same semantic event — not three things crammed together).

## Motion Core
- **Beat-table driven (this card's skeleton)**: all state changes are written in one `beats` table —
  `{ at, pct, status, tick, done }`, where `at` is that spoken word's timestamp. Between segments there is no tweening at all; the frame is still.
  The demo's segment values run 17 → 43 → 71 → 96 → 100 (**unevenly spaced**: real installation phases vary in length; even segmentation is instantly fake data)
- **Progress bar's segmented jumps**: the fill's `width` jumps from the previous segment's value to this one's, 0.30s per segment `power2.out` (fast launch, soft landing);
  the percentage readout and the fill **share one proxy value** (`prog.p`'s `onUpdate` writes width and text together) —
  running the two on separate tweens inevitably drifts, and "number out of sync with the bar" is the most glaring giveaway
- **Status-copy swap (three-part, 0.32s)**: old copy `y -6px` + fade-out 0.12s → text swap → new copy fades in from `y +6px` over 0.20s,
  all `power2.out`. The swap must **start on the same frame** as that beat's jump (half a beat late reads as two events). On the closing beat the copy turns the accent color
- **Checklist ticks drawn one by one (0.2s)**: the tick is an SVG path drawn out via `stroke-dashoffset` (**not a fade-in, not a scale pop** —
  drawing is what carries the handwritten causality of "being checked off"), same-frame the checkbox outline turns the accent color and the label text turns from gray to black
- **The tick lands 0.16s after the jump**: see the progress jump first, then the tick land — causal order (progress advances → that step completes); reversed, it becomes "ticked before it even ran"
- **Row glow then settle (0.16s + 0.5s)**: as the tick lands, the row's background fades in `#f0f0f2`, then after 0.18s settles back to the `#f7f7f8` "completed" background.
  The glow is **instant feedback**; the settled background is **persistent state** — doing only one of the two means either completed items are invisible, or the whole list keeps flashing
- **Closing beat**: on the same beat progress rests at 100%, the completion check pops `scale 0.4→1` + fade-in 0.26s `back.out(2.2)`,
  its stroke drawing out 0.08s later (circle first, then check). The completion check occupies **fixed width** (`flex: 0 0 24px`) —
  otherwise its pop shoves the status copy sideways
- **Slider variant (same beat-table language)**: the handle's `x` drags to the target over 0.5s `power2.out`, with the linked number/graphic refreshing
  **live** in `onUpdate` (the same proxy value), not jumping after the drag — a slider whose number sits still during the drag is instantly a pasted image
- **Layering**: base UI (card / track / unticked checkbox) < state layer (fill, row background, ticked outline) < pop layer (completion check)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `beats[].at` | 0.55 / 1.5 / 2.35 / 3.6 / 4.55 | The voice timestamp each beat anchors to — this column is the card's entire rhythm; making it equidistant instantly degrades into "an auto-playing fake loading screen" |
| `beats[].pct` | 17 / 43 / 71 / 96 / 100 | Segment values deliberately uneven; <3 segments the "segmentation" is invisible (reads as one fill), >6 viewers can't count them and it degrades back to uniform |
| `jump` | 0.30s | Per-segment jump duration; <0.15s reads as an instant value change (losing "pushed forward a stretch"), >0.6s segments stick together and it's uniform again |
| `swapOut` / `swapIn` | 0.12s / 0.20s | Status copy out/in; in longer than out is what gives "the new state settling" its feel — equal durations read as a blunt replacement |
| `swapLift` | 6px | Swap displacement; >12px the text careens within the row and steals the scene, 0 reads as a direct text replacement (losing the "page-turn" causality) |
| `tickDelay` | 0.16s | How much the tick lags the jump; 0 crams the two events into one and the sequence is unreadable, >0.4s the tick feels like a late footnote |
| `tickDraw` | 0.20s | Tick draw-out duration; >0.4s slow enough to look like a calligraphy demo, <0.1s reads as appearing outright (handwritten causality gone) |
| `rowGlow` / `rowSettle` | 0.16s / 0.5s | Row glow fade-in / settle to the completed background; glow >0.3s becomes "this row is flashing", settle <0.2s the glow is never registered |
| `donePop` | 0.26s `back.out(2.2)` | Completion-check pop; the only overshoot permitted in the whole piece (a closing reward); overshoot strength >3 looks cheap |
| Slider `dragDur` | 0.5s | Handle travel duration; <0.25s the "being dragged" is illegible (reads as an image swap), >0.9s viewers lose patience |

## Known Pitfalls
- Progress crawling uniformly from 0 to 100% — viewers read "it's really loading" and start waiting on the bar instead of listening; this card's entire value is "segmented jumps + still gaps".
- Evenly spaced segment values (25/50/75/100) — instantly fake data; real process phases vary in length.
- The fill and the percentage number on separate tweens — inevitable drift; "92% next to a full bar" is instantly fake; they must share one proxy value.
- Status copy swapping later than the jump — reads as two independent events; the swap and that jump must start on the same frame.
- Ticks via fade-in or scale pop — reads as "an icon appeared", not "it got checked off"; must be drawn via `stroke-dashoffset`.
- Tick landing before the progress jumps — causality reversed (ticked before the work finished); the tick must lag the jump by 0.1~0.2s.
- Checklist ticking without changing row state (or recoloring without ticking) — completed and pending items carry equal weight; the screen can't show how far things have advanced.
- Row glow staying lit without settling — the whole list flashes; viewers can't tell which row is currently advancing.
- Completion check without fixed width — its pop shoves the status copy sideways; the frame that should be steadiest, the close, is shaking.
- Slider refreshing its number only after the drag — viewers read "an image was pasted, then a number swapped"; the linkage must happen on every frame of the drag.
- One beat pushing three unrelated things (progress jump + title swap + card pop) — viewers don't know where to look; one semantic event per beat.
- Adding skeuomorphic texture to the UI (gradients / inner shadows / glass / stacked drop shadows) — the prop becomes the protagonist and steals the narration; wireframe grayscale suffices.

## Reuse Guide
- HTML/GSAP: demos/ui-prop-theater/index.html. **To change content, edit only `CONFIG.beats`** (one row per beat: `at` timestamp + `pct` target value + `status` copy + `tick` row index + `done` closing); checklist entries live in the `.step` structure inside `#stage` (keep the tick's SVG path); change the accent via `CONFIG.accent` and `.bar-fill`'s `background`; rhythm parameters all live in `CONFIG` (`jump` / `swapOut` / `swapIn` / `tickDelay` / `tickDraw` / `rowGlow` / `rowSettle` / `donePop`). **Note that `fromTo` must carry `immediateRender: false`** — otherwise the opening copy is set to `opacity: 0` the moment the timeline is built, and the frame is blank before the first beat (this demo hit that).
- Remotion port: move the beat table verbatim into a `BEATS` array with `at` converted to frame numbers; progress uses **segmented table lookup** rather than one interpolate — `const seg = BEATS.filter(b => frame >= b.at*fps); const pct = interpolate(frame, [cur.at*fps, (cur.at+jump)*fps], [prev.pct, cur.pct], {easing: Easing.out(Easing.quad), extrapolate*: 'clamp'})`, with segments naturally still in between; the percentage text reads the same `pct` variable (the frame-driven equivalent of "shared proxy value"); ticks use `strokeDashoffset: interpolate(frame, [tk*fps, (tk+0.2)*fps], [L, 0])` (`L` from `path.getTotalLength()` or a pre-measured constant); the copy swap is two `<span>`s each interpolating opacity/translateY, switching at `at+swapOut`; the completion check uses `spring({frame: frame - done*fps, fps, config: {damping: 12}})`; the row background uses `interpolateColors(frame, [glowIn, glowOut], ['#f0f0f2', '#f7f7f8'])`.
- Editing-software equivalents: Jianying/CapCut — the progress bar is a color block + "linear wipe" or mask position keyframes, **placing two keyframes at each voice beat (the jump's start and end) and none elsewhere** (that is segmented jumping); status copy as text layers hard-cut at the beats with small fades at both ends; ticks via a "brush stroke / line growth" sticker or a tick PNG with a mask wipe. AE — progress via a Rectangle's Scale/Trim Paths keyframes with **keyframes paired at the beats** (hold the segments in between — don't let AE auto-tween into uniformity); the tick via Trim Paths End 0→100% + Easy Ease; row background via a Solid's two-stage Opacity keyframes; the completion check via Scale keyframes with an Overshoot expression. Any software's "progress bar preset / loading animation preset" is off-limits (all uniform, and shipping with a gloss sweep).

## Scope
- Belongs to this card: the beat-table timing discipline (every state change anchored to one spoken word's timestamp, the frame completely still between segments, one semantic event per beat); the progress bar's segmented jumps (0.3s `power2.out`, unevenly spaced segment values, fill and percentage readout sharing one proxy value in live sync); the status copy's three-part swap (rise-and-fade-out 0.12s → text swap → float-in from below 0.20s, starting on the jump's frame); the checklist's one-by-one ticking (`stroke-dashoffset` draw-out 0.2s + checkbox outline turning accent + label turning black + row glow 0.16s settling to the completed background over 0.5s); the causal order "tick lags the jump by 0.16s"; the closing beat's completion-check pop (`scale 0.4→1` + `back.out`, the stroke drawing 0.08s later, fixed width without shoving); the slider variant (0.5s handle drag + linked number/graphic refreshing live every frame); the three-tier layering (base UI < state layer < pop layer).
- Does not belong to this card: the demo's "Studio installer" mock UI structure and layout (card border, icon, version number, entry copy, and the right-side gauges — all demo context), the grayscale wireframe values (`#ececef` track / `#d2d2d7` unticked outline / `#f7f7f8` completed background — all placeholders), the specific accent `#d8383a`, the progress bar's 10px height and radius, the sample script and captions, the corner host (digital human), the specific "progress bar + checklist" prop combination (a task queue / rating bar / capacity ring / switch matrix work equally).
- Migration interface: the `beats` table is the only migration entry point — swap all `at`s for the actual speech's word-level timestamps, and `pct` for the real process's segment values (keeping them uneven); the accent swaps to the target UI's own primary token (`CONFIG.accent` + fill color + tick stroke, three places together); scale sizes proportionally with the frame (progress-bar height ≈ 1.5~2% of the frame's short side, tick 18~24px @960); for pacing changes re-lay the table's timestamps, while **each action duration (`jump`/`tickDraw`/`swapIn`) stays fixed** — these are feel constants; scaling them with speech rate smears the actions at fast pace; on dark UI, change the row glow from "darkening" to "brightening", brighten the unticked outline, and make the completed background slightly brighter than the card base.
- Background requirements: plain white is fine (a light UI is the most common case; grayscale tracks and a white base layer naturally). Dark UI screenshots work equally; the only hard requirement is that **both contrast pairs hold — fill vs track, and ticked vs unticked** — the track changes from `#ececef` to a dark gray slightly brighter than the card base, and the row glow / settled background's brightness relationships flip as a set.
