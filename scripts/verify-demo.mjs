#!/usr/bin/env node
// 验证 demo 是否可运行：无控制台错误、资源加载成功、动画确实在动。
// 用法：node scripts/verify-demo.mjs [slug ...]   （不传参 = 验证 demos/ 下全部）
// 截图存到 tools/.verify/<slug>-t0.png / -t1.png，结果打印 JSON 行，全部通过退出码 0。
import { chromium } from "playwright";
import { readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const demosDir = resolve(root, "demos");
const outDir = resolve(root, "tools", ".verify");
mkdirSync(outDir, { recursive: true });

const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(demosDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
      .map((d) => d.name);

const browser = await chromium.launch();
let failures = 0;

for (const slug of slugs) {
  const htmlPath = resolve(demosDir, slug, "index.html");
  const result = { slug, ok: false, errors: [], warnings: [] };
  if (!existsSync(htmlPath)) {
    result.errors.push("index.html 不存在");
    console.log(JSON.stringify(result));
    failures++;
    continue;
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("console", (m) => {
    if (m.type() === "error") result.errors.push(`console: ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => result.errors.push(`pageerror: ${String(e).slice(0, 300)}`));
  page.on("requestfailed", (r) => result.errors.push(`request failed: ${r.url().slice(0, 200)}`));

  try {
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load", timeout: 15000 });
    await page.waitForTimeout(600);

    const stageInfo = await page.evaluate(() => {
      const s = document.getElementById("stage");
      if (!s) return null;
      const r = s.getBoundingClientRect();
      return { w: r.width, h: r.height, children: s.childElementCount };
    });
    if (!stageInfo) result.errors.push("缺少 #stage 元素");
    else if (stageInfo.children === 0) result.warnings.push("#stage 无子元素");

    // 人物左右截断/贴边检查（2026-08-25 用户定版）：数字人不许被左右画框切掉，也不许贴着左右边框。
    // 判定对象 = 每个 video.dh-host 的可视矩形（与其 overflow hidden 祖先求交）。
    // 底边贴边是常态（人从画面底部长出来），只查左右。特写/有意裁剪在容器上标 data-crop-ok 豁免。
    // t0 与 t1 各采样一次（入场动画里人物可能移动），结果去重。
    const checkHost = () => page.evaluate(() => {
      const stage = document.getElementById("stage");
      if (!stage) return [];
      const sr = stage.getBoundingClientRect();
      const MARGIN = 8; // 与左右边框的最小间距 px（0 = 贴边）
      const issues = [];
      document.querySelectorAll("video.dh-host").forEach((v, i) => {
        if (v.closest("[data-crop-ok]")) return;
        let r = v.getBoundingClientRect();
        if (r.width === 0) return; // 视频没加载出来（退回剪影），不误报
        // 与所有 overflow hidden 祖先求交 → 实际可视矩形
        let clip = { left: sr.left, right: sr.right };
        for (let el = v.parentElement; el && el !== stage.parentElement; el = el.parentElement) {
          const o = getComputedStyle(el).overflow;
          if (o === "hidden" || o === "clip") {
            const cr = el.getBoundingClientRect();
            clip.left = Math.max(clip.left, cr.left);
            clip.right = Math.min(clip.right, cr.right);
          }
        }
        const cutL = clip.left - r.left;   // >0 = 左边被切掉这么多 px
        const cutR = r.right - clip.right; // >0 = 右边被切掉这么多 px
        if (cutL > 2) issues.push(`人物#${i} 左侧被截断 ${Math.round(cutL)}px`);
        else if (r.left - sr.left < MARGIN) issues.push(`人物#${i} 贴左边框（间距 ${Math.round(r.left - sr.left)}px）`);
        if (cutR > 2) issues.push(`人物#${i} 右侧被截断 ${Math.round(cutR)}px`);
        else if (sr.right - r.right < MARGIN) issues.push(`人物#${i} 贴右边框（间距 ${Math.round(sr.right - r.right)}px）`);
      });
      return issues;
    });
    const hostIssues = new Set(await checkHost());

    const shot0 = await page.screenshot({ path: resolve(outDir, `${slug}-t0.png`) });
    await page.waitForTimeout(1400);
    (await checkHost()).forEach((x) => hostIssues.add(x));
    result.warnings.push(...hostIssues);
    const shot1 = await page.screenshot({ path: resolve(outDir, `${slug}-t1.png`) });
    if (shot0.equals(shot1)) {
      // 动画可能已在 2s 内播完并静止 —— 点重播再抓一次
      const replay = await page.$(".demo-hud .hud-replay");
      if (replay) {
        await replay.click();
        await page.waitForTimeout(300);
        const shot2 = await page.screenshot({ path: resolve(outDir, `${slug}-t2.png`) });
        if (shot1.equals(shot2)) result.warnings.push("两次截图完全相同，画面疑似没有动");
      } else {
        result.warnings.push("画面无变化且找不到重播按钮");
      }
    }
  } catch (e) {
    result.errors.push(`load: ${String(e).slice(0, 300)}`);
  }

  await page.close();
  result.ok = result.errors.length === 0;
  if (!result.ok) failures++;
  console.log(JSON.stringify(result));
}

await browser.close();
process.exit(failures ? 1 : 0);
