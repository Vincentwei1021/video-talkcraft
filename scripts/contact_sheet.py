"""评审拼图（contact sheet）：把 QA 帧目录拼成 N×M 网格图，供评审子代理整版浏览。

为什么存在：评审逐张 Read 160 张帧 ≈ 16 万 token / 21 分钟（2026-09-01 竖屏版 R1 实测）；
改看 ~15 张拼图 + 对可疑帧单张放大，token 与耗时都降 ~4 倍。每格带序号+文件名标签，
评审报缺陷时引用标签即可回溯原帧。

用法：
  python3 scripts/contact_sheet.py <frames_dir> <out_dir> [--cols 3] [--rows 4] [--width 360] \\
      [--pattern "*.png"] [--sort name|time]
输出：<out_dir>/sheet-01.png ...（末页不满格留白）
"""
import argparse
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

LABEL_H = 26


def load_font(size=15):
    for p in ("/System/Library/Fonts/PingFang.ttc", "/System/Library/Fonts/STHeiti Light.ttc",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                pass
    return ImageFont.load_default()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("frames_dir")
    ap.add_argument("out_dir")
    ap.add_argument("--cols", type=int, default=3)
    ap.add_argument("--rows", type=int, default=4)
    ap.add_argument("--width", type=int, default=360, help="每格图宽（高按比例）")
    ap.add_argument("--pattern", default="*.png")
    ap.add_argument("--sort", choices=["name", "time"], default="name")
    a = ap.parse_args()

    files = sorted(glob.glob(os.path.join(a.frames_dir, a.pattern)),
                   key=(os.path.getmtime if a.sort == "time" else str))
    if not files:
        print(f"目录里没有 {a.pattern}", file=sys.stderr)
        return 1
    os.makedirs(a.out_dir, exist_ok=True)
    font = load_font()
    per = a.cols * a.rows

    # 以第一张定格高（同一批 QA 帧同尺寸；混尺寸时按各自比例缩放，格高取首张）
    with Image.open(files[0]) as im0:
        cell_h = round(im0.height * a.width / im0.width) + LABEL_H

    sheets = 0
    for start in range(0, len(files), per):
        batch = files[start:start + per]
        sheet = Image.new("RGB", (a.cols * a.width, a.rows * cell_h), "#ffffff")
        draw = ImageDraw.Draw(sheet)
        for k, f in enumerate(batch):
            cx, cy = (k % a.cols) * a.width, (k // a.cols) * cell_h
            with Image.open(f) as im:
                thumb = im.convert("RGB").resize((a.width, cell_h - LABEL_H))
            sheet.paste(thumb, (cx, cy + LABEL_H))
            draw.rectangle([cx, cy, cx + a.width, cy + LABEL_H], fill="#1d1d1f")
            label = f"#{start + k:03d} {os.path.basename(f)}"
            draw.text((cx + 6, cy + 5), label[:52], fill="#ffffff", font=font)
        sheets += 1
        out = os.path.join(a.out_dir, f"sheet-{sheets:02d}.png")
        sheet.save(out)
        print(out, f"({len(batch)} 帧)")
    print(f"共 {len(files)} 帧 → {sheets} 张拼图")
    return 0


if __name__ == "__main__":
    sys.exit(main())
