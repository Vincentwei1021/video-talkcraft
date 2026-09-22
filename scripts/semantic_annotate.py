#!/usr/bin/env python3
"""②-1 语义标注：把口播稿逐句标成机器可读的 `semantics.json`，并校验标得对不对。

为什么存在（2026-09-22 用户指出的通用缺陷）：选卡漏斗此前只有「输入类型」一道过滤，
稿子那一侧从来没有被标过「这句在做什么」——所以「我是万里」被当成又一个关键词，
配了最低能量的文字卡，三位独立评审也都放过（评审只核"摆上去的对不对"，不核"该摆的在不在"）。
语义标注是需求侧的结构化产物：它让 card_match.py 能出候选、preflight 能查覆盖、评审能对账。

用法（在工程根执行）：
  python3 <skill>/scripts/semantic_annotate.py --init                    # 从 timestamps.json 生成骨架（含词法提示），agent 填 sem / weight
  python3 <skill>/scripts/semantic_annotate.py                           # 校验（默认 --check）
  python3 <skill>/scripts/semantic_annotate.py --stats                   # 校验 + 分布统计

产物 semantics.json（ASCII 键，值用中文词表）：
  {"version":1, "source":{"timestamps":"audio/timestamps.json","shots":"remotion/shots.json"},
   "sentences":[{"i":0,"t":0.28,"text":"很多人听完每月定投三千","shot":"s01",
                 "sem":["钩子","数据"],          # 语义，封闭词表（taxonomy.md 语义索引同一份，源头 cards_index.py VOCAB）
                 "entities":["三千 元/月"],       # 实体：数字带单位 / 人名 / 品牌 / URL / 地点，给 ③ 素材清单用
                 "need":["量化"],                # 画面需求：证据 / 身份 / 量化 / 对比 / 结构 / 强调 / 无
                 "weight":"main",               # main = 主句，允许进新元素；sub = 陪衬句，只允许已有元素变化
                 "exempt":{"数据":"这里的三千是比喻"}}]}   # 可选：豁免某条词法硬规，必须写理由

校验项：
  结构    每句都在（i 与 timestamps 逐句对应、不多不少）· text 与 timestamps 逐字一致（改过稿 / 重剪后标注就失效）·
          t 与 timestamps start 差 ≤0.05s · sem 非空且在词表内 · need 在词表内 · weight ∈ {main, sub}
  词法    硬规（FAIL，除非 exempt + 理由）：我是/我叫 X → 自我介绍 · 点赞/订阅/一键三连 → 号召 · 数量词 → 数据
          软规（WARN）：引号/某某说 → 引用 · 但是/其实 → 转折 · 比如 → 例证 · 什么是/所谓 → 定义 ·
                       第一/首先 → 列举或步骤 · 句末问号 → 设问或钩子 · URL/官网 → need 含 证据 · 年份/地点 → 时间地点
  镜头    每镜至少一个 main（没有 = 这一镜没有主句，新元素无处挂）——WARN
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cards_index import VOCAB_SET  # noqa: E402  语义词表唯一来源

NEEDS = {"证据", "身份", "量化", "对比", "结构", "强调", "无"}
WEIGHTS = {"main", "sub"}
PUNCT = re.compile(r"[\s，。、！？：；…—·「」『』\"\"''（）()《》,.!?:;]+")

# —— 词法粗筛：只兜底最硬的几条，目的不是替代判断，而是拦住"数据句被降级成论点"这类系统性漏标 ——
HARD = [
    ("自我介绍", re.compile(r"我(?:是|叫)(?!不|很|这|那|在|会|要|想|觉|为|因|怎|如|谁|什|个|从|把|被|跟|和|对|可|能|已|正)[一-龥A-Za-z·]{1,8}")),
    ("号召", re.compile(r"点赞|订阅|一键三连|三连|求个|点个")),
    ("数据", re.compile(r"[0-9０-９]{2,}|百分之|[0-9０-９]+\s*[%％]|[一二三四五六七八九十两]\s*[十百千万亿]|[一二三四五六七八九十百千万两]+\s*(?:元|块|倍|年|个月|万|亿|美元)")),
]
SOFT = [
    ({"引用"}, re.compile(r"[「『“‘][^」』”’]{4,}[」』”’]|(?:他|她|某|专家|作者|老师|网友|书里)(?:说|讲|提到|写道)|据.{1,6}(?:报道|统计|显示)")),
    ({"转折"}, re.compile(r"^(?:但是|但|然而|其实|可是|不过|并不是|不是)")),
    ({"例证"}, re.compile(r"比如|例如|举个例子|拿.{1,6}来说")),
    ({"定义"}, re.compile(r"什么是|所谓|叫做|定义为|指的是|意思是")),
    ({"列举", "步骤"}, re.compile(r"第一|第二|第三|首先|其次|再者|接着|然后|最后")),
    ({"设问", "钩子"}, re.compile(r"[?？]\s*$|吗\s*[?？]?\s*$|呢\s*[?？]?\s*$")),
    ({"时间地点"}, re.compile(r"[0-9]{4}\s*年|去年|今年|前年|昨天|上周|上个月")),
    ({"介绍他人"}, re.compile(r"(?:他|她)(?:是|叫)|这个(?:人|账号|博主|作者)|推荐(?:一个|大家)")),
    ({"号召"}, re.compile(r"关注|收藏|转发")),
]
EVIDENCE_RE = re.compile(r"https?://|www\.|\.com|\.cn|官网|网址|页面")

results: list[tuple[str, str]] = []


def rec(level: str, msg: str) -> None:
    results.append((level, msg))
    print(f"[{level}] {msg}")


def norm(s: str) -> str:
    return PUNCT.sub("", s)


def load_shots(path: str | None) -> list[dict]:
    if not path or not os.path.exists(path):
        return []
    data = json.load(open(path, encoding="utf-8"))
    return data if isinstance(data, list) else []


def shot_of(t: float, shots: list[dict]) -> str | None:
    for s in shots:
        if s.get("start", 0) - 1e-9 <= t < s.get("end", 0):
            return s.get("id")
    return shots[-1].get("id") if shots and t >= shots[-1].get("start", 0) else None


def hints(text: str) -> list[str]:
    out: list[str] = []
    for w, pat in HARD:
        if pat.search(text):
            out.append(w)
    for ws, pat in SOFT:
        if pat.search(text):
            out.extend(sorted(ws))
    if EVIDENCE_RE.search(text):
        out.append("need:证据")
    return list(dict.fromkeys(out))


def cmd_init(ts: dict, shots: list[dict], out_path: str, ts_rel: str, shots_rel: str | None) -> int:
    sents = []
    for s in ts["sentences"]:
        sents.append({
            "i": s["i"], "t": round(float(s["start"]), 3), "text": s["text"],
            "shot": shot_of(float(s["start"]), shots) or "",
            "sem": [], "entities": [], "need": [], "weight": "",
            "hint": hints(s["text"]),
        })
    doc = {"version": 1, "source": {"timestamps": ts_rel, **({"shots": shots_rel} if shots_rel else {})}, "sentences": sents}
    json.dump(doc, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    filled = sum(1 for s in sents if s["hint"])
    print(f"写入骨架 {out_path}：{len(sents)} 句，其中 {filled} 句有词法提示（hint 只是提示，sem / weight 要人工填；填完删 hint 或留着都行）")
    print(f"语义词表 {len(VOCAB_SET)} 词见 references/taxonomy.md「语义索引」；need 词表：{' / '.join(sorted(NEEDS))}")
    return 0


def cmd_check(ts: dict, shots: list[dict], sem_path: str, stats: bool) -> int:
    doc = json.load(open(sem_path, encoding="utf-8"))
    sents = doc.get("sentences")
    if not isinstance(sents, list) or not sents:
        rec("FAIL", f"{os.path.basename(sem_path)} 里没有 sentences 数组")
        return 1
    by_i = {}
    for s in sents:
        if "i" not in s:
            rec("FAIL", f"有句缺 i：{str(s)[:60]}")
            continue
        if s["i"] in by_i:
            rec("FAIL", f"句 {s['i']} 重复出现")
        by_i[s["i"]] = s
    ts_by_i = {s["i"]: s for s in ts["sentences"]}
    missing = sorted(set(ts_by_i) - set(by_i))
    extra = sorted(set(by_i) - set(ts_by_i))
    if missing:
        rec("FAIL", f"{len(missing)} 句没标：i={missing[:12]}{' …' if len(missing) > 12 else ''}（每句都要标，陪衬句标 weight=sub）")
    if extra:
        rec("FAIL", f"标了不存在的句：i={extra}")

    drift, tdrift, bad_sem, bad_need, bad_w, hard_miss, soft_miss, need_ev = [], [], [], [], [], [], [], []
    per_shot_main: dict[str, int] = {}
    sem_count: dict[str, int] = {}
    for i, s in sorted(by_i.items()):
        t0 = ts_by_i.get(i)
        if not t0:
            continue
        if norm(s.get("text", "")) != norm(t0["text"]):
            drift.append(i)
        if abs(float(s.get("t", -9)) - float(t0["start"])) > 0.05:
            tdrift.append(f"{i}({s.get('t')}≠{t0['start']})")
        sem = s.get("sem") or []
        if not sem:
            bad_sem.append(f"{i}:空")
        for w in sem:
            if w not in VOCAB_SET:
                bad_sem.append(f"{i}:{w}")
            sem_count[w] = sem_count.get(w, 0) + 1
        for n in s.get("need") or []:
            if n not in NEEDS:
                bad_need.append(f"{i}:{n}")
        w = s.get("weight")
        if w not in WEIGHTS:
            bad_w.append(f"{i}:{w!r}")
        if w == "main":
            per_shot_main[s.get("shot") or "?"] = per_shot_main.get(s.get("shot") or "?", 0) + 1
        text = t0["text"]
        exempt = s.get("exempt") or {}
        for word, pat in HARD:
            if pat.search(text) and word not in sem:
                why = str(exempt.get(word, "")).strip()
                if len(why) >= 4:
                    continue
                hard_miss.append(f"i={i}「{text[:16]}」应含 {word}")
        for ws, pat in SOFT:
            if pat.search(text) and not (ws & set(sem)):
                soft_miss.append(f"i={i}「{text[:14]}」疑似 {'/'.join(sorted(ws))}")
        if EVIDENCE_RE.search(text) and "证据" not in (s.get("need") or []):
            need_ev.append(str(i))

    if drift:
        rec("FAIL", f"{len(drift)} 句 text 与 timestamps 不一致：i={drift[:12]}——稿子或配音改过，标注已失效，重新 --init 再补")
    if tdrift:
        rec("FAIL", f"t 与 timestamps start 差 >0.05s：{' '.join(tdrift[:8])}")
    if bad_sem:
        rec("FAIL", f"sem 为空或词表外：{' '.join(bad_sem[:12])}（词表见 taxonomy.md 语义索引）")
    if bad_need:
        rec("FAIL", f"need 词表外：{' '.join(bad_need[:12])}（只能是 {' / '.join(sorted(NEEDS))}）")
    if bad_w:
        rec("FAIL", f"weight 只能是 main / sub：{' '.join(bad_w[:12])}")
    if hard_miss:
        rec("FAIL", f"{len(hard_miss)} 句漏标硬规语义：" + "；".join(hard_miss[:6])
                    + "（确实不是的话在该句写 exempt:{\"<语义>\":\"理由\"}）")
    if soft_miss:
        rec("WARN", f"{len(soft_miss)} 句疑似漏标：" + "；".join(soft_miss[:8]))
    if need_ev:
        rec("WARN", f"提到网址 / 页面但 need 没写 证据：i={' '.join(need_ev[:10])}（③ 素材要按这个去采真图）")
    if shots:
        no_main = [s["id"] for s in shots if per_shot_main.get(s["id"], 0) == 0]
        if no_main:
            rec("WARN", f"{len(no_main)} 镜没有 main 句：{' '.join(no_main)}——一镜至少一个主句，否则新元素没有挂点（cinematography §4.5）")
    if not [lv for lv, _ in results if lv in ("FAIL", "WARN")]:
        rec("PASS", f"{len(by_i)} 句语义标注齐全、词表封闭、与 timestamps 一致")

    if stats:
        print("\n语义分布（句数）：")
        for w, n in sorted(sem_count.items(), key=lambda x: -x[1]):
            print(f"  {w:<6} {n}")
        if shots:
            print("主句 / 镜：" + " ".join(f"{s['id']}:{per_shot_main.get(s['id'], 0)}" for s in shots))

    fails = [m for lv, m in results if lv == "FAIL"]
    warns = [m for lv, m in results if lv == "WARN"]
    print(f"\n== 语义标注 {'FAIL' if fails else 'PASS'} ==  FAIL {len(fails)} · WARN {len(warns)}")
    return 1 if fails else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", default=".")
    ap.add_argument("--timestamps", default="audio/timestamps.json")
    ap.add_argument("--shots", default="remotion/shots.json")
    ap.add_argument("--semantics", default="semantics.json")
    ap.add_argument("--init", action="store_true", help="生成骨架（不覆盖已有文件，除非 --force）")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--stats", action="store_true")
    a = ap.parse_args()
    root = os.path.abspath(a.project)
    ts_path = a.timestamps if os.path.isabs(a.timestamps) else os.path.join(root, a.timestamps)
    sem_path = a.semantics if os.path.isabs(a.semantics) else os.path.join(root, a.semantics)
    shots_path = a.shots if os.path.isabs(a.shots) else os.path.join(root, a.shots)
    if not os.path.exists(ts_path):
        print(f"FAIL 找不到 {a.timestamps}（先做 ② 字级时间戳）")
        return 1
    ts = json.load(open(ts_path, encoding="utf-8"))
    shots = load_shots(shots_path)
    if a.init:
        if os.path.exists(sem_path) and not a.force:
            print(f"FAIL {a.semantics} 已存在（--force 覆盖；覆盖会丢掉已标内容）")
            return 1
        return cmd_init(ts, shots, sem_path, a.timestamps, a.shots if shots else None)
    if not os.path.exists(sem_path):
        print(f"FAIL 找不到 {a.semantics}——先跑 --init 生成骨架再逐句标（②-1）")
        return 1
    return cmd_check(ts, shots, sem_path, a.stats)


if __name__ == "__main__":
    sys.exit(main())
