#!/usr/bin/env node
// 批量静帧渲染器：一次 bundle + 一个浏览器，循环渲 N 张 still。
//
// 为什么存在：`npx remotion still` 每次调用都重新打包工程（~12-15s/张，真正渲染只占 1-2s）——
// 43 张抽样 11 分钟，其中 10 分钟在重复打包（2026-09-01 竖屏版实测）。本脚本 43 张 ≈ 1.5 分钟。
// 静帧便宜了才能抽得密，把版式问题拦在全片渲染之前（一轮全渲 13 分钟起）。
//
// 用法（在工程 remotion/ 目录下执行，模块从工程自己的 node_modules 解析）：
//   node <skill>/scripts/render_stills.mjs --times 2.0,7.2,12.0 [--entry src/entry.ts] \
//        [--comp <id>] [--out ../qa/stills] [--prefix t]
//   --times      逗号分隔的绝对秒；或 @file.txt（每行一个秒数，# 开头行忽略）
//   --comp       省略时取工程第一个 composition
// 输出文件名：<out>/<prefix><秒>.png
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
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
const times = (timesArg.startsWith('@')
  ? fs.readFileSync(timesArg.slice(1), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  : timesArg.split(',')
).map(Number);
if (times.some(Number.isNaN)) {
  console.error('times 里有非数字项');
  process.exit(2);
}

const require = createRequire(path.join(projDir, 'package.json'));
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill, openBrowser} = require('@remotion/renderer');

const t0 = Date.now();
const serveUrl = await bundle({entryPoint: path.join(projDir, entry), onProgress: () => {}});
console.log(`bundle 完成 ${(Date.now() - t0) / 1000}s`);

const compId = opt('comp', null);
const inputProps = {};
const composition = compId
  ? await selectComposition({serveUrl, id: compId, inputProps})
  : (await require('@remotion/renderer').getCompositions(serveUrl, {inputProps}))[0];
console.log(`composition: ${composition.id}  ${composition.width}x${composition.height}@${composition.fps}fps`);

const browser = await openBrowser('chrome');
fs.mkdirSync(outDir, {recursive: true});
for (const t of times) {
  const frame = Math.round(t * composition.fps);
  const output = path.join(outDir, `${prefix}${t}.png`);
  await renderStill({composition, serveUrl, frame, output, puppeteerInstance: browser, inputProps});
  console.log(`${output}  (frame ${frame})`);
}
await browser.close({silent: true});
console.log(`共 ${times.length} 张，总耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
