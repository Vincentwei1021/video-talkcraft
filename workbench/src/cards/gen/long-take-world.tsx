import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, clamp01, lerp } from "../shared";

// long-take-world · 长镜头世界画布 —— 参数化版（源出 tplcards/long-take-world.tsx）
// 命门：站点表 + 相机反向 transform + "接近度揭示"（arrive）——内容在相机赶到前 0.4 屏就开始成形；
//       站点几何 / 途经点 / 运镜时长与缓动 / 微漂全部保持 FIXED（宁可少暴露也不许破坏品相）——
//       只放出站点文案 / 底色 / 网格色 / 墨色 / 途经点强调色 / 字号 / 起点停留。
const FPS = 30;

// 相机注视点（世界坐标，FIXED 几何编排）：起点 → 站 B → 站 C
const S0 = { x: 0, y: 0, zoom: 1.0 };
const S1 = { x: 1150, y: 330, zoom: 1.06 };
const S2 = { x: 420, y: 960, zoom: 0.96 };
const SLOTS = [S0, S1, S2];

const FIXED = {
  travel: 1.5,       // 站间运镜时长 s（速度 ≤1.5 屏宽/s 铁律）
  holdB: 1.2,        // 站 B 到站停留 s（站 C 停到卡尾）
  arriveLead: 420,   // 接近半径 px：距离小于它内容开始成形
  drift: 5,          // 到站微漂 ±px（永不完全静止）
  waypoints: [{ x: 600, y: 170 }, { x: 900, y: 750 }],  // 途经点（世界坐标）
};

const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

interface Props {
  stations?: string;
  bg?: string;
  gridColor?: string;
  ink?: string;
  accent?: string;
  fontSize?: number;
  lead?: number;
}

const LongTakeWorld: React.FC<Props> = ({
  stations = "起点 · 钩子|相机停在这，内容已在世界坐标上\n站 B · 数据|讲到哪，镜头移到哪，到点即\"到站\"\n站 C · 结论|没有切镜——空间连续性就是转场",
  bg = "#ffffff",
  gridColor = "#ececef",
  ink = "#1d1d1f",
  accent = "#1d1d1f",
  fontSize = 44,
  lead = 1.1,
}) => {
  const t = useCurrentFrame() / FPS;

  // 站点文案：每行 "标题|注释"，落到 FIXED 的 3 个几何槽位上（多出的行忽略）
  const sts = stations
    .split("\n")
    .filter((l) => l.trim() !== "")
    .slice(0, SLOTS.length)
    .map((l, i) => {
      const cut = l.indexOf("|");
      const slot = SLOTS[i];
      return {
        x: slot.x, y: slot.y,
        title: (cut < 0 ? l : l.slice(0, cut)).trim(),
        note: cut < 0 ? "" : l.slice(cut + 1).trim(),
      };
    });

  // —— 相机：站点表摊平成绝对秒（travel=1.5 sine.inOut，站间 hold）——
  const seg1 = 0.01 + lead;                   // 起点 hold 结束，运镜去站 B
  const seg2 = seg1 + FIXED.travel + FIXED.holdB;  // 站 B hold 结束，运镜去站 C
  let cam = { x: S0.x, y: S0.y, zoom: S0.zoom };
  if (t < seg1) {
    cam = { x: S0.x, y: S0.y, zoom: S0.zoom };
  } else if (t < seg1 + FIXED.travel) {
    const p = sineInOut(clamp01((t - seg1) / FIXED.travel));
    cam = { x: lerp(S0.x, S1.x, p), y: lerp(S0.y, S1.y, p), zoom: lerp(S0.zoom, S1.zoom, p) };
  } else if (t < seg2) {
    cam = { x: S1.x, y: S1.y, zoom: S1.zoom };
  } else if (t < seg2 + FIXED.travel) {
    const p = sineInOut(clamp01((t - seg2) / FIXED.travel));
    cam = { x: lerp(S1.x, S2.x, p), y: lerp(S1.y, S2.y, p), zoom: lerp(S1.zoom, S2.zoom, p) };
  } else {
    cam = { x: S2.x, y: S2.y, zoom: S2.zoom };
  }

  // 微漂：双不可通约正弦，任何"到站"时刻都不完全静止
  const dx = Math.sin(t * 0.61 + 1.3) * FIXED.drift;
  const dy = Math.sin(t * 0.47 + 4.1) * FIXED.drift * 0.7;

  return (
    <AbsoluteFill style={{
      background: bg, color: ink, overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      {/* 世界画布：超大 div，相机 = 反向 transform */}
      <div style={{
        position: "absolute", left: "50%", top: "50%", width: 0, height: 0,
        willChange: "transform",
        transform: `scale(${cam.zoom}) translate(${-(cam.x + dx)}px, ${-(cam.y + dy)}px)`,
      }}>
        {/* 世界网格：本卡唯一必需的"底"——它让相机位移可被看见，不是装饰纹理 */}
        <div style={{
          position: "absolute", left: -1500, top: -900, width: 4200, height: 2200,
          backgroundImage:
            `linear-gradient(${gridColor} 1px, transparent 1px), ` +
            `linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: "130px 130px",
        }} />
        {sts.map((st, i) => {
          // arrive 揭示：相机接近哪站，哪站成形（提前 arriveLead 就开始）
          const dist = Math.hypot(cam.x - st.x, cam.y - st.y);
          const a = clamp01(1 - (dist - FIXED.arriveLead * 0.4) / (FIXED.arriveLead * 0.6));
          return (
            <div key={i} style={{
              position: "absolute", left: st.x, top: st.y,
              transform: "translate(-50%, -50%)", textAlign: "center",
            }}>
              <div style={{
                background: "#ffffff",
                borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
                borderRadius: 10, padding: "36px 48px",
                opacity: a,
                transform: `translateY(${26 * (1 - a)}px) scale(${0.94 + 0.06 * a})`,
              }}>
                <h2 style={{ fontSize, color: ink, marginBottom: 10, whiteSpace: "nowrap" }}>
                  {st.title}
                </h2>
                <p>{st.note}</p>
              </div>
            </div>
          );
        })}
        {/* 途经点：唯一保留的强调色接口——复用时整组换品牌色 */}
        {FIXED.waypoints.map((w, i) => (
          <div key={i} style={{
            position: "absolute", left: w.x, top: w.y,
            width: 14, height: 14, borderRadius: "50%", background: "#ffffff",
            borderWidth: 2, borderStyle: "solid", borderColor: accent,
            transform: "translate(-50%, -50%)",
          }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "long-take-world",
  name: "长镜头世界画布",
  category: "转场结构",
  durationInFrames: 213,
  accent: "#1d1d1f",
  component: LongTakeWorld as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "stations", label: "站点文案（每行：标题|注释；几何固定，最多 3 站）", default: "起点 · 钩子|相机停在这，内容已在世界坐标上\n站 B · 数据|讲到哪，镜头移到哪，到点即\"到站\"\n站 C · 结论|没有切镜——空间连续性就是转场" },
    { type: "slider", key: "fontSize", label: "站牌标题字号", default: 44, min: 28, max: 60, step: 1, unit: "px" },
    { type: "color", key: "bg", label: "底色", default: "#ffffff" },
    { type: "color", key: "gridColor", label: "世界网格色", default: "#ececef" },
    { type: "color", key: "ink", label: "文字墨色", default: "#1d1d1f" },
    { type: "color", key: "accent", label: "途经点强调色", default: "#1d1d1f" },
    { type: "slider", key: "lead", label: "起点停留", default: 1.1, min: 0.4, max: 2.5, step: 0.05, unit: "s" },
  ],
};
