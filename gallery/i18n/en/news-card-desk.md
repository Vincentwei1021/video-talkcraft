---
name: news-card-desk
title: A news screenshot is wrapped in a white rounded card, slides onto the desk from below in 0.4s with a 1~2° tilt; 1s later a red underline sweeps across the headline's key phrase in 0.3s, a second card then stacks in from the right, and both cards run an ultra-slow 8s Ken Burns throughout
usage: Segments that interpret/comment on news or quote source reporting as evidence; the "first, look at this story" moments in finance, current-affairs, and roundup narration, with a calm professional tone
---

## Intent
Pasting a raw news screenshot into narration = static PowerPoint; wrapping the screenshot as a card "placed on the desk" and underlining the key point in front of the audience
gives the asset an entrance ritual and does the "which sentence to look at" gaze-guidance for the viewer. Three critical rules:
**the Ken Burns must be ultra-slow** (only a 4% push over 8s; faster reads as camera shake); **the red line must wait until the keyword is spoken before sweeping**
(appearing with the card makes it "typeset print," not "underlining"); **the card must be slightly tilted 1~2°**
(standing bolt upright in the center reads as a software popup; only a tilt reads like a physical object "placed on the desk").

## Motion Core
- Card structure: white rounded card (radius 8px) + border #e0e0e0 + shadow (on a white desk, 0 14px 30px rgba(0,0,0,.14) is enough separation; deepen it on a dark desk) + mock news layout: masthead/date line + thick underline, headline h2, body text as gray bars
- Card A entrance: opacity 0→1 + y 60px→0, 0.4s, `power3.out`, with rotate -1.5° as the fixed tilt
- Ken Burns: wrap a `.kb-inner` layer inside the card (transform-origin 50% 40%); after landing, scale 1→1.04, 8s, `ease:none` — the card "lives" but doesn't shake
- Red line: wrap the headline keyword in a span with an absolutely positioned red bar embedded (#d8383a, 5px tall, hugging the text bottom); at 1.0s, scaleX 0→1, 0.3s, `power2.out`, `transform-origin: left center` — "drawn" from left to right
- Card B stacking: at 1.9s, from the right x 320px→0 + fade in, 0.4s, `power3.out`, rotate +2° (tilted opposite to card A); later DOM order naturally stacks it over card A; after landing it starts its own Ken Burns
- Layers: a `.caption-zone` subtitle area sits above the card layer; the narration line echoes the red-line moment ("the point is this one trillion")

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| slideIn | 0.4s | >0.6s the placement drags like a slow materialization; <0.25s reads as a popup |
| slideY | 60px | Larger = stronger "brought in from off the desk" feel; >120px the travel steals the scene |
| tiltA / tiltB | -1.5° / 2° | Zeroing it is instantly fake (software-popup feel); >4° reads as things strewn askew |
| redlineAt | 1.0s | Must align with the moment the keyword is spoken; early = typeset print, late = underlining the wrong point |
| redline | 0.3s | >0.5s looks like slow-motion tracing; <0.15s the "drawing" action is invisible |
| cardBAt | 1.9s | Follows the narration's enumeration rhythm; too close and the two cards fight, too far and the stacking feel breaks |
| kenburns | 1.04 | >1.08 starts to read as a camera zoom; 1.0 leaves the card dead |
| kbDur | 8s | Longer = calmer; <4s it feels like handheld shake |

## Known Pitfalls
- Ken Burns pushed too fast (<4s or multiplier >1.08) — what the audience reads is "the camera is shaking," not "the asset is alive."
- Red line out of sync with the voice — a line drawn before the words is a spoiler, instantly exposed as a pre-rendered animation.
- Card standing bolt upright in the center of the frame — zero rotation + centered = software alert popup; a 1~2° tilt is what makes it "placed on the desk."
- The two cards not overlapping, each taking one side — no stacking means no "the desk keeps filling up" enumeration feel; it becomes side-by-side PowerPoint.
- Red line animated with width instead of scaleX — width triggers reflow jitter and doesn't use the GPU, so the sweep isn't smooth.

## Reuse Guide
- HTML/GSAP: demos/news-card-desk/index.html. To change copy, edit `.paper` (masthead), `.date`, and the `h2` headline in both cards; wrap the key sentence to underline in `<span class="kw">…<span class="redline"></span></span>`; change the red-line color via `.redline`'s `background: #d8383a`, the card background via `.news-card`'s `background`. All rhythm lives in the top-level `CONFIG`: `redlineAt` aligns with your vocal stress, `cardBAt` aligns with the second asset's narration moment, `tiltA/tiltB` control the tilt. The core animation is the timeline inside `DemoShell.register`; copy it along with CONFIG and it lifts out directly.
- (Field-tested variant) translation-strip overlay: for foreign-language screenshots, don't underline in red — instead overlay a white-background black-text translation strip directly on the key sentence (width matched to that sentence, layered over the original) — the audience skips the "read the foreign text, then parse it" step; suited to segments quoting English reports/tweets, mutually exclusive with the red-line channel. See Xiao Lin Shuo · Korean stock crash.
- Remotion port: drive the card entrance y/opacity with `spring({frame, config:{damping:200}})`; Ken Burns via `interpolate(frame, [inFrame, inFrame+8*fps], [1, 1.04])` slow push (clamped); wrap the red line in its own `<Sequence from={redlineAt*fps}>` with `interpolate(frame, [0, 0.3*fps], [0, 1])` driving scaleX; wrap the second card in another `<Sequence from={cardBAt*fps}>` reusing the same entrance component.
- Editing-software equivalents: JianYing — back the asset with a "white frame" sticker + "slide up" entrance animation, the red line via a "brush/line sticker" with a wipe entrance, the slow push via a full-length "scale" keyframe; AE — precompose the card, Position/Opacity keyframes + Scale 100→104 linear, red line as a Shape Layer + Trim Paths; CapCut — "Photo frame" template + a "wipe right" line element, zoom pulled manually with keyframes.

## Scope
- Belongs to this card: the card's "placed on the desk" entrance — opacity 0→1 + y 60px→0 (0.4s, power3.out) with a 1~2° fixed tilt (zero rotation reads as a software popup); the ultra-slow Ken Burns starting on landing (inner `.kb-inner` layer, scale 1→1.04, 8s, ease none, origin 50% 40%); the underline's scaleX 0→1 (0.3s, power2.out, origin left center) which must wait for the keyword to be spoken (before the voice = spoiler); the second card's delayed lateral slide-in + opposite tilt, naturally stacked via later DOM order, running its own Ken Burns after landing; the constraint that the card must sit one layer off the background (shadow/border).
- Does not belong to this card: the mock-news layout (masthead, date, gray-bar body), headline and caption copy, card corner radius and font sizes, the specific underline color value, the desk background color.
- Migration interface: `redlineAt` aligns with your vocal stress, `cardBAt` aligns with the second asset's narration moment (these are the only two parameters needing audio alignment); `slideIn` / `slideY` tune the placement travel; `tiltA` / `tiltB` control the tilt (keep one positive, one negative); `kenburns` / `kbDur` control "alive but not shaking" (>1.08 or <4s reads as camera shake); `cardBFrom` swaps the second card's entrance direction; change the underline color in one place, `.redline`'s `background`.
- Background requirement: white works. The card itself is white too, separated from the stage by the #e0e0e0 border + a 14%-black shadow — these two must not be removed simultaneously. On a dark desk, keep the card white and deepen the shadow; timing is unchanged.
