---
name: line-by-line-slide
title: Multi-line bullet points slide in one by one from the left (travel 0.47s / fade 0.90s, distance 78% of the type size, 0.13s line stagger), and after reading the whole stack exits rightward through the same side — enter from the left, exit to the right is not a reverse playback; the exit stagger is half the entrance's, and the horizontal travel starts 0.27s after the fade-out
usage: Putting 3~4 parallel bullet points/steps/list items on screen as one passage — "three things", "two premises", "four steps" narration segments; also for line-broken pull quotes (one short sentence per line); not for single lines (degenerates into a plain slide-in) or 5+ lines (the first line has long faded before the last enters — the "stack" is unreadable)
---

## Intent
"Three things"-style parallel points are everywhere in narration, and they carry a specific difficulty: **the passage is one unit, but it's spoken line by line**.
Fade all three lines in together and viewers can't read the order; animate three separate entrances and the passage splits into three cards.

This card's answer is **stagger within one stack**: a 0.13s (4-frame) line stagger — large enough to read "first line, second line, third line",
small enough that the entrances overlap heavily in time (the first line is still fading in when the third starts), so what viewers receive is
"one stack sliding in, with an order", not three independent entrances.

What truly separates this card from off-the-shelf list presets is **the exit**:
① **Enter from the left, exit to the right** — not a reverse playback. The stack "passes through the frame" rather than "came and retreated",
which lets it naturally hand off to the next passage (retreating reads as "this passage is void");
② **The exit's horizontal travel starts 0.27s after the fade-out** — for the first 0.27s the stack only dims in place, motionless,
and only then gets "pulled away". This one delay is the most refined thing in the card: it makes the exit read as "the stack loosens, then is carried off",
whereas travel starting with the fade reads as "swept away in one stroke" (crude, and viewers feel they hadn't finished reading);
③ **The exit stagger is half the entrance's** (0.067s vs 0.13s) — the exit doesn't need to narrate the order again,
so it closes tighter and faster, the stack leaving almost as one.

## Motion Core
- **Entrance: two tracks per line, travel stops first**
  - Travel track: `translateX −distance → 0` (distance = 78% of type size; demo 60px ⇒ 47px), `enterTravel = 0.467s`
  - Fade track: `opacity 0 → 1`, `enterDur = 0.90s` (= 2.1× the travel; travel spans 52%)
  - Easing on both: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out: rush in, then a long gentle landing)
  - Line stagger `enterStagger = 0.133s` (source: 4 frames @30fps)
- **Exit: fade starts immediately, travel starts 0.27s later, direction rightward**
  - Fade track: `opacity 1 → 0`, `exitDur = 0.60s`, **starting at the exit moment immediately**
  - Travel track: `translateX 0 → +distance`, **delayed by `exitDelay = 0.267s`**, duration `0.60 − 0.267 = 0.333s`
    (both tracks end together — the source writes the travel's input range as `[exitTravelFrom, exitDur]`, i.e. the tail of the same clock)
  - Easing `cubic-bezier(0.64, 0, 0.78, 0)` (**ease-in**: stick first, then accelerate away — opposite direction to the entrance's ease-out)
  - Line stagger `exitStagger = 0.067s` (source: 2 frames) = **half** the entrance stagger
- **Opacity is two segments multiplied**: the source writes `opacity = enterP × (1 − exitP)`, and horizontal travel is two segments **added**: `x = xEnter + xExit`.
  This guarantees no jump if the exit begins before the entrance finishes (the demo uses sequential GSAP tweens; timing-equivalent)
- **Lower bound on the exit moment**: the source's `exitStart = max(enterEnd, total − exitDur − stagger)` —
  **the exit never precedes the entrance's end**. In GSAP this is explicitly scheduled after "last line's entrance end + hold" (equivalent)
- **Left alignment is a hard requirement** (source: `textAlign: left`): the line-by-line slide reads as "one stack" only via the **shared left edge**;
  center alignment gives every line a different left edge and scatters the slide's directionality
- **Each line is `display: block` + `transform-origin: 0% 50%`** (left edge as axis), horizontal travel only, no vertical motion
- **Line-height change**: the source's `lineHeight: 1.1` is a Latin-script value; CJK glyphs are taller and 1.1 makes lines stick together — this library uses **1.35**
- **Layering**: white stage → left-aligned text block → lines (the only transformed elements)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `lines` count | 3~4 | The card's hard constraint; 1 line degenerates into a plain slide-in (use `soft-blur-in`), 2 lines can't read as "a stack", ≥5 lines the first has long faded while the last enters — the stack's unity dissolves and viewers can't finish reading |
| `enterDur` | 0.90s | Per-line fade duration; <0.5s the three entrances clump together (stagger order unreadable), >1.3s the stack takes 2s+ to land while the narration is already on point two |
| `enterTravel` | 0.467s | **Travel spans 52% of `enterDur` — a critical rule**; = `enterDur` (same stop) reads as three boards being pushed in, <30% the line lands too early and only solidifies in place for the back half |
| `enterStagger` | 0.133s | **Line stagger, the card's core magnitude**; <0.07s the three lines are near-simultaneous (order unreadable), >0.25s the lines split into three independent entrances ("stack" gone, passage drags past 2s) |
| `distance` | ≈78% of type size (60px ⇒ 47px) | Horizontal travel, a **ratio constant**; <40% of type size reads as an in-place fade, >150% lines fly in from off-canvas and upstage the content |
| `exitDur` | 0.60s | Exit duration = 67% of the entrance (exits are always faster than entrances — a general rule); >0.9s the stack dawdles and won't leave |
| `exitDelay` | 0.267s | **Fade start → travel start delay, the card's most refined value**; 0 (travel with fade) reads as "swept away in one stroke" and viewers feel unfinished; >0.4s leaves only an instant of travel, reads as a hard cut |
| `exitStagger` | 0.067s | Exit stagger = **half** the entrance's; = `enterStagger` narrates the order all over again (redundant), 0 has the stack leave as one (usable, but loses a touch of closing layering) |
| `hold` | 1.4s | Dwell for reading the whole stack; size by total character count (≈0.12s per character), 3 lines × 8 characters ≈ 1.4s; <0.8s viewers can't finish the third line |
| `lineHeight` | 1.35 (CJK) | The source's 1.1 is a Latin value; CJK below 1.25 sticks lines together — adjacent lines' glyphs press on each other during the slide |
| `lead` | 0.3s | Lead-in hold waiting for the narration to start |

## Known Pitfalls
- Making the exit a reversed entrance (retreating leftward) — reads as "this passage is void / I misspoke", and can't hand off to the next passage; the exit must pass through **in the same direction** (in left, out right).
- Exit travel starting with the fade — the stack reads as "swept away in one stroke" and viewers feel they hadn't finished; that 0.27s delay is this card's signature, don't skip it.
- Copying the entrance stagger for the exit — the exit narrates the order again, redundant and slow; use half the entrance stagger.
- Center alignment — every line's left edge differs, the horizontal slide's directionality scatters, and "one stack" reads as "several lines moving separately"; left alignment is mandatory.
- Copying the source's `lineHeight: 1.1` for CJK — CJK glyph faces are taller than Latin; 1.1 sticks adjacent lines together and glyphs press on each other mid-slide.
- Going to 5+ lines — the first line's fade-out has begun while the last is still entering; the "stack" as a unit is unreadable, and viewers can't finish reading either.
- Entrance travel ending with the fade (`enterTravel = enterDur`) — three lines read as three translucent boards being pushed in, indistinguishable from off-the-shelf list presets.
- Copying the entrance's ease-out for the exit — "flung away" becomes "drifting off slowly" and doesn't close cleanly; the exit must be the ease-in `(0.64, 0, 0.78, 0)` (stick first, then accelerate).
- Hard-coding `distance` in absolute pixels for reuse — after a type-size change, large type slides too little and small type flies in from off-canvas; it must scale at 78% of type size.
- Not locking `white-space: nowrap` per line (or a too-narrow container) — a line wraps into two, the line count changes, and the stagger sequence no longer matches the visible lines.
- Scheduling the exit before the entrance ends (`hold` negative or too small) — a line begins fading out while still fading in; the multiplied opacity leaves that line dim overall, as if it never fully entered.
- Replaying by resetting transforms without rebuilding the DOM — after a copy change the line count differs, stale spans remain, and the stagger sequence mismatches the actual lines.

## Reuse Guide
- HTML/GSAP: demos/line-by-line-slide/index.html. **Changing content edits only `CONFIG.lines`**, a string array (3~4 lines);
  the entrance/exit schedules are derived from the line count. Pace via `enterStagger` only (`enterTravel` should track `enterDur` at about 52%);
  dwell via `hold` (by total characters, ≈0.12s each); type size via `.lbl-text`'s `font-size`,
  updating `CONFIG.distance` to 78% of the new size. The stack's placement is `.lbl-block`
  (the demo is a **pure text card** — `inset: 0` + flex full-screen centering, no host;
  `.lbl-text` is `inline-block` + `text-align: left` — it shrinks to the longest line's width,
  so "stack visually centered" and "lines sharing one left edge" hold simultaneously.
  **Change neither `text-align: left` nor `inline-block`**: with `center`, every line's left edge differs and the slide's directionality scatters).
  Entrance only, no exit: delete the two `exitDur` `tl.to` calls (`hold` becomes the freeze).
  The `cubicBezier()` solver is generic — any other demo needing `cubic-bezier` easing can lift it.
- Remotion port: the source `registry/remocn/line-by-line-slide/index.tsx` is a per-frame lookup implementation you can copy verbatim;
  where it beats the GSAP version is that **the exit moment is derived from `durationInFrames`**:
  `exitStart = max(enterDur + (n−1)×enterStagger, durationInFrames − exitDur − (n−1)×exitStagger)` —
  i.e. "give it a total length and the stack auto-exits at the end", no hand-filled hold.
  **Frames↔seconds (source 30fps)**: `enterDur 27` ⇒ 0.90s, `enterTravel 14` ⇒ 0.467s, `enterStagger 4` ⇒ 0.133s,
  `exitDur 18` ⇒ 0.60s, `exitTravelFrom 8` ⇒ 0.267s, `exitStagger 2` ⇒ 0.067s.
  Copy two key formulations: `opacity = enterP * (1 - exitP)` (**multiplied**, not either-or) and `x = xEnter + xExit` (**added**) —
  these two guarantee no jump when exit overlaps entrance; the exit travel's input range is `[exitTravelFrom, exitDur]` (the tail of the same clock, not a new clock).
  Easing `Easing.bezier(0.22,1,0.36,1)` (in) / `Easing.bezier(0.64,0,0.78,0)` (out), all with `extrapolate: "clamp"`.
  Size conversion: the source's `fontSize 72` @1280 canvas; this library's demo is **full-screen pure text**, three CJK lines at 60px on a 960 stage,
  `distance` at 78% of type size ⇒ 47, `lineHeight 1.1 ⇒ 1.35` (CJK).
- Editing-software equivalents: JianYing/CapCut — **one independent text layer per line** (not one multi-line layer, which can't stagger),
  each layer's entrance keyed on two groups: position (left `distance` → 0, 0.47s) + opacity (0 → 100, 0.90s),
  layer start points 4 frames apart; each layer's exit keyed on opacity (100 → 0, 0.60s) + position (0 → right `distance`, **starting only at frame 8 after the exit begins**, 0.33s),
  layers 2 frames apart. JianYing's "slide right out" preset can't produce that 8-frame delay; the position must be keyed by hand.
  AE — three text layers (or one layer with three `Text Animator`s split by `Range Selector`),
  two groups of Position + Opacity keyframes for entrance/exit each, curves pulled to the corresponding beziers in the Graph Editor;
  the exit travel's first keyframe **lands 8 frames after the fade-out begins** (the most commonly missed step in the whole card);
  don't use `CC Slide` or transition effects (they crop edges; this card's lines translate whole, uncropped).
- Division of labor with same-family cards: `keyword-pop-highlight` = slamming one downbeat;
  `per-character-rise` / `soft-blur-in` = both **single-sentence** entrances (vertical lift / focus pull);
  `quote-card` = a full-screen-yielding multi-line pull-quote card (**with backing board, host dimmed, whole card exits** — it is a "card");
  **this card = multi-line points without a backing board** (type lands directly on the existing frame, host stays on camera, and it passes through when done).
  The boundary with `quote-card` is crisp: does it need the stage yielded? A quote needing ceremony ⇒ `quote-card`;
  points "hanging alongside while you talk" ⇒ this card. The two never mix within one passage.

## Scope
- Belongs to this card: the entrance timing set "travel 0.47s / fade 0.90s (travel spans 52%) + 0.133s line stagger"; the **pass-through** exit direction "in from the left, out to the right" (not a reverse playback); the exit's horizontal travel starting **0.267s** after the fade (the card's signature); the exit stagger fixed at **half** the entrance's; the opposed easing pair — entrance ease-out `(0.22,1,0.36,1)` and exit ease-in `(0.64,0,0.78,0)`; horizontal travel fixed at **78% of type size**; the composition formulation of `opacity` multiplied / travel added; the lower bound that the exit never precedes the entrance's end; **left alignment** (a shared left edge makes the "stack") and the "3~4 lines" cap.
- Not part of this card: the demo's three lines ("First, write the problem down / Second, keep one variable / Third, run the smallest experiment") and the "Nth," numbering style, the 60px size and 600 weight, the ink color `#171717`, `letter-spacing: -0.03em`, `lineHeight 1.35` (a CJK readability floor, not a motion parameter), the sans-serif family choice, the white stage, and the "stack centered on stage" placement (left of frame, right of frame, lower half all work, **as long as lines stay left-aligned**). **The demo is a pure text card with no host** (user-finalized 2026-08-25) — the full screen goes to this stack; a host placeholder would pull attention away from "lines sliding in one by one"; but the application side keeping the host on camera works equally (the stack hangs in the empty column beside the host) — placement is not part of this card's motion body, **left alignment is**.
- Portability interface: `CONFIG.lines` is the sole content entry (3~4 lines); pace via `enterStagger` (`enterTravel` tracking `enterDur` at about 52%); `hold` by total characters (≈0.12s each); `distance` scaling at 78% of type size; **`exitDelay` / `exitStagger` and both easings are feel constants — never touch them for size or pacing changes**; entrance-only means deleting the two exit tweens (`hold` becomes a freeze); vertical video uses 3 lines with type shrunk to 32~38px (each `nowrap` line within 90% of usable width; no more than 12 CJK characters per line).
- Background requirements: white or dark both work (on dark, reverse the type to white). The one constraint: **no vertical stripes or vertical gradients in the background** — lines slide horizontally across it, and vertical texture creates a parallax illusion against horizontal travel. Live-footage backgrounds are usable but need an outline or translucent backing board for legibility (this card carries no board — where a board is needed, use `quote-card`).
