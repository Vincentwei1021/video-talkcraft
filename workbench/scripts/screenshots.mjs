#!/usr/bin/env node
// 工作台文档截图：对正在运行的 dev server 截 GUIDE.md 用的各区域图。
//
// 用法：先 `npm run dev`（默认 5199），再
//   node scripts/screenshots.mjs [--url http://localhost:5199] [--out docs/img] [--no-export]
// 依赖仓库根目录的 playwright（`npm i` 于仓库根）。用独立浏览器上下文，不碰你浏览器里的工程状态；
// --no-export 跳过"导出成片"那两张（导出会真的渲一遍演示工程，~1 分钟，产物随后删除）。
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const wb = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(wb, "..", "package.json"));
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const URL = opt("url", "http://localhost:5199");
const OUT = resolve(wb, opt("out", "docs/img"));
const DO_EXPORT = !args.includes("--no-export");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
// 面板尺寸调宽一点，截图可读；用独立 localStorage，不影响你的浏览器
await ctx.addInitScript(() => {   // 只在首访设默认，后面脚本自己改的尺寸（如拉高时间轨）reload 后要保留
  for (const [k, v] of [["wb-lib-w", "300"], ["wb-insp-w", "340"], ["wb-tl-h", "300"]]) {
    if (localStorage.getItem(k) === null) localStorage.setItem(k, v);
  }
});
const page = await ctx.newPage();
const shot = async (name, locator) => {
  const p = join(OUT, `${name}.png`);
  await (locator ? locator.screenshot({ path: p }) : page.screenshot({ path: p }));
  console.log(p);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(URL, { waitUntil: "load" });   // 缩略图循环视频常驻请求，等不到 networkidle
await page.locator(".timeline .clip").first().waitFor({ timeout: 30_000 });
await page.getByTitle("缩放到适配全部内容").click();
await sleep(1200);   // 素材库缩略图与 Player 首帧就位
for (let i = 0; i < 18; i++) await page.keyboard.press("Shift+ArrowRight");   // 播放头挪到 6s，预览区有内容
await sleep(800);

// 01 总览（演示工程）
await shot("01-overview");

// 02–05 素材库四 tab
for (const [tab, name] of [["素材", "02-library-media"], ["动效库", "03-library-cards"], ["音效", "04-library-sfx"], ["背景", "05-library-bg"]]) {
  await page.locator(".lib-tab", { hasText: tab }).click();
  await sleep(900);
  await shot(name, page.locator(".library"));
  if (tab === "动效库") {   // 分类默认折叠：展开第一类，露出缩略图网格
    await page.locator(".lib-cat-toggle").first().click();
    await sleep(1500);
    await shot("03b-library-cards-open", page.locator(".library"));
    await page.locator(".lib-cat-toggle").first().click();
  }
}

// 06 点击素材 → 预览区显示"素材预览"（有链接口播工程时是实拍/数字人，没有则是演示卡）
await page.locator(".lib-tab", { hasText: "素材" }).click();
await sleep(400);
const mediaCell = page.locator(".lib-grid .lib-cell").first();
if (await mediaCell.count()) {
  await mediaCell.click();
  await sleep(1200);
  await shot("06-media-preview", page.locator(".preview-panel"));
  await page.getByRole("button", { name: /返回工程/ }).click();   // 素材预览态没有播控条，先退回工程预览
  await sleep(400);
}

// 07 选中片段 → 属性面板（内容与样式 / 时间与变速 / 图层）
await page.locator(".timeline .clip").first().click();
await sleep(500);
await shot("07-inspector", page.locator(".inspector"));
await page.locator(".inspector-scroll").evaluate((el) => { el.scrollTop = el.scrollHeight; });   // 下半：时间与变速 / 图层
await sleep(300);
await shot("07b-inspector-time-layer", page.locator(".inspector"));

// 08 时间轨（播放头在 6s，选中片段高亮）
await sleep(300);
await shot("08-timeline", page.locator(".timeline"));

// 09 预览区 + 播控条（回到工程预览）
await page.getByTitle("回到开头").click();
for (let i = 0; i < 24; i++) await page.keyboard.press("Shift+ArrowRight");   // 8s：数字重音标题在画
await sleep(600);
await shot("09-preview-transport", page.locator(".preview-panel"));

// 10 导出成片（真的渲一遍演示工程；产物随后删掉）
if (DO_EXPORT) {
  const before = new Set(existsSync(join(wb, "exports")) ? readdirSync(join(wb, "exports")) : []);
  await page.getByRole("button", { name: "导出成片" }).click();
  const t0 = Date.now();
  let progressShot = false;
  while (Date.now() - t0 < 300_000) {
    await sleep(1000);
    const txt = await page.locator(".topbar").innerText();
    if (!progressShot && /导出中 [1-9]\d*%/.test(txt)) { await shot("10-export-running", page.locator(".topbar")); progressShot = true; }
    if (/已导出/.test(txt)) { await shot("11-export-done", page.locator(".topbar")); break; }
    if (/导出失败/.test(txt)) { console.warn("导出失败：", txt); break; }
  }
  // 清掉本次产物（只删新出现的 mp4）
  for (const f of readdirSync(join(wb, "exports"))) {
    if (!before.has(f) && f.endsWith(".mp4") && statSync(join(wb, "exports", f)).mtimeMs > t0) rmSync(join(wb, "exports", f));
  }
}

// 12 口播成片拆解导入（需链接口播工程；未链接时是占位镜头，同样能演示多轨结构）
await page.evaluate(() => localStorage.setItem("wb-tl-h", "520"));   // 时间轨拉高，七条轨全露出
await page.reload({ waitUntil: "load" });
await page.locator(".timeline .clip").first().waitFor({ timeout: 30_000 });
await page.locator(".lib-tab", { hasText: "素材" }).click();
await page.getByRole("button", { name: /拆解导入/ }).click();
await page.locator(".timeline .clip").first().waitFor();
await page.getByTitle("缩放到适配全部内容").click();
await sleep(1500);
await shot("12-koubo-import");
await page.locator(".timeline .clip").first().click();
await sleep(500);
await shot("13-koubo-timeline", page.locator(".timeline"));

await browser.close();
console.log("done");
