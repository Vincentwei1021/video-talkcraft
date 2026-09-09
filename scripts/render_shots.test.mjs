import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('./render_shots.mjs', import.meta.url));
const shotIds = ['s01', 's02', 's03', 's04', 's05'];

// Exercise the real CLI. Invalid input needs no Remotion installation; valid
// selection uses lightweight renderer/ffprobe doubles, not a browser or video.
function project(t, {renderer = false, cached = []} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'talkcraft-selection-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, text) => {
    const dest = path.join(root, file);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    fs.writeFileSync(dest, text);
  };
  write('package.json', '{}');
  write('shots.json', JSON.stringify(shotIds.map((id, i) => ({id, start: i, end: i + 1}))));
  for (const id of cached) write(`out/segments/${id}.mp4`, JSON.stringify({frames: 30}));

  const traceFile = path.join(root, 'trace.jsonl');
  if (renderer) {
    const trace = `const fs = require('node:fs');
      const trace = (event) => fs.appendFileSync(process.env.TALKCRAFT_TEST_TRACE, JSON.stringify(event) + '\\n');`;
    write('node_modules/@remotion/bundler/index.js', `${trace}
      trace({event: 'load-bundler'});
      exports.bundle = async () => {trace({event: 'bundle'}); return 'test-bundle';};`);
    write('node_modules/@remotion/renderer/index.js', `${trace}
      const path = require('node:path');
      trace({event: 'load-renderer'});
      const composition = {id: 'Test', fps: 30, durationInFrames: 150, width: 1080, height: 1920};
      exports.getCompositions = async () => [composition];
      exports.selectComposition = async () => composition;
      exports.renderMedia = async (options) => {
        trace({event: 'render', id: path.basename(options.outputLocation).replace('.rendering.mp4', ''),
          frameRange: options.frameRange, codec: options.codec, muted: options.muted, concurrency: options.concurrency});
        fs.writeFileSync(options.outputLocation, JSON.stringify({frames: options.frameRange[1] - options.frameRange[0] + 1}));
      };`);
    write('bin/ffprobe', `#!/usr/bin/env node
      const fs = require('node:fs');
      console.log(JSON.parse(fs.readFileSync(process.argv.at(-1), 'utf8')).frames);`);
    fs.chmodSync(path.join(root, 'bin/ffprobe'), 0o755);
  }

  return {
    root,
    run(args) {
      return spawnSync(process.execPath, [script, ...args], {
        cwd: root,
        encoding: 'utf8',
        timeout: 10000,
        env: {...process.env, TALKCRAFT_TEST_TRACE: traceFile,
          PATH: [path.join(root, 'bin'), path.dirname(process.execPath), process.env.PATH].join(path.delimiter)},
      });
    },
    trace() {
      return fs.existsSync(traceFile)
        ? fs.readFileSync(traceFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
        : [];
    },
  };
}

const invalid = [
  ['all and only', ['--all', '--only', 's02'], /互斥/],
  ['only and all', ['--only', 's02', '--all'], /互斥/],
  ['all and changed', ['--all', '--changed', 's02'], /互斥/],
  ['only and changed', ['--only', 's01', '--changed', 's02'], /互斥/],
  ['all three modes', ['--all', '--only', 's01', '--changed', 's02'], /互斥/],
  ['missing only value', ['--only'], /--only 缺参数值/],
  ['missing changed value', ['--changed', '--parallel', '2'], /--changed 缺参数值/],
  ['unknown only ID', ['--only', 's01,missing'], /--only.*missing/],
  ['unknown changed ID', ['--changed', 'missing'], /--changed.*missing/],
  ['changed list', ['--changed', 's01,s03'], /--changed.*一个.*--only.*邻镜/],
  ['duplicate only ID', ['--only', 's01,s01'], /--only.*重复/],
  ['empty only ID', ['--only', 's01,'], /--only.*空/],
  ['empty only value', ['--only', ''], /--only.*空/],
  ['empty changed value', ['--changed', ''], /--changed.*一个/],
];

for (const [name, args, message] of invalid) {
  test(`rejects ${name} before loading Remotion`, (t) => {
    const fixture = project(t);
    const result = fixture.run(args);
    assert.ifError(result.error);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, message);
    assert.doesNotMatch(result.stderr, /MODULE_NOT_FOUND/);
    assert.equal(fs.existsSync(path.join(fixture.root, 'out')), false);
  });
}

test('rejects conflicting modes before reading project files', (t) => {
  const fixture = project(t);
  fs.unlinkSync(path.join(fixture.root, 'shots.json'));
  const result = fixture.run(['--all', '--only', 's02']);
  assert.ifError(result.error);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /互斥/);
});

const valid = [
  ['all including cached segments', ['--all'], ['s02'], shotIds],
  ['single only', ['--only', 's03'], shotIds, ['s03']],
  ['multiple only in timeline order', ['--only', 's04,s02'], shotIds, ['s02', 's04']],
  ['changed with both neighbors', ['--changed', 's03'], shotIds, ['s02', 's03', 's04']],
  ['changed first shot', ['--changed', 's01'], shotIds, ['s01', 's02']],
  ['changed last shot', ['--changed', 's05'], shotIds, ['s04', 's05']],
  ['default missing segments', [], ['s01', 's03', 's05'], ['s02', 's04']],
  ['default complete cache', [], shotIds, []],
];

for (const [name, args, cached, expected] of valid) {
  test(`preserves ${name}`, (t) => {
    const fixture = project(t, {renderer: true, cached});
    const result = fixture.run(args);
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    const events = fixture.trace();
    assert.equal(events.filter((event) => event.event === 'bundle').length, 1);
    const renders = events.filter((event) => event.event === 'render');
    assert.deepEqual(renders.map((event) => event.id), expected);
    for (const render of renders) {
      const index = shotIds.indexOf(render.id);
      assert.deepEqual(render.frameRange, [index * 30, (index + 1) * 30 - 1]);
      assert.equal(render.codec, 'h264');
      assert.equal(render.muted, true);
      assert.equal(render.concurrency, 1);
    }
  });
}
