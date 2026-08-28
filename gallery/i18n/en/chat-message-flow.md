---
name: chat-message-flow
title: A chat log performs itself — our message first types out character by character in the bottom input box, pauses 0.33s, then pops onto the screen; the other side shows a "typing" three-dot bubble first (duration computed from reply length) before their message pops in; a reaction emoji sticks on 0.27s after the message settles; the entire schedule is auto-generated from text length
usage: The moments when narration throws down a chat log as evidence — "here's what the client said", "the team's discussion at the time", "I asked it and this is what it answered"; product retrospectives, workplace communication, AI conversation demos, dispute reconstructions; not for showing lots of message history (the self-performance plays only 2–4 messages)
---

## Intent
Chat screenshots are the most frequent evidence asset in narration, but a screenshot can only be "slapped onto the stage" (media-pop-in) — it is forever **past tense**.
This card turns the same log into **present tense**: the viewer watches our side type the words into the input box, watches the other side's three dots bounce for a second and a half before replying —
the "this conversation is happening now" immediacy is an order of magnitude stronger than "this is a screenshot" — and **each message's arrival naturally aligns with your telling**:
whichever line you're narrating, that line lands on screen right then.
Critical rules: **each of the two paths has its own preamble** (ours passes through the input box, theirs through the typing bubble; without the preambles it degrades into "bubbles fading in one by one"),
**the schedule is auto-generated from text length** (a hand-counted frame table dies with every copy change, and inevitably produces the tell of "a two-character message typed for two seconds"),
**a neutral grayscale skin** (make it WeChat green / iMessage blue and viewers start reading platform branding — and you're on the hook for the imitation).

## Motion Core
- **Auto-generated schedule (this card's skeleton)**: `buildSchedule()` computes every message's every time point in one pass; runtime only reads the table.
  Ours: `typeDur = clamp(charCount × 0.12s, 0.6, 2.6)`; theirs: `thinkDur = clamp(charCount × 0.115s, 1.1, 2.3)`.
  Chinese counts **characters**, 0.12s/char ≈ 3–4 frames/char @30fps (the original's 2.2 frames/char is too fast for Chinese; reads as machine ghost-typing)
- **Our path (input box → on screen)**: character-by-character reveal in the input (`slice(0, floor(p × len))`, **per character, not chunked** —
  a hand is typing) → after finishing, pause `sendGap 0.33s` (the beat of "finger lifts, then presses send") → send and on-screen **on the same frame**
- **Two-stage send-key feedback**: with any text, it switches from gray fill to ink fill (activated); at the send instant, `scale 1 → 0.84 → 1`,
  rising and falling linearly within a ±0.115s window (`1 − 0.16 × pulse`). The press is the physical evidence of "I pressed it"
- **Input caret**: **solid, unblinking while typing**; only after finishing (entering `sendGap`) does it blink at 2Hz —
  "hands stopped, about to send". Blinking throughout or never blinking both lose that half-beat of meaning
- **Their path (typing bubble → on screen)**: three-dot bubble fades in 0.27s (`y 10 → 0`) → keeps bouncing → fades out 0.2s before the message lands.
  The two time windows never overlap, so "dots and message stacked together" can never be seen
- **Three-dot bounce**: sinusoidal vertical bounce, `w = (sin(2π(t × 1.1 − i/6)) + 1) / 2`, `y = −5px × w`, `opacity = 0.45 + 0.55w`.
  **Phase offset = period/6** (= period/(dot count × 2)) — the wave pushes left to right; dots bouncing in unison read as "three dots breathing", not "someone typing"
- **Bubble on-screen pop 0.47s**: `y 12 → 0` (`power3.out`) + `scale 0.94 → 1` + fade-in (`power2.out`),
  `transform-origin` at the lower edge (our lower-right, theirs lower-left) — floating up from one's own side below
- **Row slot claimed 0.07s before the pop**: the message row's `display` hard-switches into place (pushing the messages above up as a whole) → then the bubble lands.
  Push first, land second; reversed, it becomes "the frame jolts again after the bubble settles"
- **Reaction emoji 0.47s**: appearing `reactDelay 0.27s` after the message settles, `scale 0 → 1` with `back.out(1.9)` overshoot
  (the card's only permitted overshoot), fading in over the first 35%. A 2.5px white ring makes it read as "stacked on the bubble" rather than an icon built into it
- **Layout discipline**: the message area uses `justify-content: flex-end` (bottom-aligned);
  the typing bubble is **absolutely positioned** over the message bubbles (out of flow) — zero reflow when swapped for the message;
  bubbles hide via `opacity` rather than `display` (**holding their slot in flow**, layout jumps only once at `presenceStart`)
- **Layering**: panel base → message flow (bubbles) → typing bubble (absolutely positioned overlay) → reaction emoji (with white ring, topmost) → input box

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `charDur` | 0.12s/char | Our typing speed, Chinese 3–4 frames/char; <0.08s reads as machine ghost-typing (no human hand types that fast), >0.2s the viewer can't wait and starts reading the input box instead of listening to you |
| `typeMin` / `typeMax` | 0.6s / 2.6s | Clamp on typing duration; short messages <0.5s flash past (the "typing" is never seen), long messages >3s let one message eat the whole segment's rhythm |
| `sendGap` | 0.33s | Pause between finishing and sending — this beat is "finger lifts, then presses"; =0 means send-on-finish, reading as an automated script, >0.6s the viewer thinks it froze |
| `thinkPerChar` | 0.115s/char | Their "typing" duration = reply char count × this; long replies automatically think longer (the most valuable payoff of the auto-generated schedule); set it constant and every reply thinks equally long — instantly fake |
| `thinkMin` / `thinkMax` | 1.1s / 2.3s | Clamp on the typing bubble; <0.8s the dots haven't completed one cycle (reads as a flicker), >2.8s the viewer starts waiting on the other side instead of listening to you |
| `reveal` | 0.47s | Bubble on-screen pop; <0.25s reads as a hard-cut appearance, >0.7s the bubble "floats" up and loses the message's snap |
| `msgGap` | 0.60s | Gap between messages; <0.35s two messages glue into one, >1.0s the conversation reads as "two separate statements" |
| `reactDelay` / `reactDur` | 0.27s / 0.47s | How long after the message settles the reaction lands / its pop duration; delay=0 reads as an icon built into the bubble (not "someone reacted"), >0.6s feels like a late addendum |
| `reactPop` | 1.9 (`back.out`) | Reaction overshoot strength; the card's only permitted overshoot, >3 looks cheap, =0 is just a scaled appearance |
| `dotAmp` / `dotCps` | 5px / 1.1 cycles/s | Dot bounce amplitude and frequency; amplitude >8px the dots careen inside the bubble, frequency >1.6 reads as anxious jitter, <0.7 reads as breathing rather than typing |
| Phase offset | period/6 | = period/(dot count×2), the sole source of the "wave pushing left to right"; =0 (dots in unison) instantly degrades into a breathing light |
| `pushLead` | 0.07s | How much earlier the row slot lands before the bubble pops; =0 the push-up and the landing share a frame, reading as "the whole screen jolts" |
| Message count | 2–4 | One self-performance's capacity; >5 messages the viewer starts reading the chat log and leaves your telling (for long logs use evidence-scroll-tour) |

## Known Pitfalls
- All bubbles just fading in one after another (cutting the input-box and typing-bubble preambles) — degrades into a "list loading animation"; the entire value of "the conversation is happening" vanishes.
- A hand-counted hardcoded schedule — dies with every copy change, and inevitably produces tells like "a two-character message typed for two seconds"; the schedule must be computed from character counts.
- The other side's "typing" at a fixed duration — every reply thinks equally long, instantly reading as a looping sticker; the duration must track reply length.
- Our message popping straight in without passing through the input box — viewers read it as "the other side's second message" and can't tell who's speaking; our message's identity is established by the input box.
- The input box revealing text **in chunks** (clusters of 4) — that's the feel of machine stdout (see terminal-typing-log); human typing arrives one character at a time.
- The input caret blinking throughout or never blinking — loses the half-beat of "solid while typing / blinks once hands stop"; that stopped-hands blink is "about to send".
- Dots bouncing in unison (phase offset = 0) — reads as "three dots breathing", not "someone typing"; the phase offset must be period/6.
- The typing bubble's and message bubble's time windows overlapping — for a few frames both bubbles are visible at once; instantly a bug. The fade-out must complete before the message lands.
- The typing bubble **in flow** (fighting the message bubbles for layout) — the frame it swaps for the message, the whole section reflows and jumps; it must be absolutely positioned on top.
- Bubbles hidden via `display: none` — on appearing, they shove the messages above with a jolt, stacking with the pop into a "double jolt"; use `opacity` to hold the slot in flow, jumping only once at `presenceStart`.
- The reaction emoji appearing on the same frame as the message — reads as an icon built into the bubble; 0.27s later is what makes it "someone reacted".
- The reaction emoji without the white ring (pasted straight on the bubble) — smears into the bubble; the stacked reaction can't be distinguished.
- The reaction emoji half-clipped by the container — it protrudes 13px past the bubble's lower edge; the message area's bottom padding must be ≥ that amount (this demo hit it).
- Imitating WeChat green / iMessage blue / adding the pointed tail triangle — viewers start reading platform branding ("is this a WeChat screenshot?"), and you're on the hook for the imitation; neutral grayscale bubbles (ink fill/light gray fill + a single small-radius corner) already express "who's speaking" fully.
- Cramming 6+ messages into one segment — the viewer switches to "reading the chat log" mode and your telling becomes background audio; long logs go to evidence-scroll-tour.
- Adding gradients/shadows/photo avatars to bubbles — the chat panel becomes the protagonist; wireframe grayscale + an initial-letter avatar circle suffices.

## Reuse Guide
- HTML/GSAP: demos/chat-message-flow/index.html. **To change content, edit only `CONFIG.messages`** —
  each entry `{ from: "me" | "them", text, react? }`, and the schedule recomputes (that is the entire point of this card's design — do not patch times by hand).
  All rhythm parameters live in `CONFIG` (`charDur` / `sendGap` / `reveal` / `msgGap` / `thinkPerChar` / `reactDelay` / `dotAmp` / `dotCps`);
  the contact name and avatar initial via the copy in `.head` and `av.textContent` where `rows` is built;
  for English copy, halve `charDur` to about 0.06s (English counts characters; one word ≈ 5 characters).
  When the panel size changes, keep the message area's bottom padding ≥ the reaction emoji's protrusion (13px).
- Remotion port: `buildSchedule()` is a pure function — carry it over as-is and multiply seconds × `fps` into frame numbers (the original `chatFlowSchedule` has this exact structure,
  and the `duration` it exports can feed straight into `calculateMetadata` — **the frame count is computed from content**, no hand-filled `durationInFrames`).
  Bubble pops via `spring({frame: frame - revealAt, fps, config: {damping: 18, stiffness: 120}})` driving `translateY/scale/opacity`,
  or simply three `interpolate`s + `Easing.out(Easing.cubic)`;
  the dots via `const w = (Math.sin(Math.PI*2*((frame/fps)*1.1 - i/6)) + 1)/2` (**never `Math.random`** — multi-pass renders will flicker);
  the reaction emoji via `spring({config: {damping: 11, stiffness: 220, mass: 0.6}})`;
  the input text via `text.slice(0, Math.floor(progress * text.length))`;
  under frame driving, the row slot uses conditional rendering `frame >= presenceStart && <Row/>`, with the bubble itself holding its slot via opacity.
- Editing-software equivalents: Jianying/CapCut — one bubble sticker/text box per message, entering with a "pop up + scale" combo (duration compressed to 0.4–0.5s);
  the input-box passage uses one text layer with a "typewriter" entrance (speed set to 3–4 frames/char); the dots use a three-dot PNG on a "vertical float" loop preset (**it must support phase/delay**, otherwise the dots bounce in unison) — or simply three dots each floating with a 0.05s delay;
  the send-key press is two Scale keyframes (1 → 0.84 → 1, 0.23s total); the reaction emoji uses an "elastic scale" entrance **pinned 0.27s after the message's entrance**.
  AE — one Slider as the clock for the whole segment; bubbles get Position/Scale/Opacity curves with Easy Ease; the dots use the Position expression `-5*(Math.sin(time*2*Math.PI*1.1 - index/6*2*Math.PI)+1)/2` (with `index` as the layer number);
  input text via `text.sourceText.substring(0, Math.floor(t))` with a Slider; the reaction via Scale keyframes + an overshoot expression.
  Any software's "chat animation template" must be checked for two things first: is there an input-box preamble, and do the dots bounce in unison — nine out of ten commercial templates fail both.

## Scope
- Belongs to this card: the mechanism of the schedule auto-generated from text length (ours `clamp(charCount × charDur)`, theirs `clamp(charCount × thinkPerChar)`; copy changes never re-count frames); our path's three beats (character-by-character reveal in the input → `sendGap` pause → send and on-screen on the same frame); the send key's two-stage feedback (activating with text + the ±0.115s window `scale −16%` press at the send instant); the input caret's half-beat semantics ("solid unblinking while typing / 2Hz blink only when hands stop"); their path's two beats (three-dot bubble fading in 0.27s + bouncing + fading out 0.2s before the message, windows never overlapping); the sinusoidal dot bounce and the "phase offset = period/(dot count×2)" discipline; the bubble's on-screen pop (`y 12→0` + `scale .94→1` + fade, 0.47s, `transform-origin` at one's own lower edge); the push-first-land-second order with the row slot claimed 0.07s early; the reaction landing 0.27s late + `back.out(1.9)` overshoot + white ring; the layout discipline (message area bottom-aligned, typing bubble absolutely positioned out of flow, bubbles holding their slots via opacity); the capacity cap of "2–4 messages per segment".
- Does not belong to this card: the demo's three messages debating a filter, the "Lin (Engineer) · Design Review" contact and initial avatar, the specific `👍` emoji, the grayscale skin's exact values (`#1d1d1f` ink bubble / `#f0f0f2` light-gray bubble / `#fafafa` input base / 16px radius + single-side 6px small radius), the 460×448 panel size and 16px font, the `+` and arrow icons, the "online" status line, the corner host (digital human), and "a chat panel" as the vessel (the same timing can be draped over comment sections, support tickets, AI conversation flows).
- Migration interface: `CONFIG.messages` is the only migration entry — swap in an excerpt of the real log (keeping the "I ask → they think → they answer" back-and-forth, 2–4 messages), granting the reaction only to the single most critical message; when speech pace changes, adjust `msgGap` and `sendGap` (**`charDur` / `thinkPerChar` / `reveal` / `dotCps` stay fixed** — these four are feel constants, and scaling them with speech pace turns fast-pace typing into machine ghost-typing); when changing language, adjust `charDur` (Chinese 0.12s/char, English about 0.06s/char); scale dimensions proportionally with the frame, keeping the message area's bottom padding ≥ the reaction's protrusion; in vertical video the panel can span the full frame width with a taller message area (fitting one more line of history, but the performed count still tops out at 4); when swapping in a target product's skin, change only the two bubble fills and text colors + radii, **leaving the schedule and every duration untouched**.
- Background requirements: a white background suffices (a neutral chat panel is naturally light; ink and light-gray bubbles have ample contrast on white). A dark skin works equally, with one hard requirement: **preserve the luminance gap between the two sides' bubbles** (on dark, make ours bright-filled with dark text and theirs a dark gray slightly brighter than the panel); the reaction's white ring likewise becomes a ring in the panel's base color — its job is "separating from the bubble", not "being white".
