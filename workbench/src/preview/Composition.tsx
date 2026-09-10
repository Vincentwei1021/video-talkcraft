import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import type { ProjectData } from "../types";
import { CARDS } from "../cards/registry";
import { defaultsOf } from "../cards/types";

/** 时间重映射：clip 本地帧 → 卡片源帧（inOffset + f × speed）。
 *  卡片全部是 frame 的纯函数（tween 均 clamp），因此变速/裁入/超时长定格都安全。
 *  不变速且不裁入时直通不包 Freeze——含 Audio/Video 的卡需要原生播放（Freeze 会掐掉声音）。 */
const TimeRemap: React.FC<{
  inOffset: number;
  speed: number;
  children: React.ReactNode;
}> = ({ inOffset, speed, children }) => {
  const frame = useCurrentFrame();
  if (speed === 1 && inOffset === 0) return <>{children}</>;
  return <Freeze frame={Math.max(0, inOffset + frame * speed)}>{children}</Freeze>;
};

/** 单 clip 报错只把这一格画红（实时看板下 agent 半成品是常态），其余 clip 照常 */
class ClipBoundary extends React.Component<{ label: string; children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) };
  }
  componentDidUpdate(prev: { children: React.ReactNode }) {
    // 子树换了（HMR / props 改）就再试一次
    if (this.state.err && prev.children !== this.props.children) this.setState({ err: null });
  }
  render() {
    if (this.state.err)
      return (
        <AbsoluteFill style={{ background: "rgba(90,20,24,0.92)", color: "#ffb4ad", padding: 36, fontFamily: "-apple-system, PingFang SC, sans-serif" }}>
          <div style={{ fontSize: 26, fontWeight: 600 }}>片段渲染出错 · {this.props.label}</div>
          <pre style={{ marginTop: 12, fontSize: 16, lineHeight: 1.5, whiteSpace: "pre-wrap", opacity: 0.85 }}>{this.state.err.slice(0, 400)}</pre>
        </AbsoluteFill>
      );
    return this.props.children;
  }
}

export const MainComposition: React.FC<{ project: ProjectData }> = ({ project }) => {
  // UI 中 tracks[0] 是最上层轨 → 最后渲染（覆盖在上）
  const ordered = [...project.tracks].reverse();
  return (
    <AbsoluteFill style={{ background: "#0e0e10" }}>
      {ordered.map(
        (track) =>
          !track.hidden &&
          track.clips.map((clip) => {
            const card = CARDS[clip.cardId];
            if (!card) return null;
            const Comp = card.component;
            const props = { ...defaultsOf(card), ...clip.props };
            // 音频卡：裁入/变速交给卡内 <Audio trimBefore playbackRate>，
            // 不能包 Freeze（会掐死原生播放），也无需图层包裹
            const label = clip.label ?? card.name;
            if (card.kind === "audio") {
              return (
                <Sequence
                  key={clip.id}
                  from={clip.start}
                  durationInFrames={Math.max(1, Math.round(clip.duration))}
                >
                  <ClipBoundary label={label}>
                    <Comp {...props} inOffset={clip.inOffset} speed={clip.speed} />
                  </ClipBoundary>
                </Sequence>
              );
            }
            return (
              <Sequence
                key={clip.id}
                from={clip.start}
                durationInFrames={Math.max(1, Math.round(clip.duration))}
              >
                <AbsoluteFill
                  style={{
                    opacity: clip.opacity,
                    transform: `translate(${clip.x}px, ${clip.y}px) scale(${clip.scale})`,
                  }}
                >
                  <ClipBoundary label={label}>
                    {card.kind === "video" ? (
                      // 视频卡：同音频卡走原生播放通道，保留图层包裹
                      <Comp {...props} inOffset={clip.inOffset} speed={clip.speed} />
                    ) : (
                      <TimeRemap inOffset={clip.inOffset} speed={clip.speed}>
                        <Comp {...props} />
                      </TimeRemap>
                    )}
                  </ClipBoundary>
                </AbsoluteFill>
              </Sequence>
            );
          }),
      )}
    </AbsoluteFill>
  );
};
