import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import {
  FONT_STACK, HostSilhouette, lerp, power3Out, power4Out, tw,
} from "../shared";

// speed-slab-title · 速度块标题 —— 参数化版（源出 tplcards/speed-slab-title.tsx）
// ① 主标题整块硬现（scale 1.04→1，0.18s power3.out）
// ② 紫块从画外 x:-580 冲入到位（0.28s power4.out）
// ③ 到位那一帧三道速度线一次性张开（错峰 2 帧），随后 0.2s 内淡出
// ④ 副题白字随块进但反向补偿 40px ⇒ "字比块慢半拍"
// 命门：速度线是**冲入的残影**，必须在 0.2s 内消失；留在屏上就成装饰。
// 冲入/追赶/线的全部配比保持 FIXED，不暴露。
const FPS = 30;

const FIXED = {
  l1Dur: 0.18,      // 主标题硬现时长 s
  l1Scale: 1.04,    // 主标题起始倍数
  gap: 0.08,        // 主标题落定 → 紫块起冲的间隔 s
  // 紫块起点 x（**必须完全在画外**）px：块右缘在 x≈562，-3° 斜切 ⇒ |起点| > 563
  slabFrom: -580,
  slabDur: 0.28,    // 紫块冲入时长 s（power4.out：起手极猛、尾段极长）
  lagPx: 40,        // 副题字的反向补偿 px：块内被裁一截 ⇒ "追赶感"
  lagDur: 0.34,     // 字追上块的时长 s（比块的 0.28s 长 ⇒ 慢半拍）
  lineLens: [42, 30, 22],       // 三道速度线长度 px（长度不等是"拖尾"的形状来源）
  lineTops: [0.24, 0.50, 0.76], // 三道线在块高度上的落位比例
  lineStagger: 0.067,           // 线之间错峰 s（2 帧 @30fps）
  lineOpen: 0.09,               // 单道线张开时长 s
  lineFade: 0.20,               // 线淡出时长 s —— 本卡命门，不许放大
};

// shared 无 power2In（x³），本地保留（照抄模板，仅速度线淡出用）
const power2In = (x: number) => x * x * x;

interface Props {
  line1?: string;
  slabText?: string;
  accent?: string;
  ink?: string;
  slabTextColor?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
}

const SpeedSlabTitle: React.FC<Props> = ({
  line1 = "效率不是更快",
  slabText = "而是不做错事",
  accent = "#7A5AF8",
  ink = "#1d1d1f",
  slabTextColor = "#ffffff",
  fontSize = 76,
  posX = 84,
  posY = 0,
  lead = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  // 块高度：字号 × line-height 1.06 + 上下 padding 10+12（76px ⇒ 103，同模板实测值）
  const slabH = Math.round(fontSize * 1.06 + 22);

  // ① 主标题硬现
  const l1P = tw(t, lead, FIXED.l1Dur, power3Out);
  const l1Scale = lerp(FIXED.l1Scale, 1, l1P);

  // ② 紫块冲入 + ④ 字慢半拍追赶（两条轨同起、字后停）
  const slabAt = lead + FIXED.l1Dur + FIXED.gap;
  const slabX = lerp(FIXED.slabFrom, 0, tw(t, slabAt, FIXED.slabDur, power4Out));
  const slabTX = lerp(-FIXED.lagPx, 0, tw(t, slabAt, FIXED.lagDur, power3Out));

  // ③ 块到位那一帧速度线张开 → 立刻淡出（残影只存在于冲入那一拍）
  const lineAt = slabAt + FIXED.slabDur;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      {/* 演示语境：主持人占右侧一列口播，标题落在左侧白区 */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "47%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>
      <div style={{
        position: "absolute", left: posX, top: "50%",
        transform: `translateY(calc(-50% + ${posY}px))`,
      }}>
        <div style={{
          fontSize, fontWeight: 700, lineHeight: 1.06, color: ink,
          whiteSpace: "nowrap", transformOrigin: "0% 50%",
          opacity: l1P, transform: `scale(${l1Scale})`,
        }}>
          {line1}
        </div>
        <div style={{
          position: "relative", marginTop: 36, marginLeft: -20,
          transform: "rotate(-3deg)", transformOrigin: "0% 50%",
          display: "inline-block",
        }}>
          <div style={{
            position: "absolute", right: "100%", top: 0, bottom: 0,
            width: 60, pointerEvents: "none",
          }}>
            {FIXED.lineLens.map((len, i) => {
              const at = lineAt + i * FIXED.lineStagger;
              const open = tw(t, at, FIXED.lineOpen, power3Out);
              const fade = 1 - tw(t, at + FIXED.lineOpen, FIXED.lineFade, power2In);
              return (
                <div key={i} style={{
                  position: "absolute", right: 6, height: 7, borderRadius: 4,
                  background: accent, transformOrigin: "100% 50%",
                  width: len,
                  top: Math.round(FIXED.lineTops[i] * slabH - 3.5),
                  transform: `scaleX(${open})`,
                  opacity: fade,
                }} />
              );
            })}
          </div>
          <span style={{
            position: "relative", display: "inline-block", overflow: "hidden",
            padding: "10px 20px 12px", background: accent, borderRadius: 4,
            transform: `translateX(${slabX}px)`,
          }}>
            <span style={{
              display: "inline-block", fontSize, fontWeight: 700,
              lineHeight: 1.06, color: slabTextColor, whiteSpace: "nowrap",
              transform: `translateX(${slabTX}px)`,
            }}>
              {slabText}
            </span>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "speed-slab-title",
  name: "速度块标题",
  category: "字幕花字",
  durationInFrames: 98,
  accent: "#7A5AF8",
  component: SpeedSlabTitle as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "line1", label: "主标题", default: "效率不是更快" },
    { type: "text", key: "slabText", label: "块内副题", default: "而是不做错事" },
    { type: "slider", key: "fontSize", label: "字号", default: 76, min: 40, max: 110, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "速度块色（强调色）", default: "#7A5AF8" },
    { type: "color", key: "ink", label: "主标题墨色", default: "#1d1d1f" },
    { type: "color", key: "slabTextColor", label: "块内文字色", default: "#ffffff" },
    { type: "number", key: "posX", label: "文字块 X", default: 84, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "垂直偏移（相对居中）", default: 0, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
