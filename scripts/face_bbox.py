#!/usr/bin/env python3
"""人物素材 → 实测人脸 bbox + 人脸安全区（本机 CPU，OpenCV YuNet，模型 ~230KB 自动下载）。

    python3 scripts/face_bbox.py public/dh/host.webm face-zone.json [--step 1.0]

布局铁律（2026-08-28 用户定版）：人物在场的镜头，任何文字/卡片/字幕**及其背景**
全时刻不得进入人脸安全区——安全区必须来自本脚本的实测 bbox，不目测、不用亮度阈值猜。

输出 JSON（坐标为**素材像素系**；合成里按人物层摆放几何映射到画布系）：
  {video, size:[w,h], step, detect_rate,
   samples:[{t, face:[x,y,w,h], score}...],          # 每 step 秒一采样（漏检帧不进表）
   union_face:[x,y,w,h],                             # 全时段人脸 bbox 并集
   safe_zone:[x,y,w,h]}                              # 并集 → 头部外扩（上+60% 含发、左右+20%）→ 四周 +30px

依赖：pip install opencv-python numpy。alpha WebM 无需特殊处理（检测只看 RGB）。
人物会换形态/换位的素材：每个停靠形态各跑一次（或全程跑），取各自安全区。
"""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

MODEL_URL = ("https://github.com/opencv/opencv_zoo/raw/main/models/"
             "face_detection_yunet/face_detection_yunet_2023mar.onnx")
MODEL_CACHE = Path.home() / ".cache" / "koubo" / "face_detection_yunet_2023mar.onnx"


def get_model() -> str:
    if not MODEL_CACHE.exists():
        MODEL_CACHE.parent.mkdir(parents=True, exist_ok=True)
        print(f"下载 YuNet 模型 → {MODEL_CACHE}")
        urllib.request.urlretrieve(MODEL_URL, MODEL_CACHE)
    return str(MODEL_CACHE)


def main() -> None:
    import cv2
    import numpy as np

    argv = sys.argv[1:]
    step = 1.0
    if "--step" in argv:
        i = argv.index("--step")
        step = float(argv[i + 1])
        del argv[i:i + 2]
    if len(argv) != 2:
        sys.exit(__doc__)
    video_path, out_path = argv

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        sys.exit(f"打不开视频: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    det = cv2.FaceDetectorYN.create(get_model(), "", (W, H), 0.6, 0.3, 5000)

    samples, total, frame_i, next_t = [], 0, 0, 0.0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        t = frame_i / fps
        frame_i += 1
        if t + 1e-6 < next_t:
            continue
        next_t += step
        total += 1
        if frame.shape[2] == 4:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
        _, faces = det.detect(frame)
        if faces is None or len(faces) == 0:
            continue
        f = max(faces, key=lambda r: r[14])  # 最高置信度那张脸
        x, y, w, h = (float(v) for v in f[:4])
        samples.append({"t": round(t, 2),
                        "face": [round(x, 1), round(y, 1), round(w, 1), round(h, 1)],
                        "score": round(float(f[14]), 3)})
    cap.release()
    if not samples:
        sys.exit("全程未检出人脸——素材里有人吗？（侧脸/极小脸可把 --step 调小并降阈值）")

    xs0 = min(s["face"][0] for s in samples)
    ys0 = min(s["face"][1] for s in samples)
    xs1 = max(s["face"][0] + s["face"][2] for s in samples)
    ys1 = max(s["face"][1] + s["face"][3] for s in samples)
    union = [xs0, ys0, xs1 - xs0, ys1 - ys0]
    # 头部外扩：上 +60%（头发）、左右各 +20%；再全向 +30px 余量
    ex_x, ex_up, m = union[2] * 0.20, union[3] * 0.60, 30.0
    sz = [max(0.0, union[0] - ex_x - m), max(0.0, union[1] - ex_up - m),
          min(W - 1.0, union[0] + union[2] + ex_x + m) - max(0.0, union[0] - ex_x - m),
          min(H - 1.0, union[1] + union[3] + m) - max(0.0, union[1] - ex_up - m)]

    out = {"video": video_path, "size": [W, H], "step": step,
           "detect_rate": round(len(samples) / total, 3),
           "samples": samples,
           "union_face": [round(v, 1) for v in union],
           "safe_zone": [round(v, 1) for v in sz]}
    Path(out_path).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{video_path}: {W}x{H}, 采样 {total} 帧, 检出率 {out['detect_rate']:.0%}")
    print(f"union_face = {out['union_face']}")
    print(f"safe_zone  = {out['safe_zone']}   ← 文字/卡片/字幕及其背景全时刻禁入（素材像素系）")


if __name__ == "__main__":
    main()
