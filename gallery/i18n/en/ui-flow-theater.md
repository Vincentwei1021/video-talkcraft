---
name: ui-flow-theater
title: An entire grayscale mock settings panel performs a complete flow on its own against one STEPS schedule — cursor navigation (waypoint arcs + press ripples) and control state changes (switch sliding, segment switching, slider dragging, button turning to success) share the same batch of at constants and fire on the same beats, closed by a success toast sliding in: not "pasting a screen recording", but the interface acting out a script for you
usage: Narration segments walking through "how this product/feature is used" end to end — "go into settings, turn this on, switch the theme to dark, pull volume to 70%, save"; tool reviews, SaaS/AI product explainers, tutorials and onboarding narration; the only non-fake option when a real screen recording is unavailable (product unlaunched / needs redaction / flow too long)
---

## Intent
When narration explains "how this product is used", there are three common routes: screen recording (the 12px cursor is invisible, the rhythm is set by hand speed, and redaction kills it),
hard-cut screenshots (losing the causality of "this step caused that one"), or animating each control individually (each control on its own timeline —
by the third one the beats no longer line up). UI flow theater is the fourth route: **treat the entire interface as one actor and hand it a script**.
The script is a `STEPS` table, one row per beat; the cursor reads it to decide when to travel where and when to press,
and the controls read **the same `at` in the same table** to decide when to change state. What viewers see is "the hand clicks → this control changes on the spot →
the hand moves to the next one" — an unbroken causal chain — while the maker maintains a single table.
Vital points: **time enters from one place only** (`at` is the sole time source; cursor and controls are both functions of it, aligned by shared constants, never by counting in two places),
**coordinates are named constants** (control landing points are back-computed at runtime into `POS.xxx`; cursor waypoints reference only the names — layout changes require no number edits),
**one control, one response** (each control gets one response function with no time parameters inside).
These three are not code style; they are the entire reason this card can scale past 4 beats without falling apart.

## Motion Core
- **The STEPS schedule (this card's skeleton)**: `[{ at, target, act, move, until }]` —
  `at` is the moment this beat **presses down**, `target` points to a named coordinate in `POS` and a response function in `RESPOND`,
  `act` is `click` / `drag`, and `until` exists only on drag beats (the release moment).
  The demo's four beats: 2.10 switch → 3.10 segment → 4.05~4.95 slider → 5.90 save. **~1s per beat** (one short spoken phrase per beat)
- **Named coordinate constants (must copy)**: control landing points are back-computed once via `P(el, fx, fy)` before building the timeline, stored as
  `POS = { sw, seg, sld, sldEnd, save }`; cursor waypoints, ripple centers, and drag endpoints all reference these names.
  **No coordinate number ever appears a second time in the source** — the remocn side uses hand-computed constants like `SWITCH_CX = RIGHT_X + SWITCH_W/2`;
  the HTML side's `getBoundingClientRect` back-computation is steadier (aspect/layout/font-size changes require no number edits)
- **Entrance (establish the whole view first, then act)**: the whole card `blur 9→0` + fade-in 0.6s `power2.out`, then the card's blocks
  **stagger one every 0.2s**, each `blur 5→0` + `y 8→0` over 0.53s. Blocks = title / switch row / segment row / slider row / button row.
  The cursor sets off only after all blocks have settled — **acting while the interface is still entering makes viewers read two animations stacked together**
- **Cursor navigation**: the same movement language as `cursor-actor-demo◆` — x `power2.inOut` + y `sine.inOut`
  interpolated separately to compose an arc; 0.62s across regions / 0.40s between adjacent controls; on arrival it pauses `hoverHold` 0.2s before pressing.
  **Movement end times are back-derived from `at`** (`start = at - hoverHold - dur`) — so changing one beat's `at`
  shifts movement, hover, press, and state change together as a unit, with no individual edits
- **Press**: cursor `scale 1→0.9→1`, 0.09s each way (anchored `transform-origin: 0% 0%` at the arrow tip) +
  a ripple radiating from the arrow tip (`scale 0.3→1.6` / `opacity 1→0`, 0.35s).
  **The state change happens at the press midpoint** (`at + press*0.55`), not waiting for release
- **Drag-beat special discipline**: `hold()` presses down without rebounding (held down); the rebound comes only on release;
  **the dragged control's value must use the same easing as the cursor's x** (both `power2.inOut`) —
  with mismatched easing, the arrow tip drifts off the handle mid-drag and "grabbed it" collapses on the spot
- **Four control responses (one per control — don't mix)**:
  ① Switch: knob `x 0→20px` 0.27s `power2.out` + track darkening + knob turning white
  ② Segmented control: indicator `x` slides one cell (`x = the indicator's own width`, **moving only x, never width**) + both labels recoloring on the same beat
  ③ Slider: on press the handle gets `scale 1.12` + a darker outline; the value tracks the hand through the drag segment —
     fill width / handle position / percentage readout **share one proxy value** (written together in `onUpdate`)
  ④ Button: press micro-shrink → base turning the semantic color + **label and checkmark cross-fading** (the label stays in normal flow holding the width,
     the checkmark absolutely positioned on top, both driving only opacity) — the button frame never jumps
- **State-change duration unified library-wide at 0.27s `power2.out`** (the press state gets half) — one number for all four controls
  is what makes the interface read as "one system"; giving each control its own duration reads as four little animations glued together
- **Success toast close**: starting 0.33s after the final press, `y 16→0` + `scale 0.97→1` + fade-in 0.47s `power3.out`
  (`transform-origin: bottom center`), holding 1.8s then retreating over 0.47s. **It is the card's only semantic color** (shared with the save button's beat)
- **Layering**: base UI < control state layer < toast (z 20) < ripple (z 29) < cursor (z 30). The cursor is always topmost

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `STEPS[].at` | 2.10 / 3.10 / 4.05 / 5.90 | Each beat's press moment, the card's sole time source; one short spoken phrase per beat — gaps <0.6s degrade into a sped-up recording, >1.5s the frame waits for the voice |
| `cardIn` / `cardBlur` | 0.60s / 9px | Whole-card reveal; `cardBlur` >14px the reveal moment looks like frosted glass, <5px the "reveal" isn't visible (reads as an ordinary fade-in) |
| `blkStep` | 0.20s | Block stagger step; 0 slams all five blocks on one frame (instantly a pasted image), >0.35s viewers wait for the panel to finish growing |
| `blkIn` / `blkBlur` / `blkLift` | 0.53s / 5px / 8px | Single-block reveal; `blkLift` >16px every row is flying, upstaging the operation act to come |
| `moveLong` / `moveShort` | 0.62s / 0.40s | Cross-region / adjacent-control movement; <0.25s reads as teleporting, >0.9s the narration is already on the next line |
| `hoverHold` | 0.20s | Micro-pause between arrival and press; 0 reads as programmatic auto-clicking, >0.5s the cursor looks stuck |
| `press` / `pressScale` | 0.09s / 0.9 | Press duration (release matches) / micro-shrink factor; `pressScale` <0.8 the arrow looks sucked into the screen |
| `ripple` / `rippleFrom` / `rippleTo` | 0.35s / 0.3 / 1.6 | Ripple spread; `rippleTo` >2 the ring outsizes the control and steals the scene |
| `swap` | 0.27s | **All controls' state-change duration** (the single number); <0.15s the state change is illegible, >0.45s controls become the protagonist |
| `dragEase` | `power2.inOut` | Drag-segment easing, **must match the cursor x's easing**; if mismatched the handle detaches from the arrow tip |
| Drag length (`until - at`) | 0.90s | Drag travel duration; <0.4s the "being dragged" is invisible (reads as an image swap), >1.4s viewers lose patience |
| `sldFrom` / `sldTo` | 28% / 76% | Slider start/end values; travel <25% the drag isn't visible; starting at 0 or ending at 100 reads like "maxing/zeroing" — a different event |
| `toastIn` / `toastHold` / `toastOut` | 0.47s / 1.8s / 0.47s | The toast's three phases; `toastHold` <1s viewers can't finish reading, >3s the frame goes dead |
| `toastLift` | 16px | Toast slide-in displacement; >28px it looks flown in from off-screen (upstaging the closing of the click just made) |

## Known Pitfalls
- One timeline for the cursor and one per control, aligned by counting time by hand — by the third beat they will drift, and any beat edit touches two places.
  This card's entire architectural value is "sharing the same batch of `at`s"; dual time sources are the most common death of this kind of card.
- Control coordinates written once in cursor waypoints and again in CSS — change the layout, miss one, and the cursor clicks on thin air. They must be back-computed at runtime into named constants.
- The cursor setting off while the interface is still entering (blocks still staggering in) — two animations stacked; viewers don't know whether to watch the entrance or the operation.
- Four controls each with their own state-change duration — reads as a platter of four independent little animations; the interface stops feeling like "one system". One `swap` for the whole card.
- Handle and cursor with different easings during drag (one `power1`, one `power2`) — mid-drag the arrow tip floats off the handle and "grabbed it" collapses on the spot.
- The drag's press done as "down and rebound" — that's a click, not a hold; a hold presses down only, rebounding only on release.
- The slider's percentage readout refreshing only after the drag — viewers read "an image was pasted, then a number swapped"; fill / handle / readout must share one proxy value.
- The segmented indicator implemented by changing width or `left` — per-frame reflow drags the labels into jitter; move only `transform: x`.
- The button's success state swapping copy without a cross-fade (direct innerText change) — the button's width jumps on the spot; the beat that should be steadiest, the close, is shaking.
  The label must stay in normal flow holding the width, the checkmark absolutely positioned on top, both driving only opacity.
- Semantic color on multiple controls (switch red, segment red, button red too) — three focal points on one screen equals none.
  The whole card colors only the "save succeeded" beat (button base + toast icon).
- The toast sliding in on the same frame as the final click — reads as "the click comes with a popup effect"; a ~0.3s gap is what gives "the system responds to you" its causality.
- Adding skeuomorphic texture to the mock UI (gradient buttons / inner shadows / glass / stacked shadows) — the interface becomes the protagonist and steals the narration; grayscale wireframe suffices.
- Clicking two controls within one beat (flipping both switches while you're at it) — viewers can't register which one changed; one control per beat.
- The cursor covered by the toast — layering bankruptcy (toast z 20 must stay below ripple 29 and cursor 30).
- Forgetting to include control states in the replay reset — on replay's first frame the switch is still on, the slider still at 76%, the button still in its success state.

## Scope
- Belongs to this card: the STEPS-schedule architectural discipline (`at` as the sole time source, cursor and controls reading the same number, movement starts back-derived from `at`, one time-parameter-free response function per control); the practice of back-computing control coordinates at runtime into named constants; the two-stage entrance (whole card blur 0.6s → blocks staggering 0.53s blur-in every 0.2s, cursor departing only after all settle); the cursor movement language (x/y split easings composing an arc, 0.62s cross-region / 0.40s adjacent, 0.2s arrival hover, 0.09s press anchored at the arrow tip + 0.35s ripple, state change at the press midpoint without waiting for release); the drag-beat discipline (down-only until release, the dragged control sharing the cursor's easing and duration); the four control response languages (switch knob + track darkening / segment indicator moving only x + labels recoloring on the beat / slider fill-handle-readout sharing one proxy value / button label↔checkmark cross-fade without frame jump) and "one 0.27s state-change duration for the whole card"; the success toast's three phases (slide-in 0.47s + hold 1.8s + retreat 0.47s, starting 0.33s after the final press); semantic color only on the closing beat; the five-tier layering (base UI < control state < toast < ripple < cursor).
- Does not belong to this card: the demo's "output settings" mock panel structure and copy (title / three settings rows / cancel & save buttons / toast copy — all demo context), the grayscale wireframe values (`#e0e0e0` card border / `#c8c8cd` control outline / `#1d1d1f` switch track & indicator / `#ececef` slider track — all placeholders), the specific semantic color `#d8383a`, the controls' specific dimensions (switch 46×26 / segment 220×34 / slider track 168 / button 36 high), the specific "switch + segment + slider + button" control combination (form filling, multi-step wizards, dropdown filters, chat input all work equally), the corner host (unused in this card), the dark-ink arrow cursor design (same as cursor-actor-demo; the shape belongs to that card).
- **Boundary with `cursor-actor-demo◆` (important)**: that card is **the cursor's single-action grammar** — how one cursor moves, hovers, presses, drags, one action per spoken word; it's about "how the cursor-actor itself performs", and in its demo the control responses exist only to prove "clicking has an effect". This card is **the architecture of an entire interface performing in concert against a script** — the cursor is demoted to one consumer of the schedule, and the real content is the timing architecture of "one table simultaneously driving the cursor and all controls" (`at` sharing, named coordinate constants, response-function decomposition). Card selection: showing one or two actions ("just click here") → cursor-actor-demo; performing a full flow (three-plus beats, multiple controls, a closing receipt) → this card. The two cards' cursor implementation is the same code — **when upgrading the cursor design, update both in sync**.
- Migration interface: the `STEPS` table is the only migration entry point — swap all `at`s for the actual speech's word-level timestamps and `target`s for the target UI's control names; a new control = one back-computed coordinate added to `POS` + one response function added to `RESPOND` (the function never touches time); scale sizes proportionally with the frame (cursor ≈ 6~8% of the frame's short side; control sizes follow the UI screenshot); swap the semantic color for the target product's own primary/success token (button base + toast icon, both together); for pacing changes, re-lay the whole table's `at`s while **keeping each action duration (`moveLong`/`hoverHold`/`press`/`swap`/`toastIn`) fixed** — these are feel constants; scaling them with speech rate smears the operations at fast pace.
- Background requirements: plain white is fine (a light settings panel is the most common case). Dark UI works equally, with two hard requirements: **the cursor's contrast against the base must hold** (dark ink solid + white outline works on both bases; on dark, soften the `drop-shadow`), and **each control's on/off contrast must hold** (switch track goes "dark→highlight" instead of "white→dark", slider fill brightens, segment indicator becomes a bright block + dark text). The toast changes from a white card to a dark card slightly brighter than the background + the same semantic-colored icon.

## Reuse Guide
- HTML/GSAP: demos/ui-flow-theater/index.html. **To change the flow, edit only `STEPS`** (one row per beat: `at` timestamp + `target` control name + `act` action + `until` on drag beats); to change the interface, edit the `.panel` structure inside `#stage`, then update two places and only two — the `P(el, fx, fy)` back-computations in `POS`, and the corresponding response functions in `RESPOND` (the response signature is `(t, step)` where `t` is the "change now" moment; no other time number is allowed inside the function); rhythm parameters all live in `CONFIG`. The extractable core is four blocks: `CONFIG` + the three cursor primitives `moveTo/press/hold` + the `POS` back-computation + the `RESPOND` table; the final `STEPS.forEach` walk is the entirety of the stitching code (under 20 lines). Note `.blk` reveals via `filter: blur()` — **after the entrance, GSAP leaves `filter` as `blur(0px)`** — so if you later add `will-change` to blocks, put it only on containers with text (putting it on the whole card layer makes 1px borders pulse between sharp and blurry).
- Remotion port: the remocn source is this card's prototype — read `registry/remocn-ui/settings-toggle-flow/index.tsx` (this card's primary source), `checkout-flow/index.tsx` (a payment flow on the same architecture), `ai-prompt-flow/index.tsx` (an AI-generation flow on the same architecture); the architecture notes are in `content/docs/ui/concepts.mdx` and `registry/remocn-ui/STYLE-GUIDE.md`. Its equivalences: `STEPS` → one `use<Name>Transition([{at, state, duration}])` hook per control; cursor → `useCursorPath([{at, x, y, duration, click, press, easing}])`; **both sides write the same constant expression for `at`** (in the source, `{at: 24 + DEMO}` appears in both `useCursorPath` and `useSwitchTransition`; `DEMO` is a global offset — this is "shared at" in frame-driven form); coordinates → a batch of named constants at the top (`SWITCH_CX = RIGHT_X + SWITCH_W / 2`); control bodies → pure functions `(state, theme) => view` that **never read the frame** — the frame is read once, in the caller's hook. This library's second→frame conversion: ×30 (`swap` 0.27s = 8 frames, `hoverHold` 0.2s = 6 frames, `toastIn` 0.47s = 14 frames, whole-card reveal 0.6s = 18 frames, block stagger 0.2s = 6 frames). Without the remocn hooks, hand-roll `interpolate(frame, [at*fps, (at+swap)*fps], [from, to], {easing: Easing.out(Easing.quad), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})`, with cursor x/y on `Easing.inOut(Easing.quad)` and `Easing.inOut(Easing.sin)` respectively.
- Editing-software equivalents: Jianying/CapCut — split the interface into "base image + two state images per control (off/on)", the base on one permanent track, each control on two stacked tracks hard-cut on that beat's press frame (lower off, upper on; keyframe the upper layer's opacity 0→100 within two frames, no long cross-fades); the cursor is an enlarged PNG on its own track with position keyframes and "ease in/ease out" at both ends; the slider fill is a color block + mask position keyframes with the handle on its own layer over the same range and same easing (both layers must pick the same easing); the toast is a card PNG with position + opacity keyframes. AE — one precomp per control, state switches via Time Remap or two layers' Opacity flipping on the same frame; cursor Position keyframes with spatial interpolation set to Bezier and the arc pulled by hand; **all keyframe timecodes come from one marker table** (lay markers on the timeline against the speech first, then snap every layer's keyframes to the markers — the AE equivalent of "shared at"). Any software's "UI demo template / mouse-click effect preset" is off-limits (uncontrollable rhythm, built-in glow ripples and skeuomorphic texture).
