---
name: douyin-follow-card
title: A Douyin profile card springs in as a whole (0.62s micro-overshoot), then its avatar/nickname/Douyin-ID/stats/bio blur-in in reading order staggered 0.07s apart; a cursor arcs in and clicks "+Follow", and on the same frame the button cross-flips + a ripple + the secondary slot becomes "Send DM" (the follower count is static, like the original X source)
usage: Narration introducing a person or account — a guest's entrance, "you should follow this person", crediting a source when quoting someone, recommending a peer/author; the same card appears at most once per video
---

## Intent
When the narration says "this person's content is worth following", the viewer's inner question is "who are they, and on what authority?". One Douyin profile card answers it at once: avatar, nickname, Douyin ID, bio, and the **likes / following / followers**.
This card's value is not "pasting a profile" but **the card acting out being followed** — the cursor walks over and clicks "Follow", the button flips from "+Follow" to "Following" (the follower count is static, like the original X source). That turns a static profile into social proof: it's not you praising them — "someone is following them right now".

Three vital points. **First: shell and content in two beats** — the card springs into place as a whole first, the content lands afterwards one by one. All at once = an image fading in.
**Second: the cursor must travel over** (shared with [subscribe-cta](subscribe-cta.md)/[x-follow-card](x-follow-card.md)): a teleport-click reads as "the state changed by itself".
**Third: same-frame feedback at the click** — the button's two-state cross + a ripple + the secondary slot becoming "Send DM" (the follower count is static, like the original X source). The flip itself is the "follow happened" feedback.

**Product skin = the content itself (user verdict 2026-08-25+)** : the card fully reproduces Douyin's outward home page — default blue gradient background, un-followed button red `#EB455B`, followed button light-grey `#F1F1F2` + black text, body text `#161823`, secondary grey `#9299A4`, `@` link blue `#1E9FFF`. Grayscaled, it belongs to no platform and the social proof loses its provenance.

## Motion Core
- Whole-card spring-in 0.62s (`y 46→0` + `scale 0.9→1`, `back.out(1.35)`), fade-in in an independent window 0.05–0.35s.
- `transform-origin: 50% 0%` (card top): the card "hangs down" as it springs in, not a popup.
- Content staggered blur-in: each layer `blur 8→0` + `opacity 0→1` + `y 8→0`, 0.24s per layer, 0.07s spacing. Reading order — background → top nav → avatar → nickname/ID → stats → bio → **button row last**. The **multiline bio is one layer** (line count changes card height, not the stagger rhythm).
- Rest until 1.55s: 0.34s headroom for the narration to introduce the person.
- Cursor arcs in 0.95s (x `power2.inOut`/y `sine.inOut` composing the arc), `transform-origin: 0% 0%` at the arrow tip.
- Landing measured at the button's **final-state** position (clear the card transform first), subtract the arrow-tip offset; accept by screenshotting the click frame.
- Click-frame feedback chain (same frame): cursor shrink + button press to 0.92 + two-state cross + ripple + count roll, then `back.out(3)` rebound.
- Two-state cross: "+Follow" `opacity 1→0` + `scale 1→0.92`, "Following∨" `opacity 0→1` + `scale 0.86→1` with `back.out(1.7)`.
- Follower count is static (same as the original X source).
- Secondary slot becomes "Send DM" (icon-only before, icon+text after follow).
- Capsule ripple `0.92→1.3` + `opacity 0.55→0`, `immediateRender:false`. Cursor leaves when done.

## Parameters
| Parameter | Typical | Feel |
|---|---|---|
| cardIn | 0.62s | <0.35s reads as a hard pop; >0.9s viewers wait |
| layerStagger | 0.07s | =0 degrades into "an image fading in"; >0.14s viewers read instead of listen |
| layerDur | 0.24s | <0.15s hard flash; >0.4s stagger smears |
| cursorStart | 1.55s | 0.34s headroom; <0.1s someone clicks before content lands, >1.2s it waits |
| cursorMove | 0.95s | <0.4s near-teleporting; >1.4s viewers wait for it |
| flipDur | 0.34s | <0.18s hard icon swap; >0.6s button melts |
| rollDur | 0.42s | <0.2s number flicker; >0.7s pulls all attention |
| follower count | static (like the original X) | default no +1; only add a readable change (`6454→6455`) if you want |
| bio lines | 2~4 | card height adapts (logical width 900 → output width 500); >6 lines may hit the vertical caption zone |

## Reuse
- Remotion/tsx (skill first): template/cards/douyin-follow-card.tsx — self-contained; CONFIG top, CONTENT mid, meta for size/timing.
- HTML/GSAP: demos/douyin-follow-card/index.html. **To change the person, edit only the content spots** (.name/.dvid/.stats `<b>`s/.bio lines/.avatar); timing lives in CONFIG, decoupled from content.
  Follower count: edit the last `<b>` in `.stats`.
- **Avatar/background**: product skin = content itself — default gradient, uploaded head-image via `{bg.type:'image',src}`.
- **"My page" → outward conversion** (works from a self-view screenshot): extract background/avatar/nickname (strip message badge)/Douyin ID/**likes·following·followers** (drop "mutual")/bio; drop 编辑主页/mutual/主播中心/我的订单/观看历史/我的钱包/全部功能/私密作品/create-AI-image/status bar/bottom tabs; auto-add ✅＋Follow/Following∨/Send DM. No tagline row (IP/gender/age/MCN/real-name) and no entry strip (chat/shop/live/channel) — defined off.
- Editing-software equivalents: Jianying/CapCut — one static card with a whole-card "scale pop" entrance (0.6s bounce); the stagger needs the card cut into layers (background/avatar/nickname/stats/bio/button) each with 0.07s-delayed entrance; the flip is two button layers crossing (keyframes aligned with the click frame); the count roll is a mask rectangle + two-line number text moving up.
- Sound: one `pop` on the spring-in (vol 0.5, rate 0.94); one `paper` bed at the content head (vol 0.26, rate 1.12, not per-layer); one `click` on the click frame; two rising `tick`s on the count roll (rate 1.10/1.22). The hold is silent.

## Scope
- Belongs to this card: the shell-and-content-in-two-beats discipline; the "displacement first + independent fade window" with `transform-origin` at the card top; the staggered blur-in (blur+opacity+y together, 0.07s spacing, button row last); **the multiline bio as one layer** trade-off; the 0.34s rest headroom; the cursor's arc entry from off-screen; measuring the landing at the final-state button position and subtracting the tip offset (with the "screenshot the click frame" acceptance); the click-frame same-frame feedback chain; the two-state cross direction; the static follower count (like the original X source); the secondary slot → "Send DM" transition; the capsule ripple with `immediateRender:false`; the cursor leaving when done.
- Does not belong to this card: the demo person (Vincent / 335248116 / 3.2万·238·6455 / two bio lines) — replaceable demo content; the specific numbers; the default silhouette avatar (placeholder); the top-nav icon shapes; the cursor SVG shape; **the bottom works list, the tagline row, the entry strip** (all outside this card).
- Background requirements: product skin = content itself. Default Douyin blue gradient `#BBD7EF→#75A4D0`; uploaded head-image via `img`. Follow button red `#EB455B`, followed `#F1F1F2`+black text, body `#161823`, `@` link `#1E9FFF`. Not subject to the "white-stage neutralization" contract.
- Division of labor: **vs [subscribe-cta](subscribe-cta.md)** — that one is a grammar anthology (three platform styles, trim to one, goal "demonstrate the click", closing payoff, controls only); this card is a single finely-made social-proof prop (one profile card + one follow interaction + a count change), used at the moment of introducing a guest/account. **vs [x-follow-card](x-follow-card.md)** — that is the X profile (dark card + blue follow button, "this person on X"); this is the Douyin home page (gradient + red follow button, "this person on Douyin").
