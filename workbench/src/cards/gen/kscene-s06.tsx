import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { atChar } from "@kbsrc/timing";
import { C, FONT } from "@kbsrc/theme";

// kscene-s06 · 口播成片 Scene06「人物让台 · 素材上桌」逐镜参数化卡
// 结构与 KouboShot 同构：KScale > Envelope > 底色 > CameraRig > 场景内容。
// 已知边界（FIXED，不暴露）：词锚时刻（A(9,'啪',i)）、弹入时长/回弹、呼吸周期、相机路径——
// 改文案/素材后节拍仍按原配音词锚走。默认值渲染与原成片逐像素一致。
const FPS = 30;
const IDX = 5; // s06
const { shot: SHOT, lead: LEAD, tail: TAIL, total: TOTAL } = shotTiming(IDX);

// —— 词锚（beats.json 同源 +48ms 混音补偿）——
const AV = 0.048;
const A = (si: number, q: string, occ = 0) => (atChar(si, q, occ) as number) + AV;
const ATS = [0, 1, 2].map((i) => A(9, "啪", i) - SHOT.start);

// —— PromoScenes 顶部共享 helpers（逐字同式复制）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const rise = (p: number, y = 34): React.CSSProperties => ({
  opacity: p,
  transform: `translateY(${(1 - p) * y}px) scale(${0.97 + 0.03 * p})`,
});
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

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

// —— 素材 DSL：每行 "图片|标注|左|上|宽|高|落位角"（public/ 下路径；标准 3 行踩 3 个「啪」词锚）——
type ShotItem = { src: string; cap: string; l: number; tp: number; w: number; h: number; rot: number };
const parseShots = (dsl: string): ShotItem[] =>
  dsl
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const p = line.split("|").map((s) => s.trim());
      return {
        src: p[0] || "",
        cap: p[1] || "",
        l: Number(p[2]) || 0,
        tp: Number(p[3]) || 0,
        w: Number(p[4]) || 100,
        h: Number(p[5]) || 100,
        rot: Number(p[6]) || 0,
      };
    });

const DEFAULT_SHOTS = [
  "shots/github.png|GitHub 仓库|70|100|640|400|-7",
  "shots/gallery.png|动效画廊|420|255|620|388|5",
  "shots/demo.png|卡片 demo|770|115|615|400|-4",
].join("\n");

interface Props {
  bgColor?: string;
  title?: string;
  titleSize?: number;
  titleColor?: string;
  shots?: string;
  capColor?: string;
  posX?: number;
  posY?: number;
}

const SceneS06: React.FC<Props> = ({
  bgColor = "#f5f5f7",
  title = "人物缩成头像章，画面让给产品",
  titleSize = 62,
  titleColor = "#1d1d1f",
  shots = DEFAULT_SHOTS,
  capColor = "#1d1d1f",
  posX = 130,
  posY = 160,
}) => {
  const t = (useCurrentFrame() - LEAD) / FPS;
  const items = parseShots(shots);
  // 弹入锚点：前三张踩「啪」词锚，多余行按 0.3s 顺延（默认 3 行与原片逐帧一致）
  const atOf = (i: number) => ATS[Math.min(i, ATS.length - 1)] + Math.max(0, i - (ATS.length - 1)) * 0.3;
  const settled = (items.length ? atOf(items.length - 1) : ATS[2]) + 0.3 + 0.2;
  let breathe = 1;
  if (t >= settled) {
    const cyc = (t - settled) / 1.6;
    const k = Math.floor(cyc);
    const p = cyc - k;
    breathe = 1 + 0.008 * sineInOut(k % 2 ? 1 - p : p);
  }
  return (
    <KScale>
      <Envelope lead={LEAD} tail={TAIL} total={TOTAL}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={SHOT.path} impulses={SHOT.impulses} durationSec={SHOT.end - SHOT.start} leadFrames={LEAD}>
            <AbsoluteFill style={{ background: bgColor, color: C.ink, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: 1400 }}>
                  <div style={{ fontSize: titleSize, fontWeight: 600, color: titleColor, ...rise(ease(t, 0.25, 0.6), 18) }}>{title}</div>
                  <div style={{ position: "relative", height: 700, marginTop: 30, transform: `scale(${breathe})`, transformOrigin: "50% 50%" }}>
                    {items.map((s, i) => {
                      const at = atOf(i);
                      const op = tw(t, at, 0.15, power1Out);
                      const p = tw(t, at, 0.3, backOut(1.7));
                      return (
                        <div
                          key={i}
                          style={{
                            position: "absolute", left: s.l, top: s.tp, width: s.w, height: s.h,
                            opacity: op,
                            transform: `rotate(${lerp(s.rot - 6, s.rot, p)}deg) scale(${lerp(0.8, 1, p)})`,
                            transformOrigin: "50% 60%",
                            border: "12px solid #fff", borderRadius: 6,
                            boxShadow: "0 18px 46px rgba(0,0,0,.22)", overflow: "hidden", zIndex: i,
                          }}
                        >
                          <Img src={staticFile(s.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                          <div style={{ position: "absolute", left: 14, top: 12, padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,.92)", border: `1px solid ${C.hairline}`, fontSize: 22, fontWeight: 600, color: capColor }}>{s.cap}</div>
                        </div>
                      );
                    })}
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
  id: "kscene-s06",
  name: "人物让台 · 素材上桌",
  category: "口播镜头",
  durationInFrames: TOTAL,
  accent: "#8a8a8a",
  component: SceneS06 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "标题", default: "人物缩成头像章，画面让给产品" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 62, min: 36, max: 96, step: 1, unit: "px" },
    { type: "color", key: "titleColor", label: "标题颜色", default: "#1d1d1f" },
    {
      type: "textarea", key: "shots",
      label: "素材序列（每行：图片|标注|左|上|宽|高|落位角；标准 3 行踩「啪」词锚）",
      default: DEFAULT_SHOTS,
    },
    { type: "color", key: "capColor", label: "标注文字色", default: "#1d1d1f" },
    { type: "color", key: "bgColor", label: "底色", default: "#f5f5f7" },
    { type: "number", key: "posX", label: "内容块 X", default: 130, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 160, step: 1, unit: "px" },
  ],
};
