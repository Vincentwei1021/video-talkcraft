"""Extract QA frames from a rendered narration video.

基础：每句 2 帧（入场 + 收束）。
可选第 5 参 anchors.json：额外抽「动效锚点帧」与「连拍三帧对」——
  [{"t": 23.76, "label": "everything-slam"}, ...]
  每个锚点抽 t+0.25s 的定妆帧（动效刚到位的样子，不是入场中间态），
  外加 t+0.6s 起的连拍三帧（间隔 1 帧）给评审判「非有意抖动/闪烁」：
  三帧肉眼应当只有设计内的连续运动，出现来回振荡/纹理爬行即为缺陷。

Usage: python3 qa_extract.py <video.mp4> <timestamps.json> <outdir> [scale_w] [anchors.json]
"""
import json
import subprocess
import sys
from pathlib import Path

video, tsfile, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
scale_w = int(sys.argv[4]) if len(sys.argv) > 4 else 540
anchors = json.load(open(sys.argv[5])) if len(sys.argv) > 5 else []
Path(outdir).mkdir(parents=True, exist_ok=True)


def grab(t: float, out: str) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", video,
         "-frames:v", "1", "-vf", f"scale={scale_w}:-1", out],
        check=True,
    )
    print(out)


d = json.load(open(tsfile))
sents = d["sentences"]
for s in sents:
    dur = s["end"] - s["start"]
    picks = {"a": s["start"] + min(1.3, dur * 0.3), "b": s["start"] + dur * 0.8}
    for tag, t in picks.items():
        grab(t, f"{outdir}/s{s['i']:02d}{tag}_{t:.1f}s.png")

n_anchor = 0
for a in anchors:
    t, label = a["t"], a.get("label", f"{a['t']:.1f}")
    grab(t + 0.25, f"{outdir}/fx-{label}_{t + 0.25:.2f}s.png")  # 定妆帧
    for k in range(3):  # 连拍三帧（判抖动：设计外的来回振荡/纹理爬行）
        tt = t + 0.6 + k / 30
        grab(tt, f"{outdir}/burst-{label}_{k}.png")
    n_anchor += 4

print("done:", len(sents) * 2 + n_anchor, "frames")
