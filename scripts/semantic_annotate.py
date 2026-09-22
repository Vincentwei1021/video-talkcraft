#!/usr/bin/env python3
"""②-1 语义标注：把口播稿逐句标成机器可读的 `semantics.json`，并校验标得对不对。

为什么存在（2026-09-22 用户指出的通用缺陷）：选卡漏斗此前只有「输入类型」一道过滤，
稿子那一侧从来没有被标过「这句在做什么」——所以「我是万里」被当成又一个关键词，
配了最低能量的文字卡，三位独立评审也都放过（评审只核"摆上去的对不对"，不核"该摆的在不在"）。
语义标注是需求侧的结构化产物：它让 card_match.py 能出候选、preflight 能查覆盖、评审能对账。

用法（在工程根执行）：
  python3 <skill>/scripts/semantic_annotate.py --init          # ② 之后：从 timestamps.json 出骨架（含词法提示），逐句填 sem / weight
  python3 <skill>/scripts/semantic_annotate.py --sync-shots    # ④ 之后：按 SHOTBOOK / shots.json 的时间范围回填 shot（只动 shot，标注不丢）
  python3 <skill>/scripts/semantic_annotate.py [--stats]       # 校验（默认）

**顺序**：② 时间戳 → ②-1 标注（此时还没有分镜，shot 允许为空）→ ④ SHOTBOOK 写完 → `--sync-shots` 回填 shot → card_match / preflight。
漏了回填这一步，下游的镜头级覆盖核不到任何东西（2026-09-22 独立评审 P0-1）。

产物 semantics.json（ASCII 键，值用中文词表）：
  {"version":1, "source":{"timestamps":"audio/timestamps.json","shots":"remotion/shots.json"},
   "sentences":[{"i":0,"t":0.28,"text":"很多人听完每月定投三千","shot":"s01",
                 "sem":["钩子","数据"],          # 语义，封闭词表（taxonomy.md 语义索引同一份，源头 cards_index.py VOCAB）
                 "entities":["三千 元/月"],       # 实体：数字带单位 / 人名 / 品牌 / URL / 地点，给 ③ 素材清单用
                 "need":["量化"],                # 画面需求：证据 / 身份 / 量化 / 对比 / 结构 / 强调 / 无（need 含 量化 的数据主句，preflight 判 FAIL 级覆盖）
                 "weight":"main",               # main = 主句，允许进新元素；sub = 陪衬句，只允许已有元素变化
                 "exempt":{"数据":"这里的三千是比喻"}}]}   # 可选：豁免某条词法硬规，理由 ≥4 字

校验项：
  结构    每句都在（i 与 timestamps 逐句对应、不多不少）· text 与 timestamps 逐字一致（改稿 / 重剪后标注即失效）·
          t 与 timestamps start 差 ≤0.05s · sem 非空且在词表内 · need 在词表内 · weight ∈ {main, sub}
  镜头    有分镜来源（shots.json 或 SHOTBOOK 标题带起止秒）时：shot 不能为空、必须是已知镜头 id → FAIL（跑 --sync-shots 回填）
          每镜至少一个 main → WARN；整镜只有 main / 只有 sub → WARN
  词法    硬规（FAIL，除非 exempt + 理由 ≥4 字）：我是/我叫 <人名> → 自我介绍 · 点赞/订阅/三连 → 号召 · 数量词 → 数据
          软规（WARN）：引号/某某说 → 引用 · 但是/其实 → 转折 · 比如 → 例证 · 什么是/所谓 → 定义 ·
                       第一/首先 → 列举或步骤 · 句末问号 → 设问或钩子 · URL/官网 → need 含 证据 · 年份 → 时间地点
  兜底    论点 占比 >50% → WARN（论点是兜底档，不是垃圾桶：把什么都标成论点等于让覆盖闸全部失效）
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cards_index import VOCAB_SET  # noqa: E402  语义词表唯一来源
from shotbook_parse import parse_shots, shot_times  # noqa: E402

NEEDS = {"证据", "身份", "量化", "对比", "结构", "强调", "无"}
WEIGHTS = {"main", "sub"}
PUNCT = re.compile(r"[\s，。、！？：；…—·「」『』\"\"''（）()《》,.!?:;]+")

# —— 词法粗筛：只兜底最硬的几条，目的不是替代判断，而是拦住"数据句被降级成论点"这类系统性漏标 ——
# 自我介绍：我是/我叫 + 像人名的 2~4 字（或拉丁名），且整句短——「我是做内容的 / 我是一个普通人 / 我叫它复利」不算（评审 P2-1）
SELF_RE = re.compile(r"我(?:是|叫)\s*(?:([一-龥]{2,4})|([A-Za-z][A-Za-z·\s]{1,12}))(?![一-龥])")
SELF_BAD = re.compile(r"[的了个们它他她这那什么谁很不在会要想觉为因怎如]")
# 号召硬规：只收明确的祈使 / 动作，避免「这件事值得关注 / 大家很关注房价」误伤（三轮复核建议）
CTA_RE = re.compile(r"点赞|订阅|一键三连|三连|求个|点个|记得关注|点个关注|关注我|关注一下|求关注|收藏起来|转发给")
# 数量：先抹掉「一年 / 这一天 / 一个月」这类时间用法，再判（评审 P2-1）
TIMEY = re.compile(r"(?:这|那|上|下|前|后|每|头)?一(?:年|天|个月|会儿|下|点|些|直|定|旦|般|样|起|同|边|块)")
NUM_RES = [
    re.compile(r"[0-9０-９]{2,}"),
    re.compile(r"百分之|[0-9０-９]+\s*[%％]|[0-9０-９]+\s*(?:倍|万|亿|元|块|年)"),
    re.compile(r"[一二三四五六七八九十百千两]+\s*(?:元|块|倍|万|亿|美元|个点)"),
    re.compile(r"[一二三四五六七八九十两]\s*[十百千]"),
]


def is_self_intro(text: str) -> bool:
    if len(text) > 14:
        return False
    m = SELF_RE.search(text)
    if not m:
        return False
    name = (m.group(1) or m.group(2) or "").strip()
    return bool(name) and not SELF_BAD.search(name)


def has_number(text: str) -> bool:
    t = TIMEY.sub("", text)
    return any(p.search(t) for p in NUM_RES)


HARD: list[tuple[str, object]] = [("自我介绍", is_self_intro), ("号召", lambda t: bool(CTA_RE.search(t))), ("数据", has_number)]
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
    ({"自我介绍", "介绍他人"}, re.compile(r"我(?:是|叫)|(?:他|她)(?:是|叫)")),   # 硬规收紧后的兜底提示（复核 P2）
]
EVIDENCE_RE = re.compile(r"https?://|www\.|\.com|\.cn|官网|网址|页面")

results: list[tuple[str, str]] = []


def rec(level: str, msg: str) -> None:
    results.append((level, msg))
    print(f"[{level}] {msg}")


def norm(s: str) -> str:
    return PUNCT.sub("", s)


def hints(text: str) -> list[str]:
    out: list[str] = []
    for w, fn in HARD:
        if fn(text):
            out.append(w)
    for ws, pat in SOFT:
        if pat.search(text):
            out.extend(sorted(ws))
    if EVIDENCE_RE.search(text):
        out.append("need:证据")
    return list(dict.fromkeys(out))


def shot_ranges(shots_path: str, shotbook_path: str) -> tuple[list[tuple[str, float, float]], str]:
    """分镜来源：优先 shots.json（⑤ 的产物），否则 SHOTBOOK 标题里的起止秒（④ 就有）。"""
    if os.path.exists(shots_path):
        try:
            data = json.load(open(shots_path, encoding="utf-8"))
            rs = [(str(x["id"]), float(x["start"]), float(x["end"])) for x in data if "id" in x]
            if rs:
                return rs, os.path.basename(shots_path)
        except Exception:
            pass
    if os.path.exists(shotbook_path):
        rs = []
        for sh in parse_shots(open(shotbook_path, encoding="utf-8").read()):
            tt = shot_times(sh)
            if tt:
                rs.append((sh["id"], tt[0], tt[1]))
        if rs:
            return rs, os.path.basename(shotbook_path)
    return [], ""


def assign(t: float, ranges: list[tuple[str, float, float]]) -> str:
    for sid, a, b in ranges:
        if a - 1e-9 <= t < b:
            return sid
    if ranges and t >= ranges[-1][1]:
        return ranges[-1][0]
    return ""


def cmd_init(ts: dict, ranges: list, out_path: str, ts_rel: str, src_name: str) -> int:
    sents = [{
        "i": s["i"], "t": round(float(s["start"]), 3), "text": s["text"],
        "shot": assign(float(s["start"]), ranges).lower(),
        "sem": [], "entities": [], "need": [], "weight": "", "hint": hints(s["text"]),
    } for s in ts["sentences"]]
    doc = {"version": 1, "source": {"timestamps": ts_rel, **({"shots": src_name} if src_name else {})}, "sentences": sents}
    json.dump(doc, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"写入骨架 {os.path.basename(out_path)}：{len(sents)} 句，{sum(1 for s in sents if s['hint'])} 句有词法提示"
          f"（hint 只是提示，sem / weight 要人工填）")
    if not ranges:
        print("还没有分镜（正常，②-1 早于 ④）：shot 先留空；**④ SHOTBOOK 写完后必须跑 --sync-shots 回填**，否则下游覆盖闸核不到东西")
    print(f"语义词表 {len(VOCAB_SET)} 词见 references/taxonomy.md「语义索引」；need 词表：{' / '.join(sorted(NEEDS))}")
    return 0


def cmd_sync(sem_path: str, ranges: list, src_name: str) -> int:
    if not ranges:
        print("FAIL 没有分镜来源：既没有 remotion/shots.json，SHOTBOOK 的镜头标题也没写起止秒（`### S3 · 25.04–43.24 · …`）")
        return 1
    doc = json.load(open(sem_path, encoding="utf-8"))
    sents = doc.get("sentences")
    if not isinstance(sents, list):
        print("FAIL semantics.json 的 sentences 不是数组")
        return 1
    changed = 0
    for s in sents:
        new = assign(float(s.get("t", -1)), ranges).lower()   # 统一小写：换来源时不再整表改写大小写
        if new and s.get("shot") != new:
            s["shot"] = new
            changed += 1
    doc.setdefault("source", {})["shots"] = src_name
    json.dump(doc, open(sem_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    empty = [s["i"] for s in sents if not s.get("shot")]
    print(f"按 {src_name} 回填 shot：改了 {changed} 句 / 共 {len(sents)}；只动 shot，sem / weight / entities / need / exempt 未动")
    if empty:
        print(f"WARN 仍有 {len(empty)} 句没归到任何镜头（i={empty[:10]}）：镜头时间范围没覆盖到，核对 SHOTBOOK 起止秒")
    return 0


def cmd_check(ts: dict, ranges: list, src_name: str, sem_path: str, stats: bool) -> int:
    doc = json.load(open(sem_path, encoding="utf-8"))
    sents = doc.get("sentences")
    if not isinstance(sents, list) or not sents:
        rec("FAIL", f"{os.path.basename(sem_path)} 的 sentences 不是非空数组（拿到 {type(sents).__name__}）")
        return 1
    by_i: dict[int, dict] = {}
    for s in sents:
        if not isinstance(s, dict) or "i" not in s:
            rec("FAIL", f"有句不是对象或缺 i：{str(s)[:60]}")
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

    known = {sid.lower() for sid, _, _ in ranges}   # 大小写无关：④ 从 SHOTBOOK 得到 S01、⑤ 的 shots.json 是 s01（复核 P1-R3）
    drift, tdrift, bad_sem, bad_need, bad_w, hard_miss, soft_miss, need_ev = [], [], [], [], [], [], [], []
    no_shot, bad_shot, exempts = [], [], []
    per_shot: dict[str, dict[str, int]] = {}
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
        sid = str(s.get("shot") or "")
        if ranges:
            if not sid:
                no_shot.append(str(i))
            elif sid.lower() not in known:
                bad_shot.append(f"{i}:{sid}")
        d = per_shot.setdefault(sid.lower(), {"main": 0, "sub": 0})
        if w in WEIGHTS:
            d[w] += 1
        text = t0["text"]
        exempt = s.get("exempt") or {}
        for word, fn in HARD:
            if fn(text) and word not in sem:
                why = str(exempt.get(word, "")).strip()
                if len(re.sub(r"\s", "", why)) >= 4:
                    exempts.append(f"i={i}:{word}")
                    continue
                if word in exempt:
                    bad_sem.append(f"{i}:exempt[{word}] 理由不足 4 字")
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
        rec("FAIL", f"sem 为空 / 词表外 / 豁免理由不足：{' '.join(bad_sem[:12])}（词表见 taxonomy.md 语义索引）")
    if bad_need:
        rec("FAIL", f"need 词表外：{' '.join(bad_need[:12])}（只能是 {' / '.join(sorted(NEEDS))}）")
    if bad_w:
        rec("FAIL", f"weight 只能是 main / sub：{' '.join(bad_w[:12])}")
    if no_shot:
        rec("FAIL", f"{len(no_shot)} 句没有 shot（分镜来源 {src_name} 已在册）：i={no_shot[:10]}——跑 `--sync-shots` 回填；"
                    f"不回填的话 card_match 每镜都是「无 main 句」、preflight 的语义覆盖核不到任何东西")
    if bad_shot:
        rec("FAIL", f"shot 不是 {src_name} 里的镜头 id：{' '.join(bad_shot[:10])}——id 对不上，覆盖闸会整段空转")
    if hard_miss:
        rec("FAIL", f"{len(hard_miss)} 句漏标硬规语义：" + "；".join(hard_miss[:6])
                    + "（确实不是的话在该句写 exempt:{\"<语义>\":\"理由\"}，理由 ≥4 字）")
    if soft_miss:
        rec("WARN", f"{len(soft_miss)} 句疑似漏标：" + "；".join(soft_miss[:8]))
    if need_ev:
        rec("WARN", f"提到网址 / 页面但 need 没写 证据：i={' '.join(need_ev[:10])}（③ 素材要按这个去采真图）")
    if ranges:
        no_main = [sid for sid, _, _ in ranges if per_shot.get(sid.lower(), {}).get("main", 0) == 0]
        if no_main:
            rec("WARN", f"{len(no_main)} 镜没有 main 句：{' '.join(no_main)}——一镜至少一个主句，否则新元素没有挂点（cinematography §4.5）")
        all_main = [sid for sid, _, _ in ranges if per_shot.get(sid.lower(), {}).get("sub", 0) == 0 and per_shot.get(sid.lower(), {}).get("main", 0) > 2]
        if all_main:
            rec("WARN", f"{len(all_main)} 镜整镜都是 main：{' '.join(all_main)}——"
                        f"「一句一个新元素」是堆积型凌乱的制度根源（SKILL 开头），陪衬句标 sub")
    total_sem = sum(sem_count.values()) or 1
    if sem_count.get("论点", 0) / total_sem > 0.5:
        rec("WARN", f"论点 占 {sem_count['论点']}/{total_sem} = {sem_count['论点'] / total_sem:.0%}——"
                    f"论点是兜底档不是垃圾桶（把什么都标成论点，覆盖闸就全部失效了）；数据 / 对比 / 列举 / 引用 / 定义 / 步骤 能落的先落")
    quant_gap = [str(i) for i, x in sorted(by_i.items())
                 if "数据" in (x.get("sem") or []) and "量化" not in (x.get("need") or [])]
    if quant_gap:
        rec("INFO", f"{len(quant_gap)} 句标了「数据」但 need 没写「量化」：i={' '.join(quant_gap[:10])}——"
                    f"需要画面承载数字就补 量化（preflight 才会按 FAIL 级核这一镜有没有承载数字的卡）")
    if exempts:
        rec("INFO", f"按 exempt 放行的词法硬规：{' '.join(exempts[:10])}")
    if not [lv for lv, _ in results if lv in ("FAIL", "WARN")]:
        rec("PASS", f"{len(by_i)} 句语义标注齐全、词表封闭、与 timestamps 一致"
                    + (f"、{len(known)} 镜都有 main 句" if ranges else "（还没有分镜，shot 待 --sync-shots 回填）"))

    if stats:
        print("\n语义分布（句数）：")
        for w, n in sorted(sem_count.items(), key=lambda x: -x[1]):
            print(f"  {w:<6} {n}")
        if ranges:
            print("main/sub 每镜：" + " ".join(f"{sid}:{per_shot.get(sid.lower(), {}).get('main', 0)}/{per_shot.get(sid.lower(), {}).get('sub', 0)}" for sid, _, _ in ranges))

    fails = [m for lv, m in results if lv == "FAIL"]
    warns = [m for lv, m in results if lv == "WARN"]
    print(f"\n== 语义标注 {'FAIL' if fails else 'PASS'} ==  FAIL {len(fails)} · WARN {len(warns)}")
    return 1 if fails else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", default=".")
    ap.add_argument("--timestamps", default="audio/timestamps.json")
    ap.add_argument("--shots", default="remotion/shots.json")
    ap.add_argument("--shotbook", default="SHOTBOOK.md", help="没有 shots.json 时从镜头标题的起止秒取分镜范围")
    ap.add_argument("--semantics", default="semantics.json")
    ap.add_argument("--init", action="store_true", help="生成骨架（已存在则拒写，除非 --force）")
    ap.add_argument("--sync-shots", action="store_true", help="④ 之后回填 shot（只动 shot，不碰标注内容）")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--stats", action="store_true")
    a = ap.parse_args()
    root = os.path.abspath(a.project)
    absp = lambda p: p if os.path.isabs(p) else os.path.join(root, p)  # noqa: E731
    ts_path, sem_path = absp(a.timestamps), absp(a.semantics)
    ranges, src = shot_ranges(absp(a.shots), absp(a.shotbook))
    if not os.path.exists(ts_path):
        print(f"FAIL 找不到 {a.timestamps}（先做 ② 字级时间戳）")
        return 1
    ts = json.load(open(ts_path, encoding="utf-8"))
    if a.sync_shots:
        if not os.path.exists(sem_path):
            print(f"FAIL 找不到 {a.semantics}——先 --init 并标完")
            return 1
        return cmd_sync(sem_path, ranges, src)
    if a.init:
        if os.path.exists(sem_path) and not a.force:
            print(f"FAIL {a.semantics} 已存在——要回填 shot 用 `--sync-shots`（保留标注）；`--init --force` 会覆盖并丢掉已标内容")
            return 1
        return cmd_init(ts, ranges, sem_path, a.timestamps, src)
    if not os.path.exists(sem_path):
        print(f"FAIL 找不到 {a.semantics}——先跑 --init 生成骨架再逐句标（②-1）")
        return 1
    return cmd_check(ts, ranges, src, sem_path, a.stats)


if __name__ == "__main__":
    sys.exit(main())
