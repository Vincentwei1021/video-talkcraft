---
name: slab-punch-title
title: In a two-line title, the key word of the second line sits on a slanted color slab — the first line pops in hard over 0.18s, the slab stretches open from center via scaleX over 0.22s, and **on the frame the slab locks in** the white text hard-cuts into view and punches down from 1.12x to settle (5 frames)
usage: "First half sets up, second half is the point" contrast phrasing within one spoken line ("find / the key point," "the problem isn't A / it's B"); opinionated commentary channels, how-to channels, product-pitch talking-heads; also works as a section subheading in short talking-head pieces
---

## Intent
What "slab punch" solves is not "making the text bigger," but **letting the audience know which word is the conclusion**.
You could just set the second line in giant red type — but it would still be the same kind of thing as the first line (both are text), and the audience reads "a two-line title."
The moment the second line gets placed inside a **slab**, the two lines become two different objects — "setup" and "conclusion" — hierarchy built from a difference of medium, not a difference of size.

Three keys:
(1) **Slab lands first, text lands after**. During the slab's 0.22s stretch the second line is an empty slab; the white text appears only on the frame the slab stops.
Reversed (text already there, slab growing out from under it) it reads as "the text getting caught by the slab" — the slab is demoted to a marker coloring the text,
and this card degrades into `highlighter-sweep` (highlighter semantics, one energy tier lower).
(2) **The slab's -2.5° slant is a static shape attribute, not motion**. It lives in CSS `transform: rotate()`,
and GSAP never touches it. Making it "straighten after landing" or "wobble twice after landing" is wrong — the hand-made feel comes from the shape itself (design-language §4),
not from stop-motion jitter.
(3) **The first line "pops in hard," it does not "fade in"**: `scale 1.04 → 1` + opacity over 0.18s, **no displacement**.
1.04 is small enough that no scaling reads, but it gives the "appearing" a bit of thickness; add a y displacement and it instantly becomes an entrance effect,
and the first line stops being "background setup" and steals the second line's scene.

## Motion Core
- **Three beats in series, one protagonist per beat** (this is why it reads clean):
  - Beat (1) `t=0.40` first line: `scale 1.04 → 1` + `opacity 0 → 1`, `0.18s power3.out`, **no displacement**,
    `transform-origin: 0% 50%` (left alignment is the compositional baseline; the 4% scale must not move the left edge)
  - Beat (2) `t=0.65` (first line settled + a 0.07s breath) slab: `scaleX 0 → 1`, `transform-origin: 50% 50%`,
    `0.22s power3.out` — **stretching open from center**, not unrolling from the left (left-unroll is `alt-block-lines`'s language)
  - Beat (3) `t=0.87` (= the exact end frame of beat 2) white text: `opacity` **hard-cut 0 → 1** (0 frames, via `tl.set`),
    same frame `scale 1.12 → 1` over `0.167s power3.out` (a 5-frame punch @30fps)
- **The white text's opacity must be a hard cut**: give it a 0.1s fade and the text "develops" inside the slab,
  merging with the slab's stretch into one gradient — the "slab stops → text slams" break point disappears
- **Three DOM layers, one job each** (the implementation that keeps slant and animation from interfering):
  outer `.sp-l2` carries only the static `rotate(-2.5deg)` → middle `.sp-slab` carries only padding (setting "slab one size larger than the text")
  → inner two siblings: `.sp-slab-bg` (absolutely positioned fill, the only element receiving `scaleX`) and `.sp-l2-t` (relatively positioned above the bg)
- **How much larger the slab is than the text**: `padding: 10px 22px 12px` @84px font size ≈ 12% of font size top/bottom, 26% left/right.
  Bottom padding 2px more than top — CJK glyphs' visual center of gravity sits high; equal padding reads as "the text hugging the slab's bottom edge"
- **The second line's `margin-left: -22px` (= the slab's left padding)**: once settled, the second line's **text** aligns with the first line's text at the left,
  rather than the slab aligning with the text. The slab is wider than the text; aligning the slab makes the two lines' text look offset by a chunk
- **Layering**: white stage → first line (black text) → second line's outer layer (static slant) → slab bg (z bottom) → white text (z top)
- **The accent color goes on the slab only**: `#e0452c` (the reference image's red family). The first line is black `#1d1d1f`, the white text is the knockout on the slab —
  the whole card has exactly one colored element, and it is the slab

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `slabDur` | 0.22s | Slab stretch duration, this card's energy knob; <0.14s the slab looks like it flashed in (losing the "stretch" action), >0.35s the audience waits for the slab to open while the narration has already spoken the key word |
| `gap` | 0.07s | The breath between first line settling → slab starting; at 0 the two beats glue into one (reading as "both lines appearing together"), >0.2s the two lines break into two separate effects |
| `punchScale` | 1.12 | White text punch start factor; <1.06 the punch doesn't read (the text merely appears), >1.25 the text pokes outside the slab for a frame (the slab is hard-edged — any poke-out is an instant error) |
| `punchDur` | 0.167s (5 frames) | Punch duration, `power3.out`; >0.3s reads as "the text slowly growing" and the slam's force drains away |
| `l1Scale` | 1.04 | First line start factor, **must be small**; >1.08 the first line becomes a popup and steals the second line's spotlight |
| `l1Dur` | 0.18s | First line hard-pop duration; >0.3s the first line becomes the protagonist and the audience's attention lands on the setup |
| Slant angle | -2.5° (static CSS) | The slab's tilt; 0 reads as a tidy layout block (the "designed" feel is gone, but it still works), beyond -6° the slab starts hitting the first line's lower edge, and slanted CJK text gets hard to read |
| padding | 10/22/12 px @84px | The "slab one size larger" amount; left/right <14px the text hugs the slab edge (looks cropped), >34px the slab reads as an empty color bar |
| `hold` | 1.6s | Closing freeze — the finished slab+text layout is the landing point; size it by the key word's character count (about 0.4s per character, plus half a beat after the read-through) |

## Known Pitfalls
- Text and slab appearing together (or text first, slab growing from underneath) — reads as "the text getting caught by the slab," the slab demoted to a marker; this card becomes indistinguishable from `highlighter-sweep`.
- White text fading in instead of hard-cutting — the slab's stop and the text's arrival merge into one gradient; the "slab first, text after" break point vanishes and two beats become one.
- Animating the slant (straightening after landing / wobbling after landing) — violates design-language §4's stop-motion-jitter prohibition; worse, the straighten makes the audience think the slab "was crooked and got fixed," turning the slant from a shape attribute into an error state.
- Slab via `width: 0 → 100%` instead of `scaleX` — width changes trigger reflow every frame, and the text inside the slab shuffles frame by frame; in slow motion it's instantly fake (`scaleX` stays on the compositor).
- Slab unrolling from the left (`transform-origin: 0% 50%`) — that's `alt-block-lines`'s "sweep-out" language; paired with the "slab stops, text slams" timing it reads as two cards stitched together: a left-unrolling slab makes the audience expect the text to sweep out with it, but the text slams instead.
- The second line aligned to the first line by **slab** (forgetting the `margin-left` to cancel the slab's padding) — the two lines' text looks offset by 22px and the title's left baseline collapses.
- White text `transform-origin` at the left end — a 1.12x punch grows rightward outside the slab for a frame; `50% 50%` is "slamming in place inside the slab."
- Giving the first line a y displacement — it instantly becomes an entrance effect, sitting alongside the second line's "slab + slam" as a second focal point; one screen, two accents: scattered.
- The slab's accent color also used on the first line's text (for "echo") — violates design-language §1's single-accent-color red line, and the moment the first line takes color it competes with the second line over "which is the point."
- Equal top/bottom `padding` — CJK glyphs' visual weight sits high; equal padding reads as text hugging the slab's bottom edge. Bottom padding should exceed top by 2–3px.

## Reuse Guide
- HTML/GSAP: demos/slab-punch-title/index.html. **To change copy, edit two HTML text nodes** (`#spL1`'s setup word, 2–4 characters;
  `#spL2`'s key word, 2–5 characters) — the slab width is stretched out by the text automatically, no constants to change.
  To change the accent color, edit `.sp-slab-bg`'s `background` in one place (red `#e0452c` / purple `#7A5AF8` / teal `#0aa3a3`, pick one).
  To change the font size, edit `font-size` on `.sp-l1` and `.sp-l2-t` (the two must match), and scale `.sp-slab`'s padding
  and `.sp-l2`'s `margin-left` (= the negative of the left padding) proportionally.
  Tune energy only via `slabDur`; `punchDur` is a feel constant (5 frames) — never touch it for size or speech-pace changes.
- Remotion port: three beats in series — a single `frame` clock + three `interpolate` segments is enough, no timeline needed.
  30fps conversion: `lead 12f`, `l1Dur 5.4f≈5f`, `gap 2f`, `slabDur 6.6f≈7f`, `punchDur 5f`.
  **Slab and text must be two `<div>`s**: slab `transform: scaleX(interpolate(f, [26,33], [0,1], {easing: Easing.out(Easing.cubic), extrapolateLeft:'clamp', extrapolateRight:'clamp'}))`;
  text `opacity: f < 33 ? 0 : 1` (a ternary hard cut — **do not write it as interpolate**, which produces a fade) +
  `scale: interpolate(f, [33,38], [1.12,1], {...clamp})`. The slant lives in the outermost container's static style,
  entering no interpolate.
- Editing-software equivalents: CapCut — one text layer (first line) + one color-block sticker (rotated -2.5°) + one text layer (key word).
  The slab uses "scale" keyframes 0% → 100% (**anchor must be centered**; CapCut's default is center, which happens to be correct);
  the key word's "opacity" gets two **same-value keys on different frames** for the hard cut (0 → 0 → 100, the middle two keys just 1 frame apart) stacked with "scale" 112% → 100%.
  CapCut's entrance presets have no "slab stretch + text slam" combo — it must be hand-keyed.
  AE — slab layer `Scale` changing only the X channel (unlink proportions) 0 → 100, `Anchor Point` at the slab center;
  text layer `Opacity` using a `Hold` keyframe (right-click → Toggle Hold Keyframe) for the hard cut,
  `Scale` 112 → 100 with `Easy Ease Out` and the handle pulled all the way.
- Division of labor among this library's sibling cards: `keyword-pop-highlight` = slamming one word inside a subtitle sentence (the word is in the sentence, the block follows the word);
  `highlighter-sweep` = a highlighter sweeping across text already on screen (text first, color after, low energy);
  `alt-block-lines` = two lines each sitting on a block, blocks sweeping out the text (a paired-line relationship, blocks unrolling from the left);
  `speed-slab-title` = a slab crashing in from off-screen + speed-line ghosting (also "slab + title," but the semantics are speed, not weight);
  **this card = the two-line title of "first half setup / second half conclusion" within one sentence** — the slab is the conclusion's container, the punch is the conclusion's landing thud.

## Scope
- Belongs to this card: the "slab lands first, text lands after" timing discipline (the white text's start = the slab tween's end frame, no overlap allowed); the slab's `scaleX 0→1` stretching from **center**; the white text's opacity **hard cut** (0 frames, no fade) + same-frame `scale 1.12→1` 5-frame punch; the first line's `scale 1.04→1` no-displacement "hard pop" (the "thickness you can't quite read" magnitude of 1.04); the `gap 0.07s` breath between the two lines; the structure of three beats in series with one protagonist each; the implementation discipline that the slab's slant is a **static shape attribute** (GSAP never touches it); the three-layer DOM division (static slant layer / padding layer / bg-and-text siblings); the `transform-origin` choices (first line at the left end to protect the left baseline, white text at center to prevent poke-out, slab at center).
- Does not belong to this card: the demo's specific copy "find / the key point," the 84px size and 700 weight, this particular red `#e0452c` (purple/teal/orange work equally; the reference image itself is only one color-family sample), the specific -2.5° angle (-1.5° to -4° all work; 0° works too, just with less hand-made feel), the specific `padding: 10/22/12` pixels (the ratio is 12% top/bottom / 26% left/right of font size), the slab's 4px rounding, the right-side host (digital human) placeholder, and the "title in the left white area, 72px left margin" placement (centered or lower-third both work).
- Migration interface: the content entry point is two plain-text strings (setup 2–4 characters / key word 2–5 characters); the slab width auto-fits without measuring; tune energy only via `slabDur` (0.14–0.35s); `punchDur` and `punchScale` are feel constants — leave them alone; when changing font size, scale `font-size` (two places, same value), `.sp-slab`'s padding, and `.sp-l2`'s `margin-left` by the same ratio; change the accent via `.sp-slab-bg`'s `background` in one place; size `hold` by the key word's character count (about 0.4s per character); for vertical video pull the size to 56–64px and the two lines' `gap` from 14px to 10px (this card has no horizontal crowding; the only constraint is the slab's width staying within 88% of the available width — the slab is hard-edged, and pressing past the safe area is an instant error).
- Background requirement: a white ground suffices. A dark ground also works but needs a different implementation — on dark, the first line inverts to white while the white-text slab stays; then "white text on a solid slab" vs "white text on a dark ground" lacks contrast, so the slab must switch to a brighter accent (or gain a 1px bright edge). **Gradient grounds and live-action busy grounds do not work**: the slab is a hard-edged rectangle, and high-frequency detail in the ground makes its edges read as ragged cutout fringing.
