"""Extract QA frames from a rendered narration video.

基础：每句 2 帧（入场 + 收束）。
可选第 5 参 anchors.json：额外抽「动效锚点帧」——
  [{"t": 23.76, "label": "everything-slam"}, ...]
  每个锚点抽 t+0.25s 的定妆帧（动效刚到位的样子，不是入场中间态）。
连拍三帧对：锚点 t+0.6s 起间隔 1 帧抽 3 张，给评审判「非有意抖动/闪烁」——三帧肉眼应当只有
  设计内的连续运动，出现来回振荡/纹理爬行即为缺陷。
  默认策略（2026-09-02 定版，独立评审 P1 修订）：只对 anchors.json 里标了 "burst": true 的锚点抽——
  状态切换（两态翻转/换场/砸入落位）和高风险区域**必须**标，其余锚点只抽定妆帧。
  --bursts    全部锚点都抽（抖动闸报警需人眼定位病灶时用）
  --no-bursts 一张不抽
  为什么不默认全抽：连拍占评审材料 2/3（430 帧里 270 张，2026-09-01 竖屏版实测）却极少产出新缺陷。
  为什么不能全靠 motion_check：它只在 ≤12 个、间隔 18s 的固定裁剪窗里量光栅抖动、快速运动窗还会跳过，
  窗与窗之间的短闪烁/非周期抖动它看不见——状态切换点的连拍是人眼的最后一道闸，不是可选项。

Usage: python3 qa_extract.py <video.mp4> <timestamps.json> <outdir> [scale_w] [anchors.json] [--bursts|--no-bursts]
anchors.json: [{"t": 23.76, "label": "everything-slam", "burst": true}, ...]
"""
import json
import subprocess
import sys
from pathlib import Path

argv = [a for a in sys.argv[1:] if a not in ("--bursts", "--no-bursts")]
bursts_all = "--bursts" in sys.argv
bursts_none = "--no-bursts" in sys.argv

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
n_burst = 0
for a in anchors:
    t, label = a["t"], a.get("label", f"{a['t']:.1f}")
    grab(t + 0.25, f"{outdir}/fx-{label}_{t + 0.25:.2f}s.png")  # 定妆帧
    n_anchor += 1
    if bursts_all or (not bursts_none and bool(a.get("burst"))):
        for k in range(3):  # 连拍三帧（判抖动：设计外的来回振荡/纹理爬行）
            tt = t + 0.6 + k / 30
            grab(tt, f"{outdir}/burst-{label}_{k}.png")
        n_anchor += 3
        n_burst += 1

print("done:", len(sents) * 2 + n_anchor, "frames;", f"连拍 {n_burst}/{len(anchors)} 锚点")
if anchors and n_burst == 0 and not bursts_none:
    print('WARN: anchors.json 没有任何 "burst": true 标记——状态切换/高风险锚点应标，否则时域缺陷只剩 motion_check 的稀疏窗在看',
          file=sys.stderr)
