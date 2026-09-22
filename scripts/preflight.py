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
  语义覆盖   主句语义（semantics.json，②-1）里 自我介绍 / 介绍他人 / 号召 在该镜蒙皮行里没有对应语义的卡 → FAIL（这三类有专设卡族、无替代物）；
             数据 / 引用 / 对比 / 定义 / 步骤 / 列举 / 时间地点 / 机制 / 选择 / 过程演示 / 空间叙事 / 设问 / 金句 / 章节 → WARN；
             该镜写了 `- 语义偏离：<语义> ← 理由` 的放行。素材行声明了 V/图/截图 却没有一张吃素材的卡（呈现 / 运镜类，素材裸贴）→ FAIL。
             没有 semantics.json 时只对 --script 做词法兜底（我是 X / 点赞订阅 → 全片无对应语义卡 → WARN）。
  版式轮换   只按各镜「蒙皮行」（列表行或表格行）里的卡名核，没有蒙皮行的镜 WARN 且不计入（正文抄进来的"已知坑"卡名不算）：
             呈现类卡（素材呈现 / 数据信息图 / 运镜）连用 ≥3 镜 → FAIL、全片占比 > 1/3 → FAIL（≥6 镜的片）；
             其它类别（字幕花字 / 强调标注 / 人物互动）连用 ≥3 镜 → WARN、占比 > 1/2 → WARN；转场结构类不核；人物形态只由节奏表核（角标是默认路）；
             「版式行」逐字相同 ≥3 镜 → WARN；同一 B-roll 文件（不分大小写）用在 ≥3 镜或相邻两镜 → WARN；
             G0「版式节奏表」缺失（≥6 镜）→ WARN、表内连续 ≥3 镜同人物形态 + 同素材容器 → FAIL、素材容器 <3 种（≥8 镜）→ WARN
             （2026-09-21 用户反馈：11 镜里 8 镜同一张 60/40 卡 + 左下圆章，"排版太固定"；规则正主 cinematography.md §4.5 第 9 条）
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from frame_signature import dup_signature, frame_diffs, probe  # noqa: E402

VIDEO_EXT = (".mp4", ".mov", ".webm", ".mkv", ".m4v")
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif")
STD_FPS = (23.976, 24, 25, 29.97, 30, 50, 59.94, 60)

results: list[tuple[str, str, str]] = []  # (level, section, message)
SEM_PATH: list[str | None] = [None]      # --semantics（②-1 语义标注）
SCRIPT_PATH: list[str | None] = [None]   # --script（没有语义标注时的词法兜底）
SKILL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(SKILL_ROOT, "references", "cards")   # 卡的「类别:」从这里读（版式轮换按类别分档）
CARDS_INDEX = os.path.join(SKILL_ROOT, "references", "cards-index.json")  # 卡的「语义 / 输入」从这里读（scripts/cards_index.py 生成）


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


# ---- 版式轮换（cinematography.md §4.5 第 9 条；2026-09-21 用户反馈"排版太固定"：11 镜 8 镜同一张 60/40 卡 + 左下圆章）----
# 列表行 `- 蒙皮行：…` 与表格行 `| 蒙皮行 | … |` 都认（cinematography §4 层矩阵是表格，蒙皮行常与版式行并列写进表里）
SKIN_LINE = re.compile(r"^\s*(?:[-*]\s*)?\|?\s*\**蒙皮行\**\s*(?:[:：]|\|)\s*(.+?)\s*\|?\s*$")
LAYOUT_LINE = re.compile(r"^\s*(?:[-*]\s*)?\|?\s*\**版式行\**\s*(?:[:：]|\|)\s*(.+?)\s*\|?\s*$")
SLUG = re.compile(r"\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+\b")          # 库内卡名全带连字符
PRESENT_CATS = {"素材呈现", "数据信息图", "运镜"}               # 呈现类：决定"这一镜长什么样"，连用 / 占比 FAIL
# 人物互动不在内：角标（host-shrink-to-chip）是 host-footage §5 的默认路，满片都有是正常的——人物形态由 G0 节奏表核；字卡 / 标注类复用得多一点只 WARN
_cat_cache: dict[str, str | None] = {}


def card_category(slug: str) -> str | None:
    """references/cards/<slug>.md 头部的「类别:」；不是库内卡 → None"""
    if slug not in _cat_cache:
        cat = None
        p = os.path.join(CARDS_DIR, slug + ".md")
        if os.path.exists(p):
            cat = "?"
            with open(p, encoding="utf-8") as f:
                for line in f:
                    if line.startswith("类别:"):
                        cat = line.split(":", 1)[1].strip()
                        break
        _cat_cache[slug] = cat
    return _cat_cache[slug]


def shot_cards(shot: dict) -> tuple[list[str], bool]:
    """该镜用了哪些卡：只认「蒙皮行」里 → 之前的卡名（列表行或表格行）。没有蒙皮行 → ([], False)，不按正文估算——
    正文里抄进来的"已知坑 / 不用 X 换 Y"会把没用的卡算成用了（2026-09-21 评审 P1-5）"""
    for line in shot["body"]:
        m = SKIN_LINE.match(line)
        if m:
            # 先剥括号再切箭头：括号里的「（半身→右下角标）」会把后面的卡整段截断（2026-09-22 复核 P1-R2）
            slugs = [x for x in SLUG.findall(skin_head(m.group(1))) if card_category(x)]
            return list(dict.fromkeys(slugs)), True
    return [], False


def parse_rhythm_table(text: str) -> list[tuple[str, str, str, str]]:
    """G0「版式节奏表」：表头含「形态」与「容器」两列（列序任意，按表头定位），行 `| sNN | 人物形态·方位 | 素材容器 | 主卡 |`（cinematography.md §4）"""
    rows: list[tuple[str, str, str, str]] = []
    cols: tuple[int, int, int | None] | None = None   # (形态列, 容器列, 主卡列)
    for line in text.splitlines():
        st = line.strip()
        if not st.startswith("|"):
            cols = None
            continue
        cells = [c.strip() for c in st.strip("|").split("|")]
        if cols is None:
            fi = next((i for i, c in enumerate(cells) if "形态" in c), None)
            ci = next((i for i, c in enumerate(cells) if "容器" in c), None)
            if len(cells) >= 3 and fi is not None and ci is not None:
                ki = next((i for i, c in enumerate(cells) if "卡" in c and i not in (fi, ci)), None)
                cols = (fi, ci, ki)
            continue
        if all(set(c) <= set("-: ") for c in cells):
            continue                                   # 表头分隔行
        fi, ci, ki = cols
        if len(cells) > max(fi, ci) and re.match(r"^[sSvV]\d+", cells[0]):
            rows.append((cells[0].lower(), cells[fi], cells[ci], cells[ki] if ki is not None and ki < len(cells) else ""))
    return rows


def check_variety(shots: list[dict], text: str) -> None:
    """全片一个样的三种表现都量：同一张卡连用 / 占比，版式行复制，同一条素材反复用，人物形态 × 容器连续不换"""
    sec = "版式轮换"
    n = len(shots)
    ids = [s["id"].lower() for s in shots]
    cards_of: dict[str, list[str]] = {}
    no_skin: list[str] = []
    for s in shots:
        slugs, from_skin = shot_cards(s)
        cards_of[s["id"].lower()] = slugs
        if not from_skin:
            no_skin.append(s["id"])
    if no_skin:
        rec("WARN", sec, f"{len(no_skin)} 镜没有「蒙皮行」，未计入版式轮换核对：{' '.join(no_skin)}（SKILL.md ④：每镜蒙皮行 `卡名, 卡名 → 改了什么皮`，列表行或表格行均可）")
    all_slugs = sorted({x for v in cards_of.values() for x in v})

    # 1) 连用：同一张卡出现在 ≥3 个相邻镜头——呈现类 FAIL，其它类别 WARN（字卡 / 标注 / 人物互动可以复用得多一点），转场结构不核
    for slug in all_slugs:
        cat = card_category(slug)
        if cat == "转场结构":
            continue
        run_start = None
        for i, sid in enumerate(ids + [None]):
            hit = sid is not None and slug in cards_of[sid]
            if hit and run_start is None:
                run_start = i
            elif not hit and run_start is not None:
                run = i - run_start
                if run >= 3:
                    if cat in PRESENT_CATS:
                        rec("FAIL", sec, f"「{slug}」（{cat}）连用 {run} 镜（{ids[run_start]}–{ids[i - 1]}）——同一张呈现卡连用 ≥3 镜观众读作\"又是这个\"；"
                                         f"第 3 镜起换式（shot-design.md §2⑦ 单条 B-roll 七式 / §2④′ 关系表；规则 cinematography.md §4.5 第 9 条）")
                    else:
                        rec("WARN", sec, f"「{slug}」（{cat}）连用 {run} 镜（{ids[run_start]}–{ids[i - 1]}）——非呈现类可复用，但连着三镜同一种字卡 / 标注也会腻，看看能否换一式")
                run_start = None

    # 2) 占比：呈现类卡全片 ≤1/3（FAIL）；其它类别 ≤1/2（WARN）
    if n >= 6:
        for slug in all_slugs:
            cnt = sum(1 for v in cards_of.values() if slug in v)
            share = cnt / n
            cat = card_category(slug)
            if cat == "转场结构":
                continue
            if cat in PRESENT_CATS and share > 1 / 3:
                rec("FAIL", sec, f"「{slug}」（{cat}）出现在 {cnt}/{n} 镜 = {share:.0%} > 1/3——一张呈现卡撑不起半部片；"
                                 f"按口播关系换容器（出血全屏 / 装框 / 分屏 / 多图编排 / 3D 运镜 / 底床），见 shot-design.md §2⑦")
            elif cat not in PRESENT_CATS and share > 1 / 2:
                rec("WARN", sec, f"「{slug}」（{cat}）出现在 {cnt}/{n} 镜 = {share:.0%} > 1/2——同一种字卡 / 标注满片飞也是单调，换一两式")

    # 3) 版式行逐字复制
    layouts: dict[str, list[str]] = {}
    for s in shots:
        for line in s["body"]:
            m = LAYOUT_LINE.match(line)
            if m:
                layouts.setdefault(re.sub(r"\s+", "", m.group(1)), []).append(s["id"])
                break
    for key, sids in layouts.items():
        if len(sids) >= 3:
            rec("WARN", sec, f"{len(sids)} 镜的「版式行」逐字相同（{' '.join(sids)}）——版式行是这一镜实测的栏跨度 / 包围盒 / 字阶，复制粘贴 = 没有为它排版（layout.md §9）")

    # 4) 同一条 B-roll / 图片文件反复用
    files: dict[str, list[str]] = {}
    for s in shots:
        if not s["media"]:
            continue
        for mode, paths in TOKEN.findall(s["media"]):
            if mode in FOOTAGE_MODES:
                for pp in re.split(r"[,，、\s]+", paths or ""):
                    if pp:
                        files.setdefault(os.path.basename(pp.strip("`'\"")).lower(), []).append(s["id"].lower())  # macOS 不分大小写
    for f, sids in files.items():
        uniq = list(dict.fromkeys(sids))
        adjacent = [f"{a}→{b}" for a, b in zip(uniq, uniq[1:]) if ids.index(b) - ids.index(a) == 1]
        if len(uniq) >= 3 or adjacent:
            rec("WARN", sec, f"素材「{f}」用在 {len(uniq)} 镜（{' '.join(uniq)}）" + (f"，相邻复用 {' '.join(adjacent)}" if adjacent else "")
                             + "——同一条实拍反复出现观众记得；换素材、换取景段（ffmpeg -ss 截不同段）或写进未完成清单说明来源受限")

    # 5) G0 版式节奏表：人物形态 × 素材容器 的全片节奏
    rows = parse_rhythm_table(text)
    containers: set[str] = set()
    if not rows:
        if n >= 6:
            rec("WARN", sec, "G0 缺「版式节奏表」（| 镜 | 人物形态·方位 | 素材容器 | 主卡 |，cinematography.md §4）——全片节奏摊在一张表里才看得出\"八镜一个样\"；写完再展开逐镜矩阵")
        if not any(lv == "FAIL" and sc == sec for lv, sc, _ in results):
            rec("PASS", sec, f"版式轮换：{len(all_slugs)} 张卡 · 无呈现卡 ≥3 镜连用 / >1/3 占比（未给节奏表，人物形态 × 容器未核）")
        return
    norm = lambda x: re.sub(r"[\s·・,，/]+", "", x)  # noqa: E731
    run_start = 0
    for i in range(1, len(rows) + 1):
        same = i < len(rows) and norm(rows[i][1]) == norm(rows[run_start][1]) and norm(rows[i][2]) == norm(rows[run_start][2])
        if same:
            continue
        run = i - run_start
        if run >= 3:
            rec("FAIL", sec, f"版式节奏表：{rows[run_start][0]}–{rows[i - 1][0]} 连续 {run} 镜同人物形态「{rows[run_start][1]}」+ 同素材容器「{rows[run_start][2]}」"
                             f"——第 3 镜必须换其一（人物：半身 / 角标 / 分屏格内 / 短暂离场；容器：出血 / 装框 / 分屏 / 底床 / 多图 / 3D）")
        run_start = i
    containers = {norm(r[2]) for r in rows if norm(r[2])}
    if len(rows) >= 8 and len(containers) < 3:
        rec("WARN", sec, f"版式节奏表：{len(rows)} 镜只用了 {len(containers)} 种素材容器（{' / '.join(sorted(containers))}）——≥8 镜的片至少三种")
    missing = [x for x in ids if x not in {r[0] for r in rows}]
    if missing:
        rec("WARN", sec, f"版式节奏表缺镜：{' '.join(missing)}")
    if not any(lv == "FAIL" and sc == sec for lv, sc, _ in results):
        rec("PASS", sec, f"版式轮换：{len(all_slugs)} 张卡 · {len(containers)} 种素材容器 · 无 ≥3 镜连用")


# ---- 语义 / 素材覆盖（2026-09-22 用户指出的通用缺陷：稿子的语义从不被标注，所以"该摆的卡在不在"没人查）----
# 解析口径与 card_match 共用 shotbook_parse（评审 P1-1：两份正则对 `素材：B-roll（…）` 解析不一致，裸贴闸静默失效）
from shotbook_parse import FRAME_RE, is_carrier, skin_head  # noqa: E402
from shotbook_parse import FAMILY as SEM_FAMILY  # noqa: E402
from shotbook_parse import deviations as sb_deviations  # noqa: E402
from shotbook_parse import media_kinds, shot_cards as sb_shot_cards, shot_picks  # noqa: E402
from semantic_annotate import CTA_RE, is_self_intro  # noqa: E402  词法规则只有一份

HARD_SEM = {"自我介绍", "介绍他人", "号召"}   # 有专设卡族、无替代物：不论 main / sub 都核（评审 P1-3：标成 sub 就能绕过）
SOFT_SEM = {"数据", "引用", "对比", "定义", "步骤", "列举", "时间地点", "机制", "选择", "过程演示", "空间叙事", "设问", "金句", "章节"}
LONG_SHAPES = {"长图", "界面"}


def load_card_index() -> dict[str, dict] | None:
    if not os.path.exists(CARDS_INDEX):
        return None
    try:
        return {c["slug"]: c for c in json.load(open(CARDS_INDEX, encoding="utf-8"))["cards"]}
    except Exception:
        return None


def check_semantics(root: str, shots: list[dict], sem_path: str | None, script_path: str | None) -> None:
    """主句语义 → 该镜蒙皮行里必须有一张语义包含它的卡；素材行声明的 V/图/截图 必须有呈现 / 运镜类卡承接（裸贴 = FAIL）。
    没有 semantics.json 时退化成对口播稿的词法兜底（只 WARN）。"""
    sec = "语义覆盖"
    idx = load_card_index()
    if idx is None:
        rec("FAIL", sec, f"卡索引读不到或损坏：{os.path.relpath(CARDS_INDEX, SKILL_ROOT)}——闸的依据不在场就不能放行；"
                         f"在 skill 仓库跑 `python3 scripts/cards_index.py --write` 生成")
        return

    # ① 素材承接：本镜声明了实拍 / 图片 / 截图，就得有一张吃这类输入的**呈现 / 运镜 / 数据信息图 / 强调标注**类卡
    #    （吃「图」的卡按各卡 md 的 <Img> ↔ <OffthreadVideo> 换法也能承接实拍，所以按家族判定；
    #     但转场结构（素材只是被扫过的背景）与字幕花字类不算承接——评审 P2-3）
    bare, framed, long_warn, no_skin = [], [], [], []
    declared = 0
    for s in shots:
        if not s["media"]:
            continue
        kinds, _paths = media_kinds(s["media"])
        fam = kinds & SEM_FAMILY
        if not fam:
            continue
        declared += 1
        slugs, has_skin = sb_shot_cards(s)
        body = "\n".join(s.get("body", []))
        if not has_skin:
            no_skin.append(f"{s['id']}({'/'.join(sorted(fam))})")
            continue
        carriers = [g for g in slugs if g in idx and is_carrier(idx[g])]
        if not carriers:
            (framed if FRAME_RE.search(body) else bare).append(f"{s['id']}({'/'.join(sorted(fam))})")
            continue
        if "截图" in fam and not any(set(idx[g].get("material_shape") or []) & LONG_SHAPES for g in carriers):
            long_warn.append(s["id"])
    if no_skin:
        rec("FAIL", sec, f"{len(no_skin)} 镜声明了素材却没有「蒙皮行」：{' '.join(no_skin)}——缺蒙皮行时语义 / 承接都无从核，"
                         f"不能当豁免（评审 P1-4：删一行就能过闸）")
    if bare:
        rec("FAIL", sec, f"{len(bare)} 镜的素材没有呈现 / 运镜类卡承接：{' '.join(bare)}——素材只能裸贴"
                         f"（design-language §1.3：单视频镜要包 ThemeFrame，图 / 截图 要进呈现卡或运镜卡）；"
                         f"候选看 `scripts/card_match.py` 的「素材承接」行")
    if framed:
        rec("WARN", sec, f"{len(framed)} 镜没有承接卡，但正文提到了主题边框（ThemeFrame / 杂志框…）：{' '.join(framed)}——"
                         f"当作「已包框的单视频镜」放行，请确认画面不是裸贴")
    if long_warn:
        rec("WARN", sec, f"{len(long_warn)} 镜声明了截图 / 长图，但承接卡的素材形态里没有 长图 / 界面：{' '.join(long_warn)}——"
                         f"长页要「滚 / 巡 / 放大」地拍（SKILL ③），一屏装不下的静态贴屏是缺陷")
    if declared and not bare and not no_skin:
        rec("PASS", sec, f"{declared} 镜声明的实拍 / 图片 / 截图都有卡承接")

    # ② 语义覆盖
    if not sem_path or not os.path.exists(sem_path):
        if not script_path or not os.path.exists(script_path):
            rec("WARN", sec, "没有 semantics.json（②-1 语义标注）也没有 --script：语义覆盖只能跳过——"
                             "选卡回到凭印象挑，2026-09-21 那支片的自我介绍就是这样漏掉人名条的")
            return
        text = open(script_path, encoding="utf-8").read()
        all_sem: set[str] = set()
        for s in shots:
            for g in sb_shot_cards(s)[0]:
                if g in idx:
                    all_sem |= set(idx[g]["semantics"])
        for w, hit, what in (("自我介绍", any(is_self_intro(l) for l in re.split(r"[\n。！？!?]", text)), "「我是 / 我叫 X」"),
                             ("号召", bool(CTA_RE.search(text)), "「点赞 / 订阅 / 三连」")):
            if hit and w not in all_sem:
                rec("WARN", sec, f"口播稿里有{what}，全片却没有一张「{w}」语义的卡（taxonomy 语义索引里挑）——"
                                 f"做 ②-1 语义标注后这条会升级成逐镜 FAIL")
        rec("INFO", sec, "只做了词法兜底；semantics.json 在册才能逐镜核覆盖")
        return

    try:
        doc = json.load(open(sem_path, encoding="utf-8"))
        sents = doc["sentences"]
    except Exception as e:
        rec("FAIL", sec, f"semantics.json 读不出来：{e}（跑 scripts/semantic_annotate.py 校验）")
        return
    if not isinstance(sents, list) or not sents:
        rec("FAIL", sec, f"semantics.json 的 sentences 不是非空数组（拿到 {type(sents).__name__}）——跑 scripts/semantic_annotate.py 校验")
        return
    by_shot: dict[str, list[dict]] = {}
    exempted: list[str] = []
    for x in sents:
        if not isinstance(x, dict):
            rec("FAIL", sec, f"semantics.json 里有句不是对象：{str(x)[:40]}")
            return
        by_shot.setdefault(str(x.get("shot", "")).lower(), []).append(x)
        for w, why in (x.get("exempt") or {}).items():
            exempted.append(f"i={x.get('i')}:{w}")

    ids = {s["id"].lower() for s in shots}
    matched = ids & set(by_shot)
    hard_miss, soft_miss, data_miss, waived, bad_dev, stray_dev, checked = [], [], [], [], [], [], 0
    for s in shots:
        rows = by_shot.get(s["id"].lower(), [])
        if not rows:
            continue
        sem_all: set[str] = set()
        sem_main: set[str] = set()
        data_quant = False
        for x in rows:
            ws = set(x.get("sem") or [])
            sem_all |= ws
            if x.get("weight") == "main":
                sem_main |= ws
                if "数据" in ws and "量化" in (x.get("need") or []):
                    data_quant = True
        if not sem_all:
            continue
        slugs, has_skin = sb_shot_cards(s)
        ok_dev, bad = sb_deviations(s)
        bad_dev += [f"{s['id']}: {b[:40]}" for b in bad]
        if not has_skin:
            if (sem_all & HARD_SEM) - set(ok_dev):
                hard_miss.append(f"{s['id']} 缺蒙皮行却有 {'/'.join(sorted((sem_all & HARD_SEM) - set(ok_dev)))} 语义")
            continue
        checked += 1
        card_sem: set[str] = set()
        cats: set[str] = set()
        for g in slugs:
            if g in idx:
                card_sem |= set(idx[g]["semantics"])
                cats.add(idx[g]["category"])
        excused = set(ok_dev)
        mh = sorted((sem_all & HARD_SEM) - card_sem - excused)          # 硬语义：不分 main / sub
        ms = sorted((sem_main & SOFT_SEM) - card_sem - excused)         # 软语义：只看主句
        waived += [f"{s['id']}:{w}" for w in sorted((sem_all & (HARD_SEM | SOFT_SEM)) & excused)]
        stray = sorted(excused - sem_all)
        if stray:
            stray_dev.append(f"{s['id']}:{'/'.join(stray)}")
        if mh:
            hard_miss.append(f"{s['id']} 缺 {'/'.join(mh)}（本镜卡：{' '.join(slugs) or '无'}）")
        # 数据主句且 need 含 量化 → 必须有数据类卡或强调卡（评审建议：让 need 字段有机器用途）
        if data_quant and "数据" not in excused and not (card_sem & {"数据", "强调", "列举", "对比"}) and "数据信息图" not in cats:
            data_miss.append(f"{s['id']}（本镜卡：{' '.join(slugs) or '无'}）")
        if ms:
            soft_miss.append(f"{s['id']} 缺 {'/'.join(ms)}")
    # 「选卡行」与蒙皮行对账：写了选卡行却没落进蒙皮行 = 这行没人核（评审 P2-7）
    pick_gap = []
    for s in shots:
        picks = shot_picks(s)
        if not picks:
            continue
        slugs = set(sb_shot_cards(s)[0])
        for w, gs in picks.items():
            for g in gs:
                if g not in slugs:
                    pick_gap.append(f"{s['id']}:{w}→{g}")
    if pick_gap:
        rec("WARN", sec, f"「选卡行」里的卡没出现在该镜「蒙皮行」：{' '.join(pick_gap[:8])}——"
                         f"选卡行是决定、蒙皮行是落地，两者要一致（蒙皮行才是版式轮换与本段闸的依据）")
    if not matched:
        rec("FAIL", sec, f"semantics.json 里没有一句归到本 SHOTBOOK 的镜头（SHOTBOOK id：{' '.join(sorted(ids))[:60]}…；"
                         f"标注里的 shot：{' '.join(sorted(x for x in by_shot if x))[:60] or '全为空'}）——"
                         f"闸会整段空转；跑 `python3 <skill>/scripts/semantic_annotate.py --sync-shots` 回填 shot")
        return
    if hard_miss:
        rec("FAIL", sec, f"{len(hard_miss)} 镜的语义没有对应的卡：" + "；".join(hard_miss)
                         + "——在 taxonomy「语义索引」里挑该语义的卡（候选表：scripts/card_match.py）；"
                           "确实不配卡的话在该镜写一行 `- 语义偏离：<语义> ← 理由`（理由 ≥4 字）")
    if data_miss:
        rec("FAIL", sec, f"{len(data_miss)} 镜有「数据」主句且 need 标了「量化」，却没有能承载数字的卡（数据信息图类，或 数据 / 强调 / 列举 / 对比 语义）："
                         + "；".join(data_miss) + "——要量化就得有承载它的图形（number-counter / chart-grow / unit-grid-proportion…），"
                                                  "不是把数字当普通标题；不需要量化的把该句 need 里的「量化」去掉")
    if soft_miss:
        rec("WARN", sec, f"{len(soft_miss)} 镜主句语义没有对应的卡（软规）：" + "；".join(soft_miss[:8]))
    if bad_dev:
        rec("WARN", sec, f"{len(bad_dev)} 行「语义偏离」格式不对、未放行：" + "；".join(bad_dev[:5])
                         + "——格式 `- 语义偏离：自我介绍 ← 开场已报身份，s11 不再重复`（理由 ≥4 字）")
    if stray_dev:
        rec("WARN", sec, f"「语义偏离」写的语义本镜没有（写错镜了？）：{' '.join(stray_dev[:8])}——偏离只对本镜生效，"
                         f"放在别的镜或清单节里都不放行")
    if waived:
        rec("INFO", sec, f"按「语义偏离」放行：{' '.join(waived)}")
    if exempted:
        rec("INFO", sec, f"②-1 里按 exempt 放行的词法硬规：{' '.join(exempted[:10])}")
    if checked == 0:
        rec("FAIL", sec, "没有一镜真正被核到（镜头都缺蒙皮行，或标注里这些镜没有语义）——闸空转不算通过")
    elif not hard_miss and not soft_miss and not data_miss:
        rec("PASS", sec, f"{checked} 镜的语义都有对应语义的卡")


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
    check_variety(shots, text)
    check_semantics(root, shots, SEM_PATH[0], SCRIPT_PATH[0])
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
    ap.add_argument("--semantics", default="semantics.json", help="②-1 语义标注（scripts/semantic_annotate.py 产出）；不存在则退化成对 --script 的词法兜底")
    ap.add_argument("--script", default="script.txt", help="口播稿，只在没有语义标注时做词法兜底")
    a = ap.parse_args()
    root = os.path.abspath(a.project)
    os.chdir(root)
    SEM_PATH[0] = a.semantics if os.path.isabs(a.semantics) else os.path.join(root, a.semantics)
    SCRIPT_PATH[0] = a.script if os.path.isabs(a.script) else os.path.join(root, a.script)

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
