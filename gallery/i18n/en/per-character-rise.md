---
name: per-character-rise
title: Each character rises into place from below its own position (44% of the font size); displacement runs 0.33s and fade-in 0.70s on two different easings, with a per-character stagger of just 1 frame (0.033s) — the whole line reads as "one surge pushing up" rather than characters hopping in one by one, with zero blur and zero scale throughout
usage: A one-line judgment/claim/slogan planted on screen — thesis sentences opening a segment, conclusions, taglines; moments with steady pacing and short sentences (6~10 characters); when you want direction and "pushed-up" force without the cheapness of bouncing; not for continuous follow-along captions (every line rising would give the whole piece a bottom-up jitter)
---

## Intent
"Text rising from below" is the most common caption entrance and the easiest to ruin — nine out of ten market presets are
"whole block slides up + fades, one ease-out for everything," and the result has no bones: displacement and fade share one curve and end together,
so the line reads as a translucent slab being pushed up.

This card differs in only two parameters, but they decide the entire feel:
① **Displacement and fade-in run on two different easings**. Displacement takes `cubic-bezier(0.2, 0.8, 0.6, 0.85)` —
a burst at the start, then **sliding into place at near-constant speed** (no deliberate soft landing at the tail); fade-in takes `cubic-bezier(0.2, 0.8, 0.2, 1)` —
equally fast at the start, but with a long drawn-out tail. So the character's "arriving" is hard (it has a landing point), while its "solidifying" is soft (it has an afterglow).
One curve doing both jobs fails at both.
② **Displacement occupies only 48% of the fade-in duration** (0.33s / 0.70s). The character is already in place while still only half opaque,
and spends the remaining 0.37s solidifying where it stands — that is the mechanism behind the "one surge pushing up" sensation: **force up front, afterglow behind**.

The third discipline is **zero blur, zero scale**. Add a touch of blur and it becomes `soft-blur-in` (energy tier drops to low);
add a touch of scale and it becomes a bouncing caption (energy tier jumps to high). The rise's force comes entirely from pure displacement; everything else is noise.

## Motion Core
- **Two tracks, two easings, 48% duration ratio**:
  - Displacement track: `translateY +rise → 0` (rise = 44% of font size; demo 72px ⇒ 32px), `travel = 0.333s`, easing `cubic-bezier(0.2, 0.8, 0.6, 0.85)`
    (fast start → near-constant tail; "arriving" is hard)
  - Fade track: `opacity 0 → 1`, `dur = 0.70s`, easing `cubic-bezier(0.2, 0.8, 0.2, 1)`
    (fast start → long soft tail; "solidifying" is soft)
  - Both tracks start together, displacement stops first — **the entire mechanism of "force up front, afterglow behind"**
- **Per-character stagger 0.033s (1 frame @30fps in the source)**: character i's start = `lead + i × 0.033`.
  Chinese splits by code point (`Array.from`) — per-hanzi; punctuation counts as a character too, and it's correct for it to rise along
- **Starting drop ≈ 44% of font size** (source `distance 32` @72px; the library demo is also 72px ⇒ 32).
  This is a ratio constant, not an absolute value — changing the font size must scale it proportionally
- **Zero blur, zero scale**: this card's only animated properties are `translateY` and `opacity`.
  Adding blur ⇒ degenerates into `soft-blur-in`; adding scale ⇒ degenerates into a bouncing caption
- **Each character is an independent `inline-block`**: `transform-origin: 50% 55%` (center of gravity slightly low, so characters don't float upward at the end of the rise),
  `backface-visibility: hidden` (stable transform compositing layer)
- **Whole line `letter-spacing: -0.05em`** (source value): slightly tightened, so the risen line reads as "one sentence" not "a row of characters"
- **`white-space: nowrap` is a hard requirement**: each character being an independent inline-block, the browser will wrap between any two characters unless nowrap is locked
- **Layers**: white stage → whole line flex-centered → single characters (the only transformed elements)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `dur` (fade-in) | 0.70s | The card's afterglow length; <0.4s characters "solidify" too fast and the force reads as a hard-cut slide-up, >1.1s characters stay half-transparent too long and the line looks hesitant |
| `travel` (displacement) | 0.333s | **Displacement at 48% of `dur`, this card's first critical rule**; = `dur` (ending together) reads as a slab being pushed up (the universal flaw of market presets), <30% and characters arrive too early, the back half only solidifying in place — the force snaps off |
| The two easings | displacement `(0.2,0.8,0.6,0.85)` / fade `(0.2,0.8,0.2,1)` | **This card's second critical rule: the two must differ**; sharing one (either one) merges "arriving" and "solidifying" into one event and the bones are gone |
| `stagger` | 0.033s | Per-character stagger; 0 = whole-block slide (usable but loses the surge), >0.1s becomes "characters hopping up one by one" (energy tier jumps a level, and long Chinese lines read as a wave) |
| `rise` | ≈44% of font size (72px ⇒ 32px) | Starting drop amount, a **ratio constant**; <20% of font size the force is insufficient, reading as a slight float, >70% characters fly in from outside the line, stealing the sentence's attention |
| `lead` | 0.3s | Opening rest waiting for the narration to start; at 0 the text appears with the frame and the audience hasn't shifted attention yet |
| `hold` | 1.2s | Closing freeze — the planted line is this card's landing point; budget by character count (about 0.15s per character, then half a beat after reading) |
| Character count | 6~10 | Longer sentences accumulate stagger into a wave (16 characters ⇒ 0.53s head-to-tail gap; Chinese characters' uniform widths make the wave obvious) — split the sentence |
| blur / scale | **0 (unset)** | This card's hard constraint; any nonzero value turns it into a different card (see Intent, point three) |

## Known Pitfalls
- Displacement and fade sharing one easing — the line instantly reads as "a translucent slab pushed up"; this is the universal flaw of every slide-up-fade preset on the market, and the sole reason this card exists.
- Displacement and fade ending together (`travel = dur`) — same as above; "force up front, afterglow behind" disappears entirely.
- Casually adding a little `blur` — it becomes `soft-blur-in` (energy tier drops from medium to low) and the two cards duplicate each other in the library.
- Casually adding a little `scale` (even 0.96) — instantly reads as word-by-word bouncing captions (Hormozi captions), cheap at a glance.
- `rise` written as an absolute pixel value and reused — after a font-size change, large type doesn't rise enough and small type flies in from outside the line; it must scale at 44% of font size.
- Whole line not locked with `white-space: nowrap` — each character is an independent inline-block and the browser will wrap between any two; the opening frame's layout is simply wrong.
- Displacing the whole line (rather than single characters) — the per-character stagger is entirely nullified, degenerating into a whole-block slide (at which point just write the block version and save a DOM layer).
- Stagger enlarged past 0.1s on long Chinese lines — Chinese characters have uniform widths, so a uniform large stagger reads as a sine wave (English's ragged word lengths hide it), cheap at a glance.
- Used on continuous follow-along captions — every line rising from below makes the whole piece read like the frame is jittering upward; this card "plants one line," it doesn't "follow a passage."
- Replay resetting transforms without rebuilding the DOM — after a copy change the character count differs, old spans linger, and the stagger sequence no longer matches the actual characters.

## Reuse Guide
- HTML/GSAP: demos/per-character-rise/index.html. **To change content, edit only the `CONFIG.text` string** (6~10 characters);
  splitting and the stagger sequence are computed at runtime. For feel, tune only `dur` (`travel` must follow to keep the ~48% ratio);
  to change font size, edit `.pcr-text`'s `font-size` and set `CONFIG.rise` to 44% of the new size.
  The line's placement is `.pcr-line` (the demo is `inset: 0` + flex full-screen centering as a **pure text card**, no presenter;
  to keep a person in frame, shrink `.pcr-line` to a white column and pull `font-size` back down for the new width).
  **The two easings `FADE_EASE` / `TRAVEL_EASE` are feel constants — don't touch them, and never merge them into one.**
  The `cubicBezier()` solver is generic; other demos needing `cubic-bezier` easings can copy it outright.
- Remotion port: the source `registry/remocn/per-character-rise/index.tsx` is a per-frame lookup implementation (no timeline; each frame computes where each character should be) —
  more direct in Remotion than porting a GSAP timeline; copy it as-is. **Frame↔second conversion (source 30fps)**:
  `charDurationFrames 21` ⇒ `dur 0.70s`, `charTravelFrames 10` ⇒ `travel 0.333s`, `staggerFrames 1` ⇒ `stagger 0.033s`.
  Two `interpolate` calls per character, **each passed its own `easing` separately**:
  fade `Easing.bezier(0.2, 0.8, 0.2, 1)`, displacement `Easing.bezier(0.2, 0.8, 0.6, 0.85)`;
  both need `extrapolateLeft/Right: "clamp"` (without clamping, characters with `local < 0` compute negative opacity and render prematurely).
  `local = frame - i * staggerFrames` is the local clock shared by both interpolates.
  Size conversion: the source `fontSize 72` is for a 1280×720 frame; the library demo is a **pure text full screen**, using 72px directly on the 960 stage,
  so `distance 32` matches the source (ratio as always: distance = 44% of font size).
  **Do not** casually swap in `spring()` — spring's overshoot brings rebound, and this card is zero-rebound.
- Editing-software equivalents: JianYing/CapCut — the "slide up" / "move up" presets are all whole-block versions with displacement and fade ending together (exactly what this card avoids);
  the correct approach is one text layer with two hand-keyed groups: position (below by `rise` = 44% of font size → 0, **0.33s**) + opacity (0 → 100, **0.70s**),
  each curve tuned separately (JianYing's curve editor can tune per property — you must split them; that is the entire difference);
  per-character stagger is impossible ("character-by-character reveal" is a hard cut), and 0.033s is nearly invisible anyway — **dropping the stagger for the block version is a reasonable trade-off**.
  AE — one text layer + `Text Animator`: add `Position` (Y +24 → 0) and `Opacity` properties,
  but **you must create two Animators** (one carrying only Position, one only Opacity), the two `Range Selector` Offsets
  keyed at different durations (0.33s / 0.70s), curves pulled into the corresponding beziers in the Graph Editor;
  combined in one Animator they can only share one curve — degenerating into the market preset.
- Division of labor with sibling cards in this library: `keyword-pop-highlight` = one stressed word slammed within a sentence;
  `typewriter-reveal` = character-by-character typing (an archival cadence); `soft-blur-in` = the lowest-energy whole-line focus pull (no direction);
  **this card = a whole line planted with direction, force, and zero rebound** (pushed up vertically — the only one in its class that is "forceful but doesn't jump").

## Scope
- Belongs to this card: the combination of **two different easings** for displacement and fade (displacement `(0.2,0.8,0.6,0.85)` near-constant into place / fade `(0.2,0.8,0.2,1)` long soft tail); the timing discipline of displacement occupying 48% of the fade duration (force up front, afterglow behind); the starting drop fixed at **44% of font size**; the `stagger 0.033s` (1 source frame) "so small it's barely per-character" stagger magnitude; the **zero blur, zero scale** hard constraint; the slightly-low `transform-origin: 50% 55%`; the implementation discipline of per-character `inline-block` + whole-line `nowrap`.
- Does not belong to this card: the demo's specific line "think first, then act", the 72px size and 600 weight, the ink `#171717`, `letter-spacing: -0.05em` (a Latin-type tightening value; Chinese can take anything from 0 to −0.05em), the sans-serif family choice, the white stage, and the "line centered on stage" placement (frame center, lower third, caption-safe area all work). **The demo is a pure text card with no presenter** (2026-08-25 user finalization) — the full screen goes to this one line; a presenter placeholder would siphon attention from the "one surge pushing up" action; but on the application side, keeping the person on camera works equally (the sentence lands in the whitespace column beside them or the caption-safe area) — placement is not part of this card's motion body.
- Migration interface: `CONFIG.text` is the only content entry point (6~10 characters); for feel tune only `dur`, with `travel` following to keep the ~48% ratio; scale `rise` at 44% of font size; **the two easings and `stagger` are feel constants — never touch them for size or pacing changes** (past 10 characters, cut `stagger` to 0.02s or just split the sentence); budget `hold` by character count (about 0.15s each); portrait uses 6~8 characters with font size pulled to 40~46px (this card doesn't alter layout width; the only constraint is the `nowrap` line not exceeding 90% of usable width).
- Background requirement: white or dark both work (on dark, invert the text to white); zero blur and zero scale make this card the least background-sensitive. The only constraint is **no horizontal stripes or horizontal gradients in the background** — text rising vertically over horizontal texture creates a parallax illusion (the characters appear to travel diagonally). Usable over busy live-action backgrounds, but give the text a stroke or translucent backing panel for legibility (this card carries no backing of its own).
