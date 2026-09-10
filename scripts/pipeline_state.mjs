// pipeline_state.mjs（用 node 调，不带 shebang：workbench/vite.config.ts 直接 import 本文件）—— 制作进度状态清单 pipeline.json（工作台实时看板 L1 的数据源；workbench/docs/live-pipeline.md §3）
//
// 用法（在工程根或 remotion/ 下执行；skill 每步末尾调一次，不带参数就是"按盘上产物重算并落盘"）：
//   node <skill根>/scripts/pipeline_state.mjs [--root <工程根>]
//        [--stage ①|②|③|④|⑤|⑥⑦|⑧]          # 手工钉住当前阶段（默认按产物推断）
//        [--pass s01,s02 | --pass all] [--unpass sNN]   # 机器闸 + 审片过关（⑥⑦ 用；只有它是人工判定，盘上推不出）
//        [--issue "s07|P1|字幕带压到人脸安全区 12.3–12.8s"] [--clear-issues sNN|all]
//        [--note "文字"] [--print] [--dry-run]
//
// 状态推导（盘上事实优先，手工字段只补盘上推不出的）：
//   shots[].status：planned（只在 shots.json）→ placeholder（骨架已搭、SCENES 表里没它）→ implemented（SCENES 表里有 / scenes/ 下有同名文件）
//                   → rendered（out/segments|preview/<id>.mp4 在）→ passed（--pass）；场景文件比段新 → stale=true
//   issues：--issue 手工登记的未清缺陷（算红点）；mentions：review/*.md / REVIEW*.md 里 `[P0]`/`[P1]`/`[P2]` 且点名 sNN 的行
//           （自动抽取、标 source，可能早已修掉——只作镜头面板参考，不计红点）
//   stages：① 口播稿 → ② 配音/时间戳 → ③ 素材 → ④ SHOTBOOK+shots.json → ⑤ 骨架/逐镜 → ⑥⑦ 渲染/验收 → ⑧ delivery.mp4
// 工作台 dev server（workbench/vite.config.ts）直接 import 本文件的 derivePipeline 实时算，不依赖 skill 记得调它；
// 落盘的 pipeline.json 里 `manual` 一节（stage / verdicts / issues / notes）跨次保留，是唯一"手写"的部分。
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const SHOT_ID = /\bs\d{1,3}(?:_[\w-]+)?\b/g;
const STAGES = [
  { id: "①", label: "口播稿" },
  { id: "②", label: "配音 · 时间戳" },
  { id: "③", label: "素材" },
  { id: "④", label: "SHOTBOOK" },
  { id: "⑤", label: "实现" },
  { id: "⑥⑦", label: "渲染 · 验收" },
  { id: "⑧", label: "交付" },
];

const exists = (p) => { try { return existsSync(p); } catch { return false; } };
const mtime = (p) => { try { return statSync(p).mtimeMs; } catch { return 0; } };
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const readText = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const listDir = (p) => { try { return readdirSync(p); } catch { return []; } };
const rel = (root, p) => (p ? path.relative(root, p) : null);
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

/** 工程根：--root > cwd 含 remotion/ > cwd 是 remotion/ 则取上级 */
export const resolveRoot = (arg) => {
  if (arg) return path.resolve(arg);
  const cwd = process.cwd();
  if (exists(path.join(cwd, "remotion"))) return cwd;
  if (path.basename(cwd) === "remotion") return path.dirname(cwd);
  return cwd;
};

/** 读上一次落盘的手工字段（stage / verdicts / issues / notes），没有则空 */
export const readManual = (root) => {
  const prev = readJson(path.join(root, "pipeline.json"));
  const m = (prev && prev.manual) || {};
  return {
    stage: typeof m.stage === "string" ? m.stage : null,
    verdicts: m.verdicts && typeof m.verdicts === "object" ? m.verdicts : {},
    issues: Array.isArray(m.issues) ? m.issues : [],
    notes: Array.isArray(m.notes) ? m.notes : [],
  };
};

/** 从 Main*.tsx / scenes/index.tsx 抓 SCENES 表：{ id → 组件名 }；抓不到返回 null */
const parseScenesMap = (srcDir) => {
  for (const f of ["Main.tsx", "MainVideo.tsx", "scenes/index.tsx", "scenes/index.ts", "Main.jsx"]) {
    const s = readText(path.join(srcDir, f));
    if (!s) continue;
    // 只认定义（const/let/export const SCENES… = {…}），import {SCENES} 与 SCENES[id] 的用法不算
    const m = s.match(/(?:const|let|var)\s+SCENES\b[^=\n]*=\s*\{([\s\S]*?)\n\s*\}/);
    if (!m) continue;
    const map = {};
    for (const line of m[1].split("\n")) {
      const e = line.match(/^\s*['"]?([\w-]+)['"]?\s*:\s*([\w.]+)/);
      if (e) map[e[1]] = e[2];
    }
    return { file: path.join(srcDir, f), map };
  }
  return null;
};

/** review/*.md、REVIEW*.md 里带 [P0]/[P1]/[P2] 且点名 sNN 的行 → 自动抽取的 issues */
const extractReviewIssues = (root) => {
  const files = [];
  for (const f of listDir(root)) if (/^REVIEW.*\.md$/i.test(f)) files.push(path.join(root, f));
  for (const f of listDir(path.join(root, "review"))) if (/\.md$/i.test(f)) files.push(path.join(root, "review", f));
  const out = [];
  for (const file of files) {
    const lines = readText(file).split("\n");
    lines.forEach((line, i) => {
      const lv = line.match(/\[(P[012])\]/);
      if (!lv) return;
      if (/误报|已修|已改|✅|复核.*(OK|通过)/.test(line)) return;
      const ids = [...new Set((line.match(SHOT_ID) || []).map((x) => x.toLowerCase()))];
      if (!ids.length) return;
      const text = line.replace(/\*\*/g, "").replace(/^\s*[-*|]+\s*/, "").trim().slice(0, 220);
      for (const id of ids) out.push({ shot: id, level: lv[1], text, source: `${path.relative(root, file)}:${i + 1}` });
    });
  }
  return out;
};

/** 主推导：盘上产物 + 手工字段 → 状态清单 */
export const derivePipeline = (root, manual = readManual(root)) => {
  const remotion = path.join(root, "remotion");
  const src = path.join(remotion, "src");
  const out = path.join(remotion, "out");
  const audio = path.join(root, "audio");

  // —— 分镜表 ——
  const shotsJson = path.join(remotion, "shots.json");
  const rawShots = readJson(shotsJson);
  const shotList = Array.isArray(rawShots) ? rawShots.filter((s) => s && s.id != null) : [];
  const fpsMatch = readText(path.join(src, "shots.ts")).match(/\bFPS\s*=\s*(\d+)/);
  const fps = fpsMatch ? Number(fpsMatch[1]) : 30;
  const totalSec = shotList.length ? Math.max(...shotList.map((s) => Number(s.end) || 0)) : 0;

  // —— 骨架 / 场景表 ——
  const mainFile = ["Main.tsx", "MainVideo.tsx", "Main.jsx"].map((f) => path.join(src, f)).find(exists) || null;
  const skeleton = mainFile !== null && shotList.length > 0;
  const scenes = parseScenesMap(src);
  const sceneFiles = listDir(path.join(src, "scenes")).filter((f) => /\.(tsx|jsx|ts)$/.test(f) && !/^index\./.test(f));
  const sceneFileFor = (id) => {
    const n = norm(id);
    const hit = sceneFiles.find((f) => norm(f.replace(/\.\w+$/, "")).startsWith(n)) ||
      sceneFiles.find((f) => norm(f.replace(/\.\w+$/, "")).includes(n));
    return hit ? path.join(src, "scenes", hit) : null;
  };

  // —— issues（手工 --issue，算"未清"）与 mentions（REVIEW 自动抽取，可能早已修掉，只作参考不计红点）——
  const mentions = extractReviewIssues(root);
  const manualIssues = manual.issues.map((x) => ({ ...x, source: x.source || "manual" }));

  const shots = shotList.map((s) => {
    const id = String(s.id);
    const sceneFile = sceneFileFor(id);
    let status = "planned";
    if (skeleton) {
      if (scenes) {
        const comp = scenes.map[id];
        status = comp && !/placeholder|stub|todo/i.test(comp) ? "implemented" : "placeholder";
      } else status = sceneFile ? "implemented" : "placeholder";
    }
    const segment = path.join(out, "segments", `${id}.mp4`);
    const preview = path.join(out, "preview", `${id}.mp4`);
    const renderedAt = Math.max(exists(segment) ? mtime(segment) : 0, exists(preview) ? mtime(preview) : 0);
    if (renderedAt > 0 && status === "implemented") status = "rendered";
    const stale = renderedAt > 0 && sceneFile ? mtime(sceneFile) > renderedAt + 1000 : false;
    if (manual.verdicts[id] === "passed") status = "passed";
    const key = id.toLowerCase();
    const issues = manualIssues.filter((x) => x.shot === key);
    const shotMentions = mentions.filter((x) => x.shot === key);
    return {
      id,
      start: Number(s.start) || 0,
      end: Number(s.end) || 0,
      status,
      stale,
      sceneFile: rel(root, sceneFile),
      renderedAt: renderedAt ? new Date(renderedAt).toISOString() : null,
      segment: exists(segment) ? rel(root, segment) : null,
      preview: exists(preview) ? rel(root, preview) : null,
      issues,
      mentions: shotMentions,
    };
  });

  // —— 配音 ——
  const audioFiles = listDir(audio);
  const pick = (re) => { const f = audioFiles.find((x) => re.test(x)); return f ? rel(root, path.join(audio, f)) : null; };
  const cutsPath = path.join(audio, "cuts.json");
  const cuts = readJson(cutsPath);
  const voice = {
    raw: pick(/^raw\.(wav|mp3|m4a|flac)$/i),
    cleaned: pick(/^(full|voice)\.(wav|mp3)$/i),
    timestamps: exists(path.join(audio, "timestamps.json")) ? "audio/timestamps.json" : null,
    cuts: exists(cutsPath) ? "audio/cuts.json" : null,
    cutCount: cuts && Array.isArray(cuts.cuts) ? cuts.cuts.length : Array.isArray(cuts) ? cuts.length : 0,
  };

  // —— 阶段 ——
  const count = (st) => shots.filter((s) => s.status === st).length;
  const n = shots.length;
  const nImplPlus = shots.filter((s) => ["implemented", "rendered", "passed"].includes(s.status)).length;
  const nRenderedPlus = shots.filter((s) => ["rendered", "passed"].includes(s.status)).length;
  const nPassed = count("passed");
  const hasScript = ["script.json", "script.md", "口播稿.md", "script.txt"].some((f) => exists(path.join(root, f)));
  const publicDir = path.join(remotion, "public");
  const hasMaterial = exists(path.join(root, "sources.md")) || listDir(publicDir).some((d) => /broll|stills|evidence|pages|shots|dh/i.test(d));
  const hasShotbook = exists(path.join(root, "SHOTBOOK.md"));
  const hasReview = listDir(path.join(root, "review")).length > 0 || listDir(root).some((f) => /^REVIEW.*\.md$/i.test(f)) || listDir(path.join(root, "qa")).length > 0;
  const delivered = exists(path.join(root, "delivery.mp4"));
  const st = (done, running) => (done ? "done" : running ? "running" : "todo");
  const stages = STAGES.map((s) => {
    switch (s.id) {
      case "①": return { ...s, status: st(hasScript, false), artifacts: hasScript ? ["script.json"] : [] };
      case "②": return { ...s, status: st(!!voice.timestamps, !!voice.cleaned || !!voice.raw), artifacts: [voice.cuts, voice.cleaned, voice.timestamps].filter(Boolean) };
      case "③": return { ...s, status: st(hasMaterial, false), artifacts: hasMaterial ? ["remotion/public/"] : [] };
      case "④": return { ...s, status: st(hasShotbook && shotList.length > 0, hasShotbook), artifacts: [hasShotbook && "SHOTBOOK.md", shotList.length && "remotion/shots.json"].filter(Boolean) };
      case "⑤": return { ...s, status: st(skeleton && n > 0 && nImplPlus === n, skeleton), artifacts: [...new Set([mainFile && rel(root, mainFile), scenes && rel(root, scenes.file)].filter(Boolean))] };
      case "⑥⑦": return { ...s, status: st(n > 0 && nPassed === n, nRenderedPlus > 0 || hasReview), artifacts: [nRenderedPlus && "remotion/out/segments/", hasReview && "review/"].filter(Boolean) };
      case "⑧": return { ...s, status: st(delivered, false), artifacts: delivered ? ["delivery.mp4"] : [] };
      default: return { ...s, status: "todo", artifacts: [] };
    }
  });
  const inferred = (stages.find((s) => s.status === "running") || stages.find((s) => s.status === "todo") || stages[stages.length - 1]).id;
  const stage = manual.stage && STAGES.some((s) => s.id === manual.stage) ? manual.stage : inferred;

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    project: path.basename(root),
    root,
    fps,
    totalSec,
    totalFrames: Math.round(totalSec * fps),
    stage,
    stageInferred: inferred,
    stages,
    voice,
    shots,
    counts: {
      shots: n,
      planned: count("planned"),
      placeholder: count("placeholder"),
      implemented: count("implemented"),
      rendered: count("rendered"),
      passed: nPassed,
      stale: shots.filter((s) => s.stale).length,
      issues: manualIssues.length,
      p0p1: manualIssues.filter((x) => x.level !== "P2").length,
      mentions: mentions.length,
    },
    manual,
  };
};

export const writePipeline = (root, state) => {
  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, "pipeline.json"), JSON.stringify(state, null, 1) + "\n");
};

/** SHOTBOOK.md 里某镜的段落（`### sNN` 到下一个同级标题）；工作台镜头面板用 */
export const shotbookExcerpt = (root, id, maxChars = 4000) => {
  const s = readText(path.join(root, "SHOTBOOK.md"));
  if (!s) return "";
  const re = new RegExp(`^###\\s+${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[^\\n]*$`, "mi");
  const m = re.exec(s);
  if (!m) return "";
  const rest = s.slice(m.index);
  const next = rest.slice(m[0].length).search(/^#{1,3}\s/m);
  const block = next >= 0 ? rest.slice(0, m[0].length + next) : rest;
  return block.trim().slice(0, maxChars);
};

// —— CLI ——
const parseArgs = (argv) => {
  const o = { pass: [], unpass: [], issue: [], clearIssues: [], note: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => argv[++i];
    if (a === "--root") o.root = val();
    else if (a === "--stage") o.stage = val();
    else if (a === "--pass") o.pass.push(...val().split(","));
    else if (a === "--unpass") o.unpass.push(...val().split(","));
    else if (a === "--issue") o.issue.push(val());
    else if (a === "--clear-issues") o.clearIssues.push(...val().split(","));
    else if (a === "--note") o.note.push(val());
    else if (a === "--print") o.print = true;
    else if (a === "--dry-run") o.dry = true;
    else if (a === "-h" || a === "--help") o.help = true;
    else { console.error(`未知参数 ${a}`); process.exit(2); }
  }
  return o;
};

const main = () => {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) {
    console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 20).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    return;
  }
  const root = resolveRoot(o.root);
  if (!exists(path.join(root, "remotion"))) {
    console.error(`pipeline_state: ${root} 下没有 remotion/——用 --root 指到工程根`);
    process.exit(2);
  }
  const manual = readManual(root);
  const now = new Date().toISOString();
  if (o.stage) {
    if (!STAGES.some((s) => s.id === o.stage)) { console.error(`--stage 只接受 ${STAGES.map((s) => s.id).join(" ")}`); process.exit(2); }
    manual.stage = o.stage;
  }
  const state0 = derivePipeline(root, manual);
  const ids = state0.shots.map((s) => s.id);
  for (const id of o.pass) {
    if (id === "all") for (const x of ids) manual.verdicts[x] = "passed";
    else if (ids.includes(id)) manual.verdicts[id] = "passed";
    else console.warn(`--pass ${id}：shots.json 里没有这个镜头`);
  }
  for (const id of o.unpass) { if (id === "all") manual.verdicts = {}; else delete manual.verdicts[id]; }
  for (const raw of o.issue) {
    const [shot, level, ...rest] = raw.split("|");
    const text = rest.join("|").trim();
    if (!shot || !/^P[012]$/.test(level || "") || !text) { console.error(`--issue 格式：sNN|P0/P1/P2|文字（收到 ${JSON.stringify(raw)}）`); process.exit(2); }
    manual.issues.push({ shot: shot.trim().toLowerCase(), level, text, source: "manual", at: now });
  }
  for (const id of o.clearIssues) manual.issues = id === "all" ? [] : manual.issues.filter((x) => x.shot !== id.toLowerCase());
  for (const t of o.note) manual.notes.push({ text: t, at: now });

  const state = derivePipeline(root, manual);
  if (!o.dry) writePipeline(root, state);
  const c = state.counts;
  const line = `pipeline${o.dry ? "(dry-run)" : ""}: ${state.project} · 阶段 ${state.stage}${state.stage !== state.stageInferred ? `（推断 ${state.stageInferred}）` : ""} · ` +
    `镜头 ${c.shots}：占位 ${c.placeholder} / 已实现 ${c.implemented} / 已渲 ${c.rendered} / 已过 ${c.passed}` +
    (c.planned ? ` / 仅规划 ${c.planned}` : "") + (c.stale ? ` · 过期 ${c.stale}` : "") +
    ` · 未清 issues ${c.issues}（P0/P1 ${c.p0p1}）` + (c.mentions ? ` · 评审提及 ${c.mentions}` : "") +
    (o.dry ? "" : ` → ${path.relative(process.cwd(), path.join(root, "pipeline.json")) || "pipeline.json"}`);
  console.log(line);
  if (o.print) console.log(JSON.stringify(state, null, 1));
};

if (process.argv[1] && /pipeline_state\.mjs$/.test(process.argv[1])) main();
