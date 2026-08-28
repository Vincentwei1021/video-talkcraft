import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// gooey-morph · 图块拼入 —— 自包含 Remotion 源码（与 demos/gooey-morph/index.html 同画面）
// 俄罗斯方块式 L 形路径把 n 张图拼成一条，拼完即落点。
//   ① 落位按张数自动算：一条横排、整体居中于图区 —— 改 count 就换张数
//   ② 每张走 L 形路径：先横向滑到自己的列，再纵向落进行位
//      （两轴同时走就是斜线飞入，那是普通 fly-in；L 形才读作"方块被吸到位"）
//   ③ 起飞时刻故意不按左右顺序 —— 顺序依次到位读作程序循环
//   ④ 缓动 cubic-bezier(0.88,0.14,0.12,0.86)：极陡的中段（起手慢、中间猛、收尾稳）
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 97 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数 ——
const CONFIG = {
  // —— 张数与尺寸 ——
  // count 是唯一的"几张图"入口：entryFrom / entryAt 不够长时自动循环取用，
  // 所以 3 张、5 张、6 张都直接改这一个数字（>6 张单张就小到看不清内容了）
  count: 4,
  picW: 106,             // 单张宽的**上限** px：整条装不下时按图区自动等比收窄
  picAspect: 0.755,      // 高/宽（4:3 略扁，读作照片而不是方块）——宽收窄时高跟着收
  gap: 5,                // 张间缝 px：小缝才读作"拼成一条"，>20 就是几张各自摆着
  sideMargin: 34,        // 整条两侧至少留的余白 px：这条保证末张不会被图区 overflow 切掉

  // —— L 形入场 ——
  travel: 1.0,           // 单张行程 s：前半程走 x、后半程走 y
  // 起手位（相对自己落位的 px 偏移）：x 一律为正 = 全部从图区右外侧进场。
  // 不许给负 x —— 图区左边紧挨着人物，从左飞入会横穿人物身上（且被 overflow 切）。
  // 竖向偏移 ±150 以上才看得出"落进行位"这一下；一半从上、一半从下，避免四张同轨
  entryFrom: [[300, 190], [430, -180], [360, -195], [500, 175]] as Array<[number, number]>,
  entryAt: [0.267, 0, 0.133, 0.433],   // 各张起飞时刻 s（故意不按左右顺序）
  hold: 1.4,             // 收尾定格：拼好的一条就是本卡的落点
};

/* 时间表（demo 秒）
   0.000–1.267  第 2 张（entryAt 0）先飞，其余按 entryAt 错峰起飞，各走 1.0s L 形路径
   1.433        最晚一张（entryAt 0.433）到位
   1.433–2.833  收尾定格：拼好的一条就是落点 */

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
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// 主持人占位：演示语境素材，不属于动效本体
const Host: React.FC<{ src?: string }> = ({ src }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex",
                alignItems: "flex-end", justifyContent: "center", background: "#fff" }}>
    {src ? (
      <Loop durationInFrames={13 * FPS}>
        <OffthreadVideo src={src} muted transparent style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)", height: "88%" }} />
      </Loop>
    ) : (
      <div style={{ width: "42%", height: "78%", background:
        "radial-gradient(ellipse 46% 26% at 50% 13%, #e3e3e6 60%, transparent 61%)," +
        "radial-gradient(ellipse 50% 62% at 50% 84%, #ececef 60%, transparent 61%)" }} />
    )}
  </div>
);

// —— 演示语境（不属于动效）：主持人占左一列，图在右侧白区拼起来 ——
const CSS = `
.host-wrap { position: absolute; left: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }

/* 图区：人物右侧净白区（宽 509px）。overflow hidden 让图从区外飞进来时不越到人物身上 */
.gm-zone {
  position: absolute;
  left: 47%; right: 0; top: 0; bottom: 0;
  overflow: hidden;
}

/* 单张图：白边 + 投影 = "一张实体照片被拼上来"的语义。
   内容是灰阶假图（占位不属于动效）——山 + 日的极简剪影 */
.gm-pic {
  position: absolute;
  left: 0; top: 0;
  background: #e9e9ec;
  border: 4px solid #fff;
  border-radius: 3px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, .14);
  overflow: hidden;
  will-change: transform;
}
.gm-pic .sun {
  position: absolute;
  border-radius: 50%;
  background: #c9c9ce;
}
/* 两座山用两个旋转的方块切出斜边——纯 CSS，不引外部素材 */
.gm-pic .hill {
  position: absolute;
  background: #b4b4bb;
  transform: rotate(45deg);
  border-radius: 4px;
}
.gm-pic .hill.far { background: #cbcbd1; }
`;

// —— 落位布局（与 demo 的 layout() 同公式；图区 = 960×53% × 540）——
const ZONE_W = 960 * 0.53;   // 508.8
const ZONE_H = 540;
const AVAIL = ZONE_W - CONFIG.sideMargin * 2 - CONFIG.gap * (CONFIG.count - 1);
const PIC_W = Math.min(CONFIG.picW, Math.floor(AVAIL / CONFIG.count));
const PIC_H = Math.round(PIC_W * CONFIG.picAspect);
const STRIP_W = CONFIG.count * PIC_W + (CONFIG.count - 1) * CONFIG.gap;
const REST_Y = (ZONE_H - PIC_H) / 2;
const REST: Array<[number, number]> = Array.from({ length: CONFIG.count }, (_, i) =>
  [(ZONE_W - STRIP_W) / 2 + i * (PIC_W + CONFIG.gap), REST_Y]);

export default function GooeyMorph({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const d = PIC_W;   // 内容尺寸随张宽等比，换尺寸不用改

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <div className="gm-zone">
        {REST.map((e, i) => {
          const off = C.entryFrom[i % C.entryFrom.length];
          const s: [number, number] = [e[0] + off[0], e[1] + off[1]];
          const startAt = C.entryAt[i % C.entryAt.length];
          // L 形：前半程只走 x（k<0.5），后半程只走 y —— 拐点就是"到了自己的列"
          const k = TRAVEL_EASE(clamp01((t - startAt) / C.travel));
          const kx = Math.min(1, k * 2);
          const ky = Math.max(0, k * 2 - 1);
          const x = s[0] + (e[0] - s[0]) * kx;
          const y = s[1] + (e[1] - s[1]) * ky;
          return (
            <div key={i} className="gm-pic" style={{
              width: PIC_W, height: PIC_H,
              transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`,
            }}>
              <div className="sun" style={{
                width: d * 0.16, height: d * 0.16, right: d * 0.16, top: d * 0.13 }} />
              <div className="hill far" style={{
                width: d * 0.5, height: d * 0.5, left: d * 0.42, top: d * 0.42 }} />
              <div className="hill" style={{
                width: d * 0.56, height: d * 0.56, left: d * 0.04, top: d * 0.46 }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
