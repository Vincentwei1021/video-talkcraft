import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT, RADII, SHADOW_EVIDENCE } from "@kbsrc/theme";

// kscene-s10 · 口播成片 Scene10「镜头持续漂移」逐镜参数化卡（orbit-drift 原版）
// 3D 空间双正弦 90° 相位差环绕（不是平面摇摆），影子随环绕反向漂。
// 结构与 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景内容。
// 已知边界（FIXED，不暴露）：环绕周期/振幅/相位、影子参数、相机路径。
// 默认值渲染与原成片逐像素一致。
const FPS = 30;
const IDX = 9; // s10
const { shot: SHOT, lead: LEAD, tail: TAIL, total: TOTAL } = shotTiming(IDX);

// —— PromoScenes 顶部共享 helpers（逐字同式复制）——
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
  posX?: number;
  posY?: number;
}

const SceneS10: React.FC<Props> = ({
  bgColor = "#ffffff",
  title = "没重点的句子，画面也一直是活的",
  titleSize = 60,
  titleColor = "#1d1d1f",
  image = "shots/demo.png",
  posX = 260,
  posY = 150,
}) => {
  const t = (useCurrentFrame() - LEAD) / FPS;
  const P = 9, w = (2 * Math.PI) / P;
  const rotY = -8 + 6.2 * Math.sin(w * t);
  const rotX = 2.5 + 3.4 * Math.sin(w * t + Math.PI / 2);
  const z = 22 * Math.sin(w * t + 0.6 * 2 * Math.PI);
  return (
    <KScale>
      <Envelope lead={LEAD} tail={TAIL} total={TOTAL}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={SHOT.path} impulses={SHOT.impulses} durationSec={SHOT.end - SHOT.start} leadFrames={LEAD}>
            <AbsoluteFill style={{ background: bgColor, color: C.ink, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: 1250, height: 760 }}>
                  <div style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 40, color: titleColor }}>{title}</div>
                  <div style={{ position: "absolute", left: 0, top: 130, width: 1150, height: 580, perspective: 900, perspectiveOrigin: "50% 48%" }}>
                    <div style={{ position: "absolute", left: 75, top: 20, width: 1000, height: 540, transformStyle: "preserve-3d", transform: `translateZ(${z}px) rotateY(${rotY}deg) rotateX(${rotX}deg)` }}>
                      <div style={{ position: "absolute", inset: -6, borderRadius: 20, background: "#000", opacity: 0.14, filter: "blur(28px)", transform: `translate(${-Math.sin(w * t) * 20}px,${26 - Math.cos(w * t) * 8}px)` }} />
                      <BrowserCard style={{ position: "absolute", inset: 0 }}>
                        <Img src={staticFile(image)} style={{ width: "100%", height: 486, objectFit: "cover" }} />
                      </BrowserCard>
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
  id: "kscene-s10",
  name: "镜头持续漂移",
  category: "口播镜头",
  durationInFrames: TOTAL,
  accent: "#1d1d1f",
  component: SceneS10 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "标题", default: "没重点的句子，画面也一直是活的" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 60, min: 36, max: 96, step: 1, unit: "px" },
    { type: "color", key: "titleColor", label: "标题颜色", default: "#1d1d1f" },
    { type: "text", key: "image", label: "环绕页面截图（public/ 下）", default: "shots/demo.png" },
    { type: "color", key: "bgColor", label: "底色", default: "#ffffff" },
    { type: "number", key: "posX", label: "内容块 X", default: 260, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 150, step: 1, unit: "px" },
  ],
};
