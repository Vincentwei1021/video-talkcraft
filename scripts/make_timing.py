"""Convert timestamps.json (scripts/timestamps_cpu.py, or any aligner matching its schema) into timing.json for template/motion-systems/timing.ts.

timing.ts requires scenes[].chars to align 1:1 with every character of scenes[].text
(tSay does indexOf on text then indexes chars). The aligner outputs per-CJK-char and
per-latin-word tokens, skipping punctuation — this script re-expands to full text:
  - CJK char        -> its own token span
  - latin/digit run -> word token span, linearly interpolated per character
  - punctuation     -> zero-duration stamp at previous char's end

Usage: python3 make_timing.py <timestamps.json> <timing.json>
"""
import json
import re
import sys

src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src))

KEPT = re.compile(r"[一-鿿A-Za-z0-9']")


def clean(t):
    return "".join(ch for ch in t if KEPT.match(ch)).lower()


scenes = []
for s in d["sentences"]:
    tokens = [w for w in s["words"] if clean(w["text"])]
    chars = []
    ti = 0          # token index
    ci_in_tok = 0   # consumed cleaned chars within current token
    prev_end = s["start"]
    for ch in s["text"]:
        if KEPT.match(ch):
            if ti >= len(tokens):  # alignment ran short; pin to sentence end
                chars.append({"ch": ch, "t": prev_end, "e": prev_end})
                continue
            tok = tokens[ti]
            n = len(clean(tok["text"]))
            span = tok["end"] - tok["start"]
            t0 = tok["start"] + span * (ci_in_tok / max(n, 1))
            t1 = tok["start"] + span * ((ci_in_tok + 1) / max(n, 1))
            chars.append({"ch": ch, "t": round(t0, 3), "e": round(t1, 3)})
            prev_end = t1
            ci_in_tok += 1
            if ci_in_tok >= n:
                ti += 1
                ci_in_tok = 0
        else:
            chars.append({"ch": ch, "t": round(prev_end, 3), "e": round(prev_end, 3)})
    scenes.append(
        {
            "id": f"s{s['i'] + 1}",
            "text": s["text"],
            "startSec": s["start"],
            "durationSec": round(s["end"] - s["start"], 3),
            "chars": chars,
        }
    )

json.dump({"totalSec": d["total"], "scenes": scenes}, open(dst, "w"), ensure_ascii=False, indent=1)
print(f"wrote {dst}: {len(scenes)} scenes, {sum(len(s['chars']) for s in scenes)} chars")
