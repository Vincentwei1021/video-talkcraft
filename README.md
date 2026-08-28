<div align="center">

<h1>video-talkcraft</h1>

[![GitHub stars](https://img.shields.io/github/stars/Vincentwei1021/video-talkcraft)](https://github.com/Vincentwei1021/video-talkcraft/stargazers)
[![License](https://img.shields.io/badge/License-PolyForm%20Noncommercial-blue)](LICENSE)

**An agent skill for crafting cinematic narration videos: word-level voiceover sync · 78 motion recipe cards · a 7-layer anti-slideshow shot system · triple-gate QA**

[English](README.md) | [中文](README_CN.md)

</div>

**video-talkcraft** is the narration-video sibling of
[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft): an AI agent
skill that turns Claude Code or Codex into a motion-design studio for talking
videos. Hand it a narration script and a finished voiceover, and it aligns
word-level timestamps on your CPU, storyboards every semantic beat into a
SHOTBOOK, then renders a cinematic explainer with
[Remotion](https://www.remotion.dev/) — kinetic type, evidence screenshots,
camera moves, plain-cut subtitles, and film-grade SFX, all locked to the voice.

> The methodology docs and recipe cards are written in Chinese — the toolkit is
> built Chinese-narration-first (mixed Chinese/English narration is fully
> supported). Agents read them natively.

## ✨ Highlights

- **Word-level voiceover sync, CPU only** — `scripts/timestamps_cpu.py` aligns
  your script to the audio (FireRedASR2-CTC int8 by default, faster-whisper as
  the zero-download fallback). Benchmarked against a GPU forced aligner on a
  110s mixed-language narration: median per-character offset 20–40 ms,
  worst case 200 ms, zero false QA flags. Every motion beat anchors to the
  exact word.
- **78 motion recipe cards** — each with intent, parameters, known pitfalls,
  and a runnable HTML preview (`open gallery/index.html`). Kinetic type, data
  shots, evidence tours, six motion-carry transitions, a long-take world
  canvas, host compositing, and more.
- **A 7-layer anti-slideshow system** — continuous camera curves, parallax
  planes, idle/yield lifecycle, breathing environment. Statically frozen
  frames are structurally impossible (and automatically detected if they
  slip through).
- **Layout discipline that survives review** — semantic-beat storyboarding,
  on-screen element budgets, whitespace anchors, pivot-sentence cut rules,
  and face safety zones measured by real detection
  (`scripts/face_bbox.py`), not by eye.
- **Triple-gate QA** — automated stillness detection, per-cue SFX energy
  verification on a solo track, and an independent-reviewer pass armed with
  anchor frames and burst triples that catch time-domain defects single
  frames can't show.

## 🚀 Quick start

**The most direct way: hand the repo link to your agent.**
In Claude Code / Codex or a similar agent, just say:

```text
Install this skill for me: https://github.com/Vincentwei1021/video-talkcraft
```

Or install with the [skills](https://skills.sh/) CLI / manually:

```bash
npx skills add Vincentwei1021/video-talkcraft
```

```bash
git clone https://github.com/Vincentwei1021/video-talkcraft.git
cd video-talkcraft
ln -s "$(pwd)" ~/.claude/skills/video-talkcraft   # Claude Code
# or
ln -s "$(pwd)" ~/.codex/skills/video-talkcraft    # Codex
```

Environment (the agent will set this up as needed):

- Node 18+ (Remotion render; `npm install` inside the per-video project)
- Python 3.10+ and `pip install zhconv pypinyin sherpa-onnx soundfile numpy`
  for the timestamp pipeline (first use downloads the 767 MB FireRedASR2-CTC
  model once — URLs in `scripts/timestamps_cpu.py`; or use
  `--backend whisper` to skip the manual download)
- ffmpeg

Then make requests like:

```text
Use video-talkcraft to turn this narration script + voiceover.wav into a video.
Make a 100-second explainer about <topic>; here is the script and the audio.
```

## 🎞 What you bring vs. what it does

| You bring (inputs) | The skill does |
| --- | --- |
| Narration script (numbers written out in Chinese characters) | Word-level timestamp alignment on CPU, with per-sentence QA flags |
| Finished voiceover — any TTS or human recording (voice synthesis is out of scope) | SHOTBOOK storyboarding: semantic beats, layer matrices, layout budgets |
| Optional host footage — green-screen or alpha WebM (digital-human generation is out of scope; CPU keying + face-zone tooling included) | Remotion implementation on four global systems (camera / parallax / yield / environment), transitions, SFX placement |
| Optional B-roll / screenshots | Render + triple-gate QA loop until clean, loudness-normalized delivery |

## 📦 What's included

| Content | Description |
| --- | --- |
| 78 motion recipe cards | Intent, energy, parameters, implementation notes, and known pitfalls — every card has a runnable HTML demo |
| Local gallery | `open gallery/index.html` — browse and autoplay all 78 previews, search by name/source |
| Motion systems | CameraRig, parallax planes, idle/yield lifecycle, environment layer, six transitions, long-take world canvas (`template/motion-systems/`) |
| Components | Plain-cut subtitles, flower-word titles, smash words, highlight sweeps, pencil draw, number rolls (`template/components/`) |
| CPU pipeline scripts | Word-level timestamps (2 ASR backends), face-zone detection, stillness check, SFX presence check, QA frame extraction (`scripts/`) |
| Methodology | Design language (Apple-paradigm default), shot design worksheets, cinematography rules, storyboard format, QA rubrics (`references/`) |
| Embedded SFX | Per-card sound cue tables with real samples embedded in the demo lib (licenses in `demos/_lib/sfx/ATTRIBUTION.md`) |

## 🗂 Repository structure

```text
video-talkcraft/
├── SKILL.md                    # Agent entry point: the 8-step pipeline and hard rules
├── references/
│   ├── design-language.md      # Default visual system (palette/type/layout/subtitles)
│   ├── shot-design.md          # 3-plane worksheet + 7 shot-type presets
│   ├── cinematography.md       # 7-layer model, transitions, layout budget, QA gates
│   ├── shotbook-example.md     # A full storyboard example
│   ├── cards/                  # 78 motion recipe cards
│   ├── taxonomy.md             # Card index by category and source
│   ├── broll-sources.md        # Attribution-free stock sources (APIs, license traps)
│   ├── host-footage.md         # Host footage: input spec, CPU keying, face safety zone
│   └── demo-spec.md            # Card/demo authoring spec
├── demos/                      # 78 runnable HTML previews (+ shared lib with embedded SFX)
├── gallery/                    # One-page local gallery
├── template/                   # Copy-paste Remotion motion systems and components
└── scripts/                    # CPU timestamps, face bbox, QA tooling
```

For the full workflow, start at [SKILL.md](SKILL.md).

## 📄 License

[PolyForm Noncommercial 1.0.0](LICENSE) — free for personal, educational, and
research use. **Any commercial use of the toolkit requires prior
authorization** — DM [@VincentWei93](https://x.com/VincentWei93) on X or open
a GitHub issue.

**Videos you produce with this skill belong to you.** If it helped, a mention
of the author's accounts in your video description is appreciated — and
entirely optional.

## 🔊 Audio and asset notes

- Embedded SFX samples: sources and licenses in
  [demos/_lib/sfx/ATTRIBUTION.md](demos/_lib/sfx/ATTRIBUTION.md).
- The B-roll sourcing guide only admits attribution-free stock (Pexels,
  Pixabay, Mixkit Free, Coverr, NASA) and documents the license traps of the
  ones it rejects — see
  [references/broll-sources.md](references/broll-sources.md).
- The demo host footage (`demos/_lib/dh-host.webm`) is an AI-generated
  presenter used as a placeholder; replace it with your own host footage in
  production.

## 🙏 Acknowledgements

- **[Remotion](https://www.remotion.dev/)** — the React video framework
  powering every render here (note its own
  [license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)).
- **[FireRedASR2](https://github.com/FireRedTeam/FireRedASR2S)** via
  **[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)** and
  **[faster-whisper](https://github.com/SYSTRAN/faster-whisper)** — the CPU
  timestamp backends; **Qwen3-ASR/ForcedAligner** served as the benchmarking
  reference.
- **OpenCV YuNet** — the face detector behind the face-safety-zone rule.
- **Pexels · Pixabay · NASA · Mixkit** — attribution-free asset sources.
- **Claude Code** — this library was built, iterated, and QA'd with an AI
  coding agent, using the same review loops the skill teaches.

## Follow me

<p>
  <a href="https://x.com/VincentWei93"><img alt="Follow Vincent on X" src="https://img.shields.io/badge/X-Follow_Me-000000?style=for-the-badge&logo=x&logoColor=white"></a>
  <a href="https://www.douyin.com/user/MS4wLjABAAAAK1pkjBxilk2Oi_9h_vFyD-lTAu9CTlvhmOtkosDvvxg"><img alt="Follow Vincent on Douyin" src="https://img.shields.io/badge/Douyin-Follow_Me-000000?style=for-the-badge&logo=tiktok&logoColor=white"></a>
  <a href="https://xhslink.cn/m/At9iP2d5C1V"><img alt="Follow Vincent on Red Note" src="https://img.shields.io/badge/Red_Note-Follow_Me-FF2442?style=for-the-badge&logo=xiaohongshu&logoColor=white"></a>
</p>

## ⭐ Star history

<a href="https://www.star-history.com/#Vincentwei1021/video-talkcraft&Date">
  <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Vincentwei1021/video-talkcraft&type=Date" width="600">
</a>
