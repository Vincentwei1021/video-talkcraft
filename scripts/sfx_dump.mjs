#!/usr/bin/env node
/* 把 demos/_lib/sfx-samples.js 内嵌的 base64 采样解码成 mp3 文件，供 Remotion 制作端使用。
   用法：node scripts/sfx_dump.mjs [输出目录]        （默认 remotion/public/sfx）
   命名：普通键 → <name>.mp3；数组键（typekey 双样本）→ <name>-1.mp3、<name>-2.mp3；
        `pk:` 前缀（配音台 picked 采样）→ 冒号换成 "pk-"（文件名里不能有冒号）。
   场景里用 <Audio src={staticFile(`sfx/${name}.mp3`)} .../> 按 SHOTBOOK 抄来的 cue 表摆放；
   riser/ping/lowpad 无采样（demo 侧走 sfx.js 合成），制作端需要时先用 ffmpeg 自行渲一份。 */
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] ?? 'remotion/public/sfx';

const src = readFileSync(join(root, 'demos/_lib/sfx-samples.js'), 'utf8');
const w = {};
new Function('window', src)(w);
const samples = w.SFX_SAMPLES;
if (!samples) {
  console.error('sfx-samples.js 里没有 window.SFX_SAMPLES');
  process.exit(1);
}

mkdirSync(outDir, {recursive: true});
let n = 0;
for (const [key, val] of Object.entries(samples)) {
  const base = key.replace(/^pk:/, 'pk-');
  const list = Array.isArray(val) ? val : [val];
  list.forEach((b64, i) => {
    const name = list.length > 1 ? `${base}-${i + 1}.mp3` : `${base}.mp3`;
    writeFileSync(join(outDir, name), Buffer.from(b64, 'base64'));
    n++;
  });
}
console.log(`已导出 ${n} 个采样 → ${outDir}（来源授权见 demos/_lib/sfx/ATTRIBUTION.md）`);
