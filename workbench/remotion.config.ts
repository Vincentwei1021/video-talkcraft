// Remotion CLI（Studio / 渲染导出）打包配置：与 vite.config.ts 的 @kbsrc 策略保持一致（kbsrc.map.mjs）。
// - @kbsrc 指向接入工程的真实路径，契约模块缺失时逐个回退 kbsrc-stub（不再因一个缺文件整包失败）；
// - symlinks:false 只为 tplcards（→ ../template/cards）保留：模板源码的裸导入落回本工程 node_modules；
// - react / react/jsx-runtime / remotion 的去重 Remotion 自带（shared-bundler-config alias），这里补 react-dom。
import path from "node:path";
import { Config } from "@remotion/cli/config";
import { kbsrcMap } from "./kbsrc.map.mjs";

const root = process.cwd();
const kb = kbsrcMap(root);

Config.overrideWebpackConfig((c) => ({
  ...c,
  resolve: {
    ...c.resolve,
    symlinks: false,
    alias: {
      ...(c.resolve?.alias ?? {}),
      "react-dom": path.resolve(root, "node_modules", "react-dom"),
      ...kb.webpackAlias,
      "@tpl": path.resolve(root, "tplcards"),
    },
  },
}));

Config.setOverwriteOutput(true);
// 交付渲染一律单并发：多 tab 并发渲染的光栅不一致会造成静态区"随音乐抖"（2026-08-31 定版）
Config.setConcurrency(1);
