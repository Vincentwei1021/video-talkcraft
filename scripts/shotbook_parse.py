#!/usr/bin/env python3
"""SHOTBOOK 机器可读约定的**单一解析实现**：镜头标题 / 素材行 / 蒙皮行 / 选卡行 / 语义偏离行。

为什么单独一个模块（2026-09-22 独立评审 P1-1 / P2-6）：preflight 与 card_match 各写过一份正则，
两份对同一行 SHOTBOOK 的解析不一致——`素材：B-roll（a.mp4）` 在一边是实拍、在另一边什么都不是，
于是「素材裸贴 FAIL」在用旧代号的工程上静默失效。代号归一与镜头切分只允许有一份实现。

代号归一（SKILL ③ 四档 ↔ taxonomy 输入类型索引）：B-roll / b-roll → V · 图片 → 图 · 页 → 截图 · 纯动效 → 文。
"""
from __future__ import annotations

import re

SHOT_HEAD = re.compile(r"^(#{2,4})\s+([SsVv]\d+[A-Za-z0-9_']*)")
HEADING = re.compile(r"^(#{1,6})\s+")
MEDIA_LINE = re.compile(r"^\s*(?:[-*]\s*)?\**素材\**\s*[:：]\s*(.+?)\s*$")
SKIN_LINE = re.compile(r"^\s*(?:[-*]\s*)?\|?\s*\**蒙皮行\**\s*(?:[:：]|\|)\s*(.+?)\s*\|?\s*$")
PICK_LINE = re.compile(r"^\s*(?:[-*]\s*)?\**选卡行\**\s*[:：]\s*(.+?)\s*$")
TOKEN = re.compile(r"(B-roll|b-roll|V|图片|图|截图|页|界|文|人|纯动效)\s*(?:[（(]([^）)]*)[）)])?")
SLUG = re.compile(r"\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+\b")
# 语义偏离：`- 语义偏离：自我介绍 ← 开场已报身份，s11 不再重复`
# 必须是列表项（正文里提一嘴不放行）、必须给理由（去空白后 ≥4 字，与 semantic_annotate 的 exempt 同口径）
DEVIATE = re.compile(r"^\s*[-*]\s*\**语义偏离\**\s*[:：]\s*([一-龥]{2,6})\s*(?:←|<-|<=|—+|→|,|，|:|：)\s*(\S.*)$")
DEVIATE_LOOSE = re.compile(r"^\s*[-*]\s*\**语义偏离\**\s*[:：]\s*(.+)$")
FRAME_RE = re.compile(r"ThemeFrame|theme-frame|杂志框|胶片|拍立得|复古浏览器|工程图纸|笔记本|邮票|发丝线|相框")

ALIAS = {"B-roll": "V", "b-roll": "V", "图片": "图", "页": "截图", "纯动效": "文"}
FAMILY = {"V", "图", "截图"}                                  # 吃外部素材的三档（归一后）
# 能"承接素材"的卡：吃素材家族且类别不是这两类——转场结构（素材只是被扫过去的背景）、
# 字幕花字（作用对象是文字层）。人物互动里的 parallel-items-with-host / host-card-glass-board 确实在格子里放素材，算承接。
NON_CARRIER_CATS = {"转场结构", "字幕花字"}


def is_carrier(card: dict) -> bool:
    return bool({i["type"] for i in card["inputs"]} & FAMILY) and card.get("category") not in NON_CARRIER_CATS

PLACEHOLDER = {"待采", "TBD", "tbd", "待补", "待定"}


def media_kinds(media: str) -> tuple[set[str], list[str]]:
    """素材行 → (归一后的代号集合, 路径列表)。路径里剔掉「待采」这类占位。"""
    kinds: set[str] = set()
    paths: list[str] = []
    for kind, inner in TOKEN.findall(media or ""):
        kinds.add(ALIAS.get(kind, kind))
        for p in re.split(r"[,，、\s]+", inner or ""):
            p = p.strip().strip("`'\"")
            if p and p not in PLACEHOLDER:
                paths.append(p)
    return kinds, paths


def parse_shots(text: str) -> list[dict]:
    """镜头标题 → 下一个同级或更高级标题之间的正文。与 preflight.parse_shotbook 同规则。"""
    shots: list[dict] = []
    cur: dict | None = None
    for line in text.splitlines():
        m = SHOT_HEAD.match(line)
        if m:
            cur = {"id": m.group(2), "level": len(m.group(1)), "media": "", "kinds": set(), "paths": [],
                   "body": [line], "head": line}
            shots.append(cur)
            continue
        if cur is not None:
            hm = HEADING.match(line)
            if hm and len(hm.group(1)) <= cur["level"]:
                cur = None
                continue
            cur["body"].append(line)
            mm = MEDIA_LINE.match(line)
            if mm and not cur["media"]:
                cur["media"] = mm.group(1)
                cur["kinds"], cur["paths"] = media_kinds(mm.group(1))
    return shots


def shot_cards(shot: dict) -> tuple[list[str], bool]:
    """该镜用了哪些卡：只认「蒙皮行」里 → 之前的卡名（正文抄进来的「已知坑」不算）。返回 (slugs, 有没有蒙皮行)。"""
    for line in shot["body"]:
        m = SKIN_LINE.match(line)
        if m:
            head = re.split(r"→|->|\|", m.group(1), maxsplit=1)[0]
            return list(dict.fromkeys(SLUG.findall(head))), True
    return [], False


def shot_picks(shot: dict) -> dict[str, list[str]]:
    """「选卡行」→ {语义: [卡…]}；没有就空。格式：`- 选卡行：自我介绍 → lower-third-nameplate、数据 → number-counter`"""
    out: dict[str, list[str]] = {}
    for line in shot["body"]:
        m = PICK_LINE.match(line)
        if not m:
            continue
        for part in re.split(r"[、;；]", m.group(1)):
            seg = re.split(r"→|->", part)
            if len(seg) < 2:
                continue
            word = seg[0].strip().strip("`*")
            slugs = SLUG.findall(seg[1])
            if word and slugs:
                out.setdefault(word, []).extend(slugs)
    return out


def deviations(shot: dict) -> tuple[dict[str, str], list[str]]:
    """「语义偏离」行 → ({语义: 理由}, 格式不合的原始行)。理由去空白后 <4 字的不放行。"""
    ok: dict[str, str] = {}
    bad: list[str] = []
    for line in shot["body"]:
        m = DEVIATE.match(line)
        if m and len(re.sub(r"\s", "", m.group(2))) >= 4:
            ok[m.group(1)] = m.group(2).strip()
        elif DEVIATE_LOOSE.match(line):
            bad.append(line.strip())
    return ok, bad


def shot_times(shot: dict) -> tuple[float, float] | None:
    """镜头标题里的起止秒：`### S3 · 25.04–43.24 · 意图：…`（没有就 None）"""
    m = re.search(r"(\d+(?:\.\d+)?)\s*[–—~-]\s*(\d+(?:\.\d+)?)", shot["head"])
    if not m:
        return None
    a, b = float(m.group(1)), float(m.group(2))
    return (a, b) if b > a else None
