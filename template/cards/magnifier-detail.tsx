import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// magnifier-detail · 局部放大镜 —— 自包含 Remotion 源码（与 demos/magnifier-detail/index.html 同画面）
// 复制本文件进你的工程即可用。目标框 + 连接线 + 圆形放大镜（镜内轻微扫视防死）。
// demo 录制 32.25s 是录制上限截断（镜内扫视 repeat:-1 无限 idle）；
// tsx 按有限动画结束点（0.95s）+ 2s idle 展示收尾。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 101 };

const FPS = meta.fps;

// —— 可摘走的核心动画（复制 CONFIG + 组件内动画段即可复用）——
const CONFIG = {
  zoom: 1.8,            // 放大倍数：1.5~2，再大内容糊
  magSize: 210,         // 放大镜直径 px
  magX: 745, magY: 252, // 放大镜落位中心（截图旁的空白区，别盖住目标本体）
  popIn: 0.3,           // 弹出耗时 s
  dimTo: 0.8,           // 底图压暗 brightness：白底截图取 0.75~0.85（0.6 会把白压成大灰块）
  startDelay: 0.45,     // 截图先看清一拍再弹镜
  panPx: 7,             // hold 期间镜内轻微扫视幅度 px
};

// 目标点（#magTarget「4 小时 32 分」）在截图内的坐标：demo 运行时读 DOM，移植按同版式实测定值
const TARGET = { px: 468.6, py: 218, w: 92.8 };
const SHOT = { x: 56, y: 116, w: 540 };   // 与 .shot 的 left/top/width 保持一致

/* 时间表（demo 秒）
   0.45–0.75  放大镜从目标点弹出到落位（power3.out）；底图压暗 1→0.8；目标框淡入（0.45–0.65）
   0.70–0.95  连接线从目标点向放大镜描出（power2.out）
   0.95–∞     hold：镜内内容 ±12.6px 扫视（sine.inOut yoyo repeat:-1，1.4s 半程） */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// —— 演示语境（不属于动效）：假评测截图。白底 + 灰阶线框，零风格化 ——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
.shot {
  position: absolute;
  left: 56px;
  top: 116px;
  width: 540px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  color: #1d1d1f;
}
.shot .bar { display:flex; gap:6px; padding:10px 14px; border-bottom:1px solid #ececec; }
.shot .bar i { width:10px; height:10px; border-radius:50%; background:#e0e0e0; }
.shot .body { padding: 16px 22px 20px; }
.shot h3 { font-size: 20px; margin-bottom: 4px; }
.shot .sub { font-size: 12px; color:#8a8a8a; margin-bottom: 14px; }
.shot .row {
  display:flex; justify-content:space-between; align-items:center;
  padding: 10px 2px; border-bottom: 1px solid #ececec;
  font-size: 16px;
}
.shot .row .lab { color:#8a8a8a; }
.shot .row .val { font-weight: 700; }
/* —— 动效本体 —— 目标框 + 连接线 + 圆形镜。指示红是语义色（"看这里"），只用在动效本体上 */
.target-box {
  position:absolute; border:2px solid #ff4d4d; border-radius:6px;
  pointer-events:none;
}
#link-line { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
#magnifier {
  position:absolute; left:0; top:0;
  width: 210px; height: 210px;
  border-radius: 50%;
  border: 2px solid #1d1d1f;
  overflow: hidden;
  background: #ffffff;
}
#magnifier .mag-inner { position:absolute; left:0; top:0; transform-origin: 0 0; }
/* 放大副本：与 .shot 同结构，抹掉定位与边框 */
.mag-inner .shot { left:0; top:0; border:0; border-radius:0; }
`;

// 截图内容（底图与镜内副本共用一份结构，保证像素一致）
const ShotContent = () => (
  <>
    <div className="bar"><i /><i /><i /></div>
    <div className="body">
      <h3>星舟 Pro 14 · 实测数据</h3>
      <div className="sub">本站实验室 · 同一负载连续三轮取均值</div>
      <div className="row"><span className="lab">性能释放</span><span className="val">45W 持续</span></div>
      <div className="row"><span className="lab">屏幕亮度</span><span className="val">612 nit</span></div>
      <div className="row"><span className="lab">续航测试</span><span className="val">4 小时 32 分</span></div>
      <div className="row"><span className="lab">整机重量</span><span className="val">1.38 kg</span></div>
    </div>
  </>
);

export default function MagnifierDetail(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;

  // 目标点/落位点的舞台坐标
  const px = TARGET.px, py = TARGET.py;
  const tx = SHOT.x + px, ty = SHOT.y + py;
  const lineLen = Math.hypot(C.magX - tx, C.magY - ty);
  const dashTotal = Math.ceil(lineLen) + 10;

  // 放大镜弹出：从目标点原位起跳到落位（power3.out）
  const popP = tw(t, C.startDelay, C.popIn, power3Out);
  const magOpacity = popP;
  const magScale = lerp(0.3, 1, popP);
  const magX = lerp(tx, C.magX, popP);
  const magY = lerp(ty, C.magY, popP);

  // 底图同步压暗 + 目标框淡入（缺省 power1.out）
  const dim = lerp(1, C.dimTo, tw(t, C.startDelay, 0.3, power1Out));
  const boxOpacity = tw(t, C.startDelay, 0.2, power1Out);

  // 连接线从目标点向放大镜描出——告诉观众"放大的是这里"
  const lineP = tw(t, C.startDelay + C.popIn - 0.05, 0.25, power2Out);
  const dashOn = dashTotal * lineP, dashOff = dashTotal * (1 - lineP);

  // hold：镜内内容轻微平移扫视（sine.inOut yoyo repeat:-1），画面不呆
  const panT0 = C.startDelay + C.popIn + 0.2;
  let pan = 0;
  if (t > panT0) {
    const cyc = (t - panT0) / 1.4;
    const k = Math.floor(cyc);
    const p = cyc - k;
    const pp = k % 2 === 1 ? 1 - p : p;
    pan = -C.panPx * C.zoom * sineInOut(pp);
  }
  // 放大副本定位：让目标点正好落在镜心（pan 叠加在 x 上）
  const innerX = C.magSize / 2 - C.zoom * px + pan;
  const innerY = C.magSize / 2 - C.zoom * py;

  // 目标点细描边框几何
  const boxL = px - TARGET.w / 2 - 8, boxT = py - 16, boxW = TARGET.w + 16;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="shot" style={{ filter: `brightness(${dim})` }}>
        <ShotContent />
        <div className="target-box" style={{
          left: boxL, top: boxT, width: boxW, height: 32, opacity: boxOpacity,
        }} />
      </div>
      <svg id="link-line">
        <line x1={tx} y1={ty} x2={C.magX} y2={C.magY} stroke="#ff4d4d" strokeWidth={2}
          strokeDasharray={`${dashOn} ${dashOff}`} />
      </svg>
      <div id="magnifier" style={{
        opacity: magOpacity,
        transform: `translate(${magX - C.magSize / 2}px, ${magY - C.magSize / 2}px) scale(${magScale})`,
      }}>
        <div className="mag-inner" style={{
          transform: `translate(${innerX}px, ${innerY}px) scale(${CONFIG.zoom})`,
        }}>
          <div className="shot" style={{ position: "absolute", width: SHOT.w }}>
            <ShotContent />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
