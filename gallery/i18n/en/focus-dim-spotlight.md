---
name: focus-dim-spotlight
title: Wherever the narration goes, that spot lights up — the target row/card keeps its original brightness and gains a glowing outline while the rest of the screen dims 40% (or the whole page Gaussian-blurs with only the target sharp); the focus slides to the next target in 0.2s with the voice, and everything restores over 0.4s when done
usage: When the narration presents tables/lists/code/multi-card layouts and walks through "this row → the next row"; also for the whole screen yielding to one conclusion line. High-information-density, "look where I'm speaking" calm tones — finance report breakdowns, AI tool demos, spec comparisons
---

## Intent
A table/list/multi-card layout holds a dozen numbers at once; by the time the narration reaches row three the viewer is still on row one — focus-dimming moves
the entire visual weight onto the target: the target doesn't move, doesn't enlarge, gains no color — **everything around it simply goes dark**, leaving the viewer
no choice but to look at that row. Its division of labor with the highlighter is scale: the highlighter marks emphasis **within one line of text** (a pen stroke,
a color block, line-level), while this card switches focus at **layout scale** (a whole row / a card / a region, via luminance difference rather than paint).
Vital constraints: **zero changes to the target itself** (the moment you dim you'll itch to also enlarge and recolor the target; stack all three and it becomes a PPT
emphasis preset — this card's entire power lives in the single action of "everything else darkens"), **the focus slides, never cuts** (a 0.2s translation lets the eye
follow "from that row to this row"; a hard cut means re-finding the target every time), **everything must restore when done**
(left dark, viewers assume the frame is just that dark; the sense of focus exists only in the light-dark contrast).

## Motion Core
- Structure: a **spotlight window** element floats above the content, using a huge-spread `box-shadow: 0 0 0 9999px rgba(0,0,0,dimTo)`
  to dim everything outside the window (container `overflow:hidden` clips the spill); moving/resizing this window = focus jumps,
  with the non-target dimming following automatically. The target itself **changes no property**
- Target rectangles are measured at runtime (`getBoundingClientRect` divided by the shell's scale factor back into design coordinates): changing targets means changing a selector, never coordinates
- Channel ① **dim**: non-target area darkens to `dimTo` 0.35~0.45 (white base), the veil easing in 0.3s `power2.out`
- Channel ② **blur**: whole page `filter: blur(8px)` with only the target sharp (the target layer carries no filter, or uses a backdrop inverse mask);
  on focus switches the sharp/blurred regions swap over 0.2s — more "depth of field" than dimming, at the cost that blurred text is unreadable; use only for single-target scenes
- Channel ③ **outline**: the target is ringed by a rounded glowing frame — `opacity 0→1` + `scale 0.95→1` expanding open, 0.3s `power3.out`,
  with an outer `box-shadow` glow independently pulsing `sine.inOut` yoyo (half-period 1.6s — keep-alive, not blinking); the rest stays dimmed
- The three channels are **pick-any/stackable**: ① is the foundation, ③ stacks on ① (the demo's lead); ② and ① are alternatives (both at once smears into mush)
- Focus jumps: window and outline frame move + resize **in one shared tween**, 0.2s `power2.out`, repeatable N times
- Variable scale: the same window morphs from "one row" to "a whole card" by just changing width/height (0.45s `power2.out`) —
  the focus zooms from detail to layout, used to close on the "now look at all four rows together" conclusion line
- Ending: veil `opacity → 0` 0.4s `power2.out` full restore; the outline exits 0.25s ahead of the veil
- The subtitle/decorated-text layer sits **above** the veil (`z-index` above the spotlight window) — subtitles are the narration layer and don't get dimmed

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| `dimTo` | 0.40 (white base) / 0.20~0.25 (dark base) | Non-target darkness; <0.25 barely reads on white — emphasis fails; >0.55 the context becomes one black slab and viewers who look back can't read it |
| `dimIn` | 0.30s | Veil ease-in; <0.15s reads as a black flicker (like a dropped frame), >0.5s the focus arrives after the voice and can't keep up with the line |
| `jump` | 0.20s | Focus jump to the next target; 0 (hard cut) makes viewers re-find the target every time, >0.4s the line is finished while the focus is mid-flight |
| `hold` | 1.0~1.5s | Per-target dwell, aligned to that row's line; <0.7s only enough for a glance, not the numbers; >2.5s time for the next card |
| `ringFrom` | 0.95 | Outline expansion start scale; 1.0 reads as a static frame pasted on, <0.85 becomes a dialog-box entrance and steals the scene |
| `glowHalf` | 1.6s | Glow pulse half-period; <0.8s reads as alarm flashing; zero pulse amplitude leaves the frame dead during long dwells |
| `blurPx` (channel ②) | 8px | Non-target blur radius; <5px reads as a missed-focus mistake, >14px the context vanishes entirely and the "same table" continuity is lost |
| `restore` | 0.40s | Full restore; without it viewers take the dimming as the frame's base color, and the sense of focus retroactively zeroes out |

## Known Pitfalls
- Enlarging / recoloring / drop-shadowing the target while dimming — the three-piece stack is the JianYing "emphasis" preset; all this card's restraint is lost; **zero target changes** is the core discipline.
- Hard-cutting the focus (`jump = 0`) — every jump forces viewers to re-locate the target in the layout, restarting focus from scratch per row.
- Veil too dark (>0.55) — the context gets "deleted"; viewers lose the ability to compare and can't read what they look back for (same pitfall as highlighter-sweep's `dimTo`).
- Not restoring at the end — the dark state becomes the new normal; the next focus has no contrast and "this lit up" can't be read.
- Subtitles/decorated text dimmed along with everything — the narration layer grays out and viewers assume a render bug; subtitles must sit above the veil.
- Channel ② blur used on **multi-target continuous jumps** — every jump recomputes a full-page blur; the viewer's eyes refocus between blur and sharp over and over and get queasy within a few jumps; use ①+③ for continuous jumps.
- Glowing outline as a plain hard frame with no glow, or the glow made to blink — the former reads as a form focus state (browser-outline feel), the latter as an alarm; what's wanted is the continuously breathing "lit up".
- Outline frame hugging the target's edge with zero clearance — a frame pressed on the text/card border reads as a selection state; inset horizontally to the content box, extend about 3px vertically.

## Reuse Guide
- HTML/GSAP: demos/focus-dim-spotlight/index.html. Change targets via the `.trow.data` selector (rectangles measured at runtime, no coordinates to edit); focus geometry via `focusInsetX` / `focusPadY`; rhythm all in the top-level `CONFIG` (`dimIn` / `jump` / `hold` / `restore`); focus color in one CSS variable `--focus`; darkness `dimTo` written directly into `.spot`'s `box-shadow` spread color. Liftable core = `CONFIG` + the `DemoShell.register` callback body (including the `rectIn` / `focusBox` measurement functions). For channel ② put `filter: blur()` on the content container and lift the target row into an unblurred same-position clone layer.
- Remotion port: the spotlight window is an absolutely positioned div, `boxShadow: \`0 0 0 9999px rgba(0,0,0,${interpolate(frame,[d,d+dimInF],[0,dimTo])})\`` (outer `overflow:'hidden'`); focus jumps interpolate `left/top/width/height` individually via `interpolate(frame, [t,t+jumpF], [from, to], {easing: Easing.out(Easing.quad)})`, with target rectangles computed statically at build time (Remotion has no shell scaling — write design coordinates directly); outline `scale: interpolate(..., [0.95,1], {easing: Easing.out(Easing.cubic)})`; glow pulse `opacity: 0.35 + 0.65*(0.5+0.5*Math.sin(frame/fps*Math.PI/glowHalf))`; channel ② applies `filter: \`blur(${interpolate(...)}px)\`` to the content Sequence.
- Editing-software equivalents: JianYing — a black color block filling the frame at 40% opacity, add "Mask → Rectangle" and **invert the mask**, keyframing mask position/size = focus jumps; the glowing frame via a "border" sticker or stroked-rectangle asset + glow filter; AE — black Solid + Mask (Mode set to Subtract) with Mask Path keyframes, or Set Matte; the glowing frame as a stroked Shape Layer + Glow effect, with an Opacity expression for the breath; channel ② via a Gaussian Blur + inverted-mask adjustment layer; CapCut — same inverted-mask keyframe approach as JianYing.

## Scope
- Belongs to this card: dimming the whole screen outside the spotlight window to `dimTo` (0.3s ease-in `power2.out`); the focus jumping between targets with **synchronized translation + resize** (0.2s `power2.out`, repeatable N times); the target's glowing outline lighting up (`opacity 0→1` + `scale 0.95→1`, 0.3s `power3.out`) with the glow's `sine.inOut` micro-pulse (half-period 1.6s); the scale morph from "row" to "whole card" (0.45s); the full restore on finish (0.4s, outline exiting before the veil); the combination discipline of the three channels (① is the base, ③ stacks on ①, ② replaces ①); and the two hard constraints of **zero changes to the target itself** and the subtitle layer never being dimmed.
- Does not belong to this card: the demo's grayscale data-table card (layout, type sizes, fake data), the corner-badge host (the digital human is demo-context material), the sample script and subtitle cuts, the top-right "channel ①/③" annotation, the specific focus color `--focus: #ffb020`, and the card's corner radius and border styling.
- Migration interfaces: `dimTo` **takes its value from the background's luminance** (white 0.4 / dark 0.2~0.25 — over-dimming on dark smears everything into one black mass); the focus color is one token `--focus` (switch to a high-luminance value on dark); a target = any DOM element/coordinate rectangle (runtime-measured; swap content without code changes); `jump`/`hold` align to word-level voice timestamps; when resizing, scale the outline's stroke width and radius and `focusInsetX`/`focusPadY` proportionally with the frame — the `9999px` spread needs no change (as long as the container clips); channel ② only moves `blurPx` onto the content container's `filter`, timing reused as-is.
- Background requirements: white works (the dimming veil has the strongest contrast on light bases — this card's most natural scene). Dark screenshots/terminal frames work equally, but `dimTo` must be halved and the focus color switched to a high-luminance value, or the dimmed zone merges with the dark base and the focus has nowhere to live.
