#!/usr/bin/env bash
# 把一个口播工程接到统一依赖：<工程>/remotion/node_modules → runtime/node_modules（软链），package.json 的依赖版本抄 runtime。
#   bash runtime/link-runtime.sh <工程根 或 remotion 目录>
# 之后工程里不再 npm install（会写进共享目录）；要加包 → 加到 runtime/package.json 再 npm ci。
set -euo pipefail
RT="$(cd "$(dirname "$0")" && pwd)"
PROJ="${1:?用法: link-runtime.sh <工程根>}"
[ -d "$PROJ/remotion" ] && REM="$PROJ/remotion" || REM="$PROJ"
REM="$(cd "$REM" && pwd)"
[ -d "$RT/node_modules" ] || { echo "[runtime] runtime/node_modules 还没装，先跑 bash $RT/check-runtime.sh"; exit 1; }

if [ -L "$REM/node_modules" ]; then
  rm "$REM/node_modules"
elif [ -d "$REM/node_modules" ]; then
  echo "[runtime] 移除工程自带的 node_modules（$(du -sh "$REM/node_modules" | cut -f1)），改用共享依赖"
  rm -rf "$REM/node_modules"
fi
ln -s "$RT/node_modules" "$REM/node_modules"

# package.json：有则只改依赖版本（保留 name / scripts 等），没有则从 runtime 生成；标 talkcraftRuntime 指回来
node - "$REM" "$RT" <<'JS'
const fs = require("fs"), path = require("path");
const [rem, rt] = process.argv.slice(2);
const runtime = JSON.parse(fs.readFileSync(path.join(rt, "package.json"), "utf8"));
const all = { ...runtime.dependencies, ...runtime.devDependencies };
const file = path.join(rem, "package.json");
let pkg = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { name: path.basename(path.dirname(rem)) + "-remotion", private: true, scripts: { typecheck: "tsc --noEmit" } };
const wasEmpty = !pkg.dependencies;
pkg.dependencies = pkg.dependencies ?? {};
pkg.devDependencies = pkg.devDependencies ?? {};
// 工程里已声明的依赖：版本对齐 runtime（runtime 没有的原样保留并告警）；没声明依赖的新工程：给一套口播工程常用集
const missing = [];
for (const sec of ["dependencies", "devDependencies"]) for (const k of Object.keys(pkg[sec])) { if (all[k]) pkg[sec][k] = all[k]; else missing.push(k); }
if (wasEmpty) {
  for (const k of ["remotion", "@remotion/cli", "@remotion/media", "@remotion/media-utils", "@remotion/paths", "@remotion/shapes", "@remotion/noise", "@remotion/lottie", "@remotion/layout-utils", "@remotion/transitions", "react", "react-dom", "gsap", "lottie-web", "animejs"]) pkg.dependencies[k] = all[k];
  for (const k of ["@types/react", "@types/react-dom", "typescript"]) pkg.devDependencies[k] = all[k];
}
pkg.talkcraftRuntime = rt;
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
console.log(`[runtime] package.json 依赖已对齐 runtime（remotion ${all.remotion}）` + (missing.length ? `；runtime 里没有这些包，工程里仍声明但解析不到：${missing.join(", ")}——要用就加进 runtime/package.json` : ""));
JS
echo "[runtime] $REM/node_modules → $RT/node_modules"
