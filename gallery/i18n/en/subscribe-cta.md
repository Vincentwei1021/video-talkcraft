---
name: subscribe-cta
title: Control pops in over 0.35s → cursor arcs in over 0.8s to interact → state flips + confirmation motion (YouTube turns gray "Subscribed" + bell swings ±16° with decay / Bilibili long-press 0.55s progress ring fills then three icons light up at 0.2s intervals / generic capsule turns "Following" + checkmark draws in over 0.36s); each single style completes within 3s then auto-fades out
usage: The closing or value-payoff moment of a narration ("if this helped, hit follow"); pick one style per platform, appearing at most once per video
---

## Intent
Not "reminding viewers to follow" but "demonstrating following" — the cursor performs the whole action on the viewer's behalf, lowering the barrier to act.
Vital points: **the cursor must travel over** (a teleport-click loses all the "follow along" guidance value), **the click needs a feedback chain**
(press-down → state flip → confirmation motion; missing any link of the three makes it fake), **the style must match the platform** (saying "triple-action" for Bilibili while showing a subscribe button
means viewers can't map it to what's on their own screen), **leave when done** (an overlay lingering past 8s becomes visual litter).

## Motion Core
Three platform styles **share the same three-phase mechanism**, differing only in the interaction and confirmation motion:
① control pops in → ② cursor arcs in and interacts → ③ state flips + confirmation motion.

**Shared mechanism (identical across all three)**
- Control entrance: scale 0→1.06→1, 0.35s (0.65 portion `power3.out` + 0.35 portion `power2.out`)
- Cursor entry: arcs from off-screen (x:1010) to the control, 0.8s — x uses `power2.inOut`, y uses `sine.inOut`; the speed mismatch composes the arc;
  transform-origin anchored at the arrow tip (0% 0%), so the press micro-shrink doesn't shift the tip
- Interaction frame: cursor scale→0.9 for one beat (0.09s) + control pressed down to 0.94 (0.08s `power2.in`)
- The state flip happens **at the moment of press-down** (not on release), followed by a `back.out(3)` rebound over 0.2s
- Cursor slides off toward bottom-right and fades out over 0.45s
- Segment transitions: 0.3s fade-out/fade-in each, with 0.15s of blank in between

**Style A · YouTube subscribe (subscribe + bell)**
- Red rounded rectangle with white "Subscribe" text → click turns it gray-white "Subscribed"
- Bell: fades in 0.15s after the click, `transform-origin: 50% 8%` (top pivot), rotation swings through the decay sequence
  16→−12→8→−5→2→0 over 0.8s; simultaneously a ripple ring scale 0.6→1.9 + opacity 0.7→0

**Style B · Bilibili one-tap triple-action (long-press to light up)**
- Three gray outlined circular icons (thumb / coin / star) pop in at 0.12s intervals
- Cursor moves to "like" and **holds down**: a progress ring (r=45, `stroke-dasharray` 282.7) fills a full circle over 0.55s with `ease:"none"`
  — this is where the triple-action's sense of commitment lives; if a single tap lights everything, it isn't a "triple-action"
- After the ring fills, icons **light up left to right** at 0.2s intervals: base disc turns highlight color + outline stroke turns white (0.16s each)
  + scale 1→1.22→1 bounce (0.14s `power3.out` + 0.26s `back.out(2.4)`) + a ripple ring scale 0.85→1.75

**Style C · generic follow (Xiaohongshu / Douyin / X)**
- Black capsule with white "Follow" text → click turns it gray-white "Following", with a checkmark slot opening left of the label
- Confirmation motion: checkmark draws in stroke-order — `stroke-dasharray` 27 / dashoffset 27→0, 0.36s `power2.out`
- Simultaneously a capsule-shaped ripple (inset −8, border-radius 999) scale 0.9→1.28 + opacity 0.6→0

**Wrap-up**: each segment holds 0.5s after completion so viewers can read the result, then the whole segment goes opacity→0 (0.4s).
**Sound-effect slots**: a "pop" on the click frame, a "ding" on the bell's first swing, one rising-pitch "ding" per triple-action light-up, a "tap" on the checkmark draw-in (demo is silent; add in the final cut).

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Cursor entry | 0.8s | <0.4s approaches teleporting, guidance feel gone; >1.2s viewers start waiting for it |
| Click press-down | 0.94 | >0.97 the press isn't visible; <0.9 the control looks squashed |
| Bell first swing | 16° | >25° looks like an alarm; <8° swinging that little equals not swinging |
| Bell swing count | 4~5 with decay | Uniform-speed swinging is a pendulum — instantly fake; stopping within 2 swings looks stuck |
| Triple-action hold ring | 0.55s | <0.3s the sense of commitment disappears, degrading to "a single tap"; >0.9s viewers think it froze |
| Triple-action light-up interval | 0.2s | <0.1s the three read as lighting simultaneously — the "chain" is lost; >0.35s the three fragments fall apart, no longer a sequence |
| Light-up bounce peak | 1.22 | <1.1 the light-up looks like a color swap, not being hit; >1.35 the icon jumps out of the row |
| Checkmark draw-in | 0.36s | Appearing instantly = a pasted image; >0.6s viewers wait for it to finish drawing |
| Single style on screen | 3~5s | >8s becomes visual litter blocking content; <2.5s it's gone before viewers can react |
| Occurrences | 1 per video | Multiple occurrences = a begging feel; conversion actually drops |

## Known Pitfalls
- Bell swinging at uniform speed — without damping it's a metronome, not a bell; each swing must decay.
- Cursor teleporting onto the button — viewers never see the "move → click" process; demonstration value is zero.
- Control not changing state after the click — no "Subscribed/Following" result feedback; the click might as well not have happened.
- Triple-action done as "one tap, all three light at once" — the tactile vital point of Bilibili's triple-action is **long-press** + **sequential**; simultaneous lighting makes it an ordinary like.
- Triple-action without the long-press progress ring — viewers don't know how long to hold; the demonstration loses its single most critical piece of information.
- Checkmark as a ready-made ✓ character fading in — the confirmation motion needs the stroke-order of "drawing"; a faded-in checkmark is a pasted image.
- Platform style mismatched to the platform (showing a subscribe button to Bilibili viewers) — viewers can't find what you're demonstrating on their own screen.
- Overlay staying on screen permanently — it blocks content and degrades into background noise; leave-when-done is what makes it effective.
- `fromTo` missing `immediateRender: false` — the ripple ring flushes its from-state at timeline-build time; the red ring hangs on the outer rim while the control "hasn't been clicked yet" (measured: all three triple-action rings appeared early).

## Reuse Guide
- HTML/GSAP: demos/subscribe-cta/index.html. The three segments are independent functions (`segYouTube` / `segTriple` / `segFollow`);
  in production **keep only the one you need** — trim the `[segYouTube, segTriple, segFollow]` array to a single entry; the shared
  `moveTo/down/up/cursorOut/P` helper functions need no changes. Change copy via `.sub-btn` / `.ftxt` and the "Subscribed/Following" text inside `.call(...)`;
  change the color scheme via `CONFIG.accent`.
- Remotion port: one Sequence per segment; replace the bell's keyframe sequence with the decaying cosine `16*Math.exp(-t*4)*Math.cos(t*14)`;
  the long-press ring drives strokeDashoffset via `interpolate(frame, [holdStart, holdEnd], [282.7, 0])`;
  triple-action light-ups switch styles conditionally per icon with `frame >= lightFrame + i*stepFrames`; the checkmark is likewise a dashoffset interpolation.
- Editing-software equivalents: search LottieFiles for "subscribe button bell" / "like coin favorite" — plenty of ready-made JSON to drop in;
  Jianying "stickers → subscribe button / one-tap triple-action" animated stickers; in AE use Bounce/Overshoot expressions + a parented bell swing chain + Trim Paths for the checkmark.
- (Field-tested variant) Comment prompt: instead of the button + cursor + confirmation trio, keep the CTA keyword (e.g. the trigger word for commenting) highlighted in blue/fluorescent **persistently** on the host's chest — the small word stream keeps scrolling while the large keyword stays anchored. The guidance goal shifts from "click the button" to "remember this word and go comment" — zero cursor throughout, and it doesn't occupy the closing slot. See TheAIScaler (u8OWXXTcu3Q / a2iG5GkM8KE).

## Scope
- Belongs to this card: **the strictly serial causal chain of three phases shared by all three platform styles** — control pops in scale 0→1.06→1 (0.35s) → cursor **arcs** in from off-screen (0.8s, x `power2.inOut` / y `sine.inOut`, the speed mismatch composing the arc, anchor at the arrow tip) → the interaction frame's feedback chain (cursor scale→0.9 + control pressed to 0.94 for one 0.08s `power2.in` beat + state swap **at the moment of press-down** + `back.out(3)` rebound + cursor sliding off and fading). Each style's confirmation motion also belongs here: the bell's `transform-origin: 50% 8%`, swinging the **decay** sequence 16→−12→8→−5→2→0 over 0.8s + a ripple scale 0.6→1.9; the triple-action's **long-press progress ring** filling a full circle over 0.55s `ease:"none"` + **left-to-right light-ups at 0.2s intervals** (disc recolors 0.16s + scale 1→1.22→1 `back.out(2.4)` bounce + per-icon ripple 0.85→1.75); the follow checkmark's `stroke-dasharray` draw-in 0.36s `power2.out` + capsule ripple 0.9→1.28. Segment fade-out/fade-in 0.3s / 0.15s inter-segment gap / leave-when-done also belong to this card.
- Does not belong to this card: the host placeholder (digital human), the platform-name label copy and wording, the control's corner radius and font size, the three icons' specific artwork (thumb/coin/star are just a neutral rendering of "three lightable targets"), the ripple and bell colors, the cursor SVG's specific shape, the white base disc/white outline added for compositing over live footage (contrast adaptation — see background requirements).
- Migration interface: **switching platform style = keeping only the corresponding segment function** (`segYouTube` / `segTriple` / `segFollow`); all three share `moveTo/down/up/cursorOut/P`, and deleting the other two doesn't affect the rest of the code; the demo chains all three only to showcase every mechanism at once. All timing lives in `CONFIG`: the shared phase uses `btnIn`/`cursorMove`/`clickDip`, segment A uses the `bellSwings` array/`bellTime`, segment B uses `triStagger`/`holdPress`/`triStep`/`triPop`, segment C uses `checkDraw`, segment transitions use `segFade`/`segGap`/`segHold`. When resizing, change `CONFIG.START` (cursor origin, recomputed from stage width); landing points are back-computed from actual element positions by `P(el, fx, fy)`, so layout changes require no coordinate edits. Copy changes go in `.sub-btn` / `.ftxt` and the flipped text inside `.call(...)`; `triStep` is decoupled from the triple-action icon count (forEach schedules by index — adding/removing icons re-sequences automatically).
- Background requirements: plain white is fine. **`CONFIG.accent` = #e62117 is the semantic color for "this is that button / this one landed" — this card keeps it** — it carries the identification of "this is the control" and "this press took effect"; when switching platforms, change it to the platform's button color (Bilibili pink, Douyin red, etc.), but do not grayscale it; the un-lit state, completed state, bell, and ripples all stay grayscale/ink. When the overlay sits on live footage, controls must carry their own contrast: red-on-white and the white base disc hold up naturally; **the black capsule needs a white outline (`box-shadow: 0 0 0 3px #fff`), the dark bell needs a white circular base disc, and icon names go on small white capsules** — measured: without these three, they smear straight into the host's dark clothing. The grayscale "Subscribed/Following" state needs to be brightened a notch on dark backgrounds.
