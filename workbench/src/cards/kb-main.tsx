import React, { Suspense } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { CardDef } from "./types";
import { KB_COMP, KB_LINKED, KB_MAIN, KB_PROJECT } from "../kbMeta";
import { TOTAL_FRAMES } from "../kb/shots";

/** 接入工程的主合成，按实时代码渲染（实时看板 L1 的画面源）。
 *  - 动态 import：工程代码有语法错 / 半成品时只这张卡报错，工作台其余照常（初次载入也不会白屏）；
 *  - 两个候选入口都是契约模块（kbsrc-stub 有 Main / MainVideo 占位），webpack 导出打包不会因缺文件失败；
 *  - 画幅按 KB_COMP（Root.tsx 字面量）等比缩进工程画布：横竖屏都行。 */
type Comp = React.ComponentType<Record<string, unknown>>;

const pickMain = (m: Record<string, unknown>): Comp | null => {
  for (const k of ["Main", "MainVideo", "default"]) if (typeof m[k] === "function") return m[k] as Comp;
  return null;
};

const ErrPanel: React.FC<{ title: string; detail?: string }> = ({ title, detail }) => (
  <AbsoluteFill style={{ background: "#2a1214", color: "#ffb4ad", padding: 48, fontFamily: "-apple-system, PingFang SC, sans-serif" }}>
    <div style={{ fontSize: 34, fontWeight: 600 }}>{title}</div>
    {detail && <pre style={{ marginTop: 18, fontSize: 20, lineHeight: 1.5, whiteSpace: "pre-wrap", opacity: 0.85 }}>{detail}</pre>}
  </AbsoluteFill>
);

const errComp = (title: string, detail?: string): Comp => () => <ErrPanel title={title} detail={detail} />;

const LazyMain = React.lazy<Comp>(async (): Promise<{ default: Comp }> => {
  try {
    const mod: Record<string, unknown> = KB_MAIN === "MainVideo" ? await import("@kbsrc/MainVideo") : await import("@kbsrc/Main");
    const C = pickMain(mod);
    return { default: C ?? errComp("工程主合成没有导出 Main / MainVideo / default") };
  } catch (e) {
    // 语法错 / 引用缺失：Vite 会在控制台给出精确位置，这里只把消息摆到画面上
    const msg = e instanceof Error ? e.message : String(e);
    return { default: errComp("接入工程代码载入失败（agent 可能正在改）", msg.slice(0, 600)) };
  }
});

/** 运行期错误（渲染时抛）：getInputProps() 在 Player 里必抛，给出针对性的提示 */
class RenderBoundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.err) {
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
        <RenderBoundary>
          <Suspense fallback={<AbsoluteFill style={{ background: "#1d1d20", color: "#98989f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>载入接入工程…</AbsoluteFill>}>
            <LazyMain />
          </Suspense>
        </RenderBoundary>
      </div>
    </AbsoluteFill>
  );
};

export const kbMainCard: CardDef = {
  id: "kb-main",
  name: KB_LINKED ? `${KB_PROJECT} · 成片（实时）` : "接入工程 · 成片（实时）",
  category: "成片",
  hidden: !KB_LINKED || !KB_MAIN,
  durationInFrames: Math.max(2, TOTAL_FRAMES),
  accent: "#30d158",
  component: KbMain as React.ComponentType<Record<string, unknown>>,
  schema: [],
};
