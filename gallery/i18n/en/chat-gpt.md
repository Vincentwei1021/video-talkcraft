---
name: chat-gpt
title: ChatGPT's first-screen trio fades in staggered in reading order (greeting headline → pill input bar → suggestion chips, with parallax in the displacement); the prompt types character by character into the single-line pill, the circular voice key **morphs in place into a circular send key** while the suggestion chips fade out and shift down; after sending, the greeting exits to make way for the conversation, and the reply streams out in chunks
usage: When narration covers AI topics, performing "here's what I asked, here's what it answered" in the present tense — ChatGPT prompt techniques, AI tool reviews, model-capability discussions; not for scenarios needing long conversation history (the self-performance plays only one question and one answer)
---

## Intent
**An AI product interface performing itself is worth more than a conversation screenshot**: a screenshot is "evidence after the fact"; a self-performance is "happening now" — the viewer watches the prompt get typed in character by character,
the button morph, the reply stream out, and the line "here's what I asked, here's what it answered" becomes present tense.
This card performs ChatGPT's first-screen grammar: the **single-line pill** (one sentence at a time, not a long prompt paragraph), **suggestion chips laid under the input bar**
(the first screen teaches you what you can ask), **the greeting occupying the frame's center** (the first screen is empty; it yields only when the conversation starts), the morph being **circle → circle**
(the form doesn't change, only the icon and fill), and the accent color on the **voice** end, not the send end. These five points are this product's stance, not arbitrary styling.
**Product skin = the content itself (user-ratified 2026-08-25)**: this card involves a real product interface, so **ChatGPT's styling is reproduced in full**,
with no neutralization — `#0D0D0D` ink text, `#E3E3E3` pill outline, `#F4F4F4` user bubble, `#2F6FED` voice key, `#9B9B9B` placeholder gray,
the OpenAI knot at the assistant position — all copied verbatim from the source's `THEMES.light` + `accentColor`. Rationale: the viewer must recognize "this is ChatGPT" at a glance —
grayscaled, it recedes into "some chat box", the five product stances above all become unreadable, and this card is left as just another generic typewriter.
What's editable is the **content** (greeting/prompt/reply/chips copy); the appearance stays.

Critical rules: **parallax in the three-stage stagger** (the source gives the headline ×0.4 and the pill ×0.6, two different multipliers — three layers out of step within one shared pop-in;
flatten them and you get the templated "whole block floats up together"), **chips exit with the morph, not with the send** ("the moment fingers touch keys, suggestions are no longer needed"
is this product's causality; waiting for the send is half a beat late), **chips never come back** (their exit tracks the morph's non-reverting forward progress;
otherwise when the send key reverts to the voice state the chips return with it, reading as "the first screen came back").

## Motion Core
- **Three-stage staggered fade-in (this card's entrance skeleton)**: greeting headline `[0.13, 0.67]` → pill `[0.33, 0.87]` → chips `[0.53, 1.07]`
  (source `fadeUpAt[4,20] / [10,26] / [16,32]`), each carrying a 9px upward shift. **Stagger order = reading order** (headline first, then input, suggestions last)
- **Displacement parallax (the easiest thing to miss)**: the same `spring(damping 14 / stiffness 110 / mass 0.7)` 21px displacement,
  the headline multiplied by **0.4**, the pill and chips by **0.6** — the farther element moves less. The difference between these two source multipliers is the entire parallax;
  flatten them to one value and it instantly degrades into "the whole block floating up together"
- **Typing starts at 1.40s** (source `TYPING_START_FRAME 42`): the rest is left for the narration to open
- **Character-by-character reveal, not chunked**: Chinese at 8.5 chars/s (source `TYPING_CPS 22` is an English character rate).
  The pill is **single-line `nowrap`** — prompt length has a hard cap (which is also this product's grammar: one sentence at a time)
- **Two caret states in the input**: with text, it trails the text tail (the insertion point); empty, it sits before the placeholder; while typing it is solid and unblinking,
  blinking at 1Hz only before typing starts / after typing ends awaiting send (source `Caret blink={!tw.typing}`)
- **Morph (circle → circle)**: within the same 33px box, two layers that are **both circles** crossfade, starting **on the same frame** as typing, completing in 0.40s —
  the voice circle (accent fill + white waveform) `opacity 1 → 0` + `scale 1 → 0.9`, the send circle (ink fill + white arrow)
  `opacity 0 → 1` + `scale 0.8 → 1` with `back.out(1.7)`.
  **Form unchanged, only icon and fill swap** — morphs come in two form routes (circle → circle, circle → squared corners); this product goes circle → circle
- **Accent on the voice end**: the source gives the accent (`#2F6FED`) to the morph's **origin** end (the voice key); the send key is ink `#0D0D0D`.
  Whether the accent goes to the origin or the destination is a product-stance difference (some products flip it, saving the bright color for send) — **this product puts it on voice**; don't casually change it
- **Chips exit with the morph**: `opacity ×= (1 − morph)`, downward shift 6px × morph — a beat unique to the source,
  whose causality is "input has begun, so suggestions are no longer needed". The exit tracks the morph's **non-reverting** forward progress:
  the send key may revert to the voice state after sending (the input emptied), but chips must never return once the conversation has started
- **Send-key press**: within a ±0.11s window centered on `sendAt`, `scale 1 → 0.86 → 1`
- **Greeting exit 0.30s**: fading out from the send frame, **crossfading** with the user message block's pop-in (the first screen yields to the conversation).
  The two sit one step apart in position (the conversation area is above the greeting), so the crossfade never reads as two content layers fighting;
  but **the greeting must persist through typing** — it is the only evidence that "the first screen hasn't been submitted yet"
- **User message block pop-in 0.42s**: takes its slot on the send frame, `y 10 → 0` + `scale .95 → 1` + fade-in, a light-gray rounded block on the right
- **Thinking indicator 0.52s**: a geometric **circle** at the assistant position breathing at 1.2Hz (brightness only — no displacement, no jitter), withdrawn the instant streaming begins
- **Streamed reply in chunks**: `revealed = min(len, ceil(linear / 2) × 2)` @22 chars/s, a block caret riding the tail, withdrawn once finished;
  **the reply has no bubble** (plain text + the OpenAI knot mark on the left)
- **Layering**: white stage → greeting headline (sharing one baseline band with the conversation area — one fades out as the other fades in, zero layout animation) → conversation area → pill (floating with shadow) → chips

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `greetPar` / `pillPar` | 0.4 / 0.6 | The two parallax multipliers, the critical rule of this card's entrance; equal values (whatever they are) instantly degrade into the templated "whole block floats up together"; a difference >0.4 leaves the headline nearly static, reading as two element groups not belonging to the same entrance |
| Three-stage stagger spacing | 0.20s | Start spacing of headline → pill → chips; <0.1s the three stages smear into one (the stagger wasted), >0.4s the viewer waits restlessly for the last stage |
| `cps` | 8.5 chars/s (Chinese) | Typing rate, ≈3.5 frames/char; <6 the viewer starts reading the input box, >12 reads as machine ghost-typing. For English raise to 18–22 |
| `typeStart` | 1.40s | Rest before typing (source frame 42); must be ≥ the chips' fade-in end (1.07s), otherwise typing begins before the first screen has even settled |
| `morphDur` | 0.40s | Voice circle → send circle; <0.2s reads as a hard icon swap, >0.7s the viewer stares at the button instead of listening to you |
| Morph start | **= typing start** | Morphing only after typing finishes degrades into two unrelated events, "a typewriter" plus "a button changing icon"; starting on the same frame is what makes it "the interface responding to input in real time" |
| `chipsOutY` | 6px | Chips' exit downward shift; =0 it's a mere fade (losing the directional "yielding"), >14px reads as being kicked off |
| Chips exit trigger | **Morph forward progress** | Keyed to `sendAt` it's half a beat late (suggestions loiter during typing); keyed to the **revertible** morph value, the chips return after sending, reading as "the first screen came back" |
| `greetOut` | 0.30s | Greeting exit; the trigger must be `sendAt`, not the typing start — the greeting persisting through typing is the evidence that "the first screen hasn't been submitted" |
| `sendGap` | 0.33s | Pause between finishing typing and pressing send; =0 reads as an automated script, >0.6s the viewer thinks it froze |
| `thinkDur` | 0.52s | Thinking before the first token; <0.3s "it's thinking" can't be seen, >1.2s the viewer starts waiting on the AI |
| `streamRate` / `streamChunk` | 22 chars/s / 2 | Streaming rate and chunking; `chunk=1` degrades into uniform character-by-character (a typewriter, not streaming), `chunk>4` reads as whole sentences hard-cutting in |
| Prompt length | 10–14 chars | The single-line pill's hard cap (616px @14.5px, no wrapping); beyond it, this form no longer fits (this product's grammar is one sentence at a time) — perform it in a wide-card composer-style interface instead |
| Reply length | 28–36 chars | The no-wrap single-line cap; at two or more wrapped lines the viewer switches into "reading the reply" mode |

## Known Pitfalls
- The three layers sharing one displacement multiplier (parallax flattened) — the entrance degrades into "the whole block floating up together", and the entire value of this card's entrance choreography vanishes.
- The three-stage stagger changed to simultaneous fade-in — the stagger is wasted; the order must be reading order (headline → input → suggestions).
- Chips waiting for the send to exit — half a beat late; suggestions loiter below during typing. The causality is "the moment fingers touch keys, they're no longer needed".
- Chips' exit tracking the **revertible** morph value — when the send key reverts to the voice state, the chips come back with it, reading as "the first screen returned"; it must track the non-reverting forward progress.
- The greeting exiting during typing — throws away the "first screen not yet submitted" state; it must live until the send frame.
- Greeting and user message hard-swapping in the same position — two content layers fight on the same frame; offset their positions by one step and crossfade for a clean handoff.
- The morph waiting until typing finishes — degrades into "typewriter" plus "button icon swap", two unrelated events.
- The morph done as circle → square — that is the form of wide-card composer products; this product is circle → circle (icon and fill only); change it and it's no longer this product.
- The accent given to the send end — same as above: this product's accent lives on the **voice** end; that directional difference between the two cards is content when making comparison videos.
- The reply wrapped in a bubble — regresses into an ordinary chat card, losing the AI product's interface grammar entirely.
- The reply emitted character-by-character at a uniform rate — that's a typewriter's feel; streaming is tokens arriving in clusters, and `chunk 2` is the floor.
- The thinking indicator done as three bouncing dots — that's IM's "the other person is typing"; AI thinking is a single breathing dot.
- **Grayscaling ChatGPT's skin** (the approach vetoed in the 2026-08-25 user ratification) — grayscaled, it recedes into "some chat box";
  single-line pill / chips / greeting / circle→circle morph / accent-on-voice, all five product stances become unreadable, leaving a generic typewriter. Copy the source values verbatim.
- A geometric circle placeholder at the assistant position — ChatGPT's assistant messages are fronted by that knot; swap in a bare circle and the product can't be identified (the reply itself has no bubble, so the mark is the only product cue).
- The prompt exceeding one line — the pill's `nowrap` pushes it out (or wrapping breaks the pill form); long prompts belong in a wide-card form.
- Four or more suggestion chips — the first screen becomes a menu and the viewer starts reading chips; three is this form's capacity.
- Playing two rounds of Q&A in one segment — the viewer switches into "reading the conversation" mode; one question and one answer is the self-performance's capacity ceiling.

## Reuse Guide
- HTML/GSAP: demos/chat-gpt/index.html. **To change content, edit only `CONFIG.prompt` / `CONFIG.reply` / `CONFIG.placeholder`** —
  the schedule `buildSchedule()` recomputes automatically from character counts. All rhythm parameters live in `CONFIG`
  (`greetPar` / `pillPar` / the three `*Fade` windows / `cps` / `morphDur` / `chipsOutY` / `greetOut` / `thinkDur` / `streamRate` / `streamChunk`);
  change the greeting via `.greet`'s copy, the three chips via the `<span>`s inside `.chips` (icons are inline SVG — new intent, new path);
  **do not change the palette** — it is ChatGPT's skin and belongs to the content (changing it means making a different product's card);
  when genuinely swapping to **another** product's skin, change the two morph layers' `border-radius` and fill + the pill radius + the assistant mark, **leaving the schedule and every duration untouched**.
- Remotion port (this is the source): `registry/remocn/chat-gpt/index.tsx` (520 lines). Pure functions to copy directly —
  `morphProgressAt(frame, {fps, speed})` (`spring({damping:14, stiffness:200, mass:0.6})` then clamped;
  this function is shared across several of remocn's AI product components), `introBounceIn`, `fadeUpAt`;
  typing via `useTypewriter(prompt, {cps, speed, startFrame})` (`registry/remocn-ui/core/timeline.ts`),
  the caret via `registry/remocn-ui/caret`'s `<Caret blink={!tw.typing} blinkPerSecond={1} />`.
  In the source, the parallax is the two multiplications `intro.translateY * 0.4` (headline) and `* 0.6` (pill/chips) — **copy these two multipliers verbatim**;
  the chips' exit is `chipsFade.opacity * (1 - morph)` and `chipsFade.translateY + 8 * morph`.
  Seconds ↔ frames (30fps): `fadeUpAt[4,20]/[10,26]/[16,32]` = [0.13,0.67]/[0.33,0.87]/[0.53,1.07]s,
  `TYPING_START_FRAME 42` = 1.40s, morph 0.40s ≈ 12 frames, chips shift 8px ≈ 6px (this card scales by 0.75).
  The source **stops at the send key settling** (`durationInFrames 150` = 5s freeze); the five beats of send / greeting exit / user message / thinking / streaming are this card's additions.
  Streaming takes the substring via `Math.ceil(Math.floor((frame - streamStart)/fps × rate)/2)*2` (**never `Math.random`** — multi-pass renders will flicker).
  **The remocn source also has `claude-chat` / `opencode` / `v0`, three components sharing the same morph mechanism** (different product skins on one mechanism) —
  when building another AI product's self-performance card, read those first; copy the skin, reuse this card's timing.
- Editing-software equivalents: Jianying/CapCut — the three-stage stagger is three layers each with a "slide up + fade in" entrance preset, **starts offset by 0.2s**;
  parallax comes from shrinking the headline layer's displacement (e.g. pill travels 14px, headline only 9px);
  the morph is a crossfade of two circular button layers (Opacity 100→0 + Scale 100→90 / Opacity 0→100 + Scale 80→100 with elasticity),
  keyframes **must align with the first typing frame**; the chips as one group, their Opacity and Position keyframe starts also pinned to the first typing frame;
  the greeting's fade-out keyframe pinned to the send frame. AE — one Slider as the clock,
  the three `fadeUpAt` stages each written as `linear(s, a, b, 0, 1)`, the parallax being the same `y` expression times different coefficients,
  the reply's Source Text via `text.sourceText.substring(0, Math.ceil(n/2)*2)`,
  the thinking indicator's Opacity expression `0.35 + 0.65*(Math.sin(time*2*Math.PI*1.2)+1)/2`.
  Any software's "AI chat template" must be checked for three things first: do the three layers have parallax, does the morph share the typing's first frame, do the chips wait for the send to exit — commercial templates fail essentially all three.

## Scope
- Belongs to this card: the three-stage staggered fade-in in reading order (headline → input bar → suggestions, 0.20s spacing, each with a 9px rise and a fade window independent of displacement); the **displacement parallax** (one spring displacement times the two different coefficients 0.4 / 0.6); character-by-character reveal in the input with the caret's two positions ("trailing the text tail / before the placeholder when empty") and two blink states ("solid while typing / 1Hz blink when idle"); the discipline that **the morph starts on the same frame as typing**, the circle → **circle** form (icon and fill only) and the two-layer crossfade direction (the exiting one shrinks, the entering one grows with overshoot); the accent sitting on the morph's **origin** end; chips fading out and shifting down with the morph's **forward** progress (non-reverting); the greeting fading out from the **send** frame, crossfading with the user message's pop-in; the send key's ±0.11s press window; the user message block claiming its slot on the send frame and popping in; the thinking indicator's single-dot breathing (1.2Hz, brightness only) withdrawn the instant streaming begins; the streamed reply's chunked reveal + tail block caret + withdrawal on completion; the structural discipline of **no bubble on the reply**; the two capacity caps of "one question, one answer + three chips".
- Does not belong to this card: the demo's specific copy "help me find this data's original source" and that reply, the greeting "what shall we talk about today?", the three chips' specific labels and icons (generate image / polish writing / web-check facts), the 14.5px font size and its proportional conversions, the corner host (digital human).
  **Note, unlike other cards: ChatGPT's skin (the `#0D0D0D` / `#E3E3E3` / `#F4F4F4` / `#2F6FED` / `#9B9B9B` value set, the 616×48 pill + 24px radius source geometry, the OpenAI knot, the `+` and microphone icons) belongs to "the content itself", not "swappable styling"** — see the background requirements below. The same timing can of course be draped over another "single-line pill + suggestion chips" AI product's first screen, but then the skin must become that product's skin (and it would no longer be called chat-gpt).
- Migration interface: `CONFIG.prompt` / `CONFIG.reply` are the only migration entry points — swap in the question and answer you actually asked (the prompt bound to 10–14 chars by the single line, the reply to 28–36), and the schedule recomputes; when speech pace changes, adjust `sendGap` and `thinkDur` (**`cps` / `morphDur` / `streamRate` / `streamChunk` / the two parallax multipliers stay fixed** — they are feel constants); when changing language, adjust `cps` (Chinese 8.5 chars/s, English 18–22 chars/s) and recompute single-line capacity; scale dimensions proportionally with the frame, with the stagger spacing and parallax multipliers **not varying with size**; for vertical video, widen the pill to 90% of frame width, cut chips to two side by side (three get squeezed into wrapping, and wrapped chips instantly read as a mess), lower `streamRate` to 18; when swapping to **another** product's skin (that being another card), change only the two morph layers' radius/fill + pill radius + assistant mark, **timing untouched**.
- Background requirements: **product skin = the content itself; user-ratified 2026-08-25: reproduce the product styling in full**. This card involves a real product interface (ChatGPT's light skin),
  so values are locked to the source `THEMES.light` (page `#FFFFFF` / input bar `#FFFFFF` + `#E3E3E3` outline / primary text `#0D0D0D` /
  placeholder `#9B9B9B` / chips `#E3E3E3` outline + `#5D5D5D` text / send `#0D0D0D` fill with white arrow / accent `#2F6FED`),
  **exempt from the "white-stage neutralization" constraint** — grayscaling it recedes it into "some chat box" and all five product stances become unreadable.
  This product's light skin happens to be pure white, so it naturally matches the white stage (stage base = product base, no extra container needed).
  The dark skin is also in the source (page `#212121` / input bar `#303030` / primary text `#ECECEC` / chips outline `#454545`);
  when dark ChatGPT is needed, swap the whole set, and **the only thing that flips with it is the send circle** (light skin: ink fill, white arrow → dark skin: white fill, ink arrow — the source's `sendBg/sendArrow` flips exactly this way).
- Division of labor with adjacent cards: **vs [chat-message-flow](chat-message-flow.md) (generic chat self-performance)** — that one performs *person and person* (two-sided bubbles, three bouncing dots, reaction emoji, a 2–4 message exchange), this one performs *person and AI product* (first-screen trio, morph, bubble-less reply, streamed text, one Q&A). **vs [claude-code](claude-code.md) (sibling card from the same batch)** — that one is the coding agent in a terminal (dark window, tool-call loop, diff); use it for "AI writes code for me". **vs [terminal-typing-log](terminal-typing-log.md) (generic terminal)** — that one is stdout flow with a terminal as the vessel; this card's streaming likewise chunks forward, but its structure is "one question, one answer" and its vessel is a product interface.
  **To perform another chat-style AI product** (wide-card composer form, morph running circle → squared corners, accent on the send end, no chips, no first-screen greeting):
  carry over this card's timing skeleton and lift the skin from the remocn source's `claude-chat` / `opencode` / `v0`.
  This library currently keeps only this one chat-product card, ChatGPT (the same batch's claude-chat card was withdrawn on 2026-08-25).
