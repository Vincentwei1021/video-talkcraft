import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { SHOTS } from "@kbsrc/shots";
import { C, FONT, RADII, SHADOW_EVIDENCE } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";

// kscene-s13 · 引线标注 —— Scene13（callout-line-label）逐镜参数化卡
// 结构与 koubo-units 的 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景。
// 已知边界（FIXED，不暴露）：词锚 A(19,'引线')、锚点 pop/涟漪/描线/标签展开的错峰时序、
// 折线路径与按钮/标签的相对几何、相机路径——改文案后节拍仍按原配音词锚走。

const IDX = 12; // SHOTS[12] = s13（89.06–92.56s，ACT_ALT → bgAlt）
const { shot, lead, tail, total } = shotTiming(IDX);

// —— PromoScenes 顶部 helpers（按需复制）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const rise = (p: number, y = 34): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * y}px) scale(${0.97 + 0.03 * p})` });
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const backOut = (s = 1.70158) => (x: number) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
const cardBase: React.CSSProperties = { background: "#fff", border: `1px solid ${C.hairline}`, borderRadius: RADII.card };
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const ST = (n: number): number => SHOTS[n - 1].start;
const DOT_AT: number = A(19, "引线") - ST(13);

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
  title?: string;
  buttonText?: string;
  labelText?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  titleSize?: number;
  buttonSize?: number;
  labelSize?: number;
  posX?: number;
  posY?: number;
}

const KSceneS13: React.FC<Props> = ({
  title = "按钮旁边，长出一根引线",
  buttonText = "自动生成",
  labelText = "Agent 自动配卡",
  bgColor = "#f5f5f7",     // C.bgAlt（ACT_ALT 幕）
  textColor = "#1d1d1f",   // C.ink（Shell 文字色，标题继承）
  accentColor = "#0066cc", // C.accent（按钮底/锚点/涟漪/折线）
  titleSize = 62,
  buttonSize = 50,
  labelSize = 48,
  posX = 210,
  posY = 165,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / 30;
  const dot = tw(t, DOT_AT, 0.20, backOut(2.2));
  const ripple = tw(t, DOT_AT + 0.05, 0.5, power2Out);
  const line = tw(t, DOT_AT + 0.20, 0.40, power2Out);
  const lab = tw(t, DOT_AT + 0.60, 0.25, power3Out);
  const labTx = tw(t, DOT_AT + 0.70, 0.20, power1Out);
  const LINE_LEN = 560;
  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: textColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: 1320, height: 720 }}>
                  <div style={{ fontSize: titleSize, fontWeight: 600, ...rise(ease(t, 0.2, 0.55), 16) }}>{title}</div>
                  <div style={{ position: "absolute", left: 230, top: 295, width: 420, height: 150, borderRadius: 999, background: accentColor, color: "#fff", display: "grid", placeItems: "center", fontSize: buttonSize, fontWeight: 600 }}>{buttonText}</div>
                  <svg width="760" height="360" style={{ position: "absolute", left: 640, top: 150, overflow: "visible" }}>
                    <circle cx="14" cy="220" r="26" fill="none" stroke={accentColor} strokeWidth="3" opacity={Math.max(0, 0.9 - ripple * 0.9)} transform={`translate(${14 * (1 - lerp(0.4, 3.2, ripple)) * 0} 0) scale(${lerp(0.4, 3.2, ripple)})`} style={{ transformOrigin: "14px 220px" }} />
                    <path d="M14 220 C190 214 210 70 430 70" fill="none" stroke={accentColor} strokeWidth="6" strokeLinecap="round" pathLength={LINE_LEN} strokeDasharray={LINE_LEN} strokeDashoffset={LINE_LEN * (1 - line)} />
                    <circle cx="14" cy="220" r="11" fill={accentColor} transform={`scale(${dot})`} style={{ transformOrigin: "14px 220px" }} />
                  </svg>
                  <div style={{ position: "absolute", left: 1075, top: 180, width: 445, ...cardBase, padding: "34px 38px", clipPath: `inset(0% ${(1 - lab) * 100}% 0% 0%)`, boxShadow: SHADOW_EVIDENCE }}>
                    <div style={{ fontSize: labelSize, fontWeight: 600, opacity: labTx }}>{labelText}</div>
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
  id: "kscene-s13",
  name: "引线标注",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#0066cc",
  component: KSceneS13 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "标题", default: "按钮旁边，长出一根引线" },
    { type: "text", key: "buttonText", label: "按钮文字", default: "自动生成" },
    { type: "text", key: "labelText", label: "标注卡文字", default: "Agent 自动配卡" },
    { type: "color", key: "bgColor", label: "底色", default: "#f5f5f7" },
    { type: "color", key: "textColor", label: "标题色", default: "#1d1d1f" },
    { type: "color", key: "accentColor", label: "强调色（按钮/引线/锚点）", default: "#0066cc" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 62, min: 40, max: 90, step: 1, unit: "px" },
    { type: "slider", key: "buttonSize", label: "按钮字号", default: 50, min: 32, max: 72, step: 1, unit: "px" },
    { type: "slider", key: "labelSize", label: "标注字号", default: 48, min: 30, max: 68, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 210, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 165, step: 1, unit: "px" },
  ],
};
