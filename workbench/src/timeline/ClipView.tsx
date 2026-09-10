import React, { useState } from "react";
import type { ClipData } from "../types";
import { CARDS } from "../cards/registry";
import { useStore } from "../store";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { alphaProjectFor, startExport } from "../exportJob";

const SNAP_PX = 6;

/** 吸附候选：其他 clip 的首尾 + 播放头（帧） */
const collectSnaps = (excludeClipId: string): number[] => {
  const s = useStore.getState();
  const out: number[] = [s.playhead, 0];
  for (const t of s.project.tracks)
    for (const c of t.clips) {
      if (c.id === excludeClipId) continue;
      out.push(c.start, c.start + c.duration);
    }
  return out;
};

export const ClipView: React.FC<{
  clip: ClipData;
  trackId: string;
  trackIdAt: (clientY: number) => string | null;
}> = ({ clip, trackId, trackIdAt }) => {
  const ppf = useStore((s) => s.pxPerFrame);
  const selected = useStore((s) => s.selectedClipId === clip.id);
  const select = useStore((s) => s.select);
  const commit = useStore((s) => s.commit);
  const updateClip = useStore((s) => s.updateClip);
  const moveClipToTrack = useStore((s) => s.moveClipToTrack);

  const card = CARDS[clip.cardId];

  const applySnap = (frame: number, dur: number): number => {
    const tol = SNAP_PX / ppf;
    for (const snap of collectSnaps(clip.id)) {
      if (Math.abs(frame - snap) < tol) return Math.round(snap);
      if (Math.abs(frame + dur - snap) < tol) return Math.round(snap - dur);
    }
    return frame;
  };

  const onBodyDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    select(clip.id);
    commit();
    const startX = e.clientX;
    const orig = { start: clip.start, duration: clip.duration };
    let curTrack = trackId;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      moved = true;
      const df = (ev.clientX - startX) / ppf;
      let ns = Math.max(0, Math.round(orig.start + df));
      ns = Math.max(0, applySnap(ns, orig.duration));
      updateClip(clip.id, { start: ns });
      const tid = trackIdAt(ev.clientY);
      if (tid && tid !== curTrack) {
        moveClipToTrack(clip.id, tid);
        curTrack = tid;
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      if (!moved) return;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const onTrimDown = (side: "left" | "right") => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    select(clip.id);
    commit();
    const startX = e.clientX;
    const orig = {
      start: clip.start,
      duration: clip.duration,
      inOffset: clip.inOffset,
      speed: clip.speed,
    };
    const onMove = (ev: PointerEvent) => {
      const df = Math.round((ev.clientX - startX) / ppf);
      if (side === "left") {
        let d = df;
        d = Math.max(d, -orig.start); // 不越过时间轴 0 点
        d = Math.max(d, Math.ceil(-orig.inOffset / orig.speed)); // 裁入点不为负
        d = Math.min(d, orig.duration - 2);
        updateClip(clip.id, {
          start: orig.start + d,
          duration: orig.duration - d,
          inOffset: Math.max(0, orig.inOffset + d * orig.speed),
        });
      } else {
        const d = Math.max(df, 2 - orig.duration);
        updateClip(clip.id, { duration: orig.duration + d });
      }
    };
    const onUp = () => window.removeEventListener("pointermove", onMove);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const accent = card?.accent ?? "#666";
  const durSec = (clip.duration / 30).toFixed(1);
  const label = clip.label ?? card?.name ?? clip.cardId;

  // —— 右键菜单：分割 / 复制 / 删除 + 导出透明通道（只渲这一段，起点归零、时长精确）——
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const exportAlpha = (format: "mov" | "webm") => {
    const s = useStore.getState();
    const hit = s.project.tracks.flatMap((t) => t.clips).find((c) => c.id === clip.id) ?? clip;
    const fmtLabel = format === "mov" ? "透明 MOV（ProRes 4444）" : "透明 WebM（VP9）";
    void startExport(
      { project: alphaProjectFor(s.project, hit, label), transparent: true, format },
      "alpha",
      `${label} · ${fmtLabel}`,
    );
  };
  const menuItems = (): MenuItem[] => {
    const s = useStore.getState();
    const inside = s.playhead > clip.start && s.playhead < clip.start + clip.duration;
    const noVisual = card?.kind === "audio";
    return [
      { label: "在播放头处分割", hint: "S", disabled: !inside, onClick: () => s.splitClip(clip.id, s.playhead) },
      { label: "复制", hint: "⌘D", onClick: () => s.duplicateClip(clip.id) },
      { label: "删除", hint: "⌫", danger: true, onClick: () => s.removeClip(clip.id) },
      { label: "", sep: true },
      {
        label: "导出透明通道 · MOV",
        hint: noVisual ? "音频片段没有画面" : "ProRes 4444 · 剪映 / PR / AE",
        disabled: noVisual,
        onClick: () => exportAlpha("mov"),
      },
      {
        label: "导出透明通道 · WebM",
        hint: noVisual ? "音频片段没有画面" : "VP9 alpha · 小体积 / 网页",
        disabled: noVisual,
        onClick: () => exportAlpha("webm"),
      },
    ];
  };

  return (
    <div
      className={`clip${selected ? " selected" : ""}`}
      style={{
        left: clip.start * ppf,
        width: Math.max(8, clip.duration * ppf),
        borderLeftColor: accent,
      }}
      onPointerDown={onBodyDown}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        select(clip.id);
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems()} onClose={() => setMenu(null)} />}
      <div className="clip-label">
        <span className="clip-name">{label}</span>
        <span className="clip-meta">
          {durSec}s
          {clip.speed !== 1 && <em className="badge">{clip.speed}×</em>}
          {clip.inOffset > 0 && <em className="badge">✂{(clip.inOffset / 30).toFixed(1)}s</em>}
          {clip.opacity < 1 && <em className="badge">{Math.round(clip.opacity * 100)}%</em>}
        </span>
      </div>
      <div className="trim trim-l" onPointerDown={onTrimDown("left")} />
      <div className="trim trim-r" onPointerDown={onTrimDown("right")} />
    </div>
  );
};
