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
//        [--audio out/full-mix.wav] [--force-audio]        # 整条音轨（缓存过时长+指纹校验才复用）
//        [--mux out/preview.mp4]                           # assembled + audio → 有声预览
//        [--props '{"k":1}' | --props @props.json]         # 合成 inputProps（工作台 Main 等吃工程 JSON 的合成必须给）
//        [--public-dir .render-public]                     # 覆盖 public/（Remotion 静态服务器拒绝符号链接素材时先解引用同步）
// shots.json = 分镜表导出的 [{"id","start","end"}]（与 shots.ts 同源，beat_lint --shots 同一份）；
//   id 必须唯一且不含路径分隔符——它直接就是段缓存文件名 <seg-dir>/<id>.mp4。
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadProjectBundleOptions, projectRenderOptions, parseInputProps} from './remotion_project_config.mjs';

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
// 镜头 id 直接当段缓存文件名：重复 id 会后段覆盖前段、concat 把同一文件拼两次，总帧数照样相等、
// 全部断言照样通过，最终静默错片（独立评审 P1）；含路径分隔符的 id 则会写到 seg-dir 之外
const ids = shots.map((s) => String(s.id));
const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
if (dupIds.length) {
  console.error(`FAIL: shots.json 镜头 id 重复：${dupIds.join(', ')}——id 是段缓存文件名，必须唯一`);
  process.exit(1);
}
const badIds = ids.filter((id) => /[\/\\]/.test(id) || id === '.' || id === '..');
if (badIds.length) {
  console.error(`FAIL: 镜头 id 含路径分隔符，不能作段文件名：${badIds.join(', ')}`);
  process.exit(1);
}
// 乱序分镜表会静默渲错段（评审 P0-1 实测复现：对调两行后 --only 渲出 3 倍长的段仍打绿勾）
for (let i = 1; i < shots.length; i++) {
  if (!(shots[i].start > shots[i - 1].start)) {
    console.error(`FAIL: shots.json 非时序（${shots[i - 1].id} start=${shots[i - 1].start} → ${shots[i].id} start=${shots[i].start}）——分镜表须按 start 升序`);
    process.exit(1);
  }
}

const t0 = Date.now();
// 必须带上工程 remotion.config.ts 里的 webpack alias / publicDir 等（bundle() 自己不读配置文件，评审 P1）
const bundleOpts = await loadProjectBundleOptions(require, projDir);
const publicDirFlag = opt('public-dir', null);
if (publicDirFlag) bundleOpts.publicDir = path.resolve(projDir, publicDirFlag);   // 命令行覆盖 remotion.config.ts 的 setPublicDir
const inputProps = parseInputProps(opt('props', null), projDir);
const renderOpts = projectRenderOptions(require);   // browserExecutable / gl / chromeMode（配置文件里设了才有）
const serveUrl = await bundle({entryPoint: path.join(projDir, entry), ...bundleOpts, onProgress: () => {}});
const compId = opt('comp', null);
let composition;
if (compId) {
  composition = await selectComposition({serveUrl, id: compId, inputProps, ...renderOpts});
} else {
  const comps = await getCompositions(serveUrl, {inputProps, ...renderOpts});
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
// 音轨用容器时长折成帧数（WAV 无 packet 计数可言）
const probeDurationFrames = (f) =>
  Math.round(Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', f], {encoding: 'utf8'}).replace(/[^0-9.]/g, '')) * fps);

// —— K 段并行，每段 concurrency:1（段内单进程连续渲，防光栅相位抖动）——
const queue = [...todo];
const worker = async () => {
  for (;;) {
    const seg = queue.shift();   // 单线程事件循环里同步执行，无竞态
    if (!seg) return;
    const st = Date.now();
    const tmp = seg.file.replace(/\.mp4$/, '.rendering.mp4');   // 先写临时名：中断的半截文件不许被当缓存
    await renderMedia({
      composition, serveUrl, codec: 'h264', outputLocation: tmp, inputProps, ...renderOpts,
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

// —— 整条音轨（纪律 A）——缓存要过三关才准复用，否则静默错音（独立评审 P1）：
//   1) 时长 == 合成时长（±1 帧）：中断渲染留下的半截 WAV、合成改长后的旧 WAV 都在这里被抓
//   2) 指纹 == 当前音频素材：public/ 下所有音频文件的 路径:大小:mtime 摘要（换了配音/SFX 文件即失效）
//   3) 写临时名 .rendering.wav，断言过了才转正——不存在"看起来有个 wav"就拿去 mux 的路径
// 代码里改了 cue 时序 / 音量这类指纹看不见的改动：--force-audio（比"手动删文件"少一次静默复用的机会）
const AUDIO_EXT = /\.(wav|mp3|m4a|aac|ogg|flac|opus)$/i;
const audioFingerprint = (dir) => {
  const items = [];
  const walk = (d) => {
    let ents;
    try { ents = fs.readdirSync(d, {withFileTypes: true}); } catch { return; }
    for (const ent of ents) {
      const p = path.join(d, ent.name);
      let st;
      try { st = fs.statSync(p); } catch { continue; }   // 断掉的符号链接：跳过（素材多为符号链接，statSync 跟随）
      if (st.isDirectory()) walk(p);
      else if (AUDIO_EXT.test(ent.name)) items.push(`${path.relative(dir, p)}:${st.size}:${Math.round(st.mtimeMs)}`);
    }
  };
  walk(dir);
  return crypto.createHash('sha1').update(items.sort().join('\n')).digest('hex') + ` (${items.length} 个音频文件)`;
};
const audioOut = opt('audio', null);
if (audioOut) {
  const fpFile = `${audioOut}.fp.json`;
  const fp = audioFingerprint(bundleOpts.publicDir ?? path.join(projDir, 'public'));
  let reason = null;
  if (has('force-audio')) reason = '--force-audio';
  else if (!fs.existsSync(audioOut)) reason = '无缓存';
  else {
    const got = probeDurationFrames(audioOut);
    if (!(Math.abs(got - TOTAL) <= 1)) reason = `缓存时长 ${got} 帧 != 合成 ${TOTAL} 帧（半截文件或合成改过长度）`;
    else if (!fs.existsSync(fpFile) || fs.readFileSync(fpFile, 'utf8') !== fp) reason = 'public/ 音频素材指纹变了（换过配音/SFX 文件）';
  }
  if (reason) {
    const st = Date.now();
    console.log(`audio 重渲（${reason}）…`);
    const tmp = audioOut.replace(/(\.[^./\\]+)?$/, '.rendering$1');   // out/full-mix.wav → out/full-mix.rendering.wav
    await renderMedia({composition, serveUrl, codec: 'wav', outputLocation: tmp, inputProps, ...renderOpts});
    const got = probeDurationFrames(tmp);
    if (!(Math.abs(got - TOTAL) <= 1)) {
      console.error(`FAIL: 音轨时长 ${got} 帧 != 合成 ${TOTAL} 帧（临时文件留在 ${tmp}）`);
      process.exit(1);
    }
    fs.renameSync(tmp, audioOut);
    fs.writeFileSync(fpFile, fp);
    console.log(`audio → ${audioOut}  ${got} 帧  ${((Date.now() - st) / 1000).toFixed(0)}s ✓`);
  } else {
    console.log(`audio 复用缓存 ${audioOut}（时长/素材指纹校验通过；代码里改了 cue/SFX 时序请 --force-audio）`);
  }
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
