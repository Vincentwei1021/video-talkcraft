#!/usr/bin/env node
// 扫描 references/cards/*.md + demos/<slug>/，生成静态画廊 gallery/index.html。
// 用法：node gallery/build.mjs   （每次新增/修改卡片后重跑）
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cardsDir = resolve(root, "references", "cards");
const demosDir = resolve(root, "demos");
const thumbsDir = resolve(root, "gallery", "thumbs");
mkdirSync(thumbsDir, { recursive: true });

// --pages：生成 GitHub Pages 版——小窗/胶片条预览改用 release（gallery-media）里的
//   mp4（media/<slug>.mp4），demo 路径从 ../demos/ 变成同级 demos/（部署时 demos/ 会
//   拷进站点根，主屏播放器仍是可交互、有声的活 demo）。部署流程见 .github/workflows/deploy-pages.yml。
// --out <file>：输出 html 路径（默认 gallery/index.html；CI 里用 --pages --out site/index.html）
const argvv = process.argv.slice(2);
const PAGES = argvv.includes("--pages");
const outIdx = argvv.indexOf("--out");
const outPath = outIdx >= 0 && argvv[outIdx + 1]
  ? resolve(process.cwd(), argvv[outIdx + 1])
  : resolve(root, "gallery", "index.html");
const DEMO_BASE = PAGES ? "demos/" : "../demos/";

function parseCard(file) {
  const raw = readFileSync(resolve(cardsDir, file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([^:：]+)[:：]\s*(.*)$/);
    if (kv) meta[kv[1].trim()] = kv[2].trim();
  }
  return { meta, body: m[2].trim() };
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 极简 markdown → HTML（够渲染配方卡：标题/表格/列表/加粗/行内码）
function mdToHtml(md) {
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const lines = md.split("\n");
  let html = "", i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^##\s/.test(l)) { html += `<h3>${inline(l.slice(3))}</h3>`; i++; }
    else if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.split("|").slice(1, -1).map((c) => c.trim());
      html += "<table>";
      rows.forEach((r, idx) => {
        if (/^\|[\s:-]+\|/.test(r) && idx === 1) return;
        const tag = idx === 0 ? "th" : "td";
        html += "<tr>" + cells(r).map((c) => `<${tag}>${inline(c)}</${tag}>`).join("") + "</tr>";
      });
      html += "</table>";
    }
    else if (/^-\s/.test(l)) {
      html += "<ul>";
      while (i < lines.length && /^-\s/.test(lines[i])) { html += `<li>${inline(lines[i].slice(2))}</li>`; i++; }
      html += "</ul>";
    }
    else if (l.trim() === "") { i++; }
    else {
      let para = "";
      while (i < lines.length && lines[i].trim() !== "" && !/^(##|\||-)\s?/.test(lines[i])) { para += (para ? " " : "") + lines[i]; i++; }
      html += `<p>${inline(para)}</p>`;
    }
  }
  return html;
}

// 本批新增卡（画廊里标 NEW）——每次入库新卡后更新这份名单。
// 2026-08-26 用户筛选完成：参考图复刻批与 remocn 搬运批都已验收入库，
// 于是名单清空、「复刻」横切 tab 一并取消（详见下面 renderTabs 的注释）。
// 那两批卡本来就各自带着自己的语义类别，在常规分类里已经就位，不需要再单独归档；
// 来源信息也没丢——每卡 frontmatter 的 `参考` 字段（参考图③ 第3格 / remocn 等）
// 仍在配方卡里，搜索框也照样能按它命中。下批入新卡时把 slug 填回这里即可。
const NEW_SLUGS = new Set([]);

const cards = [];
const problems = [];
for (const f of readdirSync(cardsDir).filter((f) => f.endsWith(".md")).sort()) {
  const parsed = parseCard(f);
  if (!parsed) { problems.push(`${f}: frontmatter 解析失败`); continue; }
  const slug = parsed.meta.name || f.replace(/\.md$/, "");
  const hasDemo = existsSync(resolve(demosDir, slug, "index.html"));
  const codeRef = parsed.meta["代码"] || null; // 实战卡：可运行参考是 template 代码而非 HTML demo
  if (!hasDemo && !codeRef) problems.push(`${slug}: 缺 demo`);
  const thumbSrc = resolve(root, "tools", ".verify", `${slug}-t1.png`);
  let thumb = null;
  if (existsSync(thumbSrc)) { copyFileSync(thumbSrc, resolve(thumbsDir, `${slug}.png`)); thumb = `thumbs/${slug}.png`; }
  // CI/新机器上没有 tools/.verify 截图缓存：直接用已入库的 gallery/thumbs
  else if (existsSync(resolve(thumbsDir, `${slug}.png`))) thumb = `thumbs/${slug}.png`;
  cards.push({
    slug,
    isNew: NEW_SLUGS.has(slug),
    zhName: parsed.meta["标题"] || slug,
    title: parsed.meta["一句话"] || "",
    category: parsed.meta["类别"] || "未分类",
    energy: parsed.meta["能量"] || "",
    duration: parsed.meta["时长"] || "",
    usage: parsed.meta["适用"] || "",
    refs: parsed.meta["参考"] || "",
    priority: parsed.meta["优先级"] || "P1",
    hasDemo,
    code: codeRef,
    thumb,
    bodyHtml: mdToHtml(parsed.body),
  });
}

for (const d of readdirSync(demosDir, { withFileTypes: true })) {
  if (d.isDirectory() && !d.name.startsWith("_") && !cards.some((c) => c.slug === d.name)) {
    problems.push(`demos/${d.name}: 缺配方卡`);
  }
}

const order = { P0: 0, P1: 1, P2: 2 };
cards.sort((a, b) => (a.category === b.category ? (order[a.priority] ?? 1) - (order[b.priority] ?? 1) : a.category.localeCompare(b.category, "zh")));
const categories = [...new Set(cards.map((c) => c.category))];

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>video-talkcraft · 口播动效库</title>${PAGES ? `
<meta name="description" content="video-talkcraft 口播视频动效库：78 张动效配方卡在线预览——动态字卡、数据镜头、证据巡游、运动承接转场、长镜头世界画布。">` : ""}
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  :root { --bg:#0b0b0e; --panel:#131317; --line:#232329; --txt:#ececf1; --dim:#8a8a96; --acc:#7A5AF8; --acc2:#9a82ff; }
  body { background:var(--bg); color:var(--txt); font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif; }

  /* ── 顶栏 ── */
  .topbar { position:sticky; top:0; z-index:40; display:flex; align-items:center; gap:22px;
    padding:14px 32px; background:#050507ee; backdrop-filter:blur(12px); border-bottom:1px solid #1a1a20; }
  .topbar h1 { font-size:21px; letter-spacing:1px; font-weight:800; white-space:nowrap; }
  .search { flex:1; max-width:520px; margin:0 auto; display:flex; }
  .search input { width:100%; background:#17171d; border:1px solid #26262e; color:var(--txt);
    border-radius:999px; padding:9px 20px; font-size:14px; outline:none; }
  .search input:focus { border-color:var(--acc); }
  .top-copy { white-space:nowrap; font-size:13px; padding:9px 18px; border-radius:10px; border:0;
    background:var(--acc); color:#fff; cursor:pointer; font-weight:600; opacity:.35; }
  .top-copy.on { opacity:1; }

  /* ── 分类 tab ── */
  .tabs { display:flex; align-items:center; gap:30px; padding:0 32px; border-bottom:1px solid #1a1a20;
    background:#0b0b0eee; position:sticky; top:57px; z-index:39; backdrop-filter:blur(12px); }
  .tab { padding:14px 2px 12px; font-size:15px; color:var(--dim); cursor:pointer; user-select:none;
    border-bottom:2.5px solid transparent; white-space:nowrap; }
  .tab.on { color:var(--txt); border-color:var(--acc); font-weight:600; }
  .tabs .spacer { flex:1; }
  .asp { font-size:12px; color:var(--dim); border:1px solid #26262e; border-radius:999px;
    padding:4px 12px; cursor:pointer; user-select:none; }
  .asp.on { color:var(--acc2); border-color:var(--acc); }
  .count { font-size:12px; color:var(--dim); margin-left:6px; }

  /* ── 主推大预览（播放器 + 胶片条） ── */
  .hero { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr); gap:22px;
    padding:24px 32px 8px; align-items:start; }
  .hero-player { position:relative; background:var(--panel); border:1px solid var(--line);
    border-radius:16px; overflow:hidden; aspect-ratio:16/9; width:100%; min-width:0; }
  .hero-player iframe { width:100%; height:100%; border:0; display:block; }
  .hero-player .nav { position:absolute; top:50%; transform:translateY(-50%); width:42px; height:68px;
    display:flex; align-items:center; justify-content:center; font-size:26px; color:#fff;
    background:rgba(5,5,8,.55); border:0; cursor:pointer; z-index:5; border-radius:12px;
    opacity:0; transition:opacity .15s; }
  .hero-player:hover .nav { opacity:1; }
  .hero-player .nav:hover { background:rgba(122,90,248,.75); }
  .hero-player .nav.prev { left:12px; }
  .hero-player .nav.next { right:12px; }
  .hero-player .pos { position:absolute; right:14px; top:12px; font-size:12.5px; color:#fff;
    background:rgba(5,5,8,.62); padding:4px 12px; border-radius:999px; z-index:5;
    font-family:Menlo,monospace; letter-spacing:1px; }
  .hero-info { display:flex; flex-direction:column; gap:14px; padding:10px 2px; min-width:0; }
  .hero-info h2 { font-size:30px; font-weight:800; }
  .hero-info h2 code { font-size:13px; color:var(--dim); font-weight:400; margin-left:10px; }
  .hero-meta { display:flex; gap:8px; flex-wrap:wrap; }
  .hchip { font-size:12px; color:#b9b9c6; background:#1b1b22; border-radius:999px; padding:4px 12px; }
  .hchip.p0 { background:#7a5af833; color:#c9baff; }
  .hero-one { font-size:14px; line-height:1.75; color:#c9c9d4; }
  .hero-usage { font-size:13px; line-height:1.7; color:var(--dim); }
  .hero-usage b { color:var(--acc2); font-weight:600; }
  .hero-scope { font-size:12.5px; line-height:1.7; color:#a9a9b6; background:#15151a; border:1px solid #202028;
    border-radius:10px; padding:10px 14px; max-height:132px; overflow:auto; }
  .hero-scope b { color:#cfcfda; }
  .hero-act { display:flex; gap:10px; margin-top:auto; }
  .hero-act .btn { font-size:14px; padding:10px 20px; border-radius:10px; border:1px solid #2a2a33;
    background:#1b1b22; color:var(--txt); cursor:pointer; text-decoration:none; text-align:center; }
  .hero-act .btn.primary { background:var(--acc); border-color:var(--acc); color:#fff; font-weight:600; }
  .hero-act .btn:hover { filter:brightness(1.15); }
  .hero-act label.btn { display:flex; align-items:center; gap:8px; }
  .hero-act input { accent-color:var(--acc); width:15px; height:15px; }
  .hero-hint { font-size:12px; color:#5c5c68; }
  .hero-hint kbd { background:#1b1b22; border:1px solid #2a2a33; border-radius:5px;
    padding:1px 7px; font-family:Menlo,monospace; font-size:11px; color:#9d9dab; }

  /* ── 胶片条：当前筛选下的全部卡，横向滚动浏览 ── */
  .strip-wrap { padding:14px 32px 6px; }
  .strip { display:flex; gap:10px; overflow-x:auto; padding:4px 2px 10px; scroll-behavior:smooth; }
  .strip::-webkit-scrollbar { height:8px; }
  .strip::-webkit-scrollbar-thumb { background:#26262e; border-radius:4px; }
  .strip::-webkit-scrollbar-track { background:transparent; }
  .chip-card { position:relative; flex:0 0 168px; aspect-ratio:16/9; border-radius:10px; overflow:hidden;
    border:2px solid var(--line); cursor:pointer; background:var(--panel); }
  .chip-card img { width:100%; height:100%; object-fit:cover; display:block; }
  .chip-card .nm { position:absolute; left:6px; bottom:6px; right:6px; font-size:11px; font-weight:700; color:#fff;
    background:rgba(5,5,8,.72); border-radius:5px; padding:2px 7px; overflow:hidden;
    text-overflow:ellipsis; white-space:nowrap; }
  .chip-card:hover { border-color:#3d3d4a; }
  .chip-card.on { border-color:var(--acc); box-shadow:0 0 14px #7a5af866; }
  .chip-card .idx { position:absolute; right:5px; top:5px; font-size:10px; color:#c9baff;
    background:rgba(5,5,8,.72); border-radius:4px; padding:1px 6px; font-family:Menlo,monospace; }
  .chip-card iframe { width:100%; height:100%; border:0; display:block; pointer-events:none; }
  .chip-card video, .tile .prev video { width:100%; height:100%; object-fit:cover; display:block;
    pointer-events:none; background:#0e0e12; }
  .topbar .ghlink { font-size:13px; color:var(--dim); text-decoration:none; white-space:nowrap; }
  .topbar .ghlink:hover { color:var(--acc2); }

  /* NEW 徽标：本批新增卡 */
  .newbadge { position:absolute; left:6px; top:6px; z-index:3; font-size:10px; font-weight:800;
    letter-spacing:1px; color:#0b0b0e; background:#7dffb2; border-radius:5px; padding:2px 7px;
    pointer-events:none; }
  .hchip.newchip { background:#7dffb233; color:#7dffb2; font-weight:700; }
  /* 来源徽标（配方卡 frontmatter 的「参考」字段）——原来是复刻批专用的橙标，
     复刻 tab 取消后改成所有卡通用；tab.rep 那两条随 tab 一起删了 */
  .hchip.repchip { background:#ffb54d26; color:#ffc978; font-weight:600; }

  /* ── 分区卡墙 ── */
  .section { padding:26px 32px 4px; }
  .sec-head { display:flex; align-items:center; gap:16px; margin-bottom:14px; }
  .sec-head h3 { font-size:17px; font-weight:700; white-space:nowrap; }
  .sec-head .rule { flex:1; height:1px; background:#1c1c22; }
  .sec-head .all { font-size:13px; color:var(--dim); cursor:pointer; white-space:nowrap; }
  .sec-head .all:hover { color:var(--acc2); }
  .sec-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:16px; }
  .tile { background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .tile.picked { border-color:var(--acc); box-shadow:0 0 0 1px #7a5af855; }
  .tile .prev { position:relative; aspect-ratio:16/9; background:#0e0e12; cursor:pointer; }
  .tile .prev img { width:100%; height:100%; object-fit:cover; display:block; }
  .tile .prev iframe { width:100%; height:100%; border:0; display:block; pointer-events:none; }
  .tile .prev .nm { position:absolute; left:10px; bottom:10px; font-size:14px; font-weight:800; color:#fff;
    background:rgba(5,5,8,.74); border-radius:7px; padding:4px 12px; letter-spacing:.5px; pointer-events:none; }
  .tile .bar { display:flex; align-items:center; gap:8px; padding:9px 12px; font-size:12px; color:var(--dim); }
  .tile .bar code { font-size:11.5px; }
  .tile .bar .tag { font-size:10.5px; padding:2px 8px; border-radius:999px; background:#1e1e26; color:#9d9dab; }
  .tile .bar .tag.p0 { background:#7a5af833; color:#c9baff; }
  .tile .bar .sp { flex:1; }
  .tile .bar label { display:flex; align-items:center; gap:5px; cursor:pointer; user-select:none; }
  .tile .bar input { accent-color:var(--acc); }
  .tile .bar button { font-size:12px; border:1px solid #2a2a33; background:#1b1b22; color:#cfcfd8;
    border-radius:7px; padding:4px 12px; cursor:pointer; }
  .tile .bar button:hover { background:#26262f; }
  .empty { color:var(--dim); text-align:center; padding:80px 0; }

  /* ── 配方卡弹窗 / 选择浮条 ── */
  dialog { margin:auto; width:min(780px,92vw); max-height:86vh; background:#131317; color:#dcdce4;
    border:1px solid #2e2e38; border-radius:16px; padding:0; }
  dialog::backdrop { background:rgba(0,0,0,.65); }
  .dlg-head { display:flex; justify-content:space-between; align-items:center; padding:16px 22px;
    border-bottom:1px solid #222; position:sticky; top:0; background:#131317; }
  .dlg-head button { border:1px solid #2a2a33; background:#1b1b22; color:#cfcfd8; border-radius:8px;
    padding:6px 16px; cursor:pointer; }
  .dlg-body { padding:10px 22px 26px; overflow:auto; font-size:14px; line-height:1.7; }
  .dlg-body h3 { margin:18px 0 6px; font-size:15px; color:#fff; }
  .dlg-body table { border-collapse:collapse; margin:8px 0; width:100%; font-size:13px; }
  .dlg-body th,.dlg-body td { border:1px solid #2c2c36; padding:6px 10px; text-align:left; }
  .dlg-body th { background:#1c1c24; }
  .dlg-body ul { padding-left:20px; margin:6px 0; }
  .dlg-body code { background:#20202a; padding:1px 5px; border-radius:4px; font-size:12px; }
  .dlg-body p { margin:6px 0; }
  #selbar { position:fixed; left:50%; bottom:22px; transform:translateX(-50%); display:none; align-items:center;
    gap:12px; background:#17171d; border:1px solid #33333f; border-radius:14px; padding:10px 16px;
    box-shadow:0 10px 40px rgba(0,0,0,.55); z-index:50; }
  #selbar.show { display:flex; }
  #selbar .names { max-width:52vw; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    font-size:12px; color:#c9baff; font-family:Menlo,monospace; }
  #selbar button { font-size:13px; padding:7px 14px; border-radius:8px; border:1px solid #2a2a33;
    background:#26262f; color:var(--txt); cursor:pointer; }
  #selbar button.primary { background:var(--acc); border-color:var(--acc); color:#fff; }
</style>
</head>
<body>
<div class="topbar">
  <h1>video-talkcraft · 口播动效库</h1>
  <div class="search"><input id="q" placeholder="搜索动效名称或关键词"></div>${PAGES ? `
  <a class="ghlink" href="https://github.com/Vincentwei1021/video-talkcraft" target="_blank" rel="noopener">GitHub ↗</a>` : ""}
</div>
<div class="tabs" id="tabs"></div>
<div class="hero" id="hero"></div>
<div class="strip-wrap"><div class="strip" id="strip"></div></div>
<div id="sections"></div>
<dialog id="dlg">
  <div class="dlg-head"><strong id="dlgTitle"></strong><button onclick="dlg.close()">关闭</button></div>
  <div class="dlg-body" id="dlgBody"></div>
</dialog>
<div id="selbar">
  <span id="selcount" style="font-size:13px"></span>
  <span class="names" id="selnames"></span>
  <button class="primary" id="copySel">复制名字</button>
  <button id="clearSel">清空</button>
</div>
<script src="${DEMO_BASE}_lib/sfx-samples.js"></script>
<script src="${DEMO_BASE}_lib/sfx.js"></script>
<script>
/* 声音代播：file:// 下 hero iframe 是 opaque origin，拿不到 autoplay 委托，
   iframe 里的 sfx 引擎会把 cue 经 postMessage 转发到这里，用父页的
   AudioContext 播（用户点卡片/切换就是父页手势，一次解锁全程有效）。 */
window.addEventListener("message", (e) => {
  const m = e.data && e.data.__sfx;
  if (m && window.SFX) window.SFX.play(m.name, m.opts);
});
const CARDS = ${JSON.stringify(cards.map(({ bodyHtml, ...rest }) => rest))};
const BODIES = ${JSON.stringify(Object.fromEntries(cards.map((c) => [c.slug, c.bodyHtml])))};
const CATS = ${JSON.stringify(categories)};
let cat = "全部", q = "", heroSlug = null;
const picked = new Set();

const $ = (id) => document.getElementById(id);
const dlg = $("dlg");

/* 从配方卡正文里抠「动效范围」段（h3 标题到下一个 h3），主推区展示 */
function scopeOf(slug) {
  const m = (BODIES[slug] || "").match(/<h3>动效范围<\\/h3>([\\s\\S]*?)(?=<h3>|$)/);
  return m ? m[1] : "";
}

function match(c) {
  if (cat !== "全部" && c.category !== cat) return false;
  /* 搜索仍覆盖 refs：想找"参考图③"或"remocn"来源的卡，搜关键词即可（复刻 tab 取消后的替代入口） */
  if (q && !(c.slug + c.zhName + c.title + c.refs + c.usage + c.category).toLowerCase().includes(q.toLowerCase())) return false;
  return true;
}

/* demo 自动播放：滚入挂预览（本地=活 demo iframe；Pages=release 里的 mp4），滚出卸载 */
const PAGES = ${PAGES};
function makePreview(slug) {
  if (PAGES) {
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = "auto";
    v.src = "media/" + slug + ".mp4";
    v.play && v.play().catch(() => {});
    return v;
  }
  const f = document.createElement("iframe");
  f.loading = "lazy"; f.src = "${DEMO_BASE}" + slug + "/index.html?embed=1";
  return f;
}
const io = new IntersectionObserver((ens) => {
  ens.forEach((en) => {
    const pv = en.target, slug = pv.dataset.slug;
    if (en.isIntersecting) {
      if (!pv.querySelector("iframe,video")) {
        pv.prepend(makePreview(slug));
        const img = pv.querySelector("img"); if (img) img.remove();
      }
    } else {
      const f = pv.querySelector("iframe,video");
      if (f) { f.remove(); const c = CARDS.find((x) => x.slug === slug);
        if (c && c.thumb) pv.insertAdjacentHTML("afterbegin", '<img src="' + c.thumb + '">'); }
    }
  });
}, { rootMargin: "100px 0px", threshold: 0.01 });

function syncSel() {
  $("selbar").classList.toggle("show", picked.size > 0);
  $("selcount").textContent = "已选 " + picked.size + " 张";
  $("selnames").textContent = [...picked].join(", ");
  document.querySelectorAll(".tile").forEach((t) => t.classList.toggle("picked", picked.has(t.dataset.slug)));
  const hc = document.querySelector(".hero-act input");
  if (hc) hc.checked = picked.has(heroSlug);
}
async function copyPicked(btn) {
  const text = [...picked].join(", ");
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement("textarea"); ta.value = text;
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  const old = btn.textContent; btn.textContent = "已复制 ✓";
  setTimeout(() => { btn.textContent = old; }, 1200);
}
function togglePick(slug, on) { on ? picked.add(slug) : picked.delete(slug); syncSel(); }
function openCard(slug) { $("dlgTitle").textContent = slug; $("dlgBody").innerHTML = BODIES[slug]; dlg.showModal(); }

function renderTabs() {
  const t = $("tabs"); t.innerHTML = "";
  /* 只有语义类别：原来最前面还有个「复刻」横切 tab（按来源批次归档待审的卡），
     2026-08-26 用户筛完后取消——那些卡在各自的语义类别里已经就位，
     按"来源"再切一刀属于施工期的脚手架，验收完就该拆。找来源用搜索框。 */
  ["全部", ...CATS].forEach((c) => {
    const el = document.createElement("span");
    el.className = "tab" + (cat === c ? " on" : ""); el.textContent = c;
    el.onclick = () => { cat = c; render(); }; t.appendChild(el);
  });
  const sp = document.createElement("span"); sp.className = "spacer"; t.appendChild(sp);
  const cnt = document.createElement("span"); cnt.className = "count"; cnt.id = "cnt"; t.appendChild(cnt);
}

function renderHero(list) {
  const h = $("hero");
  if (!list.length) { h.innerHTML = ""; return; }
  if (!list.some((c) => c.slug === heroSlug)) heroSlug = list[0].slug;
  const idx = list.findIndex((x) => x.slug === heroSlug);
  const c = list[idx];
  const scope = scopeOf(c.slug);
  h.innerHTML =
    '<div class="hero-player">' +
      // controls=1：播放/暂停、进度条、全屏都叠在视频画面内（demo-shell HUD）
      '<iframe src="${DEMO_BASE}' + c.slug + '/index.html?embed=1&controls=1" allowfullscreen allow="fullscreen; autoplay"></iframe>' +
      '<button class="nav prev" onclick="stepHero(-1)" title="上一个（←）">‹</button>' +
      '<button class="nav next" onclick="stepHero(1)" title="下一个（→）">›</button>' +
      '<span class="pos">' + (idx + 1) + ' / ' + list.length + '</span>' +
    '</div>' +
    '<div class="hero-info">' +
      '<h2>' + c.zhName + '<code>' + c.slug + '</code></h2>' +
      '<div class="hero-meta">' +
        (c.isNew ? '<span class="hchip newchip">NEW · 本批新增</span>' : "") +
        /* 来源徽标：原来只有复刻批显示（写作"复刻 · xxx"），现在所有卡都显示自己的
           「参考」字段——参考图格位、remocn、真实博主名都在这里，取消复刻 tab 后来源不丢 */
        (c.refs ? '<span class="hchip repchip">来源 · ' + c.refs + '</span>' : "") +
        (c.priority === "P0" ? '<span class="hchip p0">P0 高频</span>' : '<span class="hchip">' + c.priority + '</span>') +
        '<span class="hchip">' + c.category + '</span>' +
        (c.energy ? '<span class="hchip">能量·' + c.energy + '</span>' : "") +
      '</div>' +
      '<div class="hero-one">' + c.title + '</div>' +
      (c.usage ? '<div class="hero-usage"><b>适用场景：</b>' + c.usage + '</div>' : "") +
      (scope ? '<div class="hero-scope"><b>动效范围</b>' + scope + '</div>' : "") +
      '<div class="hero-act">' +
        '<a class="btn primary" href="${DEMO_BASE}' + c.slug + '/index.html" target="_blank">新窗口预览</a>' +
        '<button class="btn" onclick="openCard(\\'' + c.slug + '\\')">配方卡</button>' +
        '<label class="btn"><input type="checkbox" ' + (picked.has(c.slug) ? "checked" : "") +
          ' onchange="togglePick(\\'' + c.slug + '\\', this.checked)">选取</label>' +
      '</div>' +
      '<div class="hero-hint"><kbd>←</kbd> <kbd>→</kbd> 切换动效 · <kbd>空格</kbd> 选取当前 · 下方胶片条可点选</div>' +
    '</div>';
}

/* 胶片条：当前筛选下全部卡的缩略图横列，滚入视野即自动播放（iframe 循环），当前卡高亮 */
function renderStrip(list) {
  const s = $("strip");
  s.innerHTML = list.map((c, i) =>
    '<div class="chip-card' + (c.slug === heroSlug ? " on" : "") + '" data-slug="' + c.slug + '" onclick="setHero(\\'' + c.slug + '\\')">' +
      (c.thumb ? '<img src="' + c.thumb + '">' : "") +
      (c.isNew ? '<span class="newbadge">NEW</span>' : "") +
      '<span class="idx">' + (i + 1) + '</span>' +
      '<span class="nm">' + c.zhName + '</span></div>').join("");
  s.querySelectorAll(".chip-card").forEach((el) => io.observe(el));
  const cur = s.querySelector(".chip-card.on");
  if (cur) cur.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
}

function setHero(slug) {
  heroSlug = slug; render();
  const r = $("hero").getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) window.scrollTo({ top: 0, behavior: "smooth" });
}
function stepHero(d) {
  const list = CARDS.filter(match);
  if (!list.length) return;
  const i = list.findIndex((x) => x.slug === heroSlug);
  heroSlug = list[(i + d + list.length) % list.length].slug;
  render();
}
document.addEventListener("keydown", (e) => {
  if (dlg.open || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === "ArrowLeft") { e.preventDefault(); stepHero(-1); }
  else if (e.key === "ArrowRight") { e.preventDefault(); stepHero(1); }
  else if (e.key === " ") { e.preventDefault(); togglePick(heroSlug, !picked.has(heroSlug)); }
});

function renderSections(list) {
  const box = $("sections"); box.innerHTML = "";
  if (!list.length) { box.innerHTML = '<div class="empty">没有匹配的卡片</div>'; return; }
  /* 分区一律按语义类别（原来复刻 tab 下会改按来源批次分段，那个 tab 已取消） */
  const cats = cat === "全部" ? CATS.filter((cc) => list.some((c) => c.category === cc)) : [cat];
  cats.forEach((cc) => {
    const items = list.filter((c) => c.category === cc);
    if (!items.length) return;
    const sec = document.createElement("div"); sec.className = "section";
    sec.innerHTML = '<div class="sec-head"><h3>' + cc + '</h3><div class="rule"></div>' +
      '<span class="all" data-cat="' + cc + '">查看全部 ›</span></div>';
    const grid = document.createElement("div"); grid.className = "sec-grid";
    items.forEach((c) => {
      const el = document.createElement("div");
      el.className = "tile" + (picked.has(c.slug) ? " picked" : ""); el.dataset.slug = c.slug;
      el.innerHTML =
        '<div class="prev" data-slug="' + c.slug + '">' +
          (c.thumb ? '<img src="' + c.thumb + '">' : "") +
          (c.isNew ? '<span class="newbadge">NEW</span>' : "") +
          '<span class="nm">' + c.zhName + '</span></div>' +
        '<div class="bar"><code>' + c.slug + '</code>' +
          (c.priority === "P0" ? '<span class="tag p0">P0</span>' : "") +
          '<span class="sp"></span>' +
          '<label><input type="checkbox" ' + (picked.has(c.slug) ? "checked" : "") + '>选取</label>' +
          '<button data-card>配方卡</button></div>';
      el.querySelector(".prev").addEventListener("click", () => setHero(c.slug));
      el.querySelector("input").addEventListener("change", (e) => togglePick(c.slug, e.target.checked));
      el.querySelector("[data-card]").addEventListener("click", () => openCard(c.slug));
      io.observe(el.querySelector(".prev"));
      grid.appendChild(el);
    });
    sec.appendChild(grid);
    const all = sec.querySelector(".all");
    if (all) all.onclick = (e) => { cat = e.target.dataset.cat; render(); window.scrollTo({ top: 0 }); };
    box.appendChild(sec);
  });
}

function render() {
  io.disconnect();
  renderTabs();
  const list = CARDS.filter(match);
  renderHero(list);
  renderStrip(list);
  renderSections(list);
  const cnt = $("cnt"); if (cnt) cnt.textContent = list.length + " / " + CARDS.length;
  syncSel();
}

$("q").addEventListener("input", (e) => { q = e.target.value.trim(); render(); });
$("copySel").addEventListener("click", (e) => copyPicked(e.target));
$("clearSel").addEventListener("click", () => { picked.clear(); syncSel();
  document.querySelectorAll('.tile input, .hero-act input').forEach((cb) => { cb.checked = false; }); });

render();
</script>
</body>
</html>`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.log(`画廊已生成：${outPath}（${cards.length} 张卡${PAGES ? "，Pages 版" : ""}）`);
if (problems.length) console.log("待处理：\n - " + problems.join("\n - "));
