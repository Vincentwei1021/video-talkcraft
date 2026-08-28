---
name: impact-open-title
title: The whole line slams out in one hit (scale 1.08→1 + opacity, 0.2s power4.out), the last word switches to the accent color 3 frames later with its own second punch; the four corner-L framing brackets start on the **same frame** as the line but take a slower 0.3s to tuck in 12px, the dot grid fades in last, offset, over 0.4s and only to 0.5 opacity, and the subtitle floats up to close — one slam per screen, everything else is backing
usage: The 3-second hook at the very start of a video (promise lines like "get the point in three seconds") and opening titles of major chapters; fast-paced, opinionated short narrations and knowledge-channel openers; use only 1~2 times per video
---

## Intent
The hard part of an opening hook isn't "how to slam loudly" — it's **how to keep a single downbeat per screen**.
The reference composition has four element classes (big title / accent-colored last word / corner brackets / dot grid / subtitle),
and the rookie move is to give each its own entrance and its own action — the result is a viewer whose eyes get yanked five times in 0.5 seconds,
and "impact" turns into "chaos". The entire design of this card is **layered de-emphasis**:

- Title: `power4.out` 0.2s, the fiercest and fastest → **the only slam**
- Corner brackets: start on the **same frame** as the title, but `power2.out` 0.3s (1.5× slower, easing two orders gentler) → simultaneous but not competing
- Dot grid: starts only after the brackets settle, `0.4s` the slowest, with `opacity` capped at **0.5** → the lightest
- Subtitle: the final beat, small gray text floating up 8px → supplementary information

Two critical rules: ① **Only one "slam" per screen.** The brackets and the dot grid are backing; they must be slower and fainter than the title.
Give the brackets a `back.out` bounce and the viewer reads "four corners fighting the main title for its spot", and the composition falls apart.
② **Brackets and title start on the same frame, stop at different times.** Offsetting the brackets to start later reads as "the title appeared, then someone put a frame around it" (two events);
same-frame start + a slower curve reads as "the frame and the type are one layout, the frame is just heavier" (one event).

## Motion Core
- **Five elements, four beats, strictly decreasing weight**:
  - Beat ① `t=0.40` full line: `scale 1.08 → 1` + `opacity 0 → 1`, `0.20s` **`power4.out`**,
    applied to the **whole line** (not per character), `transform-origin: 0% 50%` (protects the left baseline)
  - Beat ①b `t=0.40` (**same frame**) four corner-L brackets: each `x/y ±12 → 0` (diagonal unit vector × 12) + `opacity 0 → 1`,
    `0.30s power2.out` — same-frame start, 1.5× slower, easing two orders gentler
  - Beat ② `t=0.70` (full line settled + 3 frames) last word: `color #1d1d1f → #e8720c` and `scale 1.15 → 1` on the same track,
    `0.167s power3.out` (a 5-frame punch), `transform-origin: 0% 50%` (the 1.15× only grows rightward, never squashing the previous character)
  - Beat ③ `t=0.80` (brackets settled + 0.1s) dot grid: `opacity 0 → 0.5`, `0.40s power1.out` — the slowest and faintest in the card
  - Beat ④ `t=0.96` subtitle: `opacity 0 → 1` + `y 8 → 0`, `0.28s power2.out`
- **The color change and the punch must share one track (same start, same stop)**: written separately you'll see "the word turns orange, then enlarges" or vice versa —
  two actions read as two beats, and the last word gets emphasized twice
- **The last word's 3-frame delay is a critical value**: at 0 frames the word is already orange when the line slams out (viewers read "this sentence just happens to have an orange word",
  with no "here's the point" progression); at >8 frames it reads as two independent effects (a line slams out, then a word changes color)
- **Each corner-L bracket draws only two edges**: `border: 4px solid` + zeroing the other two sides with `border: 0` to form the L.
  Arm lengths must be equal (46×46) — unequal arms read as casually placed decoration rather than a viewfinder frame
- **Brackets at `z-index: 5`**: they frame **the entire picture** and must sit above the host; placed beneath the host they read as "tape stuck on a wall"
- **The dot grid is a single element + `radial-gradient` dot pattern** (`background-size: 24px 24px`, 5×4 = 116×92px),
  not 20 divs. It is driven by `opacity` only, with zero translation — the cheapest possible implementation of backing
- **The dot grid's `opacity` cap of 0.5 is a hard constraint**: >0.6 it starts competing with the title for visual weight;
  on white, an orange dot grid at 0.5 reads as "a very light texture" — exactly right
- **The subtitle is gray `#8a8a8a` at a small 25px**: it takes no part in emphasis; it's the "supplementary note" information tier
- **Layering**: white stage → dot grid (upper-left, shifted right, in the empty zone above the title) → host (right side) → four corner-L brackets (z:5, above the host)
  → full-line title → subtitle
- **The accent color goes only on the last word and the backing pieces**: `#e8720c` (the reference's orange family) appears in three places — last word, brackets, dot grid —
  they are three intensity tiers of the same "emphasis system" (solid type / 4px stroke / 0.5 dots), not three colors

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `slamDur` | 0.20s (`power4.out`) | Full-line slam duration, **the only fierce move in the card**; >0.35s flattens power4's punch into an ordinary fade-in, <0.14s the slam has no visible travel (reads as a hard cut) |
| `slamScale` | 1.08 | Full-line starting scale; <1.04 there's no slam, >1.15 the line starts outside the safe area, and scaling large type makes the font weight appear to shift |
| `cornerDur` | 0.30s (= 1.5× the title's) | **The card's first critical rule**: the brackets must be slower than the title; = `slamDur` makes brackets and title equally intense — two slams per screen; >0.5s the brackets are still crawling after the title settles, reads as slow loading |
| Bracket easing | `power2.out` | Two orders gentler than the title (power4 → power2); giving the brackets `back.out` instantly steals the main title's spot |
| `cornerIn` | 12px | Distance the brackets tuck in from outside; 0 leaves only a fade (usable but loses the "viewfinder closing" semantics), >24px the brackets start off-canvas and read as four objects flying in |
| `wordDelay` | 0.10s (3 frames) | **The card's second critical rule**: the last word's delay; 0 means the line comes with a built-in orange word (no "here's the point" progression), >0.27s reads as two independent effects |
| `wordScale` | 1.15 | Last-word punch starting scale; <1.08 the punch is unreadable, >1.3 the word's start collides with the previous character (`origin: 0% 50%` only protects the left side) |
| `dotsOpacity` | 0.50 | **The dot grid's weight ceiling**; >0.6 the dots compete with the title for visual weight (two focal points per screen), <0.3 the dots may as well not exist (just delete the layer) |
| `dotsDur` | 0.40s | Dot-grid fade-in duration, the slowest track in the card; <0.2s the dots "appear" (once they have an entrance they're no longer backing) |
| `dotsGap` | 0.10s | Brackets settle → dots begin fading; 0 puts dots and brackets on the same beat (backing pieces crowding together), >0.4s the viewer has already started reading the subtitle |
| `hold` | 1.6s | Closing freeze — the complete opening layout is the landing point; with narration following the hook, hold needn't exceed 2s |

## Known Pitfalls
- Giving the brackets a bounce too (`back.out` / larger travel) — two slams per screen; viewers don't know where to look, and "impact" reads as "chaos".
- **The dot grid "shakes" once it enters a camera-zoom layer** (field-tested pitfall, 2026-08-28): invisible in the demo with a static camera,
  but in the final cut with a slow CameraRig push, a grid of 1.4px dots at 18px spacing crawls sub-pixel and the whole block reads as frame jitter.
  For final renders use dot diameter ≥2.5px / spacing ≥32px and lighten it (engineering iron rule: "fine dense textures stay out of camera-zoom layers").
- Offsetting the brackets to start late (instead of same-frame start + slower) — reads as "the title appeared, then someone framed it"; one layout split into two events.
- Pushing dot-grid `opacity` to 1 (or using solid dot divs) — it goes from backing to a second focal point; on white, an orange dot grid at 1.0 outweighs the gray subtitle and the composition inverts.
- Giving the dots translation / per-dot stagger ("let it move a little too") — a backing piece with an entrance action is no longer backing; this layer's correct state is "it was always there, you just now noticed it".
- Writing the last word's color change and punch as two beats — you see "the word turns orange, then enlarges"; one word emphasized twice is messier than no emphasis.
- Last word `transform-origin` at center — the 1.15× grows leftward and squashes onto the previous character (glyphs overlapping); use `0% 50%` so it only grows rightward.
- Unequal corner-L arm lengths (or inconsistent border widths across the four corners) — reads as casually placed decoration; the viewfinder semantics disappear.
- Brackets beneath the host (forgot `z-index`) — they frame the whole picture; one corner blocked by the host reads as "tape on a wall".
- Slamming the line per character (each glyph scaling on its own) — that's `per-character-rise`'s language; this card's "single slam" must ride one transform on the whole line, and per-character turns "once" into N times.
- Subtitle in black or bold — it instantly jumps to the title's tier, collapsing three text levels per screen into two (design-language §2: ≤3 levels per screen).
- Brackets/dots in a different color from the last word (say orange brackets, gray dots) — violates the single-accent-color red line; they are three intensity tiers of one emphasis system and must share one color.
- Using it more than twice per video — an opening hook's power comes from scarcity; by the third appearance viewers file it as channel packaging (design-language §2: hero type scale 1~2 times per video).

## Reuse Guide
- HTML/GSAP: demos/impact-open-title/index.html. **Changing copy edits two spots in the HTML**:
  the first half of the line in `#ioLine` (3~5 characters) + the last word inside `#ioLast` (**must be an independent span of 2~3 characters** — it's the only element that changes color),
  plus the subtitle in `#ioSub` (10~18 characters).
  Changing the accent color edits three instances of `#e8720c`: `.io-c`'s `border`, `.io-dots`'s `radial-gradient`, and `CONFIG.accent` (must be identical).
  Changing type size edits `.io-line`'s `font-size`, keeping `.io-sub` at about 1/3; size the brackets (`.io-c` width/height) at 8.5% of stage height.
  Move the dot grid via `.io-dots`'s `left/top` (it must land in the empty zone above the title, overlapping neither title nor host).
  Energy is tuned via `slamDur` only; `cornerDur` must stay at 1.5× `slamDur`, and `dotsOpacity` must stay ≤0.5.
- Remotion port: five elements, five independent `interpolate` groups sharing one `frame` clock.
  30fps conversion: `lead 12f`, `slamDur 6f`, `cornerDur 9f`, `wordDelay 3f`, `wordPunch 5f`,
  `dotsGap 3f`, `dotsDur 12f`, `subDur 8f`.
  Full line: `scale: interpolate(f, [12,18], [1.08,1], {easing: Easing.out(Easing.poly(4)), ...clamp})`;
  brackets: `[12,21]` with `Easing.out(Easing.quad)` (**same start 12, different end** — that is "same-frame start, different stop");
  last-word color via `interpolateColors(f, [21,26], ['#1d1d1f', '#e8720c'])` (built into Remotion, no manual interpolation);
  dot grid: `opacity: interpolate(f, [24,36], [0,0.5], {...clamp})` — **the ceiling is written as 0.5, not 1**.
  The four corners' direction vectors are cheapest in Remotion as one `[[-1,-1],[1,-1],[-1,1],[1,1]].map()`.
- Editing-software equivalents: JianYing/CapCut — main title as one text layer ("Scale" 108% → 100% + "Opacity" 0 → 100, 0.2s),
  the last word **must be split into its own text layer** stacked over the main title (JianYing can't keyframe a single word within a line),
  delayed 3 frames, keyed "Scale" 115% → 100% + the text-color change (color can't be tweened — just switch the color at the start frame;
  at a 3-frame offset viewers read it as the same instant). The four corners are four L-shaped stickers each keyed on "Position" + "Opacity", **with duration set to 1.5× the main title's**.
  The dots are one PNG dot-pattern image (or a "grid" sticker), keyed on "Opacity" 0 → 50 only.
  **Don't use JianYing's "impact"-style entrance presets** — they come with blur and shake and turn "one slam per screen" into full-frame vibration.
  AE — main title `Scale` + `Opacity` with `Easy Ease Out` handles pulled to 90% (approximating power4);
  make the four corners one precomp with `Scale`/`Position` keyframes sharing the start point over a longer span;
  the last word via `Text Animator`'s `Fill Color` + `Scale`, with the `Range Selector` covering only the last word and `Offset` delayed 3 frames;
  the dots via the `Grid` effect or `CC Ball Action`, keying `Opacity` 0 → 50 only.
- Division of labor with same-family cards in this library: `chapter-title-card` = chapter transition (color block covering the screen + wipe-out — a **transition**, not an opener);
  `behind-text-title` = a title rising from behind the host (spatial layering, low energy, can hang for a long time);
  `color-slam-beat-card` = full-screen hard cut to solid color + big type (usable on every sentence downbeat — a metronome);
  `slab-punch-title` = two lines of "setup / conclusion" (the point sits in a color slab; the semantics is weight);
  **this card = the hook in the first 3 seconds of the video**, characterized by "one slam + a full set of backing pieces standing up together";
  it makes the promise "this video is going to be tight", used only 1~2 times per video.

## Scope
- Belongs to this card: the compositional discipline "only one slam per screen", and its implementation — four layers of strictly decreasing weight (title `power4.out` 0.2s / brackets `power2.out` 0.3s / dots `power1.out` 0.4s with `opacity ≤0.5` / subtitle on the final beat); the brackets-and-title **same-frame start, different stop** relationship (`cornerDur` = 1.5× `slamDur`, easing two orders gentler) as the expression of "the heavier piece within one layout"; the last-word discipline set — **3-frame** delay, color change and punch **on one track with one stop**, `transform-origin: 0% 50%` to avoid squashing characters; the slam riding **one transform on the whole line** (not per character); corner-L brackets with equal arms + diagonal direction vectors × 12px tuck-in + `z-index` above the host; the backing-piece bottom line that the dots are **driven by opacity only, with zero translation**; last word / brackets / dots sharing one accent color (three intensity tiers of one system).
- Not part of this card: the demo's specific copy ("get the point in three seconds / the next three minutes explain exactly one thing"), the 72px and 25px type sizes, this particular orange `#e8720c` (any hue in the family works), the specific bracket values of 46px arms and 4px stroke (the ratios are 8.5% / 0.75% of stage height), the dot grid's 5×4 count and 24px spacing, the dots' specific placement above-right of the title, the subtitle's gray `#8a8a8a`, the right-side host (digital human) placeholder, and the "title on the left, 78px left margin" placement.
- Portability interface: the content entry is three plain-text pieces (first half of the line 3~5 characters / last word 2~3 characters as an independent element / subtitle 10~18 characters); energy is tuned via `slamDur` only (0.14~0.35s) with `cornerDur` keeping the 1.5× ratio; `dotsOpacity ≤0.5` and `wordDelay 3 frames` are critical constants — don't touch them for any size or pacing change; when changing type size, scale the main title `font-size`, subtitle (about 1/3), bracket size (8.5% of stage height), and `cornerIn` (26% of bracket arm length) by the same ratio; changing the accent color edits three places (bracket border / dot gradient / `CONFIG.accent`) and they must match; for vertical video split the title into two lines (4~5 characters each), shrink type to 60~68px, and keep only **two diagonal** brackets (four corners over-frame a vertical canvas; two diagonal corners is the `corner-bracket-frame` card's move and holds up better in vertical).
- Background requirements: white is fine. Dark also works (title reversed to white, subtitle switched to `#a1a1a6`, brackets and dots keeping the accent color), but on dark the dots' 0.5 ceiling should drop to 0.35 — warm dots at the same opacity are more conspicuous on dark. **Gradient or live-footage backgrounds don't work**: the corner-L brackets are 4px hard-edged lines and the dots are 3px circles; any high-frequency detail in the background makes both layers read as noise instead of layout.
