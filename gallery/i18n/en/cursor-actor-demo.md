---
name: cursor-actor-demo
title: An oversized system cursor performs "move–hover–click" over a UI screenshot; every target it lands on responds instantly (hover background deepens / toggle knob slides across / thumbnail pops in from the cursor's position), one action per narration word — the cursor is an actor operating on the viewer's behalf, not a screen-recorded mouse trail
usage: Narration segments demonstrating how a tool/app is used — "just click here", "drag the image in", "turn these two switches on first"; the standard presentation for tool reviews, AI product explainers, and tutorial narrations
---

## Intent
When narration explains "how this tool works", a real screen recording's cursor is only 12px, its trail straight and jittery — on a phone the viewer simply can't see
where the action lands; pure screenshot cuts, meanwhile, lose the causal sense of "I am operating this". The cursor actor treats the mouse as an **enlarged performer**:
where it walks, how long it pauses, what it clicks are all directed; the viewer's gaze is led along, and the elements' instant responses complete the sentence
"see — click it and it changes". Vital constraints: **the cursor must be big** (enlarged to 2~3x real size, still recognizable as an arrow at thumbnail scale),
**every action must get a response** (a click with no reaction is a blown performance — viewers read it as a static image with a fake cursor pasted on),
**one action per narration word** (cursor actions are the voice track's metronome; too dense reads like a demo recording, too sparse like lag).

## Motion Core
- **Cursor**: an arrow of deep ink fill + white outline + soft drop shadow (SVG, 30×45px @960 stage ≈ 2.5x real size),
  `transform-origin: 0% 0%` anchored at the arrow tip — the tip doesn't shift during the press micro-shrink.
  The silhouette uses a **rounded-bézier outline** (sharp tip, straight waist, shoulders and tail heel filleted 0.4~0.9), not a sharp polyline polygon;
  implemented by **stroking the same path twice**: first a white outline layer at `stroke-width: 2.05` (`stroke-linejoin/linecap: round`),
  then a deep-ink `#1d1d1f` solid layer on top, yielding an even white rim (cleaner than adding stroke to a single path — no spike blowouts at sharp angles);
  plus `filter: drop-shadow(0 2px 5px rgba(0,0,0,.28))` to float the cursor above the UI.
  `overflow: visible` must be on — the white outline and shadow need to spill past the viewBox
- **Movement**: x / y interpolated separately with different easings (x `power2.inOut` + y `sine.inOut`);
  the composite trajectory is naturally an arc; 0.3~0.6s per leg (0.5~0.6s across regions, 0.3~0.4s between adjacent targets).
  **Never a straight constant-speed slide** — that's a layer being pushed, not a hand moving
- **Hover**: pause 0.2s on arrival before clicking ("about to click here" must be shown); the target simultaneously shows its hover state —
  row background `#f0f0f0` fades in 0.16s / border deepens, `power2.out`
- **Press**: cursor `scale 1→0.9→1`, 0.09s each way; same frame, target element `scale 1→0.94→1` (rebound leg slightly longer, 1.6×)
- **Press ripple**: a ring bursts out centered on the arrow tip, `scale 0.3→1.6` + `opacity 1→0`, 0.35s
  (expansion `power2.out` / fade `power2.in`) — longer than the press itself, still expanding after the click lands; that's what gives the "click" its confirmation.
  The ring uses the same **dark-core + white-rim** language as the cursor (`1.7px` dark ring + one `1.5px` white `box-shadow` inside and out):
  the ripple frequently expands right over a toggle track that just turned dark, and a plain dark ring would smear into it.
  Layered between the UI and the cursor (`z-index` 29, cursor 30); the ring's center uses negative offsets (`left/top: -15px`, i.e. -radius) to align
  the element's center to the x/y coordinates, so ripple and cursor can share one set of landing coordinates
- **State switches happen at the moment of press-down** (starting at ≈ 0.55×press, the press midpoint), not on release —
  waiting for release creates a one-frame "clicked but nothing happened" lag
- **Three response languages** (pick one per target type, don't mix):
  ① Toggle: knob x slides to the track's other end 0.28s `power2.out` + track background darkens + knob turns white
  ② Button: background/border deepens + press micro-shrink
  ③ Thumbnail placement: from **the cursor's position** as origin, `scale 0.4→1` + fade-in 0.34s `power3.out` (`transform-origin` aligned to the cursor's position inside the drop zone)
- **Drag**: after press-hold, the dragged element shares the cursor's exact movement curve (same start, same duration); dragging is slower than free movement
  (0.62s vs 0.52s — a hand carrying something moves steadier); on release the drag ghost fades 0.12s while the destination pop-in takes over on the same frame
- **Leave means lights-out**: hover highlight retreats 0.2s after the cursor moves away (responses only hold while the cursor rests there, otherwise rows glow all over the screen)
- **Layering (three levels, hard constraint)**: base UI < response highlight layer (hover backgrounds, above the base UI, below the text) < cursor (topmost).
  The instant the cursor gets covered by any element, the "actor" identity is bankrupt

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Cursor size | 30×45px @960 wide (2.5x real) | <20px the landing point is invisible on phones, >50px the arrow eats half the control and covers the state change being read |
| `moveLong` / `moveShort` | 0.52s / 0.34s | Movement time across regions / between adjacent targets; <0.2s reads as teleporting (losing the "hand in motion" causality), >0.8s the narration has already moved on |
| `moveDrag` | 0.62s | Drag movement time; must be > free movement; if equal, the "carrying weight" feel disappears |
| `hoverHold` | 0.22s | Micro-pause between arrival and click; 0 reads as programmatic auto-click, >0.5s viewers think the cursor froze |
| `press` | 0.09s | Press-down duration (release the same); >0.2s looks like a slow-motion keypress, 0 gives no physical sense of "pressing" at all |
| `pressScale` | 0.9 | Cursor press micro-shrink; <0.8 looks like the arrow being sucked into the screen, 1.0 gives zero click feedback |
| `ripple` | 0.35s | Press-ripple expansion time; <0.2s flashes by with no readable "confirmation", >0.6s the ripple lingers into the next action |
| `rippleFrom` / `rippleTo` | 0.3 / 1.6 | Ripple start/end scale (base diameter 30px = cursor width); `rippleTo` >2 the ring outsizes the control and steals focus, <1.2 it never expands — a static dot |
| `hlIn` | 0.16s | Hover highlight fade-in; >0.3s the highlight can't keep up with the cursor (the hand arrives before the color) |
| `toggleSlide` | 0.28s | Toggle knob travel; <0.15s the slide is invisible (reads as an image swap), >0.5s the toggle becomes the lead and steals the scene |
| `popIn` / `popFrom` | 0.34s / 0.4 | Thumbnail placement pop-in; `popFrom` >0.7 too little pop amplitude — can't see it "growing from the cursor", <0.2 looks like exploding from a point |
| Action interval | ≈1s/action | One action per narration word; <0.6s viewers can't register the response, >1.5s the picture waits on the voice — rhythm collapses |

## Known Pitfalls
- Cursor at real system size — a smear on phones; viewers have no idea what was clicked; this card's first rule is "enlarge".
- Straight constant-speed slide to the target — reads as a layer being pushed by a program. x/y must use split easings for an arc + acceleration at both ends.
- Adding jitter noise along the cursor path to fake hand shake — don't (the library's finalized ban on line boil / stop-motion jitter); "hand-like" comes from arcs and easing, not noise.
- Clicking a target with no response, or the response delayed until release — instantly fake; viewers read it as "a fake cursor pasted on a screenshot".
- Hover highlight staying lit forever — rows glowing across the screen; viewers can't tell where the cursor is now.
- Cursor covered by a popped-up card/dialog — layering bankruptcy; the actor hidden behind a prop.
- Press scaling anchored at the cursor's center — the arrow tip shifts with it, losing the precision of "the tip biting the target"; anchor must be `0% 0%`.
- Drawing the cursor as a sharp polyline polygon + thin stroke (a literal copy of the system arrow) — at 2.5x every corner stabs the eye,
  instantly "a system control cut out of a screenshot"; the outline needs rounded béziers and the stroke needs to be around 2px to hold up enlarged.
- Cursor with no shadow — arrow and UI flatten onto one plane; the layering of "actor standing in front of the interface" is gone;
  but don't overdo the shadow (`blur` >8px or `y` >4px starts to look like a floating sticker).
- Ripple as a single dark ring — it smears straight into a toggle track that just turned dark (the collision odds are extremely high,
  since it always expands over the control that just lit up); a dark ring flanked by white on both sides always stays readable.
- Forgetting to include the ripple's SVG/element in the replay reset — the first replay frame keeps last round's fully expanded ring.
- Stacking all three responses in one action (color change + slide + pop-in all at once) — viewers don't know which change to watch; one response language per target.
- Actions packed denser than the voice (a click every 0.3s) — it degrades into sped-up screen recording, decoupled from the narration; the cursor is a metronome and the beat is set by the words.
- Dragged element out of sync with the cursor (each on its own curve) — two things walking separately; the causal "got hold of it" snaps.

## Reuse Guide
- HTML/GSAP: demos/cursor-actor-demo/index.html. To swap UIs edit only the grayscale wireframe structure inside `#stage` (the action sequence targets by selector: `.pref-row` rows / `.tg` toggles / `.thumb.pick` thumbnail / `.slot` drop zone); target points are back-computed at runtime with `P(el, fx, fy)` into stage coordinates (no numbers to edit when changing layouts; `fx/fy` are relative landing points inside the element); rhythm all in the top-level `CONFIG` (`moveLong` / `moveShort` / `moveDrag` / `hoverHold` / `press` / `pressScale` / `ripple` / `rippleFrom` / `rippleTo` / `hlIn` / `toggleSlide` / `popIn` / `popFrom` / `startDelay`); the `moveTo()` / `press()` functions + `CONFIG` are the liftable motion core (`press(at, p)`'s second argument is this press's landing point; the ripple uses it to pin its center to the arrow tip). To swap the cursor shape for a hand/text cursor, edit only the two same-shape paths inside `.ui-cursor` (change the outline and fill layers together, keeping `transform-origin` anchored at the hotspot).
- Remotion port: cursor position `x: interpolate(frame, [t0, t1]*fps, [x0, x1], {easing: Easing.inOut(Easing.quad), extrapolate*: 'clamp'})`, `y` over the same span with `Easing.inOut(Easing.sin)` — two axes with different easings is the arc; press `scale` via `[tp, tp+3, tp+6] → [1, 0.9, 1]`, ripple as a second group from the same start `scale: [tp, tp+11] → [0.3, 1.6]` + `opacity: [tp, tp+11] → [1, 0]` (`Easing.out(Easing.quad)` / `Easing.in(Easing.quad)`), the ring a `borderRadius: '50%'` div with `left/top` set to -radius; toggle knob `translateX: interpolate(frame, [tOn, tOn+8], [0, 20], {easing: Easing.out(Easing.quad)})` with track color via `interpolateColors`; pop-in `scale: interpolate(frame, [tUp, tUp+10], [0.4, 1], {easing: Easing.out(Easing.cubic)})` + `transformOrigin` written as the cursor's percentage coordinates inside the drop zone; during drag, have the dragged element read the same interpolate group as the cursor (differing only by a constant offset). Build the action sequence as an `ACTIONS` array (`{target, at, kind}`) mapped in the component, with frame numbers converted from word-level timestamps.
- Editing-software equivalents: JianYing/CapCut — import an enlarged cursor PNG (background removed) on its own track, keyframe "position" with ease-in/ease-out on both ends; UI responses via two versions of the same screenshot (off/on) hard-cut on the press frame + the toggle knob as a separate layer with position keyframes; AE — cursor layer Position keyframes with spatial interpolation set to "Bezier" and the arc pulled by hand (key: never linear), Scale keyframes for the press, toggle knob Position + Easy Ease, thumbnail pop-in via Scale keyframes with the anchor dragged to the cursor position; never use screen recorders' built-in "enlarge cursor / click highlight" features (size and rhythm uncontrollable, and they ship their own ripple effect).

## Scope
- Belongs to this card: the cursor's movement language (x/y split easings composing an arc, acceleration at both ends, 0.5~0.6s across regions / 0.3~0.4s adjacent, slower when dragging); the 0.2s hover micro-pause on arrival; the press (cursor scale 1→0.9→1 anchored at the tip + target scale 1→0.94→1 + ripple from the tip, scale 0.3→1.6 / opacity 1→0 over 0.35s); the timing discipline that "state switches happen at press-down, not release"; the three response languages (toggle knob slide + track darkening / button color change / thumbnail popping from the cursor at scale 0.4→1) and the "one response language per target" discipline; hover highlight fade-in/out with "leave means lights-out"; the dragged element sharing the cursor's curve; the three-level layering (base UI < response highlight < cursor, cursor always on top); the rhythm contract of "one action per narration word, about 1s/action".
- Does not belong to this card: the demo's fake "generation settings" UI structure and layout (toggle rows/dialog/asset library are all demo context), the grayscale wireframe palette (`#f0f0f0` hover base, `#1d1d1f` toggle track, `#c8c8cd` line color are placeholder values), the sample script and subtitle cuts, the corner-badge host (digital human), the SVG line art inside the thumbnails, and the specific deep-ink arrow shape and colors (hand/text cursors work equally, as long as the hotspot anchor moves with them; the fill is a placeholder value — invert to white on dark).
- Migration interfaces: cursor size scales proportionally with the frame (criterion: still recognizable as an arrow at thumbnail size — roughly 6~8% of the frame's short side); the action sequence = a list of `(target element, landing fx/fy, response type)` with target points back-computed at runtime, so any UI screenshot swaps in with zero coordinate edits; all durations align to the voice — set each action's `at` to that narration word's word-level timestamp (after `hoverHold` comes the word's stress point); response colors adopt the target UI's own hover/active tokens (for dark IDE screenshots switch the hover base to brightening, the toggle track to a highlight color, and the cursor outline from black to white to keep contrast); the pop-in's `transform-origin` must track the cursor's actual position inside the drop zone — never hardcode it.
- Background requirements: white works (the demo's light UI is the most common case). Dark UI screenshots work equally; the one hard requirement is **cursor-to-background contrast must survive** — this card's "deep-ink fill + white outline" holds on both light and dark (the white outline is the survival layer on dark); on dark just soften the `drop-shadow` and, if needed, invert the fill to white with a dark outline layer; same for the ripple (swap the dark-core/white-rim pair). Hover highlighting switches from "darken" to "brighten".
