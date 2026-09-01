"""Extract QA frames from a rendered narration video.

基础：每句 2 帧（入场 + 收束）。
可选第 5 参 anchors.json：额外抽「动效锚点帧」——
  [{"t": 23.76, "label": "everything-slam"}, ...]
  每个锚点抽 t+0.25s 的定妆帧（动效刚到位的样子，不是入场中间态）。
--bursts（默认关，2026-09-02 起）：每锚点再抽 t+0.6s 起连拍三帧（间隔 1 帧），
  给评审判「非有意抖动/闪烁」——三帧肉眼应当只有设计内的连续运动，
  出现来回振荡/纹理爬行即为缺陷。默认关的原因：时域抖动已由
  motion_check.py 的并发光栅判定机器化覆盖，连拍帧占评审材料 2/3 的量
  （430 帧里 270 张，2026-09-01 竖屏版实测）却极少产出新缺陷；
  只在抖动闸报警、需要人眼定位病灶时开。

Usage: python3 qa_extract.py <video.mp4> <timestamps.json> <outdir> [scale_w] [anchors.json] [--bursts]
"""
import json
import subprocess
import sys
from pathlib import Path

argv = [a for a in sys.argv[1:] if a != "--bursts"]
bursts = "--bursts" in sys.argv

video, tsfile, outdir = argv[0], argv[1], argv[2]
scale_w = int(argv[3]) if len(argv) > 3 else 540
anchors = json.load(open(argv[4])) if len(argv) > 4 else []
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
    n_anchor += 1
    if bursts:
        for k in range(3):  # 连拍三帧（判抖动：设计外的来回振荡/纹理爬行）
            tt = t + 0.6 + k / 30
            grab(tt, f"{outdir}/burst-{label}_{k}.png")
        n_anchor += 3

print("done:", len(sents) * 2 + n_anchor, "frames")
