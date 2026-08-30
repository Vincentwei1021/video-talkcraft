"""关卡 1.75：卡片保真 lint——动效实现必须复制自 template/cards/<slug>.tsx。

用法：
  python3 scripts/card_lint.py <工程src目录> [slug,slug,...]
  slug 列表给出时逐一要求存在（从 SHOTBOOK 用到的卡列出）；省略时只查
  <工程src>/cards/ 里已有的文件（此时"漏复制整张卡"查不出来，尽量传全量清单）。

判定：
  1) <工程src>/cards/<slug>.tsx 必须存在——SKILL.md ④ 的实现方式就是
     "复制 tsx 进工程改 CONFIG"，工程里没有这份文件 = 凭卡名手写了简化版
     （回弹/拍击/密度全丢、取景框括号方向画反，2026-08-30 翻车实录）→ FAIL（P1 级）。
  2) 与 skill 的 template/cards/<slug>.tsx 归一化文本相似度 ≥ 0.55
     （difflib；改 CONFIG/theme/文案在容忍内，从零重写过不了）。

template 目录按脚本自身位置解析（scripts/ 的上一级 / template/cards）。
"""
import difflib
import re
import sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "template" / "cards"
THRESHOLD = 0.55


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def main() -> int:
    src = Path(sys.argv[1])
    cards_dir = src / "cards"
    if len(sys.argv) > 2:
        slugs = [s.strip() for s in sys.argv[2].split(",") if s.strip()]
    else:
        slugs = sorted(p.stem for p in cards_dir.glob("*.tsx")) if cards_dir.is_dir() else []
        print(f"（未传 slug 清单，只校验 {cards_dir} 里已有的 {len(slugs)} 份——漏复制的卡查不出来）")
    if not slugs:
        print("FAIL: 工程里没有 src/cards/*.tsx——所有动效都不是从卡片源码复制的")
        return 1

    bad = 0
    for slug in slugs:
        tpl = TEMPLATE / f"{slug}.tsx"
        got = cards_dir / f"{slug}.tsx"
        if not tpl.exists():
            print(f"SKIP {slug}: template 里没有这张卡（slug 拼错？）")
            bad += 1
            continue
        if not got.exists():
            print(f"MISS {slug}: 工程缺 src/cards/{slug}.tsx（没有复制卡源码 = 手写简化版）")
            bad += 1
            continue
        ratio = difflib.SequenceMatcher(
            None, norm(tpl.read_text()), norm(got.read_text())
        ).ratio()
        ok = ratio >= THRESHOLD
        bad += 0 if ok else 1
        print(f"{'OK  ' if ok else 'FAIL'} {slug}: 相似度 {ratio:.2f}"
              + ("" if ok else f" < {THRESHOLD}（改动大到不像同一张卡）"))
    print(f"\n{'PASS' if bad == 0 else 'FAIL'}: {len(slugs) - bad}/{len(slugs)} 张卡保真")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
