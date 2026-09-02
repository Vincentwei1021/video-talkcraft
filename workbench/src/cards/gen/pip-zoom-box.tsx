import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2InOut, power2Out, tw } from "../shared";

// pip-zoom-box · 画中画放大 —— 参数化版（源出 tplcards/pip-zoom-box.tsx）
// 命门：框的几何与框内画面的补偿由同一个进度单点写入——拆成两条 tween 一定会
// "内容从框里滑出去"。浮现→停一拍→飞行→落位→箭头的节拍全部 FIXED；
// 开放放大倍数/框尺寸与定居位置/取景锚点/指示色/起手静置（箭头几何随框位置自动推导）。
const FPS = 30;

const FIXED = {
  radius0: 4,        // 取景框圆角 px（框小，圆角要小）
  radius1: 10,       // 定居后圆角 px
  showDur: 0.20,     // 取景框浮现耗时 s（scale 0.9→1 + 淡入）
  aimHold: 0.15,     // 浮现后停一拍再飞——"先框住，再拿走"
  flyDur: 0.50,      // 平移放大耗时 s（power2.inOut：相机曲线）
  arrowAt: 0.05,     // 箭头相对落位的延迟 s
  arrowDur: 0.18,    // 箭杆划出耗时 s
  arrowGap: 18,      // 箭尖离白边卡的间距 px（不戳到）
  cardEdge: 8,       // 白边卡宽 px
  shaftLen: 58,      // 箭杆长 px
  headDx: 13, headDy: 10,  // 箭头两翼尺寸 px
};

const power1In = (x: number) => x * x;

// —— 层级：底层全景（z1） → 箭头（z4） → 画中画变换组（z5）——
// 动态部分（细描边颜色 / 箭头颜色 / 几何）全部内联。
const CSS = `
.pz-scene {
  position: absolute;
  left: 0; top: 0;
  width: 960px; height: 540px;        /* 与舞台等尺寸——框内副本才能与框外像素一致 */
  background: #ffffff;
  z-index: 1;
}
.pz-scene .pz-host-col {              /* 人物列：占左 55%，人物落在这列中央 */
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 55%;
  overflow: hidden;
}

/* —— 动效本体 —— 画中画变换组：框（几何）+ 框内画面副本（反向补偿）+ 两层边饰 —— */
.pz-shell {
  position: absolute;
  z-index: 5;
  will-change: left, top, width, height;
}
.pz-win {                             /* 取景窗：唯一做 overflow hidden 的元素 */
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #ffffff;
}
.pz-win .pz-scene { z-index: 0; }     /* 框内的画面副本（与底层同结构、同像素） */

/* 边饰两层：起手细描边（取景框）→ 落位白边卡（证据素材） */
.pz-hair, .pz-card { position: absolute; inset: 0; pointer-events: none; }
.pz-card {
  box-shadow: 0 0 0 8px #ffffff,               /* 白边卡 */
              0 12px 60px rgba(0, 0, 0, 0.22); /* 全系统唯一投影：只给证据素材 */
}

/* 指向箭头：从人物指向定居后的画中画（单向，不是回指出处的连接线） */
.pz-arrow { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 4; pointer-events: none; }
.pz-arrow path { fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
`;

interface Props {
  zoom?: number;
  boxW?: number;
  boxH?: number;
  targetX?: number;
  targetY?: number;
  faceX?: number;
  faceY?: number;
  frameColor?: string;
  lead?: number;
}

const PipZoomBox: React.FC<Props> = ({
  zoom = 2.2,
  boxW = 280,
  boxH = 280,
  targetX = 764,
  targetY = 270,
  faceX = 0.275,
  faceY = 0.315,
  frameColor = "#0066cc",
  lead = 0.40,
}) => {
  const t = useCurrentFrame() / FPS;
  const C = FIXED;
  const SW = 960, SH = 540;
  const fx = SW * faceX, fy = SH * faceY;
  const w0 = boxW / zoom, h0 = boxH / zoom;

  const tFly = lead + C.showDur + C.aimHold;
  const tLand = tFly + C.flyDur;

  // ② 框带着内容平移放大到右侧定居（几何单点写入，框内画面全程锁在锚点上）
  const pT = tw(t, tFly, C.flyDur, power2InOut);
  const z = lerp(1, zoom, pT);
  const w = lerp(w0, boxW, pT);
  const h = lerp(h0, boxH, pT);
  const cx = lerp(fx, targetX, pT);
  const cy = lerp(fy, targetY, pT);
  const r = lerp(C.radius0, C.radius1, pT);

  // ① 取景框在锚点处浮现——"框住这里"（scale 作用在整个变换组上）
  const showP = tw(t, lead, C.showDur, power2Out);
  const shellOpacity = showP;
  const shellScale = lerp(0.9, 1, showP);

  // ③ 交接边饰：细取景描边在后半程退场，白边卡 + 唯一投影在落位那一刻立住
  const hairOpacity = 1 - tw(t, tFly + C.flyDur * 0.6, 0.22, power1In);
  const cardOpacity = tw(t, tLand - 0.06, 0.18, power2Out);

  // ④ 箭头：落位后才从人物一侧划向画中画。几何由定居框推导：
  //    箭尖 = 框左缘 − 白边 − 间距；默认参数下与模板逐像素一致（540→598 @ y270）
  const tipX = targetX - boxW / 2 - C.cardEdge - C.arrowGap;
  const rootX = tipX - C.shaftLen;
  const headLen = 2 * Math.hypot(C.headDx, C.headDy);
  const shaftOff = C.shaftLen * (1 - tw(t, tLand + C.arrowAt, C.arrowDur, power2Out));
  const headOff = headLen * (1 - tw(t, tLand + C.arrowAt + C.arrowDur * 0.7, 0.1, power2Out));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      {/* 底层全景（演示语境）：人物占左侧，右侧留白给画中画定居 */}
      <div className="pz-scene">
        <div className="pz-host-col"><HostSilhouette /></div>
      </div>

      <svg className="pz-arrow" viewBox="0 0 960 540">
        <path d={`M ${rootX} ${targetY} L ${tipX} ${targetY}`} stroke={frameColor}
          strokeDasharray={C.shaftLen} strokeDashoffset={shaftOff} />
        <path d={`M ${tipX - C.headDx} ${targetY - C.headDy} L ${tipX} ${targetY} L ${tipX - C.headDx} ${targetY + C.headDy}`}
          stroke={frameColor} strokeDasharray={headLen} strokeDashoffset={headOff} />
      </svg>

      {/* 画中画变换组 */}
      <div className="pz-shell" style={{
        left: cx - w / 2, top: cy - h / 2, width: w, height: h,
        opacity: shellOpacity,
        transform: `scale(${shellScale})`, transformOrigin: "50% 50%",
      }}>
        <div className="pz-win" style={{ borderRadius: r }}>
          {/* 反向补偿：副本自身放大 zoom 倍，偏移让"锚点"恒落在框心——画面本身永不变形 */}
          <div className="pz-scene" style={{
            transformOrigin: "0 0",
            transform: `translate(${w / 2 - z * fx}px, ${h / 2 - z * fy}px) scale(${z})`,
          }}>
            <div className="pz-host-col"><HostSilhouette /></div>
          </div>
        </div>
        <div className="pz-hair" style={{
          opacity: hairOpacity, borderRadius: r,
          boxShadow: `0 0 0 1.5px ${frameColor}`,
        }} />
        <div className="pz-card" style={{ opacity: cardOpacity, borderRadius: r }} />
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "pip-zoom-box",
  name: "画中画放大",
  category: "运镜",
  durationInFrames: 112,
  accent: "#0066cc",
  component: PipZoomBox as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "slider", key: "zoom", label: "放大倍数", default: 2.2, min: 1.6, max: 3, step: 0.05 },
    { type: "number", key: "boxW", label: "画中画宽", default: 280, min: 120, max: 480, step: 1, unit: "px" },
    { type: "number", key: "boxH", label: "画中画高", default: 280, min: 120, max: 480, step: 1, unit: "px" },
    { type: "number", key: "targetX", label: "定居中心 X", default: 764, min: 0, max: 960, step: 1, unit: "px" },
    { type: "number", key: "targetY", label: "定居中心 Y", default: 270, min: 0, max: 540, step: 1, unit: "px" },
    { type: "slider", key: "faceX", label: "取景锚点 X（0~1）", default: 0.275, min: 0, max: 1, step: 0.005 },
    { type: "slider", key: "faceY", label: "取景锚点 Y（0~1）", default: 0.315, min: 0, max: 1, step: 0.005 },
    { type: "color", key: "frameColor", label: "取景框/箭头色", default: "#0066cc" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
