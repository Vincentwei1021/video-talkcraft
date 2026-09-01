import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, clamp01, power2Out } from "../shared";

// stage-keyframe-tour · 长页兴趣点巡游 —— 参数化版（源出 tplcards/stage-keyframe-tour.tsx）
// 命门：① 兴趣点即原点（每帧把目标点设为 transform-origin 并平移到画面正中）；
//      ② 重复同一姿态即为 hold；③ 段间缓动 cubic-bezier(0.16,1,0.3,1)。
// 极复杂卡，宁可少暴露：关键帧路径/舞台姿态/入场沉降全部 FIXED；
// 开放页面文案/墨色/标题字号/兴趣点停留倍率/起手静置。
const FPS = 30;

const FIXED = {
  rotX: 14,          // 俯角：长页必须有俯角才读作"躺着"
  rotY: -20,         // 右侧后仰
  scale: 0.86,       // 基础缩放（与 zoom 相乘）
  entry: 0.80,       // 入场沉降时长
  // 关键帧路径：d = 段时长（s），px/py = 兴趣点归一化坐标，zoom = 焦距，roll = 机身倾角
  // hold: true 的段是"停下来讲"——只有这些段的时长吃 holdScale 倍率
  moves: [
    { d: 0,    px: 0.50, py: 0.115, zoom: 0.66, roll: 0,    hold: false },
    { d: 0.90, px: 0.50, py: 0.115, zoom: 0.66, roll: 0,    hold: true  },  // hold：等入场沉降落定
    { d: 1.05, px: 0.50, py: 0.150, zoom: 1.34, roll: 0,    hold: false },  // ① Hero 主张 + 主按钮
    { d: 0.85, px: 0.50, py: 0.150, zoom: 1.34, roll: 0,    hold: true  },
    { d: 1.20, px: 0.50, py: 0.545, zoom: 1.42, roll: -0.7, hold: false },  // ② 三个大数字
    { d: 0.90, px: 0.50, py: 0.545, zoom: 1.42, roll: -0.7, hold: true  },
    { d: 1.25, px: 0.50, py: 0.845, zoom: 1.38, roll: 0.6,  hold: false },  // ③ 价格卡
    { d: 0.90, px: 0.50, py: 0.845, zoom: 1.38, roll: 0.6,  hold: true  },
    { d: 1.40, px: 0.50, py: 0.60,  zoom: 0.60, roll: 0,    hold: false },  // 离开：拉开给全貌
  ],
};

// cubic-bezier 求值（比拿 expo.out 近似更准）
function bez(x1: number, y1: number, x2: number, y2: number) {
  const cx = (t: number, a: number, b: number) =>
    ((1 - t) * 3 * a + t * 3 * b) * (1 - t) * t + t * t * t;
  return (x: number) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 22; i++) {
      const v = cx(t, x1, x2);
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return cx(t, y1, y2);
  };
}
const EXPO = bez(0.16, 1, 0.3, 1);          // 段间默认缓动（Apple 那条）

// —— 演示语境（不属于动效）：一张 806×2200 的灰阶线框长落地页（类名加 skt- 前缀） ——
const CSS = `
.skt-world, .skt-world * { margin: 0; padding: 0; box-sizing: border-box; }
.skt-world {
  position: absolute;
  inset: 0;
  perspective: 900px;
  perspective-origin: 50% 42%;
}
/* 相机层：全卡唯一被 transform 的元素。
   ⚠️ 这里故意不写 will-change: transform —— 相机层持续分数缩放时，
   强制合成层会让 1px 边框在锐利/模糊之间脉动。提层只提文字容器（见 .skt-sec）。 */
.skt-camera {
  position: absolute;
  transform-style: preserve-3d;
}

/* 地面反光：跟着"舞台地面"而不是相机——它是影棚的一部分，相机飞它不动 */
.skt-floor-glow {
  position: absolute;
  left: 24%; top: 71%;
  width: 52%; height: 26%;
  background: linear-gradient(to bottom, rgba(29, 29, 31, 0.055), rgba(29, 29, 31, 0.018) 35%, transparent 76%);
  clip-path: polygon(7% 0, 93% 0, 78% 100%, 22% 100%);   /* 上宽下窄＝地面往远处收 */
  filter: blur(26px);
  transform-origin: center top;
}
/* 接触阴影：长页压在地面上的那道暗——扁椭圆，是"贴地"唯一的证据 */
.skt-contact {
  position: absolute;
  left: 16%; top: 70%;
  width: 68%; height: 11%;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.30);
  filter: blur(38px);
}

.skt-page {
  position: absolute;
  inset: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 13px;          /* = 画面宽 960 的 1.4% */
  overflow: hidden;
  backface-visibility: hidden;  /* 倾斜时边缘不发灰 */
}
/* 文字容器提层：分数缩放时字形被反复重采样会发抖，提层让每段缩放内的栅格稳定 */
.skt-sec { will-change: transform; }

.skt-nav {
  height: 58px;
  display: flex; align-items: center; gap: 22px;
  padding: 0 34px;
  border-bottom: 1px solid #ececef;
}
.skt-nav .skt-logo { width: 22px; height: 22px; border-radius: 7px; }
.skt-nav .skt-wm { width: 64px; height: 10px; border-radius: 2px; }
.skt-nav .skt-links { display: flex; gap: 18px; margin-left: 10px; }
.skt-nav .skt-links i { width: 44px; height: 8px; border-radius: 2px; background: #dededf; }
.skt-nav .skt-cta { margin-left: auto; width: 88px; height: 30px; border-radius: 15px; }

.skt-hero { height: 610px; padding: 62px 56px 0; }
.skt-hero .skt-tag {
  display: inline-block; font-size: 11px; letter-spacing: 3px; color: #8a8a8a;
  border: 1px solid #e0e0e0; border-radius: 999px; padding: 6px 14px;
}
.skt-hero h1 { line-height: 1.16; font-weight: 700; letter-spacing: -1.6px; margin-top: 26px; width: 620px; }
.skt-hero p { font-size: 17px; line-height: 1.75; color: #8a8a8a; margin-top: 22px; width: 470px; }
.skt-hero .skt-btns { display: flex; gap: 14px; margin-top: 38px; }
.skt-hero .skt-btns .skt-b1 { width: 152px; height: 46px; border-radius: 10px; }
.skt-hero .skt-btns .skt-b2 { width: 128px; height: 46px; border-radius: 10px; border: 1px solid #d2d2d7; }
/* 主图占位：窗口套窗口的抽象截图，底边被 hero 裁掉一半＝"往下还有" */
.skt-hero .skt-shot {
  margin-top: 52px; height: 300px;
  border: 1px solid #e0e0e0; border-radius: 12px; background: #fbfbfc;
  padding: 14px; display: flex; flex-direction: column; gap: 12px;
}
.skt-hero .skt-shot .skt-tb { display: flex; gap: 7px; }
.skt-hero .skt-shot .skt-tb i { width: 9px; height: 9px; border-radius: 50%; background: #e0e0e0; }
.skt-hero .skt-shot .skt-in { flex: 1; display: flex; gap: 12px; }
.skt-hero .skt-shot .skt-in .skt-lft { width: 132px; border-radius: 7px; background: #f1f1f3; }
.skt-hero .skt-shot .skt-in .skt-rgt { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.skt-hero .skt-shot .skt-in .skt-rgt .skt-blk { flex: 1; border-radius: 7px; background: #f1f1f3; }
.skt-hero .skt-shot .skt-in .skt-rgt .skt-row { display: flex; gap: 10px; height: 62px; }
.skt-hero .skt-shot .skt-in .skt-rgt .skt-row div { flex: 1; border-radius: 6px; background: #ececef; }

.skt-logos { height: 118px; display: flex; align-items: center; justify-content: center; gap: 46px; border-top: 1px solid #f2f2f4; border-bottom: 1px solid #f2f2f4; }
.skt-logos i { width: 74px; height: 20px; border-radius: 4px; background: #e6e6e8; }

.skt-feats { height: 302px; display: flex; gap: 20px; padding: 46px 56px; }
.skt-feat { flex: 1; border: 1px solid #ececef; border-radius: 12px; padding: 24px 24px 0; }
.skt-feat .skt-ico { width: 34px; height: 34px; border-radius: 9px; background: #ececef; margin-bottom: 20px; }
.skt-feat b { display: block; font-size: 19px; font-weight: 600; margin-bottom: 15px; }
.skt-feat i { display: block; height: 8px; border-radius: 2px; background: #ececef; margin-bottom: 8px; }
.skt-feat i.skt-s { width: 58%; }

/* 兴趣点 ②：三个大数字 */
.skt-metrics { height: 220px; display: flex; align-items: center; padding: 0 56px; gap: 26px; background: #fafafb; }
.skt-met { flex: 1; }
.skt-met b { display: block; font-size: 46px; font-weight: 700; letter-spacing: -1.6px; }
.skt-met span { display: block; font-size: 14px; color: #8a8a8a; margin-top: 9px; }

.skt-wide { height: 380px; padding: 44px 56px; }
.skt-wide .skt-frame { height: 100%; border: 1px solid #e0e0e0; border-radius: 12px; background: #fbfbfc; display: flex; }
.skt-wide .skt-frame .skt-side { width: 156px; border-right: 1px solid #ececef; padding: 20px 16px; }
.skt-wide .skt-frame .skt-side i { display: block; height: 9px; border-radius: 2px; background: #e8e8ea; margin-bottom: 14px; }
.skt-wide .skt-frame .skt-body { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.skt-wide .skt-frame .skt-body .skt-bar { display: flex; align-items: flex-end; gap: 12px; flex: 1; }
.skt-wide .skt-frame .skt-body .skt-bar u { flex: 1; border-radius: 4px 4px 0 0; background: #e8e8ea; }
.skt-wide .skt-frame .skt-body .skt-cap { height: 9px; width: 40%; border-radius: 2px; background: #ececef; }

/* 兴趣点 ③：价格卡，中间那张是"被推荐的" */
.skt-pricing { height: 348px; display: flex; gap: 20px; padding: 40px 56px; background: #fafafb; }
.skt-pcard { flex: 1; border: 1px solid #e6e6e8; border-radius: 13px; background: #fff; padding: 26px 24px 0; }
.skt-pcard em { display: block; font-size: 12px; letter-spacing: 2px; color: #8a8a8a; font-style: normal; }
.skt-pcard b { display: block; font-size: 38px; font-weight: 700; letter-spacing: -1.2px; margin: 14px 0 4px; }
.skt-pcard span { font-size: 13px; color: #8a8a8a; }
.skt-pcard i { display: block; height: 8px; border-radius: 2px; background: #ececef; margin-top: 14px; }
.skt-pcard i.skt-s { width: 62%; }
.skt-pcard .skt-go { height: 40px; border-radius: 9px; background: #f1f1f3; margin-top: 22px; }

.skt-foot { height: 164px; display: flex; align-items: center; gap: 40px; padding: 0 56px; border-top: 1px solid #ececef; }
.skt-foot .skt-col { display: flex; flex-direction: column; gap: 11px; }
.skt-foot .skt-col i { width: 62px; height: 8px; border-radius: 2px; background: #ececef; }
.skt-foot .skt-col i:first-child { background: #d6d6d8; width: 42px; }
`;

// "数值|说明" / "档位|价格|周期" DSL
const parseLines = (dsl: string) =>
  dsl.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("|").map((s) => s.trim()));

const DEFAULT_FEATS = "字级时间戳\n镜头分层\n动效配方卡";
const DEFAULT_METRICS = "41|张动效配方卡\n6.4×|成片速度提升\n98%|时间戳对齐准确率";
const DEFAULT_PRICING = "个人|¥ 59|／月\n专业|¥ 199|／月\n团队|¥ 699|／月";

interface Props {
  heroTag?: string;
  heroTitle?: string;
  heroDesc?: string;
  featsDsl?: string;
  metricsDsl?: string;
  pricingDsl?: string;
  ink?: string;
  titleSize?: number;
  holdScale?: number;
  lead?: number;
}

const StageKeyframeTour: React.FC<Props> = ({
  heroTag = "全新版本 2.0",
  heroTitle = "把你的调研，变成一条能播的片子",
  heroDesc = "从口播稿到成片，时间戳对齐、镜头分层、动效选型全部自动接管，导出即可发布。",
  featsDsl = DEFAULT_FEATS,
  metricsDsl = DEFAULT_METRICS,
  pricingDsl = DEFAULT_PRICING,
  ink = "#1d1d1f",
  titleSize = 52,
  holdScale = 1,
  lead = 0,
}) => {
  const t = Math.max(0, useCurrentFrame() / FPS - lead);
  const C = FIXED;
  const W = 960, H = 540;

  // 平面几何：长页按画面宽的 84% 定宽，高度按内容比例展开（806×2200）
  const planeW = Math.round(W * 0.84);
  const planeH = 2200;
  const left = (W - planeW) / 2;
  const top = (H - planeH) / 2;              // 负值——长页上下都出画

  // 入场沉降：settle 0→1（power2.out）
  const settle = power2Out(clamp01(t / C.entry));

  // 相机段：逐个关键帧插值；hold 段时长吃倍率，姿态相同天然静止
  let px = C.moves[0].px, py = C.moves[0].py, zoom = C.moves[0].zoom, roll = C.moves[0].roll;
  let at = 0;
  for (let i = 1; i < C.moves.length; i++) {
    const k = C.moves[i], prev = C.moves[i - 1];
    const d = k.hold ? k.d * holdScale : k.d;
    if (t >= at) {
      const p = EXPO(clamp01((t - at) / Math.max(1e-6, d)));
      px = prev.px + (k.px - prev.px) * p;
      py = prev.py + (k.py - prev.py) * p;
      zoom = prev.zoom + (k.zoom - prev.zoom) * p;
      roll = prev.roll + (k.roll - prev.roll) * p;
    }
    at += d;
  }

  // 入场沉降姿态：scale×0.94 / rotateX+8° / rotateY−5° / y+64px → 到位
  const s = settle;
  const sc = C.scale * (0.94 + 0.06 * s);
  const rx = C.rotX + 8 * (1 - s);
  const ry = C.rotY - 5 * (1 - s);
  const ey = 64 * (1 - s);
  // ① 兴趣点寻址：目标点设为 transform-origin，再把它平移到画面正中
  const ox = px * planeW, oy = py * planeH;

  const feats = featsDsl.split("\n").map((l) => l.trim()).filter(Boolean);
  const metrics = parseLines(metricsDsl);
  const pricing = parseLines(pricingDsl);
  const hotIdx = 1;    // 中间那张是"被推荐的"

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div className="skt-floor-glow" style={{
        opacity: 0.9 * s,
        transform: `perspective(650px) rotateX(58deg) translateY(${ey * 0.28}px)`,
      }} />
      <div className="skt-contact" style={{
        opacity: s,
        transform: `translateY(${ey * 0.35}px)`,
      }} />

      <div className="skt-world" style={{ opacity: Math.min(1, s * 3.3) }}>
        <div className="skt-camera" style={{
          left, top, width: planeW, height: planeH,
          transformOrigin: `${ox}px ${oy}px`,
          transform: `translate(${W / 2 - (left + ox)}px, ${H / 2 - (top + oy) + ey}px) ` +
                     `rotate(${-roll}deg) rotateY(${ry}deg) rotateX(${rx}deg) scale(${sc * zoom})`,
        }}>
          <div className="skt-page" style={{ height: planeH, color: ink }}>
            <div className="skt-nav skt-sec">
              <div className="skt-logo" style={{ background: ink }} />
              <div className="skt-wm" style={{ background: ink }} />
              <div className="skt-links"><i /><i /><i /><i /></div>
              <div className="skt-cta" style={{ background: ink }} />
            </div>

            <div className="skt-hero skt-sec">
              <span className="skt-tag">{heroTag}</span>
              <h1 style={{ fontSize: titleSize }}>{heroTitle}</h1>
              <p>{heroDesc}</p>
              <div className="skt-btns">
                <div className="skt-b1" style={{ background: ink }} />
                <div className="skt-b2" />
              </div>
              <div className="skt-shot">
                <div className="skt-tb"><i /><i /><i /></div>
                <div className="skt-in">
                  <div className="skt-lft" />
                  <div className="skt-rgt">
                    <div className="skt-blk" />
                    <div className="skt-row"><div /><div /><div /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="skt-logos"><i /><i /><i /><i /><i /><i /></div>

            <div className="skt-feats skt-sec">
              {feats.map((f, i) => (
                <div className="skt-feat" key={i}><div className="skt-ico" /><b>{f}</b><i /><i /><i className="skt-s" /></div>
              ))}
            </div>

            <div className="skt-metrics skt-sec">
              {metrics.map(([v = "", lab = ""], i) => (
                <div className="skt-met" key={i}><b>{v}</b><span>{lab}</span></div>
              ))}
            </div>

            <div className="skt-wide skt-sec">
              <div className="skt-frame">
                <div className="skt-side"><i /><i /><i /><i /><i /></div>
                <div className="skt-body">
                  <div className="skt-bar"><u style={{ height: "44%" }} /><u style={{ height: "71%" }} /><u style={{ height: "36%" }} /><u style={{ height: "88%" }} /><u style={{ height: "59%" }} /><u style={{ height: "76%" }} /><u style={{ height: "48%" }} /></div>
                  <div className="skt-cap" />
                </div>
              </div>
            </div>

            <div className="skt-pricing skt-sec">
              {pricing.map(([tier = "", price = "", per = ""], i) => (
                <div className="skt-pcard" key={i}
                  style={i === hotIdx ? { borderColor: ink } : undefined}>
                  <em>{tier}</em><b>{price}</b><span>{per}</span><i /><i /><i className="skt-s" />
                  <div className="skt-go" style={i === hotIdx ? { background: ink } : undefined} />
                </div>
              ))}
            </div>

            <div className="skt-foot skt-sec">
              <div className="skt-col"><i /><i /><i /></div>
              <div className="skt-col"><i /><i /><i /></div>
              <div className="skt-col"><i /><i /><i /></div>
              <div className="skt-col"><i /><i /><i /></div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "stage-keyframe-tour",
  name: "长页兴趣点巡游",
  category: "运镜",
  durationInFrames: 275,
  accent: "#1d1d1f",
  component: StageKeyframeTour as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "heroTag", label: "Hero 小标签", default: "全新版本 2.0" },
    { type: "text", key: "heroTitle", label: "Hero 主标题", default: "把你的调研，变成一条能播的片子" },
    { type: "textarea", key: "heroDesc", label: "Hero 副题", default: "从口播稿到成片，时间戳对齐、镜头分层、动效选型全部自动接管，导出即可发布。" },
    { type: "textarea", key: "featsDsl", label: "特性卡（每行一张）", default: DEFAULT_FEATS },
    { type: "textarea", key: "metricsDsl", label: "大数字（每行：数值|说明）", default: DEFAULT_METRICS },
    { type: "textarea", key: "pricingDsl", label: "价格卡（每行：档位|价格|周期；第二张高亮）", default: DEFAULT_PRICING },
    { type: "slider", key: "titleSize", label: "Hero 标题字号", default: 52, min: 36, max: 64, step: 1, unit: "px" },
    { type: "color", key: "ink", label: "墨色（深色元素）", default: "#1d1d1f" },
    { type: "slider", key: "holdScale", label: "兴趣点停留倍率", default: 1, min: 0.5, max: 2, step: 0.05, unit: "×" },
    { type: "slider", key: "lead", label: "起手静置", default: 0, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
