import React from "react";
import { usePipeline } from "./store";
import { useStore } from "../store";
import { seekTo } from "../playerRef";
import { STATUS_LABEL } from "./types";

/** 时间轨最上面的进度轨：每镜一个色块（灰 占位 / 蓝 已实现 / 青 已渲 / 绿 已过 / 红点 有未清 P0-P1 / 虚线框 过期），
 *  点一下 → 播放头跳到该镜、属性面板显示该镜（SHOTBOOK 段落 / issues / 单镜预览）。
 *  只订阅 pipeline + 缩放 + fps，播放中不重渲染。 */
export const ProgressTrack: React.FC<{ headerW: number; contentW: number }> = ({ headerW, contentW }) => {
  const state = usePipeline((s) => s.state);
  const selected = usePipeline((s) => s.selectedShotId);
  const selectShot = usePipeline((s) => s.selectShot);
  const ppf = useStore((s) => s.pxPerFrame);
  const fps = useStore((s) => s.project.fps);
  const setPlayhead = useStore((s) => s.setPlayhead);
  const selectClip = useStore((s) => s.select);
  if (!state || !state.shots.length) return null;

  return (
    <div className="tl-row pt-row">
      <div className="tl-track-head pt-head" style={{ width: headerW }} title={`制作进度 · ${state.project}\n阶段 ${state.stage}`}>
        <span className="track-name">进度 · {state.stage}</span>
      </div>
      <div className="tl-lane pt-lane" style={{ width: contentW }}>
        {state.shots.map((sh) => {
          const left = sh.start * fps * ppf;
          const w = Math.max(6, (sh.end - sh.start) * fps * ppf - 1);
          const open = sh.issues.filter((x) => x.level !== "P2").length;
          return (
            <div
              key={sh.id}
              className={`pt-block ${sh.status}${sh.stale ? " stale" : ""}${selected === sh.id ? " selected" : ""}`}
              style={{ left, width: w }}
              title={`${sh.id} · ${STATUS_LABEL[sh.status]}${sh.stale ? "（场景比渲出的段新）" : ""} · ${sh.start.toFixed(2)}–${sh.end.toFixed(2)}s${open ? `\n未清 P0/P1 ×${open}` : ""}${sh.mentions.length ? `\n评审提及 ×${sh.mentions.length}` : ""}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                const f = Math.round(sh.start * fps);
                seekTo(f);
                setPlayhead(f);
                selectClip(null);
                selectShot(sh.id);
              }}
            >
              <span className="pt-id">{sh.id}</span>
              {open > 0 && <i className="pt-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
