"""画面健康检查（机器闸①）：一条命令、一支视频、两种判定。

A) 静止段（anti-PPT，ai-math-video SHOTBOOK 口径）：任意 1 秒采样不允许全静止——
   场景相机的极缓推进 / 拉出必须让每个静息帧活着（2026-09-04 起不再要求 idle / 环境呼吸）。ffmpeg freezedetect 实现。

B) 并发光栅抖动（2026-08-30/31 两次实战确认）：`remotion render --concurrency=N`（N>1）时
   各 tab 光栅化亚像素相位不一致，静态文字区的相邻帧差呈**严格周期 N 的振荡**
   （实测 conc=4：1.4→3.1→4.0→0.9 循环）；`remotion still` 单进程抽帧 diff=0，必须量成片 mp4。
   方法：自动在片内取若干 0.8s 窗（或 --window 指定），帧间差去趋势（减 5 帧滑动均值）——
   平滑真实运动去趋势后近零；只判静止/慢速窗（raw mean<6）；瞬时爆点（raw>6，切镜/砸入）
   及其 ±2 帧不参与。判定：|resid|>0.5 的帧数 ≥6（持续振荡）→ FAIL；
   动画加速/减速斜坡只有 3~4 帧同号残差，不误伤。良品（conc=1）osc_max <0.15，病灶 1.5~3。
   FAIL 处方：--concurrency=1 重渲。

   **抖动自动归因（2026-09-06）**：同一窗先查重复帧签名（frame_signature.py：近零帧差呈严格周期 N——
   25fps 人物素材混进 30fps 成片 = 每 6 帧一次 0 差），命中即报"重复帧 → 查源片帧率/CFR（preflight.py）"，
   **不再**一律归给并发光栅——两种病签名不同（重复帧 = 周期性掉到 0；并发 = 非零值上来回摆），处方也不同。
   `--baseline <源人物素材>`：同窗同判据再量一遍源片，输出"成片 X / 源片 Y"——源片自己就带的噪声不算渲染引入，
   该窗降为 WARN（2026-09-06 复盘：121 个报警窗里 114 个是素材自带噪声，此前只能靠人手工把闸跑到源片上才判得出）。

用法：
  python3 scripts/motion_check.py <video.mp4> [freeze_dur=0.8] [noise=0.003] [--window t,crop]... [--anchors anchors.json]
        [--baseline host.webm [--baseline-crop W:H:X:Y] [--baseline-offset 秒]]
  --window 46,1100:80:140:205   # 指定抖动判定窗（t秒,crop=W:H:X:Y）；缺省每 ~18s 自动采样
  --anchors anchors.json        # 每个动效锚点 t+0.6s 再加一窗（锚点可带 "crop"），状态切换点不靠运气撞上
  --baseline host.webm          # 对照源片：成片 t 对应源片 t−offset（人物素材从成片 0s 起播时 offset=0），源片默认量全幅
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from frame_signature import dup_signature, frame_diffs, noise_floor  # noqa: E402

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


def probe_fps(src):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                          "-of", "csv=p=0", src], capture_output=True, text=True, check=True).stdout.strip().rstrip(",")
    a, _, b = out.partition("/")
    return float(a) / float(b or 1)


def check_jitter(video: str, windows, anchor_windows=(), baseline=None, baseline_crop=None, baseline_offset=0.0) -> bool:
    try:
        import numpy as np
        import imageio.v2 as iio
    except ImportError:
        sys.exit("pip install numpy imageio（抖动判定依赖）")
    dur = probe_duration(video)
    fps = probe_fps(video)
    if not windows:
        t = 3.0
        while t < dur - 3 and len(windows) < 12:
            windows.append((t, DEFAULT_CROP))
            t += 18.0
    # 锚点窗叠加在缺省/指定窗之上（不是替代）：状态切换点不靠 18s 采样运气撞上
    windows = sorted(set(windows) | {w for w in anchor_windows if 0 <= w[0] < dur - 1})
    fail_osc = fail_dup = False
    n_ok = n_fast = n_short = n_src = 0
    for t, crop in windows:
        d = window_diffs(video, t, crop, np, iio)
        if d is None:
            n_short += 1
            print(f"[抖动] t={t:7.1f}s  抽帧不足，跳过")
            continue
        # ① 重复帧签名先查：命中就是素材帧率问题，不进并发判据
        dup = dup_signature(d, fps)
        if dup.found:
            fail_dup = True
            print(f"[抖动] t={t:7.1f}s  raw_mean={d.mean():6.2f}  重复帧签名：周期 {dup.period}（近零 {dup.near_zero}/{dup.total}）"
                  f"⇒ 源真实 fps ≈ {dup.implied_src_fps:.1f}  FAIL(重复帧)")
            continue
        mean, osc, cnt = judge(d, np)
        if mean > 6.0:
            n_fast += 1
            print(f"[抖动] t={t:7.1f}s  raw_mean={mean:6.2f}  快速运动窗，跳过判定")
            continue
        n_ok += 1
        bad = osc > 0.5 and cnt >= 6
        tag = "FAIL" if bad else "ok"
        extra = ""
        # ② 对照源片：同 t（减 offset）、同判据；源片噪声不低于成片 80% → 素材自带，不算渲染引入
        if bad and baseline:
            bt = t - baseline_offset
            bd = frame_diffs(baseline, bt, FRAMES, baseline_crop, width=None) if bt >= 0 else None
            if bd is not None:
                bmean, bosc, bcnt = judge(bd, np)
                bdup = dup_signature(bd, probe_fps(baseline))
                extra = f"  | 源片 osc_max={bosc:5.2f} 超阈={bcnt:2d} noise={noise_floor(bd):.2f}"
                if bdup.found:
                    extra += f" 源片自带重复帧(周期 {bdup.period})"
                if bosc >= 0.8 * osc:
                    bad = False
                    n_src += 1
                    tag = "WARN(素材自带)"
            else:
                extra = "  | 源片该时刻抽帧不足"
        fail_osc |= bad
        print(f"[抖动] t={t:7.1f}s  raw_mean={mean:6.2f}  osc_max={osc:5.2f}  超阈帧={cnt:2d}  {tag}{extra}")
    covered = n_ok * FRAMES / 30.0
    print(f"[抖动] 覆盖：判定 {n_ok} 窗 ≈ {covered:.1f}s / 片长 {dur:.1f}s（{100 * covered / max(dur, 1e-6):.0f}%），"
          f"快速运动窗跳过 {n_fast}，抽帧不足 {n_short}"
          + (f"，源片自带噪声 {n_src} 窗" if baseline else "")
          + "——窗外时段不在本闸内（状态切换点看 qa_extract 连拍）")
    verdicts = []
    if fail_dup:
        verdicts.append("FAIL(重复帧)：人物区周期性近零帧差=素材帧率≠成片帧率或源片已含重复帧——不是并发光栅，"
                        "--concurrency=1 治不了；按 preflight.py 处方（成片 fps 改成素材 fps / 光流补帧 / 源头重出）")
    if fail_osc:
        verdicts.append("FAIL(并发光栅)：静态文字区非零值周期振荡，用 --concurrency=1 重渲"
                        + ("" if baseline else "（未给 --baseline，无法排除素材自带噪声）"))
    print("[抖动]", "；".join(verdicts) if verdicts else "PASS（仅限上述窗）")
    return fail_dup or fail_osc


def main():
    video = sys.argv[1]
    rest = sys.argv[2:]
    windows, anchor_windows, pos = [], [], []
    baseline, baseline_crop, baseline_offset = None, None, 0.0
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
        elif rest[i] == "--baseline":
            baseline = rest[i + 1]
            i += 2
        elif rest[i] == "--baseline-crop":
            baseline_crop = rest[i + 1]
            i += 2
        elif rest[i] == "--baseline-offset":
            baseline_offset = float(rest[i + 1])
            i += 2
        else:
            pos.append(rest[i])
            i += 1
    dur = pos[0] if len(pos) > 0 else "0.8"
    noise = pos[1] if len(pos) > 1 else "0.003"

    fail = check_freeze(video, dur, noise)
    fail |= check_jitter(video, windows, anchor_windows, baseline, baseline_crop, baseline_offset)
    print("== 画面健康", "FAIL ==" if fail else "PASS ==")
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
