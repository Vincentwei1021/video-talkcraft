import React, { Suspense, useMemo } from "react";
import { AbsoluteFill, getRemotionEnvironment, useVideoConfig } from "remotion";
import type { CardDef } from "./types";
import { KB_COMP, KB_LINKED, KB_MAIN, KB_MAIN_FILE, KB_PROJECT } from "../kbMeta";
import { TOTAL_FRAMES } from "../kb/shots";
import { compOr } from "../kb/pick";
import { useLiveLoad } from "../kb/liveLoad";

/** 接入工程的主合成，按实时代码渲染（实时看板 L1 的画面源）。
 *  - 动态 import：工程代码有语法错 / 半成品时只这张卡报错，工作台其余照常（初次载入也不会白屏）；
 *    载入失败**不缓存**——kb/liveLoad 的 gen 变了就重建 lazy 组件再试；重试用 `/@fs/<真实路径>?t=` 直连并加时间戳，
 *    绕开浏览器 module map 对失败模块的缓存（同一 URL 第二次 import 会直接复用失败结果，不再请求）。
 *  - 两个候选入口都是契约模块（kbsrc-stub 有 Main / MainVideo 占位），webpack 导出打包不会因缺文件失败；
 *  - **离线渲染（Remotion CLI 导出）里不容错**：载入失败 / 渲染抛错原样抛出，渲染任务失败——错误画面绝不能被当成片交付
 *    （2026-09-13 审计 R3）。容错只在 Player / Studio 里。
 *  - 画幅：旧的单轨看板工程（2026-09-21 已下线，旧存档仍可能有）画布 = 工程原尺寸（KB_COMP），此时不缩放，工程内 useVideoConfig 读到的就是真值；
 *    只有把这张卡拖进别的尺寸的工程时才等比缩进画布（那时工程内 useVideoConfig 读到的是工作台画布尺寸，按尺寸算布局的层会偏，审计 R4）。 */
type Comp = React.ComponentType<Record<string, unknown>>;

const pickMain = (m: Record<string, unknown>): Comp | null => {
  for (const k of ["Main", "MainVideo", "default"]) {
    const c = compOr<Comp | null>(m[k], null); // 认 memo / forwardRef 对象，不只 typeof function
    if (c) return c;
  }
  return null;
};
const isRendering = () => getRemotionEnvironment().isRendering;

const ErrPanel: React.FC<{ title: string; detail?: string }> = ({ title, detail }) => (
  <AbsoluteFill style={{ background: "#2a1214", color: "#ffb4ad", padding: 48, fontFamily: "-apple-system, PingFang SC, sans-serif" }}>
    <div style={{ fontSize: 34, fontWeight: 600 }}>{title}</div>
    {detail && <pre style={{ marginTop: 18, fontSize: 20, lineHeight: 1.5, whiteSpace: "pre-wrap", opacity: 0.85 }}>{detail}</pre>}
  </AbsoluteFill>
);

const errComp = (title: string, detail?: string): Comp => () => <ErrPanel title={title} detail={detail} />;

/** 首次走静态 import（Vite / webpack 都能解析 `@kbsrc/*` 别名）；重试（gen > 0，只在浏览器）走 /@fs 真实路径 + 时间戳。
 *  用 Function 包一层是为了让 webpack（Remotion 导出打包）看不见这个动态 URL import。 */
const importMain = (gen: number): Promise<Record<string, unknown>> => {
  if (gen > 0 && KB_MAIN_FILE && typeof window !== "undefined") {
    const url = `/@fs${KB_MAIN_FILE}?t=${Date.now()}`;
    return (new Function("u", "return import(u)") as (u: string) => Promise<Record<string, unknown>>)(url);
  }
  return KB_MAIN === "MainVideo" ? import("@kbsrc/MainVideo") : import("@kbsrc/Main");
};

const makeLazyMain = (gen: number) =>
  React.lazy<Comp>(async (): Promise<{ default: Comp }> => {
    const ll = useLiveLoad.getState();
    try {
      const mod = await importMain(gen);
      const C = pickMain(mod);
      if (!C) throw new Error("工程主合成没有导出 Main / MainVideo / default");
      ll.setError(null);
      return { default: C };
    } catch (e) {
      if (isRendering()) throw e; // 离线渲染：原样失败，绝不把错误画面当成片
      const msg = e instanceof Error ? e.message : String(e);
      ll.setError({ message: msg.split("\n")[0].slice(0, 300) });
      return { default: errComp("接入工程代码载入失败（agent 可能正在改）", msg.slice(0, 600)) };
    }
  });

/** 运行期错误（渲染时抛）：getInputProps() 在 Player 里必抛，给出针对性的提示；离线渲染里原样抛出让任务失败 */
class RenderBoundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.err) {
      if (isRendering()) throw new Error(this.state.err);
      const hint = /getInputProps/.test(this.state.err)
        ? "工程 Main 调用了 getInputProps()——Remotion Player 不支持。改成组件 props（Composition defaultProps）传参，或用 typeof window !== 'undefined' && !window.remotion_isPlayer 之类守卫；SKILL.md ⑤-2 有说明。"
        : undefined;
      return <ErrPanel title="接入工程渲染出错" detail={[hint, this.state.err.slice(0, 500)].filter(Boolean).join("\n\n")} />;
    }
    return this.props.children;
  }
}

const KbMain: React.FC = () => {
  const { width, height } = useVideoConfig();
  const gen = useLiveLoad((s) => s.gen);
  const LazyMain = useMemo(() => makeLazyMain(gen), [gen]);
  const body = (
    <RenderBoundary key={gen}>
      <Suspense fallback={<AbsoluteFill style={{ background: "#1d1d20", color: "#98989f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>载入接入工程…</AbsoluteFill>}>
        <LazyMain />
      </Suspense>
    </RenderBoundary>
  );
  if (width === KB_COMP.width && height === KB_COMP.height) return <AbsoluteFill style={{ background: "#000" }}>{body}</AbsoluteFill>;
  const scale = Math.min(width / KB_COMP.width, height / KB_COMP.height);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
      <div
        style={{
          position: "absolute", width: KB_COMP.width, height: KB_COMP.height,
          left: (width - KB_COMP.width * scale) / 2, top: (height - KB_COMP.height * scale) / 2,
          transform: `scale(${scale})`, transformOrigin: "0 0",
        }}
      >
        {body}
      </div>
    </AbsoluteFill>
  );
};

export const kbMainCard: CardDef = {
  id: "kb-main",
  name: KB_LINKED ? `${KB_PROJECT} · 成片（实时）` : "接入工程 · 成片（实时）",
  category: "成片",
  hidden: true, // 2026-09-21 单轨"成片（实时）"已下线：素材库不再列出；旧存档里的 kb-live-main clip 仍按这张卡渲
  durationInFrames: Math.max(2, TOTAL_FRAMES),
  accent: "#30d158",
  component: KbMain as React.ComponentType<Record<string, unknown>>,
  schema: [],
};
