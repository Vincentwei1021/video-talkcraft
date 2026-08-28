---
name: chapter-progress-list
title: On a dark stage, four chapter rows slide in from the right with a 0.1s stagger; once all have settled, **only the current row** switches to the accent color, a dot pops out on its left, and the whole row steps forward — on the same frame, four cinematic corner frames fade in while closing 10px inward to seal the scene
usage: Section breaks in long narration — "next, part two", "let's start with the first thing"; an opening table of contents for the whole film; "this episode's progress" for multi-episode series; moments when the viewer needs to know "where we are, how many parts remain". Not for short narration with only two sections (a two-row list can't carry a transition)
---

## Intent
The biggest drop-off point in long narration isn't weak content — it's **viewers not knowing where they are**. At minute 7 you're still on part two,
but they think you're already halfway done — so they leave. The library already has `chapter-title-card` (a single act-title card slammed on),
which solves "a new act has begun" — but it **gives no coordinates**: the viewer can't see how many sections came before or how many remain.

This card supplies exactly those coordinates: **lay out the whole table of contents, then point — "you are here"**. In one glance the viewer gets three pieces of information —
the film has four sections, we're on the second, two remain. Only together do these three make "progress"; drop any one and it degrades into a title card.

Three critical rules: ① **Exactly one row is highlighted**. Two highlights and there is no "current" — it reads as "these two sections matter more";
② **Inactive rows are distinguished by a dim solid color, never stacked opacity** (design-language §1 red line). On a dark background, `#a1a1a6` against `#1d1d1f`
is already at safe contrast; stack another 0.5 opacity and it drops straight out of the readable range — those rows mean "not yet covered / already covered", not "hard to see";
③ **Highlight only after all four rows have settled**. Coloring the second row red mid-slide reads as "the second row flying faster than the others";
the two beats "settle — then call the name" are what make it "pointing at where you are".

## Motion Core
- **Layering**: dark stage base (`#1d1d1f`) → subject layer (left column) → chapter list (right side, vertically centered) → four corner frames (topmost)
- **① List entrance**: four rows `x +24 → 0` + `opacity 0 → 1`, each `0.24s power3.out`, **staggered 0.10s**.
  The header (CHAPTER) fades in on its own 0.06s early over 0.22s — it is a label, not a list item, and does not join the stagger sequence
- **② Highlight (after all rows settle + a 0.06s breath)**, three properties on the same frame, all 0.20s:
  - Number and title `color: #a1a1a6 → #e0452c` (`power2.out`)
  - Left dot `scale 0 → 1` (`back.out(2)` — the only element allowed to overshoot; it is the "landing point")
  - Whole row `x 0 → +6px` (`power3.out`): "stepping out of line" within the list
- **③ Four corner frames**: starting **on the same frame** as the highlight, `x/y` closing from ±10px outside to 0 + `opacity 0 → 1`, `0.30s power2.out`.
  Slower than the highlight (0.30 vs 0.20) and fainter — it is the **backdrop**; let it grab attention and the shot falls apart
- **④ hold 2.0s**: four chapters + one current position; the viewer needs three passes to extract "progress"
- **The inactive state is a terminal state**: solid `#a1a1a6`. `opacity` appears only during the 0.24s entrance, returning to 1 on settle;
  in the resting state nothing carries stacked transparency

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `rowStagger` | 0.10s | Row stagger, this card's "one-strand feel" knob; >0.2s reads as four independent effects (the viewer starts counting), <0.05s reads as one block fading in (losing the "listed one by one" semantics) |
| `rowIn` | 0.24s | Per-row slide-in time; >0.4s the four rows total 1.6s and the transition drags; <0.15s the row-by-row sequencing can't be seen |
| `rowShift` | 24px | Entry displacement from the right; 0 leaves only a fade (losing the "pushed in from the side" direction), >60px reads as horizontal fly-in (upstaging the highlight beat) |
| `hlDelay` | 0.06s | **Critical rule**: the breath between "all settled" and "highlight"; at 0 it reads as "the last row is special", >0.3s the two beats disconnect and the viewer assumes the effect already ended |
| `hlAdvance` | 6px | The current row's extra step forward; 0 loses the bodily sense of "stepping out", >16px reads as the row being yanked out of the list (alignment breaks) |
| `cornerInset` | 10px | Distance the corner frames close inward; 0 leaves only a fade (no "closing in to seal the scene"), >24px reads as four corners flying (a backdrop moving more than the subject steals the scene) |
| `cornerDur` | 0.30s | Corner-frame duration, **must exceed `hlDur` 0.20s** — backdrop slower than subject is hierarchy discipline |
| Chapter count | 3–5 rows | 2 rows can't carry "progress" (use `chapter-title-card`); >6 reads as a menu, not a chapter table, and compressed line heights smear the dim rows together |
| `hold` | 2.0s | End dwell; <1.2s the viewer only reads the highlighted row and never receives "how many parts remain" |

## Known Pitfalls
- Dimming inactive rows by stacking `opacity: 0.45` — on a dark background `#a1a1a6` with stacked transparency drops to just over 2:1 contrast;
  the viewer can't read what those rows say, and "the film has four sections" fails outright (design-language §1 red line).
- Two or more highlights — "current" derives from uniqueness; highlight two and it reads as "these two sections matter", zeroing the progress semantics.
- Highlighting during the slide-in — reads as "the second row runs faster than the others", not "calling out the second row".
- The dot bouncing with `elastic` or `back.out(4)` — it is a 10px-diameter dot; heavy overshoot at that size only reads as jitter.
- Corner frames drawn as four complete edges — that is a "viewfinder/picture frame", a different language; cinematic corners draw only the four L shapes.
- Corner frames faster and brighter than the highlight — the backdrop upstages the subject, two accents on one screen, and the transition reads as visual noise.
- Doing this card on a white background — the semantics of a chapter transition is "an interlude blackout"; on white, four list rows read as "a table of contents on a page",
  losing exactly the "this is a cut point" transition quality (this card is the library's only list card that breaks the white-background default for this reason — see "Scope").
- Copying the light-background `#8a8a8a` as the dim on dark — dark-mode ink-muted is `#a1a1a6`; `#8a8a8a` on `#1d1d1f`
  gives barely over 3:1, and inactive rows sink into the background.
- Replay resetting only transforms and not `color` — the highlight is a "property change"; the previous round's red lingers on the second row,
  so on the second play it starts out red and both beats of "settle — call the name" are lost.

## Reuse Guide
- HTML/GSAP: demos/chapter-progress-list/index.html. **To change content, edit the `.ch-row` copy**;
  for the current chapter, move the `current` class to the matching row (the dot `<span class="ch-dot">` moves with it). All rhythm lives in `CONFIG`:
  `rowStagger` tunes the "one-strand feel", `hlDelay` tunes the breath between the two beats, `hold` scales with row count (about 0.5s per row).
  Changing the accent color edits only `CONFIG.accent` and `.ch-dot`'s `background`, two places.
  Corner-frame arm length is in `.cine-corner`'s `width/height` (42px @540h ≈ 7.8%; scale proportionally when resizing).
- Remotion port: one `<Sequence>` holds the list; row i gets `from={Math.round(i*0.10*fps)}`,
  with in-row `interpolate` driving `translateX` and `opacity` (`Easing.out(Easing.cubic)`).
  The highlight beat gets its own `Sequence from={hlFrame}`, using `interpolateColors(frame, [hlFrame, hlFrame+6], [dim, accent])`
  for the color change (**not CSS transitions** — unreproducible under frame driving); the dot uses `spring({damping: 12, stiffness: 200})`.
  The four corners share one `interpolate` producing the `inset` value, each multiplied by ±1 for direction.
- Editing-software equivalents: Jianying/CapCut — four text layers with "position + opacity" keyframes, each dragged 3 frames (0.1s) later;
  the highlighted row **must be duplicated into two layers** (one gray, one red) hard-cut at the highlight point — Jianying cannot tween text color;
  the dot is a circular sticker with scale keyframes. AE — make the list one precomp,
  `Animate → Position + Opacity` + a `Range Selector` with `Offset` running −100%→0% (`Ease High` maxed),
  the highlighted row a separate layer with a `Fill` effect keyframing Color twice; four corner layers with `Position` keyframes parented to a Null.
- Division of labor with sibling cards in this library: `chapter-title-card` = one act title slammed on (transition quality, no coordinates);
  **this card = a chapter transition that gives coordinates** (table of contents + "you are here"); `numbered-step-stack` = checklist stacking (for procedures —
  four parallel actions, no concept of "current"); `step-timeline-vertical` = timeline progression (with sequential dependencies).
  The three list cards divide as: this card answers "where are we", `numbered-step-stack` answers "which things to do",
  `step-timeline-vertical` answers "in what order".

## Scope
- Belongs to this card: the timing of four rows' `x +24 → 0` + `opacity` staggered slide-in (`0.10s` stagger / `0.24s power3.out` per row); the discipline of **inactive rows using dim solid color with zero transparency at rest**; the beat order of "all settled + 0.06s breath → only then highlight"; the highlight's three same-frame properties (color change + dot `back.out(2)` pop + the row's `x +6px`); **highlight uniqueness** (exactly one row); the subject/backdrop hierarchy of the four corner frames sharing the highlight's frame but slower and fainter (`0.30s` vs `0.20s`); the `hold 2.0s` letting "how many parts remain" actually be read.
- Does not belong to this card: the demo's four specific chapter names and the "CHAPTER" header text, the `#e0452c` accent (drawn from reference image ①'s warm family — any accent works), the 23px/15px font sizes and 600 weight, the list landing on the right, the left column's digital-human placeholder, the corner frames' 42px arm length and 2px stroke, the row height and `gap`.
- Migration interface: three color tokens — `CONFIG.accent` (accent color), `CONFIG.dim` (inactive-row solid — `#7a7a7a` on light, `#a1a1a6` on dark), and the background; the size bases `rowShift 24px` and `cornerInset 10px` scale with stage width (double at 960 ⇒ 1920); duration scaling rules — `rowStagger` is a **feel constant, don't touch it**, `hold` scales with chapter count (about 0.5s per row); for vertical video center the list full-screen and cut to 3–4 rows (portrait row width is fine but screen height gets eaten by UI).
- Background requirements: **requires the dark background `#1d1d1f` (this card is the group's only exception)**. Reason: this card's semantics is not "a table of contents on a page" but **a chapter transition**, and in video a transition reads as "an interlude blackout" — the frame darkens, the contents float up, the current position gets pointed at, then we return to content. The same motion on white would only read as "a list appeared on screen", missing exactly the "this is a cut point" layer (design-language §4 states plainly that "background alternation is chapter feel" — the light ↔ dark switch is itself the divider). The dark background is also the precondition for list readability: four dim rows on a dark stage are "lamps not yet lit"; on white they are "text that didn't print clearly". In dark mode swap the companion values: `ink` to `#f5f5f7`, `ink-muted` to `#a1a1a6`, corner frames to solid `#d2d2d7` (**no blur/glow** — glow is a different language).
