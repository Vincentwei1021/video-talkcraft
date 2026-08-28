---
name: lower-third-nameplate
title: A color bar at the lower left expands horizontally over 0.3s, the name then reveals from the left behind a mask, the title line follows another 0.15s behind; after the hold, everything retracts in reverse order
usage: The 3~5 seconds when an on-camera person or interview guest first speaks; also for self-introductions, remote call-ins, and attributing someone else's viewpoint; news, review, and interview tones
---

## Intent
Viewers need to know "who this is and why they're worth hearing" within the first two seconds of the person speaking — the nameplate is the cheapest trust endorsement there is.
Critical rules: **three-stage relay** (bar → name → title; any two stages simultaneous and the hierarchy collapses),
**reverse retraction on exit** (text retracts first, bar last; a straight fade-out looks like the footage simply ended — retracting is what makes it "one complete appearance"),
**contrast** (the bar must be saturated and the text shadowed, so it reads over any live-action background).

## Motion Core
- Structure: name (large type, 42px on a 960 stage) → horizontal color bar (7px tall, saturated) → title (small 19px gray-white type), inside the lower-left safe area (56px from left, 64px from bottom)
- Entrance: bar scaleX 0→1 (origin left) 0.3s `power4.out` → name `clip-path: inset(0 100% 0 0)`→`inset(0 0 0 0)` revealing from the left, 0.25s (starting when the bar is 70% done — the relay doesn't wait) → title the same way, delayed 0.15s
- Hold: 2~5s, completely still is fine (elements are small; no anti-staleness drift needed)
- Reverse exit: title retracts first → name +0.08s → bar last with scaleX→0 (`power4.in`); all within 0.5s
- Variant b (company/brand plate): a dark translucent rounded base scales 0.9→1 while fading in, a round logo bounces in with `back.out(2)` 0.25s, and name + subline slide in from 18px right with a 0.1s stagger; suited to the upper-right corner
- Layering: live-action frame → nameplate (topmost); never let captions cover it

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Bar duration | 0.3s | Faster (0.15s) flickers like a glitch; slower and the next two stages can't afford to wait |
| Name reveal duration | 0.25s | The clip reveal should be crisp; >0.4s looks like curtains being drawn |
| Title delay | 0.15s | The minimal unit of hierarchy; 0 = hierarchy collapses, >0.3s reads as a stall |
| Hold duration | 3~5s | Sized to "the viewer reads name + title twice"; past 8s it becomes a station bug |
| Relay start point | At 70% of the bar | Waiting for the bar to hit 100% leaves a perceptible dead beat; text before 50% reads as jumping the gun |
| Bar color | Brand color / high-saturation red | Low saturation melts into live-action backgrounds; the bar is the gaze anchor and must pop |

## Known Pitfalls
- Name and title appearing together — all the information arrives at once, the hierarchy collapses, and viewers end up absorbing neither.
- Exiting by fading the whole thing — looks like the footage naturally ran out; reverse retraction (last in, first out) is what gives the motion a proper beginning and end.
- Animating the bar with width instead of scaleX — width triggers reflow, stutters, and re-wraps the text; transform is what stays smooth.
- Text fading in without the clip reveal — inconsistent with the bar's "horizontal language"; instant template feel.
- Placed in the bottom-center caption zone — fights the captions; the nameplate's home is the lower left, above the caption safe area.
- Title running two or more lines — unreadable in time; keep to one line within 12 characters and cut the extra credentials.

## Reuse Guide
- HTML/GSAP: demos/lower-third-nameplate/index.html. Edit `.name/.title` copy and swap `.bar` to the brand color; all pacing is in `CONFIG` (barDur/nameDur/titleLag/hold); variant b lives in `.plate` — just change the logo glyph and company name.
- Remotion port: chain the three stages with `<Sequence from={...}>`; the clip reveal is `clipPath: inset(0 ${interpolate(frame,[0,8],[100,0])}% 0 0)`; the exit uses total duration minus frame for the reverse interpolate.
- Editing-software equivalents: JianYing "Text templates → caption bar / nameplate" category; in AE it's the Videohive "lower thirds" category (26k products to drop in); FCPX has built-in Lower Thirds generators; CapCut "Name tag" stickers.

## Scope
- Belongs to this card: the three-stage relay — bar `scaleX 0→1` (origin left, 0.3s, `power4.out`) → name `clip-path inset(0 100%→0)` revealing from the left (0.25s, starting at the bar's 70% mark, the relay never waiting) → title the same way delayed another 0.15s; the **reverse retraction** exit (title first → name +0.08s → bar last with `scaleX→0`, `power4.in`, all within 0.5s); the unified "horizontal language" of text and bar (both expanding from the left, no fades); variant b's whole-plate scale 0.9→1 + round logo `back.out(2)` bounce + name/subline sliding in from 18px with 0.1s stagger. During the hold, completely still is fine (elements are small; no anti-staleness drift needed).
- Not part of this card: the bar's color, name/title copy and type sizes, variant b's radii and borders, the live-action footage (the demo uses a grayscale host placeholder), and the specific lower-left 56/64px safe-area values (recompute per aspect ratio). The text shadow on the original demo isn't part of this card either — it's a readability patch for live-action backgrounds, unnecessary on white.
- Portability interface: **the bar's color = the reuser's brand-color interface** — edit `.lt .bar`'s `background` (the demo collapses it to ink #1d1d1f; for live-action, switch to a high-saturation brand color — low saturation melts into the background, and the bar is the gaze anchor that must pop); variant b's `.plate .logo` likewise; pacing lives in `CONFIG` (`barDur`/`nameDur`/`titleLag`/`hold`/`outDur`/`plateAt`); when resizing, scale type sizes and bar height (7px @960 stage) proportionally; over live footage, add a text shadow or a translucent backing — that's a readability layer the migrating side adds itself.
- Background requirements: white is fine. In live-action deployment the background is arbitrary video, so **contrast must be self-certified** — bar and text must read over the target background (that's the migrating side's responsibility, not this card's motion content).
