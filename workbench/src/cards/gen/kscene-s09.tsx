import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT, RADII, SHADOW_EVIDENCE } from "@kbsrc/theme";

// kscene-s09 · 口播成片 Scene09「先细节 · 后全貌」逐镜参数化卡
// 细节起手、拉开是一整张真 gallery 看板——「拉开」由镜头路径（shots.ts 的 slow-pull path）完成。
// 结构与 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景内容。
// 已知边界（FIXED，不暴露）：相机拉开路径、标题淡入节奏——staticFile 素材路径保持 public/ 语义。
// 默认值渲染与原成片逐像素一致。
const FPS = 30;
const IDX = 8; // s09
const { shot: SHOT, lead: LEAD, tail: TAIL, total: TOTAL } = shotTiming(IDX);

// —— PromoScenes 顶部共享 helpers（逐字同式复制）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const cardStyle: React.CSSProperties = { background: "#fff", border: `1px solid ${C.hairline}`, borderRadius: RADII.card };
const BrowserCard: React.FC<{ style?: React.CSSProperties; children?: React.ReactNode }> = ({ style, children }) => (
  <div style={{ ...cardStyle, boxShadow: SHADOW_EVIDENCE, overflow: "hidden", ...style }}>
    <div style={{ height: 54, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderBottom: `1px solid ${C.hairline}`, background: "#fff" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((x) => <i key={x} style={{ width: 12, height: 12, borderRadius: 12, background: x }} />)}
      <div style={{ marginLeft: 18, width: "62%", height: 16, borderRadius: 8, background: C.bgAlt }} />
    </div>
    {children}
  </div>
);

// —— KouboShot 的包装组件（未导出，按约定复制）——
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
  bgColor?: string;
  title?: string;
  titleSize?: number;
  titleColor?: string;
  image?: string;
  imgW?: number;
  imgOffsetY?: number;
  viewportBg?: string;
  posX?: number;
  posY?: number;
}

const SceneS09: React.FC<Props> = ({
  bgColor = "#ffffff",
  title = "先咬死细节，再慢慢拉开",
  titleSize = 58,
  titleColor = "#1d1d1f",
  image = "shots/gallery-full.png",
  imgW = 1280,
  imgOffsetY = -620,
  viewportBg = "#0b0b0f",
  posX = 210,
  posY = 135,
}) => {
  const t = (useCurrentFrame() - LEAD) / FPS;
  return (
    <KScale>
      <Envelope lead={LEAD} tail={TAIL} total={TOTAL}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={SHOT.path} impulses={SHOT.impulses} durationSec={SHOT.end - SHOT.start} leadFrames={LEAD}>
            <AbsoluteFill style={{ background: bgColor, color: C.ink, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: 1280, height: 780 }}>
                  <div style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 30, color: titleColor, opacity: ease(t, 0.2, 0.6) }}>{title}</div>
                  <BrowserCard style={{ height: 650 }}>
                    <div style={{ position: "relative", height: 596, overflow: "hidden", background: viewportBg }}>
                      <Img src={staticFile(image)} style={{ position: "absolute", left: 0, top: imgOffsetY, width: imgW }} />
                    </div>
                  </BrowserCard>
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
  id: "kscene-s09",
  name: "先细节 · 后全貌",
  category: "口播镜头",
  durationInFrames: TOTAL,
  accent: "#0b0b0f",
  component: SceneS09 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "标题", default: "先咬死细节，再慢慢拉开" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 58, min: 36, max: 96, step: 1, unit: "px" },
    { type: "color", key: "titleColor", label: "标题颜色", default: "#1d1d1f" },
    { type: "text", key: "image", label: "看板长图（public/ 下）", default: "shots/gallery-full.png" },
    { type: "number", key: "imgW", label: "长图显示宽度", default: 1280, step: 1, unit: "px" },
    { type: "number", key: "imgOffsetY", label: "长图纵向偏移（负值上移）", default: -620, step: 1, unit: "px" },
    { type: "color", key: "viewportBg", label: "窗内底色", default: "#0b0b0f" },
    { type: "color", key: "bgColor", label: "底色", default: "#ffffff" },
    { type: "number", key: "posX", label: "内容块 X", default: 210, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 135, step: 1, unit: "px" },
  ],
};
