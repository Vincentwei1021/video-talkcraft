import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { SHOTS } from "@kbsrc/shots";
import { C, FONT, RADII, SHADOW_EVIDENCE } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";

// kscene-s14 · 放大镜看细节 —— Scene14（magnifier-detail）逐镜参数化卡
// 结构与 koubo-units 的 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景。
// 已知边界（FIXED，不暴露）：词锚 A(20,'放大镜')、红框/连线/镜体的错峰时序、镜内摆动、
// 相机路径；目标词 rect（S14_IMG）按默认截图 shots/skill-page.png 逐像素标定——
// 换图后红框/镜心不再自动对准新图内容。本镜无可见文案，故无文字字段。

const IDX = 13; // SHOTS[13] = s14（92.56–95.58s，ACT_ALT → bgAlt）
const { shot, lead, tail, total } = shotTiming(IDX);

// —— PromoScenes 顶部 helpers（按需复制）——
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const cardBase: React.CSSProperties = { background: "#fff", border: `1px solid ${C.hairline}`, borderRadius: RADII.card };
const BrowserCard: React.FC<{ style?: React.CSSProperties; children?: React.ReactNode }> = ({ style, children }) => (
  <div style={{ ...cardBase, boxShadow: SHADOW_EVIDENCE, overflow: "hidden", ...style }}>
    <div style={{ height: 54, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderBottom: `1px solid ${C.hairline}`, background: "#fff" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((x) => <i key={x} style={{ width: 12, height: 12, borderRadius: 12, background: x }} />)}
      <div style={{ marginLeft: 18, width: "62%", height: 16, borderRadius: 8, background: C.bgAlt }} />
    </div>
    {children}
  </div>
);
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const ST = (n: number): number => SHOTS[n - 1].start;
const AT: number = A(20, "放大镜") - ST(14);

// skill-page.png 与目标词「必须带 idle 微动」实测 rect（源自 PromoScenes，FIXED）
const S14_IMG = { w: 1440, h: 960, tx: 1229.7, ty: 429.3, tw: 111.9, th: 19 };

// —— KouboShot 的包装组件（koubo-units 未导出，按原样复制）——
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
  imageSrc?: string;
  bgColor?: string;
  markColor?: string;
  lensBorderColor?: string;
  zoom?: number;
  posX?: number;
  posY?: number;
}

const KSceneS14: React.FC<Props> = ({
  imageSrc = "shots/skill-page.png",
  bgColor = "#f5f5f7",         // C.bgAlt（ACT_ALT 幕）
  markColor = "#ff4d4d",       // 目标红框 + 连线
  lensBorderColor = "#1d1d1f", // 放大镜镜圈
  zoom = 2.1,
  posX = 220,
  posY = 155,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / 30;
  const p = tw(t, AT, 0.30, power3Out);
  const boxP = tw(t, AT - 0.10, 0.20, power2Out);
  const dim = lerp(1, 0.84, tw(t, AT, 0.30, power1Out));
  const linkP = tw(t, AT + 0.25, 0.25, power2Out);
  const pan = t > AT + 0.55 ? 7 * Math.sin((t - AT - 0.55) * (Math.PI / 1.4)) : 0;
  const R = 150, IW = 1300, SC = IW / S14_IMG.w, CHROME = 54;
  // 目标框（图内坐标 → 场景坐标）
  const tg = { x: S14_IMG.tx * SC, y: CHROME + S14_IMG.ty * SC, w: S14_IMG.tw * SC, h: S14_IMG.th * SC };
  const tc = { x: tg.x + tg.w / 2, y: tg.y + tg.h / 2 };
  const lens = { x: lerp(tc.x, 760, p), y: lerp(tc.y, 300, p) }; // 镜从目标点弹出到落位
  const d = Math.hypot(lens.x - tc.x, lens.y - tc.y) || 1;
  const rim = { x: lens.x - ((lens.x - tc.x) / d) * R, y: lens.y - ((lens.y - tc.y) / d) * R }; // 连线终点 = 镜缘朝目标一侧
  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: C.ink, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: IW, height: 760 }}>
                  <div style={{ filter: `brightness(${dim})` }}>
                    <BrowserCard style={{ height: 700 }}>
                      <Img src={staticFile(imageSrc)} style={{ width: IW, display: "block" }} />
                    </BrowserCard>
                  </div>
                  <div style={{ position: "absolute", left: tg.x - 8, top: tg.y - 6, width: tg.w + 16, height: tg.h + 12, border: `2px solid ${markColor}`, borderRadius: 6, opacity: boxP }} />
                  <svg width={IW} height="760" style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
                    <line x1={tg.x - 8} y1={tc.y} x2={lerp(tg.x - 8, rim.x, linkP)} y2={lerp(tc.y, rim.y, linkP)} stroke={markColor} strokeWidth="3" opacity={linkP > 0 ? 0.9 : 0} />
                  </svg>
                  <div style={{ position: "absolute", left: lens.x - R, top: lens.y - R, width: R * 2, height: R * 2, borderRadius: R * 2, border: `3px solid ${lensBorderColor}`, boxShadow: "0 20px 60px rgba(0,0,0,.30)", overflow: "hidden", background: "#fff", opacity: p, transform: `scale(${lerp(0.55, 1, p)})` }}>
                    {/* 镜内 = 同一张截图的放大克隆：目标中心映射到镜心，像素一致 */}
                    <Img src={staticFile(imageSrc)} style={{ position: "absolute", width: IW * zoom, left: R - (S14_IMG.tx + S14_IMG.tw / 2) * SC * zoom + pan * -zoom, top: R - (S14_IMG.ty + S14_IMG.th / 2) * SC * zoom }} />
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
  id: "kscene-s14",
  name: "放大镜看细节",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#ff4d4d",
  component: KSceneS14 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "imageSrc", label: "页面截图（public/ 下；目标框按默认图标定）", default: "shots/skill-page.png" },
    { type: "color", key: "bgColor", label: "底色", default: "#f5f5f7" },
    { type: "color", key: "markColor", label: "目标框/连线颜色", default: "#ff4d4d" },
    { type: "color", key: "lensBorderColor", label: "镜圈颜色", default: "#1d1d1f" },
    { type: "slider", key: "zoom", label: "放大倍率", default: 2.1, min: 1.4, max: 3.2, step: 0.05 },
    { type: "number", key: "posX", label: "内容块 X", default: 220, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 155, step: 1, unit: "px" },
  ],
};
