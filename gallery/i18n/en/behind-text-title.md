---
name: behind-text-title
title: An oversized title rises from behind the subject over 0.55s, letter-spacing tightening from loose to snug, its lower edge occluded by the subject's silhouette; during the hold, title and subject drift extremely slowly ±4px in opposite directions, so a flat frame reads with faux-3D depth
usage: Opening thesis line, chapter headline, closing callback; vlog-style / cinematic on-camera narration (the subject layer requires keying; not applicable when no one is on camera)
---

## Intent
A title laid directly over the subject reads as "a caption"; rising from behind the person and emerging through occlusion, what the viewer reads is **space** —
a line of text instantly gains title-sequence ceremony. Three critical rules:
1. **Occlusion is mandatory**: the title and subject must overlap by ≥25% of area (in the demo the head eats into the title's lower edge); zero overlap is just an ordinary title.
2. **Opposite-direction drift during the hold**: title and subject each drift extremely slowly in opposite directions — only then does parallax hold up; same-direction drift kills the depth on the spot.
3. **The type must be large and dimensional**: font size at 40%+ of screen height (235px in the demo); small text with a clipped corner just looks like a layout accident. The face uses 3D-extruded display lettering (gradient face + stepped grayscale text-shadow sides + grounded drop shadow); flat black type cannot carry this composition.

## Motion Core
- Three z-index layers: background (z0) → oversized title layer (z1) → foreground subject silhouette (z2, from keying in live footage);
  plus a small subhead (z1, above the title) and the caption area (z3)
- Title entrance (from 0.4s): opacity 0→1 + y 40px→0 + letter-spacing 0.2em→0.05em tightening, 0.55s `power3.out` —
  the rise and the tracking contraction are synchronized, like "gathering into form from behind the person"
- Subhead small text: 0.35s later, opacity 0→1 + y 10px→0, 0.4s `power2.out`
- Hold (starts the moment the entrance completes): title x 0→+4px, subject x 0→-4px, `sine.inOut` + yoyo infinite ping-pong,
  half-period 4s (full period 8s) — faster gives it away; only at 8s does it feel like "the camera breathing"
- Occlusion comes naturally from layering, no mask; the subject silhouette's height determines how much of the title gets eaten

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `titleIn` | 0.55s | <0.4s feels like a pop-up and loses gravitas; >0.8s drags, the viewer is waiting for the text |
| `riseFrom` | 40px | The larger, the more visible the "emerging from behind"; >80px it pierces through the subject's midsection and breaks the illusion |
| `trackFrom` → `trackTo` | 0.2em → 0.05em | More contraction gives more "focusing into form"; without tracking contraction the entrance reads as a mere translation |
| `driftPx` | 4px | >8px looks like unfixed footage drifting; 0 leaves the hold as dead as a screenshot |
| `driftPeriod` | 8s | <4s reads as wobble and breaks the illusion; the longer, the more it feels like a breathing camera |
| `subDelay` | 0.35s | Same-frame with the main title = hierarchy collapses; >0.6s the viewer assumes there is no subhead |
| `.bt-title` font-size | 150px | Start at 25% of screen height; any smaller and the occlusion can't be read as "behind" |
| `.bt-host` height | 372px | Controls occlusion area: the head must eat into the title's lower edge ≥25%; too short and it's just an ordinary title |

## Known Pitfalls
- Zero overlap between text and subject — no occlusion means no "behind"; at a glance it's just a large ordinary title.
- Drift in the same direction, or same amplitude and direction — parallax is by nature relative motion between layers; same direction equals moving the whole frame.
- Complete stillness during the hold — looks like a frozen frame/flat image; the entire faux-3D trick rests on that ±4px.
- Font too small, or title placed too high to dodge the subject — occlusion disappears and the effect degrades into opening-credits text.
- Drift period too short — the viewer perceives "elements moving" rather than "the camera breathing"; instantly cheap.

## Reuse Guide
- HTML/GSAP: demos/behind-text-title/index.html. To change copy, edit the text inside `.bt-title` (main) and `.bt-sub` (subhead);
  to change colors, edit `.bt-title`'s `color:#e9e6dc`, `.bt-sub`'s `color:#9a97a8`, and `.bt-bg`'s gradient;
  all timing feel lives in the top-level `CONFIG` (titleIn / riseFrom / trackFrom / trackTo / driftPx / driftPeriod / subDelay);
  tune occlusion via `.bt-host`'s width/height. The core animation is the block inside `DemoShell.register`; copy it along with CONFIG and it lifts out cleanly.
- Remotion port: three absolutely positioned layers stacked by z-index (the subject layer uses keyed video via `<OffthreadVideo>` or an alpha image sequence);
  drive the rise with `interpolate(frame, [t0, t0+0.55*fps], [40, 0], {easing: Easing.out(Easing.cubic)})` synchronously feeding y,
  opacity, and letterSpacing (0.2em→0.05em); hold drift is `Math.sin((frame/fps) * 2*Math.PI / 8) * 4`,
  positive for the title, negative for the subject layer — frame-driven and therefore naturally seek-safe.
- Editing-software equivalents: in Jianying/CapCut use "smart keying" to duplicate a subject layer on top, with the text track sandwiched between the original footage and the keyed layer (tutorials usually call this
  "text behind person"); in AE, Roto Brush the foreground to the top, keyframe the title layer's Position +
  `loopOut("pingpong")` for the opposite-direction drift; in FCPX use Keyer + the same three-layer stack.

## Scope
- Belongs to this card: the 3D-extruded display-lettering texture (gradient face + stepped grayscale shadow sides — the dimensionality comes from grayscale stepping; the colors are a migration interface); the three-layer z order (background → oversized title → foreground subject) and occlusion achieved naturally by layering (no mask); the title entrance with opacity 0→1 + y 40px→0 + `letter-spacing 0.2em→0.05em` all synchronized (0.55s, `power3.out`, "gathering into form from behind the person"); the subhead's opacity + y 10px→0 delayed 0.35s; the hold-phase **opposite-direction** ultra-slow drift of title +4px / subject −4px (`sine.inOut` + yoyo infinite, half-period 4s); the geometric constraint of ≥25% overlap between title and subject.
- Does not belong to this card: the background (the demo has dropped the gradient and vignette, pure white), the title/subhead copy and typeface, how the subject silhouette is drawn (the demo uses a grayscale version of the host placeholder; live footage comes from keying), captions, and the two absolute values 150px and 372px (convert per frame size).
- Migration interface: text color via `.bt-title`'s `color` (default ink #1d1d1f) and `.bt-sub`'s auxiliary gray #8a8a8a; timing in `CONFIG` (`titleIn`/`riseFrom`/`trackFrom`/`trackTo`/`driftPx`/`driftPeriod`/`subDelay`); when resizing, convert the font size starting from **25% of screen height**, scaling `riseFrom` and `driftPx` proportionally (`driftPeriod` does not scale — it is the absolute time of the breathing feel); tune occlusion via `.bt-host`'s width/height or swap in a real keyed layer, always ensuring the head eats into the title's lower edge ≥25%.
- Background requirements: a white background suffices, provided **the title, subject, and background are clearly separated in luminance** — this card's entire effect is read through "the text being blocked by the person". On white, a light-gray subject silhouette (#e3e3e6/#ececef) with ink-colored type works; in live-action delivery the subject layer is keyed footage, and the title color must contrast strongly with the subject's dominant color, otherwise the occlusion boundary is unreadable and the effect degrades into an ordinary title.
