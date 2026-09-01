import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { SHOTS } from "@kbsrc/shots";
import { C, FONT } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";

// kscene-s15 · 数字与趋势同拍 —— Scene15（metric-with-sparkline）逐镜参数化卡
// 结构与 koubo-units 的 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景。
// slug 命中 GRID_SLUGS → Plane depth .5 铺网格（与原 Shell 一致）。
// 已知边界（FIXED，不暴露）：词锚 A(21,'滚上去')/A(21,'折线')、数字滚动/描线时长、
// 折线路径形状、相机路径/冲量——改文案后节拍仍按原配音词锚走。

const IDX = 14; // SHOTS[14] = s15（95.58–101.64s，浅底 + 网格）
const { shot, lead, tail, total } = shotTiming(IDX);

// —— PromoScenes 顶部 helpers（按需复制）——
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const Grid: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <AbsoluteFill style={{ opacity: dark ? 0.12 : 0.055, backgroundImage: `linear-gradient(${dark ? "#fff" : C.ink} 1px,transparent 1px),linear-gradient(90deg,${dark ? "#fff" : C.ink} 1px,transparent 1px)`, backgroundSize: "100px 100px", maskImage: "radial-gradient(75% 78% at 50% 45%,#000 35%,transparent 88%)" }} />
);
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const ST = (n: number): number => SHOTS[n - 1].start;
const ROLL_AT: number = A(21, "滚上去") - ST(15);
const LINE_AT: number = A(21, "折线") - ST(15);

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
  eyebrow?: string;
  targetValue?: number;
  caption?: string;
  badgeText?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  badgeBg?: string;
  eyebrowSize?: number;
  numberSize?: number;
  captionSize?: number;
  badgeSize?: number;
  posX?: number;
  posY?: number;
}

const KSceneS15: React.FC<Props> = ({
  eyebrow = "MOTION LIBRARY",
  targetValue = 78,
  caption = "张动效配方卡",
  badgeText = "↗ 持续增长",
  bgColor = "#ffffff",     // C.bg（非 dark、非 ACT_ALT 幕）
  textColor = "#1d1d1f",   // C.ink（Shell 文字色，说明行继承）
  accentColor = "#0066cc", // C.accent（眉头/大数字/折线/角标文字）
  badgeBg = "#dbeeff",     // C.accentSoft
  eyebrowSize = 22,
  numberSize = 170,
  captionSize = 44,
  badgeSize = 26,
  posX = 180,
  posY = 180,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / 30;
  const p = tw(t, ROLL_AT - 0.55, 0.9, power2Out);
  const lineP = tw(t, LINE_AT - 0.35, 1.1, power2Out);
  const n = Math.round(targetValue * p);
  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: textColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={0.5}><Grid /></Plane>
              <Plane depth={1}>
                {/* 原 Scene15 版式：left:180/top:180/right:180 → posX/posY + 定宽 1560（默认逐像素一致） */}
                <div style={{ position: "absolute", left: posX, top: posY, width: 1560 }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 120 }}>
                    <div>
                      <div style={{ fontFamily: FONT.mono, fontSize: eyebrowSize, letterSpacing: 0.6, color: accentColor, fontWeight: 600 }}>{eyebrow}</div>
                      <div style={{ fontSize: numberSize, fontWeight: 600, color: accentColor, lineHeight: 1, marginTop: 25, fontVariantNumeric: "tabular-nums" }}>{n}</div>
                      <div style={{ fontSize: captionSize, fontWeight: 600 }}>{caption}</div>
                    </div>
                    <svg width="750" height="420">
                      <path d="M20 360 C140 330 170 350 250 270 S390 245 460 180 S600 155 710 55" fill="none" stroke={accentColor} strokeWidth="9" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset={1000 * (1 - lineP)} />
                      <path d="M20 360 L710 360" stroke={C.hairline} strokeWidth="2" />
                    </svg>
                  </div>
                  <div style={{ position: "absolute", right: 80, top: 110, padding: "14px 20px", borderRadius: 999, background: badgeBg, color: accentColor, fontSize: badgeSize, fontWeight: 600, opacity: tw(t, LINE_AT + 0.6, 0.3, power2Out) }}>{badgeText}</div>
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
  id: "kscene-s15",
  name: "数字与趋势同拍",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#0066cc",
  component: KSceneS15 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "eyebrow", label: "眉头（英文小标）", default: "MOTION LIBRARY" },
    { type: "number", key: "targetValue", label: "目标数字（滚动终值）", default: 78, min: 0, step: 1 },
    { type: "text", key: "caption", label: "数字说明", default: "张动效配方卡" },
    { type: "text", key: "badgeText", label: "角标文字", default: "↗ 持续增长" },
    { type: "color", key: "bgColor", label: "底色", default: "#ffffff" },
    { type: "color", key: "textColor", label: "说明文字色", default: "#1d1d1f" },
    { type: "color", key: "accentColor", label: "强调色（数字/折线/眉头）", default: "#0066cc" },
    { type: "color", key: "badgeBg", label: "角标底色", default: "#dbeeff" },
    { type: "slider", key: "eyebrowSize", label: "眉头字号", default: 22, min: 14, max: 34, step: 1, unit: "px" },
    { type: "slider", key: "numberSize", label: "数字字号", default: 170, min: 100, max: 240, step: 1, unit: "px" },
    { type: "slider", key: "captionSize", label: "说明字号", default: 44, min: 28, max: 64, step: 1, unit: "px" },
    { type: "slider", key: "badgeSize", label: "角标字号", default: 26, min: 18, max: 40, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 180, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 180, step: 1, unit: "px" },
  ],
};
