#!/usr/bin/env node
// 分镜分段渲染母版制：按镜头切段渲染 → 段文件缓存 → concat 拼装 → 整条音轨混入。
//
// 解决两件事（2026-09-02 定版，数字为 201s 竖屏片实测）：
//   1) 全片首渲提速：K 段并行、每段内部单进程连续渲——段内光栅自洽（防多 tab 相位抖动病），
//      段边界都是切镜点。整渲 13min → 9min（含整条音轨首渲 ~3min，音轨缓存后纯视频 ~6min）。
//   2) 单镜头迭代：改一个镜头只重渲该段 ±邻段（镜头衔接有 lead/tail 交叠 8–16 帧，波及邻镜边缘；
//      邻镜比交叠还短的极端情形需手动 --only 多扩一段），再拼装，53s 出有声新片，不必整渲。
//
// 音画对齐三条硬纪律（缺一必错位）：
//   A. 音轨整条不分段——视频段一律 muted 渲染，音轨单独渲一次整条（--audio），交付时一次性混入。
//      每段各带音频再拼 = 每个 AAC 段头 ~2112 采样编码器前导延迟，拼 29 次错 29 次。
//   B. 段边界取整用 Math.round(start*fps)，与合成内 Sequence 同规则——差 1 帧就是画面节拍整体偏 33ms。
//   C. 帧数断言——每段 ffprobe 实数帧 == 期望帧数，拼装后总帧数 == composition.durationInFrames，
//      不相等直接 FAIL 退出，禁止"看起来对了"。
//
// 用法（在工程 remotion/ 目录下执行）：
//   node <skill>/scripts/render_shots.mjs --shots shots.json [--entry src/entry.ts] [--comp id]
//        [--seg-dir out/segments] [--parallel 4]
//        [--all | --changed s14 | --only s13,s14,s15]     # 缺省 = 只渲 seg-dir 里缺失的段
//        [--concat out/assembled.mp4]                      # 拼装（video-only）
//        [--audio out/full-mix.wav]                        # 整条音轨（不存在才渲）
//        [--mux out/preview.mp4]                           # assembled + audio → 有声预览
// shots.json = 分镜表导出的 [{"id","start","end"}]（与 shots.ts 同源，beat_lint --shots 同一份）。
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) {   // 缺值静默回落会无声降级成"渲缺失段"模式（评审 P2）
    console.error(`--${name} 缺参数值`);
    process.exit(2);
  }
  return v;
};
const has = (name) => args.includes(`--${name}`);
const projDir = process.cwd();
const entry = opt('entry', 'src/entry.ts');
const shotsPath = opt('shots', 'shots.json');
const segDir = opt('seg-dir', 'out/segments');
const parallel = Number(opt('parallel', '4'));
if (!Number.isInteger(parallel) || parallel < 1) {   // NaN→0 个 worker 会一段不渲直接进拼装（评审 P1-3）
  console.error(`--parallel 需为 ≥1 的整数，得到：${opt('parallel', '4')}`);
  process.exit(2);
}

const require = createRequire(path.join(projDir, 'package.json'));
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderMedia, getCompositions} = require('@remotion/renderer');

const shots = JSON.parse(fs.readFileSync(shotsPath, 'utf8'));
if (!Array.isArray(shots) || !shots.length ||
    shots.some((s) => !s.id || typeof s.start !== 'number' || typeof s.end !== 'number')) {
  console.error('shots.json 需为 [{"id","start","end"}] 数组（start/end 必须是数字）');
  process.exit(2);
}
// 乱序分镜表会静默渲错段（评审 P0-1 实测复现：对调两行后 --only 渲出 3 倍长的段仍打绿勾）
for (let i = 1; i < shots.length; i++) {
  if (!(shots[i].start > shots[i - 1].start)) {
    console.error(`FAIL: shots.json 非时序（${shots[i - 1].id} start=${shots[i - 1].start} → ${shots[i].id} start=${shots[i].start}）——分镜表须按 start 升序`);
    process.exit(1);
  }
}

const t0 = Date.now();
const serveUrl = await bundle({entryPoint: path.join(projDir, entry), onProgress: () => {}});
const compId = opt('comp', null);
let composition;
if (compId) {
  composition = await selectComposition({serveUrl, id: compId, inputProps: {}});
} else {
  const comps = await getCompositions(serveUrl, {inputProps: {}});
  if (comps.length > 1) console.warn(`工程有 ${comps.length} 个 composition（${comps.map((c) => c.id).join(', ')}），默认取第一个——如不对请 --comp 指定`);
  composition = comps[0];
}
const fps = composition.fps;
const TOTAL = composition.durationInFrames;
console.log(`bundle ${((Date.now() - t0) / 1000).toFixed(1)}s · ${composition.id} ${composition.width}x${composition.height}@${fps} · ${TOTAL} 帧`);

// —— 段表：边界取整与 Sequence 同规则（纪律 B）——
// NaN-safe 写法：Math.abs(NaN-x)>1 恒 false 会静默旁路断言（评审 P1-2 实测复现）
const lastEndFrame = Math.round(shots[shots.length - 1].end * fps);
if (!(Math.abs(lastEndFrame - TOTAL) <= 1)) {
  console.error(`FAIL: shots.json 末镜 end(${lastEndFrame}帧) 与 composition 时长(${TOTAL}帧) 差 >1 帧——分镜表与合成不同源`);
  process.exit(1);
}
const segs = shots.map((s, i) => {
  const from = Math.round(s.start * fps);
  const to = (i + 1 < shots.length ? Math.round(shots[i + 1].start * fps) : TOTAL) - 1;
  return {id: s.id, from, to, frames: to - from + 1, file: path.join(segDir, `${s.id}.mp4`)};
});
for (let i = 0; i < segs.length; i++) {
  if (!(segs[i].frames > 0)) {
    console.error(`FAIL: 段 ${segs[i].id} 帧数 ${segs[i].frames} ≤ 0`);
    process.exit(1);
  }
  // 真实的连续性检查：镜头自己的 end 必须落在下一镜 start 上（from/to 同源派生的比对是恒真死代码，评审 P0-1）
  if (i + 1 < shots.length && Math.round(shots[i].end * fps) !== Math.round(shots[i + 1].start * fps)) {
    console.error(`FAIL: ${shots[i].id} end(${shots[i].end}) 与 ${shots[i + 1].id} start(${shots[i + 1].start}) 不衔接——分镜表有缝或重叠`);
    process.exit(1);
  }
}

// —— 选段 ——
let todo;
if (has('all')) todo = segs;
else if (opt('changed', null)) {
  const id = opt('changed');
  const k = segs.findIndex((s) => s.id === id);
  if (k < 0) { console.error(`未找到镜头 ${id}`); process.exit(2); }
  // 镜头衔接的 lead/tail 交叠会波及邻镜边缘几帧 → 邻段一并重渲
  todo = segs.slice(Math.max(0, k - 1), Math.min(segs.length, k + 2));
} else if (opt('only', null)) {
  const ids = opt('only').split(',');
  todo = segs.filter((s) => ids.includes(s.id));
  if (todo.length !== ids.length) { console.error('--only 里有未知镜头 id'); process.exit(2); }
} else {
  todo = segs.filter((s) => !fs.existsSync(s.file));
}
fs.mkdirSync(segDir, {recursive: true});
console.log(`待渲 ${todo.length}/${segs.length} 段（并行 ${parallel}）：${todo.map((s) => s.id).join(' ') || '（无）'}`);

const probeFrames = (f) =>
  // csv=p=0 的输出带尾逗号（"129,"），Number() 会 NaN——只留数字位
  Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f], {encoding: 'utf8'}).replace(/[^0-9]/g, ''));

// —— K 段并行，每段 concurrency:1（段内单进程连续渲，防光栅相位抖动）——
const queue = [...todo];
const worker = async () => {
  for (;;) {
    const seg = queue.shift();   // 单线程事件循环里同步执行，无竞态
    if (!seg) return;
    const st = Date.now();
    const tmp = seg.file.replace(/\.mp4$/, '.rendering.mp4');   // 先写临时名：中断的半截文件不许被当缓存
    await renderMedia({
      composition, serveUrl, codec: 'h264', outputLocation: tmp,
      frameRange: [seg.from, seg.to], muted: true, concurrency: 1,   // 纪律 A：视频段一律无声
    });
    const got = probeFrames(tmp);
    if (got !== seg.frames) {                                        // 纪律 C：帧数断言
      console.error(`FAIL: ${seg.id} 帧数 ${got} != 期望 ${seg.frames}`);
      process.exit(1);
    }
    fs.renameSync(tmp, seg.file);   // 断言过了才转正
    console.log(`${seg.id}  帧 ${seg.from}-${seg.to} (${seg.frames})  ${((Date.now() - st) / 1000).toFixed(0)}s ✓`);
  }
};
await Promise.all(Array.from({length: Math.min(parallel, todo.length || 1)}, worker));

// —— 拼装 ——
const concatOut = opt('concat', null);
if (concatOut) {
  const missing = segs.filter((s) => !fs.existsSync(s.file));
  if (missing.length) { console.error(`FAIL: 缺段无法拼装：${missing.map((s) => s.id).join(',')}`); process.exit(1); }
  // 缓存段逐一复验（评审 P1-1）：shots.json 边界改动后旧缓存段帧数会与新段表不符——
  // 只靠拼装总帧断言兜不住"边界互相挪移、总长不变"的错位
  for (const s of segs) {
    const got = probeFrames(s.file);
    if (got !== s.frames) {
      console.error(`FAIL: 缓存段 ${s.id} 帧数 ${got} != 段表期望 ${s.frames}——分镜边界改过？用 --only ${s.id} 重渲该段`);
      process.exit(1);
    }
  }
  const listFile = path.join(segDir, 'concat.txt');
  // concat 列表的 file '...' 语法：路径内单引号需转义
  fs.writeFileSync(listFile, segs.map((s) => `file '${path.resolve(s.file).replace(/'/g, "'\\''")}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatOut]);
  const got = probeFrames(concatOut);
  if (got !== TOTAL) { console.error(`FAIL: 拼装总帧数 ${got} != ${TOTAL}`); process.exit(1); }
  console.log(`concat → ${concatOut}  ${got} 帧 ✓`);
}

// —— 整条音轨（只在不存在时渲；改了 SFX/cue 后手动删掉让它重渲）——
const audioOut = opt('audio', null);
if (audioOut && !fs.existsSync(audioOut)) {
  const st = Date.now();
  await renderMedia({composition, serveUrl, codec: 'wav', outputLocation: audioOut});
  console.log(`audio → ${audioOut}  ${((Date.now() - st) / 1000).toFixed(0)}s ✓`);
}

// —— 混入音轨（预览口径；交付仍走 SKILL.md ⑧ 的 loudnorm）——
const muxOut = opt('mux', null);
if (muxOut) {
  if (!concatOut || !audioOut) { console.error('--mux 需要同时给 --concat 与 --audio'); process.exit(2); }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', concatOut, '-i', audioOut,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', muxOut]);
  console.log(`mux → ${muxOut} ✓`);
}
console.log(`总耗时 ${((Date.now() - t0) / 1000).toFixed(0)}s`);
