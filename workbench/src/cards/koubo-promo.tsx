import React from "react";
import {
  AbsoluteFill, Audio, Easing, Sequence, interpolate,
  staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import type { CardDef } from "./types";
// 外部口播成片工程的子组件经 workbench/kbsrc 符号链接引入（源码零改动）；
// MainVideo 因调用 getInputProps()（Player 内会抛错）在下方按原样复刻并去掉该行。
import { CameraRig } from "@kbsrc/camera";
import { Environment, ShapeWipes } from "@kbsrc/Environment";
import { Host } from "@kbsrc/Host";
import { PromoScene } from "@kbsrc/PromoScenes";
import { SHOTS, FPS } from "@kbsrc/shots";
import { SFX_CUES } from "@kbsrc/sfx";
import { Subtitles } from "@kbsrc/Subtitles";

// —— 以下与 kbsrc/MainVideo.tsx 逐行同构，仅去掉 getInputProps() 的 sfxSolo 分支 ——
const OVERLAP = 8;
const Envelope: React.FC<{ lead: number; tail: number; total: number; children: React.ReactNode }> =
  ({ lead, tail, total, children }) => {
    const frame = useCurrentFrame();
    let opacity = 1;
    if (lead > 0) opacity *= interpolate(frame, [0, lead], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
    if (tail > 0) opacity *= interpolate(frame, [total - tail, total], [1, 0], { extrapolateLeft: "clamp", easing: Easing.inOut(Easing.quad) });
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  };

const MainVideo: React.FC = () => {
  const { fps } = useVideoConfig();
  const cueNodes = SFX_CUES.map((c: { t: number; dur?: number; file: string; vol: number }, i: number) => (
    <Sequence key={`${c.t}-${i}`} from={Math.round(c.t * fps)} durationInFrames={c.dur ? Math.round(c.dur * fps) : 90}>
      <Audio src={staticFile(`sfx/${c.file}`)} volume={c.vol} />
    </Sequence>
  ));
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <Audio src={staticFile("full.wav")} />
      {cueNodes}
      {SHOTS.map((shot: { id: string; start: number; end: number; path: unknown; impulses?: unknown }, i: number) => {
        const lead = i === 0 ? 0 : OVERLAP;
        const tail = i === SHOTS.length - 1 ? 0 : OVERLAP;
        const narration = Math.round((shot.end - shot.start) * FPS);
        const total = lead + narration + tail;
        return (
          <Sequence key={shot.id} from={Math.max(0, Math.round(shot.start * FPS) - lead)} durationInFrames={total}>
            <Envelope lead={lead} tail={tail} total={total}>
              <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
                <PromoScene shot={shot} leadFrames={lead} />
              </CameraRig>
            </Envelope>
          </Sequence>
        );
      })}
      <Host />
      <Environment />
      <ShapeWipes />
      <Subtitles />
    </AbsoluteFill>
  );
};

// koubo-promo · 口播成片 TalkcraftPromo —— 1920×1080 成片按 0.5 缩放适配 960×540 画布。
// 布局是硬编码 1080p 像素、useVideoConfig 只取 fps(=30)，缩放包裹即可。
const SCALE = 960 / 1920;

const KouboPromo: React.FC = () => (
  <AbsoluteFill style={{ overflow: "hidden", background: "#fff" }}>
    <div
      style={{
        position: "absolute",
        width: 1920,
        height: 1080,
        transform: `scale(${SCALE})`,
        transformOrigin: "0 0",
      }}
    >
      <MainVideo />
    </div>
  </AbsoluteFill>
);

export const kouboPromoCard: CardDef = {
  id: "koubo-promo",
  name: "口播成片 · TalkcraftPromo",
  category: "成片",
  durationInFrames: Math.ceil(184.8 * 30), // 与其 Root.tsx 的 TOTAL_FRAMES 同式
  accent: "#1d1d1f",
  component: KouboPromo as React.ComponentType<Record<string, unknown>>,
  schema: [],
};
