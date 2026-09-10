import React, { useEffect, useRef, useState } from "react";
import { LibraryPanel } from "./panels/LibraryPanel";
import { Inspector } from "./panels/Inspector";
import { PreviewPanel } from "./preview/PreviewPanel";
import { Timeline } from "./timeline/Timeline";
import { resetProject, useStore } from "./store";
import { seekTo, togglePlay } from "./playerRef";
import type { ProjectData } from "./types";
import { revealExport, startExport, useExportStore } from "./exportJob";

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 面板尺寸：可拖拽调整，落 localStorage */
const usePanelSize = (key: string, def: number) => {
  const [v, setV] = useState<number>(() => {
    const s = localStorage.getItem(key);
    return s ? Number(s) : def;
  });
  useEffect(() => {
    localStorage.setItem(key, String(v));
  }, [key, v]);
  return [v, setV] as const;
};

/** 拖拽分隔条：pointerdown 后跟踪位移，交给回调换算尺寸 */
const startSplit = (
  e: React.PointerEvent,
  onMove: (dx: number, dy: number) => void,
) => {
  e.preventDefault();
  const sx = e.clientX;
  const sy = e.clientY;
  const mm = (ev: PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy);
  const up = () => window.removeEventListener("pointermove", mm);
  window.addEventListener("pointermove", mm);
  window.addEventListener("pointerup", up, { once: true });
};

/** 导出成片：提交当前工程给 dev server 的 Remotion 渲染任务，轮询进度（任务状态在 exportJob store，与右键透明导出共用） */
const ExportButton: React.FC = () => {
  const job = useExportStore((s) => s.job);
  const mine = job?.kind === "full" ? job : null;
  const start = () => {
    const project = useStore.getState().project;
    void startExport({ project }, "full", project.name || "工程");
  };

  if (job?.status === "running" && !mine)
    return (
      <button className="btn primary" disabled title="右键导出的透明片段正在渲染，完成后再导整片">
        导出成片
      </button>
    );
  if (mine?.status === "running")
    return (
      <button className="btn primary" disabled>
        导出中 {Math.round(mine.progress * 100)}%
      </button>
    );
  if (mine?.status === "done")
    return (
      <>
        <button
          className="btn"
          title="在 Finder 中显示导出的 MP4"
          onClick={() => void revealExport(mine.id)}
        >
          ✓ 已导出 · 显示文件
        </button>
        <button className="btn primary" onClick={start}>
          再次导出
        </button>
      </>
    );
  if (mine?.status === "error")
    return (
      <button className="btn danger" title={mine.lastLine} onClick={start}>
        导出失败 · 重试
      </button>
    );
  return (
    <button
      className="btn primary"
      title="用 Remotion 渲染当前工程为 MP4（单并发保画质，输出到 workbench/exports/）"
      onClick={start}
    >
      导出成片
    </button>
  );
};

/** 右键「导出透明通道」的进度浮层（右下角）：完成后可在 Finder 显示，可关闭 */
const ExportToast: React.FC = () => {
  const job = useExportStore((s) => s.job);
  const setJob = useExportStore((s) => s.setJob);
  if (!job || job.kind !== "alpha") return null;
  return (
    <div className="export-toast" role="status">
      <span className="toast-title" title={job.title}>
        {job.status === "running" ? "⏳ " : job.status === "done" ? "✓ " : "✕ "}
        {job.title}
      </span>
      {job.status === "running" && (
        <>
          <span className="bar">
            <i style={{ width: `${Math.round(job.progress * 100)}%` }} />
          </span>
          <span className="dim">{Math.round(job.progress * 100)}%</span>
        </>
      )}
      {job.status === "done" && (
        <button className="btn" onClick={() => void revealExport(job.id)} title={job.output}>
          显示文件
        </button>
      )}
      {job.status === "error" && (
        <span className="dim" title={job.lastLine}>
          失败：{(job.lastLine ?? "").slice(0, 60)}
        </span>
      )}
      {job.status !== "running" && (
        <button className="mini" title="关闭" onClick={() => setJob(null)}>
          ✕
        </button>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  const project = useStore((s) => s.project);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const updateName = (name: string) =>
    useStore.setState((s) => ({ project: { ...s.project, name } }));
  const fileRef = useRef<HTMLInputElement>(null);
  const [libW, setLibW] = usePanelSize("wb-lib-w", 224);
  const [inspW, setInspW] = usePanelSize("wb-insp-w", 300);
  const [tlH, setTlH] = usePanelSize("wb-tl-h", 264);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const s = useStore.getState();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if (s.selectedClipId) s.removeClip(s.selectedClipId);
      } else if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        if (s.selectedClipId) s.splitClip(s.selectedClipId, s.playhead);
      } else if (e.key.toLowerCase() === "d" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (s.selectedClipId) s.duplicateClip(s.selectedClipId);
      } else if (e.key.toLowerCase() === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowLeft" ? -1 : 1);
        const f = Math.max(0, s.playhead + step);
        seekTo(f);
        s.setPlayhead(f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name || "workbench-project"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = (file: File) => {
    file.text().then((text) => {
      try {
        const p = JSON.parse(text) as ProjectData;
        if (!p || !Array.isArray(p.tracks)) throw new Error("bad format");
        useStore.getState().setProject(p);
      } catch {
        window.alert("导入失败：不是合法的工程 JSON");
      }
    });
  };

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">TalkCraft <b>Workbench</b></span>
        <input
          className="project-name"
          value={project.name}
          onChange={(e) => updateName(e.target.value)}
          spellCheck={false}
        />
        <span style={{ flex: 1 }} />
        <button className="btn" disabled={!canUndo} onClick={undo} title="撤销（⌘Z）">
          ↩ 撤销
        </button>
        <button className="btn" disabled={!canRedo} onClick={redo} title="重做（⇧⌘Z）">
          ↪ 重做
        </button>
        <span className="tl-sep" />
        <ExportButton />
        <button className="btn" onClick={exportJson}>导出 JSON</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>导入</button>
        <button
          className="btn"
          onClick={() => window.confirm("重置为演示工程？当前内容会被覆盖（可撤销）。") && resetProject()}
        >
          重置示例
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = "";
          }}
        />
      </header>

      <main className="main">
        <div className="panel-wrap" style={{ width: libW }}>
          <LibraryPanel />
        </div>
        <div
          className="splitter v"
          title="拖拽调整素材库宽度"
          onPointerDown={(e) => {
            const start = libW;
            startSplit(e, (dx) => setLibW(clamp(start + dx, 160, 440)));
          }}
        />
        <PreviewPanel />
        <div
          className="splitter v"
          title="拖拽调整属性面板宽度"
          onPointerDown={(e) => {
            const start = inspW;
            startSplit(e, (dx) => setInspW(clamp(start - dx, 220, 500)));
          }}
        />
        <div className="panel-wrap" style={{ width: inspW }}>
          <Inspector />
        </div>
      </main>

      <div
        className="splitter h"
        title="拖拽调整时间轨高度"
        onPointerDown={(e) => {
          const start = tlH;
          startSplit(e, (_dx, dy) => setTlH(clamp(start - dy, 150, 600)));
        }}
      />
      <div className="panel-wrap" style={{ height: tlH }}>
        <Timeline />
      </div>
      <ExportToast />
    </div>
  );
};
