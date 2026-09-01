import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { SHOTS } from "@kbsrc/shots";
import { atChar } from "@kbsrc/timing";
import { C, FONT } from "@kbsrc/theme";

// kscene-s23 · 开源 · CTA · 23 镜头回收 —— 口播成片 Scene23 的逐镜参数化卡（源出 kbsrc/PromoScenes.tsx）
// 三段收尾：开源宣言 → 评论区扣「口播」CTA → 23 格镜头回收网。
// FIXED（不暴露）：三段换幕时刻（6.2s/9.0s）、CTA 弹出词锚（「口播」）、
//   格网 stagger 词锚（「二十三」）与 23 格几何（8 列网格/格高 52/间距 10）。
// 暴露：三段全部可见文案、主色、各段标题字号 + CTA 字号、三段内容块位置。
const FPS = 30;
const T23 = shotTiming(22); // idx 22 = s23（末镜头，tail=0）

// —— PromoScenes 顶部共享 helpers（逐字复制，未导出故内联）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const backOut = (s = 1.70158) => (x: number) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

// 词锚：字级时间戳 + 47.7ms 混音补偿 —— FIXED
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const ST23: number = SHOTS[22].start;
const PILL_AT: number = A(38, "口播") - ST23;
const GRID_AT: number = A(39, "二十三") - ST23;

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

interface Props {
  act1Label?: string;
  act1Line1?: string;
  act1Line2?: string;
  act1Sub?: string;
  act1TitleSize?: number;
  act1X?: number;
  act1Y?: number;
  act2Title?: string;
  pillText?: string;
  act2TitleSize?: number;
  pillSize?: number;
  act2X?: number;
  act2Y?: number;
  act3Kicker?: string;
  act3Pre?: string;
  act3Num?: string;
  act3Post?: string;
  act3TitleSize?: number;
  act3X?: number;
  act3Y?: number;
  accent?: string;
}

const KSceneS23: React.FC<Props> = ({
  act1Label = "OPEN SOURCE",
  act1Line1 = "video-talkcraft",
  act1Line2 = "78 张动效卡",
  act1Sub = "全部开源 · 每张都有可播 demo",
  act1TitleSize = 82,
  act1X = 130,
  act1Y = 180,
  act2Title = "想要的，评论区扣",
  pillText = "口播",
  act2TitleSize = 56,
  pillSize = 90,
  act2X = 140,
  act2Y = 230,
  act3Kicker = "你刚刚看完的这条视频",
  act3Pre = "就是这",
  act3Num = "23",
  act3Post = "个镜头",
  act3TitleSize = 112,
  act3X = 115,
  act3Y = 165,
  accent = "#0066cc",
}) => {
  const frame = useCurrentFrame();
  const t = (frame - T23.lead) / FPS; // 与原 PromoScene 一致
  const shot = T23.shot;

  // —— 原 Scene23 本体（三段换幕时刻 FIXED）——
  const second = ease(t, 6.2, 6.6), third = ease(t, 9.0, 9.4);
  const labelS: React.CSSProperties = { fontFamily: FONT.mono, fontSize: 22, letterSpacing: 0.6, color: accent, fontWeight: 600 };

  return (
    <KScale>
      <Envelope lead={T23.lead} tail={T23.tail} total={T23.total}>
        {/* 底色层：n=23 非 dark、非 ACT_ALT → Shell bg = C.bg */}
        <AbsoluteFill style={{ background: C.bg }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={T23.lead}>
            <AbsoluteFill style={{ background: C.bg, color: C.ink, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                {/* 段1：开源宣言 */}
                <div style={{ position: "absolute", left: act1X, top: act1Y, width: 900, opacity: 1 - second }}>
                  <div style={labelS}>{act1Label}</div>
                  <div style={{ fontSize: act1TitleSize, fontWeight: 600, lineHeight: 1.08, marginTop: 30 }}>
                    {act1Line1}<br /><span style={{ color: accent }}>{act1Line2}</span>
                  </div>
                  <div style={{ fontSize: 32, color: C.dim, marginTop: 30 }}>{act1Sub}</div>
                </div>
                {/* 段2：评论区扣词 CTA（弹出踩「口播」词锚，FIXED） */}
                <div style={{ position: "absolute", left: act2X, top: act2Y, width: 900, opacity: second * (1 - third) }}>
                  <div style={{ fontSize: act2TitleSize, fontWeight: 600 }}>{act2Title}</div>
                  <div style={{
                    marginTop: 45, display: "inline-flex", padding: "24px 48px", borderRadius: 999,
                    background: accent, color: "#fff", fontSize: pillSize, fontWeight: 700,
                    opacity: tw(t, PILL_AT, 0.12, power1Out),
                    transform: `scale(${lerp(0.8, 1, tw(t, PILL_AT, 0.3, backOut(1.7)))})`,
                  }}>{pillText}</div>
                </div>
                {/* 段3：23 格镜头回收网（stagger 踩「二十三」词锚，格网几何 FIXED） */}
                <div style={{ position: "absolute", left: act3X, top: act3Y, width: 980, opacity: third }}>
                  <div style={{ fontSize: 48, color: C.dim }}>{act3Kicker}</div>
                  <div style={{ fontSize: act3TitleSize, fontWeight: 600, marginTop: 25 }}>{act3Pre} <span style={{ color: accent, fontSize: 170 }}>{act3Num}</span> {act3Post}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 10, marginTop: 35, width: 920 }}>
                    {Array.from({ length: 23 }).map((_, i) => {
                      const p = tw(t, GRID_AT + i * 0.04, 0.25, power2Out);
                      return <div key={i} style={{
                        height: 52, borderRadius: 12,
                        background: i === 22 ? accent : (i % 3 === 0 ? C.dark : C.bgAlt),
                        color: i === 22 ? "#fff" : C.dim,
                        display: "grid", placeItems: "center", fontFamily: FONT.mono, fontSize: 17,
                        opacity: p, transform: `translateY(${(1 - p) * 14}px)`,
                      }}>{String(i + 1).padStart(2, "0")}</div>;
                    })}
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
  id: "kscene-s23",
  name: "开源 · CTA · 23 镜头回收",
  category: "口播镜头",
  durationInFrames: T23.total,
  accent: "#0066cc",
  component: KSceneS23 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "act1Label", label: "段1 · 眉头小字", default: "OPEN SOURCE" },
    { type: "text", key: "act1Line1", label: "段1 · 标题上行", default: "video-talkcraft" },
    { type: "text", key: "act1Line2", label: "段1 · 标题下行（强调色）", default: "78 张动效卡" },
    { type: "text", key: "act1Sub", label: "段1 · 副题", default: "全部开源 · 每张都有可播 demo" },
    { type: "slider", key: "act1TitleSize", label: "段1 · 标题字号", default: 82, min: 48, max: 120, step: 1, unit: "px" },
    { type: "number", key: "act1X", label: "段1 · 内容块 X", default: 130, step: 1, unit: "px" },
    { type: "number", key: "act1Y", label: "段1 · 内容块 Y", default: 180, step: 1, unit: "px" },
    { type: "text", key: "act2Title", label: "段2 · 标题", default: "想要的，评论区扣" },
    { type: "text", key: "pillText", label: "段2 · 弹出扣词", default: "口播" },
    { type: "slider", key: "act2TitleSize", label: "段2 · 标题字号", default: 56, min: 36, max: 90, step: 1, unit: "px" },
    { type: "slider", key: "pillSize", label: "段2 · 扣词字号", default: 90, min: 48, max: 130, step: 1, unit: "px" },
    { type: "number", key: "act2X", label: "段2 · 内容块 X", default: 140, step: 1, unit: "px" },
    { type: "number", key: "act2Y", label: "段2 · 内容块 Y", default: 230, step: 1, unit: "px" },
    { type: "text", key: "act3Kicker", label: "段3 · 眉头句", default: "你刚刚看完的这条视频" },
    { type: "text", key: "act3Pre", label: "段3 · 标题前段", default: "就是这" },
    { type: "text", key: "act3Num", label: "段3 · 大数字（强调色）", default: "23" },
    { type: "text", key: "act3Post", label: "段3 · 标题后段", default: "个镜头" },
    { type: "slider", key: "act3TitleSize", label: "段3 · 标题字号", default: 112, min: 64, max: 150, step: 1, unit: "px" },
    { type: "number", key: "act3X", label: "段3 · 内容块 X", default: 115, step: 1, unit: "px" },
    { type: "number", key: "act3Y", label: "段3 · 内容块 Y", default: 165, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "主色（强调/CTA/末格）", default: "#0066cc" },
  ],
};
