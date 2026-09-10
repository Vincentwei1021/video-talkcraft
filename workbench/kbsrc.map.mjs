// kbsrc 解析地图：外部口播工程（workbench/kbsrc 符号链接）如何接进工作台。
//
// 2026-09-10 test04 实测两层故障：① 链接按虚拟路径解析（symlinks:false / preserveSymlinks），
// 工程 src/ 里引 `../shots.json`（src 之外）落到 workbench/ 下不存在的路径 → Vite 整页 500、
// Remotion 导出 bundling 失败；② 工作台的 kbsrc 契约是口播成片（promo）工程的模块形态
// （camera / Environment / Host / PromoScenes / timing / longtake …），skill 正式产出的工程
// 没有这些文件 → "Failed to resolve import" 同样整页挂。
//
// 解法（vite.config.ts / remotion.config.ts / scripts/gen-index.mjs 三处共用本文件）：
// - `@kbsrc` 指向**真实路径**（realpath），工程内相对引用（含 src 之外的 JSON）原样成立；
//   react / react-dom / remotion 由各自打包器去重到本工程 node_modules（Vite resolve.dedupe，
//   webpack 走 Remotion 自带的 react / remotion alias）。
// - **逐模块回退**：kbsrc-stub/ 里的每个文件就是一条契约；接入工程有同名文件用真实的，
//   没有就回退到 stub——缺一个模块只影响那张卡，不再拖垮整页。
// - 导出形态差异（有文件但缺某个导出）在 src/kb/*.ts 适配层兜底，这里只管"文件级"解析。
import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

const EXTS = [".tsx", ".ts", ".jsx", ".js", ".mjs"];

/** @param {string} root workbench 目录绝对路径 */
export const kbsrcMap = (root) => {
  const link = path.join(root, "kbsrc");
  const stubDir = path.join(root, "kbsrc-stub");
  let realSrc = null;
  if (existsSync(link)) {
    try {
      const r = realpathSync(link);
      if (statSync(r).isDirectory()) realSrc = r;
    } catch {
      realSrc = null; // 断掉的链接：当未链接
    }
  }
  const linked = realSrc !== null;

  // 契约模块 = stub 目录里的每个源文件（递归），id 为不带扩展名的相对路径（如 "camera"、"cards/pencil-sketch-draw"）
  const contract = [];
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith(".")) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else {
        const ext = path.extname(e.name);
        if (EXTS.includes(ext)) contract.push({ id: r.slice(0, -ext.length), stub: path.join(dir, e.name) });
      }
    }
  };
  walk(stubDir, "");

  const findReal = (id) => {
    if (!realSrc) return null;
    for (const ext of EXTS) {
      const f = path.join(realSrc, id + ext);
      if (existsSync(f)) return f;
    }
    for (const ext of EXTS) {
      const f = path.join(realSrc, id, "index" + ext);
      if (existsSync(f)) return f;
    }
    return null;
  };

  // 长 id 在前：别名匹配按顺序取第一条命中（"cards/x" 必须先于 "cards"）
  const modules = contract
    .map((m) => {
      const real = findReal(m.id);
      return { id: m.id, real: real !== null, file: real ?? m.stub };
    })
    .sort((a, b) => b.id.length - a.id.length || a.id.localeCompare(b.id));

  const srcDir = realSrc ?? stubDir;
  // 约定链接目标是 <工程>/remotion/src；remotionDir = <工程>/remotion，projectRoot = <工程>
  const remotionDir = realSrc ? path.dirname(realSrc) : null;
  const projectRoot = remotionDir ? path.dirname(remotionDir) : null;

  return {
    linked,
    realSrc,
    srcDir,
    stubDir,
    remotionDir,
    projectRoot,
    modules,
    /** 有此文件（真实）的契约模块 id 集合 */
    realIds: modules.filter((m) => m.real).map((m) => m.id),
    /** Vite resolve.alias（数组形式，顺序即优先级；末条为兜底前缀） */
    viteAlias: [
      ...modules.map((m) => ({ find: `@kbsrc/${m.id}`, replacement: m.file })),
      { find: "@kbsrc", replacement: srcDir },
    ],
    /** webpack resolve.alias（`$` 结尾为精确匹配；对象键序即优先级） */
    webpackAlias: Object.fromEntries([
      ...modules.map((m) => [`@kbsrc/${m.id}$`, m.file]),
      ["@kbsrc", srcDir],
    ]),
  };
};
