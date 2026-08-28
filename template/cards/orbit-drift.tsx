import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// orbit-drift · 环绕微漂 —— 自包含 Remotion 源码（与 demos/orbit-drift/index.html 同画面）
// 复制本文件进你的工程即可用。3D 空间里绕静态页面做小幅环绕。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 180 };

const FPS = meta.fps;

// —— 动效本体（可整段摘走）：3D 空间里绕静态页面做小幅环绕 ——
// 两轴正弦相位错开 90° ⇒ 轨迹是椭圆，镜头在页面前"绕着走"而不是来回摆。
// 命门：① 幅度必须小（rotY ≤7°、rotX ≤4°），大了就变成 3D 旋转秀、正文读不了；
//      ② 相位差必须是 90°（0 或 180° 退化成一条斜线＝摆动，不是环绕）；
//      ③ 无始无终——本卡整段都是 hold（"镜头呼吸"的高级版），永不静止。
const CONFIG = {
  orbit: 5.6,        // 环绕一圈的时长 s（demo 压缩值；**实拍取 9~14s**，越长越"高级"）
  baseRotY: -8,      // 基准姿态（度）：环绕是绕着这个姿态漂，不是绕正视位
  baseRotX: 2.5,     //   —— 0/0 也成立（正视位微漂），但给一点基准更像"摆在空间里的页面"
  ampRotY: 6.2,      // 横向环绕幅度（度）：3~7；>8 页面左右边缘透视差过大，文字变形
  ampRotX: 3.4,      // 纵向环绕幅度（度）：约取 ampRotY 的一半（横向轨迹更宽更自然）
  phaseX: 0.25,      // 纵轴相位差（周期的比例）：0.25 = 90°，"环绕"而非"摆动"的唯一来源
  ampZ: 22,          // 前后微呼吸 px：环绕同时轻微进退，去掉就只是转不是绕
  phaseZ: 0.6,       // 呼吸相位：与两轴都错开，读作第三层独立的"活"
  shadowShift: 20,   // 投影跟随位移 px：光源不动、物体在绕 ⇒ 影子必须反向挪
  cycles: 1,         // demo 演示的圈数（实拍是整段 hold，随讲述长度无限续）
  // 三轴同周期 ⇒ 轨迹是闭合椭圆、每 orbit 秒严丝合缝地回到起点（画廊循环无跳帧）。
  // **长 hold（>2 圈）落地时把 periodX 错开 20~30%**（如 9s / 6.8s）让椭圆缓慢进动，
  // 否则观众会认出重复的轨道，读作机械转台——见配方卡"已知坑"。
  periodXRatio: 1.0,
};

/* 时间表（demo 秒）：0.0–5.6 单条匀速 tween 驱动 t，整段一个连续的正弦叠加（无段落切换） */

// —— 演示语境（不属于动效）：灰阶线框「应用界面页」——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
/* 3D 舞台：perspective 900px（比立面卡更近一点，环绕的位移差才读得出来） */
.world {
  position: absolute;
  inset: 0;
  perspective: 900px;
  perspective-origin: 50% 48%;
}
/* 相机层：全卡唯一被 transform 的元素 */
.camera {
  position: absolute;
  left: 50%; top: 50%;
  width: 700px; height: 436px;
  margin: -218px 0 0 -350px;
  transform-style: preserve-3d;
  will-change: transform;
}
/* 投影层：跟着页面在 3D 空间里一起转，环绕时自然产生位移差＝页面真的浮着 */
.shadow {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: #000;
  opacity: 0.16;
  filter: blur(24px);
}

.page {
  position: absolute;
  inset: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  overflow: hidden;
  color: #1d1d1f;
  backface-visibility: hidden;
  display: flex;
}

.rail { width: 158px; border-right: 1px solid #ececef; padding: 18px 15px; }
.rail .head { display: flex; align-items: center; gap: 9px; margin-bottom: 20px; }
.rail .head .mk { width: 22px; height: 22px; border-radius: 7px; background: #1d1d1f; }
.rail .head b { font-size: 12.5px; font-weight: 600; letter-spacing: 0.3px; }
.rail .grp { font-size: 9.5px; letter-spacing: 2px; color: #8a8a8a; margin: 0 0 9px 3px; }
.rail .nv { display: flex; align-items: center; gap: 9px; height: 28px; padding: 0 8px; border-radius: 7px; }
.rail .nv.on { background: #f2f2f4; }
.rail .nv i { width: 12px; height: 12px; border-radius: 4px; background: #d2d2d7; }
.rail .nv.on i { background: #8a8a8a; }
.rail .nv b { flex: 1; height: 6px; border-radius: 2px; background: #e3e3e6; }
.rail .nv.on b { background: #c8c8cd; }
.rail .sp { height: 1px; background: #ececef; margin: 15px 3px; }

.main { flex: 1; display: flex; flex-direction: column; }
.bar {
  height: 46px; flex: 0 0 auto;
  display: flex; align-items: center; gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid #ececef;
}
.bar h2 { font-size: 14.5px; font-weight: 600; letter-spacing: -0.2px; }
.bar .chip { font-size: 9.5px; color: #8a8a8a; border: 1px solid #e0e0e0; border-radius: 999px; padding: 3px 9px; }
.bar .act { margin-left: auto; display: flex; gap: 8px; }
.bar .act i { width: 26px; height: 26px; border-radius: 7px; border: 1px solid #e0e0e0; }
.bar .act i.solid { background: #1d1d1f; border-color: #1d1d1f; }

.split { flex: 1; display: flex; min-height: 0; }
.list { width: 288px; border-right: 1px solid #ececef; padding: 14px; overflow: hidden; }
.row {
  display: flex; gap: 10px; align-items: center;
  padding: 10px; border-radius: 9px; margin-bottom: 6px;
}
.row.on { background: #f6f6f8; }
.row .av { width: 30px; height: 30px; flex: 0 0 auto; border-radius: 9px; background: #ececef; }
.row.on .av { background: #d2d2d7; }
.row .tx { flex: 1; }
.row .tx b { display: block; height: 7px; border-radius: 2px; background: #e3e3e6; margin-bottom: 6px; }
.row .tx i { display: block; height: 5px; width: 62%; border-radius: 2px; background: #ececef; }
.row .st { width: 30px; height: 12px; border-radius: 999px; background: #ececef; }
.row.on .st { background: #c8c8cd; }

.detail { flex: 1; padding: 18px; }
.detail .dt { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.detail .dm { font-size: 10px; color: #8a8a8a; margin-bottom: 14px; }
.detail .kv { display: flex; gap: 10px; margin-bottom: 14px; }
.detail .kv div { flex: 1; border: 1px solid #ececef; border-radius: 8px; padding: 9px 10px; }
.detail .kv div span { display: block; font-size: 9px; letter-spacing: 1.2px; color: #8a8a8a; }
.detail .kv div b { display: block; font-size: 17px; font-weight: 700; letter-spacing: -0.5px; margin-top: 3px; }
.detail .plot {
  position: relative; height: 106px;
  border-left: 1px solid #ececef; border-bottom: 1px solid #ececef;
}
.detail .plot svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.detail .plot .g { position: absolute; left: 0; right: 0; height: 1px; background: #f4f4f6; }
.detail .ln { height: 6px; border-radius: 2px; background: #ececef; margin-top: 12px; }
`;

export default function OrbitDrift(_props: { hostSrc?: string }) {
  const rawT = useCurrentFrame() / FPS;
  const C = CONFIG;
  const TAU = Math.PI * 2;
  // 单条匀速 tween 驱动 t：超出有限段后停在终点（与 demo 播完定格一致）
  const t = Math.min(rawT, C.orbit * C.cycles);

  const sy = Math.sin((TAU * t) / C.orbit);
  // 纵轴带 90° 相位差：sy 走到极值时 sx 正好过零 ⇒ 合成轨迹是椭圆（环绕），不是斜线（摆动）
  const sx = Math.sin(TAU * (t / (C.orbit * C.periodXRatio) + C.phaseX));
  const sz = Math.sin(TAU * (t / C.orbit + C.phaseZ));

  const rotY = C.baseRotY + C.ampRotY * sy;
  const rotX = C.baseRotX + C.ampRotX * sx;
  const z = C.ampZ * sz;
  // 投影反向跟随：页面向左倾时影子往右挪，读作"页面在光下转"
  const shX = -sy * C.shadowShift;
  const shY = sx * C.shadowShift * 0.5;
  const shOp = 0.16 + sz * 0.03;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="world">
        <div className="camera" style={{
          transform: `translate3d(0px, 0px, ${z}px) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
        }}>
          <div className="shadow" style={{
            opacity: shOp,
            transform: `translate3d(${shX}px, ${shY}px, -40px)`,
          }} />
          <div className="page">
            <div className="rail">
              <div className="head"><div className="mk" /><b>Pipeline</b></div>
              <div className="grp">工作台</div>
              <div className="nv on"><i /><b /></div>
              <div className="nv"><i /><b /></div>
              <div className="nv"><i /><b /></div>
              <div className="sp" />
              <div className="grp">资源</div>
              <div className="nv"><i /><b /></div>
              <div className="nv"><i /><b /></div>
              <div className="nv"><i /><b /></div>
            </div>

            <div className="main">
              <div className="bar">
                <h2>渲染队列</h2>
                <span className="chip">12 个任务</span>
                <div className="act"><i /><i /><i className="solid" /></div>
              </div>

              <div className="split">
                <div className="list">
                  <div className="row on"><div className="av" /><div className="tx"><b style={{ width: "78%" }} /><i /></div><div className="st" /></div>
                  <div className="row"><div className="av" /><div className="tx"><b style={{ width: "66%" }} /><i /></div><div className="st" /></div>
                  <div className="row"><div className="av" /><div className="tx"><b style={{ width: "82%" }} /><i /></div><div className="st" /></div>
                  <div className="row"><div className="av" /><div className="tx"><b style={{ width: "58%" }} /><i /></div><div className="st" /></div>
                  <div className="row"><div className="av" /><div className="tx"><b style={{ width: "71%" }} /><i /></div><div className="st" /></div>
                  <div className="row"><div className="av" /><div className="tx"><b style={{ width: "63%" }} /><i /></div><div className="st" /></div>
                </div>

                <div className="detail">
                  <div className="dt">deepseek-harness-v2</div>
                  <div className="dm">1920×1080 · 95s · 三重验收全绿</div>
                  <div className="kv">
                    <div><span>渲染耗时</span><b>18m</b></div>
                    <div><span>静止段</span><b>0</b></div>
                  </div>
                  <div className="plot">
                    <div className="g" style={{ top: "33%" }} /><div className="g" style={{ top: "66%" }} />
                    <svg viewBox="0 0 300 106" preserveAspectRatio="none">
                      <polyline points="0,88 30,80 60,84 90,66 120,58 150,62 180,44 210,36 240,40 270,24 300,14"
                        fill="none" stroke="#8a8a8a" strokeWidth={2} />
                    </svg>
                  </div>
                  <div className="ln" style={{ width: "84%" }} />
                  <div className="ln" style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
