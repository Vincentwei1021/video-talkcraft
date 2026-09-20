/** 模块级单例（2026-09-21 独立评审 P0-2 后加）。
 *
 *  接入工程的任何源码变化（agent 改 tsx / sfx.ts、overrides.json 写回）都会经 kb 适配层 → 卡注册表 → store / pipeline/store / kouboImport
 *  这些**非边界**模块传播：Vite 沿导入链把它们重新执行一遍，直到自接受的 .tsx 组件（React Fast Refresh 边界）为止。
 *  但 `import.meta.hot.dispose` 只对边界模块调用（Vite 6 client：`disposeMap.get(acceptedPath)`）——中间模块的 dispose 从未执行过：
 *  原先"dispose 时把 store 存进 hot.data、重建时接回 / 关掉旧 SSE"的写法一次都没跑过（评审实测：每轮 HMR 服务端 SSE 连接 +1、
 *  选中与撤销栈清空、键盘快捷键绑到旧 store 实例失效、旧 pipeline store 仍在收 SSE 并可能用过期数据写回 localStorage）。
 *
 *  解法：会被重执行的模块把长生命周期对象（zustand store、EventSource、定时器、订阅）挂在 globalThis 上按 key 复用——重执行只是
 *  重新绑定同一个对象；需要"最新代码 + 新鲜数据"的回调（SSE apply、syncedIfChanged、overrides 的 flush / enqueue）每次执行都覆盖注册到
 *  latest 槽，由单例连接 / 订阅在触发时取最新的那份。Remotion CLI（webpack）渲染只执行一次，单例即普通对象。 */
type Bag = Record<string, unknown>;
const bag = (): Bag => {
  const g = globalThis as typeof globalThis & { __talkcraftWb?: Bag };
  return (g.__talkcraftWb ??= {});
};

/** 按 key 复用：首次执行创建，之后的模块重执行拿到同一个对象 */
export const singleton = <T>(key: string, make: () => T): T => {
  const b = bag();
  if (!(key in b)) b[key] = make();
  return b[key] as T;
};

/** 最新实现槽：每次模块执行都覆盖，单例里的回调从这里取，才能拿到重执行后的新代码与新鲜数据 */
export const setLatest = <T>(key: string, value: T): void => {
  bag()[`latest:${key}`] = value;
};
export const getLatest = <T>(key: string): T | undefined => bag()[`latest:${key}`] as T | undefined;
