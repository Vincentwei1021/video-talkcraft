import React, { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { MainComposition } from "./Composition";
import { playerRef, seekTo, togglePlay } from "../playerRef";
import { projectDuration, useStore } from "../store";
import { fmtFrames } from "../time";

/** 走带控制：唯一订阅 playhead 的预览端组件——播放中每帧只重渲染它，
 *  不能让 frameupdate 波及包含 <Player> 的父组件。 */
const Transport: React.FC<{
  duration: number;
  loop: boolean;
  setLoop: (b: boolean) => void;
  sizeLabel: string;
}> = ({ duration, loop, setLoop, sizeLabel }) => {
  const playhead = useStore((s) => s.playhead);
  const playing = useStore((s) => s.playing);
  const setPlayhead = useStore((s) => s.setPlayhead);
  const setPlaying = useStore((s) => s.setPlaying);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setPlayhead(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, [setPlayhead, setPlaying]);

  return (
    <div className="transport">
      <button className="btn" title="回到开头" onClick={() => seekTo(0)}>
        ⏮
      </button>
      <button className="btn btn-play" title="播放/暂停（空格）" onClick={togglePlay}>
        {playing ? "⏸" : "▶"}
      </button>
      <span className="timecode">
        {fmtFrames(playhead)} <span className="dim">/ {fmtFrames(duration)}</span>
      </span>
      <label className="loop-toggle">
        <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
        循环
      </label>
      <span className="dim" style={{ marginLeft: "auto" }}>
        {sizeLabel}
      </span>
    </div>
  );
};

export const PreviewPanel: React.FC = () => {
  const project = useStore((s) => s.project);
  const [loop, setLoop] = useState(true);

  const duration = projectDuration(project);
  const inputProps = useMemo(() => ({ project }), [project]);

  return (
    <div className="preview-panel">
      <div className="preview-stage">
        <Player
          ref={playerRef}
          component={MainComposition}
          inputProps={inputProps}
          durationInFrames={duration}
          compositionWidth={project.width}
          compositionHeight={project.height}
          fps={project.fps}
          loop={loop}
          controls={false}
          clickToPlay
          style={{ width: "100%", height: "100%" }}
          acknowledgeRemotionLicense
        />
      </div>
      <Transport
        duration={duration}
        loop={loop}
        setLoop={setLoop}
        sizeLabel={`${project.width}×${project.height} · ${project.fps}fps`}
      />
    </div>
  );
};
