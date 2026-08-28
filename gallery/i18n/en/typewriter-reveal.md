---
name: typewriter-reveal
title: A time-and-place stamp types out character by character in a monospace font, with randomly jittered speed; a block cursor blinks at the end on a 500ms cycle, and the secondary info line follows after a 0.4s delay
usage: Documentary-style narration establishing time / place / a person's dossier; suspense, investigative, and roundup tones; not for high-energy fast-cut segments
---

## Intent
Give the narrative a "pulling the file" ritual — viewers who see a location and date typed out character by character automatically enter "background material incoming" listening mode.
Vital points: **the speed must jitter** (30~80ms per character with ±20ms randomness; uniform speed is instantly a CSS tutorial),
**the cursor must be present** (the block cursor is the typewriter's ID card; without it this is just delayed text),
**the two lines must stagger** (the secondary info starts typing 0.4s later; typing both lines at once kills the "logging entries one by one" dossier feel).

## Motion Core
- The text container uses a monospace font (Menlo/Consolas; Chinese characters are naturally monospaced, but mixed-in digits must be monospaced), with a `█` block cursor trailing the line (a solid block 0.62em wide × 1.05em tall)
- Character-by-character appearance: the nth character shows whole (not faded in) at time `Σ(charMs ± jitterMs)`, 30~80ms per character
- Line end: the cursor blinks as a 500ms-cycle square wave (half-cycle on / half-cycle off, not a cross-fade) 2~3 times
- The second, secondary-info line starts typing after a 0.4s delay, and the cursor "hands over" from line one to line two (line one's cursor disappears)
- After typing completes, the cursor stays resident and blinking
- Layering: background → on-camera person/material (photo/B-roll) → the typing stamp (topmost, landing in the empty zone opposite the person — occupying a corner, not the center)

## Parameters
| Parameter | Typical value | Tuning feel |
|------|--------|----------|
| Character interval charMs | 55ms | Down to 30ms it's high-speed telex — stronger tension; past 100ms viewers start waiting, like a loading screen |
| Random jitter jitterMs | ±20ms | 0 = uniform, instantly fake; too much jitter (±40ms+) looks like network lag |
| Cursor blink period | 500ms | The industry default; faster looks like a glitch, slower looks like a hang |
| End-of-line blink count | 3 | Fewer than 2 and the second line comes in too rushed; more than 4 drags the pace |
| Second-line delay | 0.4s | Larger gives more of a "retrieving the file" pause; at 0 both lines emerge together and the dossier feel disappears |
| Main-line font size | 40px (960-wide stage) | Too large reads as a title card stealing the scene; this is a "stamp" — it belongs in a corner, not the center |

## Known Pitfalls
- Uniform character emission — real typing has rhythmic fluctuation; the tidiness of uniform speed is instantly `setInterval` tutorial code.
- No block cursor — all that's left is "text slowly appearing", reading as slow loading rather than a typewriter.
- Non-monospace font with mixed digits — character widths vary and the cursor jumps left and right as characters emerge, ruining the dossier feel.
- Cursor fading in and out via opacity — a typewriter cursor is a square wave (on/off hard cut); the sinusoidal breathing look belongs to a webpage login box.
- Placing the stamp dead center — it's an annotation, not a title; centering it steals the material's scene.

## Reuse Guide
- HTML/GSAP: demos/typewriter-reveal/index.html. The demo carries the narration context: the host (digital human) occupies the left 40% on camera, and the dossier stamp sits in the lower right white zone — the stamp annotates, never covering the person or occupying the center. Change copy via `CONFIG.line1/line2`, tune the feel via `charMs/jitterMs`; `.host-wrap` and `.host-placeholder` are demo context only (the live-presence slot) — in application swap in the live-footage/digital-human layer; `.stamp`'s `left/bottom` is the placement interface (person on the left ⇒ stamp on the right, and vice versa); the "dossier look" (dark base / distressing / paper grain) belongs to the style layer — add it per your piece's tone.
- Remotion port: take substrings by frame — `text.slice(0, charAt(frame))`, where charAt uses a pre-generated random schedule (useMemo with a fixed seed); cursor `opacity = Math.floor(frame / (fps*0.25)) % 2`.
- (Field-tested variant) Garble decode: a command/term first scrolls as high-speed garbage inside a capsule, then **locks in as real characters position by position, left to right** — the identity shifts from "typewriter" to "decoding"; suited to dropping command lines, model names, key-like strings; the block cursor can be omitted — the locking progress itself is the cursor. See TheAIScaler (u8OWXXTcu3Q).
- (Field-tested variant) Live typing in a terminal window (Y17upxADWXs / HidOB0Ll7W8): put the typing stamp inside a terminal-window shell; after typing and hitting enter, the output line appears as a whole block (not character by character) — "input character-by-character, output in blocks" is the terminal's real rhythm; character-by-character output actually reads fake.
- Editing-software equivalents: Jianying "text animation → input method / typewriter"; AE via Text Animator + Opacity 100% steps; CapCut's "Typewriter" preset — note all of them need a block cursor layer added by hand.

## Scope
- Belongs to this card: character-by-character whole-character display (no fade-in), the nth character appearing at `Σ(charMs ± jitterMs)` — **the randomly jittered interval** is the card's core feel; the end-of-line block cursor's 500ms square-wave blink (on/off hard cut, no cross-fade) 2~3 times; the cursor "handing over" from main line to secondary line (main-line cursor display:none, secondary-line cursor lighting on the same frame); the secondary-info line's 0.4s-delayed staggered timing; the resident blinking cursor after completion. A monospace font is this card's necessary condition (non-monospace makes the cursor jump around as characters emerge).
- Does not belong to this card: the demo's narration context (the left-side digital-human slot `.host-wrap`/`.host-placeholder` — injected uniformly by demo-shell, see references/host-footage.md), the sample copy, the 36px/18px font sizes and the stamp's specific placement (lower right white zone), and all "dossier look" styling — dark base, distressing, paper grain, vignette, text shadows all belong to the style layer; this card neither provides nor requires them.
- Migration interface: `charMs`/`jitterMs` set typing speed and jitter, `blinkPeriod`/`blinkTimes` set the cursor's cadence, `line2Delay` sets the two-line stagger, `startDelay` aligns with the voice entry point; to restyle, change `.stamp`'s color and the cursor's background (the cursor's color must match the text color, or it stops looking like the same typewriter); when resizing, keep the font size and the cursor's 0.62em×1.05em as em-relative values and they follow automatically.
- Background requirements: plain white is fine (character-by-character display and a block cursor don't depend on background contrast — only text-vs-background readability). The original demo's dark dossier background has been removed — that was style, not motion.
