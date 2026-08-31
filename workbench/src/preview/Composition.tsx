import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import type { ProjectData } from "../types";
import { CARDS } from "../cards/registry";
import { defaultsOf } from "../cards/types";

/** 时间重映射：clip 本地帧 → 卡片源帧（inOffset + f × speed）。
 *  卡片全部是 frame 的纯函数（tween 均 clamp），因此变速/裁入/超时长定格都安全。 */
const TimeRemap: React.FC<{
  inOffset: number;
  speed: number;
  children: React.ReactNode;
}> = ({ inOffset, speed, children }) => {
  const frame = useCurrentFrame();
  return <Freeze frame={Math.max(0, inOffset + frame * speed)}>{children}</Freeze>;
};

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
                  <TimeRemap inOffset={clip.inOffset} speed={clip.speed}>
                    <Comp {...props} />
                  </TimeRemap>
                </AbsoluteFill>
              </Sequence>
            );
          }),
      )}
    </AbsoluteFill>
  );
};
