import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @kbsrc = 外部口播成片工程源码（本机经 workbench/kbsrc 符号链接接入，不进库）。
// 未链接时自动落到 kbsrc-stub 降级实现：工程可构建可运行，口播拆解相关能力显示占位。
// preserveSymlinks 让 kbsrc 按虚拟路径解析，其 'react'/'remotion' 裸导入
// 落到本工程 node_modules（避免双实例）；src/kbsrc.d.ts 让 tsc 不检查外部源码。
const kbsrc = existsSync(fileURLToPath(new URL("./kbsrc", import.meta.url)))
  ? "./kbsrc"
  : "./kbsrc-stub";

export default defineConfig({
  plugins: [react()],
  server: { port: 5199 },
  resolve: {
    preserveSymlinks: true,
    alias: { "@kbsrc": fileURLToPath(new URL(kbsrc, import.meta.url)) },
  },
});
