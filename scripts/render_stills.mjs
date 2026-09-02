#!/usr/bin/env node
// 批量静帧渲染器：一次 bundle + 一个浏览器，循环渲 N 张 still。
//
// 为什么存在：`npx remotion still` 每次调用都重新打包工程（~12-15s/张，真正渲染只占 1-2s）——
// 43 张抽样 11 分钟，其中 10 分钟在重复打包（2026-09-01 竖屏版实测）。本脚本 43 张 ≈ 1 分钟
// （bundle 命中 webpack 缓存时 3 张实测 6.5s）。静帧便宜了才能抽得密，把版式问题拦在全片渲染之前。
//
// 用法（在工程 remotion/ 目录下执行，模块从工程自己的 node_modules 解析）：
//   node <skill>/scripts/render_stills.mjs --times 2.0,7.2,12.0 [--entry src/entry.ts] \
//        [--comp <id>] [--out ../qa/stills] [--prefix t]
//   --times      逗号分隔的绝对秒；或 @file.txt（每行一个秒数，# 开头行忽略）
//   --comp       省略时取工程第一个 composition
//   --props      合成 inputProps：内联 JSON / @props.json / props.json（工作台 Main 等吃工程 JSON 的合成必须给）
//   --public-dir 覆盖 public/（Remotion 静态服务器拒绝符号链接素材时，先解引用同步到一个真实目录再指过来）
// 输出文件名：<out>/<prefix><秒原文>.png（"2.0" 不归一成 "2"，避免 2 与 2.0 相互覆盖）
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import {loadProjectBundleOptions, projectRenderOptions, parseInputProps} from './remotion_project_config.mjs';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) {
    console.error(`--${name} 缺参数值`);
    process.exit(2);
  }
  return v;
};
const projDir = process.cwd();
const entry = opt('entry', 'src/entry.ts');
const outDir = opt('out', '../qa/stills');
const prefix = opt('prefix', 't');
const timesArg = opt('times', null);
if (!timesArg) {
  console.error('用法：node render_stills.mjs --times 2.0,7.2,... [--entry src/entry.ts] [--comp id] [--out dir]');
  process.exit(2);
}
const raws = (timesArg.startsWith('@')
  ? fs.readFileSync(timesArg.slice(1), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  : timesArg.split(',')
);
const times = raws.map((r) => ({raw: r, sec: Number(r)}));
if (times.some((t) => Number.isNaN(t.sec))) {
  console.error('times 里有非数字项');
  process.exit(2);
}

const require = createRequire(path.join(projDir, 'package.json'));
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill, openBrowser, getCompositions} = require('@remotion/renderer');

const t0 = Date.now();
// 必须带上工程 remotion.config.ts 里的 webpack alias / publicDir 等（bundle() 自己不读配置文件，评审 P1）
const bundleOpts = await loadProjectBundleOptions(require, projDir);
const publicDirFlag = opt('public-dir', null);
if (publicDirFlag) bundleOpts.publicDir = path.resolve(projDir, publicDirFlag);   // 命令行覆盖 remotion.config.ts 的 setPublicDir
const inputProps = parseInputProps(opt('props', null), projDir);
const renderOpts = projectRenderOptions(require);   // browserExecutable / gl / chromeMode（配置文件里设了才有）
const serveUrl = await bundle({entryPoint: path.join(projDir, entry), ...bundleOpts, onProgress: () => {}});
console.log(`bundle 完成 ${(Date.now() - t0) / 1000}s`);

const compId = opt('comp', null);
let composition;
if (compId) {
  composition = await selectComposition({serveUrl, id: compId, inputProps, ...renderOpts});
} else {
  const comps = await getCompositions(serveUrl, {inputProps, ...renderOpts});
  if (comps.length > 1) console.warn(`工程有 ${comps.length} 个 composition（${comps.map((c) => c.id).join(', ')}），默认取第一个——如不对请 --comp 指定`);
  composition = comps[0];
}
console.log(`composition: ${composition.id}  ${composition.width}x${composition.height}@${composition.fps}fps`);

const maxSec = (composition.durationInFrames - 1) / composition.fps;
const bad = times.filter((t) => t.sec < 0 || t.sec > maxSec);
if (bad.length) {
  console.error(`times 越界（片长 ${maxSec.toFixed(2)}s）：${bad.map((t) => t.raw).join(', ')}`);
  process.exit(2);
}

const browser = await openBrowser('chrome', renderOpts);
fs.mkdirSync(outDir, {recursive: true});
try {
  for (const t of times) {
    const frame = Math.round(t.sec * composition.fps);
    const output = path.join(outDir, `${prefix}${t.raw}.png`);
    await renderStill({composition, serveUrl, frame, output, puppeteerInstance: browser, inputProps});
    console.log(`${output}  (frame ${frame})`);
  }
} finally {
  await browser.close({silent: true});
}
console.log(`共 ${times.length} 张，总耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
