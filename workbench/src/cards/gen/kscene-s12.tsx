import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { SHOTS } from "@kbsrc/shots";
import { FONT } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";

// kscene-s12 · 荧光笔扫重点 —— Scene12（highlighter-sweep）逐镜参数化卡
// 结构与 koubo-units 的 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景。
// 已知边界（FIXED，不暴露）：词锚 A(18,'荧光笔')、扫过时长 0.65s、相机路径——
// 改文案后节拍仍按原配音词锚走，不随文字长度重排。
// 荧光条几何（高 35 / 底距 6 / 左右出血 -8）随标题字号等比缩放，默认字号下与原值逐像素一致。

const IDX = 11; // SHOTS[11] = s12（86.36–89.06s，ACT_ALT → bgAlt）
const { shot, lead, tail, total } = shotTiming(IDX);

// —— PromoScenes 顶部 helpers（按需复制）——
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const ST = (n: number): number => SHOTS[n - 1].start;
const HL_AT: number = A(18, "荧光笔") - ST(12);

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
  kicker?: string;
  headPrefix?: string;
  headMark?: string;
  footer?: string;
  bgColor?: string;
  textColor?: string;
  dimColor?: string;
  markerColor?: string;
  kickerSize?: number;
  headSize?: number;
  footSize?: number;
  posX?: number;
  posY?: number;
}

const KSceneS12: React.FC<Props> = ({
  kicker = "关键句上",
  headPrefix = "荧光笔",
  headMark = "扫过去",
  footer = "一句话只强调一个位置",
  bgColor = "#f5f5f7",     // C.bgAlt（ACT_ALT 幕）
  textColor = "#1d1d1f",   // C.ink（Shell 文字色，标题继承）
  dimColor = "#6e6e73",    // C.dim（引句/脚注）
  markerColor = "#ffe949", // C.marker
  kickerSize = 54,
  headSize = 104,
  footSize = 32,
  posX = 200,
  posY = 260,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / 30;
  const p = tw(t, HL_AT, 0.65, power2Out);
  const k = headSize / 104; // 荧光条几何随字号等比（默认 = 原值）
  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: textColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: 1280 }}>
                  <div style={{ fontSize: kickerSize, color: dimColor, marginBottom: 38 }}>{kicker}</div>
                  <div style={{ fontSize: headSize, fontWeight: 600, lineHeight: 1.18 }}>
                    {headPrefix}
                    <span style={{ position: "relative", display: "inline-block", zIndex: 1 }}>
                      {headMark}
                      <i style={{ position: "absolute", left: -8 * k, right: -8 * k, bottom: 6 * k, height: 35 * k, background: markerColor, opacity: 0.72, transform: `scaleX(${p}) rotate(-1deg)`, transformOrigin: "left", zIndex: -1 }} />
                    </span>
                  </div>
                  <div style={{ fontSize: footSize, color: dimColor, marginTop: 52 }}>{footer}</div>
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
  id: "kscene-s12",
  name: "荧光笔扫重点",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#ffe949",
  component: KSceneS12 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "kicker", label: "引句（标题上方）", default: "关键句上" },
    { type: "text", key: "headPrefix", label: "标题前段（不被荧光笔扫）", default: "荧光笔" },
    { type: "text", key: "headMark", label: "标题标记段（被荧光笔扫过）", default: "扫过去" },
    { type: "text", key: "footer", label: "脚注（标题下方）", default: "一句话只强调一个位置" },
    { type: "color", key: "bgColor", label: "底色", default: "#f5f5f7" },
    { type: "color", key: "textColor", label: "标题色", default: "#1d1d1f" },
    { type: "color", key: "dimColor", label: "引句/脚注色", default: "#6e6e73" },
    { type: "color", key: "markerColor", label: "荧光笔颜色", default: "#ffe949" },
    { type: "slider", key: "kickerSize", label: "引句字号", default: 54, min: 32, max: 80, step: 1, unit: "px" },
    { type: "slider", key: "headSize", label: "标题字号", default: 104, min: 60, max: 150, step: 1, unit: "px" },
    { type: "slider", key: "footSize", label: "脚注字号", default: 32, min: 20, max: 48, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 200, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 260, step: 1, unit: "px" },
  ],
};
