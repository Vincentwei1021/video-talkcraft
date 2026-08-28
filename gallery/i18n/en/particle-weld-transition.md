---
name: particle-weld-transition
title: The outgoing shot's subject lifts slightly, defocuses, and shatters into a batch of particles drifting upward; the incoming shot replays the same-direction particles with **the same seed** — they keep rising from below, converge at the new subject's position, and the subject takes form in the final stretch of the gathering
usage: Shot boundaries with the semantics of "the same thing changed form": data becoming a chart, a concept becoming an instance, material becoming a conclusion; also for poetic seams between acts. 1~2 uses per piece
---

## Intent
The other five forms carry their momentum in the **camera**; the particle weld carries it in **matter**: what the audience reads is not "the camera moved,"
but "the same batch of particles crossed the boundary." This is material continuity — stronger than camera continuity, because it claims
"the thing in the last shot became the thing in the next shot," so it may only be used where that is semantically true.

Critical rules to get it right: ① **The two particle groups must share one seed** — the batch scattering on exit and the batch gathering on entry must match in size, placement, and stagger;
change the seed and they're two different batches, material continuity fails on the spot (the audience can't say why, but it "feels wrong");
② **Same direction** — the exit drifts upward, so the entry must also "continue upward from below," never reversed to fall downward (that reads as two independent particle effects);
③ **The particle layer sits above the shots** — it crosses the cut point and covers the boundary; this is why the form hides the scene change without needing a flash;
④ **The subject takes form only in the final stretch of the gathering** (lagging 0.30s) — particles first, subject after; reversed, it becomes "a subject appears + a pile of decorative particles."

## Motion Core
Time structure (`cut = at + 0.60 − 0.12`, parameters all in `CONFIG.weld`):

| Phase | Time | Outgoing shot | Particle layer | Incoming shot |
|---|---|---|---|---|
| Shatter | `at` → `at+0.48` | Subject `opacity→0` + `y −14px` + `scale 1.03` + `blur 3px`, `power2.in` | Exit group lights up staggered (each `delay = r*0.26s`), `y → −rise*(0.55~1.15)` + `x ±sway`, `power2.out` | Parked at `scale 1.02` |
| Particle fade | from `at+delay+0.33` | — | Exit group fades out over 0.30s | — |
| Cut point | `cut = at+0.48` | 0.50s fade-out `power1.inOut` | Entry group in position at `cut−0.06 + r*0.20` (landing within the lead) | 0.50s fade-in + `scale →1.0` |
| Gather | `cut` → `cut+0.70` | — | Entry group `y: +rise*(0.5~1.0) → 0`, `x: ±sway → 0`, `power2.out`; final 0.24s fade-out | Subject first `set` to `opacity 0` + `scale 0.94` + `y 16px` |
| Subject forms | `cut+0.40` → `cut+0.82` | — | Already fading | Subject `opacity→1` + `scale→1` + `y→0`, 0.42s `power2.out` |

- **Deterministic pseudo-random (no `Math.random`)**: `rnd(s) = fract(sin(s*127.1 + 311.7) * 43758.5453)`;
  both particle groups call `makeParticles()` with the same `seed*1000 + i*7 + k` key space, so they correspond particle-for-particle.
  The Remotion side uses the same `rand(seed)` implementation (the `rand` in `transitions.tsx`), guaranteeing render determinism —
  `Math.random` recomputes every frame and renders flickering noise.
- **The particle spawn bounding box = the subject's bounding box**: in the demo `HOME = {x:480, y:268, w:340, h:74}` (a text block on the 960×540 stage).
  In production, take the real subject's (chart/card/large text) bounding box — particles growing out of the subject's own region is what reads as "it shattered."
  Scattering points across the whole screen reads as snowfall.
- **The stagger is the source of the shatter feel**: each particle's `delay = r(3) * 0.26s`. All launching together reads as one explosion;
  stagger past 0.4s and the last few haven't launched while the first batch has already faded, reading as stragglers.
- **Both sides' particle direction is "upward"**: the exit group travels up from the subject's position (`y` negative),
  the entry group travels up from **below** the subject's position (positive initial `y`) back to 0. So across the cut point you see one unbroken rising stream.
  Writing the entry group as "falling from above back onto the subject" is the most common mistake — that's two independent particle animations.
- **Subject formation lags**: `cut + gather − 0.30`, i.e. the subject only begins materializing as the particles are nearly gathered, growing in over 0.42s `power2.out`.
  This 0.30s overlap is what makes "the particles became the subject" visible.
- **The shot layers' camera motion is very light** (incoming `1.02 → 1.0`): the form's attention lives in the particles; a scene-stealing camera would scatter the material continuity.

Remotion equivalent (`template/motion-systems/transitions.tsx`):

- Outgoing shot: wrap the subject in `<Shatter at={tEnd-0.6} dur={0.6}>` (the "shell" of light lift + blur + fade), place one `<ParticleDrift at={tEnd-0.6} seed={7} count={36} box={subject bounding box} rise={180} />` at the same position
- Incoming shot: replay with the same seed, `at` negative (landing within the lead): `<ParticleDrift at={-0.5} seed={7} count={36} box={new subject bounding box} rise={180} />`
- `seed` must match on both sides; keeping `count` / `rise` consistent is also recommended; `box` just becomes each side's own subject bounding box — **the position may change; "same batch" is guaranteed by the seed**.
- Pixel fading is still handled by `<ShotFade>`; the particle layer does not participate in shot fading (it sits above the shots, crossing the cut point).

## Parameters
| Parameter | Typical value | Tuning feel |
|---|---|---|
| `seed` | 7 (the two groups **must match**) | Different seeds = two batches, material continuity fails immediately; the actual value doesn't matter — consistency does |
| Particle count `count` | 18 (demo) / 36 (Remotion default) | <10 reads as a few little squares flying; >60 on white reads as noise/dirt |
| Rise displacement `rise` | 200px @540 stage height | <100px particles fade while still near the subject and "leaving" is unreadable; >350px they exit frame and return, making the gather feel abrupt |
| Lateral sway `sway` | 46px | 0 reads as mechanical ascent; >90px particles scatter too wide and the gather looks like being sucked in (usable for a deliberate "vortex" effect) |
| Exit shatter `out` | 0.60s | <0.4s the subject vanishes with a "pop" and no shatter happened; >0.9s the audience waits for particles to finish drifting |
| Entry gather `gather` | 0.70s | Slightly longer than the shatter (scattering is easy; gathering must be seen); <0.45s reads as particles being vacuumed away; >1.1s drags |
| Overlap frames `overlap` | 0.50s ≈ 15 frames | On the long side — the particle layer needs time to cross the boundary; <0.35s the scene change peeks through |
| Subject formation lag | `gather − 0.30s` | 0 (simultaneous) reads as "subject appears + decorative particles"; >0.5s the particles are long gone before the subject arrives — causality broken |
| Per-particle stagger `delay` | `r * 0.26s` | 0 reads as one explosion; >0.4s head and tail disconnect |
| Particle size | 5~12px @960 stage width | Too small reads as noise; too large reads as square debris (which can also be a deliberate style) |

## Known Pitfalls
- The two groups use different seeds (or plain `Math.random`): not "the same batch of particles," material continuity fails;
  `Math.random` also recomputes every frame in Remotion, rendering flicker.
- Entry particles falling from above back onto the subject: direction reversed — reads as two independent particle effects, not one weld.
- Particles scattered from random points across the whole screen: reads as snow/starfield, not "the subject shattered." The spawn box must be the subject's bounding box.
- Particle layer placed below the shot layers: the scene-change boundary shows, and the form is wasted (it works precisely by having particles cross the cut point and cover the boundary).
- Subject and particles appearing together: causality inverted — reads as "a new subject arrived with a bunch of decorative particles." The subject must lag.
- All particles launching/landing at once: reads as explosion + suction, not shatter + weld. The stagger is mandatory.
- Outgoing subject merely fading with no "light lift + defocus": the shell has no shattering process and the particles look conjured from nowhere.
- Camera doing a big push/pull at the same time: steals attention; material continuity gets drowned by camera motion. The camera must stay light in this form.
- Used on a semantically invalid boundary (the two shots have nothing to do with each other): the audience reads "these two things are the same thing," then discovers they aren't — more confusing than a hard cut.

## Reuse Guide
- HTML/GSAP: `demos/particle-weld-transition/index.html`. Lift `particleWeld(outShot, inShot, startSec) → endSec`
  + `CONFIG.weld` + `rnd()` + `makeParticles()` + the `#weld` CSS.
  **Change `HOME` to your subject's bounding box** (the demo's is a text block `{x:480,y:268,w:340,h:74}` on the 960×540 stage);
  both exit/entry groups call `makeParticles()`, whose internal seed key space guarantees particle-for-particle correspondence — don't give them different seeds. Take `hold()` along.
- Remotion: `<Shatter>` wraps the outgoing subject + `<ParticleDrift seed={the same value}>` on both sides (the incoming side's `at` negative, landing in the lead);
  `box` becomes each side's subject bounding box. `rand(seed)` already lives in `transitions.tsx`; don't introduce `Math.random`.
- Family relations: this is the only one of the six forms whose momentum is not in the camera, so **it can coexist with very light camera motion**,
  but don't stack it with strong-camera forms like [[whip-pan-transition]] / [[black-slam-transition]] on the same boundary.
  If you want "material feel" but the two shots are semantically unrelated, [[push-through-transition]] is more honest.
- Editing-software equivalents: AE is CC Particle World / Particular with two emissions (same seed) + Turbulent Displace,
  or a Trapcode Form bidirectional morph; JianYing/CapCut's "particle/starlight transitions" are prefabricated with different seeds on the two sides,
  so they can only read as decoration — this card's whole point is binding the two sides into one batch.

## Scope
- Belongs to this card: the outgoing subject's shatter shell (`opacity→0` + `y −14px` + `scale 1.03` + `blur 3px`, `power2.in`);
  the exit group lighting up staggered (`r*0.26s`) from within **the subject's bounding box**, drifting upward `power2.out` (`rise*(0.55~1.15)` + `x ±sway`),
  each fading over 0.30s; the entry group **same-seed, particle-for-particle**, in position around the cut point, converging back to 0 from **below** the subject's position, continuing upward (`power2.out` 0.70s);
  the particle layer's `z-index` above the shot layers (crossing the cut point to cover the boundary — why this form needs no flash);
  subject formation lagging until 0.30s before the particles finish gathering (growing in over 0.42s `power2.out`); the 0.50s (≈15-frame) overlap crossfade;
  deterministic pseudo-random (`fract(sin(s*127.1+311.7)*43758.5453)`, `Math.random` forbidden); the never-static slow push during hold.
- Does not belong to this card: the text and colors inside the two shots (the white/light-gray tile + gray form name is a "label for identifying the form," not dialogue captions),
  the top-left explainer badge, **whether particles are squares or dots/glow** (the demo uses 2px-radius dark squares; Remotion defaults to glowing dots),
  particle color, `HOME`'s specific values (take the real subject's), the specific `inset:-14%` value on `.shot`.
- Migration interface: timing all in `CONFIG.weld` (`out`/`overlap`/`gather`/`cutLead`);
  **the two particle groups must share `seed`** (change it and it's no longer "the same batch" — material continuity fails immediately; this card's hardest constraint);
  when resizing, scale `rise` with screen height and `sway` plus particle size with screen width;
  `HOME` (on the Remotion side, `box`) becomes your subject's bounding box — **positions may differ between the two sides** (the new subject can live elsewhere);
  "same batch" is guaranteed by the seed, not the position; tune `count` by background (>60 particles on white reads as dirt).
- Background requirement: white works (demo particles in dark `#1d1d1f`). Dark projects just swap particles to bright/glowing,
  timing and direction untouched. This form contains no flash overlay, so it has none of [[overexpose-flip-transition]]'s polarity-flip issue.
