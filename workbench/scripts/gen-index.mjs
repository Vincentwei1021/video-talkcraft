// 生成静态索引：src/cards/gen-index.ts（参数化卡）+ src/cards/tpl-index.ts（模板卡）
//   + src/mediaManifest.ts（public/ 素材清单）+ src/kbMeta.ts（接入工程的换幕时刻表等）。
// 后两者按机器本地链接生成、不进库（.gitignore），npm install 的 prepare 钩子与 dev/build/studio 前置钩子都会跑。
// 之前用 import.meta.glob（Vite 专属），Remotion CLI（webpack）不认——渲染导出/Studio
// 都要走 webpack 打包，所以改为落盘静态索引，两边共用一条代码路径。
// 新增 gen 卡 / 模板卡后重跑：node scripts/gen-index.mjs（npm run dev/build/studio 已挂前置钩子）。
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { kbsrcMap } from "../kbsrc.map.mjs";

const wb = join(dirname(fileURLToPath(import.meta.url)), "..");
const list = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => f.replace(/\.tsx$/, ""))
    .sort();

const banner = "// 自动生成，勿手改：node scripts/gen-index.mjs\n";

const gen = list(join(wb, "src/cards/gen"));
writeFileSync(
  join(wb, "src/cards/gen-index.ts"),
  banner +
    'import type { CardDef } from "./types";\n' +
    gen.map((id, i) => `import { card as g${i} } from "./gen/${id}";`).join("\n") +
    `\n\nexport const GEN_CARDS: CardDef[] = [${gen.map((_, i) => `g${i}`).join(", ")}];\n`,
);

// @tpl 别名 → tplcards/（vite.config / remotion.config 各配一份；
// src/kbsrc.d.ts 声明 declare module "@tpl/*" 让 tsc 不检查模板正主源码）
const tpl = list(join(wb, "tplcards"));
writeFileSync(
  join(wb, "src/cards/tpl-index.ts"),
  banner +
    'import type React from "react";\n' +
    tpl.map((id, i) => `import * as t${i} from "@tpl/${id}";`).join("\n") +
    `\n\nexport type TplModule = {
  default?: React.ComponentType<Record<string, unknown>>;
  meta?: { durationInFrames?: number };
};

export const TPL_MODULES: Record<string, TplModule> = {
` +
    tpl.map((id, i) => `  "${id}": t${i} as unknown as TplModule,`).join("\n") +
    "\n};\n",
);

// —— 素材清单：扫描 public/（口播工程素材经符号链接接入；cardpreviews/cardthumbs 是画廊资产、sfx 单列）——
// 曾是手写清单（写死示例工程的 creator-*.mp4 / shots/github.png），换工程后素材库全 404（独立评审 P1）
const publicDir = join(wb, "public");
const KIND = {
  ".mp4": "video", ".webm": "video", ".mov": "video",
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image",
  ".wav": "audio", ".mp3": "audio", ".m4a": "audio", ".aac": "audio", ".ogg": "audio", ".flac": "audio",
};
const SKIP_TOP = new Set(["cardpreviews", "cardthumbs", "sfx"]);
const media = [];
const labelOf = (rel) => {
  const base = rel.split("/").pop();
  const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
  if (dir === "dh") return `数字人 ${base.replace(/\.[^.]+$/, "")}`;
  if (!dir && /\.(wav|mp3|m4a|aac|ogg|flac)$/i.test(base)) return `配音 ${base}`;
  return dir ? `${dir} ${base}` : base;
};
const walk = (dir, rel) => {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    let st;
    try { st = statSync(p); } catch { continue; }   // 断掉的符号链接：跳过（素材全是符号链接，statSync 跟随）
    if (st.isDirectory()) { if (!rel && SKIP_TOP.has(e.name)) continue; walk(p, r); }
    else { const kind = KIND[extname(e.name).toLowerCase()]; if (kind) media.push({ file: r, label: labelOf(r), kind }); }
  }
};
walk(publicDir, "");
const sfxDir = join(publicDir, "sfx");
const sfxAll = existsSync(sfxDir)
  ? readdirSync(sfxDir).filter((f) => KIND[extname(f).toLowerCase()] === "audio").sort()
  : [];
writeFileSync(
  join(wb, "src/mediaManifest.ts"),
  banner +
    "// 口播工程 public/ 素材清单：按本机 public/ 下的链接扫描生成（不进库）\n" +
    'export type MediaItem = { file: string; label: string; kind: "video" | "image" | "audio" };\n' +
    `export const MEDIA_ITEMS: MediaItem[] = ${JSON.stringify(media, null, 2)};\n\n` +
    `export const SFX_ALL: string[] = ${JSON.stringify(sfxAll, null, 2)};\n`,
);

// —— 接入工程元数据（kbsrc.map.mjs 统一解析：真实路径 + 契约模块逐个回退 stub）——
const kb = kbsrcMap(wb);
const kbLinked = kb.linked;
/** 契约模块（kbsrc-stub 里的每个文件）在接入工程里是否真有同名文件 */
const kbModules = Object.fromEntries(kb.modules.map((m) => [m.id, m.real]));
/** 拆解契约（口播成片 promo 形态）：逐镜拆解 / 数字人 / 环境 / 字幕句都吃这几个模块 */
const kbPromo = kbLinked && ["PromoScenes", "camera", "Host", "Environment", "timing"].every((id) => kbModules[id]);
/** 工程主合成入口：skill 正式工程 Main.tsx（export Main）/ promo 工程 MainVideo.tsx（export MainVideo） */
const kbMain = kbLinked
  ? ["Main", "MainVideo"].find((n) => ["tsx", "ts", "jsx", "js"].some((e) => existsSync(join(kb.realSrc, `${n}.${e}`)))) ?? null
  : null;
// 合成规格从 Root.tsx 的 <Composition … width={1920} height={1080} fps={30}> 字面量抓（横竖屏都靠它）
const kbComp = { id: "", width: 1920, height: 1080, fps: 30 };
if (kbLinked) {
  for (const f of ["Root.tsx", "Root.jsx", "root.tsx"]) {
    const p = join(kb.realSrc, f);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, "utf8");
    const num = (k) => { const m = src.match(new RegExp(`\\b${k}=\\{\\s*(\\d+)\\s*\\}`)); return m ? Number(m[1]) : null; };
    const id = src.match(/\bid=["']([^"']+)["']/);
    if (id) kbComp.id = id[1];
    for (const k of ["width", "height", "fps"]) { const v = num(k); if (v) kbComp[k] = v; }
    break;
  }
}

// 换幕时刻表（ShapeWipes 的 times 在 promo 工程 Environment.tsx 里是内联字面量，没有导出）——
// 取值优先级：工程导出 `WIPE_TIMES = [...]`（推荐）> 正则抓 `times = [...]` > beats.json 里 what 含 wipe/换幕 的 t > []
let wipeTimes = [];
let wipeSource = "none";
if (kbLinked) {
  const kbReal = kb.realSrc;
  const envFile = join(kbReal, "Environment.tsx");
  if (existsSync(envFile)) {
    const src = readFileSync(envFile, "utf8");
    const m = src.match(/WIPE_TIMES\s*=\s*\[([\d.,\s]+)\]/) || src.match(/\btimes\s*=\s*\[([\d.,\s]+)\]/);
    if (m) { wipeTimes = m[1].split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)); wipeSource = /WIPE_TIMES/.test(m[0]) ? "export" : "inline"; }
  }
  if (!wipeTimes.length) {
    const beats = join(kbReal, "..", "beats.json");
    if (existsSync(beats)) {
      try {
        const arr = JSON.parse(readFileSync(beats, "utf8"));
        const list = Array.isArray(arr) ? arr : arr.beats ?? arr.events ?? [];
        wipeTimes = list.filter((b) => /wipe|换幕/i.test(String(b.what ?? b.label ?? ""))).map((b) => Number(b.t)).filter(Number.isFinite);
        if (wipeTimes.length) wipeSource = "beats";
      } catch { /* 坏 JSON：当没有 */ }
    }
  }
  if (!wipeTimes.length && kbPromo) console.warn("gen-index: 接入工程没有可读的换幕时刻表（Environment.tsx 导出 WIPE_TIMES 或 beats.json 标 wipe）");
}
writeFileSync(
  join(wb, "src/kbMeta.ts"),
  banner +
    "// 接入的口播成片工程元数据：按本机 kbsrc 链接生成（不进库）\n" +
    `export const KB_LINKED = ${kbLinked};\n` +
    `/** 工程目录名 / 绝对路径（仅本机显示用） */\n` +
    `export const KB_PROJECT = ${JSON.stringify(kb.projectRoot ? basename(kb.projectRoot) : "")};\n` +
    `export const KB_PROJECT_ROOT = ${JSON.stringify(kb.projectRoot ?? "")};\n` +
    `/** 契约模块（kbsrc-stub 每个文件）→ 接入工程是否有同名真实文件；false 的走 stub */\n` +
    `export const KB_MODULES: Record<string, boolean> = ${JSON.stringify(kbModules)};\n` +
    `/** 拆解契约（promo 形态：PromoScenes / camera / Host / Environment / timing 全为真实文件） */\n` +
    `export const KB_PROMO = ${kbPromo};\n` +
    `/** 工程主合成模块名（Main.tsx → "Main"，MainVideo.tsx → "MainVideo"，没有则 null） */\n` +
    `export const KB_MAIN: "Main" | "MainVideo" | null = ${JSON.stringify(kbMain)};\n` +
    `/** 合成规格（Root.tsx 字面量；抓不到时 1920×1080@30） */\n` +
    `export const KB_COMP: { id: string; width: number; height: number; fps: number } = ${JSON.stringify(kbComp)};\n` +
    `/** 换幕（shape wipe）峰值时刻（秒）；来源：${wipeSource} */\n` +
    `export const WIPE_TIMES: number[] = ${JSON.stringify(wipeTimes)};\n` +
    `export const WIPE_SOURCE: "export" | "inline" | "beats" | "none" = ${JSON.stringify(wipeSource)};\n`,
);

console.log(
  `gen-index: ${gen.length} 张参数化卡, ${tpl.length} 张模板卡, ${media.length} 个素材文件 + ${sfxAll.length} 个音效, 换幕 ${wipeTimes.length} 处（${wipeSource}）` +
    (kbLinked
      ? `; 接入 ${basename(kb.projectRoot)}：真实模块 ${kb.realIds.length}/${kb.modules.length}（${kb.realIds.join(" ") || "无"}）${kbPromo ? "，拆解契约 OK" : "，非拆解契约形态（拆解导入不可用，其余照常）"}${kbMain ? `，主合成 ${kbMain}` : "，无 Main/MainVideo"}，${kbComp.width}×${kbComp.height}@${kbComp.fps}`
      : "; 未链接口播工程（kbsrc-stub 降级）"),
);
