import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";
import { SHOTS } from "@kbsrc/shots";

// kscene-s05 · 口播成片 S05「前三秒钩子与人名条」逐镜参数化卡
// 已知边界：砸屏踩「砸」、取景框收拢踩「一收」、色条踩「色条」、姓名揭示踩「姓名」——
// 词锚与动画时长/相机路径全部 FIXED，改文案后节拍仍按原配音词锚走。
// 底色为 ACT_ALT 幕间交替色 C.bgAlt（#f5f5f7）。
// 默认值渲染与原成片 PromoScene(Shell+Scene05) 逐像素一致。

const FPS = 30;
const IDX = 4; // s05
const { shot, lead, tail, total } = shotTiming(IDX);

// —— KouboShot 同款包装（KScale/Envelope 未导出，按原样复制）——
const SCALE = 960 / 1920;
const KScale: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: "0 0" }}>
      {children}
    </div>
  </AbsoluteFill>
);
const Envelope: React.FC<{ lead: number; tail: number; total: number; children: React.ReactNode }> =
  ({ lead: l, tail: tl, total: tt, children }) => {
    const frame = useCurrentFrame();
    let opacity = 1;
    if (l > 0) opacity *= interpolate(frame, [0, l], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
    if (tl > 0) opacity *= interpolate(frame, [tt - tl, tt], [1, 0], { extrapolateLeft: "clamp", easing: Easing.inOut(Easing.quad) });
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  };

// —— PromoScenes 顶部缓动 kit（逐字同式复制）——
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);
const power2In = (x: number) => x * x * x;

// 词级锚点：视觉节拍 = 字级时间戳 + 48ms 混音补偿（与成片 beats.json 同源）
const AV = 0.048;
const A = (si: number, q: string, occ = 0) => atChar(si, q, occ) + AV;
const ST = (n: number) => SHOTS[n - 1].start;

// 取景框角括号（PromoScenes 原版复制：border 技法，各角只留两条边）
const Corner: React.FC<{ pos: "tl" | "tr" | "bl" | "br"; x: number; y: number; size: number; off: number; opacity: number; color?: string; width?: number }> =
  ({ pos, x, y, size, off, opacity, color = C.accent, width = 4 }) => {
    const dx = pos === "tl" || pos === "bl" ? -1 : 1, dy = pos === "tl" || pos === "tr" ? -1 : 1;
    const b = `${width}px solid ${color}`;
    return <div style={{ position: "absolute", left: x, top: y, width: size, height: size, opacity,
      borderLeft: pos === "tl" || pos === "bl" ? b : undefined, borderRight: pos === "tr" || pos === "br" ? b : undefined,
      borderTop: pos === "tl" || pos === "tr" ? b : undefined, borderBottom: pos === "bl" || pos === "br" ? b : undefined,
      transform: `translate(${dx * off}px,${dy * off}px)` }} />;
  };

interface Props {
  titleLine1?: string;
  titleLine2?: string;
  subText?: string;
  nameText?: string;
  roleText?: string;
  bgColor?: string;
  inkColor?: string;
  accentColor?: string;
  roleColor?: string;
  titleSize?: number;
  nameSize?: number;
  posX?: number;
  posY?: number;
  nameX?: number;
  nameBottom?: number;
}

// Scene05：前半 impact-open 演示（砸+取景框收拢），完全退场后 lower-third-nameplate 原版设计进场
const KSceneS05: React.FC<Props> = ({
  titleLine1 = "开场第一句",
  titleLine2 = "直接砸屏幕",
  subText = "四角取景框往里一收 · 前三秒钩子完成",
  nameText = "Vincent",
  roleText = "video-talkcraft 作者",
  bgColor = "#f5f5f7",
  inkColor = "#1d1d1f",
  accentColor = "#0066cc",
  roleColor = "#8a8a8a",
  titleSize = 94,
  nameSize = 84,
  posX = 125,
  posY = 210,
  nameX = 130,
  nameBottom = 190,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / FPS;

  const slamAt = A(6, "砸") - ST(5), inAt = A(6, "一收") - ST(5), barAt = A(7, "色条") - ST(5);
  const slam = tw(t, slamAt, 0.20, power4Out);
  const collapse = tw(t, inAt, 0.30, power2Out);
  const exit = tw(t, barAt - 0.85, 0.55, power2In);
  const cornerP = tw(t, slamAt, 0.30, power2Out);
  const off = lerp(26, 12, cornerP) - 12 * collapse;
  // lower-third-nameplate 卡原版：色条 scaleX(power4Out .3s) → 姓名 clip → 头衔 +0.37s
  const nameAt = A(7, "姓名") - ST(5); // 姓名揭示踩「姓名」词锚（不跟色条连发）
  const bar = tw(t, barAt, 0.30, power4Out);
  const name = tw(t, nameAt, 0.25, power2Out);
  const title = tw(t, nameAt + 0.37, 0.25, power2Out);
  const clip = (s: number) => `inset(0% ${(1 - s) * 100}% 0% 0%)`;
  // 标题块原点 (125,210)；四角 (92/940,150/620) 随之整体平移
  const dx = posX - 125, dy = posY - 210;

  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: inkColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                {exit < 1 && <div style={{ position: "absolute", left: posX, top: posY, width: 880, opacity: (1 - exit) * slam, transform: `scale(${lerp(1.08, 1, slam) * (1 - exit * 0.07)})`, transformOrigin: "0% 40%", filter: `blur(${exit * 5}px)` }}>
                  <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 1.08 }}>{titleLine1}<br /><span style={{ color: accentColor }}>{titleLine2}</span></div>
                  <div style={{ fontSize: 30, color: C.dim, marginTop: 28, opacity: tw(t, inAt, 0.3, power2Out) }}>{subText}</div>
                </div>}
                {exit < 1 && <>
                  <Corner pos="tl" x={92 + dx} y={150 + dy} size={48} off={off} opacity={cornerP * (1 - exit)} color={accentColor} />
                  <Corner pos="tr" x={940 + dx} y={150 + dy} size={48} off={off} opacity={cornerP * (1 - exit)} color={accentColor} />
                  <Corner pos="bl" x={92 + dx} y={620 + dy} size={48} off={off} opacity={cornerP * (1 - exit)} color={accentColor} />
                  <Corner pos="br" x={940 + dx} y={620 + dy} size={48} off={off} opacity={cornerP * (1 - exit)} color={accentColor} />
                </>}
                <div style={{ position: "absolute", left: nameX, bottom: nameBottom }}>
                  <div style={{ fontSize: nameSize, fontWeight: 800, letterSpacing: 3, lineHeight: 1.15, clipPath: clip(name) }}>{nameText}</div>
                  <div style={{ height: 14, width: 560, background: inkColor, borderRadius: 4, margin: "18px 0", transform: `scaleX(${bar})`, transformOrigin: "left center" }} />
                  <div style={{ fontSize: 36, color: roleColor, letterSpacing: 2, clipPath: clip(title) }}>{roleText}</div>
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
  id: "kscene-s05",
  name: "前三秒钩子与人名条",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#0066cc",
  component: KSceneS05 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "titleLine1", label: "钩子标题 · 首行", default: "开场第一句" },
    { type: "text", key: "titleLine2", label: "钩子标题 · 次行（强调色）", default: "直接砸屏幕" },
    { type: "text", key: "subText", label: "钩子副行", default: "四角取景框往里一收 · 前三秒钩子完成" },
    { type: "text", key: "nameText", label: "人名条 · 姓名", default: "Vincent" },
    { type: "text", key: "roleText", label: "人名条 · 头衔", default: "video-talkcraft 作者" },
    { type: "color", key: "bgColor", label: "底色（幕间交替 bgAlt）", default: "#f5f5f7" },
    { type: "color", key: "inkColor", label: "正文墨色（姓名/色条）", default: "#1d1d1f" },
    { type: "color", key: "accentColor", label: "强调色（次行/取景框）", default: "#0066cc" },
    { type: "color", key: "roleColor", label: "头衔文字色", default: "#8a8a8a" },
    { type: "slider", key: "titleSize", label: "钩子标题字号", default: 94, min: 56, max: 130, step: 1, unit: "px" },
    { type: "slider", key: "nameSize", label: "姓名字号", default: 84, min: 48, max: 120, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "钩子块 X（含取景框）", default: 125, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "钩子块 Y（含取景框）", default: 210, step: 1, unit: "px" },
    { type: "number", key: "nameX", label: "人名条 X", default: 130, step: 1, unit: "px" },
    { type: "number", key: "nameBottom", label: "人名条距底", default: 190, step: 1, unit: "px" },
  ],
};
