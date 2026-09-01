import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { atChar } from "@kbsrc/timing";
import { C, FONT, RADII, SHADOW_EVIDENCE } from "@kbsrc/theme";

// kscene-s08 · 口播成片 Scene08「三站巡航」逐镜参数化卡
// 真实长页在浏览器窗内随「巡航」下滚，三次停靠各套一枚 STOP 环。
// 结构与 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景内容。
// 已知边界（FIXED，不暴露）：词锚（A(13,'巡航'/'三个'/'停靠')）、停靠节奏、相机路径——
// 换长图后停靠 Y 需按新图实测填写；节拍仍按原配音词锚走。默认值与原成片逐像素一致。
const FPS = 30;
const IDX = 7; // s08
const { shot: SHOT, lead: LEAD, tail: TAIL, total: TOTAL } = shotTiming(IDX);

// —— 词锚（+48ms 混音补偿）——
const AV = 0.048;
const A = (si: number, q: string, occ = 0) => (atChar(si, q, occ) as number) + AV;
const CR = A(13, "巡航") - SHOT.start;
const A1 = A(13, "三个") - SHOT.start;
const A2 = A(13, "停靠") - SHOT.start;
const A3 = A2 + 0.45; // 停靠03 需在转场吞掉前站稳
const H1 = Math.min(0.28, (A2 - A1) * 0.45);
const H2 = Math.min(0.28, (A3 - A2) * 0.45);

// —— PromoScenes 顶部共享 helpers（逐字同式复制）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
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
  image?: string;
  imgNaturalW?: number;
  stopsY?: string;
  stopPrefix?: string;
  stopFontSize?: number;
  accentColor?: string;
  viewportBg?: string;
  posX?: number;
  posY?: number;
}

const SceneS08: React.FC<Props> = ({
  bgColor = "#ffffff",
  image = "shots/gallery-full.png",
  imgNaturalW = 1425,
  stopsY = "795,2158,2970",
  stopPrefix = "STOP 0",
  stopFontSize = 20,
  accentColor = "#0066cc",
  viewportBg = "#0b0b0f",
  posX = 340,
  posY = 120,
}) => {
  const t = (useCurrentFrame() - LEAD) / FPS;
  const IW = 1040, SC = IW / (imgNaturalW || 1425), HEADY = 140;
  // 停靠点 Y（源图像素）：取前 3 个，缺省补最后一位
  const parsed = stopsY.split(/[,，\s]+/).map(Number).filter((n) => Number.isFinite(n));
  while (parsed.length < 3) parsed.push(parsed[parsed.length - 1] ?? 0);
  const SECY = parsed.slice(0, 3);
  const ys = SECY.map((y) => -(y * SC - HEADY));
  const ty = interpolate(t, [CR, A1, A1 + H1, A2, A2 + H2, A3], [0, ys[0], ys[0], ys[1], ys[1], ys[2]], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const inP = ease(t, 0.25, 0.7);
  const stops = [A1, A2, A3];
  return (
    <KScale>
      <Envelope lead={LEAD} tail={TAIL} total={TOTAL}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={SHOT.path} impulses={SHOT.impulses} durationSec={SHOT.end - SHOT.start} leadFrames={LEAD}>
            <AbsoluteFill style={{ background: bgColor, color: C.ink, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: IW, height: 820, opacity: inP }}>
                  <BrowserCard style={{ height: 800 }}>
                    <div style={{ position: "relative", height: 746, overflow: "hidden", background: viewportBg }}>
                      <Img src={staticFile(image)} style={{ position: "absolute", left: 0, top: ty, width: IW }} />
                      {stops.map((at, i) => {
                        // 环钉在分区标题上（随页面滚动），进站途中 -0.25s 锁定亮起
                        const secTop = SECY[i] * SC + ty;
                        const on = tw(t, at - 0.25, 0.25, power2Out) * (i < 2 ? 1 - tw(t, stops[i + 1] - 0.35, 0.25, power1Out) : 1);
                        return (
                          <React.Fragment key={i}>
                            <div style={{ position: "absolute", left: 16, top: secTop - 16, width: 330, height: 66, border: `3px solid ${accentColor}`, borderRadius: 14, opacity: on, transform: `scale(${lerp(1.12, 1, tw(t, at - 0.25, 0.28, power2Out))})` }} />
                            <div style={{ position: "absolute", left: 366, top: secTop - 2, padding: "6px 14px", borderRadius: 999, background: accentColor, color: "#fff", fontFamily: FONT.mono, fontSize: stopFontSize, fontWeight: 600, opacity: on }}>{stopPrefix}{i + 1}</div>
                          </React.Fragment>
                        );
                      })}
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
  id: "kscene-s08",
  name: "三站巡航",
  category: "口播镜头",
  durationInFrames: TOTAL,
  accent: "#0066cc",
  component: SceneS08 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "image", label: "长页截图（public/ 下）", default: "shots/gallery-full.png" },
    { type: "number", key: "imgNaturalW", label: "长图原始宽度", default: 1425, step: 1, unit: "px" },
    { type: "text", key: "stopsY", label: "三个停靠点 Y（源图像素，逗号分隔）", default: "795,2158,2970" },
    { type: "text", key: "stopPrefix", label: "停靠标签前缀（后接序号 1/2/3）", default: "STOP 0" },
    { type: "slider", key: "stopFontSize", label: "停靠标签字号", default: 20, min: 12, max: 36, step: 1, unit: "px" },
    { type: "color", key: "accentColor", label: "停靠环/标签颜色", default: "#0066cc" },
    { type: "color", key: "viewportBg", label: "窗内底色", default: "#0b0b0f" },
    { type: "color", key: "bgColor", label: "底色", default: "#ffffff" },
    { type: "number", key: "posX", label: "内容块 X", default: 340, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 120, step: 1, unit: "px" },
  ],
};
