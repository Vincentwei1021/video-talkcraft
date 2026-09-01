import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, mixHex, power2Out, power3Out, tw } from "../shared";

// behind-text-title · 人后大字视差 —— 参数化版（源出 tplcards/behind-text-title.tsx）
// 命门：hold 期间标题与人物**反向**极缓漂移（同向 = 层次感消失）；标题下缘要被人物
// 吃掉 25%+ 才读得出"在身后"。漂移幅度/周期与 3D 挤出侧面灰阶全部 FIXED。
// 原模板 ::after 渐变字面改为同文案叠加 span（等价盒模型），全部内联、无 <style>。
const FPS = 30;

const FIXED = {
  titleIn: 0.6,        // 标题升起耗时 s（power3.out）
  riseFromRatio: 70 / 235, // 升起起始下沉 = 字号 × 该比（默认 235px ⇒ 70px，随字号等比）
  trackFrom: 0.14,     // 字距从松到紧收拢（em）
  trackTo: 0.02,
  driftPx: 4,          // hold 期间标题与人物的反向漂移 ±px
  driftPeriod: 8,      // 漂移周期 s：快了穿帮，慢了才像"镜头在呼吸"
  subDelay: 0.35,      // 小字晚于标题出现
  subDur: 0.4,         // 小字淡入时长 s
  subRise: 10,         // 小字上移距离 px
  faceMid: 0.726,      // 字面渐变中停点 = mixHex(上色, 下色, 0.726) @58%（默认恰为 #1d1d1f）
};

// 3D 挤出侧面 + 落地投影：递进 text-shadow 灰阶坡（FIXED——挤出深度是造型不是配色）
const EXTRUDE_SHADOW =
  "1px 1px 0 #b2b2b8, 2px 2px 0 #ababb1, 3px 3px 0 #a4a4aa, " +
  "4px 4px 0 #9d9da3, 5px 5px 0 #96969c, 6px 6px 0 #8f8f95, " +
  "7px 7px 0 #88888e, 8px 8px 0 #818187, 9px 9px 0 #7a7a80, " +
  "10px 10px 0 #737379, 11px 11px 0 #6c6c72, 12px 12px 0 #65656b, " +
  "20px 26px 38px rgba(0, 0, 0, 0.32)";

// shared 未含 sine/yoyo——局部定义，对照 GSAP 名字
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
/** yoyo repeat:-1 的往返进度：t0 起点，half 半周期 */
const yoyoP = (t: number, t0: number, half: number) => {
  if (t <= t0) return 0;
  const cyc = (t - t0) / half;
  const k = Math.floor(cyc);
  const p = cyc - k;
  return k % 2 === 1 ? 1 - p : p;
};

interface Props {
  title?: string;
  sub?: string;
  faceTop?: string;
  faceBottom?: string;
  subColor?: string;
  fontSize?: number;
  titleTop?: number;
  lead?: number;
}

const BehindTextTitle: React.FC<Props> = ({
  title = "十年之约",
  sub = "A DECADE STORY · EP.01",
  faceTop = "#4a4a50",
  faceBottom = "#0c0c0d",
  subColor = "#8a8a8a",
  fontSize = 235,
  titleTop = 7,
  lead = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  // 标题从人物身后升起 + 字距收拢（下缘被人物剪影遮挡）
  const inP = tw(t, lead, FIXED.titleIn, power3Out);
  const titleY = lerp(fontSize * FIXED.riseFromRatio, 0, inP);
  const track = lerp(FIXED.trackFrom, FIXED.trackTo, inP);
  // 小字晚于标题出现
  const subP = tw(t, lead + FIXED.subDelay, FIXED.subDur, power2Out);
  // hold：标题与人物反向极缓漂移——伪 3D 层次的命门（同向=层次感消失）
  const driftT0 = lead + FIXED.titleIn;
  const drift = FIXED.driftPx * sineInOut(yoyoP(t, driftT0, FIXED.driftPeriod / 2));

  // 字面渐变：上色 → 中停点（两色定比混出，默认恰为原版 #1d1d1f@58%）→ 下色
  const faceGradient =
    `linear-gradient(180deg, ${faceTop} 0%, ` +
    `${mixHex(faceTop, faceBottom, FIXED.faceMid)} 58%, ${faceBottom} 100%)`;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      {/* 眉题小字 */}
      <div
        style={{
          position: "absolute", zIndex: 1, left: 0, right: 0, top: "5.5%",
          textAlign: "center", fontSize: 16, letterSpacing: 10, color: subColor,
          opacity: subP, transform: `translateY(${lerp(FIXED.subRise, 0, subP)}px)`,
        }}
      >
        {sub}
      </div>

      {/* 3D 艺术字：本体扛"挤出侧面 + 落地投影"，叠加 span（同文案）盖在上面扛"渐变字面" */}
      <div
        style={{
          position: "absolute", zIndex: 1, left: 0, right: 0, top: `${titleTop}%`,
          textAlign: "center", fontSize, fontWeight: 900, lineHeight: 1,
          whiteSpace: "nowrap", color: "#b9b9bf", textShadow: EXTRUDE_SHADOW,
          opacity: inP, letterSpacing: `${track}em`,
          transform: `translate(${drift}px, ${titleY}px)`,
        }}
      >
        {title}
        <span
          style={{
            position: "absolute", left: 0, right: 0, top: 0,
            backgroundImage: faceGradient,
            WebkitBackgroundClip: "text", backgroundClip: "text",
            color: "transparent", WebkitTextFillColor: "transparent",
            textShadow: "none",
          }}
        >
          {title}
        </span>
      </div>

      {/* 前景人物（实拍中来自抠像）：反向漂移。注意本卡人物层必须透底——
          标题要从身后穿出，故保留模板自带的透明剪影渐变，不用带白底的 HostSilhouette */}
      <div
        style={{
          position: "absolute", zIndex: 2, left: "50%", bottom: 0,
          width: 470, height: 430,
          transform: `translateX(-50%) translateX(${-drift}px)`,
          background:
            "radial-gradient(ellipse 24% 22% at 50% 12%, #e3e3e6 99%, transparent 100%)," +
            "radial-gradient(ellipse 50% 62% at 50% 88%, #ececef 99%, transparent 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "behind-text-title",
  name: "人后大字视差",
  category: "人物互动",
  durationInFrames: 95,
  accent: "#1d1d1f",
  component: BehindTextTitle as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "大字标题", default: "十年之约" },
    { type: "text", key: "sub", label: "眉题小字", default: "A DECADE STORY · EP.01" },
    { type: "slider", key: "fontSize", label: "标题字号", default: 235, min: 140, max: 320, step: 1, unit: "px" },
    { type: "color", key: "faceTop", label: "字面渐变上色", default: "#4a4a50" },
    { type: "color", key: "faceBottom", label: "字面渐变下色", default: "#0c0c0d" },
    { type: "color", key: "subColor", label: "眉题颜色", default: "#8a8a8a" },
    { type: "number", key: "titleTop", label: "标题顶缘（占画面高）", default: 7, min: 0, max: 30, step: 0.5, unit: "%" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
