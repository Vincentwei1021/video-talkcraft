const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {pathToFileURL} = require('node:url');
const {EventEmitter} = require('node:events');
const ts = require('typescript');
const {create} = require('zustand');
const root = path.resolve(__dirname, '../..');

// Execute production TS with only its browser/project boundaries substituted.
function load(file, deps, globals = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
    .replaceAll('import.meta.hot', '__hot')
    .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(path.join(root, file)).href));
  const result = ts.transpileModule(source, {fileName: file, reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  }});
  assert.equal(result.diagnostics.length, 0, result.diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  const exports = {};
  vm.runInNewContext(result.outputText, {exports, console, URL, AbortController, __hot: undefined, ...globals, require(id) {
    if (id in deps) return deps[id];
    if (id.startsWith('node:')) return require(id);
    throw new Error(`Missing dependency boundary: ${id}`);
  }}, {filename: file});
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
// src/hmr.ts 的替身：一个 load() 一个 vm 上下文，共享同一个 bag 才能模拟"接入源码 HMR 让模块重执行、单例复用"
const hmrBag = () => {
  const bag = {};
  return {
    singleton: (k, make) => (k in bag ? bag[k] : (bag[k] = make())),
    setLatest: (k, v) => { bag['latest:' + k] = v; },
    getLatest: k => bag['latest:' + k],
  };
};
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function clock() {
  let now = 0, id = 0;
  const tasks = new Map();
  return {
    setTimeout(fn, delay) { const key = ++id; tasks.set(key, {fn, at: now + delay}); return key; },
    clearTimeout(key) { tasks.delete(key); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...tasks].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; tasks.delete(next[0]); next[1].fn(); await tick();
      }
      now = end; await tick();
    },
  };
}
const shot = {id: 's01', label: 's01', start: 0, end: 3};
const cards = {'kshot-s01': {schema: [{key: 'title', default: 'default'}]}};
const projectRoot = '/videos/项目 B';
function importer() {
  return load('workbench/src/kouboImport.ts', {
    './cards/registry': {CARDS: cards}, './cards/koubo-units': {},
    './kb/shots': {SHOTS: [shot], FPS: 30, TOTAL_FRAMES: 90}, './kb/sfx': {SFX_CUES: []},
    './kb/Subtitles': {phrases: () => [
      {text: '字幕', start: .041, end: .081, dark: false},
      {text: '没有可见帧', start: .081, end: .09, dark: false},
    ]},
    './kb/params': {OVERRIDES: {s01: {title: 'B saved edit'}}}, './kb/timing': {timing: {scenes: []}},
    './cards/koubo-skill': {KSHOT_PREFIX: 'kshot-', shotFrames: () => ({shot, from: 0, total: 90})},
    './kbMeta': {KB_PROJECT_ROOT: projectRoot, KB_FORM: 'skill', KB_LINKED: true, KB_DECOMPOSABLE: true, KB_COMP: {width: 1080, height: 1920, fps: 30}, KB_MODULES: {}, KB_TRANSITIONS: [], WIPE_TIMES: []},
    './hmr': hmrBag(), './mediaManifest': {MEDIA_ITEMS: [{file: 'narration.wav', kind: 'audio', label: '配音'}]},
  });
}
test('foreign and untagged projects rebuild from current source, including canvas and saved overrides', () => {
  const kb = importer(), fresh = kb.buildKouboProject();
  for (const source of [undefined, '/videos/A']) {
    const old = plain(fresh); old.kbProjectRoot = source; old.width = 1920; old.height = 1080;
    old.tracks.find(t => t.id === 'kb-track-shots').clips[0].props.title = 'A title';
    assert.equal(kb.isKouboProject(old), false);
    assert.deepEqual(plain(kb.syncKouboProject(old)), plain(fresh));
  }
  const own = plain(fresh);
  own.tracks.find(t => t.id === 'kb-track-shots').clips[0].props.title = 'B user edit';
  assert.equal(kb.syncKouboProject(own).tracks.find(t => t.id === 'kb-track-shots').clips[0].props.title, 'B user edit');
  const sub = fresh.tracks[0].clips[0];
  assert.equal(fresh.tracks[0].clips.length, 1);
  assert.equal(sub.start, 2); assert.equal(sub.duration, 1);
});

test('localStorage and HMR state are isolated by source; legacy data is retained', async () => {
  const values = new Map([['talkcraft-workbench-project-v1', JSON.stringify({name: 'legacy', tracks: []})]]);
  const timer = clock();
  function store(source, hot) {
    return load('workbench/src/store.ts', {
      zustand: {create}, './types': {}, './cards/registry': {CARDS: {}}, './kbMeta': {KB_PROJECT_ROOT: source},
      './demoProject': {demoProject: () => ({name: 'demo', tracks: []})}, './hmr': hmrBag(),
    }, {...timer, __hot: hot, localStorage: {getItem: k => values.get(k), setItem: (k, v) => values.set(k, v)},
      window: {addEventListener() {}}, document: {addEventListener() {}},
    }).useStore;
  }
  const a = store('/videos/A'); a.getState().setProject({name: 'A edit', tracks: []}); await timer.advance(800);
  const b = store(projectRoot, {data: {projectRoot: '/videos/A', store: a.getState()}, dispose() {}});
  assert.equal(b.getState().project.name, 'demo');
  b.getState().setProject({name: 'B edit', tracks: []}); await timer.advance(800);
  assert.equal(store('/videos/A').getState().project.name, 'A edit');
  assert.equal(store(projectRoot).getState().project.name, 'B edit');
  assert.equal(JSON.parse(values.get('talkcraft-workbench-project-v1')).name, 'legacy');
});

function saver(fetchImpl) {
  const kb = importer(), timer = clock();
  const useStore = create(() => ({project: kb.buildKouboProject()}));
  const requests = [];
  const api = load('workbench/src/overridesSync.ts', {
    zustand: {create}, './store': {useStore}, './cards/registry': {CARDS: cards},
    './cards/types': {defaultsOf: card => Object.fromEntries(card.schema.map(f => [f.key, f.default]))},
    './cards/koubo-skill': {KSHOT_PREFIX: 'kshot-'}, './kouboImport': kb, './hmr': hmrBag(),
    './kbMeta': {KB_SKILL: true, KB_PROJECT_ROOT: projectRoot},
  }, {...timer, fetch(url, init) { requests.push({url, ...init}); return fetchImpl(requests.length, init); }});
  api.startOverridesSync();
  return {requests, api, useStore, ...timer, edit(title) {
    const project = plain(useStore.getState().project);
    project.tracks.find(t => t.id === 'kb-track-shots').clips[0].props.title = title;
    useStore.setState({project});
  }};
}
for (const failure of ['http', 'network']) test(`failed ${failure} save is visible and retried without another edit`, async () => {
  const s = saver(async n => {
    if (n === 1 && failure === 'network') throw new Error('offline');
    return {ok: n > 1, status: 500};
  });
  await s.advance(600);
  assert.match(s.api.useOverridesSave.getState().error, /尚未保存/);
  assert.equal(s.requests[0].headers['X-Workbench-Project'], encodeURIComponent(projectRoot));
  await s.advance(1000);
  assert.equal(s.requests.length, 2); assert.equal(s.api.useOverridesSave.getState().error, null);
  s.edit('B saved edit'); await s.advance(600); assert.equal(s.requests.length, 2);
});
test('writes are serial and retain only the newest edit during an in-flight request', async () => {
  let resolve;
  const s = saver(n => n === 1 ? new Promise(r => {resolve = r;}) : Promise.resolve({ok: true}));
  await s.advance(600);
  s.edit('intermediate'); s.edit('latest'); await s.advance(600);
  assert.equal(s.requests.length, 1);
  resolve({ok: true}); await tick(); await s.advance(0);
  assert.equal(s.requests.length, 2); assert.equal(JSON.parse(s.requests[1].body).s01.title, 'latest');
});
test('switching away cancels queued saves and retries, including foreign source projects', async () => {
  for (const afterFailure of [false, true]) {
    const s = saver(async () => ({ok: false, status: 500}));
    if (afterFailure) await s.advance(600);
    const foreign = plain(s.useStore.getState().project); foreign.kbProjectRoot = '/videos/A';
    s.useStore.setState({project: foreign}); await s.advance(30000);
    assert.equal(s.requests.length, afterFailure ? 1 : 0); assert.equal(s.api.useOverridesSave.getState().error, null);
  }
});
test('hung requests time out and retry instead of blocking every later edit', async () => {
  const s = saver((n, init) => n > 1 ? Promise.resolve({ok: true}) : new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  await s.advance(10600); assert.match(s.api.useOverridesSave.getState().error, /尚未保存/);
  await s.advance(1000); assert.equal(s.requests.length, 2); assert.equal(s.api.useOverridesSave.getState().error, null);
});

test('subtitle windows preserve original first-match timing and match decomposed text on every frame', () => {
  let frame = 0;
  const raw = [{ch: '甲', t: .1, e: 1}, {ch: '乙', t: 1.1, e: 2}, {ch: '丙', t: 3, e: 4}];
  const subtitle = load('template/motion-systems/Subtitles.tsx', {
    react: {createElement(type, props, ...children) {return {type, props, children};}, useMemo: fn => fn()},
    remotion: {AbsoluteFill: 'AbsoluteFill', useCurrentFrame: () => frame, useVideoConfig: () => ({fps: 30})},
    './timing': {timing: {scenes: raw.map(c => ({chars: [c]}))}}, './theme': {C: {}, FONT: {}},
  });
  const flatten = el => typeof el === 'string' ? el : Array.isArray(el) ? el.map(flatten).join('') : (el?.children ?? []).map(flatten).join('');
  for (frame = 0; frame < 150; frame++) {
    const sec = frame / 30;
    const expected = raw.find(c => sec >= c.t && sec < c.e + .3)?.ch ?? '';
    const clip = subtitle.phrases().find(p => sec >= p.start && sec < p.end);
    assert.equal(flatten(subtitle.Subtitles({})), expected, `original frame ${frame}`);
    assert.equal(clip?.text ?? '', expected, `decomposed frame ${frame}`);
  }
});

test('overrides endpoint rejects stale clients and reports disk failures', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-overrides-'));
  t.after(() => fs.rmSync(temp, {recursive: true, force: true}));
  const rem = path.join(temp, 'remotion'); fs.mkdirSync(rem);
  const file = path.join(rem, 'overrides.json'); fs.writeFileSync(file, '{"saved":true}');
  const config = load('workbench/vite.config.ts', {
    vite: {defineConfig: c => c}, '@vitejs/plugin-react': () => ({}),
    './kbsrc.map.mjs': {kbsrcMap: () => ({projectRoot: temp, remotionDir: rem, viteAlias: []})},
    '../scripts/pipeline_state.mjs': {},
  }, {setInterval() {}, clearInterval() {}, setTimeout() {}, clearTimeout() {}}).default;
  let handler;
  config.plugins.find(p => p.name === 'wb-pipeline').configureServer({
    watcher: {add() {}, on() {}}, httpServer: {on() {}}, middlewares: {use(_route, fn) {handler = fn;}},
  });
  function post(source) {
    const req = new EventEmitter(); req.method = 'POST'; req.url = '/overrides'; req.headers = {'x-workbench-project': source};
    const res = {setHeader() {}, end(body) {this.body = JSON.parse(body);}};
    handler(req, res); req.emit('data', '{"s01":{"title":"saved"}}'); req.emit('end'); return res;
  }
  assert.equal(post(undefined).statusCode, 409);
  assert.equal(post(encodeURIComponent('/old/project')).statusCode, 409);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"saved":true}');
  assert.equal(post(encodeURIComponent(temp)).statusCode, 200);
  assert.equal(JSON.parse(fs.readFileSync(file)).s01.title, 'saved');
  fs.unlinkSync(file); fs.mkdirSync(file);
  assert.equal(post(encodeURIComponent(temp)).statusCode, 500);
});

// 2026-09-21 多轨自动跟盘：工程文件一变 → syncedIfChanged() 给出同步后的工程（没变就是 null）；cue 表已带 sfx/ 前缀不再叠成 sfx/sfx/，旧工程同步时修回
function importerWithSfx(cues, meta = {}, media = [{file: 'narration.wav', kind: 'audio', label: '配音'}], sfxAll = []) {
  return load('workbench/src/kouboImport.ts', {
    './hmr': hmrBag(), './mediaManifest': {MEDIA_ITEMS: media, SFX_ALL: sfxAll},
    './cards/registry': {CARDS: cards}, './cards/koubo-units': {},
    './kb/shots': {SHOTS: [shot], FPS: 30, TOTAL_FRAMES: 90}, './kb/sfx': {SFX_CUES: cues},
    './kb/Subtitles': {phrases: () => [{text: '字幕', start: .041, end: .081, dark: false}]},
    './kb/params': {OVERRIDES: {}}, './kb/timing': {timing: {scenes: []}},
    './cards/koubo-skill': {KSHOT_PREFIX: 'kshot-', shotFrames: () => ({shot, from: 0, total: 90})},
    './kbMeta': {KB_PROJECT_ROOT: projectRoot, KB_FORM: 'skill', KB_LINKED: true, KB_DECOMPOSABLE: true, KB_COMP: {width: 1920, height: 1080, fps: 30}, KB_MODULES: {}, KB_TRANSITIONS: [], WIPE_TIMES: [], ...meta},
  });
}
const sfxClips = p => p.tracks.filter(t => t.id.startsWith('kb-track-sfx')).flatMap(t => t.clips);
test('auto-sync reports only real changes, follows new cues, and repairs doubled sfx/ paths without touching other edits', () => {
  const a = importerWithSfx([{t: 1, file: 'sfx/pk-pop.mp3', vol: .3}]);
  const p = a.buildKouboProject();
  assert.deepEqual(plain(sfxClips(p).map(c => [c.props.file, c.label])), [['sfx/pk-pop.mp3', 'pop']]);
  assert.equal(a.syncedIfChanged(p), null, 'unchanged source must not produce a new project');
  assert.equal(a.syncedIfChanged({...plain(p), kbProjectRoot: '/videos/other'}), null, 'foreign projects are left alone');

  const b = importerWithSfx([{t: 1, file: 'sfx/pk-pop.mp3', vol: .3}, {t: 2, file: 'pk-tick.mp3', vol: .2}]);
  const next = b.syncedIfChanged(p);
  assert.ok(next, 'a new cue on disk must surface');
  assert.deepEqual(plain(sfxClips(next).map(c => c.props.file).sort()), ['sfx/pk-pop.mp3', 'sfx/pk-tick.mp3']);
  assert.equal(b.syncedIfChanged(next), null);

  const legacy = plain(p);
  const c0 = sfxClips(legacy)[0];
  c0.props = {file: 'sfx/sfx/pk-pop.mp3', volume: .9}; c0.label = 'sfx/pk-pop';
  const fixed = sfxClips(a.syncKouboProject(legacy))[0];
  assert.equal(fixed.props.file, 'sfx/pk-pop.mp3');
  assert.equal(fixed.props.volume, .9, 'user volume edit survives the path repair');
  assert.equal(fixed.label, 'pop');
});

// 2026-09-21 独立评审 P0-1：接入了却不满足拆解契约（KB_FORM none）时，同步绝不能把用户多轨工程改写成 stub 残骸
test('contract-incomplete projects are never rebuilt or rewritten by sync', () => {
  const ok = importerWithSfx([{t: 1, file: 'pk-a.mp3', vol: .3}]);
  const p = ok.buildKouboProject();
  const broken = importerWithSfx([], {KB_FORM: 'none', KB_LINKED: true, KB_DECOMPOSABLE: false});
  assert.equal(broken.syncedIfChanged(p), null);
  assert.equal(broken.syncKouboProject(p), p, 'existing project object returned untouched');
  assert.throws(() => broken.buildKouboProject(), /拆解契约/);
});

// 评审 P1-1：用户在工作台挪过的 kb- 片段不被自动同步复位；盘上真值自己变了才以盘上为准
test('user-moved kb clips keep their timing until the disk timing itself changes', () => {
  const a = importerWithSfx([{t: 1, file: 'pk-a.mp3', vol: .3}]);
  const p = plain(a.buildKouboProject());
  assert.equal(p.kbTime['kb-sfx-0'], '30:90');
  sfxClips(p)[0].start = 80;                       // 用户拖到 80
  assert.equal(sfxClips(a.syncKouboProject(p))[0].start, 80, 'unchanged disk keeps the user position');
  assert.equal(a.syncedIfChanged(p), null, 'and that is not reported as a change');
  const b = importerWithSfx([{t: 2, file: 'pk-a.mp3', vol: .3}]);  // agent 把 cue 挪到 2s
  assert.equal(sfxClips(b.syncKouboProject(p))[0].start, 60, 'disk change wins over the stale user position');
  const legacy = plain(p); delete legacy.kbTime; sfxClips(legacy)[0].start = 80;
  assert.equal(sfxClips(a.syncKouboProject(legacy))[0].start, 30, 'projects without kbTime keep the old follow-disk behaviour');
});

// 评审 P0-2：store 是 globalThis 单例——模块重执行（第二次 load 共享同一个 bag）拿到同一个对象，编辑与订阅不丢
test('store survives module re-execution as a singleton', async () => {
  const shared = hmrBag(), timer = clock(), values = new Map();
  const loadStore = () => load('workbench/src/store.ts', {
    zustand: {create}, './types': {}, './cards/registry': {CARDS: {}}, './kbMeta': {KB_PROJECT_ROOT: projectRoot},
    './demoProject': {demoProject: () => ({name: 'demo', tracks: []})}, './hmr': shared,
  }, {...timer, __hot: undefined, localStorage: {getItem: k => values.get(k), setItem: (k, v) => values.set(k, v)},
    window: {addEventListener() {}}, document: {addEventListener() {}},
  }).useStore;
  const a = loadStore(); a.getState().setProject({name: 'edited', tracks: []});
  const b = loadStore();
  assert.equal(a, b, 'same store object across two module executions');
  assert.equal(b.getState().project.name, 'edited');
  await timer.advance(800);
  assert.equal(JSON.parse(values.get(`talkcraft-workbench-project-v1:${encodeURIComponent(projectRoot)}`)).name, 'edited', 'autosave installed exactly once still works');
});

// 2026-09-21 用户："原来口播的声音怎么没了"——配音块写死 full.wav，工程用 narration.wav 时多轨静音。按工程实际音频解析；旧存档同步时迁移
test('voice track resolves the project narration file and migrates legacy full.wav clips', () => {
  const a = importerWithSfx([]);
  const voice = p => p.tracks.find(t => t.id === 'kb-track-voice').clips[0];
  assert.equal(a.VOICE_FILE, 'narration.wav');
  const p = a.buildKouboProject();
  assert.equal(voice(p).props.file, 'narration.wav');
  const legacy = plain(p); voice(legacy).props = {file: 'full.wav', volume: .7}; voice(legacy).label = '配音 full.wav';
  const synced = voice(a.syncKouboProject(legacy));
  assert.equal(synced.props.file, 'narration.wav', 'missing full.wav is swapped for the real narration file');
  assert.equal(synced.props.volume, .7, 'user volume survives');
  const b = importerWithSfx([], {}, [{file: 'full.wav', kind: 'audio', label: '配音'}]);
  assert.equal(b.VOICE_FILE, 'full.wav', 'projects that really ship full.wav keep it');
  assert.equal(voice(b.syncKouboProject(legacy)).props.file, 'full.wav');
});

// 2026-09-22 用户复查 #4：迁移只针对旧拆解写死的 full.wav，且存在性判断要认 sfx/（素材清单顶层跳过 sfx/，
// 否则用户把配音指到 sfx/custom-voice.wav 这种有效文件会被同步换掉）
test('voice migration only touches the legacy full.wav and never overwrites a user-chosen file that exists', () => {
  const voice = p => p.tracks.find(t => t.id === 'kb-track-voice').clips[0];
  const a = importerWithSfx([], {}, [{file: 'narration.wav', kind: 'audio', label: '配音'}], ['custom-voice.mp3']);
  const base = a.buildKouboProject();
  const withSfxVoice = plain(base); voice(withSfxVoice).props = {file: 'sfx/custom-voice.mp3', volume: .8};
  assert.equal(voice(a.syncKouboProject(withSfxVoice)).props.file, 'sfx/custom-voice.mp3', 'a valid sfx/ voice survives sync');
  const withTopVoice = plain(base); voice(withTopVoice).props = {file: 'narration.wav', volume: 1};
  assert.equal(voice(a.syncKouboProject(withTopVoice)).props.file, 'narration.wav');
  // 用户挑了个盘上没有的名字（打错字）：也不动——由 workbench_contract_lint 的配音检查去报，同步不替用户改决定
  const withTypo = plain(base); voice(withTypo).props = {file: 'narraton.wav', volume: 1};
  assert.equal(voice(a.syncKouboProject(withTypo)).props.file, 'narraton.wav', 'user-chosen names are never rewritten');
  // 旧写死的 full.wav 仍照常迁移
  const legacy = plain(base); voice(legacy).props = {file: 'full.wav', volume: .5};
  assert.equal(voice(a.syncKouboProject(legacy)).props.file, 'narration.wav');
});
