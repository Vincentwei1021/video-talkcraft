---
name: count-badge-title
title: The digit "3" first scales down alone from 1.6x into place and switches to the accent color the instant it lands; immediately after, the counter word is pushed out from its right edge via clip reveal, the second line fades in and floats up with a 0.1s stagger, and the digit closes with a 5-frame punch
usage: Narration openers that promise a count — "three methods", "five pitfalls", "two things"; per-section point previews inside a chapter; every moment the viewer must remember "how many items there are" (the screen right before a list card)
---

## Intent
In the sentence "three methods to solve the problem", the only real information is a single character: **3**. Viewers won't remember the word "methods",
but they will remember "there are three — I should watch to the end". Yet most title animations fade the whole phrase in as one block —
every character weighs the same, that "3" is wasted, and viewers walk away with a vague "he talked about some methods".

What this card does is make **the digit the subject**: it arrives first, arrives alone, is more than twice the size of the other characters, and changes color alone on landing.
The remaining characters don't "appear with it" — they are **brought out by it**: the counter word is revealed as if pushed from the digit's right edge,
and the second line only follows after. This timing translates the sentence's grammar directly into the picture's sequencing.

Its division of labor with the library's two existing stress cards is clean: `keyword-pop-highlight` **slams one word inside a sentence**
(body text present first, keyword explodes after, with a color-block base and screen shake — high energy, serving subtitles);
`type-contrast-emphasis` separates hierarchy through **static typeface/weight contrast** (no timing — it's layout);
this card is **title-level numeric stress** — it isn't inside a sentence, it *is* the screen; it works through "sequence", not "slam".

Two vital constraints: ① **The digit must arrive first and alone**. Three segments fading in together kill the "3 (things)" stress —
it reads as an ordinary two-line title (the card might as well not exist). ② **The color change happens on the landing frame, not mid-flight**.
Changing color while flying reads as "flickering all the way"; lighting up only on arrival is the confirmation that "this is the number".

## Motion Core
- **Three segments in strict sequence, one single action each**:
  - ① Digit: `scale 1.6 → 1` + `opacity 0 → 1`, `0.30s power3.out`.
    **Only scale + opacity, no displacement whatsoever** — the stress is "pressing down", not "flying in";
    `transform-origin: 50% 72%` (center of mass low, so the digit doesn't drift upward as it settles)
  - ② Landing color change: `color: ink → accent`, `0.14s power1.out`, start = landing moment − `0.07s`
    (starting half the duration early so "landing" and "coloring" read as the same frame)
  - ③ Counter word: `clip-path: inset(0 100% 0 0) → inset(0 0% 0 0)` + `x −8 → 0`,
    `0.22s power3.out`, both channels **same curve, same duration** ⇒ they read as one event (being dragged out),
    not two motions of "reveal" and "displacement"; start = landing + `0.02s` (nearly touching — only then does it read as "brought out")
  - ④ Second line: `opacity 0 → 1` + `y 6 → 0`, `0.28s power3.out`, staggered `0.10s`.
    A plain fade-and-rise — it exists to complete the meaning and **must not steal the stress**
  - ⑤ Closing punch: `scale 1 → 1.06` (`0.04s`) → `1` (`0.13s power3.out`), 5 frames total @30fps,
    landing `0.35s` after the second line settles (aligned to the narration hitting its stressed syllable)
- **Only two type tiers**: digit `138px / 700`, everything else `62px / 600`.
  Keeping the counter word and the second line **on the same tier** is deliberate — three tiers would create internal hierarchy among "the other characters",
  scattering the stress (design-language §2: ≤3 type tiers per screen; this card uses 2)
- **`align-items: baseline`**: digit and counter word share a baseline. However large the digit, it must not tilt the line;
  `center` alignment floats the counter word at the digit's waist, reading as two unrelated elements
- **`font-variant-numeric: tabular-nums`**: the digit doesn't jump in width (layout doesn't collapse when swapping in a two-digit `12`)
- **Weight 700 appears exactly once in the whole piece** (design-language §2: 700 = the slam tier, reserved for exceptional moments)
- **The accent color goes on the digit only**; the counter word and second line stay ink `#1d1d1f`

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `numScale` | 1.6 | Digit entrance start scale, this card's energy dial; 1.4~1.8 is the "pressing down" band; >2 reads as smashed against the lens (comedic), <1.25 the settling travel is too short to read as a stress |
| `numIn` | 0.30s | Digit entrance duration; <0.2s reads as popping in (losing the "press down"), >0.45s the digit hangs mid-air too long — the narration has already finished "three methods" |
| `hueDur` | 0.14s | Landing color-change duration; **its start must be landing moment − hueDur/2**. >0.3s reads as slow dyeing (losing the crispness of "confirmation"), 0 is a hard color cut (usable, but loses a little of the lighting-up quality) |
| `restLag` | 0.02s | Counter word's lag relative to the digit's landing, **the second half of this card's first vital constraint**; near 0 is what reads as being brought out by the digit; >0.15s becomes two motions — "digit appears, then the word appears" |
| `restIn` | 0.22s | Counter-word reveal duration; must share duration and curve with the `x` compensation. >0.35s reads as the word being slowly brushed in (that's `highlighter-sweep`'s language) |
| `restX` | −8px | Counter word's starting horizontal offset; **negative** (dragged out from the digit's side); 0 leaves only the clip reveal (missing the "being carried" inertia), <−20 reads as flying out of the digit |
| `l2Lag` | 0.10s | Second-line stagger, **the quantity behind this card's second vital constraint**; >0.25s reads as two independent motions (the two lines lose their relationship), 0 makes it appear with the counter word and steal the "brought out" beat |
| `l2Rise` | 6px | Second-line float-up; >16px the sense of displacement overwhelms the "following" semantics (the second line shouldn't have its own direction) |
| `punchGap` | 0.35s | Interval from second-line settle to the digit's extra beat; in production tune it to where the narration's stress lands (the only parameter that needs audio alignment) |
| `punchScale` | 1.06 | Punch amplitude; 1.04~1.08 (design-language §4 punch token); >1.15 reads as a second entrance — viewers think the animation replayed |
| Digit count | 1~2 digits | At 3+ digits ("100 methods") the digit's width crowds out the counter word; drop `numScale` to 1.35 and the font size to 110px |

## Known Pitfalls
- All three segments fading in together — the "3 (things)" stress disappears, it reads as an ordinary two-line title; the card did nothing.
- Digit entrance with displacement (flying up from below / pushing in from the left) — stress becomes entrance, and the "digit is the subject" semantics get buried by direction; only scale + opacity allowed.
- Color changing mid-flight — reads as "flickering all the way"; lighting up on arrival is the confirmation. The change's start must hug the landing frame.
- Counter word appearing on the same frame as the digit — it is no longer "brought out"; the two read as two text blocks fading in together.
- Counter word's clip and x on different curves/durations — in slow motion you can see the word brushed in first, then sliding separately; disjointed.
- Making the counter word a third type tier (slightly smaller than the second line) — three tiers per screen; "the other characters" develop internal hierarchy and the stress scatters.
- Digit and counter word with `align-items: center` — the word floats at the digit's waist, reading as two unrelated elements; they must share a baseline.
- Skipping `tabular-nums` on the digit — swapping in a two-digit number shifts the width, and the counter word's position moves with it.
- Closing punch at 1.2x — reads as the animation replaying; viewers think they missed something. A punch is "a nudge", not "a do-over".
- Casually giving the accent color to the counter word or second line too — one "look here" per screen (design-language §1 red line); the digit's stress dilutes instantly.
- Setting the whole screen in weight 700 — 700 is the digit's exclusive weight in this card; a full screen of 700 has no weight contrast at all.
- Swapping in the Chinese numeral character instead — a CJK numeral has the same footprint as any other character; however large `numScale` gets, it reads as "one big character" and the "quantity" semantics are lost; this card needs Arabic numerals.

## Reuse Guide
- HTML/GSAP: demos/count-badge-title/index.html. Change copy in three text nodes: `.cb-num` (1~2 Arabic digits),
  `.cb-rest` (counter word, 2~4 characters), `.cb-l2` (second line, 3~6 characters).
  Change the accent via the single `CONFIG.accent` value. Energy adjusts only via `numScale`;
  rhythm only via `l2Lag` and `punchGap` (the former is structural, the latter follows the audio).
  When changing font sizes, **keep the digit-to-rest ratio at about 2.2:1** (138:62); enlarging the digit alone crushes the line spacing.
  Reposition via `.cb-text`'s `left/top` (the demo clears the right-side 42% host column).
- Remotion port notes: five segments, one group of `interpolate` each, sharing absolute frame numbers (30fps: lead-in 12 frames,
  digit entrance 9, counter word 7, second line 8, punch 5):
  digit `scale = interpolate(frame, [12, 21], [1.6, 1], {easing: Easing.out(Easing.cubic)})`;
  color change via `interpolateColors(frame, [19, 23], [ink, accent])` (**the frame range must straddle landing frame 21** —
  that is the "start hueDur/2 early");
  counter word `clipPath = \`inset(0 ${interpolate(frame,[22,29],[100,0])}% 0 0)\`` (template-string the percentage —
  Remotion can't spring-interpolate clip-path as an object);
  punch spliced from two segments: `frame < 45 ? interpolate(frame,[44,45],[1,1.06]) : interpolate(frame,[45,49],[1.06,1],{easing:Easing.out(Easing.cubic)})`.
  All with `extrapolateLeft/Right: 'clamp'`.
- Editing-software equivalents: JianYing/CapCut — **three separate text layers** (digit / counter word / second line);
  the digit layer gets "Entrance: Zoom" (stretch the animation duration to 0.3s); JianYing can't change color "on the landing frame",
  so the workaround is **two stacked digit layers** (the ink one hard-cuts out on the landing frame, the accent one appears the same frame —
  a 0-frame handoff reads to the eye as "colored on arrival"); the counter-word layer gets "Entrance: Wipe Right" 0.22s with its In point at the digit layer's end;
  the punch is three "Keyframe · Scale" points 100→106→100.
  AE — one text layer with an `Animator` (Scale + Opacity, Range Selector full) for the digit entrance,
  color via two `Fill` effect keyframes (19f / 23f); counter word via `Linear Wipe` (Transition Completion 100→0,
  Wipe Angle 90°) + `Position` two keys **over the same span with the same Easy Ease**;
  punch as three `Scale` keys 100 / 106 / 100 (spacing 1f / 4f).
- Division of labor with same-family cards: `keyword-pop-highlight` = **slamming one word inside a sentence** (body text present first, keyword explodes after,
  color-block base + screen shake, high energy, serving subtitles); `type-contrast-emphasis` = **static typeface/weight contrast**
  (no timing, a layout device); `number-counter` = **rolling count-up** (the number has a sense of process, telling "how much it grew to");
  **this card = title-level numeric stress** (the digit is the subject, working through "sequence" not "slam", telling "how many items").
  For "growing from 0 to 67%" use `number-counter`; for "there are three methods" use this card —
  the former's number is a result, the latter's number is a **table of contents**.

## Scope
- Belongs to this card: the strict three-segment sequencing discipline (digit arrives alone → counter word is brought out → second line follows); digit entrance using only `scale 1.6→1` + `opacity`, **rejecting all displacement**; the "light up on arrival" alignment of color-change start = landing frame − `hueDur/2`; the counter word's `clip-path` and `x` compensation on the same curve and duration (reading as one event) with `restLag ≈ 0`; the 0.10s magnitude of the second-line stagger; the closing 5-frame `1.06` punch's amplitude and its placement "after the second line"; the ~2.2:1 digit-to-rest size ratio + only two type tiers; `align-items: baseline` shared baseline; `transform-origin: 50% 72%`; `tabular-nums`; accent color on the digit only.
- Does not belong to this card: the demo's specific copy ("3 methods / solve the problem"), the specific accent `#7A5AF8` (any same-family hue from the reference image works), the specific 138px/62px sizes (the ratio is the essence), the absolute 700/600 weights, the title's left-white-area placement (centered or lower-third work too), the white stage, and the right-column digital-human host placeholder.
- Migration interfaces: content entries = the three text nodes `.cb-num` (1~2 Arabic digits) / `.cb-rest` / `.cb-l2`; color entry = the single `CONFIG.accent` value; energy entry = `numScale`; rhythm entries = `l2Lag` (structural) and `punchGap` (follows the audio stress); when resizing keep digit:rest ≈ 2.2:1 and set `l2Rise` to 10% of the second line's font size. Vertical: move the counter word to the second line and push the second line down to a third (a vertical line can't fit `138px digit + 4 characters`); the three-segment timing is unchanged. At 3+ digits drop `numScale` to 1.35.
- Background requirements: white works. On dark backgrounds invert the counter word and second line to white and swap the accent to the design-language dark-mode tier (e.g. purple `#9B87FF`); timing untouched. The only constraint is that **the digit's landing color change must have enough contrast against the background** — below 3:1 contrast between accent and background, the "lighting up" beat is unreadable and the color change is wasted (in that case switch to a weight change or add an accent underline instead).
