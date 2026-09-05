#!/usr/bin/env node
// 定点截帧：把 demo 的时钟冻在指定时刻上截图，用来验收**瞬时判据**——
// 交互卡的"点击那一帧光标压在按钮上"、morph 的中间态、diff 行刚蹦出的那一刻。
// verify-demo.mjs 的 t0/t1 两帧是随机撞上的时刻，抓不住这类 bug（x-follow-card
// 的"鼠标没点到关注上"就是这么漏过去的）。
//
// 用法：node scripts/shot-at.mjs <slug> <t> [t ...]        # seek 到各时刻（默认）
//       node scripts/shot-at.mjs <slug> --play <t> [t ...] # 重播后顺序播放到各时刻
// 输出：tools/.verify/<slug>-at<t>.png（--play 时是 -play<t>.png）
//
// 时钟口径（2026-09-06 修）：两种模式的 t 都是 **demo 秒**（本次 run 内、speed=1）。
// demo-shell 先加载音效再起跑，run 起点 runStart 不在 globalTimeline 的 0 上——
// 旧版 seek 直接 `globalTimeline.time(t)`、play 直接按墙钟 sleep，两边各差 0.05~0.8s。
// 现在 seek 走 `DemoShell.seek(t)`（减掉 runStart、且不抑制回调——.call()/onUpdate 驱动的
// demo 中间态也刷新），play 走 `DemoShell.replay()` 后轮询 `DemoShell.getTime()` 到 t 再截。
//
// 两种模式的区别：seek 快；--play 是观众真正看到的画面（多条 tween 共写一个对象时
// seek 的渲染次序不保证，收尾状态看着"没到位"时用 --play 复核）。
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

// 注意：evaluate 传函数 + 参数在本项目的 playwright 版本上会挂住，一律用字符串表达式。
// 等 demo-shell 起跑（音效表加载完 run() 才执行，runs 计数 ≥1 才有 runStart）
await page.waitForFunction("document.body && document.body.dataset.runs && window.DemoShell", null, { timeout: 8000 }).catch(() => {});
const demoTime = () => page.evaluate("(function(){return window.DemoShell ? window.DemoShell.getTime() : window.gsap.globalTimeline.time();})()");

if (play) {
  // 从头重播，起点即 demo 0 秒；之后按 demo 时钟等，不按墙钟猜
  await page.evaluate("(function(){window.DemoShell.replay();return 1;})()");
} else {
  await page.evaluate("(function(){window.gsap.globalTimeline.pause();return 1;})()");
}

for (const t of times) {
  if (play) {
    const deadline = Date.now() + (t + 6) * 1000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const now = Number(await demoTime());
      if (now >= t || Date.now() > deadline) break;
      await page.waitForTimeout(Math.min(40, Math.max(5, (t - now) * 1000)));
    }
  } else {
    // DemoShell.seek 已减 runStart，且以 suppressEvents=false 渲染——中途的 .call()/onUpdate 都会执行
    await page.evaluate(`(function(){window.DemoShell.seek(${t});return 1;})()`);
    await page.waitForTimeout(180);
  }
  const clock = Number(await demoTime());
  const tag = String(t).replace(".", "_");
  const file = resolve(outDir, `${slug}-${play ? "play" : "at"}${tag}.png`);
  await page.screenshot({ path: file, animations: "allow", timeout: 8000 });
  console.log(`t=${t} (clock=${clock.toFixed(2)}) → tools/.verify/${slug}-${play ? "play" : "at"}${tag}.png`);
}
if (errors.length) console.error("页面错误：" + JSON.stringify(errors));
await browser.close();
process.exit(errors.length ? 1 : 0);
