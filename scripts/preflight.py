"""开工体检（③ 素材期 --media-only · ④→⑤ 闸全量）：把 reference 里的入场硬规变成断言，任一 FAIL 挡住进 ⑤ 实现。

为什么存在（2026-09-06 复盘）：一次 7h21m 的制作里 6 个整片母版作废 5 个，其中 v1/v2 两轮的触发条件
（人物素材 25fps 混进 30fps 成片 → 每 6 帧一次重复帧）host-footage.md §1 早就写着，一条 ffprobe 就能查出来；
空的 assets/broll/ 一路走到交付，因为 19 支脚本里没有一支碰素材。答案在文档里，但没人强制在正确的时刻去查——
所以这里不补文档，把它们做成开工前必跑的断言。

用法（在工程根目录执行；工程根 = 放 SHOTBOOK.md / remotion/ / assets/ 的目录）：
  # ③ 素材期：人物素材 + 素材盘点（SHOTBOOK 还没写，只查文件）
  python3 <skill>/scripts/preflight.py --media-only --host remotion/public/dh/host.webm --fps 30 \
      [--voice audio/full.wav] [--host-box 758:842]
  # ④→⑤ 闸：以上全部 + SHOTBOOK 对账（每镜「素材：」行的文件必须在盘上；未完成清单必须有；零 B-roll/图片 = FAIL）
  python3 <skill>/scripts/preflight.py --shotbook SHOTBOOK.md --host ... --fps 30 [--voice ...] [--shots remotion/shots.json]
      [--min-footage-ratio 0.34]

SHOTBOOK 机器可读约定（cinematography.md §4）：
  ### S3 · 25.04–43.24 · 意图：……                      ← 镜头标题（S/V + 编号）
  - 素材：V（public/broll/gpu.mp4）· 图（public/stills/a.jpg, public/stills/b.jpg）· 截图（public/pages/gh/page.png）· 文
        代号同 taxonomy.md 输入类型索引：V=B-roll 视频 · 图=图片（照片/海报/插图）· 截图=网页/界面证据 · 界=界面自演 · 文=纯文字 · 人=口播人物
        V/图/截图 三类必须括号给文件路径（相对工程根或 remotion/），preflight 逐个 stat；写"待采"= FAIL
  ## 未完成 / 未采集清单                                  ← 必填节；允许内容为"无"，不允许缺节

判定：
  人物素材   r_frame_rate ≠ avg_frame_rate（VFR/丢帧）FAIL · 源片自带重复帧签名 FAIL · 素材 fps ≠ 成片 fps FAIL ·
             时长与配音差 >1 帧 FAIL · --host-box 与素材真实比不符 FAIL
  素材盘点   实拍/图片文件总数 0 → media-only 时 WARN、全量时由 SHOTBOOK 对账判 FAIL
  SHOTBOOK   缺「素材：」行 / 声明了 V·图·截图却无路径 / 路径不存在 → FAIL；全片零 V·图 → FAIL（只有动效 + 口播 = PPT 感，SKILL.md ③ 硬规）；
             V·图 镜头占比 < --min-footage-ratio → WARN；缺「未完成 / 未采集清单」节 → FAIL；sources.md 不存在 → FAIL
             纯文字镜（素材只有 文）层矩阵里没有 G5 线稿示意图行 → WARN（章节卡除外；references/schematic.md）
"""
from __future__ import annotations

import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from frame_signature import dup_signature, frame_diffs, probe  # noqa: E402

VIDEO_EXT = (".mp4", ".mov", ".webm", ".mkv", ".m4v")
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif")
STD_FPS = (23.976, 24, 25, 29.97, 30, 50, 59.94, 60)

results: list[tuple[str, str, str]] = []  # (level, section, message)


def rec(level: str, section: str, msg: str) -> None:
    results.append((level, section, msg))
    print(f"[{section}] {level}: {msg}")


def nearest_std(fps: float) -> float:
    return min(STD_FPS, key=lambda s: abs(s - fps))


# ---------- A) 人物素材 ----------

def check_host(host: str, fps: float | None, voice: str | None, host_box: str | None) -> None:
    sec = "人物素材"
    if not os.path.exists(host):
        rec("FAIL", sec, f"文件不存在：{host}")
        return
    p = probe(host)
    rec("INFO", sec, f"{host}: {p['width']}x{p['height']} {p['codec']}/{p['pix_fmt']} "
                     f"r={p['r_fps']:.3f} avg={p['avg_fps']:.3f} dur={p['duration']:.3f}s")
    # A1 VFR / 丢帧
    if p["avg_fps"] > 0 and abs(p["r_fps"] - p["avg_fps"]) / p["r_fps"] > 0.005:
        tgt = nearest_std(p["avg_fps"])
        rec("FAIL", sec, f"r_frame_rate {p['r_fps']:.3f} ≠ avg_frame_rate {p['avg_fps']:.3f}（VFR 或丢帧）→ 先重出 CFR："
                         f"ffmpeg -i {host} -fps_mode cfr -r {tgt:g} -c:v libvpx-vp9 -pix_fmt yuva420p ...（帧率以 avg 就近的标准值 {tgt:g} 为准）")
    else:
        rec("PASS", sec, f"帧率恒定（r = avg = {p['r_fps']:.3f}）")
    # A2 源片重复帧签名（三窗，全幅）
    dur = p["duration"]
    wins = [t for t in (2.0, dur / 2, max(2.0, dur - 4.0)) if 0 <= t < dur - 2.5]
    hits = []
    for t in wins:
        d = frame_diffs(host, t, 60, None, width=320)
        if d is None:
            continue
        s = dup_signature(d, p["r_fps"])
        if s.found:
            hits.append((t, s))
    if len(hits) >= 2:
        s = hits[0][1]
        rec("FAIL", sec, f"源片已含重复帧：周期 {s.period}（{len(hits)}/{len(wins)} 窗命中）⇒ 真实 fps ≈ {s.implied_src_fps:.2f}，"
                         f"容器却标 {p['r_fps']:.3f}。这不是 CFR 能修的——先还原到真实帧率再走下一条："
                         f"ffmpeg -i {host} -vf mpdecimate -fps_mode passthrough ... 或回源头按 {s.implied_src_fps:.0f}fps 重出")
    else:
        rec("PASS", sec, f"源片无重复帧签名（{len(wins)} 窗）")
    # A3 fps 等于成片 fps
    if fps is not None:
        if abs(p["r_fps"] - fps) > 0.01:
            rec("FAIL", sec, f"素材 {p['r_fps']:.3f}fps ≠ 成片 {fps:g}fps。host-footage.md §1：首选把成片 fps 定为 {p['r_fps']:g}"
                             f"（动效是生成的，改帧率零成本）；确需保 {fps:g} 则光流补帧（minterpolate），"
                             f"禁止 -r {fps:g} 直转——那就是每 {round(fps / (fps - p['r_fps'])) if fps != p['r_fps'] else 0} 帧一次重复帧")
        else:
            rec("PASS", sec, f"素材 fps = 成片 fps = {fps:g}")
    else:
        rec("WARN", sec, "未给 --fps，跳过「素材 fps = 成片 fps」断言")
    # A4 时长 vs 配音
    if voice:
        if not os.path.exists(voice):
            rec("FAIL", sec, f"配音文件不存在：{voice}")
        else:
            v = probe_audio_duration(voice)
            frame = 1.0 / (fps or p["r_fps"])
            if abs(v - dur) > frame + 1e-3:
                rec("FAIL", sec, f"人物素材 {dur:.3f}s 与配音 {v:.3f}s 差 {abs(v - dur):.3f}s（>1 帧 {frame:.3f}s）——"
                                 f"口型对不上声音；在源头解决，合成侧不做变速（host-footage.md §1）")
            else:
                rec("PASS", sec, f"人物素材与配音时长对齐（差 {abs(v - dur) * 1000:.0f}ms）")
    # A5 宽高比
    ratio = p["width"] / p["height"]
    rec("INFO", sec, f"真实宽高比 {p['width']}:{p['height']} = {ratio:.4f}——输出几何按它算，不按容器/期望值")
    if host_box:
        bw, bh = (float(x) for x in host_box.split(":"))
        if abs(bw / bh - ratio) / ratio > 0.01:
            rec("FAIL", sec, f"--host-box {host_box}（{bw / bh:.4f}）与素材真实比 {ratio:.4f} 不符——人会被压扁/拉长；"
                             f"按素材比重算容器（如 {bw:g}:{bw / ratio:.0f}）")
        else:
            rec("PASS", sec, f"容器 {host_box} 与素材比一致")


def probe_audio_duration(path: str) -> float:
    import subprocess
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout
    return float(re.sub(r"[^0-9.]", "", out) or 0)


# ---------- B) 素材盘点 ----------

def inventory(root: str) -> dict[str, int]:
    counts = {"video": 0, "image": 0, "pages": 0}
    dirs = ["assets", "public", "remotion/public"]
    seen: set[str] = set()
    for d in dirs:
        base = os.path.join(root, d)
        if not os.path.isdir(base):
            continue
        for dp, dn, fn in os.walk(base):
            dn[:] = [x for x in dn if x not in ("node_modules", "sfx", "dh", "audio") and not x.startswith(".")]
            for f in fn:
                full = os.path.realpath(os.path.join(dp, f))
                if full in seen:
                    continue
                seen.add(full)
                fl = f.lower()
                if fl.endswith(VIDEO_EXT):
                    counts["video"] += 1
                elif fl.endswith(IMAGE_EXT):
                    if os.path.basename(dp) != "" and "/pages/" in (dp + "/"):
                        counts["pages"] += 1
                    else:
                        counts["image"] += 1
    return counts


def check_inventory(root: str, media_only: bool) -> None:
    sec = "素材盘点"
    c = inventory(root)
    rec("INFO", sec, f"实拍视频 {c['video']} · 图片 {c['image']} · 网页长图 {c['pages']}（assets/ + public/，不含 sfx/dh/audio）")
    if c["video"] + c["image"] == 0:
        rec("WARN" if media_only else "INFO", sec,
            "还没有任何实拍视频 / 图片——B-roll 或图片是必需项（SKILL.md ③：只有动效 + 口播人物 = 讲 PPT）"
            + ("；进 ④ 前把候选采回来" if media_only else "，由 SHOTBOOK 对账判定"))
    src = next((p for p in ("sources.md", "assets/sources.md", "research/sources.md") if os.path.exists(os.path.join(root, p))), None)
    if src:
        rec("PASS", sec, f"sources.md 在册：{src}")
    else:
        rec("WARN" if media_only else "FAIL", sec, "sources.md 不存在——每条 B-roll / 图片 / 截图都要登记检索词、源站、ID/URL、授权（broll-sources.md 规则 6）")


# ---------- C) SHOTBOOK 对账 ----------

SHOT_HEAD = re.compile(r"^#{2,4}\s+([SsVv]\d+[A-Za-z0-9_']*)\b")
HEADING = re.compile(r"^(#{1,6})\s")          # 任意 markdown 标题：与镜头标题同级或更高的非镜头标题 = 该镜正文结束
MEDIA_LINE = re.compile(r"^\s*[-*]?\s*\**素材\**\s*[:：]\s*(.+)$")
UNFINISHED_HEAD = re.compile(r"^#{2,4}\s+.*未完成")
TOKEN = re.compile(r"(B-roll|b-roll|V|图片|图|截图|页|界|文|人|纯动效)\s*(?:[（(]([^）)]*)[）)])?")
FOOTAGE_MODES = {"V", "B-roll", "b-roll", "图", "图片"}
PATH_MODES = FOOTAGE_MODES | {"截图", "页"}


def parse_shotbook(text: str):
    shots: list[dict] = []
    cur = None
    for line in text.splitlines():
        m = SHOT_HEAD.match(line)
        if m:
            cur = {"id": m.group(1), "media": None, "body": [line], "level": len(line) - len(line.lstrip("#"))}
            shots.append(cur)
            continue
        hm = HEADING.match(line)
        if cur is not None and hm and len(hm.group(1)) <= cur["level"]:
            cur = None                        # 下一幕 / 「未完成清单」等同级标题：镜头正文到此为止，别把后面的节算进这一镜
            continue
        if cur is not None:
            cur["body"].append(line)          # 该镜到下一镜标题之间的全文（层矩阵 / 自检列），给纯文镜陪衬图形检查用
        if cur is not None and cur["media"] is None:
            mm = MEDIA_LINE.match(line)
            if mm:
                cur["media"] = mm.group(1).strip()
    has_unfinished = any(UNFINISHED_HEAD.match(l) for l in text.splitlines())
    return shots, has_unfinished


def resolve_path(root: str, p: str) -> str | None:
    p = p.strip().strip("`'\"")
    if not p:
        return None
    for cand in (p, os.path.join("remotion", p), os.path.join("remotion", "public", p), os.path.join("public", p)):
        full = os.path.join(root, cand)
        if os.path.exists(full):
            return cand
    return None


def check_shotbook(root: str, shotbook: str, shots_json: str | None, min_ratio: float) -> None:
    sec = "SHOTBOOK"
    path = os.path.join(root, shotbook) if not os.path.isabs(shotbook) else shotbook
    if not os.path.exists(path):
        rec("FAIL", sec, f"找不到 {shotbook}")
        return
    text = open(path, encoding="utf-8").read()
    shots, has_unfinished = parse_shotbook(text)
    if not shots:
        rec("FAIL", sec, "没解析到任何镜头标题（约定：`### S3 · 起–止 · 意图：…`，S/V + 编号开头）")
        return
    rec("INFO", sec, f"解析到 {len(shots)} 个镜头：{' '.join(s['id'] for s in shots)}")

    missing_line, no_path, bad_path, footage = [], [], [], []
    for s in shots:
        if not s["media"]:
            missing_line.append(s["id"])
            continue
        modes = TOKEN.findall(s["media"])
        if not modes:
            missing_line.append(s["id"])
            continue
        has_footage = False
        for mode, paths in modes:
            if mode in PATH_MODES:
                plist = [x for x in re.split(r"[,，、\s]+", paths or "") if x and x not in ("待采", "TBD", "tbd")]
                if not plist:
                    no_path.append(f"{s['id']}:{mode}")
                    continue
                ok_any = False
                for pp in plist:
                    if resolve_path(root, pp):
                        ok_any = True
                    else:
                        bad_path.append(f"{s['id']}:{pp}")
                if ok_any and mode in FOOTAGE_MODES:
                    has_footage = True
        if has_footage:
            footage.append(s["id"])

    if missing_line:
        rec("FAIL", sec, f"{len(missing_line)} 镜缺「素材：」行：{' '.join(missing_line)}（每镜必写，纯动效也要写 `素材：文`）")
    if no_path:
        rec("FAIL", sec, f"声明了素材但没给文件（或写了待采）：{' '.join(no_path)}——这就是「未完成被包装成设计」的入口，"
                         f"要么采回来，要么写进「未完成 / 未采集清单」并把该镜改成别的素材模式")
    if bad_path:
        rec("FAIL", sec, f"素材文件不在盘上：{' '.join(bad_path)}（相对工程根 / remotion/ / public/ 均已尝试）")
    # 纯文镜陪衬图形（advisory，SKILL.md ④ / references/schematic.md §1）：素材只有「文 / 纯动效」的镜头，
    # 层矩阵里要有一行 G5 线稿示意图（关键词 G5 / 示意图 / 陪衬图形）；章节卡镜（chapter-title-card / 章节卡）除外。
    TEXT_ONLY = {"文", "纯动效"}
    G5_RE = re.compile(r"G5|示意图|陪衬图形|schematic")
    CHAPTER_RE = re.compile(r"chapter-title-card|章节卡|章节标题卡", re.I)   # 章节卡镜免检：认卡名 / 「章节卡」，不认泛泛的"章节"（口播稿里提到"上一章节"不算）
    bare_text = []
    for s in shots:
        if not s["media"]:
            continue
        kinds = {m for m, _ in TOKEN.findall(s["media"])}
        if kinds and kinds <= TEXT_ONLY:
            body = "\n".join(s.get("body", []))
            if not CHAPTER_RE.search(body) and not G5_RE.search(body):
                bare_text.append(s["id"])
    if bare_text:
        rec("WARN", sec, f"{len(bare_text)} 个纯文字镜没有陪衬图形行：{' '.join(bare_text)}——只有文字动效在堆 = 幻灯片（2026-09-07 用户反馈）；"
                         f"层矩阵加一行「G5 线稿示意图 ← 讲 X 所以画 Y」（references/schematic.md §1、§3 语义图形词典），章节卡镜不算")
    ratio = len(footage) / len(shots)
    if not footage:
        rec("FAIL", sec, "全片零 B-roll / 图片镜头——只有动效 + 口播人物 = 讲 PPT（SKILL.md ③ 硬规：实拍或图片素材是必需项，"
                         "「本片不做 B-roll」不允许作为设计决定）")
    elif ratio < min_ratio:
        rec("WARN", sec, f"带 B-roll / 图片的镜头 {len(footage)}/{len(shots)} = {ratio:.0%} < {min_ratio:.0%}——"
                         f"偏少，SHOTBOOK 里给出依据（如：证据类题材以截图/界面为主）")
    else:
        rec("PASS", sec, f"带 B-roll / 图片的镜头 {len(footage)}/{len(shots)} = {ratio:.0%}")
    if has_unfinished:
        rec("PASS", sec, "「未完成 / 未采集清单」节在册")
    else:
        rec("FAIL", sec, "缺「未完成 / 未采集清单」节（## 未完成 / 未采集清单；内容可以是「无」，节不能没有）——"
                         "任何「本片不做 X」必须二选一：设计决定 + 依据，或 未完成 + 阻塞原因 + 兜底源是否试过")
    if shots_json:
        sj = os.path.join(root, shots_json) if not os.path.isabs(shots_json) else shots_json
        if os.path.exists(sj):
            import json
            ids = [x["id"] for x in json.load(open(sj))]
            a, b = {x.lower() for x in ids}, {s["id"].lower() for s in shots}
            if a != b:
                rec("WARN", sec, f"shots.json 与 SHOTBOOK 镜头 id 不一致：只在 shots.json {sorted(a - b)}，只在 SHOTBOOK {sorted(b - a)}")
            else:
                rec("PASS", sec, f"shots.json 与 SHOTBOOK 镜头 id 一致（{len(ids)}）")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", default=".", help="工程根（含 SHOTBOOK.md / remotion/ / assets/）")
    ap.add_argument("--media-only", action="store_true", help="③ 素材期：只查人物素材与素材盘点，不查 SHOTBOOK")
    ap.add_argument("--shotbook", default="SHOTBOOK.md")
    ap.add_argument("--shots", default=None, help="remotion/shots.json（有则核 id 一致）")
    ap.add_argument("--host", default=None, help="人物素材（绿幕 mp4 / alpha webm）")
    ap.add_argument("--fps", type=float, default=None, help="成片 fps")
    ap.add_argument("--voice", default=None, help="配音文件（查时长逐帧对齐）")
    ap.add_argument("--host-box", default=None, help="人物层容器 W:H——只在素材**整体装入**容器（contain/fill）时给；裁切窗（chip 圆窗 / half 取景）不适用，别传")
    ap.add_argument("--min-footage-ratio", type=float, default=0.34)
    a = ap.parse_args()
    root = os.path.abspath(a.project)
    os.chdir(root)

    print(f"== preflight · {root} · {'media-only（③）' if a.media_only else '全量（④→⑤ 闸）'} ==")
    if a.host:
        check_host(a.host, a.fps, a.voice, a.host_box)
    else:
        rec("WARN", "人物素材", "未给 --host：没有人物素材的片跳过；有人物素材却不给 = 体检白做")
    check_inventory(root, a.media_only)
    if not a.media_only:
        check_shotbook(root, a.shotbook, a.shots, a.min_footage_ratio)

    fails = [m for lv, _, m in results if lv == "FAIL"]
    warns = [m for lv, _, m in results if lv == "WARN"]
    print(f"\n== preflight {'FAIL' if fails else 'PASS'} ==  FAIL {len(fails)} · WARN {len(warns)}"
          + ("" if fails else "  → 可进 ⑤ 实现" if not a.media_only else "  → 可写 SHOTBOOK"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
