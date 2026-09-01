// 生成静态卡片索引：src/cards/gen-index.ts（参数化卡）+ src/cards/tpl-index.ts（模板卡）。
// 之前用 import.meta.glob（Vite 专属），Remotion CLI（webpack）不认——渲染导出/Studio
// 都要走 webpack 打包，所以改为落盘静态索引，两边共用一条代码路径。
// 新增 gen 卡 / 模板卡后重跑：node scripts/gen-index.mjs（npm run dev/build/studio 已挂前置钩子）。
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

console.log(`gen-index: ${gen.length} 张参数化卡, ${tpl.length} 张模板卡`);
