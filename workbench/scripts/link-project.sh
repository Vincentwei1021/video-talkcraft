#!/usr/bin/env bash
# 把一个口播成片工程接进工作台（SKILL.md ⑤-2 / ⑧）：kbsrc → 工程 remotion/src；public/ 下逐项软链工程 public/ 的条目。
# 为什么单独成脚本：手写 `ln -sfn` 循环在 public/<name> 已是"指向别的工程目录"的符号链接时不会替换（macOS 实测 2026-09-15：
# logos 仍指向上一支片，导出 404、名牌 logo 空），上一支片留下的其它条目也会混进素材库。这里先清掉指向工程之外的旧链接再链。
#   用法：bash scripts/link-project.sh /path/to/<口播工程>      （工程根 = 含 remotion/ 的目录；也接受直接给 remotion/ 目录）
set -euo pipefail
WB="$(cd "$(dirname "$0")/.." && pwd)"
PROJ="${1:?用法: link-project.sh <口播工程根>}"
[ -d "$PROJ/remotion/src" ] && REM="$PROJ/remotion" || REM="$PROJ"
[ -d "$REM/src" ] || { echo "FAIL: $PROJ 下没有 remotion/src（或 src/）"; exit 1; }
REM="$(cd "$REM" && pwd)"

ln -sfn "$REM/src" "$WB/kbsrc"
mkdir -p "$WB/public"
# 清掉 public/ 里指向本工程之外的旧链接（画廊资产 cardpreviews / cardthumbs 除外）
for d in "$WB"/public/*; do
  [ -L "$d" ] || continue
  case "$(basename "$d")" in cardpreviews|cardthumbs) continue;; esac
  tgt="$(readlink "$d")"
  case "$tgt" in "$REM"/*) ;; *) rm "$d"; echo "  - 移除旧链接 $(basename "$d") → $tgt";; esac
done
# 逐项链本工程 public/（已是符号链接的先删再建：ln -sfn 对"指向目录的链接"不替换）
if [ -d "$REM/public" ]; then
  for f in "$REM"/public/*; do
    [ -e "$f" ] || continue
    d="$WB/public/$(basename "$f")"
    [ -L "$d" ] && rm "$d"
    ln -s "$f" "$d"
  done
fi
cd "$WB" && node scripts/gen-index.mjs
echo "接入完成：kbsrc → $REM/src；public/ 条目：$(ls "$WB/public" | tr '\n' ' ')"
