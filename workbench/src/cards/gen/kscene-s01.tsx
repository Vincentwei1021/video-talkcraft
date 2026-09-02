import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";
import { SHOTS } from "@kbsrc/shots";

// kscene-s01 · 口播成片 S01「一个 skill 做完全部动效」逐镜参数化卡
// 已知边界：词锚时刻（A/ST）、动画时长/错峰、相机路径全部 FIXED——
// 改文案后节拍仍按原配音词锚走（新文案与配音语义可能对不上）。
// 默认值渲染与原成片 PromoScene(Shell+Scene01) 逐像素一致。

const FPS = 30;
const IDX = 0; // s01
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
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
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
  labelText?: string;
  titleAPre?: string;
  titleAAccent?: string;
  titleAPost?: string;
  kickerB?: string;
  titleBPre?: string;
  titleBAccent?: string;
  bgColor?: string;
  inkColor?: string;
  accentColor?: string;
  titleASize?: number;
  titleBSize?: number;
  posX?: number;
  posY?: number;
}

// Scene01：整句砸出(power4Out .2s 1.08→1) + 末词 punch + 四角收入；旧题完全退场后新题才进
const KSceneS01: React.FC<Props> = ({
  labelText = "EVERYONE IS ASKING",
  titleAPre = "有没有一个",
  titleAAccent = "口播动效",
  titleAPost = "的 skill？",
  kickerB = "你现在看到的所有动效",
  titleBPre = "全部由",
  titleBAccent = "Agent 完成",
  bgColor = "#ffffff",
  inkColor = "#1d1d1f",
  accentColor = "#0066cc",
  titleASize = 104,
  titleBSize = 112,
  posX = 132,
  posY = 236,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / FPS;

  const slamA = tw(t, 0.30, 0.20, power4Out);
  const wordA = tw(t, 0.60, 0.167, power3Out);
  const exitA = tw(t, A(0, "skill") - ST(1) + 0.35, 0.40, power2In); // 句0说完即整体退场，4.28前清台
  const bAt = A(1, "全部") - ST(1);
  const kickB = tw(t, 4.42, 0.30, power2Out);
  const slamB = tw(t, bAt, 0.20, power4Out);
  const wordB = tw(t, bAt + 0.30, 0.167, power3Out);
  const cornerP = tw(t, 0.30, 0.30, power2Out);
  const cornerOff = lerp(12, 0, cornerP);

  const labelStyle: React.CSSProperties = { fontFamily: FONT.mono, fontSize: 22, letterSpacing: 0.6, color: accentColor, fontWeight: 600 };
  // 原绝对坐标以 (132,236) 为基准整体平移：B 块 (132,300)、四角 (96/1000,132/905)
  const dx = posX - 132, dy = posY - 236;

  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: inkColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                {exitA < 1 && <div style={{ position: "absolute", left: posX, top: posY, width: 900, opacity: (1 - exitA) * slamA, filter: `blur(${exitA * 6}px)`, transform: `translateY(${exitA * -30}px) scale(${lerp(1.08, 1, slamA) * (1 - exitA * 0.06)})`, transformOrigin: "0% 50%" }}>
                  <div style={{ ...labelStyle, marginBottom: 26 }}>{labelText}</div>
                  <div style={{ fontSize: titleASize, fontWeight: 600, lineHeight: 1.08 }}>{titleAPre}<br /><span style={{ color: accentColor, display: "inline-block", transform: `scale(${lerp(1.15, 1, wordA)})`, transformOrigin: "0% 60%" }}>{titleAAccent}</span>{titleAPost}</div>
                </div>}
                {t >= 4.3 && <div style={{ position: "absolute", left: posX, top: posY + 64, width: 960 }}>
                  <div style={{ fontSize: 42, color: C.dim, marginBottom: 22, opacity: kickB, transform: `translateY(${(1 - kickB) * 10}px)` }}>{kickerB}</div>
                  <div style={{ fontSize: titleBSize, fontWeight: 600, lineHeight: 1.05, opacity: slamB, transform: `scale(${lerp(1.08, 1, slamB)})`, transformOrigin: "0% 50%" }}>{titleBPre}<br /><span style={{ color: accentColor, display: "inline-block", transform: `scale(${lerp(1.15, 1, wordB)})`, transformOrigin: "0% 60%" }}>{titleBAccent}</span></div>
                </div>}
                <Corner pos="tl" x={96 + dx} y={132 + dy} size={52} off={cornerOff} opacity={cornerP} color={accentColor} />
                <Corner pos="tr" x={1000 + dx} y={132 + dy} size={52} off={cornerOff} opacity={cornerP} color={accentColor} />
                <Corner pos="bl" x={96 + dx} y={905 + dy} size={52} off={cornerOff} opacity={cornerP} color={accentColor} />
                <Corner pos="br" x={1000 + dx} y={905 + dy} size={52} off={cornerOff} opacity={cornerP} color={accentColor} />
              </Plane>
            </AbsoluteFill>
          </CameraRig>
        </AbsoluteFill>
      </Envelope>
    </KScale>
  );
};

export const card: CardDef = {
  id: "kscene-s01",
  name: "一个 skill 做完全部动效",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#0066cc",
  component: KSceneS01 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "labelText", label: "眉题（英文小标）", default: "EVERYONE IS ASKING" },
    { type: "text", key: "titleAPre", label: "问句 · 首行", default: "有没有一个" },
    { type: "text", key: "titleAAccent", label: "问句 · 强调词（次行）", default: "口播动效" },
    { type: "text", key: "titleAPost", label: "问句 · 尾巴", default: "的 skill？" },
    { type: "text", key: "kickerB", label: "答句 · 引导行", default: "你现在看到的所有动效" },
    { type: "text", key: "titleBPre", label: "答句 · 首行", default: "全部由" },
    { type: "text", key: "titleBAccent", label: "答句 · 强调词（次行）", default: "Agent 完成" },
    { type: "color", key: "bgColor", label: "底色", default: "#ffffff" },
    { type: "color", key: "inkColor", label: "正文墨色", default: "#1d1d1f" },
    { type: "color", key: "accentColor", label: "强调色（词/眉题/取景框）", default: "#0066cc" },
    { type: "slider", key: "titleASize", label: "问句字号", default: 104, min: 60, max: 140, step: 1, unit: "px" },
    { type: "slider", key: "titleBSize", label: "答句字号", default: 112, min: 60, max: 150, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 132, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 236, step: 1, unit: "px" },
  ],
};
