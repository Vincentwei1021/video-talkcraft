#!/usr/bin/env python3
"""④ 选卡候选表：语义标注 × 素材行 × 卡索引 → 每镜「这句该用哪几张卡」的候选，写进 SHOTBOOK 的「选卡行」。

它替掉的是选卡漏斗里真正失效的那一环：过去只按输入类型过滤，剩下几十张卡靠翻类目和习惯挑，
于是自我介绍句拿到了文字卡。本脚本对每个**主句语义**列出可行候选 + 排序理由 + 一条落选理由；
agent 仍然做最终选择，但必须从候选里选，或在 SHOTBOOK 写一行偏离理由（preflight 认这行）。

用法（在工程根执行）：
  python3 <skill>/scripts/card_match.py                          # 读 semantics.json + SHOTBOOK.md，打印候选表
  python3 <skill>/scripts/card_match.py --out qa/card-candidates.md --json qa/card-candidates.json

排序（同一语义内）：可行性硬过滤 → 素材完全匹配 +2 · 位置匹配 +1 · P0 +0.5 · 前两镜用过 −2 ·
                    需要多图而本镜只有一条素材 −2 · 内容写死需改源码（◦）且本镜有真素材 −1
可行性硬过滤：卡的「必需」输入必须在本镜素材行里（人(必需) 要有人）· 卡吃素材家族（V / 图 / 截图）时，
             本镜至少要有其中一种 · 只吃 文 / 界 / 场 的卡永远可行。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cards_index import VOCAB  # noqa: E402

SKILL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_INDEX = os.path.join(SKILL_ROOT, "references", "cards-index.json")

SHOT_HEAD = re.compile(r"^#{2,4}\s*([SsVv]\d+[A-Za-z]?)\b")
MEDIA_LINE = re.compile(r"^\s*(?:[-*]\s*)?\**素材\**\s*[:：]\s*(.+?)\s*$")
TOKEN = re.compile(r"(人|V|图|截图|界|文|纯动效)\s*(?:[（(]([^）)]*)[）)])?")
FAMILY = {"V", "图", "截图"}
VOCAB_ORDER = {w: i for i, (w, _) in enumerate(VOCAB)}


def parse_shotbook(path: str) -> list[dict]:
    shots: list[dict] = []
    cur = None
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        m = SHOT_HEAD.match(line)
        if m:
            cur = {"id": m.group(1).lower(), "media": "", "kinds": set(), "paths": [], "deviate": []}
            shots.append(cur)
            continue
        if cur is None:
            continue
        mm = MEDIA_LINE.match(line)
        if mm and not cur["media"]:
            cur["media"] = mm.group(1)
            for kind, paths in TOKEN.findall(mm.group(1)):
                cur["kinds"].add("文" if kind == "纯动效" else kind)
                if paths:
                    cur["paths"] += [p for p in re.split(r"[,，、\s]+", paths) if p]
        if "语义偏离" in line:
            cur["deviate"].append(line.strip())
    return shots


def feasible(card: dict, kinds: set[str]) -> tuple[bool, str]:
    need_types = [i["type"] for i in card["inputs"] if i.get("need") == "必需"]
    for t in need_types:
        if t not in kinds:
            return False, f"需要「{t}」（必需），本镜素材行没有"
    fam = {i["type"] for i in card["inputs"]} & FAMILY
    if fam and not (fam & kinds):
        return False, f"吃 {' / '.join(sorted(fam))}，本镜素材行只有 {' / '.join(sorted(kinds)) or '无'}"
    return True, ""


def score(card: dict, kinds: set[str], pos: str, used_recent: set[str], n_media: int) -> tuple[float, list[str]]:
    s, why = 0.0, []
    fam = {i["type"] for i in card["inputs"]} & FAMILY
    if fam and fam <= kinds:
        s += 2
        why.append("素材完全匹配")
    elif fam:
        why.append("素材部分匹配")
    if card.get("position") in (pos, "任意") and pos != "中段":
        s += 1
        why.append(f"位置合（{card.get('position')}）")
    if card.get("priority") == "P0":
        s += 0.5
        why.append("P0")
    if card["slug"] in used_recent:
        s -= 2
        why.append("前两镜用过（版式轮换扣分）")
    if "多图" in (card.get("material_shape") or []) and n_media < 2:
        s -= 2
        why.append("要多图但本镜只有 ≤1 条素材")
    if card.get("hardcoded") and n_media:
        s -= 1
        why.append("内容写死需改源码（◦）")
    return s, why


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", default=".")
    ap.add_argument("--semantics", default="semantics.json")
    ap.add_argument("--shotbook", default="SHOTBOOK.md")
    ap.add_argument("--index", default=DEFAULT_INDEX)
    ap.add_argument("--top", type=int, default=3)
    ap.add_argument("--out", default=None, help="候选表落盘（markdown）")
    ap.add_argument("--json", dest="json_out", default=None)
    a = ap.parse_args()
    root = os.path.abspath(a.project)
    sem_p = a.semantics if os.path.isabs(a.semantics) else os.path.join(root, a.semantics)
    sb_p = a.shotbook if os.path.isabs(a.shotbook) else os.path.join(root, a.shotbook)
    for p, hint in ((sem_p, "先跑 semantic_annotate.py --init 并标完（②-1）"), (sb_p, "先写 SHOTBOOK 的素材行（④）")):
        if not os.path.exists(p):
            print(f"FAIL 找不到 {os.path.relpath(p, root)}——{hint}")
            return 1
    cards = json.load(open(a.index, encoding="utf-8"))["cards"]
    doc = json.load(open(sem_p, encoding="utf-8"))
    shots = parse_shotbook(sb_p)
    if not shots:
        print("FAIL SHOTBOOK 里没解析到镜头标题（### S1 · … ）")
        return 1
    by_shot: dict[str, list[dict]] = {}
    for s in doc["sentences"]:
        by_shot.setdefault((s.get("shot") or "").lower(), []).append(s)

    lines = ["# 选卡候选表（机器生成，供 SHOTBOOK「选卡行」用）", "",
             "每镜列主句语义的可行候选；`◦` = 内容写死需改源码。最终选择由人做，选候选之外的要在该镜写一行 `- 语义偏离：<语义> ← 理由`。", ""]
    out_json: dict[str, dict] = {}
    used_hist: list[set[str]] = []
    uncovered: list[str] = []
    for idx, sh in enumerate(shots):
        pos = "开场" if idx == 0 else ("收尾" if idx == len(shots) - 1 else "中段")
        sents = by_shot.get(sh["id"], [])
        mains = [s for s in sents if s.get("weight") == "main"]
        sems: list[str] = []
        for s in mains:
            for w in s.get("sem") or []:
                if w not in sems:
                    sems.append(w)
        sems.sort(key=lambda w: VOCAB_ORDER.get(w, 99))
        used_recent = set().union(*used_hist[-2:]) if used_hist else set()
        lines += [f"## {sh['id']} · 素材：{sh['media'] or '（缺素材行）'} · 主句语义：{'、'.join(sems) or '（无 main 句）'}", "",
                  "| 语义 | 候选（分 · 能量 · 输入） | 为什么 | 落选一例 |", "|---|---|---|---|"]
        picks: set[str] = set()
        shot_json: dict[str, list[dict]] = {}
        for w in sems:
            pool = [c for c in cards if w in c["semantics"]]
            ok, bad = [], []
            for c in pool:
                f, why_no = feasible(c, sh["kinds"])
                (ok if f else bad).append((c, why_no))
            ranked = sorted(((c, *score(c, sh["kinds"], pos, used_recent, len(sh["paths"]))) for c, _ in ok),
                            key=lambda x: (-x[1], x[0]["slug"]))
            if not ranked:
                miss = f"{sh['id']}·{w}"
                uncovered.append(miss)
                reason = bad[0][1] if bad else "库里没有这个语义的卡"
                lines.append(f"| **{w}** | （无可行卡） | — | {len(pool)} 张候选全不可行：{reason} |")
                continue
            top = ranked[: a.top]
            cand = " · ".join(f"{'◦' if c['hardcoded'] else ''}{c['slug']}({sc:+.1f} · {c['energy']} · {'/'.join(i['type'] for i in c['inputs'])})" for c, sc, _ in top)
            why = "；".join(top[0][2]) or "语义专设"
            lost = ""
            if bad:
                lost = f"{bad[0][0]['slug']}：{bad[0][1]}"
            elif len(ranked) > a.top:
                c2, sc2, why2 = ranked[a.top]
                lost = f"{c2['slug']}：分低（{sc2:+.1f}，{'；'.join(why2) or '无加分项'}）"
            lines.append(f"| **{w}** | {cand} | {why} | {lost or '—'} |")
            picks.add(top[0][0]["slug"])
            shot_json[w] = [{"slug": c["slug"], "score": sc, "energy": c["energy"], "why": wy} for c, sc, wy in top]
        suggest = "、".join(f"{w} → {shot_json[w][0]['slug']}" for w in sems if w in shot_json)
        lines += ["", f"建议选卡行：`- 选卡行：{suggest}`" if suggest else "", ""]
        out_json[sh["id"]] = {"media": sh["media"], "semantics": sems, "candidates": shot_json}
        used_hist.append(picks)

    if uncovered:
        lines += ["## 未覆盖（要补素材、补卡，或写偏离理由）", ""] + [f"- {x}" for x in uncovered] + [""]
    text = "\n".join(lines)
    if a.out:
        op = a.out if os.path.isabs(a.out) else os.path.join(root, a.out)
        os.makedirs(os.path.dirname(op), exist_ok=True)
        open(op, "w", encoding="utf-8").write(text)
        print(f"候选表 → {os.path.relpath(op, root)}")
    else:
        print(text)
    if a.json_out:
        jp = a.json_out if os.path.isabs(a.json_out) else os.path.join(root, a.json_out)
        os.makedirs(os.path.dirname(jp), exist_ok=True)
        json.dump(out_json, open(jp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"候选 JSON → {os.path.relpath(jp, root)}")
    print(f"{len(shots)} 镜 · 未覆盖 {len(uncovered)} 条" + ("（未覆盖不是 FAIL，是要你决定补素材 / 补卡 / 写偏离）" if uncovered else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
