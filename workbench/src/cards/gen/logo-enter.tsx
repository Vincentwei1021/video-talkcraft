import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, clamp01, lerp, power2InOut, power3Out, tw } from "../shared";

// logo-enter · Logo 登场 —— 参数化版（源出 tplcards/logo-enter.tsx）
// 命门：三拍收尾必须克制——只有第①拍（圆牌弹入）有过冲，②字标推出/③描环合拢都是纯缓出；
// 弹入曲线/拍距/推出距离/描环时长全部 FIXED。开放的只有文案、颜色、字号、锁定组位置与起手静置。
// ★ 圆牌里的灰阶几何标是占位 logo：应用时整段替换成自己的 logo。
const FPS = 30;

const FIXED = {
  badgeDur: 0.60,   // 圆牌弹入时长 s（源码 spring 落定 ≈18 帧 ÷30）
  badgeFrom: 0.5,   // 起始缩放
  badgeRise: 22,    // 起始下沉 px
  badgeBack: 1.1,   // back.out(1.1) = spring(13/130/0.8) 的过冲等价物（约 +4%）
  stagger: 0.233,   // 拍距 s（源码 stagger 7 帧 ÷30）
  wordDur: 0.45,    // 字标推出时长
  wordShift: 20,    // 字标横向推出距离 px
  ringDur: 0.70,    // 描环合拢时长
};

// backOut：shared 未含，本卡局部定义（仅第①拍允许的过冲）
const backOut = (s: number) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// dash 长度取周长 + 3px：恰等于周长时首尾在起笔点留一道亚像素白缝，多给 3px 压过起笔点
const RING_LEN = 2 * Math.PI * 62 + 3;

interface Props {
  brand?: string;
  tag?: string;
  ink?: string;
  tagColor?: string;
  fontSize?: number;
  tagSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
}

const LogoEnter: React.FC<Props> = ({
  brand = "知远研究所",
  tag = "每周一期 · 独立商业观察",
  ink = "#1d1d1f",
  tagColor = "#8a8a8a",
  fontSize = 46,
  tagSize = 17,
  posX = 480,
  posY = 270,
  lead = 0.35,
}) => {
  const t = useCurrentFrame() / FPS;

  // ① 圆牌：三件事同一条曲线（等价于源码的同一个 spring 值驱动三个属性）
  const badgeP = tw(t, lead, FIXED.badgeDur, backOut(FIXED.badgeBack));
  const badgeOpacity = clamp01(badgeP); // opacity 不许过冲超 1

  // ② 字标：从圆牌一侧推出，两档字重错峰一拍。纯缓出——不给字加过冲
  const brandP = tw(t, lead + FIXED.stagger, FIXED.wordDur, power3Out);
  const tagP = tw(t, lead + FIXED.stagger * 2, FIXED.wordDur, power3Out);

  // ③ 描环合拢：起笔快、收笔缓（合拢那一下要"停住"，不是匀速转完）
  const ringOffset = lerp(RING_LEN, 0, tw(t, lead + FIXED.stagger, FIXED.ringDur, power2InOut));

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: ink, overflow: "hidden", fontFamily: FONT_STACK }}>
      <div
        style={{
          position: "absolute", left: posX, top: posY,
          transform: "translate(-50%, -50%)",
          display: "flex", alignItems: "center", gap: 26,
        }}
      >
        <div style={{ position: "relative", display: "flex" }}>
          {/* 圆牌：深底白环换算到白底 = 浅灰环 + 轻投影（否则环消失、投影糊成脏斑） */}
          <div
            style={{
              width: 118, height: 118, borderRadius: "50%",
              borderWidth: 5, borderStyle: "solid", borderColor: "#ececef",
              background: "#f5f5f7", boxShadow: "0 10px 26px rgba(0, 0, 0, 0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: badgeOpacity,
              transform: `translate(0px, ${lerp(FIXED.badgeRise, 0, badgeP)}px)` +
                         ` scale(${lerp(FIXED.badgeFrom, 1, badgeP)})`,
            }}
          >
            {/* 灰阶几何占位标（三角 + 圆的组合）：应用时整段替换成自己的 logo */}
            <svg viewBox="0 0 100 100" style={{ width: "52%", height: "52%", display: "block" }}>
              <path d="M50 8 L92 78 L8 78 Z" fill={ink} />
              <circle cx="50" cy="62" r="17" fill="#f5f5f7" />
            </svg>
          </div>
          {/* 描环：叠在圆牌之上的一圈，dashoffset 描出来（12 点起笔） */}
          <svg
            viewBox="0 0 128 128"
            style={{
              position: "absolute", left: "50%", top: "50%", width: 128, height: 128,
              transform: "translate(-50%, -50%) rotate(-90deg)", pointerEvents: "none",
            }}
          >
            <circle
              cx="64" cy="64" r="62" fill="none" stroke={ink} strokeWidth={2}
              strokeDasharray={RING_LEN} strokeDashoffset={ringOffset}
            />
          </svg>
        </div>
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              fontSize, fontWeight: 800, letterSpacing: 2,
              color: ink, lineHeight: 1.15, whiteSpace: "nowrap",
              opacity: brandP, transform: `translate(${lerp(-FIXED.wordShift, 0, brandP)}px, 0px)`,
            }}
          >
            {brand}
          </div>
          <div
            style={{
              fontSize: tagSize, fontWeight: 500, letterSpacing: 6,
              color: tagColor, marginTop: 8, whiteSpace: "nowrap",
              opacity: tagP, transform: `translate(${lerp(-FIXED.wordShift, 0, tagP)}px, 0px)`,
            }}
          >
            {tag}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "logo-enter",
  name: "Logo 登场",
  category: "素材呈现",
  durationInFrames: 90,
  accent: "#1d1d1f",
  component: LogoEnter as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "brand", label: "品牌名", default: "知远研究所" },
    { type: "text", key: "tag", label: "副行", default: "每周一期 · 独立商业观察" },
    { type: "slider", key: "fontSize", label: "品牌名字号", default: 46, min: 28, max: 72, step: 1, unit: "px" },
    { type: "slider", key: "tagSize", label: "副行字号", default: 17, min: 12, max: 28, step: 1, unit: "px" },
    { type: "color", key: "ink", label: "墨色（字标/描环/占位标）", default: "#1d1d1f" },
    { type: "color", key: "tagColor", label: "副行灰", default: "#8a8a8a" },
    { type: "number", key: "posX", label: "锁定组中心 X", default: 480, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "锁定组中心 Y", default: 270, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.35, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
