---
name: highlighter-sweep
title: A semi-transparent yellow highlighter sweeps left to right in 0.4~0.8s across the key sentence of a quoted passage while the surrounding text dims on the same frame; when the sweep completes, the whole sentence lifts slightly — the reader's gaze is marched along
usage: When narration quotes a report/paper/news screenshot and reaches "this is the sentence"; the calm evidence-reading tone of documentary voiceover and knowledge-channel breakdowns
---

## Intent
When narration reads out a quoted passage, the viewer doesn't know which line to look at — a highlighter sweep + dimming the rest marks the key point on the viewer's behalf,
locking "the sentence being heard" to "the sentence being seen". Vital constraints: **the color block may not cover the text** (multiply or semi-transparent; covering the text
is erasing the evidence), **sweep speed aligns to the reading aloud** (0.4~0.8s — following the voice is what makes it "marked live", not an effect),
**the rest of the text must be dimmed** (highlight without subtracting the surroundings and the emphasis loses half its power).

## Motion Core
- The quote-screenshot card is on screen first (light paper `#f7f4ea` card + slight -0.4° tilt + deep shadow), with an ultra-slow 8s linear push-in to 1.025x throughout to prevent deadness
- The key sentence is wrapped in a `position:relative` span with an absolutely positioned block inside: `#FFE949`, opacity 0.6, `mix-blend-mode:multiply`
- The block's four corners use irregular border-radius (`12px 5px 10px 4px / 7px 12px 5px 10px`) to suggest a pen stroke, overflowing 6~8px on each side
- The sweep: block `scaleX 0→1`, `transform-origin: left center`, 0.6s, `power2.inOut` (slightly eased at pen-down and lift-off; constant speed looks like loading)
- Same frame: the remaining paragraphs opacity 1→0.55, 0.45s, `power2.out`
- On completion: the whole key sentence scale 1→1.03 + y -2px, 0.3s, `power2.out`, origin left — the emphasis settles

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `startDelay` | 0.7s | The card sits a beat while the voice reaches the key sentence; 0 feels like an auto-playing PPT, >1.5s viewers start reading on their own |
| `sweep` | 0.6s | 0.4~0.8 matched to reading pace; <0.3s looks like a render bug, >1s the viewer finishes reading before the pen does |
| `dimTo` | 0.55 | The opacity the remaining paragraphs dim to; >0.7 the emphasis doesn't register, <0.4 the context looks deleted — viewers who try to read it can't |
| `liftScale` | 1.03 | The post-sweep lift scale; >1.08 breaks line width and squeezes the layout, 1.0 leaves the ending with no sense of "settling" |
| `kenburns` | 1.025 | The 8s push-in endpoint; >1.06 visibly moving and stealing the scene, 1.0 is a static long take that reads dull |

## Known Pitfalls
- An opaque block, or one layered over the text without multiply — the text gets painted out, instantly fake (a real highlighter is transparent).
- Constant speed or finishing under 0.3s — reads as programmatic drawing / a render glitch, not a hand marking.
- Highlighting without dimming the rest — every line in the frame keeps equal weight; nothing was marked.
- Regular right-angle corners on the block — reads as a table selection / text selection, not a pen stroke; irregular radii + slight side overflow are required.
- Highlighting less than a complete semantic sentence (half a sentence / broken across two lines) — the viewer can't read the completeness of "this one sentence".

## Reuse Guide
- HTML/GSAP: demos/highlighter-sweep/index.html. Change copy via the `.quote-line` texts, placing the key sentence inside `.hl-wrap` (keep `.hl-block` first inside it); change color via `.hl-block`'s `background: #FFE949` and `opacity: 0.6` (on dark screenshots switch `mix-blend-mode` to `screen` with a dark-mode highlight color); rhythm all in the top-level `CONFIG` (`startDelay` / `sweep` / `dimTo` / `liftScale` / `kenburns`).
- Remotion port: block `transform: scaleX(${interpolate(frame, [d, d+sweepF], [0, 1], {easing: Easing.inOut(Easing.quad), extrapolateRight: 'clamp'})})` + `transformOrigin: 'left center'`, the container div keeping `mixBlendMode: 'multiply'`; dimming via an opacity interpolate from the same start; Ken Burns via `interpolate(frame, [0, durationInFrames], [1, 1.025])` linear; the lift follows after frame `d+sweepF` with a spring or quad-out.
- Editing-software equivalents: JianYing — a yellow block asset in "Multiply" blend mode + a "Linear" mask keyframed sweeping left to right (or search "highlighter" stickers), with a semi-transparent black block dimming the rest; AE — a yellow Solid in Multiply + Linear Wipe (or scaleX keyframes, anchor left) with Easy Ease; CapCut — a "highlight pen" sticker or the same mask-wipe approach.

## Scope
- Belongs to this card: the highlighter block sweeping scaleX 0→1 from the key sentence's left end (0.4~0.8s, power2.inOut, origin left, multiply blend never covering the text, irregular-radius pen-stroke corners); the same-frame dimming of the remaining text to 0.4~0.7 opacity (0.45s); the completed sentence's scale 1.03 + y −2px lift and settle (0.3s). Three actions and one timing are this card's entirety.
- Does not belong to this card: the quote card's layout/border/typeface, the sample copy, and the Ken Burns slow push the demo once carried (that belongs to the camera layer, supplied by the global system).
- Migration interfaces: highlight color via `background` (dark bases switch to `mix-blend-mode: screen` + a bright color); sweep speed `sweep` aligned to the read-aloud duration; dim level `dimTo` tuned to the background's luminance; the target line's selector and the block's geometry (left/right insets) adjusted to the actual text box.
- Background requirements: white works (multiply holds naturally on light bases; dark bases need the screen blend and a re-check of text legibility).
