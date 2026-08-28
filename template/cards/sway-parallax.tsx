import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// sway-parallax · 左右摇移 —— 自包含 Remotion 源码（与 demos/sway-parallax/index.html 同画面）
// 复制本文件进你的工程即可用。镜头在宽页面前横向平移扫过，极轻 rotateY 跟随。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 198 };

const FPS = meta.fps;

// —— 动效本体（可整段摘走）：镜头在宽页面前横向平移扫过，极轻 rotateY 跟随 ——
// 命门：① 速度上限——观众要边扫读边听口播，超过 ~190px/s（960 宽画幅）文字跟不上；
//      ② rotateY 只做"跟随"（≤4°），大了就变成 3D 旋转卡不是摇移；
//      ③ 两端不撞停：起手缓入、收尾极缓减速但末速非零，hold 期继续漂。
const CONFIG = {
  panSpeed: 168,     // 摇移速度 px/s（按 960 宽画幅设计；换画幅按宽度等比折算）
  xFrom: 40,         // 起手位置：页面左端露在画幅内（留 40px 边距，别贴死）
  xTo: -770,         // 终点位置（负=页面往左走＝镜头往右摇）；行程 = |xTo − xFrom|
  swayDeg: 3.2,      // rotateY 跟随幅度：镜头往右摇时页面右侧后仰一点点，≤4°
  accelDur: 0.55,    // 起摇缓入时长：0 会瞬间满速，读作跳变
  holdDur: 1.1,      // 到位后的停留（讲述期）——继续以末速极缓漂
  endRate: 0.5,      // 主摇末速 / 平均速的比，收尾"收住"但不为零
  zLift: 14,         // 摇移时页面整体轻微前移（z），让透视位移更可读
};

/* 时间表（demo 秒）——由 CONFIG 推出：
   accelDist = 168×0.55/2 = 46.2，mainDur = (810−46.2)/168 ≈ 4.546
   0.000–0.550  起摇缓入（sine.in）：x 40→−6.2，rotY 0→1.44°，z 0→6.3
   0.550–5.096  主摇（camEase(0.5)）：x→−770，rotY→3.2°，z→14
   5.096–6.196  hold（linear）：x→−862.4（末速续漂），rotY→2.624°，z 保持 14 */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const sineIn = (x: number) => 1 - Math.cos((x * Math.PI) / 2);
// 运镜专用 ease（本库通用）：匀速 + 一点前载减速。
// 起速 = 平均速（接得上缓入段的末速），末速 = r × 平均速（非零 ⇒ hold 期无缝续漂）。
const camEase = (r: number) => (p: number) => p + (1 - r) * p * p * (1 - p);

// —— 演示语境（不属于动效）：一张 1720px 宽的灰阶线框「宽横幅长页」 ——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
/* 3D 舞台：perspective 让"极轻 rotateY 跟随"读出空间感（纯 x 位移只是滑动） */
.world {
  position: absolute;
  inset: 0;
  perspective: 1200px;         /* 摇移用大透视：值小了页面边缘会像鱼眼那样变形 */
  perspective-origin: 50% 50%;
  overflow: hidden;
}
/* 相机层：全卡唯一被 transform 的元素。承载一张比画幅宽得多的长页 */
.camera {
  position: absolute;
  left: 0; top: 50%;
  width: 1880px; height: 430px;      /* 页面比画幅宽近一倍——这是摇移成立的前提 */
  margin-top: -215px;
  transform-style: preserve-3d;
  will-change: transform;
}
.shadow {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: #000;
  opacity: 0.14;
  filter: blur(22px);
  transform: translateZ(-30px);
}

.page {
  position: absolute;
  inset: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  color: #1d1d1f;
  backface-visibility: hidden;
  display: flex;
}

.zone { padding: 30px 34px; border-right: 1px solid #ececef; }
.zone .zlab { font-size: 10px; letter-spacing: 3px; color: #8a8a8a; margin-bottom: 14px; }

/* 左端：品牌区 */
.zone.brand { width: 420px; display: flex; flex-direction: column; justify-content: center; }
.brand .mark { width: 40px; height: 40px; border-radius: 11px; background: #1d1d1f; margin-bottom: 18px; }
.brand h1 { font-size: 27px; font-weight: 700; line-height: 1.3; letter-spacing: -0.6px; }
.brand p { font-size: 12px; line-height: 1.8; color: #8a8a8a; margin-top: 12px; }
.brand .bar { height: 7px; border-radius: 2px; background: #ececef; margin-top: 9px; }

/* 中段：四段流程，横向排开 */
.zone.flow { flex: 1; display: flex; flex-direction: column; }
.flow .steps { flex: 1; display: flex; align-items: center; gap: 0; }
.step { width: 178px; flex: 0 0 auto; }
.step .no { font-size: 11px; letter-spacing: 2px; color: #8a8a8a; margin-bottom: 9px; }
.step .card {
  height: 152px;
  border: 1px solid #e0e0e0;
  border-radius: 9px;
  padding: 12px 13px;
}
.step .card .ico { width: 24px; height: 24px; border-radius: 7px; background: #ececef; margin-bottom: 11px; }
.step .card b { display: block; font-size: 13.5px; font-weight: 600; margin-bottom: 9px; }
.step .card i { display: block; height: 6px; border-radius: 2px; background: #ececef; margin-bottom: 5px; }
.step .card i.s { width: 58%; }
.step .card.hi { border-color: #c8c8cd; }
.step .card.hi .ico { background: #8a8a8a; }
.arrow { width: 40px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding-top: 20px; }
.arrow svg { width: 26px; height: 10px; }

/* 右端：数据总结 */
.zone.sum { width: 400px; border-right: 0; display: flex; flex-direction: column; justify-content: center; }
.sum .grid { display: flex; flex-wrap: wrap; gap: 12px; }
.sum .cell {
  width: calc(50% - 6px);
  border: 1px solid #ececef; border-radius: 8px; padding: 11px 12px;
}
.sum .cell .lab { font-size: 9.5px; letter-spacing: 1.5px; color: #8a8a8a; }
.sum .cell b { display: block; font-size: 22px; font-weight: 700; letter-spacing: -0.8px; margin-top: 4px; }
.sum .cell span { font-size: 9.5px; color: #8a8a8a; }
.sum .foot { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
.sum .foot .dot { width: 9px; height: 9px; border-radius: 50%; background: #8a8a8a; }
.sum .foot i { flex: 1; height: 6px; border-radius: 2px; background: #ececef; }
`;

const Arrow = () => (
  <div className="arrow">
    <svg viewBox="0 0 26 10"><path d="M0 5h20M16 1.5 20 5l-4 3.5" fill="none" stroke="#d2d2d7" strokeWidth={1.5} /></svg>
  </div>
);

export default function SwayParallax(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;

  const dist = Math.abs(C.xTo - C.xFrom);
  const dir = Math.sign(C.xTo - C.xFrom);              // -1 = 镜头往右摇
  const accelDist = (C.panSpeed * C.accelDur) / 2;     // 缓入段走过的距离
  const mainDur = (dist - accelDist) / C.panSpeed;
  const holdRate = C.panSpeed * C.endRate;             // 末速：hold 期沿用它续漂

  const t1 = C.accelDur;
  const t2 = t1 + mainDur;

  let x: number, ry: number, z: number;
  if (t < t1) {
    // 起摇：缓入到匀速（sine.in 的平均速正好是末速的一半 ⇒ 距离 = v·t/2，与算式自洽）
    const p = sineIn(clamp01(t / C.accelDur));
    x = lerp(C.xFrom, C.xFrom + dir * accelDist, p);
    ry = lerp(0, C.swayDeg * dir * -0.45, p);
    z = lerp(0, C.zLift * 0.45, p);
  } else if (t < t2) {
    // 主摇：匀速扫过 + rotateY 跟随到位（速度恒定是"镜头在平移"的全部）
    const p = camEase(C.endRate)(clamp01((t - t1) / mainDur));
    x = lerp(C.xFrom + dir * accelDist, C.xTo, p);
    ry = lerp(C.swayDeg * dir * -0.45, C.swayDeg * dir * -1, p);
    z = lerp(C.zLift * 0.45, C.zLift, p);
  } else {
    // hold 期：以末速继续漂 + rotateY 极缓回一点点（相机永不静止）
    const p = clamp01((t - t2) / C.holdDur);
    x = lerp(C.xTo, C.xTo + dir * holdRate * C.holdDur, p);
    ry = lerp(C.swayDeg * dir * -1, C.swayDeg * dir * -0.82, p);
    z = C.zLift;
  }

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="world">
        <div className="camera" style={{
          transform: `translate3d(${x}px, 0px, ${z}px) rotateY(${ry}deg)`,
        }}>
          <div className="shadow" />
          <div className="page">
            <div className="zone brand">
              <div className="zlab">工作流总览</div>
              <div className="mark" />
              <h1>一条流水线，把文案送到成片</h1>
              <p>四个环节各自可替换，中间产物全部可审、可回退。</p>
              <div className="bar" style={{ width: "88%" }} />
              <div className="bar" style={{ width: "66%" }} />
            </div>

            <div className="zone flow">
              <div className="zlab">四个环节</div>
              <div className="steps">
                <div className="step">
                  <div className="no">STEP 01</div>
                  <div className="card"><div className="ico" /><b>口播稿定稿</b><i /><i /><i className="s" /></div>
                </div>
                <Arrow />
                <div className="step">
                  <div className="no">STEP 02</div>
                  <div className="card"><div className="ico" /><b>合成与对齐</b><i /><i /><i className="s" /></div>
                </div>
                <Arrow />
                <div className="step">
                  <div className="no">STEP 03</div>
                  <div className="card hi"><div className="ico" /><b>分镜层矩阵</b><i /><i /><i className="s" /></div>
                </div>
                <Arrow />
                <div className="step">
                  <div className="no">STEP 04</div>
                  <div className="card"><div className="ico" /><b>渲染与验收</b><i /><i /><i className="s" /></div>
                </div>
              </div>
            </div>

            <div className="zone sum">
              <div className="zlab">实测结果</div>
              <div className="grid">
                <div className="cell"><div className="lab">总工时</div><b>4.2h</b><span>较人工 -71%</span></div>
                <div className="cell"><div className="lab">返工轮次</div><b>2</b><span>双 agent 循环</span></div>
                <div className="cell"><div className="lab">静止检测</div><b>PASS</b><span>首渲即过</span></div>
                <div className="cell"><div className="lab">成片时长</div><b>95s</b><span>十三句</span></div>
              </div>
              <div className="foot"><div className="dot" /><i /></div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
