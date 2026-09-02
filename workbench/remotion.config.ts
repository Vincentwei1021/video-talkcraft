// Remotion CLI（Studio / 渲染导出）打包配置：与 vite.config.ts 的 @kbsrc 策略保持一致。
// 未链接外部口播工程时自动落到 kbsrc-stub 降级实现；symlinks:false 让符号链接按
// 虚拟路径解析，裸导入落回本工程 node_modules（避免 react/remotion 双实例）。
import { existsSync } from "node:fs";
import path from "node:path";
import { Config } from "@remotion/cli/config";

const kbsrc = path.resolve(
  process.cwd(),
  existsSync(path.resolve(process.cwd(), "kbsrc")) ? "kbsrc" : "kbsrc-stub",
);

Config.overrideWebpackConfig((c) => ({
  ...c,
  resolve: {
    ...c.resolve,
    symlinks: false,
    alias: {
      ...(c.resolve?.alias ?? {}),
      "@kbsrc": kbsrc,
      "@tpl": path.resolve(process.cwd(), "tplcards"),
    },
  },
}));

Config.setOverwriteOutput(true);
// 交付渲染一律单并发：多 tab 并发渲染的光栅不一致会造成静态区"随音乐抖"（2026-08-31 定版）
Config.setConcurrency(1);
