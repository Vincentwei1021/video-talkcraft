---
name: terminal-typing-log
title: Inside a terminal window, commands type out character by character while log lines "burst" out in 4-character clusters; once 8 lines fill up, the buffer jumps a full line-height (zero interpolation); lines ending in `...` freeze for 0.6s after typing to build suspense, and the final success line is the only semantic color in the piece
usage: Narration saying "I ran it", "it really installs", "the build/deploy/test results" — moments that need the command line as evidence; dev-tool reviews, AI coding demos, technical tutorials and postmortems; not for soft content aimed at non-technical audiences (the terminal itself filters out viewers)
---

## Intent
When claiming "I actually ran this thing", a static terminal screenshot has near-zero persuasive power — viewers can't tell whether it was run or faked.
A fake terminal where "text slowly appears" is worse: it reads as a webpage loading animation, not a command line.
This card's value lies in three **tactile disciplines** — real terminal output doesn't drip out at uniform speed, it **bursts out in clusters**;
real terminal scrolling **doesn't glide**, it jumps whole lines; and in a real build, lines ending in `...` **get stuck** — that stall is the suspense.
Get all three right at once and viewers will believe "this segment was really run" without reading a single log line, then hand their attention back to your narration.
Vital points: **cluster bursts** (uniform character-by-character is instantly a CSS tutorial), **zero-interpolation scrolling** (adding an ease makes it instantly fake),
**one semantic color only** (the success line is green; coloring logs, commands, and errors too makes a rainbow terminal, and the "success" beat loses its weight).

## Motion Core
- **Window**: dark terminal window 830×356 (= 40 title bar + 22×2 padding + 8 lines × 34 line-height; 8 visible lines is a hard constraint) + three traffic lights (grayscale) + a centered path title. Monospace font 21px, line-height `round(fontSize × 1.6) = 34px`
- **① Cluster bursts (this card's first tactile signature)**: first compute the linear reveal count `linear = floor((t − start) × rate)`,
  then round up to the cluster granularity — `revealed = min(len, ceil(linear / chunk) * chunk)`.
  Logs use `chunk 4` @ 68 char/s (bursting in clusters); commands use `chunk 1` @ 23 char/s (a hand typing, character by character).
  The order-of-magnitude gap between the two rates is the difference between "human" and "machine"; flatten it and both become machines
- **② Zero-interpolation scrolling (the second signature)**: `steps = number of overflow lines that have started typing` (among lines with index ≥ `visibleLines`, count those with `t ≥ start`),
  buffer `translateY = −steps × lineHeight`. **No tween, no easing** — the frame a line starts typing, the buffer jumps a full line-height.
  Terminals don't glide; a 0.2s ease instantly reads as "a webpage scrolling"
- **③ Ellipsis stall (the third signature)**: lines ending in `...` automatically freeze for 0.6s after typing;
  during those 0.6s the frame is **completely still** (the cursor has already been withdrawn), and only then does the next batch of logs arrive. This is the sole expression of "it's thinking / installing"
- **Cursor**: a block 11×21px (≈ font size × 0.55), blinking as a 2Hz square wave (`floor(t × 2) % 2`),
  **existing only while its line is unfinished** — withdrawn on completion. So the frozen segment is truly still, not "something blinking"
- **Color grading**: command `#f2f2f4` white / log `#9b9ba3` gray / prompt `#6f6f78` / success `#33d16b` (the only semantic color).
  For error scenarios swap the success green for a warning red — still only one line gets it
- **Line placeholder discipline**: lines whose time hasn't come use `visibility: hidden`, not `display: none` — **occupying space without showing**,
  so the layout never reflows; the only thing that jumps is the buffer's single transform
- **Layering**: white stage → terminal window (dark, the only dark region) → buffer (the only transformed element) → lines → cursor

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `logChunk` | 4 | Log cluster granularity, this card's first vital point; 2~4 all work (4 is the most "machine"); =1 degrades to character-by-character and instantly becomes tutorial code, >6 each cluster is so long it reads as "whole lines hard-cutting in" |
| `logRate` | 68 char/s | Log linear base rate (pre-clustering); <40 the audience starts reading log content (off track), >100 a line appears near-instantly, losing the "it's running" sense of process |
| `cmdRate` / `cmdChunk` | 23 char/s / 1 | Command rate and granularity; commands must be `chunk 1` (a typing hand doesn't emit 4 characters at once), and the rate must be clearly lower than the logs' — if the two match, "typed by a person" and "spat by a machine" become indistinguishable |
| `lineDelay` | 0.27s | Base inter-line delay; individual lines can override with `d` (real log paragraphs vary in length — a single value everywhere is instantly fake data); a whole table <0.15s smears together, >0.5s drags the pace |
| `hover` | 0.60s | Auto-freeze for lines ending in `...`; <0.35s the "it stalled" isn't visible, >1.0s viewers think the player froze |
| `visibleLines` | 8 | Viewport visible line count (window height derives from it); <6 it's jumping constantly and reads as jitter, >12 overflow happens too late and the scrolling beat is never seen |
| `lineHeight` | 34px (= 21 × 1.6) | Line height = scroll step; the two must be strictly equal; if not, each jump lands half a line off — an instantly visible bug |
| `cursorHz` | 2 | Cursor blink; the industry default — faster looks like a glitch, slower looks like a hang |
| `leadIn` | 0.32s | Opening rest (waiting for the narration to start); 0 means typing has begun before the audience even sees the window |
| Success line position | last line | The success/failure must be **the last line** — a mid-table conclusion gets washed away by subsequent logs |

## Known Pitfalls
- Character-by-character uniform reveal (`chunk 1` used for logs) — instantly a `setInterval` tutorial; real terminal stdout is flushed from a buffer, in clusters.
- Easing added to scrolling (even 0.15s) — terminals don't glide; smooth scrolling instantly reads as "this is a webpage".
- Command line and logs at the same rate — "a person typing" and "a machine emitting" become indistinguishable; the whole segment becomes one machine talking to itself.
- The same inter-line delay across the whole table — mechanically equidistant rhythm, instantly fake data; real log paragraphs vary in length.
- No `...` stall — the segment becomes uniform screen-scrolling; the causal layer of "it's installing / compiling" disappears, leaving only a stream of text.
- A cursor still blinking during the stall — the point of the freeze is **a completely still frame**; one blink turns "it's stuck" into "it's still running".
- Cursor not withdrawn after a line finishes (persisting at the end of completed lines) — a blinking block hangs at every line's end; 8 lines blink together like a Christmas tree.
- Semantic color handed to multiple types (log blue, warning yellow, success green, error red all at once) — a rainbow terminal; the "success" beat has no weight; one semantic color per segment.
- Conclusion line placed mid-table — subsequent logs wash it down; the audience won't remember the result.
- Unreached lines using `display: none` — every line's appearance reflows the whole layout, compounding with the buffer's jump into a "double shake".
- Treating `overflow: hidden` on `.viewport` alone as clipping — that clips at the **border box**; lines scrolled up show half-cut inside the padding area; the clip layer must be its own layer with `inset` = padding (this demo hit that).
- Writing `textContent` unconditionally every frame — 11 lines reflow together; frame drops are visible in slow motion; only write to the DOM when the reveal count actually changed.
- Using a real, long build log (dozens of lines scrolling forever) — the terminal is **evidence**, not content; 8~12 lines suffice; any more and viewers start reading the log and leave your narration.

## Reuse Guide
- HTML/GSAP: demos/terminal-typing-log/index.html. **To change content, edit only `CONFIG.lines`** — each line is `{ k, t, d?, p? }`:
  `k` is one of `cmd` (command, character-by-character) / `log` (log, clustered) / `ok` (success, the only semantic color),
  `d` overrides the inter-line delay, `p` overrides the post-typing freeze (by default, lines ending in `...` auto-`hover`).
  Rhythm parameters all live in `CONFIG` (`logChunk` / `logRate` / `cmdRate` / `lineDelay` / `hover` / `visibleLines`).
  Changing the font size means updating `lineHeight` (= `round(fontSize × 1.6)`), `.ln`'s `height`, and `.term`'s height — three places —
  because a scroll step unequal to the line height lands half a line off. For error scenarios just swap `.ln.ok`'s green for a warning red; nothing else moves.
- Remotion port: move `CONFIG.lines` verbatim into `LINES`; multiply every second in `buildSchedule()` by `fps` into frame numbers (a pure function, copy directly).
  Reveal count: `const linear = Math.floor(interpolate(frame, [start, start + dur], [0, len], {extrapolateLeft:'clamp', extrapolateRight:'clamp'})); const revealed = Math.min(len, Math.ceil(linear/chunk)*chunk)`;
  scrolling **must not use interpolate** — `let ty = 0; for (let i = VISIBLE; i < N; i++) if (frame >= starts[i]) ty -= LINE_H;` (this is the frame-driven equivalent of "zero interpolation"; the original terminal-simulator is written the same way);
  cursor `Math.floor((frame/fps)*2) % 2 === 0 && revealed < len`; wrap each line in `<Sequence from={starts[i]} layout="none">` or gate visibility by frame directly.
  **Do not jitter rates with `Math.random`** — multi-pass renders will flicker; the clustering already provides the unevenness.
- Editing-software equivalents: Jianying/CapCut — one text layer per line with the "typewriter" entrance preset, but **its speed must be tuned until clusters are visible** (most presets are uniform per-character);
  the `...` stall is simply 0.6s of nothing after that line; scrolling uses **two keyframes of whole-block displacement pinned to the same frame** (forming a hard jump) or just moving the whole text group up one line-height with another cut;
  AE — drive the text layer's Source Text with a `slider` expression taking a substring (`text.sourceText.substring(0, Math.ceil(n/4)*4)`; `ceil/4*4` is the clustering),
  scrolling uses Position **Hold keyframes** (right-click Toggle Hold Keyframe — the native implementation of "zero interpolation"; never the default linear keyframes), cursor is a block Solid with a `Math.floor(time*2)%2` Opacity expression.
  Any software's "terminal / hacker typing preset" is off-limits — they are all uniform per-character + a persistent blinking cursor + smooth scrolling: all three vital points violated.

## Scope
- Belongs to this card: the cluster-burst reveal algorithm (`revealed = ceil(linear/chunk)*chunk`, logs chunk 2~4 / commands chunk 1, the two rates an order of magnitude apart); zero-interpolation scrolling (the buffer jumps a full `lineHeight` on the frame an overflow line starts typing — no tween, no easing, step strictly equal to line height); the automatic 0.6s freeze after lines ending in `...` with a completely still frame during the freeze; the 2Hz square-wave block cursor existing only while the current line is unfinished (withdrawn on completion); per-line overridable inter-line delays creating non-equidistant rhythm; the "one semantic color per segment, placed on the last line" discipline within the command/log/success three-tier color grading; unreached lines held with `visibility: hidden` (zero layout reflow — only the buffer's single transform moves); the clip layer as an independent layer bounded at the padding.
- Does not belong to this card: the demo's fake `pnpm install / pnpm build` log copy and numbers (214.6 kB, 6.42s — all demo context), the `~/projects/koubo-site` path title, the three traffic lights and 12px radius macOS window chrome, the `#17171a` / `#212126` dark-base values and the specific green `#33d16b`, the 21px font and 830×356 window size, the corner host (digital human), and the terminal as a vessel itself (the same timing can be draped over a log panel, CI output, or a chatbot's streamed reply).
- Migration interface: `CONFIG.lines` is the only migration entry point — replace the logs with the target project's real output (keep the "command → logs → conclusion" three-part structure and non-equidistant `d`s), the success line always last; for pacing changes, adjust only `lineDelay` and per-line `d`s (**`logChunk` / `logRate` / `hover` / `cursorHz` stay fixed** — these four are feel constants; scaling them with speech rate smears the clustering into uniformity at fast pace); scale sizes proportionally with the frame, but the two equations `lineHeight = round(fontSize × 1.6)` and `window height = title bar + padding×2 + visibleLines × lineHeight` must both hold; for portrait, raise `visibleLines` to 10~12, narrow the window, and shorten the log copy (no wrapping in the monospace font is a hard constraint — wrapping breaks the scroll step).
- Background requirements: **the terminal window's interior must be dark** (the sole non-white exception this card permits) — the "command line" semantics rest on the dark base, and the success green only has enough contrast on dark; the stage itself remains white, with darkness confined to that window. A light-themed terminal (Solarized Light and kin) can run the same timing, but the log gray must be pushed down to around `#6b6b73` and the success green swapped to around `#1a7f3c`, or the gray logs smear into the white background.
