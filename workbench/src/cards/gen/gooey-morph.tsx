import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, clamp01 } from "../shared";

// gooey-morph · 图块拼入 —— 参数化版（源出 tplcards/gooey-morph.tsx）
// 命门：L 形路径（先横滑到列、再纵落进行位）、极陡 bezier 缓动、
// 起飞时刻故意不按左右顺序 —— entryFrom / entryAt / travel 全部 FIXED。
// 开放的是张数（落位按张数自动算）、单张尺寸/缝隙、占位图配色、图区位置与整体延后。
const FPS = 30;

const FIXED = {
  picAspect: 0.755,      // 高/宽（4:3 略扁，读作照片而不是方块）
  sideMargin: 34,        // 整条两侧至少留的余白 px（保证末张不被图区 overflow 切掉）
  travel: 1.0,           // 单张行程 s：前半程走 x、后半程走 y
  // 起手位（相对落位的 px 偏移）：x 一律为正 = 全部从图区右外侧进场（左边紧挨人物）。
  entryFrom: [[300, 190], [430, -180], [360, -195], [500, 175]] as Array<[number, number]>,
  entryAt: [0.267, 0, 0.133, 0.433],   // 各张起飞时刻 s（故意不按左右顺序）
};

// cubic-bezier 解算（与 demo 同实现：牛顿迭代，误差 < 1e-5）
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return function (p: number) {
    let t = p;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - p;
      if (Math.abs(e) < 1e-6) break;
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = Math.max(0, Math.min(1, t));
    return ((ay * t + by) * t + cy) * t;
  };
}
const TRAVEL_EASE = cubicBezier(0.88, 0.14, 0.12, 0.86);

// —— 演示语境（不属于动效）：主持人占左一列，图在右侧白区拼起来（类名加 gm- 前缀）——
const CSS = `
.gm-host-wrap { position: absolute; left: 0; top: 0; bottom: 0; overflow: hidden; }

/* 图区：人物右侧净白区。overflow hidden 让图从区外飞进来时不越到人物身上 */
.gm-zone {
  position: absolute;
  right: 0; top: 0; bottom: 0;
  overflow: hidden;
}

/* 单张图：白边 + 投影 = "一张实体照片被拼上来"的语义 */
.gm-pic {
  position: absolute;
  left: 0; top: 0;
  border: 4px solid #fff;
  border-radius: 3px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, .14);
  overflow: hidden;
  will-change: transform;
  box-sizing: border-box;
}
.gm-pic .gm-sun {
  position: absolute;
  border-radius: 50%;
}
/* 两座山用两个旋转的方块切出斜边——纯 CSS，不引外部素材 */
.gm-pic .gm-hill {
  position: absolute;
  transform: rotate(45deg);
  border-radius: 4px;
}
`;

interface Props {
  count?: number;
  photoBg?: string;
  hillColor?: string;
  farHillColor?: string;
  sunColor?: string;
  picW?: number;
  gap?: number;
  posX?: number;
  posY?: number;
  lead?: number;
}

const GooeyMorph: React.FC<Props> = ({
  count = 4,
  photoBg = "#e9e9ec",
  hillColor = "#b4b4bb",
  farHillColor = "#cbcbd1",
  sunColor = "#c9c9ce",
  picW = 106,
  gap = 5,
  posX = 451.2,          // 图区左边线（= 960 × 47%，人物列宽与其互补）
  posY = 0,              // 条带相对垂直居中的偏移
  lead = 0,
}) => {
  const t = useCurrentFrame() / FPS - lead;
  const n = Math.max(1, Math.round(count));

  // —— 落位布局（与模板 layout() 同公式；张数/尺寸/图区随 props 推导）——
  const zoneW = 960 - posX;
  const avail = zoneW - FIXED.sideMargin * 2 - gap * (n - 1);
  const w = Math.min(picW, Math.floor(avail / n));   // 整条装不下时按图区自动等比收窄
  const h = Math.round(w * FIXED.picAspect);
  const stripW = n * w + (n - 1) * gap;
  const restY = (540 - h) / 2 + posY;
  const rest: Array<[number, number]> = Array.from({ length: n }, (_, i) =>
    [(zoneW - stripW) / 2 + i * (w + gap), restY]);
  const d = w;   // 占位图内容尺寸随张宽等比

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div className="gm-host-wrap" style={{ width: posX }}><HostSilhouette /></div>
      <div className="gm-zone" style={{ left: posX }}>
        {rest.map((e, i) => {
          // entryFrom / entryAt 不够长时自动循环取用（模板同款：改 count 即换张数）
          const off = FIXED.entryFrom[i % FIXED.entryFrom.length];
          const s: [number, number] = [e[0] + off[0], e[1] + off[1]];
          const startAt = FIXED.entryAt[i % FIXED.entryAt.length];
          // L 形：前半程只走 x（k<0.5），后半程只走 y —— 拐点就是"到了自己的列"
          const k = TRAVEL_EASE(clamp01((t - startAt) / FIXED.travel));
          const kx = Math.min(1, k * 2);
          const ky = Math.max(0, k * 2 - 1);
          const x = s[0] + (e[0] - s[0]) * kx;
          const y = s[1] + (e[1] - s[1]) * ky;
          return (
            <div key={i} className="gm-pic" style={{
              width: w, height: h, background: photoBg,
              transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`,
            }}>
              <div className="gm-sun" style={{
                background: sunColor,
                width: d * 0.16, height: d * 0.16, right: d * 0.16, top: d * 0.13 }} />
              <div className="gm-hill" style={{
                background: farHillColor,
                width: d * 0.5, height: d * 0.5, left: d * 0.42, top: d * 0.42 }} />
              <div className="gm-hill" style={{
                background: hillColor,
                width: d * 0.56, height: d * 0.56, left: d * 0.04, top: d * 0.46 }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "gooey-morph",
  name: "图块拼入",
  category: "素材呈现",
  durationInFrames: 97,
  accent: "#b4b4bb",
  component: GooeyMorph as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "slider", key: "count", label: "张数（落位自动重排）", default: 4, min: 2, max: 6, step: 1 },
    { type: "color", key: "photoBg", label: "相纸底色", default: "#e9e9ec" },
    { type: "color", key: "hillColor", label: "近山色", default: "#b4b4bb" },
    { type: "color", key: "farHillColor", label: "远山色", default: "#cbcbd1" },
    { type: "color", key: "sunColor", label: "日轮色", default: "#c9c9ce" },
    { type: "slider", key: "picW", label: "单张宽上限（装不下自动收窄）", default: 106, min: 60, max: 150, step: 1, unit: "px" },
    { type: "slider", key: "gap", label: "张间缝（小缝才读作拼成一条）", default: 5, min: 2, max: 18, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "图区左边线 X（人物列宽随动）", default: 451.2, step: 0.1, unit: "px" },
    { type: "number", key: "posY", label: "条带纵向偏移", default: 0, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置（整体延后）", default: 0, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
