import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { SHOTS } from "@kbsrc/shots";
import { FONT } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";

// kscene-s11 · 讲到哪 · 亮到哪 —— Scene11（focus-dim-spotlight）逐镜参数化卡
// 结构与 koubo-units 的 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景。
// 已知边界（FIXED，不暴露）：词锚时刻 A(17,'亮')/A(17,'压暗')、聚焦切换节拍、
// 相机路径/冲量、辉光阴影——改文案后节拍仍按原配音词锚走，不随文字长度重排。

const IDX = 10; // SHOTS[10] = s11（80.32–86.36s，dark）
const { shot, lead, tail, total } = shotTiming(IDX);

// —— 词锚（PromoScenes 同式）：视觉节拍 = 字级时间戳 + 0.048s 混音补偿 ——
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const ST = (n: number): number => SHOTS[n - 1].start;
const S1: number = A(17, "亮") - ST(11);
const S2: number = A(17, "压暗") - ST(11);

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
  steps?: string;
  bgColor?: string;
  titleColor?: string;
  accentColor?: string;
  activeCardBg?: string;
  activeCardInk?: string;
  inactiveCardBg?: string;
  inactiveCardInk?: string;
  titleSize?: number;
  stepSize?: number;
  posX?: number;
  posY?: number;
}

const KSceneS11: React.FC<Props> = ({
  title = "我讲到哪，观众就得看哪",
  steps = "输入稿子\n匹配动效\n审片重做",
  bgColor = "#17171b",       // C.dark（shot.dark → Shell 深底）
  titleColor = "#f5f5f7",    // C.lightInk（Shell 深底文字色）
  accentColor = "#0066cc",   // C.accent（聚焦卡 STEP 编号）
  activeCardBg = "#ffffff",
  activeCardInk = "#1d1d1f", // C.ink
  inactiveCardBg = "#25252b",
  inactiveCardInk = "#77777f",
  titleSize = 64,
  stepSize = 46,
  posX = 160,
  posY = 170,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / 30;
  const items = steps.split("\n").map((s) => s.trim()).filter(Boolean);
  const active = Math.min(t < S1 ? 0 : t < S2 ? 1 : 2, items.length - 1);
  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: titleColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                {/* 原 Scene11 版式：left:160/top:170/right:160 → posX/posY + 定宽 1600（默认逐像素一致） */}
                <div style={{ position: "absolute", left: posX, top: posY, width: 1600 }}>
                  <div style={{ fontSize: titleSize, fontWeight: 600 }}>{title}</div>
                  <div style={{ display: "flex", gap: 34, marginTop: 100 }}>
                    {items.map((x, i) => (
                      <div
                        key={`${i}-${x}`}
                        style={{
                          width: 470, height: 350, borderRadius: 28,
                          background: i === active ? activeCardBg : inactiveCardBg,
                          color: i === active ? activeCardInk : inactiveCardInk,
                          display: "grid", placeItems: "center", position: "relative",
                          transform: `scale(${i === active ? 1.05 : 0.96})`,
                          boxShadow: i === active ? "0 0 90px rgba(41,151,255,.30)" : "none",
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: FONT.mono, fontSize: 24, color: i === active ? accentColor : "#666" }}>
                            STEP {String(i + 1).padStart(2, "0")}
                          </div>
                          <div style={{ fontSize: stepSize, fontWeight: 600, marginTop: 25 }}>{x}</div>
                        </div>
                      </div>
                    ))}
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
  id: "kscene-s11",
  name: "讲到哪 · 亮到哪",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#2997ff",
  component: KSceneS11 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "标题", default: "我讲到哪，观众就得看哪" },
    { type: "textarea", key: "steps", label: "步骤卡（每行一张；STEP 编号自动生成）", default: "输入稿子\n匹配动效\n审片重做" },
    { type: "color", key: "bgColor", label: "底色", default: "#17171b" },
    { type: "color", key: "titleColor", label: "标题色", default: "#f5f5f7" },
    { type: "color", key: "accentColor", label: "强调色（STEP 编号）", default: "#0066cc" },
    { type: "color", key: "activeCardBg", label: "聚焦卡底色", default: "#ffffff" },
    { type: "color", key: "activeCardInk", label: "聚焦卡文字色", default: "#1d1d1f" },
    { type: "color", key: "inactiveCardBg", label: "压暗卡底色", default: "#25252b" },
    { type: "color", key: "inactiveCardInk", label: "压暗卡文字色", default: "#77777f" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 64, min: 40, max: 96, step: 1, unit: "px" },
    { type: "slider", key: "stepSize", label: "步骤字号", default: 46, min: 28, max: 68, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 160, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 170, step: 1, unit: "px" },
  ],
};
