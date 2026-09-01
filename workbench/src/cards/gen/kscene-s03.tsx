import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT, RADII } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";
import { SHOTS } from "@kbsrc/shots";

// kscene-s03 · 口播成片 S03「七类动效」逐镜参数化卡
// 已知边界：b-roll 三窗踩「研究/领域/主播」、标题让位踩「动效」、chips 踩各自原词锚——
// 全部 FIXED，改 chips 文案后节拍仍按原七个词（文字/标注/…）的配音词锚走。
// b-roll 视频（broll/creator-*.mp4）为成片素材，不参数化。
// 默认值渲染与原成片 PromoScene(Shell+Scene03) 逐像素一致。

const FPS = 30;
const IDX = 2; // s03
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

// —— PromoScenes 顶部缓动 kit（逐字同式复制，按需取用）——
const rise = (p: number, y = 34): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * y}px) scale(${0.97 + 0.03 * p})` });
const cardBox: React.CSSProperties = { background: "#fff", border: `1px solid ${C.hairline}`, borderRadius: RADII.card };
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const backOut = (s = 1.70158) => (x: number) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

// 词级锚点：视觉节拍 = 字级时间戳 + 48ms 混音补偿（与成片 beats.json 同源）
const AV = 0.048;
const A = (si: number, q: string, occ = 0) => atChar(si, q, occ) + AV;
const ST = (n: number) => SHOTS[n - 1].start;

// b-roll 三窗（素材/几何/词锚 FIXED）
const S03_BROLL = [
  { src: "broll/creator-2948.mp4", anchor: "研究", w: 560, h: 315, l: 40, tp: 150, rot: -5 },
  { src: "broll/creator-41290.mp4", anchor: "领域", w: 248, h: 440, l: 680, tp: 60, rot: 3 },
  { src: "broll/creator-42323.mp4", anchor: "主播", w: 248, h: 440, l: 1010, tp: 130, rot: -2 },
];
// chips 的原词（节拍锚点 + 宽度档位按此固定；显示文案可改）
const CHIP_ORIG = ["文字", "标注", "数据", "素材", "人物", "运镜", "转场"];

interface Props {
  brollCaption?: string;
  headPre?: string;
  headBig?: string;
  headPost?: string;
  chipsText?: string;
  bgColor?: string;
  inkColor?: string;
  accentColor?: string;
  headSize?: number;
  bigSize?: number;
  chipSize?: number;
  posX?: number;
  posY?: number;
}

// Scene03：开镜不空台——b-roll 先上，「动效」词锚让位给标题；七/类 与 chips 词锚前完全不可见
const KSceneS03: React.FC<Props> = ({
  brollCaption = "不同领域的主播视频 · 研究素材",
  headPre = "动效，其实就 ",
  headBig = "七",
  headPost = " 类",
  chipsText = "文字\n标注\n数据\n素材\n人物\n运镜\n转场",
  bgColor = "#ffffff",
  inkColor = "#1d1d1f",
  accentColor = "#0066cc",
  headSize = 74,
  bigSize = 120,
  chipSize = 48,
  posX = 150,
  posY = 180,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - lead) / FPS;
  const chipLines = chipsText.split("\n").map((s) => s.trim()).filter(Boolean);

  const yieldAt = A(3, "动效") - ST(3); // b-roll 让位、标题进场
  const out = tw(t, yieldAt - 0.15, 0.40, power2In);
  const head = tw(t, yieldAt, 0.35, power2Out);
  const sevenAt = A(3, "七类") - ST(3);
  const seven = tw(t, sevenAt, 0.20, power3Out);

  return (
    <KScale>
      <Envelope lead={lead} tail={tail} total={total}>
        <AbsoluteFill style={{ background: "#fff" }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={lead}>
            <AbsoluteFill style={{ background: bgColor, color: inkColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                {/* 原 left:150,right:150 → width 1620，随 posX/posY 整体平移 */}
                <div style={{ position: "absolute", left: posX, top: posY, width: 1620 }}>
                  {out < 1 && <div style={{ position: "relative", height: 560, opacity: 1 - out, transform: `translateY(${out * -40}px) scale(${1 - out * 0.05})` }}>
                    <div style={{ fontSize: 40, color: C.dim, fontWeight: 600, opacity: tw(t, 0.25, 0.4, power2Out) }}>{brollCaption}</div>
                    {S03_BROLL.map((b) => {
                      const at = A(3, b.anchor) - ST(3);
                      const p = tw(t, at, 0.30, backOut(1.7));
                      return <div key={b.src} style={{ position: "absolute", left: b.l, top: b.tp, width: b.w, height: b.h, opacity: tw(t, at, 0.15, power1Out), transform: `rotate(${lerp(b.rot - 6, b.rot, p)}deg) scale(${lerp(0.8, 1, p)})`, transformOrigin: "50% 60%", border: "12px solid #fff", borderRadius: 6, boxShadow: "0 18px 46px rgba(0,0,0,.22)", overflow: "hidden" }}>
                        <OffthreadVideo src={staticFile(b.src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>;
                    })}
                  </div>}
                  <div style={{ position: "absolute", left: 0, top: 0, right: 0 }}>
                    <div style={{ fontSize: headSize, fontWeight: 600, marginBottom: 48, ...rise(head, 18) }}>{headPre}<span style={{ color: accentColor, fontSize: bigSize, display: "inline-block", opacity: seven, transform: `scale(${lerp(1.5, 1, seven)})` }}>{headBig}</span><span style={{ opacity: tw(t, sevenAt, 0.15, power1Out) }}>{headPost}</span></div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, width: 1150 }}>{CHIP_ORIG.map((orig, i) => {
                      const x = chipLines[i] ?? orig;   // 显示文案可改；节拍/宽度按原词固定
                      const at = A(3, orig) - ST(3);
                      const p = tw(t, at, 0.25, backOut(1.6));
                      const lit = t >= at;
                      return <div key={orig} style={{ width: i < 4 ? 250 : 330, height: 150, ...cardBox, opacity: p, transform: `translateY(${(1 - p) * 24}px) scale(${0.94 + 0.06 * p})`, display: "flex", alignItems: "center", gap: 22, padding: "0 28px", borderColor: lit ? accentColor : C.hairline }}>
                        <div style={{ width: 18, height: 18, borderRadius: 18, background: lit ? accentColor : C.hairline, transform: `scale(${lit ? 0.8 + 0.2 * Math.sin(Math.max(0, t - at) * 2.2) : 0.6})` }} />
                        <div style={{ fontSize: chipSize, fontWeight: 600, color: lit ? inkColor : C.dim }}>{x}</div>
                      </div>;
                    })}</div>
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
  id: "kscene-s03",
  name: "七类动效",
  category: "口播镜头",
  durationInFrames: total,
  accent: "#0066cc",
  component: KSceneS03 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "brollCaption", label: "b-roll 段说明行", default: "不同领域的主播视频 · 研究素材" },
    { type: "text", key: "headPre", label: "标题 · 前段", default: "动效，其实就 " },
    { type: "text", key: "headBig", label: "标题 · 大字", default: "七" },
    { type: "text", key: "headPost", label: "标题 · 后段", default: " 类" },
    { type: "textarea", key: "chipsText", label: "七个类别 chips（每行一个，共 7 行；节拍按原词锚固定）", default: "文字\n标注\n数据\n素材\n人物\n运镜\n转场" },
    { type: "color", key: "bgColor", label: "底色", default: "#ffffff" },
    { type: "color", key: "inkColor", label: "正文墨色", default: "#1d1d1f" },
    { type: "color", key: "accentColor", label: "强调色（大字/点亮态）", default: "#0066cc" },
    { type: "slider", key: "headSize", label: "标题字号", default: 74, min: 44, max: 110, step: 1, unit: "px" },
    { type: "slider", key: "bigSize", label: "大字字号", default: 120, min: 70, max: 180, step: 1, unit: "px" },
    { type: "slider", key: "chipSize", label: "chip 字号", default: 48, min: 28, max: 64, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 150, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 180, step: 1, unit: "px" },
  ],
};
