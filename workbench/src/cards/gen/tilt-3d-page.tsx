import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, power2Out, tw } from "../shared";

// tilt-3d-page · 3D 立面展示 —— 参数化版（源出 tplcards/tilt-3d-page.tsx）
// 命门：① 倾斜量 ≤25°（再多正文读不了）；② 投影跟着倾斜一起变（否则像贴纸）；
//      ③ 立起后不静止——hold 期两轴极缓续走（续走增量与投影轨迹保持 FIXED）。
// 开放页面文案/墨色/字号/立面角度/立起时长/停留时长/起手静置。
const FPS = 30;

const FIXED = {
  rotYFrom: 0,       // 起手正视（0° = 平面）
  rotXTo: 4.5,       // 配一点俯角，纯 rotateY 会像"门轴转"
  scaleTo: 0.94,     // 立起时轻微后退：倾斜后对角线变长，不退会顶到画幅边
  holdDriftY: -3.5,  // hold 期 rotY 续走增量（-19 → -22.5）——相机永不静止
  holdRotX: 3.2,     // hold 期俯角回到的角度，两轴不同步＝"活的镜头"
  shadowFrom: 0.05,  // 正视时投影极淡
  shadowTo: 0.19,    // 立起后投影加深＝页面浮起来了
  shX1: 26, shY1: 15,  // 立起到位时投影偏移
  shX2: 33, shY2: 12,  // hold 末投影偏移
};

const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// —— 演示语境（不属于动效）：灰阶线框「产品落地页」（类名加 t3p- 前缀防串卡） ——
const CSS = `
.t3p-world, .t3p-world * { margin: 0; padding: 0; box-sizing: border-box; }
.t3p-world {
  position: absolute;
  inset: 0;
  perspective: 1000px;
  perspective-origin: 50% 46%;
}
.t3p-camera {
  position: absolute;
  left: 50%; top: 50%;
  width: 792px; height: 452px;
  margin: -226px 0 0 -396px;
  transform-style: preserve-3d;
  will-change: transform;
}
.t3p-shadow {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: #000;
  filter: blur(26px);
}

.t3p-page {
  position: absolute;
  inset: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  backface-visibility: hidden;      /* 倾斜时避免边缘半透明发灰 */
}
.t3p-nav {
  height: 44px;
  display: flex; align-items: center; gap: 20px;
  padding: 0 26px;
  border-bottom: 1px solid #ececef;
}
.t3p-nav .t3p-logo { width: 20px; height: 20px; border-radius: 6px; }
.t3p-nav .t3p-wm { width: 58px; height: 9px; border-radius: 2px; }
.t3p-nav .t3p-links { display: flex; gap: 16px; margin-left: 12px; }
.t3p-nav .t3p-links i { width: 38px; height: 7px; border-radius: 2px; background: #e0e0e0; }
.t3p-nav .t3p-cta { margin-left: auto; width: 78px; height: 26px; border-radius: 13px; }

.t3p-hero { padding: 24px 46px 10px; display: flex; gap: 34px; align-items: center; }
.t3p-hero .t3p-copy { width: 348px; }
.t3p-hero .t3p-tag {
  display: inline-block; font-size: 10px; letter-spacing: 2.5px; color: #8a8a8a;
  border: 1px solid #e0e0e0; border-radius: 999px; padding: 4px 11px; margin-bottom: 13px;
}
.t3p-hero h1 { line-height: 1.26; font-weight: 700; letter-spacing: -0.8px; }
.t3p-hero p { font-size: 12.5px; line-height: 1.72; color: #8a8a8a; margin-top: 10px; }
.t3p-hero .t3p-btns { display: flex; gap: 10px; margin-top: 15px; }
.t3p-hero .t3p-btns .t3p-b1 { width: 104px; height: 31px; border-radius: 8px; }
.t3p-hero .t3p-btns .t3p-b2 { width: 88px; height: 31px; border-radius: 8px; border: 1px solid #d2d2d7; }

/* 主图占位：窗口套窗口的抽象产品截图 */
.t3p-shot {
  flex: 1; height: 166px;
  border: 1px solid #e0e0e0; border-radius: 9px;
  padding: 9px; display: flex; flex-direction: column; gap: 8px;
}
.t3p-shot .t3p-tb { display: flex; gap: 5px; }
.t3p-shot .t3p-tb i { width: 7px; height: 7px; border-radius: 50%; background: #e0e0e0; }
.t3p-shot .t3p-in { flex: 1; display: flex; gap: 8px; }
.t3p-shot .t3p-in .t3p-lft { width: 46px; border-radius: 5px; background: #f4f4f6; }
.t3p-shot .t3p-in .t3p-rgt { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.t3p-shot .t3p-in .t3p-rgt .t3p-blk { flex: 1; border-radius: 5px; background: #f4f4f6; }
.t3p-shot .t3p-in .t3p-rgt .t3p-row { display: flex; gap: 6px; height: 34px; }
.t3p-shot .t3p-in .t3p-rgt .t3p-row div { flex: 1; border-radius: 4px; background: #ececef; }

.t3p-feats { display: flex; gap: 14px; padding: 0 46px; }
.t3p-feat { flex: 1; border: 1px solid #ececef; border-radius: 9px; padding: 13px 15px; }
.t3p-feat .t3p-ico { width: 22px; height: 22px; border-radius: 6px; background: #ececef; margin-bottom: 10px; }
.t3p-feat b { display: block; font-size: 13px; font-weight: 600; margin-bottom: 7px; }
.t3p-feat i { display: block; height: 6px; border-radius: 2px; background: #ececef; margin-bottom: 5px; }
.t3p-feat i.t3p-s { width: 62%; }

.t3p-price {
  margin: 14px 46px 0; height: 44px;
  border-top: 1px solid #ececef;
  display: flex; align-items: center; gap: 12px;
}
.t3p-price b { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
.t3p-price span { font-size: 11px; color: #8a8a8a; }
.t3p-price .t3p-pill { margin-left: auto; width: 96px; height: 28px; border-radius: 999px; border: 1px solid #d2d2d7; }
`;

const DEFAULT_FEATS = "字级时间戳\n镜头分层\n动效配方卡";

interface Props {
  tag?: string;
  title?: string;
  desc?: string;
  featsDsl?: string;
  priceValue?: string;
  priceNote?: string;
  ink?: string;
  titleSize?: number;
  rotYTo?: number;
  tiltDur?: number;
  holdDur?: number;
  startHold?: number;
}

const Tilt3dPage: React.FC<Props> = ({
  tag = "全新版本 2.0",
  title = "把你的调研，变成一条能播的片子",
  desc = "从口播稿到成片，时间戳对齐、镜头分层、动效选型全部自动接管，导出即可发布。",
  featsDsl = DEFAULT_FEATS,
  priceValue = "¥ 199",
  priceNote = "／月　含无限次渲染",
  ink = "#1d1d1f",
  titleSize = 28,
  rotYTo = -19,
  tiltDur = 1.5,
  holdDur = 3.0,
  startHold = 0.5,
}) => {
  const t = useCurrentFrame() / FPS;
  const C = FIXED;
  const tHold = startHold + tiltDur;
  const holdRotY = rotYTo + C.holdDriftY;

  let rotY: number, rotX: number, scale: number, shOp: number, shX: number, shY: number;
  if (t < tHold) {
    // 立起：两轴同时转 + 轻微后退。power2.out 到位（"摆放"动作，允许收住）
    const p = tw(t, startHold, tiltDur, power2Out);
    rotY = lerp(C.rotYFrom, rotYTo, p);
    rotX = lerp(0, C.rotXTo, p);
    scale = lerp(1, C.scaleTo, p);
    // 投影同步变化：加深 + 往倾斜的反侧偏移（光源不动，物体转了 ⇒ 影子必须跟着挪）
    shOp = lerp(C.shadowFrom, C.shadowTo, p);
    shX = lerp(0, C.shX1, p);
    shY = lerp(0, C.shY1, p);
  } else {
    // hold 期：微透视慢漂——两轴极缓续走，投影跟着再挪一点点
    const p = tw(t, tHold, holdDur, sineInOut);
    rotY = lerp(rotYTo, holdRotY, p);
    rotX = lerp(C.rotXTo, C.holdRotX, p);
    scale = C.scaleTo;
    shOp = C.shadowTo;
    shX = lerp(C.shX1, C.shX2, p);
    shY = lerp(C.shY1, C.shY2, p);
  }

  const feats = featsDsl.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div className="t3p-world">
        <div className="t3p-camera" style={{
          transform: `rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})`,
        }}>
          <div className="t3p-shadow" style={{
            opacity: shOp,
            transform: `translate3d(${shX}px, ${shY}px, -34px)`,   /* 沉在页面后方，倾斜时与页面产生位移差＝厚度感 */
          }} />
          <div className="t3p-page" style={{ color: ink }}>
            <div className="t3p-nav">
              <div className="t3p-logo" style={{ background: ink }} />
              <div className="t3p-wm" style={{ background: ink }} />
              <div className="t3p-links"><i /><i /><i /></div>
              <div className="t3p-cta" style={{ background: ink }} />
            </div>

            <div className="t3p-hero">
              <div className="t3p-copy">
                <span className="t3p-tag">{tag}</span>
                <h1 style={{ fontSize: titleSize }}>{title}</h1>
                <p>{desc}</p>
                <div className="t3p-btns">
                  <div className="t3p-b1" style={{ background: ink }} />
                  <div className="t3p-b2" />
                </div>
              </div>
              <div className="t3p-shot">
                <div className="t3p-tb"><i /><i /><i /></div>
                <div className="t3p-in">
                  <div className="t3p-lft" />
                  <div className="t3p-rgt">
                    <div className="t3p-blk" />
                    <div className="t3p-row"><div /><div /><div /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="t3p-feats">
              {feats.map((f, i) => (
                <div className="t3p-feat" key={i}>
                  <div className="t3p-ico" /><b>{f}</b><i /><i className="t3p-s" />
                </div>
              ))}
            </div>

            <div className="t3p-price">
              <b>{priceValue}</b><span>{priceNote}</span>
              <div className="t3p-pill" />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "tilt-3d-page",
  name: "3D 立面展示",
  category: "运镜",
  durationInFrames: 162,
  accent: "#1d1d1f",
  component: Tilt3dPage as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "tag", label: "顶部小标签", default: "全新版本 2.0" },
    { type: "text", key: "title", label: "页面主标题", default: "把你的调研，变成一条能播的片子" },
    { type: "textarea", key: "desc", label: "页面副题", default: "从口播稿到成片，时间戳对齐、镜头分层、动效选型全部自动接管，导出即可发布。" },
    { type: "textarea", key: "featsDsl", label: "特性卡（每行一张）", default: DEFAULT_FEATS },
    { type: "text", key: "priceValue", label: "价格", default: "¥ 199" },
    { type: "text", key: "priceNote", label: "价格备注", default: "／月　含无限次渲染" },
    { type: "slider", key: "titleSize", label: "主标题字号", default: 28, min: 18, max: 40, step: 1, unit: "px" },
    { type: "color", key: "ink", label: "墨色（深色元素）", default: "#1d1d1f" },
    { type: "slider", key: "rotYTo", label: "立面角度（负=右侧后仰）", default: -19, min: -25, max: -12, step: 0.5, unit: "°" },
    { type: "slider", key: "tiltDur", label: "立起时长", default: 1.5, min: 0.8, max: 2.5, step: 0.05, unit: "s" },
    { type: "slider", key: "holdDur", label: "立面停留（慢漂）", default: 3, min: 1, max: 4, step: 0.1, unit: "s" },
    { type: "slider", key: "startHold", label: "起手静置", default: 0.5, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
