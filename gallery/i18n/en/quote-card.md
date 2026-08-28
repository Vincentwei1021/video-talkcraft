---
name: quote-card
title: When the quote lands, a panel covers the host in 0.25s, 3–5 lines of big type pop in top-to-bottom with a staggered cadence, keywords recolored and enlarged; after a 2–4s hold the whole card slides down and exits
usage: The opinion peaks of a talking-head piece (quotes, conclusions, hot takes); the signature closing move for business/emotional vertical talking-head videos; the Luo Xiang-style pure black-and-white variant suits serious tones
---

## Intent
A great quote deserves a "yielding ritual" — the person exits first and the text takes the full screen, which is how the audience knows this line is the money shot of the video.
Keys: **the panel must be solid** (insufficient opacity makes text and host fight, and the ritual feel drops to zero), **line by line, not character by character** (the line is the rhythm unit;
adding character-level animation within lines gets busy), **pick only 1–2 keywords** (a highlight on every line equals no highlight).

## Motion Core
- Layering: host layer at the bottom, `.quote-panel` full-screen panel (solid; the demo uses grayscale #1d1d1f) covers it
- Entrance: panel opacity 0→1, 0.25s power2.out; the host being covered is itself the "dimming"
- Body: 3–5 lines of big type, each line y 30px→0 + opacity 0→1, 0.4s power3.out, line stagger 120–180ms
- Keywords: in-line spans recolored to the highlight color (#ffd23e) at font-size 1.2em — static styling, not animated
- Attribution small print fades in about 0.2s after the last line
- Exit: whole card opacity→0 + y +40px, 0.3s power2.in, cutting straight back to the host

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Panel opacity | 1 (solid) | <0.9 the host shows through and fights the text; only a fully solid panel gives the "yielding" feel |
| Line stagger | 150ms | >250ms reads like a bulleted list rather than one sentence; <80ms reads as the whole block fading in |
| Per-line entrance | 0.4s | >0.6s drags; <0.25s the line-to-line ordering can't be read |
| Line count | 3–5 lines | Beyond 5 lines it's a paragraph, not a quote — and the audience won't read it |
| hold | 2–4s | Follow the speech pace: cut 0.5s after the read-through; every extra second is dead air |
| Exit | 0.3s slide-down | The exit should be lighter than the entrance; a bouncy exit steals the quote's own afterglow |

## Known Pitfalls
- Bounce on every line / character-level animation inside lines — the accents fight each other and instantly look cheap.
- Quote over 5 lines — big type won't fit, so the size shrinks, and once it shrinks it's no longer a billboard.
- Semi-transparent panel with the host visible — the text floats over the face, reading as danmaku comments rather than a quote card.
- A flashy exit transition — a quote's afterglow lives in stillness; the lighter the exit, the classier.

## Reuse Guide
- HTML/GSAP: demos/quote-card/index.html; change the `.quote-line` copy and `.kw` positions to swap the sentence; all rhythm is in `CONFIG` (panelIn/lineStagger/hold). Luo Xiang variant: swap the panel to pure black, drop the `.kw` color, keep only opacity on line entrances.
- Remotion port: each line gets a `<Sequence from={i*5}>` + `spring({damping:200})` driving y/opacity; control hold via Sequence duration; exit via interpolate(frame, [out, out+9], [0, 40]).
- Editing-software equivalents: CapCut "text template → billboard"; CapCut "quote card"; in AE it's text-layer position/opacity keyframes + a solid layer for the panel.

## Scope
- Belongs to this card: the **masking action** of the panel's opacity 0→1 covering the host layer (0.25s, power2.out, must be solid); the body's 3–5 lines each with `y 30→0 + opacity 0→1` (0.4s, power3.out) and the top-to-bottom staggered cadence of 120–180ms; the attribution small print fading in about 0.2s after the last line; the 2–4s hold; the whole card's `opacity→0 + y +40px` slide-down exit (0.3s, power2.in). The discipline belongs here too: **lines, not characters** (the line is the rhythm unit; in-line keywords get only static recoloring and enlargement, never animation).
- Does not belong to this card: the host-silhouette placeholder, the example quote and attribution copy, the 42px size / 800 weight / letter-spacing, the specific color values of the panel and keywords (black-on-white, white-on-black, and the Luo Xiang pure black-and-white all work).
- Migration interface: `panelIn` sets the cover speed, `lineStagger`/`lineIn` set the line-by-line rhythm, `hold` follows the speech pace, `out`/`outDrop` set the exit; to restyle, change only three values — panel background + line text color + `.kw` highlight color (inverted variant: panel to #ffffff, text to #1d1d1f); when resizing, scale the font size and `lineRise`/`outDrop` proportionally with the frame's short edge.
- Background requirement: **a solid panel with luminance contrast against the stage background is required** (an exception). Rationale: this card's core action is the yielding ritual of "panel covers the host, text takes the screen" — if the panel is white on a white stage, the masking action is invisible on screen and the effect might as well not have happened. The demo picks the most neutral dark grayscale #1d1d1f (hueless, introducing no brand color). Reusers can invert the pairing (white panel + dark host layer); what matters is **the contrast itself**, not which side is dark.
