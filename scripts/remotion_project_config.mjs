// 让 Node API 渲染脚本（render_shots.mjs / render_stills.mjs）也吃到工程自己的 remotion.config.ts。
//
// 为什么需要：Remotion 的 bundle()/renderMedia() 只是库函数，不读 remotion.config.ts——配置文件只有 CLI
// 在启动时执行。直接 bundle({entryPoint}) 等于把工程的 webpack alias / publicDir / 缓存开关全部丢掉：
// 用了 alias 的工程（如本仓库 workbench 的 @kbsrc、@tpl）在 bundle 阶段就 "Can't resolve" 退出（独立评审 P1，
// 2026-09-02 实测复现）。这里照 CLI 自己的做法：CliInternals.loadConfig 执行配置文件，再从 ConfigInternals
// 取出各覆盖项传给 bundle()。CliInternals/ConfigInternals 是 @remotion/cli 的内部导出（有版本风险），
// 所以全部按"缺就降级 + 明确告警"处理，绝不静默。
//
// 用法：const bundleOpts = await loadProjectBundleOptions(require, projDir);
//       const serveUrl = await bundle({entryPoint, ...bundleOpts, onProgress: () => {}});
// require 必须是 createRequire(工程/package.json) 得到的——模块要从工程自己的 node_modules 解析，
// 这样配置文件里 `import {Config} from '@remotion/cli/config'` 与这里读到的是同一个模块实例。
import fs from 'node:fs';
import path from 'node:path';

export const loadProjectBundleOptions = async (require, projDir) => {
  let cli;
  let config;
  try {
    cli = require('@remotion/cli');
    config = require('@remotion/cli/config');
  } catch {
    console.warn('WARN: 工程未安装 @remotion/cli，跳过 remotion.config.ts——webpack alias / publicDir 等配置不会生效');
    return {rootDir: projDir};
  }
  const loadConfig = cli.CliInternals?.loadConfig;
  const ci = config.ConfigInternals;
  if (typeof loadConfig !== 'function' || !ci?.getWebpackOverrideFn) {
    console.warn('WARN: 当前 @remotion/cli 版本未暴露 loadConfig/ConfigInternals，跳过 remotion.config.ts');
    return {rootDir: projDir};
  }

  // 找不到 remotion.config.{ts,js} 时返回 null（不是错误）；配置文件本身出错时 CLI 会打印错误并 exit(1)
  const configFile = await loadConfig(projDir);
  console.log(configFile ? `config ${path.relative(projDir, configFile)}` : 'config （工程无 remotion.config.ts，用 Remotion 默认打包配置）');

  const opts = {
    rootDir: projDir,
    webpackOverride: ci.getWebpackOverrideFn(),
    enableCaching: ci.getWebpackCaching ? ci.getWebpackCaching() : true,
  };
  if (ci.getBundlerOverrideFn) opts.bundlerOverride = ci.getBundlerOverrideFn();
  if (ci.getRspackOverrideFn) opts.rspackOverride = ci.getRspackOverrideFn();

  // Config.setPublicDir(...) 存在 renderer 的 option 表里；commandLine 传空对象 = 只认配置文件、不认命令行 flag
  try {
    const {BrowserSafeApis} = require('@remotion/renderer/client');
    const publicDir = BrowserSafeApis?.options?.publicDirOption?.getValue({commandLine: {}})?.value;
    if (publicDir) opts.publicDir = publicDir;
  } catch {
    /* 老版本没有 renderer/client 子路径：publicDir 用默认 public/ */
  }
  return opts;
};

// 渲染侧配置：Config.setBrowserExecutable / setChromiumOpenGlRenderer / setChromeMode 同样只有 CLI 读。
// 这里从 renderer 的 option 表取出来给 renderMedia / renderStill / openBrowser；没设的不传（用 Remotion 默认）。
// 必须在 loadProjectBundleOptions（执行配置文件）之后调用。
// 注意：Remotion 没装浏览器时会自动下载 Chrome Headless Shell（~95MB，需联网）；离线机器先
// `npx remotion browser ensure`，或在 remotion.config.ts 里 Config.setBrowserExecutable 指向本机 Chrome。
export const projectRenderOptions = (require) => {
  const out = {};
  try {
    const {BrowserSafeApis} = require('@remotion/renderer/client');
    const o = BrowserSafeApis?.options ?? {};
    const get = (k) => o[k]?.getValue?.({commandLine: {}}) ?? null;
    const exe = get('browserExecutableOption')?.value;
    if (exe) out.browserExecutable = exe;
    const gl = get('glOption')?.value;
    if (gl) out.chromiumOptions = {gl};
    const mode = get('chromeModeOption');
    if (mode && mode.source !== 'default' && mode.value) out.chromeMode = mode.value;
  } catch {
    /* 老版本没有 renderer/client 子路径：全用默认 */
  }
  return out;
};

// --props 三种写法：内联 JSON / @file.json / 直接给 .json 路径（相对工程目录）。
// 需要 inputProps 的合成（如工作台 Main 吃工程 JSON）没有它根本渲不出正确内容。
export const parseInputProps = (raw, baseDir) => {
  if (!raw) return {};
  let text = raw;
  if (raw.startsWith('@')) text = fs.readFileSync(path.resolve(baseDir, raw.slice(1)), 'utf8');
  else if (/\.json$/i.test(raw) && fs.existsSync(path.resolve(baseDir, raw))) text = fs.readFileSync(path.resolve(baseDir, raw), 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`--props 不是合法 JSON（支持 内联 JSON / @file.json / file.json）：${e.message}`);
    process.exit(2);
  }
};
