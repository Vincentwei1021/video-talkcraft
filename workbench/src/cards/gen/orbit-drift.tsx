import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK } from "../shared";

// orbit-drift · 环绕微漂 —— 参数化版（源出 tplcards/orbit-drift.tsx）
// 命门：① 幅度必须小（rotY ≤7°、rotX ≤4~5°），大了就变成 3D 旋转秀；
//      ② 两轴相位差 90°（phaseX=0.25）是"环绕"而非"摆动"的唯一来源——保持 FIXED；
//      ③ 无始无终，整段都是 hold。开放页面文案/墨色/周期/两轴幅度。
const FPS = 30;

const FIXED = {
  baseRotY: -8,      // 基准姿态（度）：环绕是绕着这个姿态漂
  baseRotX: 2.5,
  phaseX: 0.25,      // 纵轴相位差：0.25 = 90°，命门
  ampZ: 22,          // 前后微呼吸 px
  phaseZ: 0.6,       // 呼吸相位：与两轴都错开
  shadowShift: 20,   // 投影跟随位移 px
  cycles: 1,         // demo 演示的圈数
  periodXRatio: 1.0,
};

// —— 演示语境（不属于动效）：灰阶线框「应用界面页」（类名加 od- 前缀防串卡） ——
const CSS = `
.od-world, .od-world * { margin: 0; padding: 0; box-sizing: border-box; }
.od-world {
  position: absolute;
  inset: 0;
  perspective: 900px;
  perspective-origin: 50% 48%;
}
.od-camera {
  position: absolute;
  left: 50%; top: 50%;
  width: 700px; height: 436px;
  margin: -218px 0 0 -350px;
  transform-style: preserve-3d;
  will-change: transform;
}
.od-shadow {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: #000;
  opacity: 0.16;
  filter: blur(24px);
}

.od-page {
  position: absolute;
  inset: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  overflow: hidden;
  backface-visibility: hidden;
  display: flex;
}

.od-rail { width: 158px; border-right: 1px solid #ececef; padding: 18px 15px; }
.od-rail .od-head { display: flex; align-items: center; gap: 9px; margin-bottom: 20px; }
.od-rail .od-head b { font-size: 12.5px; font-weight: 600; letter-spacing: 0.3px; }
.od-rail .od-grp { font-size: 9.5px; letter-spacing: 2px; color: #8a8a8a; margin: 0 0 9px 3px; }
.od-rail .od-nv { display: flex; align-items: center; gap: 9px; height: 28px; padding: 0 8px; border-radius: 7px; }
.od-rail .od-nv.od-on { background: #f2f2f4; }
.od-rail .od-nv i { width: 12px; height: 12px; border-radius: 4px; background: #d2d2d7; }
.od-rail .od-nv.od-on i { background: #8a8a8a; }
.od-rail .od-nv b { flex: 1; height: 6px; border-radius: 2px; background: #e3e3e6; }
.od-rail .od-nv.od-on b { background: #c8c8cd; }
.od-rail .od-sp { height: 1px; background: #ececef; margin: 15px 3px; }

.od-main { flex: 1; display: flex; flex-direction: column; }
.od-bar {
  height: 46px; flex: 0 0 auto;
  display: flex; align-items: center; gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid #ececef;
}
.od-bar h2 { font-weight: 600; letter-spacing: -0.2px; }
.od-bar .od-chip { font-size: 9.5px; color: #8a8a8a; border: 1px solid #e0e0e0; border-radius: 999px; padding: 3px 9px; }
.od-bar .od-act { margin-left: auto; display: flex; gap: 8px; }
.od-bar .od-act i { width: 26px; height: 26px; border-radius: 7px; border: 1px solid #e0e0e0; }

.od-split { flex: 1; display: flex; min-height: 0; }
.od-list { width: 288px; border-right: 1px solid #ececef; padding: 14px; overflow: hidden; }
.od-row {
  display: flex; gap: 10px; align-items: center;
  padding: 10px; border-radius: 9px; margin-bottom: 6px;
}
.od-row.od-on { background: #f6f6f8; }
.od-row .od-av { width: 30px; height: 30px; flex: 0 0 auto; border-radius: 9px; background: #ececef; }
.od-row.od-on .od-av { background: #d2d2d7; }
.od-row .od-tx { flex: 1; }
.od-row .od-tx b { display: block; height: 7px; border-radius: 2px; background: #e3e3e6; margin-bottom: 6px; }
.od-row .od-tx i { display: block; height: 5px; width: 62%; border-radius: 2px; background: #ececef; }
.od-row .od-st { width: 30px; height: 12px; border-radius: 999px; background: #ececef; }
.od-row.od-on .od-st { background: #c8c8cd; }

.od-detail { flex: 1; padding: 18px; }
.od-detail .od-dt { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.od-detail .od-dm { font-size: 10px; color: #8a8a8a; margin-bottom: 14px; }
.od-detail .od-kv { display: flex; gap: 10px; margin-bottom: 14px; }
.od-detail .od-kv div { flex: 1; border: 1px solid #ececef; border-radius: 8px; padding: 9px 10px; }
.od-detail .od-kv div span { display: block; font-size: 9px; letter-spacing: 1.2px; color: #8a8a8a; }
.od-detail .od-kv div b { display: block; font-size: 17px; font-weight: 700; letter-spacing: -0.5px; margin-top: 3px; }
.od-detail .od-plot {
  position: relative; height: 106px;
  border-left: 1px solid #ececef; border-bottom: 1px solid #ececef;
}
.od-detail .od-plot svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.od-detail .od-plot .od-g { position: absolute; left: 0; right: 0; height: 1px; background: #f4f4f6; }
.od-detail .od-ln { height: 6px; border-radius: 2px; background: #ececef; margin-top: 12px; }
`;

// "标签|值" DSL
const parseKv = (s: string): [string, string] => {
  const i = s.indexOf("|");
  return i >= 0 ? [s.slice(0, i).trim(), s.slice(i + 1).trim()] : [s.trim(), ""];
};

interface Props {
  appName?: string;
  groupA?: string;
  groupB?: string;
  barTitle?: string;
  chip?: string;
  detailTitle?: string;
  detailMeta?: string;
  kv1?: string;
  kv2?: string;
  ink?: string;
  titleSize?: number;
  orbit?: number;
  ampRotY?: number;
  ampRotX?: number;
  lead?: number;
}

const OrbitDrift: React.FC<Props> = ({
  appName = "Pipeline",
  groupA = "工作台",
  groupB = "资源",
  barTitle = "渲染队列",
  chip = "12 个任务",
  detailTitle = "deepseek-harness-v2",
  detailMeta = "1920×1080 · 95s · 三重验收全绿",
  kv1 = "渲染耗时|18m",
  kv2 = "静止段|0",
  ink = "#1d1d1f",
  titleSize = 14.5,
  orbit = 5.6,
  ampRotY = 6.2,
  ampRotX = 3.4,
  lead = 0,
}) => {
  const rawT = useCurrentFrame() / FPS;
  const C = FIXED;
  const TAU = Math.PI * 2;
  // 单条匀速 tween 驱动 t：超出有限段后停在终点（与 demo 播完定格一致）
  const t = Math.min(Math.max(0, rawT - lead), orbit * C.cycles);

  const sy = Math.sin((TAU * t) / orbit);
  // 纵轴带 90° 相位差 ⇒ 合成轨迹是椭圆（环绕），不是斜线（摆动）
  const sx = Math.sin(TAU * (t / (orbit * C.periodXRatio) + C.phaseX));
  const sz = Math.sin(TAU * (t / orbit + C.phaseZ));

  const rotY = C.baseRotY + ampRotY * sy;
  const rotX = C.baseRotX + ampRotX * sx;
  const z = C.ampZ * sz;
  // 投影反向跟随：页面向左倾时影子往右挪
  const shX = -sy * C.shadowShift;
  const shY = sx * C.shadowShift * 0.5;
  const shOp = 0.16 + sz * 0.03;

  const [kv1Label, kv1Value] = parseKv(kv1);
  const [kv2Label, kv2Value] = parseKv(kv2);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div className="od-world">
        <div className="od-camera" style={{
          transform: `translate3d(0px, 0px, ${z}px) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
        }}>
          <div className="od-shadow" style={{
            opacity: shOp,
            transform: `translate3d(${shX}px, ${shY}px, -40px)`,
          }} />
          <div className="od-page" style={{ color: ink }}>
            <div className="od-rail">
              <div className="od-head">
                <div style={{ width: 22, height: 22, borderRadius: 7, background: ink }} />
                <b>{appName}</b>
              </div>
              <div className="od-grp">{groupA}</div>
              <div className="od-nv od-on"><i /><b /></div>
              <div className="od-nv"><i /><b /></div>
              <div className="od-nv"><i /><b /></div>
              <div className="od-sp" />
              <div className="od-grp">{groupB}</div>
              <div className="od-nv"><i /><b /></div>
              <div className="od-nv"><i /><b /></div>
              <div className="od-nv"><i /><b /></div>
            </div>

            <div className="od-main">
              <div className="od-bar">
                <h2 style={{ fontSize: titleSize }}>{barTitle}</h2>
                <span className="od-chip">{chip}</span>
                <div className="od-act">
                  <i /><i />
                  <i style={{ background: ink, borderColor: ink }} />
                </div>
              </div>

              <div className="od-split">
                <div className="od-list">
                  <div className="od-row od-on"><div className="od-av" /><div className="od-tx"><b style={{ width: "78%" }} /><i /></div><div className="od-st" /></div>
                  <div className="od-row"><div className="od-av" /><div className="od-tx"><b style={{ width: "66%" }} /><i /></div><div className="od-st" /></div>
                  <div className="od-row"><div className="od-av" /><div className="od-tx"><b style={{ width: "82%" }} /><i /></div><div className="od-st" /></div>
                  <div className="od-row"><div className="od-av" /><div className="od-tx"><b style={{ width: "58%" }} /><i /></div><div className="od-st" /></div>
                  <div className="od-row"><div className="od-av" /><div className="od-tx"><b style={{ width: "71%" }} /><i /></div><div className="od-st" /></div>
                  <div className="od-row"><div className="od-av" /><div className="od-tx"><b style={{ width: "63%" }} /><i /></div><div className="od-st" /></div>
                </div>

                <div className="od-detail">
                  <div className="od-dt">{detailTitle}</div>
                  <div className="od-dm">{detailMeta}</div>
                  <div className="od-kv">
                    <div><span>{kv1Label}</span><b>{kv1Value}</b></div>
                    <div><span>{kv2Label}</span><b>{kv2Value}</b></div>
                  </div>
                  <div className="od-plot">
                    <div className="od-g" style={{ top: "33%" }} /><div className="od-g" style={{ top: "66%" }} />
                    <svg viewBox="0 0 300 106" preserveAspectRatio="none">
                      <polyline points="0,88 30,80 60,84 90,66 120,58 150,62 180,44 210,36 240,40 270,24 300,14"
                        fill="none" stroke="#8a8a8a" strokeWidth={2} />
                    </svg>
                  </div>
                  <div className="od-ln" style={{ width: "84%" }} />
                  <div className="od-ln" style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "orbit-drift",
  name: "环绕微漂",
  category: "运镜",
  durationInFrames: 180,
  accent: "#1d1d1f",
  component: OrbitDrift as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "appName", label: "应用名", default: "Pipeline" },
    { type: "text", key: "barTitle", label: "页面标题", default: "渲染队列" },
    { type: "text", key: "chip", label: "标题旁小标签", default: "12 个任务" },
    { type: "text", key: "groupA", label: "侧栏分组①", default: "工作台" },
    { type: "text", key: "groupB", label: "侧栏分组②", default: "资源" },
    { type: "text", key: "detailTitle", label: "详情标题", default: "deepseek-harness-v2" },
    { type: "text", key: "detailMeta", label: "详情副行", default: "1920×1080 · 95s · 三重验收全绿" },
    { type: "text", key: "kv1", label: "指标①（标签|值）", default: "渲染耗时|18m" },
    { type: "text", key: "kv2", label: "指标②（标签|值）", default: "静止段|0" },
    { type: "slider", key: "titleSize", label: "页面标题字号", default: 14.5, min: 10, max: 22, step: 0.5, unit: "px" },
    { type: "color", key: "ink", label: "墨色（深色元素）", default: "#1d1d1f" },
    { type: "slider", key: "orbit", label: "环绕一圈时长", default: 5.6, min: 4, max: 14, step: 0.1, unit: "s" },
    { type: "slider", key: "ampRotY", label: "横向环绕幅度", default: 6.2, min: 0, max: 7, step: 0.1, unit: "°" },
    { type: "slider", key: "ampRotX", label: "纵向环绕幅度", default: 3.4, min: 0, max: 4, step: 0.1, unit: "°" },
    { type: "slider", key: "lead", label: "起手静置", default: 0, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
