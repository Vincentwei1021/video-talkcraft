import React, { useState } from "react";
import type { ClipData } from "../types";
import { CARDS } from "../cards/registry";
import { useStore } from "../store";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { alphaProjectFor, startExport, useExportStore } from "../exportJob";
import { usePipeline } from "../pipeline/store";
import { STATUS_LABEL, type ShotStatus } from "../pipeline/types";

/** 拆解出的逐镜 clip（kb-shot-sNN）在轨上直接显示制作状态：占位 / 已实现 / 已渲 / 已过闸 · 过期 · 未清 P0/P1
 *  （2026-09-21 用户：多轨看板要一眼看出"动效做到哪一步、做到第几个镜头"，不能只靠最上面那条进度轨）。
 *  选择器只回一个字符串，状态没变不重渲染。 */
const SHOT_CLIP_PREFIX = "kb-shot-";
const useShotStatus = (clipId: string): { status: ShotStatus; stale: boolean; issue: boolean } | null => {
  const shotId = clipId.startsWith(SHOT_CLIP_PREFIX) ? clipId.slice(SHOT_CLIP_PREFIX.length) : null;
  const key = usePipeline((s) => {
    if (!shotId || !s.state) return null;
    const sh = s.state.shots.find((x) => x.id === shotId);
    return sh ? `${sh.status}|${sh.stale ? 1 : 0}|${sh.issues.some((i) => i.level !== "P2") ? 1 : 0}` : null;
  });
  if (!key) return null;
  const [status, stale, issue] = key.split("|");
  return { status: status as ShotStatus, stale: stale === "1", issue: issue === "1" };
};

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
  const shot = useShotStatus(clip.id);

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
    const busy = useExportStore.getState().job?.status === "running"; // dev server 同时只跑一个渲染
    return [
      { label: "在播放头处分割", hint: "S", disabled: !inside, onClick: () => s.splitClip(clip.id, s.playhead) },
      { label: "复制", hint: "⌘D", onClick: () => s.duplicateClip(clip.id) },
      { label: "删除", hint: "⌫", danger: true, onClick: () => s.removeClip(clip.id) },
      { label: "", sep: true },
      {
        label: "导出透明通道 · MOV",
        hint: noVisual ? "音频片段没有画面" : busy ? "已有渲染在进行中" : "ProRes 4444 · 剪映 / PR / AE",
        disabled: noVisual || busy,
        onClick: () => exportAlpha("mov"),
      },
      {
        label: "导出透明通道 · WebM",
        hint: noVisual ? "音频片段没有画面" : busy ? "已有渲染在进行中" : "VP9 alpha · 小体积 / 网页",
        disabled: noVisual || busy,
        onClick: () => exportAlpha("webm"),
      },
    ];
  };

  return (
    <div
      className={`clip${selected ? " selected" : ""}${shot ? ` clip-shot-${shot.status}` : ""}`}
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
          {shot && (
            <em className={`badge shot-badge ${shot.status}`} title={`制作状态：${STATUS_LABEL[shot.status]}${shot.stale ? "（场景比渲出的段新，该重渲）" : ""}`}>
              {STATUS_LABEL[shot.status]}
              {shot.stale && " ⟳"}
            </em>
          )}
          {shot?.issue && <em className="badge shot-badge issue" title="有未清 P0/P1（进度轨点该镜看详情）">P0/P1</em>}
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
