#!/usr/bin/env python3
"""卡片索引生成 + 元数据 lint：references/cards/<slug>.md 的 frontmatter 是唯一来源，
本脚本把 108 张卡汇总成 references/cards-index.json，并重写 references/taxonomy.md 里
两段用注释标记围出的索引（输入类型索引 / 语义索引）。手改这两段无效，会被下次生成覆盖。

用法：
  python3 scripts/cards_index.py --check          # 只校验（frontmatter 字段齐、词表封闭、JSON 与 taxonomy 与源一致），CI / 提交前用
  python3 scripts/cards_index.py --write          # 校验 + 写 cards-index.json + 重写 taxonomy 两段索引

frontmatter 新增字段（2026-09-22，全部必填，逗号分隔）：
  输入: 人(必需) | 人(可选) | V | 图 | 截图 | 文 | 界 | 场         这张卡吃什么（tsx 真做得到的；写死 DOM 但意图是吃图的仍写 图，props 行披露）
  语义: 见 VOCAB                                                    这张卡专门为哪几种口播语义而设（别打满）
  素材形态: 竖屏 | 横屏 | 长图 | 多图 | 界面 | 人脸 | 单条视频 | 矢量 | 透明通道   可空（写 无）
  位置: 开场 | 中段 | 收尾 | 任意
  props: 逗号分隔的真实 props，写法 name 或 name(必需|可选|未使用)；无 = 内容全部写死在 CONFIG / JSX，换内容需改源码
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "references" / "cards"
TAX = ROOT / "references" / "taxonomy.md"
OUT = ROOT / "references" / "cards-index.json"

INPUTS = ["人", "V", "图", "截图", "文", "界", "场"]
INPUT_DESC = {
    "人": "口播人物在场（抠像 / 原片）", "V": "B-roll 视频", "图": "图片（照片 / 海报 / 插图）",
    "截图": "网页 / 界面截图（含长图）", "文": "纯文字 / 数据，不吃素材", "界": "界面自演，无外部素材", "场": "作用于前后两个镜头的转场",
}
# 语义词表（封闭）：口播这一句在做什么。SHOTBOOK 的语义标注、匹配脚本、preflight 覆盖闸都用这一份。
VOCAB: list[tuple[str, str]] = [
    ("钩子", "开场抓注意力的问题 / 反差 / 大数字"),
    ("论点", "一个主张或结论句（没有更具体的类型时归它）"),
    ("例证", "用实例 / 证据 / 素材支撑上一句"),
    ("数据", "数字、比例、增长、金额出现"),
    ("对比", "A vs B、前后、优劣并置"),
    ("列举", "并列几项（清单 / 要点 / 盘点），无先后"),
    ("定义", "解释一个术语 / 概念是什么"),
    ("步骤", "有先后顺序的流程 / 做法"),
    ("转折", "但是 / 然而 / 其实——推翻或修正前文"),
    ("设问", "抛出问题不立即回答"),
    ("金句", "可以单独摘出的总结句 / 名言"),
    ("标题", "片名 / 题眼 / 段落大标题（不是章节翻页）"),
    ("引用", "引别人的话或给出处"),
    ("自我介绍", "讲者报自己的名字 / 身份"),
    ("介绍他人", "介绍某个人 / 账号 / 嘉宾"),
    ("号召", "关注 / 点赞 / 订阅 / 去做某事"),
    ("时间地点", "时间戳、地点、事件坐标"),
    ("空间叙事", "在一个连续空间 / 地图 / 长画布里移动讲述"),
    ("机制", "多对一 / 因果 / 流程关系图（讲“怎么运作”）"),
    ("选择", "N 选一、决策、排除"),
    ("过程演示", "界面 / 操作按脚本自演"),
    ("章节", "分章 / 翻页 / 进度"),
    ("转场", "镜头边界处置（作用于前后两镜）"),
    ("强调", "在素材或文字上指哪看哪 / 划重点"),
    ("氛围", "素材当底床不当主体"),
    ("结尾", "收束 / 谢幕 / 落幕"),
]
VOCAB_SET = {w for w, _ in VOCAB}
SHAPES = {"竖屏", "横屏", "长图", "多图", "界面", "人脸", "单条视频", "矢量", "透明通道"}
POSITIONS = {"开场", "中段", "收尾", "任意"}
GRADES = {"低", "中", "高"}
CATEGORIES = {"字幕花字", "强调标注", "数据信息图", "素材呈现", "转场结构", "人物互动", "运镜"}
REQUIRED = ["name", "标题", "一句话", "适用", "时长", "能量", "类别", "输入", "语义", "素材形态", "位置", "props", "优先级", "代码"]

MARK_INPUT = ("<!-- gen:by-input start -->", "<!-- gen:by-input end -->")
MARK_SEM = ("<!-- gen:by-semantic start -->", "<!-- gen:by-semantic end -->")


def split_list(v: str) -> list[str]:
    v = v.strip()
    if not v or v == "无":
        return []
    return [x.strip() for x in re.split(r"[,，]", v) if x.strip()]


def parse_card(md: Path, errors: list[str]) -> dict | None:
    text = md.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        errors.append(f"{md.stem}: frontmatter 不是 --- 包住")
        return None
    fm: dict[str, str] = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            errors.append(f"{md.stem}: frontmatter 行无冒号 → {line[:40]}")
            continue
        k, v = line.split(":", 1)
        fm[k.strip()] = v.strip()
    for k in REQUIRED:
        if k not in fm:
            errors.append(f"{md.stem}: frontmatter 缺「{k}」")
    if fm.get("name") != md.stem:
        errors.append(f"{md.stem}: name 与文件名不一致（{fm.get('name')}）")
    if fm.get("能量") not in GRADES:
        errors.append(f"{md.stem}: 能量「{fm.get('能量')}」不在 低/中/高")
    if fm.get("类别") not in CATEGORIES:
        errors.append(f"{md.stem}: 类别「{fm.get('类别')}」不在七类")
    if fm.get("位置", "任意") not in POSITIONS:
        errors.append(f"{md.stem}: 位置「{fm.get('位置')}」不在 {sorted(POSITIONS)}")
    code = fm.get("代码", "")
    if not code or not (ROOT / code).exists():
        errors.append(f"{md.stem}: 代码路径不存在 → {code}")

    inputs: list[dict] = []
    for x in split_list(fm.get("输入", "")):
        mm = re.fullmatch(r"([^()（）]+)(?:[(（](必需|可选)[)）])?", x)
        if not mm or mm.group(1) not in INPUTS:
            errors.append(f"{md.stem}: 输入「{x}」不在 {INPUTS}（限定词只允许 必需/可选）")
            continue
        inputs.append({"type": mm.group(1), "need": mm.group(2)})
    if not inputs:
        errors.append(f"{md.stem}: 输入为空")
    sem = split_list(fm.get("语义", ""))
    bad = [x for x in sem if x not in VOCAB_SET]
    if bad:
        errors.append(f"{md.stem}: 语义词表外 {bad}")
    if not sem:
        errors.append(f"{md.stem}: 语义为空")
    shapes = split_list(fm.get("素材形态", ""))
    bad = [x for x in shapes if x not in SHAPES]
    if bad:
        errors.append(f"{md.stem}: 素材形态词表外 {bad}")
    props = split_list(fm.get("props", ""))
    for p_ in props:
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*(\((必需|可选|未使用)\))?", p_):
            errors.append(f"{md.stem}: props 写法「{p_}」应为 name 或 name(必需|可选|未使用)")
    return {
        "slug": md.stem, "title": fm.get("标题", ""), "oneliner": fm.get("一句话", ""), "category": fm.get("类别", ""),
        "energy": fm.get("能量", ""), "priority": fm.get("优先级", ""), "code": code,
        "inputs": inputs, "semantics": sem, "material_shape": shapes, "position": fm.get("位置", "任意"),
        "props": props, "hardcoded": all(re.sub(r"[(（].*", "", p).strip() == "hostSrc" for p in props),
    }


def input_key(c: dict) -> str:
    order = {t: i for i, t in enumerate(INPUTS)}
    parts = sorted(c["inputs"], key=lambda x: order[x["type"]])
    return " + ".join(x["type"] + (f"({x['need']})" if x["need"] else "") for x in parts)


def render_input_table(cards: list[dict]) -> str:
    groups: dict[str, list[dict]] = {}
    for c in cards:
        groups.setdefault(input_key(c), []).append(c)
    lines = [
        "| 输入组合 | 卡（◦ = 内容 / 素材写死在源码里，换内容需改 tsx，见各卡复用指引的 props 行） |",
        "|---|---|",
    ]
    def gk(k: str):
        order = {t: i for i, t in enumerate(INPUTS)}
        ts = [re.sub(r"\(.*\)", "", p.strip()) for p in k.split("+")]
        return (len(ts), [order[t] for t in ts])
    for k in sorted(groups, key=gk):
        names = " · ".join(("◦" if c["hardcoded"] else "") + c["slug"] for c in sorted(groups[k], key=lambda c: (c["category"], c["slug"])))
        lines.append(f"| **{k}** | {names} |")
    return "\n".join(lines)


def render_semantic_tables(cards: list[dict]) -> str:
    grade = {"低": 0, "中": 1, "高": 2}
    lines = ["| 语义 | 定义 | 卡（按能量 低→高；◦ = 内容写死需改源码） |", "|---|---|---|"]
    for w, d in VOCAB:
        hits = sorted((c for c in cards if w in c["semantics"]), key=lambda c: (grade.get(c["energy"], 9), c["slug"]))
        names = " · ".join(("◦" if c["hardcoded"] else "") + f"{c['slug']}({c['energy']})" for c in hits) or "（暂无卡）"
        lines.append(f"| **{w}** | {d} | {names} |")
    return "\n".join(lines)


def replace_block(text: str, marks: tuple[str, str], body: str) -> str:
    a, b = marks
    if a not in text or b not in text:
        raise SystemExit(f"taxonomy.md 缺标记 {a} / {b}")
    pre, rest = text.split(a, 1)
    _, post = rest.split(b, 1)
    return f"{pre}{a}\n{body}\n{b}{post}"


def main() -> int:
    write = "--write" in sys.argv
    errors: list[str] = []
    cards = [c for c in (parse_card(p, errors) for p in sorted(CARDS.glob("*.md"))) if c]
    # 卡片一行索引里的能量 与 frontmatter 一致
    tax = TAX.read_text(encoding="utf-8")
    for c in cards:
        m = re.search(rf"^- \*\*{re.escape(c['slug'])}\*\*.*?· P[0-9] · (\S+?) ——", tax, re.M)
        if m and m.group(1) != c["energy"]:
            errors.append(f"{c['slug']}: taxonomy 每卡一行能量「{m.group(1)}」≠ frontmatter「{c['energy']}」")
    if errors:
        print("\n".join(f"FAIL {e}" for e in errors))
        print(f"\nFAIL: {len(errors)} 条")
        return 1

    index = {"generated_by": "scripts/cards_index.py", "vocab": [{"word": w, "def": d} for w, d in VOCAB],
             "inputs": INPUT_DESC, "cards": cards}
    new_json = json.dumps(index, ensure_ascii=False, indent=1) + "\n"
    new_tax = replace_block(tax, MARK_INPUT, render_input_table(cards))
    new_tax = replace_block(new_tax, MARK_SEM, render_semantic_tables(cards))

    stale = []
    if not OUT.exists() or OUT.read_text(encoding="utf-8") != new_json:
        stale.append(str(OUT.relative_to(ROOT)))
    if new_tax != tax:
        stale.append(str(TAX.relative_to(ROOT)))
    if write:
        OUT.write_text(new_json, encoding="utf-8")
        TAX.write_text(new_tax, encoding="utf-8")
        print(f"OK 写入 {len(cards)} 张 → {OUT.relative_to(ROOT)}；taxonomy 两段索引已重写" + (f"（更新了 {', '.join(stale)}）" if stale else "（无变化）"))
        return 0
    if stale:
        print(f"FAIL 与源不一致，需重新生成：{', '.join(stale)}  → python3 scripts/cards_index.py --write")
        return 1
    print(f"OK {len(cards)} 张卡元数据齐全、词表封闭，cards-index.json 与 taxonomy 索引与源一致")
    return 0


if __name__ == "__main__":
    sys.exit(main())
