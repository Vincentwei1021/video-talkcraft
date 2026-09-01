import React from "react";
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import PencilCard from "@kbsrc/cards/pencil-sketch-draw";
import { FONT } from "@kbsrc/theme";

// kscene-s19 · 当场画出来 —— 口播成片 Scene19 的逐镜参数化卡（bgAlt 浅灰底）
// Scene19 整卡引入 pencil-sketch-draw（手握铅笔骑在笔迹生长端）：
// 笔迹路径/墨色与卡内收尾标签「稿子 → 成片」封装在原卡里，本卡不拆——保持与成片同源。
// 已知边界：标题 2.25s 进场（踩「画出来」语义拍）与三笔时间表全部 FIXED。
const FPS = 30;
const IDX = 18; // s19
const TIMING = shotTiming(IDX);

// —— PromoScenes 顶部 helpers（逐字同式复制）——
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);

// —— KouboShot 同构的包装件（koubo-units 未导出，按原样复制）——
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
  title?: string;
  titleColor?: string;
  bgColor?: string;
  titleSize?: number;
  titleX?: number;
  titleY?: number;
  sketchX?: number;
  sketchY?: number;
  sketchScale?: number;
}

const KsceneS19: React.FC<Props> = ({
  title = "想要手作感？当场画出来",
  titleColor = "#1d1d1f",
  bgColor = "#f5f5f7",
  titleSize = 60,
  titleX = 210,
  titleY = 126,
  sketchX = 150,
  sketchY = 152,
  sketchScale = 1.62,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - TIMING.lead) / FPS;

  // —— Scene19 原式（节拍 FIXED）：第一笔画完才进标题，手不与它相遇 ——
  const head = tw(t, 2.25, 0.35, power2Out);

  return (
    <KScale>
      <Envelope lead={TIMING.lead} tail={TIMING.tail} total={TIMING.total}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={TIMING.shot.path} impulses={TIMING.shot.impulses} durationSec={TIMING.shot.end - TIMING.shot.start} leadFrames={TIMING.lead}>
            <AbsoluteFill style={{ background: bgColor, color: titleColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: titleX, top: titleY, fontSize: titleSize, fontWeight: 600, color: titleColor, zIndex: 2, opacity: head, transform: `translateY(${(1 - head) * 14}px)` }}>{title}</div>
                <div style={{ position: "absolute", left: sketchX, top: sketchY, width: 960, height: 540, transform: `scale(${sketchScale})`, transformOrigin: "top left" }}>
                  <PencilCard handSrc={staticFile("shots/hand-pencil.png")} />
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
  id: "kscene-s19",
  name: "当场画出来",
  category: "口播镜头",
  durationInFrames: TIMING.total,
  accent: "#1d1d1f",
  component: KsceneS19 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "镜头标题", default: "想要手作感？当场画出来" },
    { type: "color", key: "titleColor", label: "标题文字色", default: "#1d1d1f" },
    { type: "color", key: "bgColor", label: "画面底色", default: "#f5f5f7" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 60, min: 36, max: 96, step: 1, unit: "px" },
    { type: "number", key: "titleX", label: "标题 X", default: 210, step: 1, unit: "px" },
    { type: "number", key: "titleY", label: "标题 Y", default: 126, step: 1, unit: "px" },
    { type: "number", key: "sketchX", label: "手绘画布 X", default: 150, step: 1, unit: "px" },
    { type: "number", key: "sketchY", label: "手绘画布 Y", default: 152, step: 1, unit: "px" },
    { type: "slider", key: "sketchScale", label: "手绘画布缩放", default: 1.62, min: 0.8, max: 2.4, step: 0.01 },
  ],
};
