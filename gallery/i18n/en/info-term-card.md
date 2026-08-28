---
name: info-term-card
title: The instant a technical term is spoken, a rounded info card (icon + term + two-line definition) slides in from off-screen on the host's opposite side in 0.35s with a 3% overshoot, floats on a ±6px sine wave while it stays, and slides back out the way it came once the definition is read
usage: When the narration first drops a technical term or jargon (QE, P/E ratio, Transformer); finance, popular-science, and knowledge-channel explainer tones — steady pacing, never scene-stealing
---

## Intent
When narration drops a technical term, viewers either know it or tune out — this card lets the ones who don't catch up within 3 seconds without breaking the flow for those who do.
Critical rules: **hover** (once landed it must keep a continuous sine float + a large shadow; a static card reads as a pasted watermark),
**yield** (slide in from the side opposite the host, never covering the face),
**brief** (definition capped at two lines; exit as soon as it's read — a card that overstays becomes an obstruction).

## Motion Core
- Card structure: light card (white in the demo + #e0e0e0 stroke) + shadow (on white, 0 10px 24px rgba(0,0,0,.10) is enough to separate layers; deepen on dark) + 46px circular icon on the left + 20px bold term name (abbreviation in small type after it) + 14px two-line definition
- Entrance: x from 480px off-screen → -12px (overshoot), 0.35s `power3.out`; then x → 0, 0.16s `power2.out` to settle — the overshoot is about 3% of card width, giving the "spring" feel
- Float: y 0 → +6px, half period 1.4s, `sine.inOut` + yoyo (demo repeat 3, i.e. 2 full cycles)
- Icon micro-tilt: rotate 0 → 8°, same rhythm and easing as the float (aligned with `"<"`), keeping the card "alive"
- Exit: x → 480px sliding out the way it came, 0.25s `power2.in`, starting at entrance 0.35 + settle 0.16 + hold 3.2
- Layering: card above the host layer, below the caption layer; with the host on the left, the card sits at right:56px / top:34%

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| slideIn | 0.35s | >0.5s drags like a PPT fly-in; <0.25s viewers don't have time to notice the card appear |
| overshootPx | 12 | At 0 there's no "spring" — reads as a translated sticker; >30 looks like bouncing off a wall, too rowdy |
| floatPx | 6 | >10 looks like drifting away / bad signal; <3 the float is invisible, effectively static |
| floatPeriod | 2.8s | <1.5s becomes jittery up-down shaking; >4s a full round trip doesn't fit in one screen-time |
| holdBeforeOut | 3.2s | Match the time the narration takes to finish the definition; too short and viewers haven't finished reading, too long and it becomes an obstruction |
| slideOut | 0.25s | The exit should be crisper than the entrance; >0.4s lingers and drags the pacing |
| iconTilt | 8° | >15° the icon looks broken and wobbling; 0 loses one layer of "alive" detail |

## Known Pitfalls
- Cranking the float amplitude (>10px) — the card looks blown away by wind rather than hovering; instantly fake.
- Card sliding in from the host's side or positioned over the face — the info layer steals from the person layer; the composition immediately looks amateur.
- Definition running three or more lines — viewers can't finish it within the hold; equivalent to no explanation at all.
- Removing the shadow — the card sits dead on the background with no sense of "hovering" above the frame; reads as a static watermark.
- Fully static after landing — indistinguishable from a screenshot asset; the "hover card" becomes a "sticker".

## Reuse Guide
- HTML/GSAP: demos/info-term-card/index.html. Changing copy edits three spots inside `.term-card`: the symbol in `.icon` (¥/％/AI single glyphs all work), the term name in `.term` and the `<small>` abbreviation, and the definition in `.desc` (within two lines); changing color edits the `.term-card` `background` gradient and the `.icon` gradient; all timing feel lives in the top-level `CONFIG` (slideIn / overshootPx / floatPx / floatPeriod / holdBeforeOut / slideOut / iconTilt). If the host is on the right: remove `.host-left`, switch the card to `left` positioning, and change the x=480 in `gsap.set` and the exit to -480.
- Remotion port: entrance via `spring({frame, fps, config:{damping:14, stiffness:120}})` interpolating x: 480→0 (spring's built-in overshoot replaces the two-tween sequence); float via `Math.sin((frame/fps) * 2*Math.PI / floatPeriod) * floatPx` written straight into translateY, frame-driven and naturally seekable; exit via `interpolate(frame, [outStart, outStart+0.25*fps], [0, 480], {easing: Easing.in(Easing.quad)})`.
- (Field-tested variant) Handheld term board: instead of sliding in from off-screen, the card is fixed at the host's chest where the hand sits (with a slight hand-angle tilt); as the host speaks, the hand occasionally crosses the card edge, creating the illusion of "holding up a sign while talking" — more human than an off-screen slide-in, and it naturally solves the "card never covers the face" composition problem; the cost is that the card's position is locked to the host's pose, so it only works with a stable hand position. See XiaoLinShuo's Korean stock crash episode.
- Editing-software equivalents: JianYing = search sticker/text templates for "term explainer / science popup", entrance animation "slide right" + loop animation "gentle float"; AE = position keyframes for entrance + an expression on `y`: `value + [0, Math.sin(time*2*Math.PI/2.8)*6]`; FCPX has equivalent paid presets (Callout / Lower Third Info category).

## Scope
- Belongs to this card: the two-stage landing — x-translation entrance from off-screen on the host's opposite side (0.35s, power3.out) + an overshoot of about 3% of card width, then 0.16s power2.out settle; the post-landing y ±6px sine float (half period 1.4s, sine.inOut, yoyo) — the "hover" semantics rests on it together with the shadow; the icon's rotate 0→8° aligned to the float's rhythm and easing (`"<"`); the exit sliding back out along x after a 3.2s hold (0.25s, power2.in — crisper than the entrance); the constraint "must carry a shadow layer" (without it, reads as a sticker watermark).
- Not part of this card: the card's corner radius/border/background, the icon's shape and symbol, the term and definition copy, type sizes and line heights, the host placeholder, the caption row.
- Portability interface: `offX` flips the entrance direction (host on the right → change to -480; the exit follows automatically); scale `slideIn` / `slideOut` / `holdBeforeOut` to the time the definition takes to narrate; `overshootPx` at roughly 3% of card width (rescale with card width); `floatPx` / `floatPeriod` control float amplitude and period; `iconTilt` controls the "alive" detail; restyling only touches the card `background`, `border`, and shadow strength — the shadow may be weak but never absent.
- Background requirements: white is fine (white card + #e0e0e0 border + one 10% black shadow separates it from the stage). On dark, switch the card to a light block and the shadow to a darker, more diffuse layer; float and in/out timing unchanged.
