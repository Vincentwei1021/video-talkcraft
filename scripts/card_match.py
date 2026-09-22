#!/usr/bin/env python3
"""④ 选卡候选表：语义标注 × 素材行 × 卡索引 → 每镜「这句该用哪几张卡」的候选，写进 SHOTBOOK 的「选卡行」。

它替掉的是选卡漏斗里真正失效的那一环：过去只按输入类型过滤，剩下几十张卡靠翻类目和习惯挑，
于是自我介绍句拿到了文字卡。本脚本对每个**主句语义**列出可行候选 + 排序理由 + 一条落选理由，
并且给声明了素材的镜头单列一行**素材承接候选**（否则照建议做会被 preflight 的裸贴闸打回，评审 P1-5）。
agent 仍然做最终选择，但必须从候选里选，或在 SHOTBOOK 写一行 `- 语义偏离：<语义> ← 理由`。

用法（在工程根执行）：
  python3 <skill>/scripts/card_match.py                          # 读 semantics.json + SHOTBOOK.md，打印候选表
  python3 <skill>/scripts/card_match.py --out qa/card-candidates.md --json qa/card-candidates.json

排序（同一语义内）：可行性硬过滤 → 素材完全匹配 +2 · 位置匹配 +1 · P0 +0.5 ·
                    前两镜已选过 −2（读 SHOTBOOK 现有的蒙皮行 / 选卡行，没有则退回本脚本自己的首选）·
                    中段镜用开场 / 收尾专用卡 −1 · 要多图但本镜 ≤1 条素材 −2 · 内容写死需改源码（◦）且本镜有真素材 −1
可行性硬过滤：卡的「必需」输入必须在本镜素材行里（人(必需) 要有人）· 卡吃素材家族（V / 图 / 截图）时，
             本镜至少要有其中一种 · 只吃 文 / 界 / 场 的卡永远可行。
"""
from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cards_index import VOCAB  # noqa: E402
from semantic_annotate import HARD_SEM  # noqa: E402  与 preflight 同一份分档：硬语义不分 main / sub
from shotbook_parse import FAMILY, deviations, is_carrier, parse_shots, shot_cards, shot_picks  # noqa: E402

SKILL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_INDEX = os.path.join(SKILL_ROOT, "references", "cards-index.json")
VOCAB_ORDER = {w: i for i, (w, _) in enumerate(VOCAB)}


def feasible(card: dict, kinds: set[str]) -> tuple[bool, str]:
    for i in card["inputs"]:
        if i.get("need") == "必需" and i["type"] not in kinds:
            return False, f"需要「{i['type']}」（必需），本镜素材行没有"
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
    cpos = card.get("position", "任意")
    if pos != "中段" and cpos in (pos, "任意"):
        s += 1
        why.append(f"位置合（{cpos}）")
    elif pos == "中段" and cpos in ("开场", "收尾"):
        s -= 1
        why.append(f"{cpos}专用卡用在中段")
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
    absp = lambda p: p if os.path.isabs(p) else os.path.join(root, p)  # noqa: E731
    sem_p, sb_p = absp(a.semantics), absp(a.shotbook)
    for p, hint in ((sem_p, "先跑 semantic_annotate.py --init 并标完（②-1）"), (sb_p, "先写 SHOTBOOK 的素材行（④）")):
        if not os.path.exists(p):
            print(f"FAIL 找不到 {os.path.relpath(p, root)}——{hint}")
            return 1
    if not os.path.exists(a.index):
        print(f"FAIL 找不到卡索引 {a.index}——在 skill 仓库跑 `python3 scripts/cards_index.py --write` 生成")
        return 1
    try:
        cards = json.load(open(a.index, encoding="utf-8"))["cards"]
    except Exception as e:
        print(f"FAIL 卡索引读不出来（{e}）——重跑 `python3 scripts/cards_index.py --write`")
        return 1
    doc = json.load(open(sem_p, encoding="utf-8"))
    if not isinstance(doc.get("sentences"), list):
        print("FAIL semantics.json 的 sentences 不是数组——跑 semantic_annotate.py 校验")
        return 1
    shots = parse_shots(open(sb_p, encoding="utf-8").read())
    if not shots:
        print("FAIL SHOTBOOK 里没解析到镜头标题（### S1 · … ）")
        return 1
    by_shot: dict[str, list[dict]] = {}
    for s in doc["sentences"]:
        by_shot.setdefault(str(s.get("shot") or "").lower(), []).append(s)

    lines = ["# 选卡候选表（机器生成，供 SHOTBOOK「选卡行」用）", "",
             "每镜列主句语义的可行候选 + 一行素材承接候选；`◦` = 内容写死需改源码。",
             "最终选择由人做，选候选之外的要在该镜写一行 `- 语义偏离：<语义> ← 理由`（理由 ≥4 字，preflight 认这行）。", ""]
    out_json: dict[str, dict] = {}
    hist: list[set[str]] = []
    uncovered: list[str] = []
    shots_with_main = 0
    for idx, sh in enumerate(shots):
        pos = "开场" if idx == 0 else ("收尾" if idx == len(shots) - 1 else "中段")
        sents = by_shot.get(sh["id"].lower(), [])
        mains = [s for s in sents if s.get("weight") == "main"]
        sems: list[str] = []
        for s in mains:
            for w in s.get("sem") or []:
                if w not in sems:
                    sems.append(w)
        # 硬语义（自我介绍 / 介绍他人 / 号召）不分主次都要配卡，覆盖闸也这么核——
        # 只列主句会出现「候选表说未覆盖 0 条、preflight 却报缺卡」（2026-09-22 用户复查 #3）
        sems += [w for w in dict.fromkeys(
            w for s in sents if s.get("weight") != "main" for w in (s.get("sem") or []) if w in HARD_SEM
        ) if w not in sems]
        sems.sort(key=lambda w: VOCAB_ORDER.get(w, 99))
        if sems:
            shots_with_main += 1
        waived, _bad = deviations(sh)
        # 轮换历史：优先读 SHOTBOOK 里已经写下的选卡（蒙皮行 / 选卡行），没有才用本脚本自己的首选
        used_recent = set().union(*hist[-2:]) if hist else set()
        fam_needed = sh["kinds"] & FAMILY
        head = f"## {sh['id']} · 素材：{sh['media'] or '（缺素材行）'} · 语义（主句 + 不分主次的硬语义）：{'、'.join(sems) or '（无 main 句——②-1 的 shot 回填了吗？跑 semantic_annotate.py --sync-shots）'}"
        lines += [head, "", "| 语义 | 候选（分 · 能量 · 输入） | 为什么 | 落选一例 |", "|---|---|---|---|"]
        picks: set[str] = set()
        shot_json: dict[str, list[dict]] = {}
        for w in sems:
            if w in waived:
                lines.append(f"| **{w}** | （已写语义偏离，放行） | {waived[w][:24]} | — |")
                continue
            pool = [c for c in cards if w in c["semantics"]]
            ok, bad = [], []
            for c in pool:
                f, why_no = feasible(c, sh["kinds"])
                (ok if f else bad).append((c, why_no))
            ranked = sorted(((c, *score(c, sh["kinds"], pos, used_recent, len(sh["paths"]))) for c, _ in ok),
                            key=lambda x: (-x[1], x[0]["slug"]))
            if not ranked:
                uncovered.append(f"{sh['id']}·{w}")
                reason = bad[0][1] if bad else "库里没有这个语义的卡"
                lines.append(f"| **{w}** | （无可行卡） | — | {len(pool)} 张候选全不可行：{reason} |")
                continue
            top = ranked[: a.top]
            cand = " · ".join(f"{'◦' if c['hardcoded'] else ''}{c['slug']}({sc:+.1f} · {c['energy']} · {'/'.join(i['type'] for i in c['inputs'])})" for c, sc, _ in top)
            lost = f"{bad[0][0]['slug']}：{bad[0][1]}" if bad else (
                f"{ranked[a.top][0]['slug']}：分低（{ranked[a.top][1]:+.1f}）" if len(ranked) > a.top else "—")
            lines.append(f"| **{w}** | {cand} | {'；'.join(top[0][2]) or '语义专设'} | {lost} |")
            picks.add(top[0][0]["slug"])
            shot_json[w] = [{"slug": c["slug"], "score": sc, "energy": c["energy"], "why": wy} for c, sc, wy in top]
        # 素材承接：声明了 V / 图 / 截图 的镜，若首选里没有吃素材的呈现 / 运镜类卡，单列一行（preflight 的裸贴闸按这个判）
        carrier_pick: str | None = None
        if fam_needed:
            idx_by_slug = {c["slug"]: c for c in cards}
            existing_skin = set(shot_cards(sh)[0]) | {g for v in shot_picks(sh).values() for g in v}
            already = [g for g in (picks | existing_skin) if g in idx_by_slug and is_carrier(idx_by_slug[g])]
            pool = [c for c in cards if is_carrier(c) and feasible(c, sh["kinds"])[0]]
            ranked = sorted(((c, *score(c, sh["kinds"], pos, used_recent, len(sh["paths"]))) for c in pool),
                            key=lambda x: (-(len(set(x[0]["semantics"]) & set(sems)) > 0), -x[1], x[0]["slug"]))
            if already:
                lines.append(f"| **素材承接** | {' · '.join(sorted(already))}（已在首选或该镜蒙皮行里） | 素材有卡承接 | — |")
            elif ranked:
                top = ranked[: a.top]
                carrier_pick = top[0][0]["slug"]
                cand = " · ".join(f"{'◦' if c['hardcoded'] else ''}{c['slug']}({sc:+.1f} · {c['energy']} · {c['category']})" for c, sc, _ in top)
                lines.append(f"| **素材承接** | {cand} | 本镜声明了 {' / '.join(sorted(fam_needed))}，"
                             f"必须有一张呈现 / 运镜类卡承接（否则素材裸贴，preflight FAIL） | — |")
                shot_json["素材承接"] = [{"slug": c["slug"], "score": sc, "energy": c["energy"], "why": wy} for c, sc, wy in top]
                picks.add(carrier_pick)
            else:
                uncovered.append(f"{sh['id']}·素材承接")
                lines.append(f"| **素材承接** | （无可行卡） | 声明了 {' / '.join(sorted(fam_needed))} 却没有可行的呈现 / 运镜卡 | — |")
        suggest = "、".join([f"{w} → {shot_json[w][0]['slug']}" for w in sems if w in shot_json]
                           + ([f"素材承接 → {carrier_pick}"] if carrier_pick else []))
        lines += ["", f"建议选卡行：`- 选卡行：{suggest}`" if suggest else "", ""]
        out_json[sh["id"]] = {"media": sh["media"], "semantics": sems, "waived": waived, "candidates": shot_json}
        existing = set(shot_cards(sh)[0]) | {g for v in shot_picks(sh).values() for g in v}
        hist.append(existing or picks)

    if uncovered:
        lines += ["## 未覆盖（要补素材、补卡，或写偏离理由）", ""] + [f"- {x}" for x in uncovered] + [""]
    text = "\n".join(lines)
    if a.out:
        op = absp(a.out)
        os.makedirs(os.path.dirname(op) or ".", exist_ok=True)
        open(op, "w", encoding="utf-8").write(text)
        print(f"候选表 → {os.path.relpath(op, root)}")
    else:
        print(text)
    if a.json_out:
        jp = absp(a.json_out)
        os.makedirs(os.path.dirname(jp) or ".", exist_ok=True)
        json.dump(out_json, open(jp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"候选 JSON → {os.path.relpath(jp, root)}")
    print(f"{len(shots)} 镜 · 有主句语义的 {shots_with_main} 镜 · 未覆盖 {len(uncovered)} 条")
    if shots_with_main == 0:
        print("FAIL 没有任何一镜拿到主句语义：semantics.json 的 shot 字段没回填、或与 SHOTBOOK 的镜头 id 对不上——"
              "跑 `python3 <skill>/scripts/semantic_annotate.py --sync-shots`")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
