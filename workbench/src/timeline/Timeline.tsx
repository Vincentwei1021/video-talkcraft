import React, { useRef } from "react";
import { projectDuration, useStore } from "../store";
import { Ruler } from "./Ruler";
import { ClipView } from "./ClipView";

const HEADER_W = 140;

/** 播放头竖线：唯一订阅 playhead 的时间轨组件——播放中每帧只动它 */
const PlayheadLine: React.FC = () => {
  const playhead = useStore((s) => s.playhead);
  const ppf = useStore((s) => s.pxPerFrame);
  return (
    <div className="playhead" style={{ left: HEADER_W + playhead * ppf }}>
      <div className="playhead-cap" />
    </div>
  );
};

export const Timeline: React.FC = () => {
  const project = useStore((s) => s.project);
  const ppf = useStore((s) => s.pxPerFrame);
  const selectedClipId = useStore((s) => s.selectedClipId);
  const setZoom = useStore((s) => s.setZoom);
  const select = useStore((s) => s.select);
  const addTrack = useStore((s) => s.addTrack);
  const removeTrack = useStore((s) => s.removeTrack);
  const toggleTrackHidden = useStore((s) => s.toggleTrackHidden);
  const splitClip = useStore((s) => s.splitClip);
  const duplicateClip = useStore((s) => s.duplicateClip);
  const removeClip = useStore((s) => s.removeClip);

  const duration = projectDuration(project);
  const contentW = Math.ceil(duration * ppf) + 240;
  const laneRefs = useRef(new Map<string, HTMLDivElement>());
  const scrollerRef = useRef<HTMLDivElement>(null);

  const trackIdAt = (clientY: number): string | null => {
    for (const [id, el] of laneRefs.current) {
      const r = el.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) return id;
    }
    return null;
  };

  const fit = () => {
    const w = scrollerRef.current?.clientWidth;
    if (w) setZoom((w - HEADER_W - 80) / duration);
  };

  return (
    <div className="timeline">
      <div className="tl-toolbar">
        <button
          className="btn"
          disabled={!selectedClipId}
          title="在播放头处分割选中片段（S）"
          onClick={() =>
            selectedClipId && splitClip(selectedClipId, useStore.getState().playhead)
          }
        >
          ✂ 分割
        </button>
        <button
          className="btn"
          disabled={!selectedClipId}
          title="复制选中片段（⌘D）"
          onClick={() => selectedClipId && duplicateClip(selectedClipId)}
        >
          ⧉ 复制
        </button>
        <button
          className="btn"
          disabled={!selectedClipId}
          title="删除选中片段（Delete）"
          onClick={() => selectedClipId && removeClip(selectedClipId)}
        >
          🗑 删除
        </button>
        <span className="tl-sep" />
        <button className="btn" onClick={addTrack} title="新增一条轨道（加在最上层）">
          ＋ 轨道
        </button>
        <span style={{ marginLeft: "auto" }} />
        <button className="btn" onClick={fit} title="缩放到适配全部内容">
          ⤢ 适配
        </button>
        <span className="dim">缩放</span>
        <input
          type="range"
          min={0.3}
          max={8}
          step={0.1}
          value={ppf}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ width: 120 }}
        />
      </div>

      <div className="tl-scroller" ref={scrollerRef}>
        <div className="tl-content" style={{ width: contentW + HEADER_W }}>
          <div className="tl-ruler-row">
            <div className="tl-corner" style={{ width: HEADER_W }} />
            <Ruler durationFrames={duration} contentW={contentW} />
          </div>

          {project.tracks.map((track) => (
            <div className="tl-row" key={track.id}>
              <div className="tl-track-head" style={{ width: HEADER_W }}>
                <span className="track-name" title={track.name}>
                  {track.name}
                </span>
                <span className="track-actions">
                  <button
                    className="mini"
                    title={track.hidden ? "显示轨道" : "隐藏轨道"}
                    onClick={() => toggleTrackHidden(track.id)}
                  >
                    {track.hidden ? "🚫" : "👁"}
                  </button>
                  <button
                    className="mini"
                    title="删除轨道"
                    onClick={() => {
                      if (
                        track.clips.length === 0 ||
                        window.confirm(`删除轨道「${track.name}」及其 ${track.clips.length} 个片段？`)
                      )
                        removeTrack(track.id);
                    }}
                  >
                    ✕
                  </button>
                </span>
              </div>
              <div
                className={`tl-lane${track.hidden ? " hidden-track" : ""}`}
                ref={(el) => {
                  if (el) laneRefs.current.set(track.id, el);
                  else laneRefs.current.delete(track.id);
                }}
                style={{ width: contentW }}
                onPointerDown={() => select(null)}
              >
                {track.clips.map((clip) => (
                  <ClipView key={clip.id} clip={clip} trackId={track.id} trackIdAt={trackIdAt} />
                ))}
              </div>
            </div>
          ))}

          <PlayheadLine />
        </div>
      </div>
    </div>
  );
};
