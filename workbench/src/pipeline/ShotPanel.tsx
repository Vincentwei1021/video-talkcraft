import React, { useEffect, useState } from "react";
import { usePipeline } from "./store";
import { useStore } from "../store";
import { seekTo } from "../playerRef";
import { pipelineFileUrl, STATUS_LABEL } from "./types";

/** 属性面板 · 镜头视图（进度轨点选后）：状态 / 时间 / 场景文件 / 单镜预览 / 未清 issues / 评审提及 / SHOTBOOK 段落 */
export const ShotPanel: React.FC<{ shotId: string }> = ({ shotId }) => {
  const state = usePipeline((s) => s.state);
  const selectShot = usePipeline((s) => s.selectShot);
  const fps = useStore((s) => s.project.fps);
  const setPlayhead = useStore((s) => s.setPlayhead);
  const [book, setBook] = useState<string>("");
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    let live = true;
    setBook("");
    fetch(`/api/pipeline/shotbook?shot=${encodeURIComponent(shotId)}`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => live && setBook(t))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [shotId, state?.updatedAt]);

  const sh = state?.shots.find((s) => s.id === shotId);
  if (!sh) {
    return (
      <div className="inspector">
        <div className="panel-title">镜头 {shotId}</div>
        <div className="inspector-empty dim">shots.json 里已没有这个镜头。</div>
      </div>
    );
  }
  const media = sh.preview ?? sh.segment;
  const jump = () => {
    const f = Math.round(sh.start * fps);
    seekTo(f);
    setPlayhead(f);
  };
  return (
    <div className="inspector">
      <div className="panel-title">
        {sh.id}
        <span className={`shot-status ${sh.status}`}>{STATUS_LABEL[sh.status]}</span>
        {sh.stale && <span className="shot-status stale">过期</span>}
        <button className="mini" style={{ marginLeft: "auto" }} onClick={() => selectShot(null)} title="关闭镜头视图">
          ✕
        </button>
      </div>
      <div className="inspector-scroll">
        <section>
          <div className="sec-title">时间与文件</div>
          <div className="kv">
            <span>区间</span>
            <b>
              {sh.start.toFixed(2)}–{sh.end.toFixed(2)}s · {(sh.end - sh.start).toFixed(2)}s
            </b>
          </div>
          <div className="kv">
            <span>场景</span>
            <b className="mono">{sh.sceneFile ?? "（未落地：占位 / 仅规划）"}</b>
          </div>
          <div className="kv">
            <span>渲出</span>
            <b>{sh.renderedAt ? new Date(sh.renderedAt).toLocaleString("zh-CN", { hour12: false }) : "未渲"}</b>
          </div>
          {sh.stale && <div className="note warn">场景文件比渲出的段新——重渲这一段（`render_shots --changed {sh.id}`）</div>}
          <div className="ctl-row" style={{ marginTop: 8, gap: 6 }}>
            <button className="mini" onClick={jump}>
              ⤓ 跳到该镜
            </button>
            {media && (
              <button
                className="mini"
                onClick={() => fetch(`/api/pipeline/reveal?p=${encodeURIComponent(media)}`, { method: "POST" })}
              >
                Finder 显示{sh.preview ? "预览" : "段"}
              </button>
            )}
          </div>
        </section>

        {media && (
          <section>
            <div className="sec-title">{sh.preview ? "单镜有声预览" : "分段母版（无声）"}</div>
            <video className="shot-video" src={pipelineFileUrl(media)} controls preload="metadata" />
            <div className="dim mono" style={{ fontSize: 11, marginTop: 4 }}>
              {media}
            </div>
          </section>
        )}

        <section>
          <div className="sec-title">未清 issues（{sh.issues.length}）</div>
          {sh.issues.length === 0 ? (
            <div className="dim" style={{ fontSize: 12 }}>
              无——`pipeline_state.mjs --issue "{sh.id}|P1|…"` 登记，`--clear-issues {sh.id}` 清掉
            </div>
          ) : (
            sh.issues.map((x, i) => (
              <div key={i} className={`issue ${x.level}`}>
                <b>{x.level}</b> {x.text}
                <span className="dim mono"> · {x.source}</span>
              </div>
            ))
          )}
          {sh.mentions.length > 0 && (
            <>
              <button className="mini" style={{ marginTop: 6 }} onClick={() => setShowMentions((v) => !v)}>
                {showMentions ? "▾" : "▸"} 评审提及 {sh.mentions.length}（自动抽取，可能已修）
              </button>
              {showMentions &&
                sh.mentions.map((x, i) => (
                  <div key={i} className={`issue mention ${x.level}`}>
                    <b>{x.level}</b> {x.text}
                    <span className="dim mono"> · {x.source}</span>
                  </div>
                ))}
            </>
          )}
        </section>

        <section>
          <div className="sec-title">SHOTBOOK</div>
          {book ? <pre className="shotbook">{book}</pre> : <div className="dim" style={{ fontSize: 12 }}>SHOTBOOK.md 里没有 `### {sh.id}` 段落</div>}
        </section>
      </div>
    </div>
  );
};
