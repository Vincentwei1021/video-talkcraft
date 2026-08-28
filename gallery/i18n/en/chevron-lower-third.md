---
name: chevron-lower-third
title: The name line pushes in from the left (x -26→0, 0.26s); the title chip staggers 0.1s and expands from the left via scaleX over 0.22s with its inner text fading in 2 frames behind; three chevrons then light up in sequence as a "the strip is still extending" finish; after a 2.0s hold the whole strip retracts to the left
usage: The 3–5 seconds when an on-camera guest first speaks; also for remote calls, self-introductions, and attributing quoted opinions; one notch more "show-feel/dynamic" than lower-third-nameplate (vlogs, podcasts, sports/tech shows); for formal interviews and documentaries, use that more restrained card
---

## Intent
The viewer needs to know within the first two seconds of a person speaking "who this is, and why they're worth hearing" — a name strip is the cheapest trust endorsement.
This library already solves that need with `lower-third-nameplate`, so this card must justify itself by **difference**:

**`lower-third-nameplate` = a three-stage relay of color bar → name → title** (a horizontal bar expands first,
text is clip-revealed from the left; restrained, newsroom feel, a unified "horizontal language").
**This card = chip expansion + chevron finish**: the title is not a line of gray text but sits on a **solid chip**
(the credential is "dealt out" like a card — a badge); the finish adds three chevrons lighting in sequence,
reading as "the strip is still extending rightward" — an ending that **doesn't stop**.
So this card runs one notch more dynamic than that one: that one is "a nameplate stuck on", this one is "a badge dealt out, still moving".
The selection rule is blunt: formal interview/documentary → that card; show-feel/internet-native footage → this card.

Three critical rules:
① **The chip's text lags the chip by 2 frames (0.067s)**. Text swept out together with the chip reads as one whole PNG;
chip forms first, text lands after — that's the two beats of "dealing the card".
② **The chevrons are a finish, not decoration**. They must light up in sequence **after** the chip settles, and the stagger must be tight
(0.07s) — three read as **one sweep**, not three little arrows appearing individually.
③ **The hold must get 2.0s**. A name strip's job is letting people finish reading name + title; unread equals never shown;
1.5s suffices for other effects — not for this one.

## Motion Core
- **Structure** (@960×540 stage): inside the lower-left safe area (left 72 / bottom 96), first line: 44px/700 ink name;
  second line: a flex row — solid chip (height 40, `border-radius: 12` small-element radius tier,
  21px/600 white text inside) + 12px gap + three 15×26 chevrons (4.5px stroke, `round` caps).
  The whole strip wraps in a `.clt` with `transform-origin: left center` (the strip retracts as one on exit)
- **① Name push-in**: `x -26→0` + `opacity 0→1`, `0.26s power3.out`
- **② Chip expansion**: the chip background is a separate layer `.clt-chip-bg` (`transform-origin: left center`,
  `scaleX 0→1`, `0.22s power3.out`), starting = name start + `0.1s` (staggered, not waiting for the name to finish);
  the chip's inner text `opacity 0→1` (`0.14s`), lagging the chip by `0.067s` (≈2 frames @30fps).
  **The text does not participate in scaleX** (or it gets stretched flat horizontally); the chip container adds `overflow: hidden` as a backstop
- **③ Chevron sweep**: `opacity 0→1` + `x +5→0`, `0.14s power2.out` each, staggered `0.07s`;
  starting = chip settled. The stagger is tight enough to read as one sweep, not three elements
- **④ hold 2.0s**: everything at rest (elements are small; no anti-dead-air drift needed)
- **⑤ Exit**: the whole `.clt` together, `scaleX 1→0` + `opacity 1→0`, `0.2s power2.in`
  (faster than the 0.26s entrance — the exit is always lighter than the entrance, design-language §4)
- **Layering**: subject footage → name strip (topmost, and it must sit above the caption safe area)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `namePush` | -26px | Name push-in displacement; 0 = pure fade (losing the "pushed up" direction), <-60px reads as flying in from off-frame, upstaging the chip |
| `nameDur` | 0.26s | Name push-in duration; <0.15s reads as hard appearance, >0.45s the following two stages can't wait (a strip entrance over 1s drags) |
| `chipGap` | 0.1s | The chip's stagger from the name's start; 0 = both lines enter together (hierarchy collapses), >0.3s reads as two separate effects ("the name arrived… oh, and there's a badge") |
| `chipDur` | 0.22s | Chip expansion; <0.12s reads as a color block hard-appearing, >0.4s the viewer watches the chip slowly grow and the rhythm scatters |
| `chipTxtLag` | 0.067s (2 frames @30fps) | **This card's first critical rule**; 0 = text swept out with the chip (whole-PNG feel), >0.2s reads as the chip sitting empty waiting for text |
| `chevStagger` | 0.07s | **This card's second critical rule**; <0.04s the three land nearly simultaneously (reading as one solid graphic), >0.15s reads as three little arrows appearing individually (decorative) |
| `chevDur` | 0.14s | Single chevron light-up; faster than the chip (it's a light element); lengthen it and the finish outweighs the main body |
| `chevSlide` | 5px | The chevron's x displacement on light-up; 0 = pure fade (usable, with weaker "extension feel"), >12px reads as three little arrows flying |
| Chevron count | 3 | 2 lacks "extension" (reads as two dots), ≥4 smears together at small sizes; 3 is the minimum readable count for "still moving" |
| `hold` | 2.0s | **This card's third critical rule**; <1.5s the viewer can't finish name + title (equals never shown), >8s it becomes a persistent station bug (a different thing entirely) |
| `outDur` | 0.2s | Exit duration; **must be shorter than `nameDur`** (exit lighter than entrance); >0.4s reads as "reluctant to leave" |
| Title length | ≤12 characters, one line | Beyond one line it can't be read; cut extra credentials outright ("Supply-chain consultant · 12 yrs" is already the ceiling) |
| Placement | left 72 / bottom 96 | Must be inside action-safe and **above the caption safe area**; a bottom edge under 64px collides with captions |

## Known Pitfalls
- The chip's text participating in the chip's `scaleX` — the text gets stretched flat horizontally, glaring in slow motion; the text must be a separate layer above the chip background.
- The chip's text not lagging (fading in with the chip) — the whole strip reads as a pre-baked PNG pasted on; the two beats of "dealing the card" disappear.
- Chevrons lighting before the chip settles — the finish's semantics becomes "decoration entering with the main body"; the whole "strip still extending" meaning is lost.
- Chevron stagger stretched past 0.15s — the three become three independent little arrows appearing in turn, reading as decoration rather than one sweep.
- Four or more chevrons — at actual delivery sizes (phone portrait) they smear into a blob of color and crowd the title's horizontal space.
- Exiting by plain full fade — like footage ending and dissolving away; a reverse retraction is what makes it "one complete appearance" (a rule shared with `lower-third-nameplate`).
- The exit slower than the entrance — violates design-language §4 (exit always lighter than entrance); reads as "reluctant to leave".
- Hold at only 1.2–1.5s (copied from other cards) — a name strip's job is letting people finish reading; unread equals never shown. This card must get 2.0s.
- The chip animated via `width` instead of `scaleX` — width changes trigger reflow, and the chip's text rewraps/jumps along with it.
- Name and chip in two different accent colors — a second "look here" color on one screen (design-language §1 red line); chip and chevrons share the single accent, the name stays ink.
- Placed over the frame's bottom-center caption zone — collides with captions; the strip's home is lower-left, but always above the caption safe area.
- The title written across two lines — unreadable in time, and the chip becomes a square (a chip's semantics is "a badge", and badges are flat).
- Forgetting `transform-origin: left center` on `.clt` — on exit the strip collapses from its center, reading as "sucked away" rather than "retracting to the left".

## Reuse Guide
- HTML/GSAP: demos/chevron-lower-third/index.html. To change copy, edit `.clt-name` and
  `.clt-chip span` (title ≤12 characters); chip width tracks the text automatically (`padding: 0 18px`);
  to change the accent, edit only `:root --acc` (shared by chip + chevrons; the name stays ink);
  all rhythm in `CONFIG` (`namePush`/`nameDur`/`chipGap`/`chipDur`/`chipTxtLag`/
  `chevStagger`/`hold`/`outDur`); placement via `.clt`'s `left`/`bottom`.
  In live-action delivery, add a drop shadow or semi-transparent backing plate to the name and chip — that is **a readability layer added by the migrating side**, not part of this card.
- Remotion port: wrap the strip in `<div style={{transformOrigin: "left center", transform: `scaleX(${out})`}}>`;
  name `x = interpolate(f, [0, 8], [-26, 0], {easing: Easing.out(Easing.cubic), extrapolateRight: "clamp"})`;
  chip background `scaleX` on a local clock `f - 3`, chip text on `f - 3 - 2`;
  the three chevrons on `f - 10 - i*2`; exit via `interpolate(f, [outFrame, outFrame+6], [1, 0])`.
  Frame conversion @30fps: `nameDur 0.26s ⇒ 8f`, `chipGap 0.1s ⇒ 3f`, `chipTxtLag 0.067s ⇒ 2f`,
  `chipDur 0.22s ⇒ 7f`, `chevStagger 0.07s ⇒ 2f`, `hold 2.0s ⇒ 60f`, `outDur 0.2s ⇒ 6f`.
- Editing-software equivalents: Jianying/CapCut — the "text templates → caption strips/name strips" category has plenty of chip-bearing designs,
  but **built-in ones enter the chip and text together** (losing this card's first critical rule); to do it right, build it yourself:
  text layer + color-block layer, the block entering with "expand right", the text with "fade in" pushed 2 frames later;
  chevrons as three `>` text layers or arrow stickers, entrance times 2 frames apart.
  AE — a Shape Layer for the chip (Scale X 0→100%, anchor moved to the left edge) + a separate text-layer Opacity keyframe
  2 frames later; the three chevrons each with Position + Opacity, auto-spaced 2 frames via `Sequence Layers` (Overlap off);
  the whole strip parented to a Null for the exit Scale X. FCPX's built-in Lower Thirds generators
  can't produce the chip lag; build your own.
- Division of labor with sibling cards in this library: **`lower-third-nameplate` = the three-stage relay of color bar → name → title**
  (restrained, news/documentary feel, unified horizontal language, title as gray text);
  **this card = name push-in → chip expansion → chevron finish** (show-feel/internet-native, title as a solid badge,
  a finish that's "still extending"). Never mix the two in one film — the name strip is a film-wide consistent template piece,
  and switching designs makes viewers think the show changed. `host-shrink-to-chip` = the person themselves shrinking into a corner badge (a composition change, not an annotation);
  `subscribe-cta` = the call to action (a persistent element).

## Scope
- Belongs to this card: the name's `x -26→0 + opacity` (0.26s `power3.out`) push-in; the chip background's `scaleX 0→1` (origin left, 0.22s) following at a `0.1s` stagger, with **the chip's inner text lagging 2 frames (0.067s) on a fade and not participating in scaleX** (this card's first critical rule); the three chevrons' `opacity 0→1 + x+5→0` **after** the chip settles, staggered `0.07s` tightly enough to read as one sweep (finish semantics: "the strip is still extending"); the hold at **2.0s** (the name strip's dedicated long hold); the exit as the whole strip's `scaleX→0 + opacity` (0.2s `power2.in`, **necessarily faster than the entrance**) with `transform-origin: left center`; the combination relation "chip (solid badge) + chevrons (extension)" that distinguishes it from the three-stage-relay name strip.
- Does not belong to this card: the demo's specific name and title "Chen Zhiyuan / Supply-chain consultant · 12 yrs", the 44px and 21px font sizes, the specific blue `#0066cc`, the absolute values of chip height 40 and radius 12, the chevrons' specific shape (the `>` polyline can become triangles/arrows), the specific safe-area values left 72 / bottom 96 (recompute per frame), the subject footage (the demo uses a digital-human placeholder), and the shadow or semi-transparent backing plate added in live-action delivery (that's a readability layer, added by the migrating side).
- Migration interface: one accent variable `--acc` (shared by chip + chevrons; the name stays ink; no second accent allowed on screen); font sizes and chip height scale with the frame (44px/40px @540 stage height ⇒ ×2 @1080); recompute placement per the target frame's action-safe, always **above the caption safe area** (landscape captions bottom 100px ⇒ strip bottom ≥ 170px; portrait captions bottom 350px ⇒ the strip goes higher or moves to the top); rhythm in `CONFIG`, with `chipTxtLag` (2 frames) and `chevStagger` (0.07s) as **feel constants** — never touch them for size or speech-pace changes; set `hold` by "name + title read twice" (3–5s recommended in live action; the demo compresses to 2.0s); `outDur` must be shorter than `nameDur`.
- Background requirements: a white background suffices. In live-action delivery the background is arbitrary video, so **contrast must prove itself** — the chip and name must be readable against the target background (ink name works on light backgrounds; on dark/busy backgrounds give the name an outline or a semi-transparent backing plate). That is the migrating side's responsibility, not part of this card's motion content.
