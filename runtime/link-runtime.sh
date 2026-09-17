#!/usr/bin/env bash
# 把一个口播工程接到统一依赖：<工程>/remotion/node_modules → runtime/node_modules（软链），package.json 的依赖版本抄 runtime。
#   bash runtime/link-runtime.sh <工程根 或 remotion 目录>
# 之后工程里不再 npm install（会写进共享目录）；要加包 → 在 runtime 中 npm install --save-exact <包>，提交清单与 lock。
set -euo pipefail
RT="$(cd "$(dirname "$0")" && pwd)"
PROJ="${1:?用法: link-runtime.sh <工程根>}"
[ -d "$PROJ/remotion" ] && REM="$PROJ/remotion" || REM="$PROJ"
REM="$(cd "$REM" && pwd)"
[ -d "$RT/node_modules" ] || { echo "[runtime] runtime/node_modules 还没装，先跑 bash $RT/check-runtime.sh"; exit 1; }

# 先验证完整依赖、准备新清单；旧目录保留到软链与清单均替换成功。
node - "$REM" "$RT" <<'JS'
const fs = require("fs"), path = require("path");
const {randomUUID} = require("crypto");
const [rem, rt] = process.argv.slice(2);
if (fs.realpathSync(rem) === fs.realpathSync(rt)) throw new Error("不能把 runtime 本身接到自己的依赖目录");
const runtime = JSON.parse(fs.readFileSync(path.join(rt, "package.json"), "utf8"));
const all = { ...runtime.dependencies, ...runtime.devDependencies };
const file = path.join(rem, "package.json");
let pkg = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { name: path.basename(path.dirname(rem)) + "-remotion", private: true, scripts: { typecheck: "tsc --noEmit" } };
const wasEmpty = !pkg.dependencies;
pkg.dependencies = pkg.dependencies ?? {};
pkg.devDependencies = pkg.devDependencies ?? {};
// 工程所需的每个包都必须已在 runtime 声明并安装；缺包时原工程保持可运行。
const missing = [];
for (const sec of ["dependencies", "devDependencies"]) for (const k of Object.keys(pkg[sec])) { if (all[k]) pkg[sec][k] = all[k]; else missing.push(k); }
if (wasEmpty) {
  for (const k of ["remotion", "@remotion/cli", "@remotion/media", "@remotion/media-utils", "@remotion/paths", "@remotion/shapes", "@remotion/noise", "@remotion/lottie", "@remotion/layout-utils", "@remotion/transitions", "react", "react-dom", "gsap", "lottie-web", "animejs"]) pkg.dependencies[k] = all[k];
  for (const k of ["@types/react", "@types/react-dom", "typescript"]) pkg.devDependencies[k] = all[k];
}
for (const sec of ["dependencies", "devDependencies"]) for (const k of Object.keys(pkg[sec])) {
  if (!all[k]) continue;
  try {
    const installed = JSON.parse(fs.readFileSync(path.join(rt, "node_modules", k, "package.json"), "utf8"));
    if (installed.version !== all[k]) missing.push(`${k}（已安装版本与 runtime 清单不符）`);
  } catch { missing.push(`${k}（runtime 尚未安装）`); }
}
if (missing.length) {
  console.error(`[runtime] 接入失败，原依赖与 package.json 未改动。先在 runtime 安装这些包并更新 lock：${missing.join(", ")}`);
  process.exit(1);
}
pkg.talkcraftRuntime = rt;
const modules = path.join(rem, "node_modules");
const suffix = randomUUID();
const stagedLink = path.join(rem, `.talkcraft-link-${suffix}`);
const stagedPkg = path.join(rem, `.talkcraft-package-${suffix}`);
const backup = path.join(rem, `.talkcraft-deps-${suffix}`);
let moved = false, linked = false;
try {
  fs.writeFileSync(stagedPkg, JSON.stringify(pkg, null, 2) + "\n");
  fs.symlinkSync(path.join(rt, "node_modules"), stagedLink, "dir");
  try {
    fs.lstatSync(modules); // 包括失效软链
    fs.renameSync(modules, backup);
    moved = true;
  } catch (e) { if (e.code !== "ENOENT") throw e; }
  fs.renameSync(stagedLink, modules);
  linked = true;
  fs.renameSync(stagedPkg, file);
} catch (e) {
  if (linked) fs.unlinkSync(modules);
  if (moved) fs.renameSync(backup, modules);
  throw e;
} finally {
  fs.rmSync(stagedLink, {force: true});
  fs.rmSync(stagedPkg, {force: true});
}
if (moved) fs.rmSync(backup, {recursive: true, force: true});
console.log(`[runtime] package.json 依赖已对齐 runtime（remotion ${all.remotion}）`);
JS
echo "[runtime] $REM/node_modules → $RT/node_modules"
