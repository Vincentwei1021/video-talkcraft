#!/usr/bin/env node
// 定点截帧：把 demo 的时钟冻在指定时刻上截图，用来验收**瞬时判据**——
// 交互卡的"点击那一帧光标压在按钮上"、morph 的中间态、diff 行刚蹦出的那一刻。
// verify-demo.mjs 的 t0/t1 两帧是随机撞上的时刻，抓不住这类 bug（x-follow-card
// 的"鼠标没点到关注上"就是这么漏过去的）。
//
// 用法：node scripts/shot-at.mjs <slug> <t> [t ...]        # seek 到各时刻（默认）
//       node scripts/shot-at.mjs <slug> --play <t> [t ...] # 顺序播放到各时刻
// 输出：tools/.verify/<slug>-at<t>.png（--play 时是 -play<t>.png）
//
// 两种模式的区别：seek 快，但多条 tween 共写同一个对象时渲染次序不保证
// （GSAP 的 seek 不重放中间帧），收尾状态可能看着"没到位"；此时用 --play 复核，
// 那才是观众真正看到的画面。
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync, mkdirSync } from "node:fs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const play = args.includes("--play");
const [slug, ...rest] = args.filter((a) => a !== "--play");
const times = rest.map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);

if (!slug || !times.length) {
  console.error("用法：node scripts/shot-at.mjs <slug> [--play] <t> [t ...]");
  process.exit(2);
}
const htmlPath = resolve(root, "demos", slug, "index.html");
if (!existsSync(htmlPath)) {
  console.error(`demos/${slug}/index.html 不存在`);
  process.exit(2);
}
const outDir = resolve(root, "tools", ".verify");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load", timeout: 15000 });
await page.waitForTimeout(800);

// 注意：evaluate 传函数 + 参数在本项目的 playwright 版本上会挂住，一律用字符串表达式。
if (!play) await page.evaluate("(function(){window.gsap.globalTimeline.pause();return 1;})()");

let prev = 0;
for (const t of times) {
  if (play) {
    await page.waitForTimeout(Math.max(0, (t - prev) * 1000));
    prev = t;
  } else {
    // 首播 runStart ≈ 0，所以 globalTimeline.time() 就是 demo 秒，不加偏移
    await page.evaluate(`(function(){window.gsap.globalTimeline.time(${t});return 1;})()`);
    await page.waitForTimeout(180);
  }
  const clock = await page.evaluate("(function(){return window.gsap.globalTimeline.time();})()");
  const tag = String(t).replace(".", "_");
  const file = resolve(outDir, `${slug}-${play ? "play" : "at"}${tag}.png`);
  await page.screenshot({ path: file, animations: "allow", timeout: 8000 });
  console.log(`t=${t} (clock=${Number(clock).toFixed(2)}) → tools/.verify/${slug}-${play ? "play" : "at"}${tag}.png`);
}
if (errors.length) console.error("页面错误：" + JSON.stringify(errors));
await browser.close();
process.exit(errors.length ? 1 : 0);
