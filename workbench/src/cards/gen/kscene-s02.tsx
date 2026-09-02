import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT, RADII, SHADOW_EVIDENCE } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";
import { SHOTS } from "@kbsrc/shots";

// kscene-s02 · 口播成片 S02「横屏 · 竖屏 · 无人物」逐镜参数化卡
// 已知边界：三张卡踩「这样」词锚（A(2,'这样',i)）与动画时长/错峰、相机路径全部 FIXED——
// 改文案后节拍仍按原配音词锚走。卡内视频片段（clip-h/v/m.mp4）为成片素材，不参数化。
// 默认值渲染与原成片 PromoScene(Shell+Scene02) 逐像素一致。

const FPS = 30;
const IDX = 1; // s02
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
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const rise = (p: number, y = 34): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * y}px) scale(${0.97 + 0.03 * p})` });
const cardBox: React.CSSProperties = { background: "#fff", border: `1px solid ${C.hairline}`, borderRadius: RADII.card };
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const backOut = (s = 1.70158) => (x: number) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

// 词级锚点：视觉节拍 = 字级时间戳 + 48ms 混音补偿（与成片 beats.json 同源）
const AV = 0.048;
const A = (si: number, q: string, occ = 0) => atChar(si, q, occ) + AV;
const ST = (n: number) => SHOTS[n - 1].start;

// 三张卡的素材/几何/节拍基准（FIXED）：真实成片片段，不许灰底 mock
const S02_CARDS = [
  { cap: "横屏", tag: "16:9", src: "shots/clip-h.mp4", mw: 420, mh: 238, rot: -3 },
  { cap: "竖屏", tag: "9:16", src: "shots/clip-v.mp4", mw: 156, mh: 289, rot: 2 },
  { cap: "无人物", tag: "MOTION ONLY", src: "shots/clip-m.mp4", mw: 404, mh: 213, rot: -2 },
];

interface Props {
  headingText?: string;
  cardsText?: string;
  bgColor?: string;
  inkColor?: string;
  headingSize?: number;
  capSize?: number;
  posX?: number;
  posY?: number;
}

// Scene02：三张卡分别踩在三个「这样」的字上；卡内是真实成片片段
const KSceneS02: React.FC<Props> = ({
  headingText = "同一份内容，三种画面",
  cardsText = "横屏|16:9\n竖屏|9:16\n无人物|MOTION ONLY",
  bgColor = "#ffffff",
  inkColor = "#1d1d1f",
  headingSize = 72,
  capSize = 32,
  posX = 150,
  posY = 180,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / FPS;
  const head = ease(t, 0.25, 0.6);
  const lines = cardsText.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: inkColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                {/* 原 left:150,right:150 → width 1620，随 posX/posY 整体平移 */}
                <div style={{ position: "absolute", left: posX, top: posY, width: 1620 }}>
                  <div style={{ fontSize: headingSize, fontWeight: 600, marginBottom: 62, ...rise(head, 20) }}>{headingText}</div>
                  <div style={{ display: "flex", gap: 42, alignItems: "center" }}>{S02_CARDS.map((x, i) => {
                    const [cap = x.cap, tag = x.tag] = (lines[i] ?? `${x.cap}|${x.tag}`).split("|").map((s) => s.trim());
                    const at = A(2, "这样", i) - ST(2);
                    const op = tw(t, at, 0.15, power1Out);
                    const p = tw(t, at, 0.30, backOut(1.7));
                    return <div key={x.src} style={{ width: 460, height: 372, ...cardBox, opacity: op, transform: `rotate(${lerp(x.rot - 6, x.rot, p)}deg) scale(${lerp(0.8, 1, p)})`, transformOrigin: "50% 60%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18, boxShadow: SHADOW_EVIDENCE }}>
                      <div style={{ position: "relative", width: x.mw, height: x.mh, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.hairline}`, background: C.bgAlt }}>
                        <OffthreadVideo src={staticFile(x.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div style={{ position: "absolute", left: 8, top: 8, padding: "3px 10px", borderRadius: 999, background: "rgba(23,23,27,.62)", color: "#fff", fontFamily: FONT.mono, fontSize: 15, fontWeight: 600 }}>{tag}</div>
                      </div>
                      <div style={{ fontSize: capSize, fontWeight: 600 }}>{cap}</div>
                    </div>;
                  })}</div>
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
  id: "kscene-s02",
  name: "横屏 · 竖屏 · 无人物",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#0066cc",
  component: KSceneS02 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "headingText", label: "大标题", default: "同一份内容，三种画面" },
    { type: "textarea", key: "cardsText", label: "三张卡文案（每行：标题|角标，共 3 行）", default: "横屏|16:9\n竖屏|9:16\n无人物|MOTION ONLY" },
    { type: "color", key: "bgColor", label: "底色", default: "#ffffff" },
    { type: "color", key: "inkColor", label: "正文墨色", default: "#1d1d1f" },
    { type: "slider", key: "headingSize", label: "大标题字号", default: 72, min: 40, max: 110, step: 1, unit: "px" },
    { type: "slider", key: "capSize", label: "卡片标题字号", default: 32, min: 20, max: 48, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 150, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 180, step: 1, unit: "px" },
  ],
};
