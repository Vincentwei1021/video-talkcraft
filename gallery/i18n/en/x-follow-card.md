---
name: x-follow-card
title: An X profile card springs in as a whole (0.62s with a micro-overshoot), then its ten content layers blur-in and settle in reading order staggered 0.07s apart; a cursor arcs in and clicks "Follow", and three things happen on the same frame — the button's two states cross-flip + a capsule ripple + the follower count ticker-tapes up by one
usage: Narration introducing a person or account — a guest's entrance, "you should follow this person", crediting a source when quoting someone, recommending a peer/author; the same card appears at most once per video
---

## Intent
When the narration says "you should check out what this person makes", the viewer's inner question is "who are they, and on what authority?".
One profile card answers both at once: avatar, name, verification, a one-line bio, location/site/join date, and the **follower count**.
This card's value is not "pasting a card" but **the card acting out being followed** — the cursor walks over and clicks "Follow",
the button flips to "Following", and the follower count ticks up on the spot. That turns a static profile into social proof: it's not you praising them — "someone is following them right now".

Three vital points. **First: shell and content in two beats**: the card springs into place as a whole first, and the ten content layers land **afterwards**, one by one.
All ten lighting at once = an image fading in — just a paste; shell in place first, content landing after, is what lets the viewer's eyes sweep in reading order.
**Second: the cursor must travel over** (a discipline shared with [subscribe-cta](subscribe-cta.md)): a teleport-click reads as "the state changed by itself",
not "someone followed them". **Third: three things on the same frame at the click**: the button's two-state cross + the ripple + the follower count +1.
The first two say "the press landed"; the third is where the social proof actually lands — without the count changing, this click affected one button and no fact at all.

**Product skin = the content itself (user verdict, 2026-08-25)**: this card involves a real product interface, so it **fully reproduces X's styling**,
with no neutralization — the dark card `#16181c`, brand blue `#1d9bf0` for the cover gradient / verification badge / follow button / tab indicator,
and the X mark at top right, all copied verbatim from the source's `THEMES.dark` + `accentColor`. The reason: viewers must recognize at a glance "this is someone on X" —
grayscaled, the card belongs to nobody, and the "social proof" meaning breaks with it — **platform identity is part of this card's information**.
What's editable is the **content** (name / handle / bio / location / site / counts / sample-post copy); the look does not move.
The avatar stays a grayscale placeholder circle — that is X's own default avatar style (with no real avatar asset, that's exactly what it looks like).

## Motion Core
- **Whole-card spring-in, 0.62s**: `y 46→0` + `scale 0.9→1`, the micro-overshoot of `back.out(1.35)` (source: `spring(damping 12 / stiffness 120 / mass 0.8)`, underdamped at ζ≈0.6).
  **The fade-in is an independent time window** (0.05→0.35s) — displacement moves first, opacity follows: the remocn-family entrance idiom
- `transform-origin: 50% 0%` (card top): the card "hangs down" from its top edge as it springs in; scaling around center makes the whole card grow in both directions at once — that's a popup, not a card settling
- **Ten-layer staggered blur-in**: each layer `blur 8px → 0` + `opacity 0 → 1` + `y 8 → 0`, 0.24s per layer, 0.07s layer spacing (the source's nine groups differ by 2 frames ≈ 0.067s).
  All three properties moving together is what makes it a "blur-in": opacity alone is an ordinary stagger; adding blur gives the "snapping into focus" settle
- **Layer order follows reading order**: cover → avatar → name → @handle → bio → meta row → counts → tabs → sample post → **button row last**.
  The interaction target lands last so the cursor has something to click (the source puts the button in group 7; this card moves it to the final group)
- **Rest until 1.55s**: content finishes at 1.21s, then 0.34s in which nothing happens — headroom for the narration to introduce the person. The card is in place but nobody has touched it yet
- **Cursor arcs in over 0.95s** (source: 32 frames ≈ 1.07s): x on `power2.inOut`, y on `sine.inOut`, **the speed mismatch composing the arc**;
  entering from outside the stage's bottom right (1000, 470); `transform-origin: 0% 0%` anchored at the arrow tip, so the press micro-shrink never shifts the tip
- **The landing point must be measured at the button's "final-state" position** (a bug fixed 2026-08-25: the cursor missed the Follow button). Two disciplines:
  ① Before measuring, run `gsap.set(card, {clearProps: "transform"})` — measuring after the replay initial state (`y:46 / scale:0.9`) has been applied
  captures the button's position while the card is still mid-air and shrunk to 0.9; by the time the cursor arrives 2.5s later, the card has long settled at `y:0 / scale:1`
  and the button has risen ~46px ⇒ on the click frame the cursor presses empty space below the button.
  ② Subtract **the arrow tip's offset within the SVG** (the tip sits at `(1,1)` in the `viewBox 14×21`, rendered 30×45 ⇒ offset `(2.1, 2.1)`) —
  `x/y` set the element's top-left corner; without subtracting, you're aiming the "cursor bounding box's top-left" at the button's center, and visually the tip sits off toward the button's bottom right.
  Acceptance is **screenshotting the click frame** (`node scripts/shot-at.mjs x-follow-card 2.58`) and eyeballing the tip on the button
- **The click frame's feedback chain** (starting on the same frame; any missing link makes it fake): cursor `scale → 0.9` for a beat (0.09s) + button pressed to 0.9 (0.08s `power2.in`) + two-state cross + ripple + count roll, then the button rebounds `back.out(3)` over 0.22s
- **The two-state cross is not a copy swap**: two layers stacked inside the same 116×40 box (the `w/h` of the source's `BUTTON_LAYOUT.horizontal`) — the "Follow" layer `opacity 1→0` + `scale 1→0.92` (retreating while shrinking), the "Following" layer `opacity 0→1` + `scale 0.86→1` with `back.out(1.7)` (advancing while growing).
  Directly changing `textContent` reads as "the words changed"; the cross is what reads as "the button changed state"
- **Follower count +1 via ticker-tape push-up**: a window `overflow: hidden` exposing one line-height (20px), containing a two-cell tape moving `y 0 → −20px` (`power3.out` 0.42s) — the old value exits the top edge, the new value enters from the bottom.
  **The tape moves, not the window** (moving the window drags the whole text row along). Swapping the number outright reads as "the data refreshed"; rolling reads as "this number grew"
- **Capsule-shaped ripple**: `inset −6`, `border-radius 999`, `scale 0.92 → 1.3` + `opacity 0.55 → 0`, 0.5s `power2.out`.
  The `fromTo` must carry `immediateRender: false` — by default the from-state flushes at build time, and the ripple hangs on the button's rim "before it's been clicked"
- **The cursor leaves when done**: sliding off toward bottom right and fading over 0.45s. A resident cursor keeps drawing attention
- Layering: white stage → card (dark card + floating shadow) → button row (absolutely positioned, hugging the cover's lower edge, on the avatar's baseline) → cursor (z-index 20)
- The card is written 1:1 at the source's 600px reference width, then fit into the 960×540 stage by a whole-`.scaler` `scale(0.885)` —
  equivalent to the source's `stageScale = min(w/refW, h/refH)`. **The benefit: every style value copies from the source with no conversion** (changing the frame changes only this one scale number)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `cardIn` | 0.62s | Card spring-in. <0.35s reads as a hard pop (no "settling" weight); >0.9s viewers wait for the entrance |
| `back.out` overshoot | 1.35 | The spring-in's micro-overshoot. =0 is just a scaled appearance (the card has no weight); >2.2 looks cheap, the card looks like it bounced up |
| `layerStagger` | 0.07s | Ten-layer stagger interval. =0 degrades into "an image fading in" (the easiest thing to break on this card); >0.14s the layout takes 1.4s to fill — viewers start reading item by item instead of listening |
| `layerBlur` | 8px | Entrance blur start. <4px "snapping into focus" isn't visible; >16px every layer entering blurs, ten layers chained look like the frame shaking |
| `layerDur` | 0.24s | Per-layer blur-in duration. <0.15s reads as a hard flash; >0.4s overlaps the next layer too much and the stagger smears |
| `cursorStart` | 1.55s | Cursor start (= content filled + 0.34s). That 0.34s is the narration's room to introduce the person; <0.1s someone comes clicking before the content has landed, >1.2s the card sits waiting |
| `cursorMove` | 0.95s | Cursor arc-in. <0.4s approaches teleporting, and the evidence of "someone is clicking" disappears; >1.4s viewers start waiting for it |
| `clickDip` | 0.9 | Click press-down. >0.96 the press isn't visible; <0.85 the button looks squashed |
| `flipDur` | 0.34s | Two-state cross. <0.18s reads as a hard icon swap; >0.6s the button melts slowly and viewers stare at it instead of listening |
| `rollDur` | 0.42s | Follower-count tape push-up. <0.2s reads as a number flicker; >0.7s one number rolling that long pulls all attention away |
| Count increment | one legible digit | 124K → 125K. **The change must be readable to the naked eye** — in `128,431 → 128,432` viewers can't see that digit; it's as if it never rolled |
| bio length | 20~32 characters | Two lines max per card; >40 characters viewers switch to "reading the card" mode and your narration becomes background audio |
| Occurrences | 1 per video | The same card twice = viewers skip it the second time; a new card only for a new person |
| On-screen time | 3~5s | >8s becomes visual litter blocking content; <2.5s it's gone before viewers finish reading the name |

## Known Pitfalls
- **All ten layers lighting at once** — degrades into "an image fading in"; this card's most valuable beat (content landing layer by layer) is wasted. Shell first, content after — two beats.
- **Blur-in doing only opacity, no blur** — that's an ordinary stagger; the "snapping into focus" settle is gone. All three properties (blur / opacity / y) must move together.
- **Measuring the button position after the replay initial state is applied** (the bug actually fixed 2026-08-25) — you capture coordinates while the card is mid-air and shrunk to 0.9;
  by the time the cursor arrives the card has settled and the button has risen ~46px ⇒ on the click frame the cursor presses empty space below the button, and "someone clicked Follow" collapses on the spot.
  `clearProps` the card's transform before measuring; measure at the final state.
- **Cursor coordinates not subtracting the arrow-tip offset** — `x/y` set the element's top-left; aiming that at the button's center puts the tip off the button's bottom-right corner. Subtract `TIP`.
- **Signing off on only the verify t0/t1 screenshots** — those two frames are almost never on the click moment, so bugs like the cursor missing the button slip straight through.
  An interaction card must be **screenshotted at the click frame** and inspected separately.
- **The button row placed mid-order** — the interaction target lands early while content is still moving behind it; the frame isn't settled when the cursor presses. The button row goes in the final group.
- **The cursor teleporting onto the button** — reads as "the state changed by itself", not "someone followed them". The social proof's persuasiveness drops to zero.
- **The two states implemented by changing `textContent`** — reads as "the words changed", not "the button changed state"; two stacked layers crossing, the retreating one shrinking, the advancing one growing.
- **Follower count unchanged after the click** — this click affected one button and no fact; the social proof's landing point is lost. The count must tick +1.
- **The follower count swapped outright** — reads as "the data refreshed"; only the tape roll reads as "this number grew".
- **The roll moving the window instead of the tape** — the whole text row (including the "Followers" label) moves along. The window stays fixed; the tape pushes inside it.
- **A count increment too small to see** (`128,431 → 128,432`) — rolled but might as well not have. The increment must land on a digit legible to the naked eye.
- **`fromTo` missing `immediateRender: false`** — the ripple ring flushes its from-state at build time and hangs on the rim "before the click" (an old pitfall this library has measured).
- **The card's `transform-origin` left at default center** — the whole card grows in both directions as it springs in, reading as a popup rather than a card settling; anchor at the card top (`50% 0%`).
- **Grayscaling X's skin** (the approach the user rejected 2026-08-25) — a black-and-white capsule + a neutral octagram badge looks "like a social card" but **is no platform at all**;
  viewers can't tell where the account lives, and the social proof loses its provenance. For cards like this, product skin = the content itself; copy `#1d9bf0` and the dark-card values verbatim.
- **A real human avatar** — the avatar is the one layer kept as a grayscale placeholder (no asset, and X's default avatar is itself a gray silhouette); swapping in a real photo means solving likeness rights yourself.
- **A resident cursor that never leaves** — it keeps drawing attention; viewers watch the cursor, not the card. Click and leave.
- **The same card appearing twice** — the second time viewers skip it outright. A new card only for a new person.
- The bio written as lorem or English placeholder — the persuasiveness of "this is a real person" drops to zero; write authentic-feeling Chinese.

## Reuse Guide
- HTML/GSAP: `demos/x-follow-card/index.html`. **To change the person, edit only those few text spots in the HTML** (`.name` / `.badge` (verified or not) / `.handle` / `.bio` / the three `.meta` entries / the two numbers in `.stats` / the `.post` sample post) —
  timing all lives in `CONFIG`, decoupled from content; copy changes touch no timestamps. The follower count is the two `<i>`s inside `.roll .strip` (top = old value, bottom = new; **the 20px window height and the `−20px` in that roll tween must stay in sync**).
  Rhythm lives in `CONFIG.cardIn` / `layerStagger` / `layerDur` / `cursorStart` / `cursorMove` / `flipDur` / `rollDur`; layer order is the `layers` array (reading order, button row last); the cursor's start point is `CONFIG.START` (recompute by stage width when resizing; landing points are back-computed from actual element positions by `P(el, fx, fy)`, so layout changes need no coordinate edits).
  The extractable core: `CONFIG` + the four segments inside the `DemoShell.register` callback (① card spring-in ② ten-layer stagger ③ cursor arc ④ the five same-frame things at the click).
- **No follow interaction, entrance only** (a common trim): delete segments ③④⑤ and the three elements `.cursor` / `.rip` / `.f-on`; segments ①② stand alone — that's a pure "profile card springs in" prop card, compressed to 1.4s.
- Remotion port (this is the origin): `registry/remocn/x-follow-card/index.tsx` (868 lines) + `registry/remocn/SOCIAL_FOLLOW_STYLEGUIDE.md` (the `*-follow-card` family's author contract: the nine fixed layer orders, the time-budget table, control naming contract, theme tokens).
  The source exports four pure functions to copy directly — `cardBounceIn(frame, fps)` yielding `{translateY, scale}` (`spring damping 12 / stiffness 120 / mass 0.8`),
  `blurInSchedule()` yielding nine `{group, start, end}` frame windows, `blurInAt(step, frame)` yielding `{blur, opacity, translateY}`, and `followStateAt(frame, speed)` yielding the boolean follow state;
  the cursor path uses `buildFollowWaypoints({buttonCenter, orientation})` + `useCursorPath` (`registry/remocn/use-cursor-path`), press scaling from `cursorStyle.pressScale`.
  Second↔frame conversion (30fps): `CLICK_FRAME 110` = **3.67s** (this card tightens to 2.58s — the source left 75 frames of cursor idle; those 2.5s are too expensive in narration),
  the nine layer windows `[20,26]…[36,42]` = 0.67→1.40s (this card splits into ten layers, 0.34→1.21s), bounce-in frames 0→25 = 0.83s (this card 0.62s), `durationInFrames 165` = 5.5s (this card 4.08s).
  The source **has no follower-count change** (`SamplePost`'s engagement numbers are hardcoded static values) — the count +1 is a beat this card adds, and where this card believes the social proof truly lands; when porting, attach it after `CLICK_FRAME` in the `sendFrame` style (drive the tape's `translateY` with `interpolate`; **never `Math.random`** — multi-pass renders flicker).
  The source also carries `orientation: "horizontal" | "vertical"` layouts (vertical runs 720×1280, card width 660, button at 542,336) — copy those numbers directly for vertical delivery.
  **`speed` must be `min: 1`** (a hard constraint in styleguide §2): with `speed < 1`, `frame × speed` may never reach `CLICK_FRAME` and the button stays stuck in the "Follow" state, never flipping.
- Editing-software equivalents: Jianying/CapCut — make the card one static image with a whole-card "scale pop" entrance (0.6s, with bounce); the ten-layer stagger can only be done by **cutting the card into ten image layers**, each with an entrance offset by 0.07s (labor-heavy but the result matches); the lazy version is three cuts (cover / profile / button); the two-state flip is two button layers crossing ("Follow" layer Opacity 100→0 + Scale 100→92, "Following" layer Opacity 0→100 + Scale 86→100 with elasticity, keyframes **must align with the click frame**); the follower-count roll is a masking rectangle + a two-line number text layer moving up.
  AE — `cardBounceIn` via a `spring` expression or an Overshoot preset; the ten layers via Sequence Layers + Gaussian Blur's Blurriness keyframes (8→0); the cursor arc via a Path bound to Position (more accurate than two hand-placed keyframes); the tape roll via Source Text unchanged + two Position keyframes (Easy Ease Out).
  Any software's "social card template" needs two checks first: do the layers all light at once, and does the follower count change — nine out of ten templates on the market fail both.
- Sound effects: one `pop` on the card's spring-in (`vol` 0.6, `rate` 0.94 — pitched down = weight); one `paper` at the head of the ten layers (`vol` 0.26, `rate` 1.12) as a bed — **no per-layer sounds** (ten hits smear into noise); one `click` on the click frame; two rising-pitch `tick`s on the count roll (0.34/1.10 and 0.36/1.22 — rising pitch reads as "it grew"). The hold is silent.

## Scope
- Belongs to this card: the structural discipline of **shell and content in two beats** (whole card springs into place → ten layers land afterwards), the spring-in's "displacement first + independent fade window" offset with `transform-origin` anchored at the card top, the **ten-layer staggered blur-in** (blur 8→0 + opacity + y, three properties together, 0.07s spacing) with the trade-off of **layer order in reading order and the button row last**, the 0.34s rest after content fills (the narration's headroom), the cursor's **arc** entry from off-screen (x `power2.inOut` / y `sine.inOut` composing the arc, anchored at the arrow tip), the discipline of **measuring the landing point at the button's final-state position and subtracting the arrow-tip offset** (together with the acceptance rule "interaction cards must be screenshotted at the click frame"), the click frame's **five-things-same-frame** feedback chain (cursor shrink beat + button press to 0.9 + two-state cross + ripple + count roll, then the `back.out(3)` rebound), the **direction of the two-state cross** (the retreating one shrinking `1→0.92`, the advancing one growing `0.86→1` with `back.out(1.7)`), the **follower-count ticker +1** beat (window fixed, tape pushing inside, `power3.out` 0.42s) plus the acceptance rule "the increment must be legible to the naked eye", the capsule ripple `0.92→1.3` with `immediateRender: false`, and the cursor leaving when done (0.45s slide-out fade).
- Does not belong to this card: the demo's specific person and bio, the specific 124K→125K numbers, the sample post's copy and its three engagement numbers, the grayscale silhouette avatar's rendering, the four tab labels (Posts/Replies/Media/Likes), the cursor SVG's specific shape.
  **Note, unlike other cards: X's skin (the dark-card values, brand blue, verification badge, the X mark, and the 600px card width + 24px radius source geometry) belongs to "the content itself", not "a swappable style"** — see the background requirements below. The same timing can of course be draped over another "profile card + one clickable primary action + one linked count" prop (a product card adding to cart, a course card enrolling, a repo card starring all work), but then it's no longer x-follow-card, and the skin must become that product's skin.
- Migration interface: those few text spots in the HTML are the only content entry point (timing decoupled from content; copy edits touch no timestamps); the follower count is the tape's two `<i>`s (**window height and the tween's displacement must match**); set `cursorStart` by narration pace (the cursor enters only after the person has been introduced); set `layerStagger` by "total time for ten layers to fill" (spacing × 9 + `layerDur` ≤ 1.3s is the safe line — any longer and the narration waits); resizing changes only that one `.scaler` `scale()` (everything inside the card is source-original and exempt from conversion); changing the primary action changes only the button's two layer copies and `flipDur` (the cross direction stays); changing the count's meaning must keep the increment on a legible digit; vertical follows the source's vertical layout (card width 660, button at 542,336, cursor entering from below); for **entrance-only without the follow interaction**, delete the last three segments (see the Reuse Guide).
- Background requirements: **product skin = the content itself; user verdict 2026-08-25: fully reproduce the product's styling**. This card involves a real product interface (the X profile card),
  so the card body is X's dark skin (card base `#16181c` / border `#2f3336` / primary text `#e7e9ea` / secondary `#71767b` / brand blue `#1d9bf0`),
  **exempt from the "white-stage neutralization" constraint** — grayscaling it makes the card "no platform at all", and the social proof's provenance vanishes with it.
  The stage itself remains white, with darkness confined to that card; the card separates from the background by its own base color + shadow, so it also holds as an overlay pressed on live footage
  (a dark card over live footage is steadier than a light one, needing no outline patch). The light skin is also in the source (`THEMES.light`: card base `#ffffff` /
  border `#e6e9eb` / primary text `#0f1419`); when a light X is needed, swap the whole set — **the one thing that must flip with it is the "Following" state**:
  under the light skin it's white base + gray border + black text; under the dark skin that white base cannot be copied (it would outshine the card and grab all attention) — use the card's base color + a bright border.
- Division of labor with adjacent cards: **vs [subscribe-cta](subscribe-cta.md) (multi-platform follow CTA)** — that one is a **grammar anthology**: three platform styles (YouTube subscribe + bell / Bilibili triple-action long-press / generic follow capsule) performed in series, trimmed to one in production; its goal is "**demonstrating that the viewer should click**", used at the **closing value-payoff point**, with an overlay of controls only, no card. This card is a **single, finely made social-proof prop**: one complete profile card (ten content layers) + one follow interaction + a count change; its goal is "**proving this person is worth watching**", used at the **moment of introducing a guest/account**. The two share the "control pops in → cursor arcs in → click feedback chain → state flip" machinery (this card's `P()` / arc movement / `clickDip` / `immediateRender:false` are all common-source with that card); the differences are **card vs control**, **proof vs call-to-action**, **midpiece vs closing**. Both may appear in one video (this one to introduce the guest, that one for the closing follow ask) — just not adjacent to each other. **vs [lower-third-nameplate](lower-third-nameplate.md)** — that one is the minimal "who is this person" (name + title, pressed in the frame's lower third, 2~3s and gone); this card is the full "on what authority" dossier + one interaction; the narrator introducing themselves on camera takes that card, introducing **someone else** and asking viewers to remember the account takes this one. **vs [media-pop-in](media-pop-in.md)** — that one is the generic pop-in prop for arbitrary material (no content structure, no interaction); this card is a dedicated prop with a fixed ten-layer structure + choreographed interaction.
