import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power1Out, tw } from "../shared";

// media-pop-in · 素材弹入堆叠 —— 参数化版（源出 tplcards/media-pop-in.tsx）
// 命门：白边素材 back.out(1.7) 弹入 + 错峰堆叠——入场多歪 preTilt 度、落位收正才有"拍"的手感；
// 弹入时长/回弹力度/起始缩放全部 FIXED。素材序列走 textarea 逐行 DSL（样式|左|上|宽|高|落位角），
// 节拍随张数自适应（第 i 张 = 起手静置 + i × 间隔），默认 DSL 逐像素还原原三张。
const FPS = 30;

const FIXED = {
  popDur: 0.3,        // 单张弹入时长 s
  overshoot: 1.7,     // back.out 回弹力度
  fromScale: 0.8,     // 起始缩放
  preTilt: 6,         // 入场时比落位再多歪的度数
  breathePeriod: 1.6, // 呼吸半周期 s
};

// —— 素材 DSL：每行 "样式|左|上|宽|高|落位角"；样式 = browser / chat / pay ——
type Shot = { kind: string; x: number; y: number; w: number; h: number; rot: number };
function parseShots(dsl: string): Shot[] {
  return dsl
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const p = l.split("|").map((s) => s.trim());
      return {
        kind: p[0] || "browser",
        x: Number(p[1]) || 0,
        y: Number(p[2]) || 0,
        w: Number(p[3]) || 200,
        h: Number(p[4]) || 140,
        rot: Number(p[5]) || 0,
      };
    });
}

const DEFAULT_SHOTS = [
  "browser|40|46|300|200|-7",
  "chat|190|130|240|210|5",
  "pay|90|270|250|170|-4",
].join("\n");

const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const backOut = (s: number) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// 静态版式（类名加 mpi- 前缀防串卡）
const CSS = `
.mpi-host { position: absolute; left: 0; top: 0; bottom: 0; width: 46%; overflow: hidden; }
.mpi-evidence { position: absolute; left: 46%; right: 0; top: 0; bottom: 0; }
.mpi-shot {
  position: absolute;
  border: 8px solid #fff;
  border-radius: 4px;
  box-shadow: 0 12px 26px rgba(0, 0, 0, .16);
  overflow: hidden;
}
.mpi-browser { background: #fafafa; }
.mpi-browser .mpi-bbar { height: 26px; background: #ececef; display: flex; align-items: center; gap: 5px; padding: 0 8px; }
.mpi-browser .mpi-bbar i { width: 8px; height: 8px; border-radius: 50%; background: #c8c8cc; }
.mpi-browser .mpi-h { height: 14px; background: #8a8a8a; margin: 14px 14px 8px; border-radius: 3px; width: 70%; }
.mpi-browser .mpi-l { height: 8px; background: #d2d2d7; margin: 7px 14px; border-radius: 3px; }
.mpi-browser .mpi-l.mpi-s { width: 55%; }
.mpi-chat { background: #f5f5f7; }
.mpi-chat .mpi-msg { max-width: 72%; height: 30px; margin: 12px; border-radius: 10px; background: #ffffff; border: 1px solid #e0e0e0; }
.mpi-chat .mpi-msg.mpi-me { width: 58%; margin-left: auto; background: #ececef; border-color: #e0e0e0; }
.mpi-pay { background: #fff; }
.mpi-pay .mpi-tick { width: 40px; height: 40px; margin: 20px auto 10px; border-radius: 50%; background: #ececef; }
.mpi-pay .mpi-amt { height: 20px; width: 52%; margin: 0 auto 10px; border-radius: 4px; background: #8a8a8a; }
.mpi-pay .mpi-sub { height: 8px; width: 34%; margin: 0 auto; border-radius: 4px; background: #d2d2d7; }
`;

// 三种灰阶假截图内容（演示语境，不属于动效）
const ShotInner: React.FC<{ kind: string }> = ({ kind }) => {
  if (kind === "chat") return (
    <>
      <div className="mpi-msg" />
      <div className="mpi-msg mpi-me" />
      <div className="mpi-msg" />
    </>
  );
  if (kind === "pay") return (
    <>
      <div className="mpi-tick" />
      <div className="mpi-amt" />
      <div className="mpi-sub" />
    </>
  );
  return (
    <>
      <div className="mpi-bbar"><i /><i /><i /></div>
      <div className="mpi-h" /><div className="mpi-l" /><div className="mpi-l" /><div className="mpi-l mpi-s" />
    </>
  );
};

interface Props {
  shots?: string;
  posX?: number;
  posY?: number;
  startDelay?: number;
  stagger?: number;
  breathe?: number;
}

const MediaPopIn: React.FC<Props> = ({
  shots = DEFAULT_SHOTS,
  posX = 0,
  posY = 0,
  startDelay = 0.45,
  stagger = 0.15,
  breathe = 0.008,
}) => {
  const t = useCurrentFrame() / FPS;
  const shotList = parseShots(shots);

  // 单张弹入：透明度前半程完成，缩放/旋转带 back 回弹整程
  const shotStyle = (s: Shot, i: number): React.CSSProperties => {
    const at = startDelay + i * stagger;
    const op = tw(t, at, FIXED.popDur * 0.5, power1Out);
    const p = tw(t, at, FIXED.popDur, backOut(FIXED.overshoot));
    return {
      left: s.x, top: s.y, width: s.w, height: s.h,
      opacity: op,
      transform: `rotate(${lerp(s.rot - FIXED.preTilt, s.rot, p)}deg) scale(${lerp(FIXED.fromScale, 1, p)})`,
      transformOrigin: "50% 60%",
    };
  };

  // 全部落位后整组轻微呼吸（sine.inOut yoyo 无限）
  const settled = startDelay + Math.max(0, shotList.length - 1) * stagger + FIXED.popDur;
  const b0 = settled + 0.2;
  let groupScale = 1;
  if (t >= b0) {
    const cyc = (t - b0) / FIXED.breathePeriod;
    const k = Math.floor(cyc);
    const p = cyc - k;
    const pp = k % 2 === 1 ? 1 - p : p;
    groupScale = 1 + breathe * sineInOut(pp);
  }

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div className="mpi-host"><HostSilhouette /></div>
      <div className="mpi-evidence" style={{
        transform: `translate(${posX}px, ${posY}px) scale(${groupScale})`,
        transformOrigin: "50% 50%",
      }}>
        {shotList.map((s, i) => (
          <div key={i} className={"mpi-shot mpi-" + s.kind} style={shotStyle(s, i)}>
            <ShotInner kind={s.kind} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "media-pop-in",
  name: "素材弹入堆叠",
  category: "素材呈现",
  durationInFrames: 92,
  accent: "#8a8a8a",
  component: MediaPopIn as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "textarea", key: "shots",
      label: "素材序列（每行：样式|左|上|宽|高|落位角；样式 browser/chat/pay，坐标相对右侧证据区）",
      default: DEFAULT_SHOTS,
    },
    { type: "number", key: "posX", label: "素材组偏移 X", default: 0, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "素材组偏移 Y", default: 0, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.45, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "stagger", label: "张与张间隔", default: 0.15, min: 0.08, max: 0.5, step: 0.01, unit: "s" },
    { type: "slider", key: "breathe", label: "落位后呼吸幅度", default: 0.008, min: 0, max: 0.02, step: 0.001 },
  ],
};
