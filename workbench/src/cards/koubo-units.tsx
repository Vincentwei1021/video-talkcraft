import React from "react";
import {
  AbsoluteFill, Audio, Easing, interpolate, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import type { CardDef } from "./types";
// 外部口播工程子组件/数据（经 workbench/kbsrc 符号链接，源码零改动）
import { CameraRig } from "@kbsrc/camera";
import { Environment, ShapeWipes as _unused } from "@kbsrc/Environment";
import { Host } from "@kbsrc/Host";
import { PromoScene } from "@kbsrc/PromoScenes";
import { SHOTS, FPS, TOTAL_FRAMES } from "@kbsrc/shots";
import { Subtitles } from "@kbsrc/Subtitles";
import { C, FONT } from "@kbsrc/theme";
import { timing, cleanText } from "@kbsrc/timing";

// —— 口播成片拆解单元卡：镜头 / 数字人 / 字幕 / 环境 / 转场 / 音频 ——
// 1080p 内容统一 0.5 缩放适配 960×540 画布
const SCALE = 960 / 1920;
const KScale: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: "0 0" }}>
      {children}
    </div>
  </AbsoluteFill>
);

export const OVERLAP = 8;
/** 与原 MainVideo 同构的首尾淡入淡出包络 */
const Envelope: React.FC<{ lead: number; tail: number; total: number; children: React.ReactNode }> =
  ({ lead, tail, total, children }) => {
    const frame = useCurrentFrame();
    let opacity = 1;
    if (lead > 0) opacity *= interpolate(frame, [0, lead], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
    if (tail > 0) opacity *= interpolate(frame, [total - tail, total], [1, 0], { extrapolateLeft: "clamp", easing: Easing.inOut(Easing.quad) });
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  };

type ShotT = { id: string; label: string; start: number; end: number; path: unknown; impulses?: unknown };
export const shotTiming = (idx: number) => {
  const shot: ShotT = SHOTS[idx];
  const lead = idx === 0 ? 0 : OVERLAP;
  const tail = idx === SHOTS.length - 1 ? 0 : OVERLAP;
  const narration = Math.round((shot.end - shot.start) * FPS);
  return { shot, lead, tail, total: lead + narration + tail };
};

// ① 动效镜头：单个 shot 的 包络+运镜+场景，Sequence 本地时间驱动，可整体挪动/裁剪/变速
const KouboShot: React.FC<{ shotId?: string }> = ({ shotId }) => {
  const idx = SHOTS.findIndex((s: ShotT) => s.id === shotId);
  if (idx < 0) return null;
  const { shot, lead, tail, total } = shotTiming(idx);
  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <PromoScene shot={shot} leadFrames={lead} />
          </CameraRig>
        </AbsoluteFill>
      </Envelope>
    </KScale>
  );
};

export const kouboShotCard: CardDef = {
  id: "koubo-shot",
  name: "口播镜头",
  category: "口播拆解",
  durationInFrames: 90,
  accent: "#4c9aff",
  component: KouboShot as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "select", key: "shotId", label: "镜头", default: SHOTS[0].id,
      options: SHOTS.map((s: ShotT) => ({ value: s.id, label: `${s.id} ${s.label}` })),
    },
  ],
};

// ② 数字人（连续 webm + 关键帧几何，绝对时间驱动——从 0 起放才与原片对位）
export const kouboHostCard: CardDef = {
  id: "koubo-host",
  name: "数字人",
  category: "口播拆解",
  durationInFrames: TOTAL_FRAMES,
  accent: "#34c759",
  component: (() => <KScale><Host /></KScale>) as React.ComponentType<Record<string, unknown>>,
  schema: [],
};

// ③ 字幕（词级时间戳，绝对时间驱动）
export const kouboSubtitlesCard: CardDef = {
  id: "koubo-subtitles",
  name: "字幕",
  category: "口播拆解",
  durationInFrames: TOTAL_FRAMES,
  accent: "#ffd60a",
  component: (() => <KScale><Subtitles /></KScale>) as React.ComponentType<Record<string, unknown>>,
  schema: [],
};

// ④ 环境光效（呼吸暗角 + 周期光扫，绝对时间驱动）
export const kouboEnvironmentCard: CardDef = {
  id: "koubo-environment",
  name: "口播环境（暗角+光扫）",
  category: "口播拆解",
  durationInFrames: TOTAL_FRAMES,
  accent: "#8e8e93",
  component: (() => <KScale><Environment /></KScale>) as React.ComponentType<Record<string, unknown>>,
  schema: [],
};

// ④b 字幕句：单句静态字幕（样式与原 Subtitles 逐项一致），文本/构图位可改
//     句子切分与原 phrases() 同构：按中文标点从词级时间戳切
export type KPhrase = { text: string; start: number; end: number };
export const kouboPhrases = (): KPhrase[] => {
  const BREAKS = new Set(["，", "。", "？", "！", "；", "：", "、"]);
  type Ch = { ch: string; t: number; e: number };
  const out: KPhrase[] = [];
  const push = (cur: Ch[]) =>
    out.push({
      text: cleanText(cur.map((c) => c.ch).join("")),
      start: cur[0].t,
      end: cur[cur.length - 1].e,
    });
  for (const s of timing.scenes) {
    let cur: Ch[] = [];
    for (const c of s.chars as Ch[]) {
      cur.push(c);
      if (BREAKS.has(c.ch) && cur.some((x) => cleanText(x.ch))) {
        push(cur);
        cur = [];
      }
    }
    if (cur.some((x) => cleanText(x.ch))) push(cur);
  }
  return out;
};

/** 原 Subtitles 的 half 构图窗口（数字人 half 形态的绝对时间段） */
export const halfAt = (t: number) =>
  t < 8.28 || (t >= 30.6 && t < 43.04) || (t >= 126.18 && t < 134.78) || t >= 171.74;

const SubtitleLine: React.FC<{ text?: string; dark?: boolean; half?: boolean }> = ({
  text = "",
  dark = false,
  half = false,
}) => {
  if (!text) return null;
  return (
    <KScale>
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{
          position: "absolute", left: half ? "32%" : "44%", bottom: 100,
          transform: "translateX(-50%)", maxWidth: half ? "50%" : "58%",
          whiteSpace: "nowrap", fontFamily: FONT.cn,
          fontSize: text.length > 24 ? 38 : 44, fontWeight: 600,
          lineHeight: 1.35, letterSpacing: 1.5,
          color: dark ? C.lightInk : C.ink,
          textShadow: dark ? "0 2px 8px rgba(0,0,0,.9)" : undefined,
        }}>
          {text}
        </div>
      </AbsoluteFill>
    </KScale>
  );
};

export const kouboSubtitleLineCard: CardDef = {
  id: "koubo-subtitle-line",
  name: "字幕句",
  category: "口播拆解",
  durationInFrames: 60,
  accent: "#ffd60a",
  component: SubtitleLine as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "text", label: "字幕文本", default: "" },
    { type: "boolean", key: "dark", label: "深色底样式", default: false },
    { type: "boolean", key: "half", label: "半屏构图位", default: false },
  ],
};

// ⑤ 三色扫转场：原 ShapeWipes 单次 wipe 的本地时间复刻（峰值在本卡 0.32s 处）
export const WIPE_PRE = 0.32; // 峰值前的起手
export const WIPE_POST = 0.36; // 峰值后的收尾
const KouboWipe: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;
  const at = WIPE_PRE;
  if (sec < 0 || sec > at + WIPE_POST) return null;
  const p = interpolate(sec, [at - 0.28, at, at + 0.32], [-130, -10, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <KScale>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: "absolute", inset: "-20% -180%",
          background: [C.accentSoft, "#75baff", C.accent][i],
          transform: `translateX(${p + i * 8}%) skewX(-12deg) scaleX(${1 + 0.12 * Math.sin(Math.min(1, Math.abs(sec - at) / 0.3) * Math.PI)})`,
          opacity: 0.92, zIndex: 80 - i,
        }} />
      ))}
    </KScale>
  );
};

export const kouboWipeCard: CardDef = {
  id: "koubo-wipe",
  name: "三色扫转场",
  category: "口播拆解",
  durationInFrames: Math.ceil((WIPE_PRE + WIPE_POST) * 30),
  accent: "#75baff",
  component: KouboWipe as React.ComponentType<Record<string, unknown>>,
  schema: [],
};

// ⑥ 音频卡（配音 / 音效通用）：裁入=trimBefore、变速=playbackRate，裁剪变速不哑音
const AudioClip: React.FC<{ file?: string; volume?: number; inOffset?: number; speed?: number }> =
  ({ file = "", volume = 1, inOffset = 0, speed = 1 }) => {
    if (!file) return null;
    return (
      <Audio
        src={staticFile(file)}
        volume={volume}
        trimBefore={Math.round(inOffset)}
        playbackRate={speed}
      />
    );
  };

export const audioClipCard: CardDef = {
  id: "audio-clip",
  name: "音频",
  category: "音频",
  kind: "audio",
  durationInFrames: 90,
  accent: "#ff9f0a",
  component: AudioClip as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "file", label: "文件（public/ 下）", default: "" },
    { type: "slider", key: "volume", label: "音量", default: 1, min: 0, max: 1, step: 0.01 },
  ],
};
