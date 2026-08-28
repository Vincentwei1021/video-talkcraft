---
name: claude-code
title: A dark terminal window pops in, then three stages spread out staggered in reading order (welcome box → What's new column → prompt line); the command types into the prompt character by character, the whole line dims to gray on Enter, then the causal chain of "tool call → result → diff → conclusion" springs out line by line in chunks; the tool-call line's status dot breathes until its result arrives, and the diff's `+` line is the window's only semantic color
usage: Narration about AI programming — "I asked it to change one line, and here's how it changed it"; AI coding-tool reviews/comparisons, agent-workflow explainers, developer tutorials and pitfall retrospectives; not for soft content aimed at non-technical audiences (the terminal itself filters the audience)
---

## Intent
`terminal-typing-log` already solves "a generic terminal as evidence" — the stdout flow of command → log → conclusion.
But a coding agent's terminal is **not a flow**: it is a **causal chain**. Every step must be legible — "what tool it called, with what arguments,
what came back, and therefore which line it changed" — and that chain is where all the information in AI-programming content lives.
What the viewer judges is not "did it run" (that's a build log's business) but "what exactly did it do, and did it do it right".
So this card's structure differs fundamentally from that one: **tool-call lines carry a status dot that breathes until the result arrives**
("it's working", as a beat), **result lines carry an elbow-mark indent** (visually hanging off the call line — causality expressed through indentation), **the two diff lines land nearly together**
(two halves of one edit; no gap belongs between them), and **the `+` line is the only semantic color** (the full weight of the beat "the file was really changed" rides on that one green).
On top sits the source's first screen — welcome box + What's new + prompt line **staggered in three stages in reading order**, and "this is a freshly launched agent" stands up.
**Product skin = the content itself (user-ratified 2026-08-25)**: this card involves a real product interface, so **Claude Code's styling is reproduced in full**,
with no neutralization — terracotta orange `#D97757` (dashed box + edge-riding title + What's new label + mascot), dark base `#1B1A18` / window chrome `#3A3633`,
primary text `#E8E5DD` / secondary `#8A857C` / dimmer `#6B6660`, the real macOS three-light colors, the source's pixel creature — all copied verbatim from the source's `THEMES.dark` + `accentColor`.
Rationale: this card must serve as evidence that "I really had it do this", and the viewer must recognize which tool at a glance — grayscaled, it's "some terminal",
and the evidence loses its pointing power. What's editable is the **content** (command/log/identity-bar copy); the appearance stays.

Critical rules: **stagger order = reading order** (out of order or simultaneous fade-in loses "the interface spreading out"), **inter-line delays not uniform**
(a long wait before a tool call = it's deciding what to call; the two diff lines nearly touching = one edit; a uniformly spaced table reads as fake data at a glance), **the semantic color goes only to the `+` line**
(the del line uses gray, not red — color both and you get a rainbow diff, and "what changed" becomes harder to see).

## Motion Core
- **Window pop-in 0.62s**: `y 21 → 0` + `scale .97 → 1` (source `spring(damping 14 / stiffness 110 / mass 0.7)`,
  slightly underdamped → equivalent to `back.out(1.05)`'s micro-overshoot). Dark window `#1B1A18` + real macOS three-light colors (source `#FF5F57 / #FEBC2E / #28C840`)
- **Three-stage staggered fade-in (this card's entrance skeleton)**: welcome box `[0.20, 0.73]` → What's new column `[0.40, 1.00]` →
  prompt line `[0.60, 1.20]` (source `fadeUpAt[6,22] / [12,30] / [18,36]`), each with a 9px rise.
  **Order = reading order**: box first, right column next, landing on the prompt line — exactly where typing is about to begin
- **The welcome box's edge-riding title**: a dashed box with the title piece **riding the top border**, the title piece covering that stretch of dashes with the window's base color —
  so the title looks "inset" into the border (a source detail; near-zero cost, but without it the box looks amateur)
- **Typing starts at 1.60s** (source `TYPING_START_FRAME 48`, 6 frames later than the two chat cards — the first screen has more content, so it gets an extra beat)
- **Command revealed character by character**: `chunk 1` @11 chars/s (mixed Chinese/English; source `TYPING_CPS 18` is a pure-ASCII rate).
  **A person at a keyboard doesn't emit 3 characters at once** — this pairs deliberately with the log's chunking below (see that entry)
- **Three block-caret states**: **solid, unblinking while typing**; **2Hz blink** before typing starts / after typing awaiting Enter (the terminal-industry default, one notch faster than the chat cards' 1Hz);
  **withdrawn on submit** (handing off to the log lines' caret)
- **The whole line dims to gray on submit**: `> command` goes from bright to gray — "this line has been handed over", separating in hierarchy from the log being generated below.
  Skip this and command line and log lines share brightness; the viewer can't tell input from output
- **Work log in chunked bursts**: `revealed = min(len, ceil(linear / 3) × 3)` @54 char/s — **springing out 3 characters per cluster** (a machine emitting).
  A full order of magnitude apart from the command line's `chunk 1` @11 chars/s — that gap is the difference between "human-typed" and "machine-emitted"
- **Inter-line delays not uniform**: 0.42 / 0.28s before tool calls (it's deciding what to call), 0.50 / 0.32s before result lines (awaiting the return),
  **only 0.14s between the two diff lines** (two halves of one edit, landing nearly together), another 0.44s pause before the conclusion.
  A uniformly spaced table reads as fake data at a glance
- **The tool-call line's status dot**: **breathes** at 1.1Hz before its result arrives (`opacity 0.35 → 1`, sinusoidal), **locks bright** once the result lands.
  "It's working" vs "this step is done" — **brightness only; no displacement, no jitter**
- **Line carets**: exist only while their line is unfinished (withdrawn on completion), 2Hz square-wave blink. So during inter-line pauses the frame is **truly still** — not "something blinking"
- **Four-tier color grading**: tool-call lines bright (`#E8E5DD`) / result lines dim (`#8A857C`) / diff `-` line gray (`#6B6660`) /
  diff `+` line green (`#33d16b`, **the diff's only semantic color**, the same green as `terminal-typing-log`). The conclusion line's `✓` shares that green.
  The terracotta orange plays no part in this grading — it is **the product's identity color** (box/title/label/mascot/status dot), unrelated to the "what changed" information; the two coexist without conflict
- **Line-slot discipline**: lines not yet due use `visibility: hidden` rather than `display: none` — holding their slots unseen, zero reflow across the block
- **Layering**: white stage → dark terminal window (the only dark region) → welcome box (dashes + edge-riding title) → prompt line → work log

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Three-stage stagger spacing | 0.20s | Start spacing of welcome box → right column → prompt line; <0.1s the three smear into one (stagger wasted), >0.4s the first screen spreads too slowly and typing never seems to start |
| Stagger order | **Reading order** | Box → right column → prompt line. Out of order (e.g. prompt line first) loses the causality of "the interface spreading out", reading as three blocks fading in independently |
| `typeStart` | 1.60s | Rest before typing (source frame 48); must be ≥ the prompt line's fade-in end (1.20s), otherwise typing runs on a line not yet visible |
| `cps` | 11 chars/s (mixed Chinese/English) | Command typing rate; <8 the viewer starts reading the command instead of listening to you, >16 reads as machine ghost-typing. Pure-ASCII commands can go to 18 |
| `logRate` / `logChunk` | 54 char/s / 3 | Log reveal rate and chunk granularity, this card's second critical rule; `chunk=1` degrades into per-character (that's a human typing, not a machine emitting), `chunk>5` makes clusters so long they read as whole-line hard cuts; the rate must be **clearly above** `cps` — flatten the two and "human-typed" vs "machine-emitted" can't be told apart |
| `submitGap` | 0.36s | Pause between finishing typing and pressing Enter (finger lifts, then strikes); =0 reads as an automated script, >0.7s the viewer thinks it froze |
| Inter-line delay `d` | 0.14–0.50s | **Must be non-uniform**: long before tool calls (it's thinking), the two diff lines nearly touching (one edit), another pause before the conclusion; one value across the table reads as fake data at a glance |
| `dotHz` | 1.1 | The tool-call status dot's breathing frequency; >1.6 reads as anxious flicker, <0.7 the motion can't be seen. Brightness only — adding displacement collides with the library's "no micro-jitter" preference |
| `cursorHz` | 2 | Block-caret blink; the terminal-industry default, one notch faster than the chat cards' 1Hz (that one-notch gap is the feel difference between "terminal" and "input box") |
| Log line count | 6–8 lines | One causal chain's capacity; <5 lines the chain is incomplete ("call → result → change → conclusion" can't be seen), >10 lines the viewer starts reading the log and leaves your telling |
| Semantic color placement | **Only the `+` line and `✓`** | The del line uses gray, not red; color both and you get a rainbow diff — "what changed" becomes harder to see |

## Known Pitfalls
- The three stages fading in simultaneously or out of order — loses the reading guidance of "the interface spreading out"; the order must be box → right column → prompt line.
- Command line and log at the same rate and granularity — "human typing" and "machine emitting" become indistinguishable; the whole segment turns into a machine talking to itself.
- The log per-character at a uniform rate (`chunk 1`) — instantly reads as a `setInterval` tutorial; machine output springs out in clusters.
- Inter-line delays uniform across the table — mechanical rhythm, instantly fake data; a real agent's steps take unequal time (above all, the two diff lines must land nearly together).
- Tool-call lines without a status dot, or the dot locked bright throughout — loses the "it's working" beat, and the work log degrades into static text appearing line by line.
- The status dot given jitter/rotation/displacement — collides with the library preference (handmade feel comes from shape, not micro-jitter); brightness alone suffices.
- The diff's `-` line colored red — a rainbow diff; "what changed" becomes harder to see. `-` uses gray; the semantic color goes only to `+`.
- Semantic color handed to multiple types (tool calls blue, results yellow, `+` green, `-` red, all at once) — the beat "the file was really changed" loses all its weight.
- The command line not dimming after submit — command and log share brightness; the viewer can't tell input from output.
- The prompt-line caret not withdrawn after submit — two carets blinking in one terminal at once; instantly a bug.
- Line carets not withdrawn on completion (parked at finished line ends) — seven lines blinking like a Christmas tree; and the inter-line pauses are no longer still.
- Lines not yet due using `display: none` — each appearing line reflows the whole block, reading as "a jolt per line"; hold slots with `visibility: hidden`.
- Result lines without indent or elbow mark — the causality snaps; they read as two parallel log lines. Indent + `⎿` is what says "this is the return of the call above".
- The conclusion line placed mid-log — later lines wash it downward and the viewer can't retain the outcome; the conclusion is always the last line.
- **Grayscaling Claude Code's skin** (the approach vetoed in the 2026-08-25 user ratification) — a grayscale terminal is "some terminal",
  and the pointing power of "I really had this tool do this" is gone. Copy the terracotta `#D97757` and that dark-value set verbatim.
- The mascot swapped for a blocky geometric placeholder — the pixel creature is this tool's strongest first-screen identifier; swap it out and the first screen is unrecognizable. Use the source's `Mascot` path.
- The command written as `lorem` or fake paths — viewers can read fakeness, and the persuasive force of "I really had it do this" drops to zero; write realistic file paths and tasks.
- The log written as a dozen-line full agent trace — the terminal is **evidence**, not content; a 6–8 line chain suffices, and beyond that viewers start reading the log.

## Reuse Guide
- HTML/GSAP: demos/claude-code/index.html. **To change content, edit only `CONFIG.prompt` and `CONFIG.lines`** —
  each line `{ k, t, d }`: `k` takes `tool` (tool call, with status dot) / `res` (result, with `⎿` elbow indent) /
  `del` (diff deletion, gray) / `add` (diff addition, the only semantic color) / `ok` (conclusion, with `✓`), and `d` is the inter-line delay.
  The schedule `buildSchedule()` recomputes from character counts (**never patch times by hand**).
  All rhythm parameters live in `CONFIG` (`cps` / `logRate` / `logChunk` / `submitGap` / `dotHz` / `cursorHz`);
  identity-bar copy via `.colL` (welcome line / model / cwd), What's new via the `<li>`s in `.colR`;
  the semantic color via the `color` on `.lg.add` and `.lg.ok b`, two places (for error scenarios swap that green for a warning red, still on one line only);
  **do not change the terracotta orange or that dark-value set** — they are Claude Code's skin and belong to the content (changing them means making another tool's card);
  when changing font size, adjust `.lg`'s `height` (line height) and the window height together — this card's log doesn't scroll, but uneven line heights make pauses look like "a missing line".
- Remotion port (this is the source): `registry/remocn/claude-code/index.tsx` (445 lines). Pure functions to copy directly —
  `introBounceIn(frame, fps)` yielding `{translateY, scale}`, `fadeUpAt(frame, [a,b])` yielding `{opacity, translateY}`;
  typing via `useTypewriter(prompt, {cps: 18, speed, startFrame: 48})` (`registry/remocn-ui/core/timeline.ts`),
  the caret via `registry/remocn-ui/caret`'s `<Caret width={11} height={22} blink={!tw.typing} />`.
  The source exports `WHATS_NEW: string[]` (the right column's list), `TYPING_START_FRAME 48`, `TYPING_CPS 18`, `THEMES.dark/light`.
  Seconds ↔ frames (30fps): `fadeUpAt[6,22]/[12,30]/[18,36]` = [0.20,0.73]/[0.40,1.00]/[0.60,1.20]s,
  `TYPING_START_FRAME 48` = 1.60s, `submitGap` 0.36s ≈ 11 frames.
  The source **stops at the command fully typed** (`durationInFrames 160` = 5.33s freeze; it only plays up to the moment before Enter) —
  Enter / tool call / result / diff / conclusion, that causal chain, is this card's addition. The log's frame-driven code is identical to
  [terminal-typing-log](terminal-typing-log.md):
  `const linear = Math.floor(interpolate(frame, [start, start+dur], [0, len], {extrapolateLeft:'clamp', extrapolateRight:'clamp'})); const revealed = Math.min(len, Math.ceil(linear/3)*3)`;
  the status dot `0.35 + 0.65*(Math.sin(2*Math.PI*((frame-start)/fps)*1.1)+1)/2`;
  the line caret `Math.floor((frame/fps)*2) % 2 === 0 && revealed < len`.
  **Never add `Math.random` jitter to the rate** — multi-pass renders will flicker; the chunking already supplies the unevenness.
  The sibling component `opencode` (another TUI skin on the same architecture) reads well as a cross-reference.
- Editing-software equivalents: Jianying/CapCut — the terminal window is one static dark image; the three-stage stagger is three layers each with "slide up + fade in", **starts offset by 0.2s**;
  the command line is one text layer with a "typewriter" entrance (speed set to 3 frames/char), **hard-cut to a gray text layer** after submit (that is the "dimming");
  each log line is its own text layer, with the typewriter preset's speed set so clusters are visible (most presets can't — the fallback is cutting each line into 2–3 hard-cut segments);
  the inter-line delays are simply each layer's start time **deliberately non-uniform**; the status dot is a small circle layer on a "breathing" loop preset (**opacity only** —
  any preset carrying scale/displacement is off-limits). AE — one Slider as the clock,
  the log's Source Text via `text.sourceText.substring(0, Math.ceil(n/3)*3)` (`ceil/3*3` is the chunking),
  the status dot's Opacity via `0.35 + 0.65*(Math.sin(time*2*Math.PI*1.1)+1)/2`,
  the caret a square Solid with the Opacity expression `Math.floor(time*2)%2`.
  Any software's "terminal/hacker typing preset" is off-limits across the board — all of them are uniform per-character with a permanently blinking caret, failing both critical rules.

## Scope
- Belongs to this card: the three-stage staggered fade-in in **reading order** (welcome box → right column → prompt line, 0.20s spacing, each with a 9px rise and a fade window independent of the window's displacement); the welcome box's edge-riding title (the title piece covering a stretch of dashes with the window's base color); the discipline that the command line's per-character reveal (`chunk 1`, a human typing) and the log's chunked bursts (`ceil(linear/3)*3`, a machine emitting) sit **an order of magnitude apart in rate**; the block caret's three states (solid while typing / 2Hz blink awaiting Enter / withdrawn on submit); the hierarchy cut of the command line dimming to gray on submit; the structure of the causal chain "tool call → result → diff → conclusion" (result lines indented with elbow marks hanging off the call line); **non-uniform inter-line delays** (long before calls, the two diff lines nearly touching, another pause before the conclusion); the tool-call status dot breathing at 1.1Hz until its result arrives, then locking bright (brightness only); line carets existing only while their line is unfinished (withdrawn on completion; pauses truly still); within the four-tier color grading, the discipline that **the semantic color goes only to the diff `+` line and `✓`, with del lines in gray**; lines not yet due holding slots via `visibility: hidden` (zero layout reflow); the capacity cap of "a 6–8 line chain".
- Does not belong to this card: the demo's command "edit src/theme.ts, add a dark-mode toggle" and the seven log lines' specific copy (142 lines, 8 lines, `useColorScheme()` — all demonstration context), the two swappable identity strings "Welcome back, Avi!" and "~/code/koubo-site", the three What's new items, the 800×456 window size and the 12.5–14px font-size conversions, the corner host (digital human).
  **Note, unlike other cards: Claude Code's skin (the terracotta `#D97757`, the `#1B1A18` / `#3A3633` dark pair, the `#E8E5DD` / `#8A857C` / `#6B6660` three-tier text colors, the real macOS three-light colors and 12px radius, the pixel-creature mascot, the "Claude Code v2.0.0" edge-riding title) belongs to "the content itself", not "swappable styling"** — see the background requirements below. The same structure can of course be draped over another coding agent's TUI, but then the skin must become that tool's skin (and it would no longer be called claude-code).
- Migration interface: `CONFIG.prompt` and `CONFIG.lines` are the only migration entry points — swap in the command and log from a run you actually did (keeping the four-part "call → result → diff → conclusion" structure and the **non-uniform** `d`; the conclusion always last, exactly one `add` line); when speech pace changes, adjust only `submitGap` and each line's `d` (**`cps` / `logRate` / `logChunk` / `dotHz` / `cursorHz` stay fixed** — these five are feel constants, and scaling them with speech pace smears fast-pace chunking into uniformity); scale dimensions proportionally with the frame, adjusting `.lg` line height and window height together; for vertical video, narrow the window to 94% of frame width, drop the What's new column entirely (two columns in portrait squeeze into two narrow strips), and shorten log copy so it never wraps (wrapped monospace breaks the uniform line height); for error scenarios swap `add`'s green for a warning red and the `ok` line for `✗ + error summary`, **timing untouched**.
- Background requirements: **product skin = the content itself; user-ratified 2026-08-25: reproduce the product styling in full**. This card involves a real product interface (the Claude Code terminal),
  so values are locked to the source `THEMES.dark` (window `#1B1A18` / chrome `#3A3633` / primary text `#E8E5DD` / secondary `#8A857C` /
  dimmer `#6B6660` / box lines and title = accent `#D97757`), **exempt from the "white-stage neutralization" constraint**.
  This clause stacks with [terminal-typing-log](terminal-typing-log.md)'s dark-background exception: the "command line" semantics inherently rests on a dark base,
  and the diff `+` line's green only has sufficient contrast on dark. The stage itself remains white; the darkness occupies only the window.
  The source also has `THEMES.light` (page `#E8E5DD` / chrome `#D8D3CA` / window `#FBFAF7` / primary text `#1F1E1D` / secondary `#73726C`,
  **accent unchanged** — the terracotta is the identity color, fixed across themes); when light Claude Code is needed, swap the whole set, and then the `+` line's green must step to `#1a7f3c`, or it smears on the light base.
- Division of labor with adjacent cards: **vs [terminal-typing-log](terminal-typing-log.md) (generic terminal, the most necessary cross-read)** — that one is **stdout flow** (command → log → conclusion, lines ending in `...` hovering 0.6s, the buffer jumping a full line height once 8 lines fill), performing "I ran it once, it installed / the build passed"; this one is a **causal chain** (tool call → result → diff → conclusion, breathing status dots, result lines indent-hung), performing "what the AI actually did and which line it changed". Builds/deploys/installs → that card; AI programming → this card. The two share the chunked-burst and line-slot feel disciplines, but this card doesn't scroll (one chain fits) and that card has no status dots. **vs [chat-gpt](chat-gpt.md) (sibling card from the same batch)** — that one is the **chat-style** AI product (pill input bar + morph + bubble-less streamed reply); this one is the **terminal-style** coding agent (dark window + tool-call loop + diff); "I chat with AI / prompt techniques" → that card, "AI writes code for me" → this card. Together they form the complete "chat-style + terminal-style" AI-product evidence chain. **vs [ui-flow-theater](ui-flow-theater.md) (the mother card of the interface-theater subclass)** — that one performs **a person operating an interface** (cursor choreography + widget state machines); this one performs **an interface generating content by itself** (no cursor, no clicks — every action comes from the agent).
