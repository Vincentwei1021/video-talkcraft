import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { C, FONT } from "@kbsrc/theme";
import { atChar } from "@kbsrc/timing";

// kscene-s18 · 界面自己演戏 —— 口播成片 Scene18 的逐镜参数化卡（深底 + 世界网格）
// 已知边界：词锚时刻（A(25,'命令')/A(25,'一行一行')）、敲字速率 CPS=12、日志分块突进
// （3 字一簇 @44cps）与逐行错峰延迟——全部 FIXED；改文案后节拍仍按原配音词锚走。
// 日志行的起始时刻按原式依赖前一行文本长度（acc 递推），属原卡固有行为。
const FPS = 30;
const IDX = 17; // s18
const TIMING = shotTiming(IDX);

// —— PromoScenes 顶部 helpers（逐字同式复制）——
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const rise = (p: number, y = 34): React.CSSProperties =>
  ({ opacity: p, transform: `translateY(${(1 - p) * y}px) scale(${0.97 + 0.03 * p})` });

// 世界网格（Shell 对 GRID_SLUGS 命中镜头在 Plane depth .5 铺设，深色版）
const Grid: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <AbsoluteFill style={{
    opacity: dark ? 0.12 : 0.055,
    backgroundImage: `linear-gradient(${dark ? "#fff" : C.ink} 1px,transparent 1px),linear-gradient(90deg,${dark ? "#fff" : C.ink} 1px,transparent 1px)`,
    backgroundSize: "100px 100px",
    maskImage: "radial-gradient(75% 78% at 50% 45%,#000 35%,transparent 88%)",
  }} />
);

// —— 词锚（FIXED）——
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const TYPE_AT: number = A(25, "命令") - TIMING.shot.start;
const LINES_AT: number = A(25, "一行一行") - TIMING.shot.start;
const CPS = 12;
// 逐行错峰延迟（节奏命门，FIXED；行数超出时循环取用）
const LINE_DELAYS = [0.05, 0.5, 0.22, 0.55];

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
  cmd?: string;
  promptUser?: string;
  promptPath?: string;
  termTitle?: string;
  logLines?: string;
  titleColor?: string;
  accentColor?: string;
  termBg?: string;
  bgColor?: string;
  titleSize?: number;
  logSize?: number;
  posX?: number;
  posY?: number;
}

const KsceneS18: React.FC<Props> = ({
  title = "代码工具，让界面自己演戏",
  cmd = "talkcraft render --shotbook",
  promptUser = "agent",
  promptPath = "~/video",
  termTitle = "agent@talkcraft",
  logLines = "#8cc7ff|✓ composition ready\n#63dca5|+ motion cards\n#ff8b8b|- static frame\n#63dca5|+ Camera · SFX · QA",
  titleColor = "#f5f5f7",
  accentColor = "#0066cc",
  termBg = "#0c0c10",
  bgColor = "#17171b",
  titleSize = 64,
  logSize = 42,
  posX = 150,
  posY = 135,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - TIMING.lead) / FPS;

  const lines = logLines.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
    const bar = l.indexOf("|");
    const c = bar >= 0 ? l.slice(0, bar) : "#d7d7dd";
    const txt = bar >= 0 ? l.slice(bar + 1) : l;
    return { c, t: txt, d: LINE_DELAYS[i % LINE_DELAYS.length] };
  });

  // —— Scene18 原式（节拍 FIXED）：命令逐字敲 → 日志分块逐行蹦 ——
  const typed = Math.floor(cl01((t - TYPE_AT) / (cmd.length / CPS)) * cmd.length);
  const intro = tw(t, 0.3, 0.55, power2Out);
  let acc = LINES_AT;
  const lineStates = lines.map((l) => { const start = acc + l.d; acc = start + Math.max(l.t.length - 2, 1) / 44; return { start, ...l }; });
  const lineH = Math.round((logSize / 42) * 70); // 行占位（默认 42px 字号时 = 原式 70px）

  return (
    <KScale>
      <Envelope lead={TIMING.lead} tail={TIMING.tail} total={TIMING.total}>
        <AbsoluteFill style={{ background: bgColor }}>
          <CameraRig path={TIMING.shot.path} impulses={TIMING.shot.impulses} durationSec={TIMING.shot.end - TIMING.shot.start} leadFrames={TIMING.lead}>
            <AbsoluteFill style={{ background: bgColor, color: C.lightInk, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={0.5}><Grid dark /></Plane>
              <Plane depth={1}>
                <div style={{ position: "absolute", left: posX, top: posY, width: 1490 }}>
                  <div style={{ fontSize: titleSize, fontWeight: 600, color: titleColor, ...rise(intro, 14) }}>{title}</div>
                  <div style={{
                    marginTop: 48, borderRadius: 28, background: termBg, border: "1px solid rgba(255,255,255,.14)",
                    height: 665, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.35)",
                    opacity: intro, transform: `translateY(${(1 - intro) * 21}px) scale(${0.97 + 0.03 * intro})`,
                  }}>
                    <div style={{ height: 64, borderBottom: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", padding: "0 28px", gap: 10 }}>
                      {["#ff5f57", "#febc2e", "#28c840"].map((x) => <i key={x} style={{ width: 13, height: 13, borderRadius: 13, background: x }} />)}
                      <span style={{ marginLeft: 22, fontFamily: FONT.mono, fontSize: 24, color: "#777" }}>{termTitle}</span>
                    </div>
                    <div style={{ padding: "42px 46px", fontFamily: FONT.mono, fontSize: logSize, lineHeight: 1.68, color: "#d7d7dd" }}>
                      <div>
                        <span style={{ color: "#63dca5" }}>{promptUser}</span> <span style={{ color: "#777" }}>{promptPath}</span> $ {cmd.slice(0, typed)}
                        <b style={{ display: "inline-block", width: 14, height: logSize, background: accentColor, verticalAlign: "middle", opacity: 0.4 + 0.6 * Math.abs(Math.sin(t * Math.PI * 2)) }} />
                      </div>
                      {lineStates.map((l, i) => {
                        if (t < l.start) return <div key={i} style={{ height: lineH }} />; /* 行占位不重排（卡命门） */
                        const shown = Math.min(l.t.length, Math.ceil(Math.max(0, t - l.start) * 44 / 3) * 3); /* 分块突进：3 字一簇 */
                        return <div key={i} style={{ color: l.c }}>{l.t.slice(0, shown)}</div>;
                      })}
                    </div>
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
  id: "kscene-s18",
  name: "界面自己演戏",
  category: "口播镜头",
  durationInFrames: TIMING.total,
  accent: "#63dca5",
  component: KsceneS18 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "镜头标题", default: "代码工具，让界面自己演戏" },
    { type: "text", key: "cmd", label: "终端命令（逐字敲出）", default: "talkcraft render --shotbook" },
    { type: "text", key: "promptUser", label: "提示符用户名", default: "agent" },
    { type: "text", key: "promptPath", label: "提示符路径", default: "~/video" },
    { type: "text", key: "termTitle", label: "终端标题栏", default: "agent@talkcraft" },
    { type: "textarea", key: "logLines", label: "日志行（每行：#颜色|文本；错峰延迟固定）", default: "#8cc7ff|✓ composition ready\n#63dca5|+ motion cards\n#ff8b8b|- static frame\n#63dca5|+ Camera · SFX · QA" },
    { type: "color", key: "titleColor", label: "标题文字色", default: "#f5f5f7" },
    { type: "color", key: "accentColor", label: "强调色（光标）", default: "#0066cc" },
    { type: "color", key: "termBg", label: "终端底色", default: "#0c0c10" },
    { type: "color", key: "bgColor", label: "画面底色", default: "#17171b" },
    { type: "slider", key: "titleSize", label: "标题字号", default: 64, min: 36, max: 96, step: 1, unit: "px" },
    { type: "slider", key: "logSize", label: "终端字号", default: 42, min: 24, max: 60, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "内容块 X", default: 150, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "内容块 Y", default: 135, step: 1, unit: "px" },
  ],
};
