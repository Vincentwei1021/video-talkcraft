import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { SHOTS } from "@kbsrc/shots";
import { atChar } from "@kbsrc/timing";
import { C, FONT } from "@kbsrc/theme";

// kscene-s21 · 章节与段落 —— 口播成片 Scene21 的逐镜参数化卡（源出 kbsrc/PromoScenes.tsx）
// 双幕换场：深色章节幕（编号 04 + 章节标题）→ 浅色段落幕（几层色块一扫）。
// FIXED（不暴露）：换幕时刻藏在 wipe 遮挡峰值（「一扫」词锚 −0.05~−0.01s）、
//   色块/编号词锚、双正弦漂移、斜向 sheen 光扫、幕2 居中编排。
// 暴露：两幕文案、章节编号、主色/两幕底色/氛围光色、两幕标题字号、幕1 内容块位置。
const FPS = 30;
const T21 = shotTiming(20); // idx 20 = s21

// —— PromoScenes 顶部共享 helpers（逐字复制，未导出故内联）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);

// 词锚：字级时间戳 + 47.7ms 混音补偿（beats.json 同源）—— FIXED
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const ST21: number = SHOTS[20].start;
const SWEEP_AT: number = A(31, "一扫") - ST21; // 换幕词锚（峰值=词锚，P1-2）
const SLAB_AT: number = A(30, "色块") - ST21;
const NUM_AT: number = A(30, "编号") - ST21;

// —— KouboShot 包装范式（koubo-units 未导出 KScale/Envelope，逐字复制）——
const SCALE = 960 / 1920;
const KScale: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: "0 0" }}>
      {children}
    </div>
  </AbsoluteFill>
);
const Envelope: React.FC<{ lead: number; tail: number; total: number; children: React.ReactNode }> =
  ({ lead, tail, total, children }) => {
    const frame = useCurrentFrame();
    let opacity = 1;
    if (lead > 0) opacity *= interpolate(frame, [0, lead], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
    if (tail > 0) opacity *= interpolate(frame, [total - tail, total], [1, 0], { extrapolateLeft: "clamp", easing: Easing.inOut(Easing.quad) });
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  };

const hexRgba = (hex: string, a: number): string => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

interface Props {
  chapterNum?: string;
  act1Title?: string;
  act1Sub?: string;
  act1TitleSize?: number;
  act1X?: number;
  act1Y?: number;
  act1Bg?: string;
  glow?: string;
  act2Kicker?: string;
  act2Line1?: string;
  act2Line2?: string;
  act2TitleSize?: number;
  act2Bg?: string;
  accent?: string;
}

const KSceneS21: React.FC<Props> = ({
  chapterNum = "04",
  act1Title = "段落之间怎么切",
  act1Sub = "CHAPTER TITLE CARD",
  act1TitleSize = 84,
  act1X = 450,
  act1Y = 360,
  act1Bg = "#17171b",
  glow = "#2997ff",
  act2Kicker = "更轻的段落",
  act2Line1 = "几层色块一扫",
  act2Line2 = "画面就换过去",
  act2TitleSize = 92,
  act2Bg = "#f5f5f7",
  accent = "#0066cc",
}) => {
  const frame = useCurrentFrame();
  const t = (frame - T21.lead) / FPS; // 与原 PromoScene 一致
  const shot = T21.shot;

  // —— 原 Scene21 本体（节奏/几何 FIXED，仅文案与颜色/字号/位置参数化）——
  const second = ease(t, SWEEP_AT - 0.05, SWEEP_AT - 0.01); // 换幕藏在 wipe 遮挡峰值
  const drift = Math.sin(t * 0.82) * 12;
  const slab = tw(t, SLAB_AT, 0.4, power2Out);
  const num = tw(t, NUM_AT, 0.35, power3Out);

  return (
    <KScale>
      <Envelope lead={T21.lead} tail={T21.tail} total={T21.total}>
        {/* 底色层：s21 为 dark 镜头 → Shell bg = C.dark（Scene21 自带双幕全屏底色，此层照抄结构） */}
        <AbsoluteFill style={{ background: act1Bg }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={T21.lead}>
            <AbsoluteFill style={{ background: act1Bg, color: C.lightInk, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                {/* 幕1：深色章节幕（左移 110% 出画） */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: `radial-gradient(65% 70% at ${48 + Math.sin(t * 0.35) * 3}% 42%,${hexRgba(glow, 0.16)},transparent 65%),${act1Bg}`,
                  color: "#fff", transform: `translateX(${second * -110}%)`,
                }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(115deg,transparent 42%,rgba(255,255,255,.055) 50%,transparent 58%)",
                    transform: `translateX(${lerp(-75, 75, t / 9.3)}%)`,
                  }} />
                  <div style={{
                    position: "absolute", left: 150 + drift * 0.35, top: 145,
                    fontFamily: FONT.serif, fontSize: 280, opacity: 0.2 * num,
                    transform: `translateY(${(1 - num) * -60}px)`,
                  }}>{chapterNum}</div>
                  <div style={{ position: "absolute", left: act1X + drift, top: act1Y }}>
                    <div style={{ fontSize: act1TitleSize, fontWeight: 600, opacity: slab }}>{act1Title}</div>
                    <div style={{ fontSize: 34, color: "#a1a1a6", marginTop: 22, opacity: slab }}>{act1Sub}</div>
                  </div>
                </div>
                {/* 幕2：浅色段落幕（从右 110% 入画，居中编排 FIXED） */}
                <div style={{
                  position: "absolute", inset: 0, background: act2Bg, color: C.ink,
                  transform: `translateX(${(1 - second) * 110}%)`, display: "grid", placeItems: "center",
                }}>
                  <div style={{ textAlign: "center", transform: `translateX(${Math.sin(t * 0.78) * 10}px)` }}>
                    <div style={{ fontSize: 36, color: C.dim }}>{act2Kicker}</div>
                    <div style={{ fontSize: act2TitleSize, fontWeight: 600, marginTop: 20 }}>
                      {act2Line1}<br /><span style={{ color: accent }}>{act2Line2}</span>
                    </div>
                  </div>
                </div>
              </Plane>
            </AbsoluteFill>
          </CameraRig>
        </AbsoluteFill>
      </Envelope>
    </KScale>
  );
};

export const card: CardDef = {
  id: "kscene-s21",
  name: "章节与段落",
  category: "口播镜头",
  durationInFrames: T21.total,
  accent: "#2997ff",
  component: KSceneS21 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "chapterNum", label: "幕1 · 章节编号", default: "04" },
    { type: "text", key: "act1Title", label: "幕1 · 章节标题", default: "段落之间怎么切" },
    { type: "text", key: "act1Sub", label: "幕1 · 英文小字", default: "CHAPTER TITLE CARD" },
    { type: "slider", key: "act1TitleSize", label: "幕1 · 标题字号", default: 84, min: 48, max: 130, step: 1, unit: "px" },
    { type: "number", key: "act1X", label: "幕1 · 内容块 X", default: 450, step: 1, unit: "px" },
    { type: "number", key: "act1Y", label: "幕1 · 内容块 Y", default: 360, step: 1, unit: "px" },
    { type: "color", key: "act1Bg", label: "幕1 · 深底色", default: "#17171b" },
    { type: "color", key: "glow", label: "幕1 · 氛围光色", default: "#2997ff" },
    { type: "text", key: "act2Kicker", label: "幕2 · 眉头小字", default: "更轻的段落" },
    { type: "text", key: "act2Line1", label: "幕2 · 标题上行", default: "几层色块一扫" },
    { type: "text", key: "act2Line2", label: "幕2 · 标题下行（强调色）", default: "画面就换过去" },
    { type: "slider", key: "act2TitleSize", label: "幕2 · 标题字号", default: 92, min: 56, max: 130, step: 1, unit: "px" },
    { type: "color", key: "act2Bg", label: "幕2 · 浅底色", default: "#f5f5f7" },
    { type: "color", key: "accent", label: "主色（强调行）", default: "#0066cc" },
  ],
};
