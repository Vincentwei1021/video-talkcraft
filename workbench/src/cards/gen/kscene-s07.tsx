import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { atChar } from "@kbsrc/timing";
import { C, FONT, RADII, SHADOW_EVIDENCE } from "@kbsrc/theme";

// kscene-s07 · 口播成片 Scene07「证据卡与 3D 页面」逐镜参数化卡
// 结构与 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景内容。
// 已知边界（FIXED，不暴露）：词锚（A(10,'红线')/A(12,'立起来')）、句10 清台时刻（绝对 57.4s）、
// 滑入/退场/翻立时长、相机路径——改文案后节拍仍按原配音词锚走。默认值与原成片逐像素一致。
const FPS = 30;
const IDX = 6; // s07
const { shot: SHOT, lead: LEAD, tail: TAIL, total: TOTAL } = shotTiming(IDX);

// —— 词锚（+48ms 混音补偿）——
const AV = 0.048;
const A = (si: number, q: string, occ = 0) => (atChar(si, q, occ) as number) + AV;
const LINE_AT = A(10, "红线") - SHOT.start;
const EXIT_AT = 57.4 - SHOT.start + 0.05; // 句10 结束后 ≤0.5s 清台
const TILT_AT = A(12, "立起来") - SHOT.start;

// —— PromoScenes 顶部共享 helpers（逐字同式复制）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const cardStyle: React.CSSProperties = { background: "#fff", border: `1px solid ${C.hairline}`, borderRadius: RADII.card };
const labelStyle: React.CSSProperties = { fontFamily: FONT.mono, fontSize: 22, letterSpacing: 0.6, color: C.accent, fontWeight: 600 };
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
  kicker?: string;
  kickerColor?: string;
  headTop?: string;
  headLead?: string;
  headSweep?: string;
  headSize?: number;
  lineColor?: string;
  footer?: string;
  footColor?: string;
  pageImage?: string;
  posX?: number;
  posY?: number;
}

const SceneS07: React.FC<Props> = ({
  bgColor = "#f5f5f7",
  title = "报道卡滑上桌，重点自己被扫到",
  titleSize = 60,
  titleColor = "#1d1d1f",
  kicker = "PRODUCT WEEKLY",
  kickerColor = "#0066cc",
  headTop = "Agent 让口播动效",
  headLead = "进入",
  headSweep = "可复用时代",
  headSize = 56,
  lineColor = "#d70015",
  footer = "报道 · 产品 · 视觉系统",
  footColor = "#6e6e73",
  pageImage = "shots/gallery.png",
  posX = 130,
  posY = 155,
}) => {
  const t = (useCurrentFrame() - LEAD) / FPS;
  const inP = ease(t, 0.3, 0.75);
  const lineP = tw(t, LINE_AT, 0.65, power2Out);
  const exit = tw(t, EXIT_AT, 0.32, power2In);
  const pageIn = tw(t, 5.55, 0.5, power2Out);
  const tilt = tw(t, TILT_AT, 0.6, power2Out);
  return (
    <KScale>
      <Envelope lead={LEAD} tail={TAIL} total={TOTAL}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={SHOT.path} impulses={SHOT.impulses} durationSec={SHOT.end - SHOT.start} leadFrames={LEAD}>
            <AbsoluteFill style={{ background: bgColor, color: C.ink, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, right: 130 }}>
                  {exit < 1 && <div style={{ fontSize: titleSize, fontWeight: 600, color: titleColor, opacity: inP * (1 - exit) }}>{title}</div>}
                  {exit < 1 && (
                    <div style={{ position: "absolute", left: 60, top: 150, width: 800, height: 490, ...cardStyle, boxShadow: SHADOW_EVIDENCE, padding: 44, opacity: inP * (1 - exit), transform: `translateX(${(1 - inP) * 140 - exit * 340}px) rotate(${-2 - exit * 6}deg)` }}>
                      <div style={{ ...labelStyle, color: kickerColor }}>{kicker}</div>
                      {/* 口播明说「红线扫过」——这根线的颜色可调（默认成片红） */}
                      <div style={{ fontSize: headSize, fontWeight: 600, lineHeight: 1.18, marginTop: 45 }}>
                        {headTop}<br />{headLead}
                        <span style={{ position: "relative" }}>
                          {headSweep}
                          <i style={{ position: "absolute", left: 0, right: 0, bottom: -8, height: 8, background: lineColor, transform: `scaleX(${lineP})`, transformOrigin: "left" }} />
                        </span>
                      </div>
                      <div style={{ fontSize: 26, color: footColor, marginTop: 38 }}>{footer}</div>
                    </div>
                  )}
                  <div style={{ position: "absolute", left: 400, top: 120, width: 880, height: 580, perspective: 1100, opacity: pageIn }}>
                    <div style={{ width: "100%", height: "100%", transform: `translateY(${(1 - pageIn) * 40}px) rotateY(${tilt * -16}deg) rotateX(${tilt * 4}deg)`, transformStyle: "preserve-3d", boxShadow: tilt > 0 ? `0 ${20 + tilt * 30}px ${60 + tilt * 50}px rgba(0,0,0,${0.18 + tilt * 0.12})` : SHADOW_EVIDENCE, borderRadius: RADII.card }}>
                      <BrowserCard style={{ height: "100%" }}>
                        <Img src={staticFile(pageImage)} style={{ width: "100%", height: 526, objectFit: "cover", objectPosition: "top" }} />
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
  id: "kscene-s07",
  name: "证据卡与 3D 页面",
  category: "口播镜头",
  durationInFrames: TOTAL,
  accent: "#d70015",
  component: SceneS07 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "标题", default: "报道卡滑上桌，重点自己被扫到" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 60, min: 36, max: 96, step: 1, unit: "px" },
    { type: "color", key: "titleColor", label: "标题颜色", default: "#1d1d1f" },
    { type: "text", key: "kicker", label: "报道卡眉题", default: "PRODUCT WEEKLY" },
    { type: "color", key: "kickerColor", label: "眉题颜色", default: "#0066cc" },
    { type: "text", key: "headTop", label: "报道标题·第一行", default: "Agent 让口播动效" },
    { type: "text", key: "headLead", label: "报道标题·第二行前缀", default: "进入" },
    { type: "text", key: "headSweep", label: "报道标题·红线扫过的词", default: "可复用时代" },
    { type: "slider", key: "headSize", label: "报道标题字号", default: 56, min: 32, max: 84, step: 1, unit: "px" },
    { type: "color", key: "lineColor", label: "扫线颜色", default: "#d70015" },
    { type: "text", key: "footer", label: "报道卡脚注", default: "报道 · 产品 · 视觉系统" },
    { type: "color", key: "footColor", label: "脚注颜色", default: "#6e6e73" },
    { type: "text", key: "pageImage", label: "3D 页面截图（public/ 下）", default: "shots/gallery.png" },
    { type: "color", key: "bgColor", label: "底色", default: "#f5f5f7" },
    { type: "number", key: "posX", label: "内容块 X", default: 130, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 155, step: 1, unit: "px" },
  ],
};
