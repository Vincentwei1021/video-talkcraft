import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, clamp01, lerp } from "../shared";

// sway-parallax · 左右摇移 —— 参数化版（源出 tplcards/sway-parallax.tsx）
// 命门：① 速度上限 ~190px/s（960 宽画幅），超了文字跟不上口播；② rotateY 只做"跟随"（≤4°）；
//      ③ 两端不撞停——缓入/末速非零续漂的曲线（sineIn + camEase）保持 FIXED。
// 开放页面文案/墨色/字号/摇移速度/跟随幅度/到位停留/起手静置；起终点几何保持 FIXED 保品相。
const FPS = 30;

const FIXED = {
  xFrom: 40,         // 起手位置：页面左端露在画幅内（留 40px 边距）
  xTo: -770,         // 终点位置（负=页面往左走＝镜头往右摇）
  accelDur: 0.55,    // 起摇缓入时长：0 会瞬间满速，读作跳变
  endRate: 0.5,      // 主摇末速 / 平均速的比，收尾"收住"但不为零
  zLift: 14,         // 摇移时页面整体轻微前移（z）
};

const sineIn = (x: number) => 1 - Math.cos((x * Math.PI) / 2);
// 运镜专用 ease：匀速 + 一点前载减速。起速 = 平均速，末速 = r × 平均速（非零 ⇒ hold 无缝续漂）
const camEase = (r: number) => (p: number) => p + (1 - r) * p * p * (1 - p);

// —— 演示语境（不属于动效）：一张 1720px 宽的灰阶线框「宽横幅长页」（类名加 swp- 前缀） ——
const CSS = `
.swp-world, .swp-world * { margin: 0; padding: 0; box-sizing: border-box; }
.swp-world {
  position: absolute;
  inset: 0;
  perspective: 1200px;         /* 摇移用大透视：值小了页面边缘会像鱼眼那样变形 */
  perspective-origin: 50% 50%;
  overflow: hidden;
}
.swp-camera {
  position: absolute;
  left: 0; top: 50%;
  width: 1880px; height: 430px;      /* 页面比画幅宽近一倍——这是摇移成立的前提 */
  margin-top: -215px;
  transform-style: preserve-3d;
  will-change: transform;
}
.swp-shadow {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: #000;
  opacity: 0.14;
  filter: blur(22px);
  transform: translateZ(-30px);
}

.swp-page {
  position: absolute;
  inset: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  backface-visibility: hidden;
  display: flex;
}

.swp-zone { padding: 30px 34px; border-right: 1px solid #ececef; }
.swp-zone .swp-zlab { font-size: 10px; letter-spacing: 3px; color: #8a8a8a; margin-bottom: 14px; }

/* 左端：品牌区 */
.swp-zone.swp-brand { width: 420px; display: flex; flex-direction: column; justify-content: center; }
.swp-brand .swp-mark { width: 40px; height: 40px; border-radius: 11px; margin-bottom: 18px; }
.swp-brand h1 { font-weight: 700; line-height: 1.3; letter-spacing: -0.6px; }
.swp-brand p { font-size: 12px; line-height: 1.8; color: #8a8a8a; margin-top: 12px; }
.swp-brand .swp-bar { height: 7px; border-radius: 2px; background: #ececef; margin-top: 9px; }

/* 中段：流程步骤，横向排开 */
.swp-zone.swp-flow { flex: 1; display: flex; flex-direction: column; }
.swp-flow .swp-steps { flex: 1; display: flex; align-items: center; gap: 0; }
.swp-step { width: 178px; flex: 0 0 auto; }
.swp-step .swp-no { font-size: 11px; letter-spacing: 2px; color: #8a8a8a; margin-bottom: 9px; }
.swp-step .swp-card {
  height: 152px;
  border: 1px solid #e0e0e0;
  border-radius: 9px;
  padding: 12px 13px;
}
.swp-step .swp-card .swp-ico { width: 24px; height: 24px; border-radius: 7px; background: #ececef; margin-bottom: 11px; }
.swp-step .swp-card b { display: block; font-size: 13.5px; font-weight: 600; margin-bottom: 9px; }
.swp-step .swp-card i { display: block; height: 6px; border-radius: 2px; background: #ececef; margin-bottom: 5px; }
.swp-step .swp-card i.swp-s { width: 58%; }
.swp-step .swp-card.swp-hi { border-color: #c8c8cd; }
.swp-step .swp-card.swp-hi .swp-ico { background: #8a8a8a; }
.swp-arrow { width: 40px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding-top: 20px; }
.swp-arrow svg { width: 26px; height: 10px; }

/* 右端：数据总结 */
.swp-zone.swp-sum { width: 400px; border-right: 0; display: flex; flex-direction: column; justify-content: center; }
.swp-sum .swp-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.swp-sum .swp-cell {
  width: calc(50% - 6px);
  border: 1px solid #ececef; border-radius: 8px; padding: 11px 12px;
}
.swp-sum .swp-cell .swp-lab { font-size: 9.5px; letter-spacing: 1.5px; color: #8a8a8a; }
.swp-sum .swp-cell b { display: block; font-size: 22px; font-weight: 700; letter-spacing: -0.8px; margin-top: 4px; }
.swp-sum .swp-cell span { font-size: 9.5px; color: #8a8a8a; }
.swp-sum .swp-foot { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
.swp-sum .swp-foot .swp-dot { width: 9px; height: 9px; border-radius: 50%; background: #8a8a8a; }
.swp-sum .swp-foot i { flex: 1; height: 6px; border-radius: 2px; background: #ececef; }
`;

const Arrow = () => (
  <div className="swp-arrow">
    <svg viewBox="0 0 26 10"><path d="M0 5h20M16 1.5 20 5l-4 3.5" fill="none" stroke="#d2d2d7" strokeWidth={1.5} /></svg>
  </div>
);

// 每行 "标签|数值|备注"
const parseCells = (dsl: string) =>
  dsl.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [lab = "", val = "", note = ""] = l.split("|").map((s) => s.trim());
    return { lab, val, note };
  });

const DEFAULT_STEPS = "口播稿定稿\n合成与对齐\n分镜层矩阵\n渲染与验收";
const DEFAULT_CELLS =
  "总工时|4.2h|较人工 -71%\n返工轮次|2|双 agent 循环\n静止检测|PASS|首渲即过\n成片时长|95s|十三句";

interface Props {
  brandLabel?: string;
  brandTitle?: string;
  brandDesc?: string;
  flowLabel?: string;
  stepsDsl?: string;
  hiStep?: number;
  sumLabel?: string;
  cellsDsl?: string;
  ink?: string;
  titleSize?: number;
  panSpeed?: number;
  swayDeg?: number;
  holdDur?: number;
  lead?: number;
}

const SwayParallax: React.FC<Props> = ({
  brandLabel = "工作流总览",
  brandTitle = "一条流水线，把文案送到成片",
  brandDesc = "四个环节各自可替换，中间产物全部可审、可回退。",
  flowLabel = "四个环节",
  stepsDsl = DEFAULT_STEPS,
  hiStep = 3,
  sumLabel = "实测结果",
  cellsDsl = DEFAULT_CELLS,
  ink = "#1d1d1f",
  titleSize = 27,
  panSpeed = 168,
  swayDeg = 3.2,
  holdDur = 1.1,
  lead = 0,
}) => {
  const t = Math.max(0, useCurrentFrame() / FPS - lead);
  const C = FIXED;

  const dist = Math.abs(C.xTo - C.xFrom);
  const dir = Math.sign(C.xTo - C.xFrom);              // -1 = 镜头往右摇
  const accelDist = (panSpeed * C.accelDur) / 2;       // 缓入段走过的距离
  const mainDur = Math.max(1e-6, (dist - accelDist) / panSpeed);
  const holdRate = panSpeed * C.endRate;               // 末速：hold 期沿用它续漂

  const t1 = C.accelDur;
  const t2 = t1 + mainDur;

  let x: number, ry: number, z: number;
  if (t < t1) {
    // 起摇：缓入到匀速
    const p = sineIn(clamp01(t / C.accelDur));
    x = lerp(C.xFrom, C.xFrom + dir * accelDist, p);
    ry = lerp(0, swayDeg * dir * -0.45, p);
    z = lerp(0, C.zLift * 0.45, p);
  } else if (t < t2) {
    // 主摇：匀速扫过 + rotateY 跟随到位（速度恒定是"镜头在平移"的全部）
    const p = camEase(C.endRate)(clamp01((t - t1) / mainDur));
    x = lerp(C.xFrom + dir * accelDist, C.xTo, p);
    ry = lerp(swayDeg * dir * -0.45, swayDeg * dir * -1, p);
    z = lerp(C.zLift * 0.45, C.zLift, p);
  } else {
    // hold 期：以末速继续漂 + rotateY 极缓回一点点（相机永不静止）
    const p = clamp01((t - t2) / Math.max(1e-6, holdDur));
    x = lerp(C.xTo, C.xTo + dir * holdRate * holdDur, p);
    ry = lerp(swayDeg * dir * -1, swayDeg * dir * -0.82, p);
    z = C.zLift;
  }

  const steps = stepsDsl.split("\n").map((s) => s.trim()).filter(Boolean);
  const cells = parseCells(cellsDsl);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div className="swp-world">
        <div className="swp-camera" style={{
          transform: `translate3d(${x}px, 0px, ${z}px) rotateY(${ry}deg)`,
        }}>
          <div className="swp-shadow" />
          <div className="swp-page" style={{ color: ink }}>
            <div className="swp-zone swp-brand">
              <div className="swp-zlab">{brandLabel}</div>
              <div className="swp-mark" style={{ background: ink }} />
              <h1 style={{ fontSize: titleSize }}>{brandTitle}</h1>
              <p>{brandDesc}</p>
              <div className="swp-bar" style={{ width: "88%" }} />
              <div className="swp-bar" style={{ width: "66%" }} />
            </div>

            <div className="swp-zone swp-flow">
              <div className="swp-zlab">{flowLabel}</div>
              <div className="swp-steps">
                {steps.map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <Arrow />}
                    <div className="swp-step">
                      <div className="swp-no">STEP {String(i + 1).padStart(2, "0")}</div>
                      <div className={`swp-card${i + 1 === hiStep ? " swp-hi" : ""}`}>
                        <div className="swp-ico" /><b>{s}</b><i /><i /><i className="swp-s" />
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="swp-zone swp-sum">
              <div className="swp-zlab">{sumLabel}</div>
              <div className="swp-grid">
                {cells.map((c, i) => (
                  <div className="swp-cell" key={i}>
                    <div className="swp-lab">{c.lab}</div><b>{c.val}</b><span>{c.note}</span>
                  </div>
                ))}
              </div>
              <div className="swp-foot"><div className="swp-dot" /><i /></div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "sway-parallax",
  name: "左右摇移",
  category: "运镜",
  durationInFrames: 198,
  accent: "#1d1d1f",
  component: SwayParallax as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "brandTitle", label: "品牌区主标题", default: "一条流水线，把文案送到成片" },
    { type: "text", key: "brandDesc", label: "品牌区副题", default: "四个环节各自可替换，中间产物全部可审、可回退。" },
    { type: "text", key: "brandLabel", label: "品牌区栏目签", default: "工作流总览" },
    { type: "text", key: "flowLabel", label: "流程区栏目签", default: "四个环节" },
    { type: "textarea", key: "stepsDsl", label: "流程步骤（每行一步，自动编号）", default: DEFAULT_STEPS },
    { type: "number", key: "hiStep", label: "高亮第几步（0=无）", default: 3, min: 0, max: 8, step: 1 },
    { type: "text", key: "sumLabel", label: "数据区栏目签", default: "实测结果" },
    { type: "textarea", key: "cellsDsl", label: "数据格（每行：标签|数值|备注）", default: DEFAULT_CELLS },
    { type: "slider", key: "titleSize", label: "主标题字号", default: 27, min: 18, max: 40, step: 1, unit: "px" },
    { type: "color", key: "ink", label: "墨色（深色元素）", default: "#1d1d1f" },
    { type: "slider", key: "panSpeed", label: "摇移速度", default: 168, min: 80, max: 190, step: 1, unit: "px/s" },
    { type: "slider", key: "swayDeg", label: "rotateY 跟随幅度", default: 3.2, min: 0, max: 4, step: 0.1, unit: "°" },
    { type: "slider", key: "holdDur", label: "到位停留", default: 1.1, min: 0.2, max: 3, step: 0.05, unit: "s" },
    { type: "slider", key: "lead", label: "起手静置", default: 0, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
