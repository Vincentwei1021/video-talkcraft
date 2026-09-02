import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, tw } from "../shared";

// map-route-pin · 地图路线图钉 —— 参数化版（源出 tplcards/map-route-pin.tsx）
// 命门：图钉四拍（加速下落→一帧压扁→back 回弹→尘圈/标签）；路线 mask 生长、飞机贴线头。
// 下落/压扁/回弹配比保持 FIXED；图钉坐标与路线弯点经逐行 DSL 暴露，条数自适应。
const FPS = 30;

const FIXED = {
  pinDropFrom: 60,   // 图钉下落高度 px：越大砸感越重
  pinDrop: 0.25,     // 下落时长 s，power2.in 加速砸下
  squashX: 1.3,      // 落地横向压扁倍数
  squashY: 0.7,      // 落地纵向压扁倍数（一帧级 0.06s）
  rebound: 0.28,     // 压扁后回弹时长 s
  labelSlide: 0.2,   // 地名标签侧滑时长 s
  planeAngle: 0,     // 线头跟随物相对路径切线的角度补正 deg
  startPinColor: "#1d1d1f", // 起点用深色区分（语义，不开放）
};

// —— shared 未含的缓动，本卡局部定义 ——
const power1In = (x: number) => x * x;
const power2In = (x: number) => x * x * x;
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// —— 二次贝塞尔弧长表（代替 getTotalLength / getPointAtLength）——
type Pt = { x: number; y: number };
const buildRoute = (P0: Pt, P1: Pt, P2: Pt, N = 240) => {
  const pts: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, v = 1 - u;
    pts.push({ x: v * v * P0.x + 2 * v * u * P1.x + u * u * P2.x,
               y: v * v * P0.y + 2 * v * u * P1.y + u * u * P2.y });
  }
  const cum = [0];
  for (let i = 1; i <= N; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const len = cum[N];
  const pointAt = (s: number): Pt => {
    const target = Math.max(0, Math.min(len, s));
    let lo = 0, hi = N;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < target) lo = mid + 1; else hi = mid; }
    const i = Math.max(1, lo);
    const seg = cum[i] - cum[i - 1] || 1;
    const f = (target - cum[i - 1]) / seg;
    return { x: lerp(pts[i - 1].x, pts[i].x, f), y: lerp(pts[i - 1].y, pts[i].y, f) };
  };
  return { len, pointAt };
};

// DSL：每行 "x|y|地名|弯cx|弯cy"，弯点是上一站→本站路线的贝塞尔控制点（首行没有来路，省略）。
// 默认 DSL 携带 demo 的原控制点——逐像素一致；用户省略弯点时用"中垂外凸"兜底。
type City = { x: number; y: number; label: string; ctrl?: Pt };
const parsePins = (dsl: string): City[] =>
  dsl.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split("|").map((s) => s.trim());
    const c: City = { x: Number(p[0]) || 0, y: Number(p[1]) || 0, label: p[2] ?? "" };
    if (p.length >= 5) c.ctrl = { x: Number(p[3]) || 0, y: Number(p[4]) || 0 };
    return c;
  });
const fallbackCtrl = (a: Pt, b: Pt): Pt => ({
  x: (a.x + b.x) / 2 + (b.y - a.y) * 0.33,
  y: (a.y + b.y) / 2 - (b.x - a.x) * 0.33,
});

const DEFAULT_PINS =
  "430|150|北京 · 总部\n612|292|上海 · 中转仓|580|170\n472|458|深圳 · 工厂|622|420";

// 演示语境（不属于动效）：灰阶线框抽象地图 + 主播小窗（类名加 mrp- 前缀防串卡）
const CSS = `
.mrp-pip {
  position: absolute;
  left: 18px; bottom: 18px;
  width: 138px; height: 138px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #ffffff;
  z-index: 5;
}
/* —— 动效本体 —— 图钉：anchor 定位在城市坐标，内部元素才被动 */
.mrp-anchor { position: absolute; width: 0; height: 0; z-index: 4; }
.mrp-pin {
  position: absolute;
  left: -13px; bottom: 0;
  width: 26px; height: 32px;
  transform-origin: 50% 100%;   /* squash 以钉尖为轴 */
}
.mrp-pin-head {
  position: absolute;
  left: 0; top: 0;
  width: 26px; height: 26px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}
.mrp-pin-head::after {          /* 钉帽白芯 */
  content: "";
  position: absolute;
  left: 8px; top: 8px;
  width: 10px; height: 10px;
  background: #ffffff;
  border-radius: 50%;
}
/* 落地尘圈（砸下时的地面反馈） */
.mrp-ring {
  position: absolute;
  left: -16px; top: -8px;
  width: 32px; height: 16px;
  border: 2px solid rgba(29, 29, 31, .55);
  border-radius: 50%;
}
/* 地名标签：从钉侧滑出 */
.mrp-label {
  position: absolute;
  left: 18px; top: -34px;
  padding: 3px 10px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-weight: 700;
  color: #1d1d1f;
  white-space: nowrap;
}
`;

interface Props {
  pinsDsl?: string;
  accentColor?: string;
  labelSize?: number;
  offsetX?: number;
  offsetY?: number;
  startDelay?: number;
  routeGrow?: number;
  legPause?: number;
}

const MapRoutePin: React.FC<Props> = ({
  pinsDsl = DEFAULT_PINS,
  accentColor = "#d8383a",
  labelSize = 16,
  offsetX = 0,
  offsetY = 0,
  startDelay = 0.15,
  routeGrow = 1.1,
  legPause = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  const cities = parsePins(pinsDsl);
  const routes = cities.slice(1).map((c, i) => {
    const P0 = cities[i], P2 = c;
    const P1 = c.ctrl ?? fallbackCtrl(P0, P2);
    return { ...buildRoute(P0, P1, P2), d: `M ${P0.x},${P0.y} Q ${P1.x},${P1.y} ${P2.x},${P2.y}` };
  });

  // 落钉/生长的绝对时刻（默认值下与 demo 时间线逐拍一致；条数自适应）
  const pinAt: number[] = [startDelay];
  const routeAt: number[] = [];
  for (let i = 1; i < cities.length; i++) {
    routeAt.push(i === 1 ? pinAt[0] + 0.7 : pinAt[i - 1] + 0.6 + legPause);
    pinAt.push(routeAt[i - 1] + routeGrow);
  }

  // —— 图钉四拍：加速下落 → 一帧压扁 → back 回弹；尘圈 + 标签在回弹前一点起步 ——
  const pinState = (i: number) => {
    const at = pinAt[i];
    const y = lerp(-FIXED.pinDropFrom, 0, tw(t, at, FIXED.pinDrop, power2In));
    const squashAt = at + FIXED.pinDrop;
    const reboundAt = squashAt + 0.06;
    let sx = 1, sy = 1;
    if (t >= squashAt && t < reboundAt) {
      const p = tw(t, squashAt, 0.06, power1In);
      sx = lerp(1, FIXED.squashX, p); sy = lerp(1, FIXED.squashY, p);
    } else if (t >= reboundAt) {
      const p = tw(t, reboundAt, FIXED.rebound, backOut(3));
      sx = lerp(FIXED.squashX, 1, p); sy = lerp(FIXED.squashY, 1, p);
    }
    const fxAt = reboundAt - 0.05;                       // 尘圈 "<-0.05"
    const ringP = tw(t, fxAt, 0.45, power2Out);
    const labelP = tw(t, fxAt, FIXED.labelSlide, power2Out);
    return { visible: t >= at, y, sx, sy, ringP, labelP };
  };

  // —— 路线生长进度（power1.inOut；mask 的 dashoffset 由它算）——
  const routeP = (i: number) => tw(t, routeAt[i], routeGrow, power1InOut);

  // —— 飞机贴线头飞（取点 + 切线角）——
  let plane: { x: number; y: number; deg: number; opacity: number; scale: number } | null = null;
  if (routes.length > 0 && t >= routeAt[0]) {
    let leg = 0;
    for (let i = 1; i < routes.length; i++) if (t >= routeAt[i]) leg = i;
    const r = routes[leg];
    const p = routeP(leg);
    const pt = r.pointAt(p * r.len);
    const next = r.pointAt(Math.min(p * r.len + 2, r.len));
    const deg = (Math.atan2(next.y - pt.y, next.x - pt.x) * 180) / Math.PI;
    const fadeP = tw(t, routeAt[routes.length - 1] + routeGrow + 0.1, 0.25, power2In);
    plane = { x: pt.x, y: pt.y, deg: deg + FIXED.planeAngle,
              opacity: 1 - fadeP, scale: lerp(1, 0.4, fadeP) };
  }

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>

      {/* 灰阶线框抽象地图底（非真实地图数据，静态语境） */}
      <svg style={{ position: "absolute", inset: 0, display: "block" }} viewBox="0 0 960 540">
        <defs>
          {routes.map((r, i) => {
            const L = r.len + 2;   // +2 保证走完后盖满整条路线（butt 线帽）
            return (
              <mask id={`mrp-reveal-${i + 1}`} key={i}>
                <path d={r.d} fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="butt"
                      strokeDasharray={L} strokeDashoffset={L * (1 - routeP(i))} />
              </mask>
            );
          })}
        </defs>

        {/* 经纬网 */}
        <g stroke="#ececef" strokeWidth={1}>
          <path d="M 120,0 V 540 M 240,0 V 540 M 360,0 V 540 M 480,0 V 540 M 600,0 V 540 M 720,0 V 540 M 840,0 V 540" />
          <path d="M 0,90 H 960 M 0,180 H 960 M 0,270 H 960 M 0,360 H 960 M 0,450 H 960" />
        </g>

        {/* 大陆板块 + 岛屿 */}
        <g>
          <path d="M -20,-20 L 690,-20 C 655,55 705,105 645,168
                   C 602,214 690,238 648,302
                   C 615,352 566,342 548,398
                   C 528,458 480,472 442,560 L -20,560 Z"
                fill="#f5f5f7" stroke="#d2d2d7" strokeWidth={2} />
          <ellipse cx={768} cy={196} rx={26} ry={13} fill="#f5f5f7" stroke="#d2d2d7" strokeWidth={1.5} transform="rotate(-18 768 196)" />
          <ellipse cx={812} cy={392} rx={18} ry={9} fill="#f5f5f7" stroke="#d2d2d7" strokeWidth={1.5} transform="rotate(12 812 392)" />
          {/* 内陆虚线省界 */}
          <path d="M 200,60 C 260,140 210,230 300,300 M 430,-10 C 400,90 470,140 430,150"
                fill="none" stroke="#d8d8dc" strokeWidth={1.2} strokeDasharray="3 6" />
        </g>

        {/* 城市基点 + 路线：随整组偏移 */}
        <g transform={`translate(${offsetX}, ${offsetY})`}>
          <g fill="#8a8a8a">
            {cities.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={3.5} />)}
          </g>
          {/* 贝塞尔虚线路线（被 mask 逐渐揭开）；路线色为语义色 */}
          {routes.map((r, i) => (
            <path key={i} d={r.d} mask={`url(#mrp-reveal-${i + 1})`}
                  fill="none" stroke={accentColor} strokeWidth={3.5} strokeDasharray="9 9" strokeLinecap="round" />
          ))}
        </g>
      </svg>

      {/* 图钉（anchor 钉在城市坐标，钉尖对准基点） */}
      {cities.map((c, i) => {
        const s = pinState(i);
        return (
          <div key={i} className="mrp-anchor" style={{ left: c.x + offsetX, top: c.y + offsetY }}>
            {/* 尘圈：fromTo 默认 immediateRender —— demo 从 0 帧起就以 scale0.2/op0.9 待命，照抄 */}
            <div className="mrp-ring" style={{
              opacity: t < pinAt[i] + FIXED.pinDrop + 0.01 ? 0.9 : lerp(0.9, 0, s.ringP),
              transform: `scale(${t < pinAt[i] + FIXED.pinDrop + 0.01 ? 0.2 : lerp(0.2, 1.6, s.ringP)})`,
            }} />
            <div className="mrp-pin" style={{
              opacity: s.visible ? 1 : 0,
              transform: `translateY(${s.y}px) scale(${s.sx}, ${s.sy})`,
            }}>
              <div className="mrp-pin-head" style={{ background: i === 0 ? FIXED.startPinColor : accentColor }} />
            </div>
            <div className="mrp-label" style={{
              fontSize: labelSize,
              opacity: s.labelP,
              transform: `translateX(${lerp(-14, 0, s.labelP)}px)`,
            }}>{c.label}</div>
          </div>
        );
      })}

      {/* 沿路线飞行的线头跟随物（灰阶 SVG 机头） */}
      {plane && (
        <svg viewBox="0 0 24 24" aria-hidden="true" style={{
          position: "absolute", left: 0, top: 0, width: 22, height: 22, zIndex: 3,
          opacity: plane.opacity,
          transform: `translate(${plane.x + offsetX}px, ${plane.y + offsetY}px) translate(-50%, -50%) rotate(${plane.deg}deg) scale(${plane.scale})`,
        }}>
          {/* 机头朝右（0°）：切线角直接用 */}
          <path d="M 21,12 L 3,4 L 8,12 L 3,20 Z" fill="#1d1d1f" />
        </svg>
      )}

      {/* 演示语境：主播小窗 */}
      <div className="mrp-pip"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "map-route-pin",
  name: "地图路线图钉",
  category: "数据信息图",
  durationInFrames: 155,
  accent: "#d8383a",
  component: MapRoutePin as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "pinsDsl", label: "图钉（每行：x|y|地名|弯cx|弯cy，首行无弯点）", default: DEFAULT_PINS },
    { type: "color", key: "accentColor", label: "强调色（图钉/路线）", default: "#d8383a" },
    { type: "slider", key: "labelSize", label: "地名字号", default: 16, min: 12, max: 24, step: 1, unit: "px" },
    { type: "number", key: "offsetX", label: "整组偏移 X", default: 0, step: 1, unit: "px" },
    { type: "number", key: "offsetY", label: "整组偏移 Y", default: 0, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.15, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "routeGrow", label: "单段路线生长", default: 1.1, min: 0.8, max: 1.5, step: 0.05, unit: "s" },
    { type: "slider", key: "legPause", label: "段间停顿", default: 0.4, min: 0, max: 1.2, step: 0.05, unit: "s" },
  ],
};
