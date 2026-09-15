#!/usr/bin/env bash
# 统一依赖体检（每支新片开工先跑；SKILL.md ⓪）：
#   bash runtime/check-runtime.sh            # 装好 runtime/node_modules（缺 / 锁变了才装）、下好共享浏览器、链好 workbench、报告 Remotion 有没有新版
#   bash runtime/check-runtime.sh --upgrade  # 有新版就把 @remotion/* 全家 + remotion 升到 npm 最新，冒烟渲 1 帧；不过 → 回滚 package.json / lock 并 exit 1
# 制作中途不要 --upgrade（母版段缓存按依赖指纹失效不了，混版本渲出来的段不一致）。
set -euo pipefail
RT="$(cd "$(dirname "$0")" && pwd)"
WB="$RT/../workbench"
cd "$RT"

log() { printf '[runtime] %s\n' "$*"; }

# ① node_modules：没有、或 lock 比上次安装新 → npm ci（有 lock）/ npm install（首次）
if [ ! -d node_modules ] || [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  if [ -f package-lock.json ]; then log "安装依赖（npm ci）…"; npm ci --no-audit --no-fund --loglevel=error; else log "首次安装（npm install，生成 lock）…"; npm install --no-audit --no-fund --loglevel=error; fi
else
  log "依赖已就位（runtime/node_modules 与 lock 一致）"
fi

# ② 共享无头浏览器（Remotion 默认下到 node_modules/.remotion，所有工程共用这一份）
if [ ! -d node_modules/.remotion/chrome-headless-shell ]; then log "下载无头浏览器（一次，所有工程共用）…"; npx remotion browser ensure >/dev/null; fi

# ③ workbench 软链（它的 package.json 只是清单，依赖由这里提供）
if [ -d "$WB" ]; then
  if [ -L "$WB/node_modules" ] && [ "$(readlink "$WB/node_modules")" = "$RT/node_modules" ]; then :;
  else
    [ -e "$WB/node_modules" ] && { log "workbench/node_modules 是独立安装，移除后改软链"; rm -rf "$WB/node_modules"; }
    ln -s "$RT/node_modules" "$WB/node_modules"; log "workbench/node_modules → runtime/node_modules"
  fi
fi

# ④ 版本体检
PINNED="$(node -p "require('./package.json').dependencies.remotion")"
LATEST="$(npm view remotion version 2>/dev/null || echo "?")"
INSTALLED="$(node -p "require('./node_modules/remotion/package.json').version" 2>/dev/null || echo "?")"
log "Remotion 钉 $PINNED · 已装 $INSTALLED · npm 最新 $LATEST"
if [ "$INSTALLED" != "$PINNED" ]; then log "FAIL: 已装版本与 package.json 不一致，重跑 npm ci"; exit 1; fi

if [ "${1:-}" = "--upgrade" ] && [ "$LATEST" != "?" ] && [ "$LATEST" != "$PINNED" ]; then
  log "升级 @remotion/* 全家 → $LATEST（冒烟不过自动回滚）"
  cp package.json /tmp/talkcraft-runtime-package.json.bak
  [ -f package-lock.json ] && cp package-lock.json /tmp/talkcraft-runtime-lock.bak
  PKGS="$(node -p "Object.keys(require('./package.json').dependencies).filter(k => k === 'remotion' || k.startsWith('@remotion/')).map(k => k + '@$LATEST').join(' ')")"
  # shellcheck disable=SC2086
  if npm install --save-exact --no-audit --no-fund --loglevel=error $PKGS && npx remotion browser ensure >/dev/null && bash "$RT/check-runtime.sh" --smoke-only; then
    log "升级完成：$PINNED → $LATEST（package.json / lock 已更新，记得提交）"
  else
    log "冒烟 FAIL，回滚到 $PINNED"
    cp /tmp/talkcraft-runtime-package.json.bak package.json
    [ -f /tmp/talkcraft-runtime-lock.bak ] && cp /tmp/talkcraft-runtime-lock.bak package-lock.json
    npm ci --no-audit --no-fund --loglevel=error
    exit 1
  fi
elif [ "${1:-}" = "--upgrade" ]; then
  log "已是最新，无需升级"
fi

# ⑤ 冒烟（--smoke-only 供升级流程内部调用；正常 check 也跑一次，几秒钟）
if [ "${1:-}" = "--smoke-only" ] || [ "${TALKCRAFT_SMOKE:-1}" = "1" ]; then
  rm -f /tmp/talkcraft-smoke.png
  if npx remotion still smoke/index.ts Smoke /tmp/talkcraft-smoke.png --frame=5 >/tmp/talkcraft-smoke.log 2>&1 && [ -s /tmp/talkcraft-smoke.png ]; then
    log "冒烟 PASS（/tmp/talkcraft-smoke.png）"
  else
    log "冒烟 FAIL，见 /tmp/talkcraft-smoke.log"; tail -5 /tmp/talkcraft-smoke.log; exit 1
  fi
fi
log "OK"
