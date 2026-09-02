import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, mixHex, power2Out, power3Out, tw } from "../shared";

// chapter-progress-list · 章节进度 —— 参数化版（源出 tplcards/chapter-progress-list.tsx）
// 例外底色：本卡是全库唯一允许深底的列表卡——「章节转场」的语义就是幕间暗场。
// 命门：全部行到位后才高亮，且只高亮一条；行滑入/高亮/角框的时长与错峰配比保持 FIXED——
//       只放出章节条目 / 眉头小字 / 强调色 / dim 色 / 底色 / 字号 / 起手静置 / 列表右距。
// 深底上保留模板原生透明剪影（shared HostSilhouette 白底会遮挡暗场）。
const FPS = 30;

const FIXED = {
  rowIn: 0.24,       // 单行滑入耗时 s
  rowStagger: 0.10,  // 行错峰 s：>0.2 读作四个独立动效，<0.05 读作整块淡入
  rowShift: 24,      // 行从右侧进入的位移 px
  hlDelay: 0.06,     // 全部到位 → 高亮之间的呼吸 s（必须留，否则读作"最后一行特殊"）
  hlDur: 0.20,       // 高亮耗时 s：换色 + 圆点弹出 + 该行再前进
  hlAdvance: 6,      // 当前行额外前进 px（列表里"站出来一步"）
  cornerInset: 10,   // 角框向内收的距离 px
  cornerDur: 0.30,   // 角框入场耗时 s
};

const backOut2 = (x: number) => {
  const s = 2;
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

interface Props {
  rows?: string;
  headText?: string;
  accent?: string;
  dim?: string;
  bg?: string;
  fontSize?: number;
  lead?: number;
  listRight?: number;
}

const ChapterProgressList: React.FC<Props> = ({
  rows = "01|先说结论\n02|钱是怎么被拿走的|current\n03|三个最常见的坑\n04|你今天能做什么",
  headText = "CHAPTER",
  accent = "#e0452c",
  dim = "#a1a1a6",
  bg = "#1d1d1f",
  fontSize = 23,
  lead = 0.35,
  listRight = 74,
}) => {
  const t = useCurrentFrame() / FPS;

  // 章节条目：每行 "编号|章节名"，当前章节行末加 |current（条数自适应）
  const items = rows
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const parts = l.split("|").map((c) => c.trim());
      return { no: parts[0] ?? "", name: parts[1] ?? "", current: parts[2] === "current" };
    });

  // ① 章节表从右侧错峰滑入（未激活行一律 dim 实色，opacity 只出现在入场这一段）
  const headP = tw(t, lead, 0.22, power2Out);
  const rowsAt = lead + 0.06;

  // ② 全部到位后才高亮，且只高亮一条
  const hlAt = rowsAt + FIXED.rowStagger * (items.length - 1) + FIXED.rowIn + FIXED.hlDelay;
  const colorP = tw(t, hlAt, FIXED.hlDur, power2Out);   // 换色
  const advP = tw(t, hlAt, FIXED.hlDur, power3Out);     // 前进 6px
  const dotP = tw(t, hlAt, FIXED.hlDur, backOut2);      // 圆点弹出
  // ③ 同帧四角角框向内收 + 淡入——"衬"，比高亮慢（0.3s vs 0.2s）不抢戏
  const cornerP = tw(t, hlAt, FIXED.cornerDur, power2Out);
  const cornerOff = lerp(FIXED.cornerInset, 0, cornerP);

  const hlColor = mixHex(dim, accent, colorP);

  // 四角电影角框（深底模式的取景框，2px 实色，不发光）
  const corners: [React.CSSProperties, number, number][] = [
    [{ left: 26, top: 26, borderRightWidth: 0, borderBottomWidth: 0 }, -1, -1],
    [{ right: 26, top: 26, borderLeftWidth: 0, borderBottomWidth: 0 }, 1, -1],
    [{ left: 26, bottom: 26, borderRightWidth: 0, borderTopWidth: 0 }, -1, 1],
    [{ right: 26, bottom: 26, borderLeftWidth: 0, borderTopWidth: 0 }, 1, 1],
  ];

  return (
    <AbsoluteFill style={{
      background: bg, color: "#f5f5f7", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      {/* 左侧人物列：模板原生透明剪影，alpha 数字人直接落在暗场里 */}
      <div style={{ position: "absolute", left: 36, bottom: 0, width: 448, height: "100%" }}>
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "flex-end", justifyContent: "center", background: "transparent",
        }}>
          <div style={{
            width: "42%", height: "78%",
            background:
              "radial-gradient(ellipse 46% 26% at 50% 13%, #e3e3e6 60%, transparent 61%)," +
              "radial-gradient(ellipse 50% 62% at 50% 84%, #ececef 60%, transparent 61%)",
          }} />
        </div>
      </div>

      {corners.map(([pos, dx, dy], i) => (
        <div
          key={i}
          style={{
            position: "absolute", width: 42, height: 42,
            borderWidth: 2, borderStyle: "solid", borderColor: "#d2d2d7",
            ...pos,
            opacity: cornerP,
            transform: `translate(${dx * cornerOff}px, ${dy * cornerOff}px)`,
          }}
        />
      ))}

      {/* 右侧章节列表（动效本体） */}
      <div style={{
        position: "absolute", right: listRight, top: "50%",
        transform: "translateY(-50%)", width: 400,
      }}>
        <div style={{
          fontSize: 13, letterSpacing: 5, color: dim, marginBottom: 26,
          opacity: headP,
        }}>
          {headText}
        </div>
        {items.map((r, i) => {
          const inP = tw(t, rowsAt + i * FIXED.rowStagger, FIXED.rowIn, power3Out);
          // 入场 x 24→0；当前行随后再前进 0→6（两条 tween 顺序接力，不叠加）
          const x = r.current && t >= hlAt
            ? lerp(0, FIXED.hlAdvance, advP)
            : lerp(FIXED.rowShift, 0, inP);
          const color = r.current ? hlColor : dim;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "baseline", gap: 14, padding: "11px 0",
              opacity: inP, transform: `translateX(${x}px)`,
            }}>
              <span style={{ position: "relative", width: 16, flex: "0 0 16px", alignSelf: "center" }}>
                {r.current && (
                  <span style={{
                    position: "absolute", left: 0, top: "50%",
                    width: 10, height: 10, marginTop: -5,
                    borderRadius: "50%", background: accent,
                    transform: `scale(${dotP})`,
                  }} />
                )}
              </span>
              <span style={{
                fontSize: 15, fontWeight: 600, letterSpacing: 1,
                fontVariantNumeric: "tabular-nums", color,
              }}>
                {r.no}
              </span>
              <span style={{
                fontSize, fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap", color,
              }}>
                {r.name}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "chapter-progress-list",
  name: "章节进度",
  category: "转场结构",
  durationInFrames: 111,
  accent: "#e0452c",
  component: ChapterProgressList as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "rows", label: "章节条目（每行：编号|章节名，当前章节行末加 |current）", default: "01|先说结论\n02|钱是怎么被拿走的|current\n03|三个最常见的坑\n04|你今天能做什么" },
    { type: "text", key: "headText", label: "眉头小字", default: "CHAPTER" },
    { type: "slider", key: "fontSize", label: "章节名字号", default: 23, min: 16, max: 34, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "强调色（当前章节）", default: "#e0452c" },
    { type: "color", key: "dim", label: "未激活行色", default: "#a1a1a6" },
    { type: "color", key: "bg", label: "底色（幕间暗场）", default: "#1d1d1f" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.35, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "number", key: "listRight", label: "列表右距", default: 74, step: 1, unit: "px" },
  ],
};
