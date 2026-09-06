"""帧差签名（preflight.py 与 motion_check.py 共用的一小块）：一支视频的一段时间窗 → 相邻帧差序列 → 三种签名。

为什么单独成文件：同一个"重复帧"病灶要在两个时刻被同一把尺量——
  ③ 素材期在**源片**上量（preflight，开工前拦住），⑥⑦ 在**成片**上量（motion_check --baseline，对照源片分清
  "渲染引入"还是"素材自带"）。两处各写一套判据必然漂移，所以判据只在这里定义一次。

三种签名（输入都是相邻帧平均绝对差序列 d，0~255 标尺）：
  dup   重复帧：d 中周期性出现"近零"帧（25fps 混进 30fps 容器 = 每 6 帧一次 0 差，周期 N ⇒ 源真实 fps ≈ fps·(N−1)/N）。
        判据：近零帧数 ≥3、占比 5%~50%、相邻近零帧间隔的众数 N 覆盖 ≥70% 的间隔。全静止窗（近零占比 >50%）不算重复帧。
  osc   周期振荡（并发光栅病，motion_check 原判据）：去趋势残差 |resid|>0.5 的帧 ≥6——**没有**近零帧，是"非零值上的来回摆"。
  noise 底噪：d 的中位数，用来对照"成片 vs 源片"——源片自己就带 1.5 的噪，成片 1.6 就不是渲染的锅。

CLI（临时手查用）：python3 scripts/frame_signature.py <video> [--t 3] [--frames 60] [--crop W:H:X:Y]
"""
from __future__ import annotations

import json
import subprocess
import sys
from collections import Counter
from dataclasses import asdict, dataclass

NEAR_ZERO = 0.15  # 0~255 标尺的绝对底线；实际阈值取 max(NEAR_ZERO, 8% × 中位差)——原分辨率噪声更大，相对阈才稳


def probe(video: str) -> dict:
    """ffprobe：帧率（r/avg）、宽高、时长、帧数。avg 与 r 不等 = VFR 或丢帧。"""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,codec_name,pix_fmt",
         "-show_entries", "format=duration", "-of", "json", video],
        capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    s = j["streams"][0]

    def fr(x: str) -> float:
        a, _, b = x.partition("/")
        return float(a) / float(b or 1) if float(b or 1) else 0.0

    return {
        "width": int(s["width"]), "height": int(s["height"]),
        "r_fps": fr(s["r_frame_rate"]), "avg_fps": fr(s["avg_frame_rate"]),
        "duration": float(j["format"].get("duration") or 0.0),
        "nb_frames": int(s["nb_frames"]) if str(s.get("nb_frames", "N/A")).isdigit() else None,
        "codec": s.get("codec_name"), "pix_fmt": s.get("pix_fmt"),
    }


def frame_diffs(video: str, t: float, frames: int, crop: str | None = None, width: int | None = 320):
    """抽 `frames` 帧灰度图（管道 rawvideo，不落盘）→ 相邻帧平均绝对差。返回 numpy 数组或 None（帧不够）。
    width=320 缩到小图（签名判定够用、快 10 倍）；width=None 保持原分辨率（motion_check 的 osc 阈值按原分辨率标定）。"""
    import numpy as np
    vf = []
    if crop:
        vf.append(f"crop={crop}")
    if width:
        vf.append(f"scale={width}:-2:flags=area")
    vf.append("format=gray")
    proc = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", str(frames),
         "-vf", ",".join(vf), "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        capture_output=True, check=True)
    raw = np.frombuffer(proc.stdout, dtype=np.uint8)
    if crop:
        cw, ch = (int(x) for x in crop.split(":")[:2])
    else:
        p = probe(video)
        cw, ch = p["width"], p["height"]
    if width:
        h = int(round(ch * width / cw))
        h += h % 2   # scale=-2 取偶
    else:
        width, h = cw, ch
    per = width * h
    n = len(raw) // per
    if n < 10:
        return None
    fr = raw[: n * per].reshape(n, h, width).astype(np.float64)
    return np.abs(fr[1:] - fr[:-1]).mean(axis=(1, 2))


@dataclass
class DupSignature:
    found: bool
    period: int = 0
    near_zero: int = 0
    total: int = 0
    coverage: float = 0.0     # 众数间隔覆盖比例
    implied_src_fps: float = 0.0


def dup_signature(d, fps: float) -> DupSignature:
    import numpy as np
    d = np.asarray(d, dtype=np.float64)
    total = len(d)
    thr = max(NEAR_ZERO, 0.08 * float(np.median(d))) if total else NEAR_ZERO
    idx = np.flatnonzero(d < thr)
    nz = len(idx)
    if nz < 3 or total == 0:
        return DupSignature(False, 0, nz, total)
    ratio = nz / total
    if not (0.05 <= ratio <= 0.5):
        return DupSignature(False, 0, nz, total)
    gaps = np.diff(idx)
    if len(gaps) == 0:
        return DupSignature(False, 0, nz, total)
    mode, cnt = Counter(int(g) for g in gaps).most_common(1)[0]
    cov = cnt / len(gaps)
    if mode < 2 or cov < 0.7:
        return DupSignature(False, 0, nz, total, cov)
    return DupSignature(True, mode, nz, total, cov, fps * (mode - 1) / mode)


def osc_signature(d, spike: float = 6.0, thresh: float = 0.5):
    """motion_check 原判据：5 帧滑动均值去趋势，爆点 ±2 帧不参与。返回 (raw_mean, osc_max, 超阈帧数)。"""
    import numpy as np
    d = np.asarray(d, dtype=np.float64)
    ma = np.convolve(d, np.ones(5) / 5, mode="same")
    resid = d - ma
    sp = d > spike
    near = sp.copy()
    for k in (1, 2):
        near |= np.roll(sp, k) | np.roll(sp, -k)
    r = np.abs(resid[~near]) if (~near).any() else np.abs(resid)
    return float(d.mean()), (float(r.max()) if len(r) else 0.0), int((r > thresh).sum())


def noise_floor(d) -> float:
    import numpy as np
    return float(np.median(np.asarray(d, dtype=np.float64)))


def describe(video: str, t: float, frames: int, crop: str | None = None) -> dict:
    p = probe(video)
    d = frame_diffs(video, t, frames, crop)
    if d is None:
        return {"probe": p, "ok": False}
    dup = dup_signature(d, p["r_fps"])
    mean, osc, cnt = osc_signature(d)
    return {"probe": p, "ok": True, "n": len(d), "raw_mean": mean, "osc_max": osc, "osc_count": cnt,
            "noise": noise_floor(d), "dup": asdict(dup), "diffs": [round(float(x), 3) for x in d]}


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    video = a[0]
    t = float(a[a.index("--t") + 1]) if "--t" in a else 3.0
    frames = int(a[a.index("--frames") + 1]) if "--frames" in a else 60
    crop = a[a.index("--crop") + 1] if "--crop" in a else None
    r = describe(video, t, frames, crop)
    p = r["probe"]
    print(f"{video}: {p['width']}x{p['height']} r={p['r_fps']:.3f} avg={p['avg_fps']:.3f} dur={p['duration']:.2f}s")
    if not r["ok"]:
        sys.exit("帧不够")
    print(f"t={t}s frames={r['n'] + 1} crop={crop or 'full'}  raw_mean={r['raw_mean']:.2f} noise={r['noise']:.2f} "
          f"osc_max={r['osc_max']:.2f} 超阈={r['osc_count']}")
    dup = r["dup"]
    if dup["found"]:
        print(f"重复帧签名：周期 {dup['period']}，近零 {dup['near_zero']}/{dup['total']}，覆盖 {dup['coverage']:.0%}，"
              f"⇒ 源真实 fps ≈ {dup['implied_src_fps']:.2f}")
    else:
        print(f"无重复帧签名（近零 {dup['near_zero']}/{dup['total']}）")
    print("diffs:", " ".join(f"{x:.2f}" for x in r["diffs"]))
