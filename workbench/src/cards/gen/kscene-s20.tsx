import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT, RADII } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";

// kscene-s20 · 金句与口碑 —— 口播成片 Scene20 的逐镜参数化卡
// 前半 quote-bracket-pull（双引号对拉出金句），后半 danmu-bubble-praise（评论逐枚飘上）。
// 已知边界：词锚时刻（A(27,'引号')/A(29,'飘上来')）、两段切换点、评论 0.55s 逐枚错峰
// 全部 FIXED；改文案后节拍仍按原配音词锚走。评论按 2 列网格排（左 80/600，行距 190）。
const FPS = 30;
const IDX = 19; // s20
const TIMING = shotTiming(IDX);

// —— PromoScenes 顶部 helpers（逐字同式复制）——
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const rise = (p: number, y = 34): React.CSSProperties =>
  ({ opacity: p, transform: `translateY(${(1 - p) * y}px) scale(${0.97 + 0.03 * p})` });

// —— 词锚（FIXED）——
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const Q_AT: number = A(27, "引号") - TIMING.shot.start;
const FLOAT_AT: number = A(29, "飘上来") - TIMING.shot.start;
const S_AT: number = FLOAT_AT - 0.35;

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
  quoteLine1?: string;
  quoteLine2?: string;
  quoteAccent?: string;
  danmuTitle?: string;
  comments?: string;
  accentColor?: string;
  inkColor?: string;
  commentBg?: string;
  bgColor?: string;
  quoteSize?: number;
  danmuTitleSize?: number;
  commentSize?: number;
  quoteX?: number;
  quoteY?: number;
  danmuX?: number;
  danmuY?: number;
}

const KsceneS20: React.FC<Props> = ({
  quoteLine1 = "一个节拍",
  quoteLine2 = "只有",
  quoteAccent = "一个主角",
  danmuTitle = "用户评论，一枚一枚飘上来",
  comments = "终于不是 PPT 了\n动效卡真的能直接播\n求开源！\n这就是我想要的口播",
  accentColor = "#0066cc",
  inkColor = "#1d1d1f",
  commentBg = "#ffffff",
  bgColor = "#ffffff",
  quoteSize = 70,
  danmuTitleSize = 62,
  commentSize = 30,
  quoteX = 125,
  quoteY = 205,
  danmuX = 150,
  danmuY = 175,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - TIMING.lead) / FPS;

  const commentList = comments.split("\n").map((l) => l.trim()).filter(Boolean);

  // —— Scene20 原式（节拍 FIXED）——
  const q = tw(t, Q_AT, 0.46, power2Out);
  const second = ease(t, S_AT, S_AT + 0.4);

  return (
    <KScale>
      <Envelope lead={TIMING.lead} tail={TIMING.tail} total={TIMING.total}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={TIMING.shot.path} impulses={TIMING.shot.impulses} durationSec={TIMING.shot.end - TIMING.shot.start} leadFrames={TIMING.lead}>
            <AbsoluteFill style={{ background: bgColor, color: inkColor, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                {/* 前半：金句双引号对拉 */}
                <div style={{ position: "absolute", left: quoteX, top: quoteY, width: 900, opacity: 1 - second }}>
                  <div style={{ fontSize: 170, lineHeight: 0.6, color: accentColor, transform: `translate(${(1 - q) * -80}px,${(1 - q) * -40}px)`, opacity: q }}>“</div>
                  <div style={{ fontSize: quoteSize, fontWeight: 600, lineHeight: 1.25, marginLeft: 92, opacity: tw(t, Q_AT + 0.2, 0.3, power2Out) }}>
                    {quoteLine1}<br />{quoteLine2}<span style={{ color: accentColor }}>{quoteAccent}</span>
                  </div>
                  <div style={{ fontSize: 170, lineHeight: 0.6, color: accentColor, textAlign: "right", transform: `translate(${(1 - q) * 80}px,${(1 - q) * 40}px)`, opacity: q }}>”</div>
                </div>
                {/* 后半：评论逐枚飘上（2 列网格，0.55s 错峰） */}
                <div style={{ position: "absolute", left: danmuX, top: danmuY, width: 1250, opacity: second }}>
                  <div style={{ fontSize: danmuTitleSize, fontWeight: 600 }}>{danmuTitle}</div>
                  {commentList.map((x, i) => {
                    const at = FLOAT_AT + i * 0.55;
                    const p = tw(t, at, 0.35, power2Out);
                    return (
                      <div key={i} style={{
                        position: "absolute", left: 80 + (i % 2) * 520, top: 145 + Math.floor(i / 2) * 190, width: 460,
                        background: commentBg, border: `1px solid ${C.hairline}`, borderRadius: RADII.card,
                        padding: "24px 32px", fontSize: commentSize, fontWeight: 600, ...rise(p, 55),
                      }}>
                        <span style={{ color: accentColor, marginRight: 14 }}>●</span>{x}
                      </div>
                    );
                  })}
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
  id: "kscene-s20",
  name: "金句与口碑",
  category: "口播镜头",
  durationInFrames: TIMING.total,
  accent: "#0066cc",
  component: KsceneS20 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "quoteLine1", label: "金句第一行", default: "一个节拍" },
    { type: "text", key: "quoteLine2", label: "金句第二行（常规色）", default: "只有" },
    { type: "text", key: "quoteAccent", label: "金句第二行（强调色）", default: "一个主角" },
    { type: "text", key: "danmuTitle", label: "评论段标题", default: "用户评论，一枚一枚飘上来" },
    { type: "textarea", key: "comments", label: "评论（每行一条，按 2 列网格排）", default: "终于不是 PPT 了\n动效卡真的能直接播\n求开源！\n这就是我想要的口播" },
    { type: "color", key: "accentColor", label: "强调色（引号/主角/圆点）", default: "#0066cc" },
    { type: "color", key: "inkColor", label: "文字墨色", default: "#1d1d1f" },
    { type: "color", key: "commentBg", label: "评论卡底色", default: "#ffffff" },
    { type: "color", key: "bgColor", label: "画面底色", default: "#ffffff" },
    { type: "slider", key: "quoteSize", label: "金句字号", default: 70, min: 40, max: 110, step: 1, unit: "px" },
    { type: "slider", key: "danmuTitleSize", label: "评论段标题字号", default: 62, min: 36, max: 96, step: 1, unit: "px" },
    { type: "slider", key: "commentSize", label: "评论字号", default: 30, min: 20, max: 48, step: 1, unit: "px" },
    { type: "number", key: "quoteX", label: "金句块 X", default: 125, step: 1, unit: "px" },
    { type: "number", key: "quoteY", label: "金句块 Y", default: 205, step: 1, unit: "px" },
    { type: "number", key: "danmuX", label: "评论块 X", default: 150, step: 1, unit: "px" },
    { type: "number", key: "danmuY", label: "评论块 Y", default: 175, step: 1, unit: "px" },
  ],
};
