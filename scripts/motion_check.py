"""Anti-PPT motion check: flag near-static stretches in a rendered video.

Acceptance rule (from ai-math-video SHOTBOOK): no fully-static frame window
at any 1-second sampling — camera drift / idle breathing / environment must
keep every resting frame alive.

Usage: python3 motion_check.py <video.mp4> [freeze_dur=0.8] [noise=0.003]
Exit code 1 if any freeze segment found.
"""
import re
import subprocess
import sys

video = sys.argv[1]
dur = sys.argv[2] if len(sys.argv) > 2 else "0.8"
noise = sys.argv[3] if len(sys.argv) > 3 else "0.003"

proc = subprocess.run(
    ["ffmpeg", "-hide_banner", "-i", video, "-vf", f"freezedetect=n={noise}:d={dur}", "-an", "-f", "null", "-"],
    capture_output=True,
    text=True,
)
log = proc.stderr
starts = re.findall(r"freeze_start: ([\d.]+)", log)
ends = re.findall(r"freeze_end: ([\d.]+)", log)

if not starts:
    print(f"PASS: no static stretch >= {dur}s (noise={noise})")
    sys.exit(0)

print(f"FAIL: {len(starts)} static stretch(es) >= {dur}s — add camera drift / idle / environment motion:")
for i, s in enumerate(starts):
    e = ends[i] if i < len(ends) else "(video end)"
    print(f"  - {float(s):7.2f}s -> {e}s")
sys.exit(1)
