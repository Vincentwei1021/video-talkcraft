"""静止探针（⑤ 实现后、⑥ 母版前；零母版成本）：用真实合成画面预判 freezedetect 闸，不渲一帧母版。

为什么存在（2026-09-06 复盘）：静止闸（motion_check freezedetect n=0.003 d=0.8）此前只能在整片母版渲完后才知道结果，
一次 10~20 分钟；本次 6 个母版里 v4 就是被"S06 头像章过不了静止闸"推翻的。可"这一镜静息帧到底动不动"只取决于
合成本身：用 render_stills 渲每镜几个时点的 **两帧**，按 freezedetect 同款度量算差，就是闸在那一段看到的数——
15 镜 × 3 点 × 2 帧 = 90 张静帧，实测 ~2 分钟（v4 工程）。beat_gap_check 是从节拍表推算（看不见持续运动），本探针量的是像素。

度量按 freezedetect 复刻（2026-09-06 合成片校准）：
  - **不是相邻两帧**。freezedetect 拿一个参考帧和其后 d 秒内的每一帧比，所以取 f 与 f + d·fps（0.8s = 24 帧）两帧——
    相机极缓推拉每帧只动 0.2 灰度值，相邻帧差看着像静止，24 帧后累积到 5 就不是；首版用相邻帧在 v4 上误报 23/45 点。
  - 度量 = yuv420p 三平面字节平均绝对差（Y+U+V 一起算、除以 1.5·W·H），判静止的阈 = 255 × noise（n=0.003 → 0.765）。
    合成无损片实测：mafd 落在阈两侧时 freezedetect 判定随之翻转。
  - 母版 h264 解码帧差与原始帧差几乎相等（v4 45 点比值中位 1.1），编码噪声不是变量。
  仍是单点采样：freeze 可能从采样点之后才开始，3 点/镜是粗筛不是全覆盖；探针报"静止候选"的点，母版几乎必被闸抓。

用法（在工程 remotion/ 目录执行）：
  python3 <skill>/scripts/freeze_probe.py --shots shots.json [--points 3] [--noise 0.003] [--freeze-dur 0.8] [--scale 1]
      [--browser <chrome-headless-shell>] [--entry src/entry.ts] [--comp id] [--props @props.json]
      [--against out/vN.mp4]      # 实验/校准用：对照已渲母版的 freezedetect 结果，打印一致率
  每镜在 25% / 50% / 75%（避开两端 lead/tail 交叠）各取 (f, f+span) 一对；mafd ≤ 255·noise 判"静止候选"。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))


def run_stills(frames: list[int], out: str, a) -> tuple[float, float]:
    cmd = ["node", os.path.join(HERE, "render_stills.mjs"), "--frames", ",".join(map(str, frames)), "--out", out,
           "--prefix", "p", "--entry", a.entry]
    if a.scale:
        cmd += ["--scale", str(a.scale)]
    if a.browser:
        cmd += ["--browser", a.browser]
    if a.comp:
        cmd += ["--comp", a.comp]
    if a.props:
        cmd += ["--props", a.props]
    t0 = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f"render_stills 失败：\n{proc.stdout}\n{proc.stderr}")
    m = re.search(r"@(\d+(?:\.\d+)?)fps", proc.stdout)
    fps = float(m.group(1)) if m else 30.0
    return fps, time.time() - t0


def yuv420(png: str):
    """PNG → yuv420p 原始字节（与 freezedetect 看到的平面一致）。"""
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", png, "-pix_fmt", "yuv420p", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).astype(np.float64)


def pair_mafd(p0: str, p1: str) -> float:
    """freezedetect 的 mafd：三平面字节平均绝对差（0~255 标尺）。判静止：mafd ≤ 255·noise。"""
    import numpy as np
    a, b = yuv420(p0), yuv420(p1)
    n = min(len(a), len(b))
    return float(np.abs(a[:n] - b[:n]).mean())


def freeze_intervals(video: str, noise: float, dur: float) -> list[tuple[float, float]]:
    proc = subprocess.run(["ffmpeg", "-hide_banner", "-i", video, "-vf", f"freezedetect=n={noise}:d={dur}", "-an", "-f", "null", "-"],
                          capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", proc.stderr)]
    ends = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", proc.stderr)]
    return [(s, ends[i] if i < len(ends) else 1e9) for i, s in enumerate(starts)]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--shots", default="shots.json")
    ap.add_argument("--points", type=int, default=3)
    ap.add_argument("--noise", type=float, default=0.003)
    ap.add_argument("--scale", type=float, default=1.0, help="静帧缩放；<1 会平均掉噪声让 mafd 偏小（多报），校准口径是 1")
    ap.add_argument("--browser", default=None)
    ap.add_argument("--entry", default="src/entry.ts")
    ap.add_argument("--comp", default=None)
    ap.add_argument("--props", default=None)
    ap.add_argument("--fps", type=float, default=None, help="缺省从 render_stills 日志读 composition fps")
    ap.add_argument("--against", default=None, help="已渲母版：对照 freezedetect 结果算一致率（实验/校准）")
    ap.add_argument("--freeze-dur", type=float, default=0.8)
    a = ap.parse_args()

    shots = json.load(open(a.shots))
    fps_guess = a.fps or 30.0
    thr = 255.0 * a.noise   # freezedetect：mafd ≤ 255·noise 判 frozen（合成片校准）

    def plan(fps: float):
        span = max(1, int(round(a.freeze_dur * fps)))
        pts = []
        for s in shots:
            dur = s["end"] - s["start"]
            for k in range(a.points):
                frac = (k + 1) / (a.points + 1)
                t = s["start"] + dur * frac
                f = int(round(t * fps))
                # 配对帧不越过镜尾（越过就把 f 往前挪）
                f = min(f, int(round(s["end"] * fps)) - span - 1)
                pts.append({"id": s["id"], "t": round(f / fps, 3), "f": f, "f2": f + span})
        return pts

    pts = plan(fps_guess)
    frames = sorted({f for p in pts for f in (p["f"], p["f2"])})
    out = tempfile.mkdtemp(prefix="freeze_probe_")
    t_all = time.time()
    fps, t_render = run_stills(frames, out, a)
    if abs(fps - fps_guess) > 1e-6:   # 猜错 fps：按真实 fps 重算帧号再渲一次
        pts = plan(fps)
        frames = sorted({f for p in pts for f in (p["f"], p["f2"])})
        fps, t_render = run_stills(frames, out, a)

    ivs = freeze_intervals(a.against, a.noise, a.freeze_dur) if a.against else None
    agree = {"tp": 0, "fp": 0, "fn": 0, "tn": 0}
    by_shot: dict[str, list] = {}
    for p in pts:
        d = pair_mafd(os.path.join(out, f"pf{p['f']}.png"), os.path.join(out, f"pf{p['f2']}.png"))
        p["diff"] = d
        p["static"] = d <= thr
        by_shot.setdefault(p["id"], []).append(p)
        if ivs is not None:
            t_end = p["f2"] / fps
            actual = any(s <= p["t"] and t_end <= e + 1e-6 for s, e in ivs)   # 整段 [f, f2] 落在某个 freeze 区间内
            p["actual"] = actual
            agree[("tp" if actual else "fp") if p["static"] else ("fn" if actual else "tn")] += 1

    n_warn = 0
    for sid, ps in by_shot.items():
        st = [p for p in ps if p["static"]]
        n_warn += bool(st)
        detail = "  ".join(f"t={p['t']:.2f} mafd={p['diff']:.2f}{'←静止' if p['static'] else ''}"
                           + (f"[母版{'静' if p.get('actual') else '动'}]" if ivs is not None else "") for p in ps)
        print(f"[探针] {'WARN' if st else 'ok  '} {sid:14s} {detail}")
    print(f"\n[探针] {len(pts)} 点 / {len(shots)} 镜，静止候选镜头 {n_warn}；阈 mafd ≤ {thr:.3f}（= 255×{a.noise}，跨 {a.freeze_dur}s）；"
          f"渲 {len(frames)} 张静帧 {t_render:.1f}s，总 {time.time() - t_all:.1f}s")
    if ivs is not None:
        tot = sum(agree.values())
        print(f"[对照] 母版 freezedetect（n={a.noise} d={a.freeze_dur}）区间 {len(ivs)} 段；"
              f"探针 vs 母版：一致 {(agree['tp'] + agree['tn']) / max(tot, 1):.0%}（TP {agree['tp']} TN {agree['tn']} "
              f"FP {agree['fp']} FN {agree['fn']}）——FP=探针多报，FN=探针漏报（母版 freeze 从采样点之后才开始时会出现）")
    print("[探针] 处方：静止候选的镜头核相机曲线是否覆盖该时刻（极缓推拉），或该拍是否只剩人物角标在动（角标 3.4% 面积撑不起 0.3% 帧差）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
