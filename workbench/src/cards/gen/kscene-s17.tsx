import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";

// kscene-s17 · 三步流程 —— 口播成片 Scene17 的逐镜参数化卡
// 已知边界：词锚时刻（A(23,'竖线')/A(23,'这一步')）、线的 2.6s 描画、节点由缓动反函数
// 定点亮时刻——全部 FIXED；改文案后节拍仍按原配音词锚走。
// 步骤 y 位与原版同式（37 + 220*i），默认三行逐像素一致。
const FPS = 30;
const IDX = 16; // s17
const TIMING = shotTiming(IDX);

// —— PromoScenes 顶部 helpers（逐字同式复制）——
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const invPower1InOut = (y: number) => (y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2));
const backOut = (s = 1.70158) => (x: number) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

// —— 词锚（FIXED）——
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const L0: number = A(23, "竖线") - TIMING.shot.start;
const RING_AT: number = A(23, "这一步") - TIMING.shot.start;
const LDUR = 2.6;
const WRAP = 520;

// accent hex → rgb（当前节点点亮时从强调色 lerp 到白，与原式 rgb(0,102,204)→白 同构）
const hexRgb = (h: string): [number, number, number] => {
  const m = h.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return [0, 102, 204];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// —— KouboShot 同构的包装件（koubo-units 未导出，按原样复制）——
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
  pillText?: string;
  accentColor?: string;
  inkColor?: string;
  bgColor?: string;
  titleSize?: number;
  stepSize?: number;
  posX?: number;
  posY?: number;
}

const KsceneS17: React.FC<Props> = ({
  title = "一条线，三步挨个点亮",
  steps = "第一步|稿子\n第二步|时间戳\n第三步|SHOTBOOK",
  pillText = "你在这里",
  accentColor = "#0066cc",
  inkColor = "#1d1d1f",
  bgColor = "#ffffff",
  titleSize = 62,
  stepSize = 48,
  posX = 320,
  posY = 130,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - TIMING.lead) / FPS;

  const stepList = steps.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
    const bar = l.indexOf("|");
    const k = bar >= 0 ? l.slice(0, bar) : `第${i + 1}步`;
    const x = bar >= 0 ? l.slice(bar + 1) : l;
    return { y: 37 + 220 * i, k, x };
  });

  // —— Scene17 原式（节拍 FIXED）：线的缓动反函数定节点时刻——线到哪、亮哪 ——
  const lineP = tw(t, L0, LDUR, power1InOut);
  const nodeAts = stepList.map((s) => L0 + LDUR * invPower1InOut(cl01(s.y / WRAP)));
  const ringP = tw(t, RING_AT, 0.22, power3Out);
  const [ar, ag, ab] = hexRgb(accentColor);

  return (
    <KScale>
      <Envelope lead={TIMING.lead} tail={TIMING.tail} total={TIMING.total}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={TIMING.shot.path} impulses={TIMING.shot.impulses} durationSec={TIMING.shot.end - TIMING.shot.start} leadFrames={TIMING.lead}>
            <AbsoluteFill style={{ background: bgColor, color: inkColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: 1200, height: 840 }}>
                  <div style={{ fontSize: titleSize, fontWeight: 600 }}>{title}</div>
                  <div style={{ position: "relative", marginTop: 70, height: WRAP }}>
                    <div style={{ position: "absolute", left: 46, top: 0, width: 6, height: WRAP, background: C.hairline, borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ width: "100%", height: `${lineP * 100}%`, background: accentColor }} />
                    </div>
                    {stepList.map((s, i) => {
                      const at = nodeAts[i];
                      const pop = tw(t, at, 0.18, backOut(1.6));
                      const isCur = i === stepList.length - 1;
                      const scale = isCur && t >= RING_AT ? lerp(1, 1.25, ringP) : pop;
                      const borderW = isCur ? 3 * ringP : 0;
                      const bg = isCur && t >= RING_AT
                        ? `rgb(${Math.round(lerp(ar, 255, ringP))},${Math.round(lerp(ag, 255, ringP))},${Math.round(lerp(ab, 255, ringP))})`
                        : accentColor;
                      const textP = tw(t, at + 0.067, 0.26, power3Out);
                      return (
                        <React.Fragment key={i}>
                          <div style={{
                            position: "absolute", left: 1, top: s.y - 45, width: 96, height: 96, borderRadius: 96,
                            background: bg, border: `${borderW}px solid ${accentColor}`,
                            color: isCur && ringP > 0.5 ? accentColor : "#fff",
                            display: "grid", placeItems: "center", fontSize: 30, fontWeight: 600,
                            transform: `scale(${scale})`, zIndex: 1, boxSizing: "border-box",
                          }}>0{i + 1}</div>
                          <div style={{ position: "absolute", left: 140, top: s.y - 42, opacity: textP, transform: `translateX(${lerp(-8, 0, textP)}px)`, display: "flex", alignItems: "center", gap: 30 }}>
                            <div>
                              <div style={{ fontSize: 24, letterSpacing: 3, color: C.dim, marginBottom: 6 }}>{s.k}</div>
                              <div style={{ fontSize: stepSize, fontWeight: 600, whiteSpace: "nowrap" }}>{s.x}</div>
                            </div>
                            {isCur && ringP > 0.4
                              ? <div style={{ padding: "10px 18px", borderRadius: 999, background: accentColor, color: "#fff", border: `1px solid ${accentColor}`, fontSize: 24, fontWeight: 600 }}>{pillText}</div>
                              : null}
                          </div>
                        </React.Fragment>
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
  id: "kscene-s17",
  name: "三步流程",
  category: "口播镜头",
  durationInFrames: TIMING.total,
  accent: "#0066cc",
  component: KsceneS17 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "镜头标题", default: "一条线，三步挨个点亮" },
    { type: "textarea", key: "steps", label: "步骤（每行：小标签|步骤名）", default: "第一步|稿子\n第二步|时间戳\n第三步|SHOTBOOK" },
    { type: "text", key: "pillText", label: "当前站胶囊文案", default: "你在这里" },
    { type: "color", key: "accentColor", label: "强调色（线/节点）", default: "#0066cc" },
    { type: "color", key: "inkColor", label: "文字墨色", default: "#1d1d1f" },
    { type: "color", key: "bgColor", label: "画面底色", default: "#ffffff" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 62, min: 36, max: 96, step: 1, unit: "px" },
    { type: "slider", key: "stepSize", label: "步骤名字号", default: 48, min: 28, max: 72, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 320, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 130, step: 1, unit: "px" },
  ],
};
