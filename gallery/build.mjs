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
//   Pages 版同时写出 robots.txt / sitemap.xml / llms.txt（SEO/GEO 基建）。
// --out <file>：输出 html 路径（默认 gallery/index.html；CI 里用 --pages --out site/index.html）
const argvv = process.argv.slice(2);
const PAGES = argvv.includes("--pages");
const outIdx = argvv.indexOf("--out");
const outPath = outIdx >= 0 && argvv[outIdx + 1]
  ? resolve(process.cwd(), argvv[outIdx + 1])
  : resolve(root, "gallery", "index.html");
const DEMO_BASE = PAGES ? "demos/" : "../demos/";

const SITE = "https://vincentwei1021.github.io/video-talkcraft/";
const GITHUB = "https://github.com/Vincentwei1021/video-talkcraft";

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

// 英文翻译：gallery/i18n/en/<slug>.md（frontmatter: name/title/usage + 翻译正文），
// 画廊英文模式的一句话/适用/配方卡正文都从这里来；缺翻译时回退中文并记入 problems
const i18nEnDir = resolve(root, "gallery", "i18n", "en");
function parseEnCard(slug) {
  const p = resolve(i18nEnDir, `${slug}.md`);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([^:：]+)[:：]\s*(.*)$/);
    if (kv) meta[kv[1].trim()] = kv[2].trim();
  }
  return { title: meta.title || "", usage: meta.usage || "", body: m[2].trim() };
}

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

// 本批新增卡（画廊里标 NEW）——每次入库新卡后更新这份名单，下批入新卡时把 slug 填回这里。
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
  const en = parseEnCard(slug);
  if (!en) problems.push(`${slug}: 缺英文翻译（gallery/i18n/en/${slug}.md）`);
  cards.push({
    slug,
    isNew: NEW_SLUGS.has(slug),
    zhName: parsed.meta["标题"] || slug,
    title: parsed.meta["一句话"] || "",
    titleEn: en?.title || "",
    category: parsed.meta["类别"] || "未分类",
    energy: parsed.meta["能量"] || "",
    duration: parsed.meta["时长"] || "",
    usage: parsed.meta["适用"] || "",
    usageEn: en?.usage || "",
    priority: parsed.meta["优先级"] || "P1",
    hasDemo,
    code: codeRef,
    thumb,
    bodyHtml: mdToHtml(parsed.body),
    bodyHtmlEn: en ? mdToHtml(en.body) : "",
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

// SEO：Pages 版的 meta / Open Graph / JSON-LD（中英双语描述，画廊正文是 JS 渲染，
// meta 层是搜索引擎与 AI 爬虫的主要抓取面）
const DESC = "video-talkcraft 口播视频动效库：78 张动效配方卡在线预览——动态字卡、数据镜头、证据巡游、运动承接转场。" +
  "78 motion recipe cards for narration videos — an agent skill for Claude Code / Codex, rendered with Remotion.";
const SEO_TITLE = "video-talkcraft · 口播视频动效库 | 78 Motion Recipe Cards for Narration Videos";
const OG_IMAGE = SITE + "thumbs/hand-drawn-ellipse.png";
const JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "video-talkcraft",
  alternateName: "口播视频动效库",
  description: DESC,
  url: SITE,
  sameAs: [GITHUB],
  applicationCategory: "MultimediaApplication",
  operatingSystem: "macOS, Windows, Linux",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  inLanguage: ["zh-CN", "en"],
  author: { "@type": "Person", name: "Vincent Wei", url: "https://x.com/VincentWei93" },
});

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${PAGES ? SEO_TITLE : "video-talkcraft · 口播动效库"}</title>${PAGES ? `
<meta name="description" content="${esc(DESC)}">
<meta name="keywords" content="口播视频,动效库,视频动效,AI视频制作,解说视频,Claude Code,agent skill,Remotion,motion graphics,kinetic typography,narration video,explainer video">
<link rel="canonical" href="${SITE}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="video-talkcraft">
<meta property="og:title" content="${esc(SEO_TITLE)}">
<meta property="og:description" content="${esc(DESC)}">
<meta property="og:url" content="${SITE}">
<meta property="og:image" content="${OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(SEO_TITLE)}">
<meta name="twitter:description" content="${esc(DESC)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<script type="application/ld+json">${JSONLD}</script>` : ""}
<script>try{var __t=localStorage.getItem("vtc-theme");if(__t)document.documentElement.dataset.theme=__t;}catch(e){}</script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  :root { --bg:#0b0b0e; --panel:#131317; --line:#232329; --line2:#1a1a20; --txt:#ececf1; --txt2:#c9c9d4;
    --dim:#8a8a96; --acc:#7A5AF8; --acc2:#9a82ff; --bar:#050507ee; --tabsbg:#0b0b0eee;
    --input:#17171d; --input-line:#26262e; --chip:#1b1b22; --chip-txt:#b9b9c6;
    --btn:#1b1b22; --btn-line:#2a2a33; --btn-txt:#cfcfd8; --hint:#5c5c68;
    --scope-bg:#15151a; --scope-line:#202028; --scope-txt:#a9a9b6; --scope-b:#cfcfda;
    --tag:#1e1e26; --tag-txt:#9d9dab; --rule:#1c1c22; --dlg:#131317; --dlg-line:#2e2e38; --dlg-txt:#dcdce4;
    --code:#20202a; --th:#1c1c24; --td-line:#2c2c36; --sel:#17171d; --sel-line:#33333f;
    --p0-bg:#7a5af833; --p0-txt:#c9baff; --scroll:#26262e; --hover-line:#3d3d4a;
    --shadow:rgba(0,0,0,.55); }
  html[data-theme="light"] { --bg:#f5f5f8; --panel:#ffffff; --line:#e3e3ea; --line2:#e7e7ee;
    --txt:#1c1c22; --txt2:#3a3a46; --dim:#6d6d7a; --acc:#7A5AF8; --acc2:#6a48f0;
    --bar:#ffffffee; --tabsbg:#f5f5f8ee; --input:#ffffff; --input-line:#d9d9e3;
    --chip:#ececf2; --chip-txt:#4a4a58; --btn:#ffffff; --btn-line:#d9d9e3; --btn-txt:#3a3a46;
    --hint:#9a9aa8; --scope-bg:#efeff4; --scope-line:#e3e3ea; --scope-txt:#55555f; --scope-b:#2a2a33;
    --tag:#ececf2; --tag-txt:#6d6d7a; --rule:#e7e7ee; --dlg:#ffffff; --dlg-line:#dddde6; --dlg-txt:#2a2a33;
    --code:#f0f0f4; --th:#f2f2f6; --td-line:#e3e3ea; --sel:#ffffff; --sel-line:#d9d9e3;
    --p0-bg:#7a5af81f; --p0-txt:#6a48f0; --scroll:#d5d5de; --hover-line:#c9c9d6;
    --shadow:rgba(20,20,40,.18); }
  body { background:var(--bg); color:var(--txt); font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif; }

  /* ── 顶栏 ── */
  .topbar { position:sticky; top:0; z-index:40; display:flex; align-items:center; gap:10px;
    padding:12px 32px; background:var(--bar); backdrop-filter:blur(12px); border-bottom:1px solid var(--line2); }
  .topbar h1 { font-size:21px; letter-spacing:1px; font-weight:800; white-space:nowrap; }
  .tb-spacer { flex:1; }
  .tbtn { display:inline-flex; align-items:center; gap:8px; font-size:13.5px; padding:8px 15px;
    border-radius:12px; border:1px solid var(--btn-line); background:var(--btn); color:var(--btn-txt);
    cursor:pointer; text-decoration:none; white-space:nowrap; font-family:inherit; line-height:1.4; }
  .tbtn:hover { border-color:var(--acc); color:var(--acc2); }
  .tbtn svg { width:16px; height:16px; display:block; flex:none; }
  .tbtn.icon-only { padding:8px 11px; }
  .follow-btn { border-color:var(--acc); }
  .tbtn .cnt { display:none; font-size:12px; background:var(--chip); color:var(--chip-txt);
    border-radius:999px; padding:2px 10px; }
  .follow { position:relative; }
  .follow .menu { display:none; position:absolute; right:0; top:100%; padding-top:8px; z-index:60; }
  .follow:hover .menu { display:block; }
  .follow .menu-in { background:var(--panel); border:1px solid var(--btn-line); border-radius:16px;
    box-shadow:0 12px 36px var(--shadow); min-width:214px; padding:8px; }
  .menu-h { font-size:11px; letter-spacing:2px; color:var(--dim); padding:8px 12px 6px; text-transform:uppercase; }
  .follow .menu a { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px;
    font-size:13.5px; color:var(--txt); text-decoration:none; white-space:nowrap; }
  .follow .menu a:hover { background:var(--chip); }
  .follow .menu a svg { width:18px; height:18px; flex:none; }
  .follow .menu .arr { margin-left:auto; color:var(--dim); font-size:13px; padding-left:16px; }

  /* ── 分类 tab + 搜索框（原 78/78 计数位） ── */
  .tabs { display:flex; align-items:center; gap:16px; padding:0 32px; border-bottom:1px solid var(--line2);
    background:var(--tabsbg); position:sticky; top:55px; z-index:39; backdrop-filter:blur(12px); }
  .cats { display:flex; align-items:center; gap:30px; overflow-x:auto; }
  .tab { padding:14px 2px 12px; font-size:15px; color:var(--dim); cursor:pointer; user-select:none;
    border-bottom:2.5px solid transparent; white-space:nowrap; }
  .tab.on { color:var(--txt); border-color:var(--acc); font-weight:600; }
  .tabs .spacer { flex:1; }
  .search { width:min(300px,30vw); margin:7px 0; }
  .search input { width:100%; background:var(--input); border:1px solid var(--input-line); color:var(--txt);
    border-radius:999px; padding:7px 16px; font-size:13px; outline:none; font-family:inherit; }
  .search input:focus { border-color:var(--acc); }

  /* ── 主推大预览（播放器 + 胶片条） ── */
  .hero { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr); gap:22px;
    padding:24px 32px 8px; align-items:start; }
  .hero-player { position:relative; background:#0e0e12; border:1px solid var(--line);
    border-radius:16px; overflow:hidden; aspect-ratio:16/9; width:100%; min-width:0; }
  .hero-player iframe { width:100%; height:100%; border:0; display:block; }
  /* 首次进页的点击播放层：浏览器自动播放策略下，声音必须由一次用户手势解锁 */
  .hero-poster { position:absolute; inset:0; cursor:pointer; background:#0e0e12; }
  .hero-poster img { width:100%; height:100%; object-fit:cover; display:block; filter:brightness(.72); }
  .hero-poster .pp { position:absolute; inset:0; display:flex; flex-direction:column; gap:14px;
    align-items:center; justify-content:center; }
  .hero-poster .ppbtn { width:74px; height:74px; border-radius:50%; background:rgba(5,5,8,.62);
    border:2px solid #ffffffcc; color:#fff; font-size:26px; display:flex; align-items:center;
    justify-content:center; padding-left:6px; }
  .hero-poster:hover .ppbtn { background:var(--acc); border-color:var(--acc); }
  .hero-poster .pph { font-size:13px; color:#fff; background:rgba(5,5,8,.62); padding:5px 14px; border-radius:999px; }
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
  .hchip { font-size:12px; color:var(--chip-txt); background:var(--chip); border-radius:999px; padding:4px 12px; }
  .hchip.p0 { background:var(--p0-bg); color:var(--p0-txt); }
  .hero-one { font-size:14px; line-height:1.75; color:var(--txt2); }
  .hero-usage { font-size:13px; line-height:1.7; color:var(--dim); }
  .hero-usage b { color:var(--acc2); font-weight:600; }
  .hero-scope { font-size:12.5px; line-height:1.7; color:var(--scope-txt); background:var(--scope-bg);
    border:1px solid var(--scope-line); border-radius:10px; padding:10px 14px; max-height:132px; overflow:auto; }
  .hero-scope b { color:var(--scope-b); }
  .hero-act { display:flex; gap:10px; margin-top:auto; }
  .hero-act .btn { font-size:14px; padding:7px 18px; border-radius:10px; border:1px solid var(--btn-line);
    background:var(--btn); color:var(--txt); cursor:pointer; text-decoration:none; text-align:center; font-family:inherit; }
  .hero-act .btn.primary { background:var(--acc); border-color:var(--acc); color:#fff; font-weight:600; }
  .hero-act .btn:hover { filter:brightness(1.08); }
  .hero-act label.btn { display:flex; align-items:center; gap:8px; }
  .hero-act input { accent-color:var(--acc); width:15px; height:15px; }
  .hero-hint { font-size:12px; color:var(--hint); }
  .hero-hint kbd { background:var(--btn); border:1px solid var(--btn-line); border-radius:5px;
    padding:1px 7px; font-family:Menlo,monospace; font-size:11px; color:var(--tag-txt); }

  /* ── 胶片条：当前筛选下的全部卡，横向滚动浏览 ── */
  .strip-wrap { padding:14px 32px 6px; }
  .strip { display:flex; gap:10px; overflow-x:auto; padding:4px 2px 10px; scroll-behavior:smooth; }
  .strip::-webkit-scrollbar { height:8px; }
  .strip::-webkit-scrollbar-thumb { background:var(--scroll); border-radius:4px; }
  .strip::-webkit-scrollbar-track { background:transparent; }
  .chip-card { position:relative; flex:0 0 168px; aspect-ratio:16/9; border-radius:10px; overflow:hidden;
    border:2px solid var(--line); cursor:pointer; background:#0e0e12; }
  .chip-card img { width:100%; height:100%; object-fit:cover; display:block; }
  .chip-card .nm { position:absolute; left:6px; bottom:6px; right:6px; font-size:11px; font-weight:700; color:#fff;
    background:rgba(5,5,8,.72); border-radius:5px; padding:2px 7px; overflow:hidden;
    text-overflow:ellipsis; white-space:nowrap; }
  .chip-card:hover { border-color:var(--hover-line); }
  .chip-card.on { border-color:var(--acc); box-shadow:0 0 14px #7a5af866; }
  .chip-card .idx { position:absolute; right:5px; top:5px; font-size:10px; color:#c9baff;
    background:rgba(5,5,8,.72); border-radius:4px; padding:1px 6px; font-family:Menlo,monospace; }
  .chip-card iframe { width:100%; height:100%; border:0; display:block; pointer-events:none; }
  .chip-card video, .tile .prev video { width:100%; height:100%; object-fit:cover; display:block;
    pointer-events:none; background:#0e0e12; }

  /* NEW 徽标：本批新增卡 */
  .newbadge { position:absolute; left:6px; top:6px; z-index:3; font-size:10px; font-weight:800;
    letter-spacing:1px; color:#0b0b0e; background:#7dffb2; border-radius:5px; padding:2px 7px;
    pointer-events:none; }
  .hchip.newchip { background:#7dffb233; color:#2f9e63; font-weight:700; }
  html:not([data-theme="light"]) .hchip.newchip { color:#7dffb2; }

  /* ── 分区卡墙 ── */
  .section { padding:26px 32px 4px; }
  .sec-head { display:flex; align-items:center; gap:16px; margin-bottom:14px; }
  .sec-head h3 { font-size:17px; font-weight:700; white-space:nowrap; }
  .sec-head .rule { flex:1; height:1px; background:var(--rule); }
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
  .tile .bar .tag { font-size:10.5px; padding:2px 8px; border-radius:999px; background:var(--tag); color:var(--tag-txt); }
  .tile .bar .tag.p0 { background:var(--p0-bg); color:var(--p0-txt); }
  .tile .bar .sp { flex:1; }
  .tile .bar label { display:flex; align-items:center; gap:5px; cursor:pointer; user-select:none; }
  .tile .bar input { accent-color:var(--acc); }
  .tile .bar button { font-size:12px; border:1px solid var(--btn-line); background:var(--btn); color:var(--btn-txt);
    border-radius:7px; padding:4px 12px; cursor:pointer; font-family:inherit; }
  .tile .bar button:hover { border-color:var(--acc); color:var(--acc2); }
  .empty { color:var(--dim); text-align:center; padding:80px 0; }

  /* ── 配方卡弹窗 / 选择浮条 ── */
  dialog { margin:auto; width:min(780px,92vw); max-height:86vh; background:var(--dlg); color:var(--dlg-txt);
    border:1px solid var(--dlg-line); border-radius:16px; padding:0; }
  dialog::backdrop { background:rgba(0,0,0,.65); }
  .dlg-head { display:flex; justify-content:space-between; align-items:center; padding:16px 22px;
    border-bottom:1px solid var(--rule); position:sticky; top:0; background:var(--dlg); }
  .dlg-head button { border:1px solid var(--btn-line); background:var(--btn); color:var(--btn-txt); border-radius:8px;
    padding:6px 16px; cursor:pointer; font-family:inherit; }
  .dlg-body { padding:10px 22px 26px; overflow:auto; font-size:14px; line-height:1.7; }
  .dlg-body h3 { margin:18px 0 6px; font-size:15px; color:var(--txt); }
  .dlg-body table { border-collapse:collapse; margin:8px 0; width:100%; font-size:13px; }
  .dlg-body th,.dlg-body td { border:1px solid var(--td-line); padding:6px 10px; text-align:left; }
  .dlg-body th { background:var(--th); }
  .dlg-body ul { padding-left:20px; margin:6px 0; }
  .dlg-body code { background:var(--code); padding:1px 5px; border-radius:4px; font-size:12px; }
  .dlg-body p { margin:6px 0; }
  #selbar { position:fixed; left:50%; bottom:22px; transform:translateX(-50%); display:none; align-items:center;
    gap:12px; background:var(--sel); border:1px solid var(--sel-line); border-radius:14px; padding:10px 16px;
    box-shadow:0 10px 40px var(--shadow); z-index:50; }
  #selbar.show { display:flex; }
  #selbar .names { max-width:52vw; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    font-size:12px; color:var(--p0-txt); font-family:Menlo,monospace; }
  #selbar button { font-size:13px; padding:7px 14px; border-radius:8px; border:1px solid var(--btn-line);
    background:var(--btn); color:var(--txt); cursor:pointer; font-family:inherit; }
  #selbar button.primary { background:var(--acc); border-color:var(--acc); color:#fff; }
</style>
</head>
<body>
<div class="topbar">
  <h1>video-talkcraft <span class="sub" id="h1sub">· 口播动效库</span></h1>
  <span class="tb-spacer"></span>
  <div class="follow">
    <button class="tbtn follow-btn" id="followBtn"><span id="followTxt">关注作者</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="menu"><div class="menu-in">
      <div class="menu-h" id="menuH">关注作者</div>
      <a href="https://www.douyin.com/user/MS4wLjABAAAAK1pkjBxilk2Oi_9h_vFyD-lTAu9CTlvhmOtkosDvvxg" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
        <span id="fDouyinT">抖音</span><span class="arr">↗</span></a>
      <a href="https://xhslink.cn/m/At9iP2d5C1V" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><rect x="2" y="5.5" width="20" height="13" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="12" y="14.8" text-anchor="middle" font-size="6.5" fill="currentColor" font-family="PingFang SC,sans-serif" font-weight="600">小红书</text></svg>
        <span id="fXhsT">小红书</span><span class="arr">↗</span></a>
      <a href="https://x.com/VincentWei93" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        <span id="fXT">X</span><span class="arr">↗</span></a>
    </div></div>
  </div>
  <a class="tbtn" id="starBtn" href="${GITHUB}" target="_blank" rel="noopener">
    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
    <span>Star</span><span class="cnt" id="starCnt"></span></a>
  <button class="tbtn icon-only" id="themeBtn" title="切换深/浅色"></button>
  <button class="tbtn" id="langBtn" title="Switch language">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    <span id="langTxt">English</span></button>
</div>
<div class="tabs">
  <div class="cats" id="cats"></div>
  <span class="spacer"></span>
  <div class="search"><input id="q" placeholder="搜索动效名称或关键词"></div>
</div>
<div class="hero" id="hero"></div>
<div class="strip-wrap"><div class="strip" id="strip"></div></div>
<div id="sections"></div>
<dialog id="dlg">
  <div class="dlg-head"><strong id="dlgTitle"></strong><button id="dlgClose" onclick="dlg.close()">关闭</button></div>
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
const CARDS = ${JSON.stringify(cards.map(({ bodyHtml, bodyHtmlEn, ...rest }) => rest))};
const BODIES = ${JSON.stringify(Object.fromEntries(cards.map((c) => [c.slug, c.bodyHtml])))};
const BODIES_EN = ${JSON.stringify(Object.fromEntries(cards.filter((c) => c.bodyHtmlEn).map((c) => [c.slug, c.bodyHtmlEn])))};
const CATS = ${JSON.stringify(categories)};
const DEMO_BASE = "${DEMO_BASE}";
const GITHUB = "${GITHUB}";
let cat = "全部", q = "", heroSlug = null;
const picked = new Set();

const $ = (id) => document.getElementById(id);
const dlg = $("dlg");

/* ── 主题 + 语言（右上角点击切换；默认深色 + 中文，localStorage 记忆） ── */
const I18N = {
  zh: { sub: "· 口播动效库", search: "搜索动效名称或关键词", follow: "关注作者", menuH: "关注作者",
    douyin: "抖音", xhs: "小红书", x: "X", langTxt: "English",
    card: "配方卡", source: "源码", pick: "选取", close: "关闭", copy: "复制名字", copied: "已复制 ✓",
    clear: "清空", selA: "已选 ", selB: " 张", all: "全部", viewAll: "查看全部 ›",
    empty: "没有匹配的卡片", p0: "P0 高频", energy: "能量·", usage: "适用场景：", scope: "动效范围",
    hintA: " 切换动效 · ", hintB: " 选取当前 · 下方胶片条可点选",
    clickPlay: "点击播放（有声）", newChip: "NEW · 本批新增",
    prevT: "上一个（←）", nextT: "下一个（→）", themeT: "切换深/浅色", langT: "Switch to English" },
  en: { sub: "· Motion Library", search: "Search motions by name or keyword", follow: "Follow me", menuH: "Follow me on",
    douyin: "Douyin", xhs: "RedNote", x: "X", langTxt: "中文",
    card: "Recipe", source: "Source", pick: "Pick", close: "Close", copy: "Copy names", copied: "Copied ✓",
    clear: "Clear", selA: "", selB: " picked", all: "All", viewAll: "View all ›",
    empty: "No matching cards", p0: "P0 · Frequent", energy: "Energy · ", usage: "Best for: ", scope: "Scope",
    hintA: " switch · ", hintB: " pick · click the filmstrip below",
    clickPlay: "Click to play (with sound)", newChip: "NEW",
    prevT: "Previous (←)", nextT: "Next (→)", themeT: "Toggle light/dark", langT: "切换到中文" }
};
const CAT_EN = { "字幕花字": "Kinetic Type", "强调标注": "Emphasis", "数据信息图": "Data & Charts",
  "素材呈现": "Media Showcase", "转场结构": "Transitions", "人物互动": "Host & CTA", "运镜": "Camera Moves" };
const EN_ENERGY = { "高": "High", "中": "Medium", "低": "Low", "中高": "Med-High", "低中": "Low-Med" };
let LANG = "zh", THEME = "dark";
try { LANG = localStorage.getItem("vtc-lang") || "zh"; THEME = localStorage.getItem("vtc-theme") || "dark"; } catch (e) {}
const T = () => I18N[LANG];
const catLabel = (c) => LANG === "en" ? (c === "全部" ? T().all : (CAT_EN[c] || c)) : c;
const nameOf = (c) => LANG === "en" ? c.slug : c.zhName;
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
function applyTheme() {
  document.documentElement.dataset.theme = THEME;
  $("themeBtn").innerHTML = THEME === "dark" ? ICON_MOON : ICON_SUN;
}
function applyI18n() {
  const t = T();
  document.documentElement.lang = LANG === "zh" ? "zh" : "en";
  $("h1sub").textContent = t.sub;
  $("q").placeholder = t.search;
  $("followTxt").textContent = t.follow;
  $("menuH").textContent = t.menuH;
  $("fDouyinT").textContent = t.douyin; $("fXhsT").textContent = t.xhs; $("fXT").textContent = t.x;
  $("dlgClose").textContent = t.close;
  $("copySel").textContent = t.copy;
  $("clearSel").textContent = t.clear;
  $("langTxt").textContent = t.langTxt;
  $("langBtn").title = t.langT;
  $("themeBtn").title = t.themeT;
}
/* GitHub star 数：api.github.com 允许任意 origin 的 CORS，取不到就不显示计数气泡 */
fetch("https://api.github.com/repos/Vincentwei1021/video-talkcraft")
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => {
    if (j && typeof j.stargazers_count === "number") {
      const n = j.stargazers_count;
      const el = $("starCnt");
      el.textContent = n >= 1000 ? (n / 1000).toFixed(1).replace(/\\.0$/, "") + "k" : String(n);
      el.style.display = "inline-block";
    }
  }).catch(() => {});
$("themeBtn").addEventListener("click", () => {
  THEME = THEME === "dark" ? "light" : "dark";
  try { localStorage.setItem("vtc-theme", THEME); } catch (e) {}
  applyTheme();
});
$("langBtn").addEventListener("click", () => {
  LANG = LANG === "zh" ? "en" : "zh";
  try { localStorage.setItem("vtc-lang", LANG); } catch (e) {}
  applyI18n(); render();
});

/* ── 首次手势解锁：刷新后主屏不带声自动播（浏览器策略禁止），
   改为显示点击播放层；任何一次点击/按键后，后续主屏都直接自动播放（有声）。 ── */
let activated = false;
function mountHeroIframe() {
  const poster = document.querySelector(".hero-poster");
  if (!poster || !heroSlug) return;
  const f = document.createElement("iframe");
  f.src = DEMO_BASE + heroSlug + "/index.html?embed=1&controls=1";
  f.allowFullscreen = true;
  f.setAttribute("allow", "fullscreen; autoplay");
  poster.replaceWith(f);
}
["pointerdown", "keydown"].forEach((ev) =>
  window.addEventListener(ev, () => {
    if (!activated) { activated = true; mountHeroIframe(); }
  }, { capture: true }));

/* 正文按语言取：英文模式且有翻译时用 BODIES_EN，否则回退中文 */
function bodyOf(slug) {
  return (LANG === "en" && BODIES_EN[slug]) || BODIES[slug] || "";
}
/* 从配方卡正文里抠「动效范围/Scope」段（h3 标题到下一个 h3），主推区展示 */
function scopeOf(slug) {
  const m = bodyOf(slug).match(/<h3>(?:动效范围|Scope)<\\/h3>([\\s\\S]*?)(?=<h3>|$)/);
  return m ? m[1] : "";
}

function match(c) {
  if (cat !== "全部" && c.category !== cat) return false;
  if (q && !(c.slug + c.zhName + c.title + (c.titleEn || "") + c.usage + (c.usageEn || "") + c.category + (CAT_EN[c.category] || "")).toLowerCase().includes(q.toLowerCase())) return false;
  return true;
}

/* demo 自动播放：滚入挂预览（本地=活 demo iframe；Pages=release 里的 mp4），滚出卸载。
   预览不循环：播完停在开头（mp4 靠 ended 回卷；活 demo 由 demo-shell 播完回卷暂停）。 */
const PAGES = ${PAGES};
function makePreview(slug) {
  if (PAGES) {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.autoplay = true; v.preload = "auto";
    v.src = "media/" + slug + ".mp4";
    v.addEventListener("ended", () => { v.currentTime = 0; });
    v.play && v.play().catch(() => {});
    return v;
  }
  const f = document.createElement("iframe");
  f.loading = "lazy"; f.src = DEMO_BASE + slug + "/index.html?embed=1";
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
  $("selcount").textContent = T().selA + picked.size + T().selB;
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
  btn.textContent = T().copied;
  setTimeout(() => { btn.textContent = T().copy; }, 1200);
}
function togglePick(slug, on) { on ? picked.add(slug) : picked.delete(slug); syncSel(); }
function openCard(slug) { $("dlgTitle").textContent = slug; $("dlgBody").innerHTML = bodyOf(slug); dlg.showModal(); }

function renderTabs() {
  const t = $("cats"); t.innerHTML = "";
  ["全部", ...CATS].forEach((c) => {
    const el = document.createElement("span");
    el.className = "tab" + (cat === c ? " on" : ""); el.textContent = catLabel(c);
    el.onclick = () => { cat = c; render(); }; t.appendChild(el);
  });
}

function renderHero(list) {
  const h = $("hero");
  if (!list.length) { h.innerHTML = ""; return; }
  if (!list.some((c) => c.slug === heroSlug)) heroSlug = list[0].slug;
  const idx = list.findIndex((x) => x.slug === heroSlug);
  const c = list[idx];
  const scope = scopeOf(c.slug);
  // controls=1：播放/暂停、进度条、全屏都叠在视频画面内（demo-shell HUD）
  const player = activated
    ? '<iframe src="' + DEMO_BASE + c.slug + '/index.html?embed=1&controls=1" allowfullscreen allow="fullscreen; autoplay"></iframe>'
    : '<div class="hero-poster">' + (c.thumb ? '<img src="' + c.thumb + '">' : "") +
      '<div class="pp"><span class="ppbtn">▶</span><span class="pph">' + T().clickPlay + '</span></div></div>';
  h.innerHTML =
    '<div class="hero-player">' + player +
      '<button class="nav prev" onclick="stepHero(-1)" title="' + T().prevT + '">‹</button>' +
      '<button class="nav next" onclick="stepHero(1)" title="' + T().nextT + '">›</button>' +
      '<span class="pos">' + (idx + 1) + ' / ' + list.length + '</span>' +
    '</div>' +
    '<div class="hero-info">' +
      '<h2>' + nameOf(c) + '<code>' + (LANG === "en" ? c.zhName : c.slug) + '</code></h2>' +
      '<div class="hero-meta">' +
        (c.isNew ? '<span class="hchip newchip">' + T().newChip + '</span>' : "") +
        (c.priority === "P0" ? '<span class="hchip p0">' + T().p0 + '</span>' : '<span class="hchip">' + c.priority + '</span>') +
        '<span class="hchip">' + catLabel(c.category) + '</span>' +
        (c.energy ? '<span class="hchip">' + T().energy + (LANG === "en" ? (EN_ENERGY[c.energy] || c.energy) : c.energy) + '</span>' : "") +
      '</div>' +
      '<div class="hero-one">' + ((LANG === "en" && c.titleEn) || c.title) + '</div>' +
      ((LANG === "en" ? c.usageEn || c.usage : c.usage) ? '<div class="hero-usage"><b>' + T().usage + '</b>' + (LANG === "en" ? c.usageEn || c.usage : c.usage) + '</div>' : "") +
      (scope ? '<div class="hero-scope"><b>' + T().scope + '</b>' + scope + '</div>' : "") +
      '<div class="hero-act">' +
        '<button class="btn primary" onclick="openCard(\\'' + c.slug + '\\')">' + T().card + '</button>' +
        '<a class="btn" href="' + GITHUB + '/blob/main/demos/' + c.slug + '/index.html" target="_blank" rel="noopener">' + T().source + '</a>' +
        '<label class="btn"><input type="checkbox" ' + (picked.has(c.slug) ? "checked" : "") +
          ' onchange="togglePick(\\'' + c.slug + '\\', this.checked)">' + T().pick + '</label>' +
      '</div>' +
      '<div class="hero-hint"><kbd>←</kbd> <kbd>→</kbd>' + T().hintA + '<kbd>' + (LANG === "en" ? "Space" : "空格") + '</kbd>' + T().hintB + '</div>' +
    '</div>';
}

/* 胶片条：当前筛选下全部卡的缩略图横列，滚入视野即自动播放（播完停回开头），当前卡高亮 */
function renderStrip(list) {
  const s = $("strip");
  s.innerHTML = list.map((c, i) =>
    '<div class="chip-card' + (c.slug === heroSlug ? " on" : "") + '" data-slug="' + c.slug + '" onclick="setHero(\\'' + c.slug + '\\')">' +
      (c.thumb ? '<img src="' + c.thumb + '">' : "") +
      (c.isNew ? '<span class="newbadge">NEW</span>' : "") +
      '<span class="idx">' + (i + 1) + '</span>' +
      '<span class="nm">' + nameOf(c) + '</span></div>').join("");
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
  if (!list.length) { box.innerHTML = '<div class="empty">' + T().empty + '</div>'; return; }
  const cats = cat === "全部" ? CATS.filter((cc) => list.some((c) => c.category === cc)) : [cat];
  cats.forEach((cc) => {
    const items = list.filter((c) => c.category === cc);
    if (!items.length) return;
    const sec = document.createElement("div"); sec.className = "section";
    sec.innerHTML = '<div class="sec-head"><h3>' + catLabel(cc) + '</h3><div class="rule"></div>' +
      '<span class="all" data-cat="' + cc + '">' + T().viewAll + '</span></div>';
    const grid = document.createElement("div"); grid.className = "sec-grid";
    items.forEach((c) => {
      const el = document.createElement("div");
      el.className = "tile" + (picked.has(c.slug) ? " picked" : ""); el.dataset.slug = c.slug;
      el.innerHTML =
        '<div class="prev" data-slug="' + c.slug + '">' +
          (c.thumb ? '<img src="' + c.thumb + '">' : "") +
          (c.isNew ? '<span class="newbadge">NEW</span>' : "") +
          '<span class="nm">' + nameOf(c) + '</span></div>' +
        '<div class="bar"><code>' + c.slug + '</code>' +
          (c.priority === "P0" ? '<span class="tag p0">P0</span>' : "") +
          '<span class="sp"></span>' +
          '<label><input type="checkbox" ' + (picked.has(c.slug) ? "checked" : "") + '>' + T().pick + '</label>' +
          '<button data-card>' + T().card + '</button></div>';
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
  syncSel();
}

$("q").addEventListener("input", (e) => { q = e.target.value.trim(); render(); });
$("copySel").addEventListener("click", (e) => copyPicked(e.target));
$("clearSel").addEventListener("click", () => { picked.clear(); syncSel();
  document.querySelectorAll('.tile input, .hero-act input').forEach((cb) => { cb.checked = false; }); });

applyTheme();
applyI18n();
render();
</script>
</body>
</html>`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);

// Pages 版附带 SEO/GEO 基建文件：robots / sitemap / llms.txt（站点根）
if (PAGES) {
  const siteDir = dirname(outPath);
  writeFileSync(resolve(siteDir, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
  writeFileSync(resolve(siteDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`);
  writeFileSync(resolve(siteDir, "llms.txt"),
    `# video-talkcraft

> 口播视频生成 agent skill：字级配音同步、78 张动效配方卡、七层反 PPT 镜头系统，配合 Claude Code / Codex 用 Remotion 渲出高质量解说成片。
> An agent skill that turns Claude Code / Codex into a motion-design studio for narration (talking-head / explainer) videos: word-level voiceover sync, 78 motion recipe cards, a 7-layer anti-slideshow camera system, rendered with Remotion.

## Links

- Gallery (live previews of all 78 motion cards): ${SITE}
- GitHub repository: ${GITHUB}
- README (中文, default): ${GITHUB}/blob/main/README.md
- README (English): ${GITHUB}/blob/main/README_EN.md
- Agent entry point (SKILL.md): ${GITHUB}/blob/main/SKILL.md

## License

PolyForm Noncommercial 1.0.0 — free for personal / educational / research use.
Commercial use of the toolkit requires prior authorization: vincentwei1021@gmail.com.
Videos produced with the skill belong to their creators.
`);
}

console.log(`画廊已生成：${outPath}（${cards.length} 张卡${PAGES ? "，Pages 版 + robots/sitemap/llms.txt" : ""}）`);
if (problems.length) console.log("待处理：\n - " + problems.join("\n - "));
