import React from "react";
import { usePipeline } from "./store";
import { useStore } from "../store";
import { buildLiveProject, canBuildLive, isLiveProject } from "../kb/liveProject";
import { KB_PROJECT } from "../kbMeta";

/** 顶栏下的阶段条：①…⑧ 当前步高亮、hover 看产物；右侧镜头计数 + 直播点 + 「接入实时看板」。
 *  只订阅 pipeline store（播放中不重渲染）。未链接工程时不渲染。 */
export const StageBar: React.FC = () => {
  const linked = usePipeline((s) => s.linked);
  const state = usePipeline((s) => s.state);
  const connected = usePipeline((s) => s.connected);
  const isLive = useStore((s) => isLiveProject(s.project));
  const setProject = useStore((s) => s.setProject);
  if (!linked) return null;

  const c = state?.counts;
  const time = state ? new Date(state.updatedAt).toLocaleTimeString("zh-CN", { hour12: false }) : "";
  return (
    <div className="stagebar" title={state ? `${state.root}\n最近更新 ${time}` : "接入工程状态未拿到"}>
      <span className={`live-dot${connected ? " on" : ""}`} title={connected ? "实时连接中（SSE）" : "未连接，重连中…"} />
      <span className="stage-project">{state?.project ?? KB_PROJECT}</span>
      <span className="stage-steps">
        {(state?.stages ?? []).map((st) => (
          <span
            key={st.id}
            className={`stage-chip ${st.status}${state?.stage === st.id ? " current" : ""}`}
            title={`${st.id} ${st.label} · ${st.status === "done" ? "已完成" : st.status === "running" ? "进行中" : "未开始"}${st.artifacts.length ? `\n${st.artifacts.join("\n")}` : ""}`}
          >
            {st.id}
            <em>{st.label}</em>
          </span>
        ))}
      </span>
      {c && (
        <span className="stage-counts dim">
          镜头 {c.shots}
          {c.placeholder > 0 && <b className="cnt placeholder">占位 {c.placeholder}</b>}
          {c.implemented > 0 && <b className="cnt implemented">已实现 {c.implemented}</b>}
          {c.rendered > 0 && <b className="cnt rendered">已渲 {c.rendered}</b>}
          {c.passed > 0 && <b className="cnt passed">已过 {c.passed}</b>}
          {c.stale > 0 && <b className="cnt stale">过期 {c.stale}</b>}
          {c.p0p1 > 0 && <b className="cnt issues">P0/P1 {c.p0p1}</b>}
        </span>
      )}
      <span style={{ flex: 1 }} />
      <button className="mini" title="按盘上产物重算一次" onClick={() => fetch("/api/pipeline/refresh", { method: "POST" })}>
        ⟳
      </button>
      {canBuildLive && !isLive && (
        <button
          className="btn"
          title="把接入工程的主合成按实时代码放进时间线（一条轨一个 clip；agent 存盘即刷新），进度轨随之出现"
          onClick={() => setProject(buildLiveProject())}
        >
          ▶ 接入实时看板
        </button>
      )}
    </div>
  );
};
