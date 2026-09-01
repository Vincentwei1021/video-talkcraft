import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power1Out, power2Out, power3Out, tw } from "../shared";

// chevron-lower-third · 动态人名条 —— 参数化版（源出 tplcards/chevron-lower-third.tsx）
// 命门：姓名推出 → chip 展开（字滞后 2 帧才落）→ 三枚 chevron 依次扫过的错峰配比，
// 以及"退场比入场快"的整条收回，全部 FIXED；语境级只开放起手静置与停留。
// 唯一语义色只上在 chip 与 chevron（动效本体）上。
const FPS = 30;

const FIXED = {
  nameDur: 0.26,      // 姓名推出时长 s
  namePush: -26,      // 姓名起始 x 位移 px（负 = 从左推出）
  chipDur: 0.22,      // chip scaleX 展开时长 s
  chipGap: 0.1,       // chip 相对姓名起步的错峰 s
  chipTxtLag: 0.067,  // chip 内字的滞后 s（≈ 2 帧 @30fps）
  chipTxtDur: 0.14,   // chip 内字淡入时长 s
  chevDur: 0.14,      // 单枚 chevron 点亮时长 s
  chevStagger: 0.07,  // chevron 之间的错峰 s
  chevSlide: 5,       // chevron 点亮时的 x 位移 px
  outDur: 0.2,        // 退场时长 s（比入场快 —— 出场永远比入场轻）
};

// shared 未含 power2In（整条收回用缓入）——局部定义，对照 GSAP 名字
const power2In = (x: number) => x * x * x;

interface Props {
  name?: string;
  chipText?: string;
  accent?: string;
  ink?: string;
  nameSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
  hold?: number;
}

const ChevronLowerThird: React.FC<Props> = ({
  name = "陈知远",
  chipText = "供应链咨询顾问 · 12 年",
  accent = "#0066cc",
  ink = "#1d1d1f",
  nameSize = 44,
  posX = 72,
  posY = 96,
  lead = 0.4,
  hold = 2.0,
}) => {
  const t = useCurrentFrame() / FPS;

  const chipAt = lead + FIXED.chipGap;
  const chevAt = chipAt + FIXED.chipDur;
  const outAt = chevAt + 2 * FIXED.chevStagger + FIXED.chevDur + hold;

  // ① 姓名从左推出
  const nameP = tw(t, lead, FIXED.nameDur, power3Out);
  // ② chip 展开 + 字滞后 2 帧
  const chipScale = tw(t, chipAt, FIXED.chipDur, power3Out);
  const chipTxtOp = tw(t, chipAt + FIXED.chipTxtLag, FIXED.chipTxtDur, power1Out);
  // ⑤ 整条从左收回
  const outP = tw(t, outAt, FIXED.outDur, power2In);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      {/* 演示语境：真人出镜（不属于动效本体） */}
      <HostSilhouette />

      {/* 名条整体：安全区内左下（默认左 72 / 下 96，≥ action-safe） */}
      <div
        style={{
          position: "absolute", left: posX, bottom: posY,
          transformOrigin: "left center",
          transform: `scaleX(${1 - outP})`, opacity: 1 - outP,
        }}
      >
        <div
          style={{
            fontSize: nameSize, fontWeight: 700, lineHeight: 1.1,
            color: ink, letterSpacing: 2, whiteSpace: "nowrap",
            transform: `translateX(${lerp(FIXED.namePush, 0, nameP)}px)`, opacity: nameP,
          }}
        >
          {name}
        </div>
        {/* 第二行 = 职称 chip + chevron，基线对齐 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <div
            style={{
              position: "relative", height: 40, padding: "0 18px",
              borderRadius: 12, display: "flex", alignItems: "center",
              overflow: "hidden", // chip 展开时字不许溢出到 chip 之外
            }}
          >
            <div
              style={{
                position: "absolute", inset: 0, background: accent, borderRadius: 12,
                transformOrigin: "left center", transform: `scaleX(${chipScale})`,
              }}
            />
            <span
              style={{
                position: "relative", fontSize: 21, fontWeight: 600, letterSpacing: 1.5,
                color: "#ffffff", whiteSpace: "nowrap", opacity: chipTxtOp,
              }}
            >
              {chipText}
            </span>
          </div>
          {/* 三枚 chevron：条子"还在往右延伸"的收尾手势 */}
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2].map((i) => {
              // ③ chevron 依次扫过点亮
              const p = tw(t, chevAt + i * FIXED.chevStagger, FIXED.chevDur, power2Out);
              return (
                <svg
                  key={i}
                  viewBox="0 0 15 26"
                  style={{
                    width: 15, height: 26,
                    opacity: p, transform: `translateX(${lerp(FIXED.chevSlide, 0, p)}px)`,
                  }}
                >
                  <path
                    d="M 4 4 L 11 13 L 4 22"
                    style={{
                      fill: "none", stroke: accent, strokeWidth: 4.5,
                      strokeLinecap: "round", strokeLinejoin: "round",
                    }}
                  />
                </svg>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "chevron-lower-third",
  name: "动态人名条",
  category: "人物互动",
  durationInFrames: 108,
  accent: "#0066cc",
  component: ChevronLowerThird as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "name", label: "姓名", default: "陈知远" },
    { type: "text", key: "chipText", label: "职称 chip 文案", default: "供应链咨询顾问 · 12 年" },
    { type: "slider", key: "nameSize", label: "姓名字号", default: 44, min: 30, max: 64, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "语义色（chip 与 chevron）", default: "#0066cc" },
    { type: "color", key: "ink", label: "姓名墨色", default: "#1d1d1f" },
    { type: "number", key: "posX", label: "名条左缘 X", default: 72, min: 0, max: 900, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "名条距底边", default: 96, min: 0, max: 500, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置（等人物开口）", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "hold", label: "停留（要让人读完两遍）", default: 2.0, min: 0.5, max: 5, step: 0.1, unit: "s" },
  ],
};
