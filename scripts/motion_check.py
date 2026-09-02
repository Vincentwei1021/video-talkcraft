"""画面健康检查（机器闸①）：一条命令、一支视频、两种判定。

A) 静止段（anti-PPT，ai-math-video SHOTBOOK 口径）：任意 1 秒采样不允许全静止——
   相机漂移 / idle 呼吸 / 环境层必须让每个静息帧活着。ffmpeg freezedetect 实现。

B) 并发光栅抖动（2026-08-30/31 两次实战确认）：`remotion render --concurrency=N`（N>1）时
   各 tab 光栅化亚像素相位不一致，静态文字区的相邻帧差呈**严格周期 N 的振荡**
   （实测 conc=4：1.4→3.1→4.0→0.9 循环）；`remotion still` 单进程抽帧 diff=0，必须量成片 mp4。
   方法：自动在片内取若干 0.8s 窗（或 --window 指定），帧间差去趋势（减 5 帧滑动均值）——
   平滑真实运动去趋势后近零；只判静止/慢速窗（raw mean<6）；瞬时爆点（raw>6，切镜/砸入）
   及其 ±2 帧不参与。判定：|resid|>0.5 的帧数 ≥6（持续振荡）→ FAIL；
   动画加速/减速斜坡只有 3~4 帧同号残差，不误伤。良品（conc=1）osc_max <0.15，病灶 1.5~3。
   FAIL 处方：--concurrency=1 重渲。

用法：
  python3 scripts/motion_check.py <video.mp4> [freeze_dur=0.8] [noise=0.003] [--window t,crop]... [--anchors anchors.json]
  --window 46,1100:80:140:205   # 指定抖动判定窗（t秒,crop=W:H:X:Y）；缺省每 ~18s 自动采样
  --anchors anchors.json        # 每个动效锚点 t+0.6s 再加一窗（锚点可带 "crop"），状态切换点不靠运气撞上
任一判定 FAIL → exit 1。

覆盖边界（诚实声明，独立评审 P1 修订）：B 只量它抽到的那些 0.87s 窗（缺省 ≤12 窗、间隔 18s、固定标题带裁剪），
快速运动窗还会跳过——窗与窗之间的短闪烁、非周期抖动、裁剪区外的抖动它看不见。所以它是"并发光栅病"的
专项闸，不是时域缺陷的全覆盖；状态切换点要靠 qa_extract 的连拍三帧（anchors "burst": true）给人眼看。
结尾会打印本次实际判定/跳过的窗数，别把 PASS 读成"全片无抖动"。
"""
import glob
import os
import re
import subprocess
import sys

FRAMES = 26
DEFAULT_CROP = "1200:120:150:150"   # 标题带：本套版式大标题所在区域


# ---------- A) 静止段 ----------

def check_freeze(video: str, dur: str, noise: str) -> bool:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", video, "-vf", f"freezedetect=n={noise}:d={dur}", "-an", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    starts = re.findall(r"freeze_start: ([\d.]+)", proc.stderr)
    ends = re.findall(r"freeze_end: ([\d.]+)", proc.stderr)
    if not starts:
        print(f"[静止] PASS: no static stretch >= {dur}s (noise={noise})")
        return False
    print(f"[静止] FAIL: {len(starts)} static stretch(es) >= {dur}s — add camera drift / idle / environment motion:")
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else "(video end)"
        print(f"  - {float(s):7.2f}s -> {e}s")
    return True


# ---------- B) 并发光栅抖动 ----------

def probe_duration(src):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", src], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def window_diffs(src, t, crop, np, iio):
    tmp = "/tmp/motion_check_win"
    os.makedirs(tmp, exist_ok=True)
    for f in glob.glob(f"{tmp}/*.png"):
        os.remove(f)
    subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", src, "-frames:v", str(FRAMES),
                    "-vf", f"crop={crop}", "-vsync", "0", f"{tmp}/%03d.png"], check=True)
    fr = [iio.imread(p).astype(np.float64) for p in sorted(glob.glob(f"{tmp}/*.png"))]
    if len(fr) < 10:
        return None
    return np.array([np.abs(fr[i + 1] - fr[i]).mean() for i in range(len(fr) - 1)])


def judge(d, np):
    ma = np.convolve(d, np.ones(5) / 5, mode="same")
    resid = d - ma
    # 瞬时爆点（切镜/元素砸入，raw>6）及其 ±2 帧不参与判定——病灶的签名是"小差值上的持续振荡"
    spike = d > 6.0
    near = spike.copy()
    for k in (1, 2):
        near |= np.roll(spike, k) | np.roll(spike, -k)
    r = np.abs(resid[~near]) if (~near).any() else np.abs(resid)
    return d.mean(), (r.max() if len(r) else 0.0), int((r > 0.5).sum())


def check_jitter(video: str, windows, anchor_windows=()) -> bool:
    try:
        import numpy as np
        import imageio.v2 as iio
    except ImportError:
        sys.exit("pip install numpy imageio（抖动判定依赖）")
    dur = probe_duration(video)
    if not windows:
        t = 3.0
        while t < dur - 3 and len(windows) < 12:
            windows.append((t, DEFAULT_CROP))
            t += 18.0
    # 锚点窗叠加在缺省/指定窗之上（不是替代）：状态切换点不靠 18s 采样运气撞上
    windows = sorted(set(windows) | {w for w in anchor_windows if 0 <= w[0] < dur - 1})
    fail = False
    n_ok = n_fast = n_short = 0
    for t, crop in windows:
        d = window_diffs(video, t, crop, np, iio)
        if d is None:
            n_short += 1
            print(f"[抖动] t={t:7.1f}s  抽帧不足，跳过")
            continue
        mean, osc, cnt = judge(d, np)
        if mean > 6.0:
            n_fast += 1
            print(f"[抖动] t={t:7.1f}s  raw_mean={mean:6.2f}  快速运动窗，跳过判定")
            continue
        n_ok += 1
        bad = osc > 0.5 and cnt >= 6
        fail |= bad
        print(f"[抖动] t={t:7.1f}s  raw_mean={mean:6.2f}  osc_max={osc:5.2f}  超阈帧={cnt:2d}  {'FAIL' if bad else 'ok'}")
    covered = n_ok * FRAMES / 30.0
    print(f"[抖动] 覆盖：判定 {n_ok} 窗 ≈ {covered:.1f}s / 片长 {dur:.1f}s（{100 * covered / max(dur, 1e-6):.0f}%），"
          f"快速运动窗跳过 {n_fast}，抽帧不足 {n_short}——窗外时段不在本闸内（状态切换点看 qa_extract 连拍）")
    print("[抖动]", "FAIL：静态文字区周期振荡=并发光栅病，用 --concurrency=1 重渲" if fail else "PASS（仅限上述窗）")
    return fail


def main():
    video = sys.argv[1]
    rest = sys.argv[2:]
    windows, anchor_windows, pos = [], [], []
    i = 0
    while i < len(rest):
        if rest[i] == "--window":
            t, _, crop = rest[i + 1].partition(",")
            windows.append((float(t), crop or DEFAULT_CROP))
            i += 2
        elif rest[i] == "--anchors":
            import json
            with open(rest[i + 1]) as fh:
                for a in json.load(fh):
                    anchor_windows.append((round(float(a["t"]) + 0.6, 2), a.get("crop") or DEFAULT_CROP))
            i += 2
        else:
            pos.append(rest[i])
            i += 1
    dur = pos[0] if len(pos) > 0 else "0.8"
    noise = pos[1] if len(pos) > 1 else "0.003"

    fail = check_freeze(video, dur, noise)
    fail |= check_jitter(video, windows, anchor_windows)
    print("== 画面健康", "FAIL ==" if fail else "PASS ==")
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
