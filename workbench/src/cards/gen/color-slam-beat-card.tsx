import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, linear, mixHex, power2Out, power3Out, tw } from "../shared";

// color-slam-beat-card · 纯色硬切节拍卡 —— 参数化版（源出 tplcards/color-slam-beat-card.tsx）
// 命门：硬切纯色底当节拍器——底色必须高饱和一片一色；显影→变实→小字→素材卡的错峰
//       配比与升入/模糊飞入参数保持 FIXED（2026-08-29 定版 driftPx=0 静置）。
const FPS = 30;

const FIXED = {
  developAt: 0.18,   // 硬切后多久大字从"显影"淡色变实
  developDur: 0.22,  // 变实耗时 s
  subDelay: 0.12,    // 小字戳比大字变实再晚一点
  shotDelay: 0.45,   // 大字 → 素材卡的错峰 0.2~0.5s
  shotDur: 0.42,     // 素材卡升入耗时 s
  shotRise: 56,      // 素材卡从下方升入的距离 px
  shotBlur: 10,      // 模糊飞入起始模糊 px
  hold: 1.6,         // 停留 s（真实 1.5~5s 随口播；demo 压短）
  driftPx: 0,        // 停留期整组漂移量 px（定版：0 静置）
  liftOut: 0.34,     // "色块整体上移让位"切出耗时 s
  gapBetween: 0.6,   // 两张卡之间回口播的间隔
};

// 演示语境（不属于动效）：素材卡里的灰阶假截图（类名加 csb- 前缀防串卡）
const CSS = `
.csb-shot-bar { box-sizing: border-box; height: 32px; background: #f0f0f2;
  border-bottom: 1px solid #e4e4e7; display: flex; align-items: center; gap: 6px;
  padding: 0 12px; margin: 0; }
.csb-shot-bar i { width: 9px; height: 9px; border-radius: 50%; background: #cdcdd2; margin: 0; }
.csb-shot-body { padding: 22px 24px; margin: 0; }
.csb-shot-h { height: 18px; width: 72%; border-radius: 4px; background: #8a8a8a; margin: 0; }
.csb-shot-l { height: 10px; border-radius: 4px; background: #d9d9de; margin: 14px 0 0; }
.csb-shot-l.s { width: 58%; }
.csb-shot-l.m { width: 84%; }
.csb-shot-bars { box-sizing: border-box; display: flex; align-items: flex-end; gap: 26px;
  height: 156px; margin: 26px 0 0; border-bottom: 1px solid #e4e4e7; }
.csb-shot-bars i { flex: 1; border-radius: 4px 4px 0 0; background: #d9d9de; margin: 0; }
.csb-shot-bars i.hot { background: #1d1d1f; }
.csb-shot-cap { margin: 12px 0 0; font-size: 12px; color: #8a8a8a; letter-spacing: 1px; }
`;

// 一张纯色节拍卡在时刻 t 的全部状态；exit: "cut"（硬切回）| "lift"（色块上移让位）
function beatState(t: number, tint: string, at: number, exit: "cut" | "lift") {
  const settled = at + FIXED.shotDelay + FIXED.shotDur;
  const out = settled + FIXED.hold;
  const endVis = exit === "lift" ? out + FIXED.liftOut : out;
  const visible = t >= at && t < endVis;
  // ② 大字变实（显影 → 实色），小字戳跟一拍
  const titleColor = mixHex(tint, "#ffffff", tw(t, at + FIXED.developAt, FIXED.developDur, power2Out));
  const subO = tw(t, at + FIXED.developAt + FIXED.subDelay, 0.24, power2Out);
  // ③ 素材卡带投影升入 + 模糊飞入（与大字错峰 0.2~0.5s）
  const sp = tw(t, at + FIXED.shotDelay, FIXED.shotDur, power3Out);
  // ④ 停留期：元素不再做动作（定版 driftPx=0 ⇒ 整组静置）
  const innerY = lerp(0, -FIXED.driftPx, tw(t, settled, FIXED.hold, linear));
  // ⑤ 切出：硬切（零补间）或色块整体上移让位
  const yPct = exit === "lift" ? lerp(0, -100, tw(t, out, FIXED.liftOut, power3Out)) : 0;
  return { visible, titleColor, subO, sp, innerY, yPct };
}

const Shot1: React.FC = () => (
  <>
    <div className="csb-shot-bar"><i></i><i></i><i></i></div>
    <div className="csb-shot-body">
      <div className="csb-shot-h"></div>
      <div className="csb-shot-l m"></div>
      <div className="csb-shot-l"></div>
      <div className="csb-shot-l s"></div>
      <div className="csb-shot-l m"></div>
      <div className="csb-shot-l"></div>
      <div className="csb-shot-l s"></div>
    </div>
  </>
);

const Shot2: React.FC<{ cap: string }> = ({ cap }) => (
  <>
    <div className="csb-shot-bar"><i></i><i></i><i></i></div>
    <div className="csb-shot-body">
      <div className="csb-shot-h"></div>
      <div className="csb-shot-bars">
        <i style={{ height: 46 }}></i><i style={{ height: 74 }}></i><i style={{ height: 98 }}></i><i className="hot" style={{ height: 142 }}></i>
      </div>
      <div className="csb-shot-cap">{cap}</div>
    </div>
  </>
);

// 大字换行：textarea 用 \n 分行，渲染为 <br/>（与模板 JSX 同构）
const renderTitle = (s: string) =>
  s.split("\n").map((line, i) => (
    <React.Fragment key={i}>{i > 0 ? <br /> : null}{line}</React.Fragment>
  ));

interface Props {
  title1?: string;
  sub1?: string;
  bg1?: string;
  tint1?: string;
  title2?: string;
  sub2?: string;
  bg2?: string;
  tint2?: string;
  shotCap?: string;
  fontSize?: number;
  lead?: number;
}

const ColorSlamBeatCard: React.FC<Props> = ({
  title1 = "不是不会用\n是没想清楚",
  sub1 = "01 · 最常见的卡点",
  bg1 = "#1B3CF5",
  tint1 = "#8A9BFF",
  title2 = "先定输出\n再挑工具",
  sub2 = "02 · 顺序反了就白干",
  bg2 = "#FF3B1F",
  tint2 = "#FFAE9E",
  shotCap = "四周内的交付量变化",
  fontSize = 62,
  lead = 0.9,
}) => {
  const t = useCurrentFrame() / FPS;

  // 卡 01：硬切进 → 停留 → 硬切回口播
  const at1 = lead;
  const end1 = at1 + FIXED.shotDelay + FIXED.shotDur + FIXED.hold;
  const s1 = beatState(t, tint1, at1, "cut");
  // 卡 02：换一个高饱和底色（一片一色）→ 停留 → 色块整体上移让位
  const at2 = end1 + FIXED.gapBetween;
  const s2 = beatState(t, tint2, at2, "lift");

  const cards = [
    { bg: bg1, st: s1, title: renderTitle(title1), sub: sub1, shot: <Shot1 /> },
    { bg: bg2, st: s2, title: renderTitle(title2), sub: sub2, shot: <Shot2 cap={shotCap} /> },
  ];

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      {/* 口播场景（一直在纯色卡下层，硬切进出时露出） */}
      <div style={{ position: "absolute", inset: 0, background: "#ffffff" }}>
        <HostSilhouette />
      </div>

      {cards.map(({ bg, st, title, sub, shot }, i) => (
        <div key={i} style={{
          position: "absolute", inset: 0, willChange: "transform",
          background: bg,
          visibility: st.visible ? "visible" : "hidden",
          transform: `translateY(${st.yPct}%)`,
        }}>
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${st.innerY}px)` }}>
            {/* 左栏文字组竖向居中：行数变化不会挤到小字戳 */}
            <div style={{
              position: "absolute", left: 62, top: 0, bottom: 0, width: 452,
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <div style={{
                fontSize, fontWeight: 800, lineHeight: 1.18, letterSpacing: 1,
                color: st.titleColor,
              }}>
                {title}
              </div>
              <div style={{
                marginTop: 26, paddingLeft: 4, fontSize: 15, fontWeight: 600,
                letterSpacing: 5, color: "rgba(255, 255, 255, 0.78)",
                opacity: st.subO,
              }}>
                {sub}
              </div>
            </div>
            {/* 素材卡：白边 + 深投影是"实体素材被拍上来"的语义（属于动效本体） */}
            <div style={{
              position: "absolute", left: 528, top: 96, width: 372, height: 348,
              background: "#ffffff", borderRadius: 10,
              boxShadow: "0 26px 52px rgba(0, 0, 0, 0.30)", overflow: "hidden",
              opacity: st.sp,
              // autoAlpha 语义：显形时用 inherit（父卡 hidden 时不得穿透）
              visibility: st.sp > 0 ? "inherit" : "hidden",
              transform: `translateY(${lerp(FIXED.shotRise, 0, st.sp)}px)`,
              filter: `blur(${lerp(FIXED.shotBlur, 0, st.sp)}px)`,
            }}>
              {shot}
            </div>
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "color-slam-beat-card",
  name: "纯色硬切节拍卡",
  category: "转场结构",
  durationInFrames: 215,
  accent: "#1B3CF5",
  component: ColorSlamBeatCard as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "title1", label: "卡一大字（换行分行）", default: "不是不会用\n是没想清楚" },
    { type: "text", key: "sub1", label: "卡一小字戳", default: "01 · 最常见的卡点" },
    { type: "color", key: "bg1", label: "卡一底色（高饱和一片一色）", default: "#1B3CF5" },
    { type: "color", key: "tint1", label: "卡一显影淡色（同色系）", default: "#8A9BFF" },
    { type: "textarea", key: "title2", label: "卡二大字（换行分行）", default: "先定输出\n再挑工具" },
    { type: "text", key: "sub2", label: "卡二小字戳", default: "02 · 顺序反了就白干" },
    { type: "color", key: "bg2", label: "卡二底色（高饱和一片一色）", default: "#FF3B1F" },
    { type: "color", key: "tint2", label: "卡二显影淡色（同色系）", default: "#FFAE9E" },
    { type: "text", key: "shotCap", label: "素材卡图注", default: "四周内的交付量变化" },
    { type: "slider", key: "fontSize", label: "大字字号", default: 62, min: 40, max: 84, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置（口播先讲）", default: 0.9, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
