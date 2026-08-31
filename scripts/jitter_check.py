#!/usr/bin/env python3
"""关卡1.1 光栅抖动检测：静态区文字"随机抖/呼吸抖" = 多 tab 并发渲染的光栅化亚像素相位不一致。

病理（2026-08-30/31 两次实战确认）：`remotion render --concurrency=N`（N>1）时各 tab 光栅化
相位不一致，静态文字区的相邻帧差呈**严格周期 N 的振荡**（实测 conc=4：1.4→3.1→4.0→0.9 循环）；
`remotion still` 单进程抽帧 diff=0，所以必须量成片 mp4。交付渲染一律 --concurrency=1。

方法：自动在片内取若干 0.8s 窗（或 --window 指定），对帧间差序列去趋势（减 5 帧滑动均值）——
平滑真实运动去趋势后近零，光栅病残差 ±0.5 以上且反复出现。只判静止/慢速窗（raw mean<6，
快速运动窗病灶不可感知也测不准，跳过）。

用法：
  python3 scripts/jitter_check.py delivery.mp4                        # 自动每 ~18s 采样一窗
  python3 scripts/jitter_check.py delivery.mp4 --window 46,1100:80:140:205   # t秒,crop
判定：任一受判窗去趋势残差 |resid|>0.5 的帧数 ≥6（持续振荡）→ FAIL（exit 1）；
动画加速/减速斜坡只会给出 3~4 帧同号残差，不会误伤。
良品口径：--concurrency=1 渲染实测 osc_max <0.15；并发 4 病灶 osc_max 1.5~3。
"""
import glob
import os
import subprocess
import sys

import numpy as np

try:
    import imageio.v2 as iio
except ImportError:
    sys.exit("pip install imageio")

FRAMES = 26
DEFAULT_CROP = "1200:120:150:150"   # 标题带：本套版式大标题所在区域


def probe_duration(src):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", src], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def window_diffs(src, t, crop):
    tmp = "/tmp/jitter_check_win"
    os.makedirs(tmp, exist_ok=True)
    for f in glob.glob(f"{tmp}/*.png"):
        os.remove(f)
    subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", src, "-frames:v", str(FRAMES),
                    "-vf", f"crop={crop}", "-vsync", "0", f"{tmp}/%03d.png"], check=True)
    fr = [iio.imread(p).astype(np.float64) for p in sorted(glob.glob(f"{tmp}/*.png"))]
    if len(fr) < 10:
        return None
    return np.array([np.abs(fr[i + 1] - fr[i]).mean() for i in range(len(fr) - 1)])


def judge(d):
    ma = np.convolve(d, np.ones(5) / 5, mode="same")
    resid = d - ma
    # 瞬时爆点（切镜/元素砸入，raw>6）及其 ±2 帧不参与判定——病灶的签名是"小差值上的持续振荡"
    spike = d > 6.0
    near = spike.copy()
    for k in (1, 2):
        near |= np.roll(spike, k) | np.roll(spike, -k)
    r = resid[~near] if (~near).any() else resid
    # 振荡判据：残差须正负交替（lag-1 自相关 <0）。加速/减速的真实动画残差同号连片，不算病
    r1 = 0.0
    if len(r) > 6 and r.std() > 1e-6:
        r1 = float(np.corrcoef(r[:-1], r[1:])[0, 1])
    ra = np.abs(r)
    return d.mean(), (ra.max() if len(ra) else 0.0), int((ra > 0.5).sum()), r1


def main():
    src = sys.argv[1]
    windows = []
    args = sys.argv[2:]
    while args:
        if args[0] == "--window":
            t, _, crop = args[1].partition(",")
            windows.append((float(t), crop or DEFAULT_CROP))
            args = args[2:]
        else:
            args = args[1:]
    if not windows:
        dur = probe_duration(src)
        t = 3.0
        while t < dur - 3 and len(windows) < 12:
            windows.append((t, DEFAULT_CROP))
            t += 18.0

    fail = False
    for t, crop in windows:
        d = window_diffs(src, t, crop)
        if d is None:
            print(f"t={t:7.1f}s  抽帧不足，跳过")
            continue
        mean, osc, cnt, r1 = judge(d)
        if mean > 6.0:
            print(f"t={t:7.1f}s  raw_mean={mean:6.2f}  快速运动窗，跳过判定")
            continue
        bad = osc > 0.5 and cnt >= 6
        fail |= bad
        print(f"t={t:7.1f}s  raw_mean={mean:6.2f}  osc_max={osc:5.2f}  超阈帧={cnt:2d}  r1={r1:+.2f}  {'FAIL' if bad else 'ok'}")
    print("== JITTER", "FAIL：静态文字区周期振荡，用 --concurrency=1 重渲 ==" if fail else "PASS ==")
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
