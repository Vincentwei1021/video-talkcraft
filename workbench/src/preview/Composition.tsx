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

/** 透明通道导出（右键片段 → 导出透明通道）时注入：
 *  108 张卡的根 AbsoluteFill 都画了不透明幕底（中性白 / 深底），透明导出要的是"动效本体"，
 *  所以把每个 clip 图层的直接子层（= 卡根层）背景去掉；人物剪影占位（HostSilhouette）与
 *  口播镜头卡的白底层（wb-shot-bg）也一并去掉。只动根层与这两处标记层——卡内部的色块 / 底板 /
 *  转场色面是动效内容，不能动。样式表 !important 能压过 React 的 inline style（inline 没有 !important）。 */
const ALPHA_CSS = `
.wb-alpha > div { background: transparent !important; }
.wb-alpha .wb-shot-bg { background: transparent !important; }
.wb-alpha .wb-host-silhouette { display: none !important; }
`;

export const MainComposition: React.FC<{ project: ProjectData; transparent?: boolean }> = ({
  project,
  transparent,
}) => {
  // UI 中 tracks[0] 是最上层轨 → 最后渲染（覆盖在上）
  const ordered = [...project.tracks].reverse();
  return (
    <AbsoluteFill style={{ background: transparent ? "transparent" : "#0e0e10" }}>
      {transparent && <style>{ALPHA_CSS}</style>}
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
            if (card.kind === "audio") {
              return (
                <Sequence
                  key={clip.id}
                  from={clip.start}
                  durationInFrames={Math.max(1, Math.round(clip.duration))}
                >
                  <Comp {...props} inOffset={clip.inOffset} speed={clip.speed} />
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
                  className={transparent ? "wb-alpha" : undefined}
                  style={{
                    opacity: clip.opacity,
                    transform: `translate(${clip.x}px, ${clip.y}px) scale(${clip.scale})`,
                  }}
                >
                  {card.kind === "video" ? (
                    // 视频卡：同音频卡走原生播放通道，保留图层包裹
                    <Comp {...props} inOffset={clip.inOffset} speed={clip.speed} />
                  ) : (
                    <TimeRemap inOffset={clip.inOffset} speed={clip.speed}>
                      <Comp {...props} />
                    </TimeRemap>
                  )}
                </AbsoluteFill>
              </Sequence>
            );
          }),
      )}
    </AbsoluteFill>
  );
};
