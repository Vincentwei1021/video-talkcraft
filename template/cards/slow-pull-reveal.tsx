import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// slow-pull-reveal · 缓拉全貌 —— 自包含 Remotion 源码（与 demos/slow-pull-reveal/index.html 同画面）
// 复制本文件进你的工程即可用。从局部细节缓拉到全貌的一条拉镜曲线。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 189 };

const FPS = meta.fps;

// —— 动效本体（可整段摘走）：从局部细节缓拉到全貌的一条拉镜曲线 ——
// 命门：起点是"咬在细节上的画幅"（scale 1.26 + 偏移把兴趣点顶到画面中心），
// 终点回正为素材原样满画幅（scale 1、零偏移）——观众读到"原来这是一整张看板"。
const CONFIG = {
  zoomFrom: 1.26,    // 起手咬住细节的倍数：1.2~1.35；>1.4 起手已经糊了
  zoomTo: 1.0,       // 终点＝素材原样满画幅（拉过 1.0 会露出素材外的空白）
  pullDur: 4.4,      // 主拉时长（demo 秒；实拍取 8~15s，与本段口播等长）
  holdDur: 1.5,      // hold 期：把余下的一点极缓拉完，正好停在原样
  endRate: 0.55,     // 主拉末速 / 平均速的比：拉镜比推镜更该"收住"，取 0.5~0.65
};

// 起手偏移：兴趣点（#poi 左上 KPI 卡）中心相对舞台中心的偏移。
// demo 运行时读 DOM 反推，移植按同版式实测定值（POI 中心 245.25, 113.5）。
const D = { x: -234.75, y: -156.5 };

/* 时间表（demo 秒）
   0.00–4.40  主拉：scale 1.26→1.0488、offset (234.75,156.5)→(44.02,29.34)（camEase(0.55)）
   4.40–5.90  hold：匀速拉完最后一点，停在原样 scale 1、offset 0（linear） */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
// 运镜专用 ease（本库通用）：匀速 + 一点前载减速。
// 起速 = 平均速，末速 = r × 平均速（**非零** ⇒ hold 期能无缝续走，镜头不停死）。
const camEase = (r: number) => (p: number) => p + (1 - r) * p * p * (1 - p);

// —— 演示语境（不属于动效）：一张灰阶线框「数据看板截图」满画幅铺满舞台 ——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
.camera {                     /* 相机层：全卡唯一被 transform 的元素 */
  position: absolute;
  inset: 0;
  will-change: transform;
}
.page { position: absolute; inset: 0; background: #ffffff; color: #1d1d1f; }

.topbar {
  height: 44px;
  display: flex; align-items: center; gap: 14px;
  padding: 0 26px;
  border-bottom: 1px solid #e0e0e0;
}
.topbar .mark { width: 18px; height: 18px; border-radius: 5px; background: #1d1d1f; }
.topbar .title { font-size: 13px; font-weight: 600; letter-spacing: 0.5px; }
.topbar .seg { margin-left: auto; display: flex; border: 1px solid #d2d2d7; border-radius: 6px; overflow: hidden; }
.topbar .seg i { width: 46px; height: 20px; border-right: 1px solid #e0e0e0; }
.topbar .seg i:last-child { border-right: 0; }
.topbar .seg i.on { background: #ececef; }

.board { display: flex; height: 496px; }
.rail { width: 132px; border-right: 1px solid #e0e0e0; padding: 16px 14px; }
.rail .grp { font-size: 9.5px; letter-spacing: 2px; color: #8a8a8a; margin: 0 0 9px 4px; }
.rail .item { display: flex; align-items: center; gap: 8px; height: 26px; padding: 0 4px; border-radius: 5px; }
.rail .item.on { background: #f2f2f4; }
.rail .item i { width: 11px; height: 11px; border-radius: 3px; background: #d2d2d7; }
.rail .item.on i { background: #8a8a8a; }
.rail .item b { flex: 1; height: 6px; border-radius: 2px; background: #e3e3e6; }
.rail .item.on b { background: #c8c8cd; }
.rail .sep { height: 1px; background: #ececef; margin: 14px 4px; }

.canvas { flex: 1; padding: 14px 20px; }
.kpis { display: flex; gap: 14px; }
.kpi {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 13px;
}
.kpi .lab { font-size: 10px; letter-spacing: 1.5px; color: #8a8a8a; }
.kpi .num { font-size: 22px; font-weight: 700; letter-spacing: -0.8px; margin: 4px 0 3px; }
.kpi .sub { font-size: 10px; color: #8a8a8a; }
.kpi .spark { height: 17px; margin-top: 7px; display: flex; align-items: flex-end; gap: 3px; }
.kpi .spark i { flex: 1; border-radius: 1px; background: #ececef; }
.kpi.lead { border-color: #c8c8cd; }
.kpi.lead .spark i { background: #d8d8dd; }
.kpi.lead .spark i:last-child { background: #8a8a8a; }

.row2 { display: flex; gap: 14px; margin-top: 12px; }
.panel { border: 1px solid #e0e0e0; border-radius: 8px; padding: 11px 13px; }
.panel .ptitle { font-size: 10.5px; letter-spacing: 1.5px; color: #8a8a8a; margin-bottom: 9px; }
.chart { flex: 1.55; }
.chart .plot { position: relative; height: 152px; border-left: 1px solid #ececef; border-bottom: 1px solid #ececef; }
.chart .plot .grid { position: absolute; left: 0; right: 0; height: 1px; background: #f4f4f6; }
.chart .plot svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.chart .xlab { display: flex; justify-content: space-between; margin-top: 7px; }
.chart .xlab i { width: 26px; height: 5px; border-radius: 2px; background: #ececef; }

.list { flex: 1; }
.lrow { display: flex; align-items: center; gap: 9px; height: 24px; }
.lrow .rank { font-size: 10px; color: #8a8a8a; width: 12px; }
.lrow .nm { flex: 1; height: 6px; border-radius: 2px; background: #e3e3e6; }
.lrow .val { width: 42px; height: 6px; border-radius: 2px; background: #ececef; }

.row3 { display: flex; gap: 14px; margin-top: 12px; }
.tile { flex: 1; border: 1px solid #e0e0e0; border-radius: 8px; height: 76px; padding: 10px 12px; }
.tile .lab { font-size: 9.5px; letter-spacing: 1.5px; color: #8a8a8a; }
.tile .bars { display: flex; align-items: flex-end; gap: 5px; height: 40px; margin-top: 8px; }
.tile .bars i { flex: 1; border-radius: 1px 1px 0 0; background: #ececef; }
.tile .donut {
  width: 40px; height: 40px; margin-top: 5px; border-radius: 50%;
  border: 6px solid #ececef; border-top-color: #8a8a8a; border-right-color: #8a8a8a;
}
`;

export default function SlowPullReveal(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  const z = CONFIG.zoomFrom;
  // 主拉只走全程的 k，余下留给 hold 期按主拉末速匀速续走 ⇒ 速度连续、看不出段落切换
  const total = z - CONFIG.zoomTo;                          // 起手到原样要拉掉的总量
  const rate = (total / CONFIG.pullDur) * CONFIG.endRate;   // 主拉末速（每秒拉掉多少 scale）
  const k = 1 - (rate * CONFIG.holdDur) / total;

  let scale: number, x: number, y: number;
  if (t < CONFIG.pullDur) {
    // 主拉：极缓减速拉远——画幅回正与缩放同步走
    const p = camEase(CONFIG.endRate)(clamp01(t / CONFIG.pullDur));
    scale = lerp(z, z - total * k, p);
    x = lerp(-D.x, -D.x * (1 - k), p);
    y = lerp(-D.y, -D.y * (1 - k), p);
  } else {
    // hold 期：匀速拉完最后一点，停在素材原样满画幅——相机永不静止
    const p = clamp01((t - CONFIG.pullDur) / CONFIG.holdDur);
    scale = lerp(z - total * k, CONFIG.zoomTo, p);
    x = lerp(-D.x * (1 - k), 0, p);
    y = lerp(-D.y * (1 - k), 0, p);
  }

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="camera" style={{
        transformOrigin: "50% 50%",
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
      }}>
        <div className="page">
          <div className="topbar">
            <div className="mark" />
            <div className="title">增长看板 · 2026 Q3</div>
            <div className="seg"><i /><i className="on" /><i /></div>
          </div>

          <div className="board">
            <div className="rail">
              <div className="grp">总览</div>
              <div className="item on"><i /><b /></div>
              <div className="item"><i /><b /></div>
              <div className="item"><i /><b /></div>
              <div className="sep" />
              <div className="grp">明细</div>
              <div className="item"><i /><b /></div>
              <div className="item"><i /><b /></div>
              <div className="item"><i /><b /></div>
              <div className="item"><i /><b /></div>
              <div className="sep" />
              <div className="grp">配置</div>
              <div className="item"><i /><b /></div>
              <div className="item"><i /><b /></div>
            </div>

            <div className="canvas">
              <div className="kpis">
                {/* 起手咬住的细节：单个 KPI 卡（缓拉的起点由它的中心反推） */}
                <div className="kpi lead" id="poi">
                  <div className="lab">日活跃用户</div>
                  <div className="num">1,284,900</div>
                  <div className="sub">较上周 +18.4%</div>
                  <div className="spark"><i style={{ height: "36%" }} /><i style={{ height: "48%" }} /><i style={{ height: "42%" }} /><i style={{ height: "64%" }} /><i style={{ height: "58%" }} /><i style={{ height: "88%" }} /></div>
                </div>
                <div className="kpi">
                  <div className="lab">留存率</div>
                  <div className="num">41.7%</div>
                  <div className="sub">较上周 +2.1pt</div>
                  <div className="spark"><i style={{ height: "52%" }} /><i style={{ height: "46%" }} /><i style={{ height: "60%" }} /><i style={{ height: "55%" }} /><i style={{ height: "68%" }} /><i style={{ height: "72%" }} /></div>
                </div>
                <div className="kpi">
                  <div className="lab">单客成本</div>
                  <div className="num">¥ 6.35</div>
                  <div className="sub">较上周 -12.0%</div>
                  <div className="spark"><i style={{ height: "78%" }} /><i style={{ height: "70%" }} /><i style={{ height: "66%" }} /><i style={{ height: "52%" }} /><i style={{ height: "47%" }} /><i style={{ height: "38%" }} /></div>
                </div>
                <div className="kpi">
                  <div className="lab">付费转化</div>
                  <div className="num">7.92%</div>
                  <div className="sub">较上周 +0.6pt</div>
                  <div className="spark"><i style={{ height: "40%" }} /><i style={{ height: "50%" }} /><i style={{ height: "47%" }} /><i style={{ height: "61%" }} /><i style={{ height: "66%" }} /><i style={{ height: "74%" }} /></div>
                </div>
              </div>

              <div className="row2">
                <div className="panel chart">
                  <div className="ptitle">近 12 周活跃趋势</div>
                  <div className="plot">
                    <div className="grid" style={{ top: "25%" }} /><div className="grid" style={{ top: "50%" }} /><div className="grid" style={{ top: "75%" }} />
                    <svg viewBox="0 0 400 148" preserveAspectRatio="none">
                      <polyline points="0,124 36,116 72,104 108,110 144,92 180,80 216,84 252,62 288,52 324,44 360,30 396,18"
                        fill="none" stroke="#8a8a8a" strokeWidth={2} />
                      <polyline points="0,134 36,131 72,126 108,127 144,120 180,116 216,117 252,110 288,106 324,103 360,98 396,93"
                        fill="none" stroke="#dcdce0" strokeWidth={2} strokeDasharray="5 4" />
                    </svg>
                  </div>
                  <div className="xlab"><i /><i /><i /><i /><i /><i /></div>
                </div>
                <div className="panel list">
                  <div className="ptitle">渠道贡献 TOP 8</div>
                  <div className="lrow"><span className="rank">1</span><b className="nm" style={{ width: "88%" }} /><span className="val" /></div>
                  <div className="lrow"><span className="rank">2</span><b className="nm" style={{ width: "76%" }} /><span className="val" /></div>
                  <div className="lrow"><span className="rank">3</span><b className="nm" style={{ width: "70%" }} /><span className="val" /></div>
                  <div className="lrow"><span className="rank">4</span><b className="nm" style={{ width: "62%" }} /><span className="val" /></div>
                  <div className="lrow"><span className="rank">5</span><b className="nm" style={{ width: "55%" }} /><span className="val" /></div>
                  <div className="lrow"><span className="rank">6</span><b className="nm" style={{ width: "48%" }} /><span className="val" /></div>
                  <div className="lrow"><span className="rank">7</span><b className="nm" style={{ width: "40%" }} /><span className="val" /></div>
                  <div className="lrow"><span className="rank">8</span><b className="nm" style={{ width: "33%" }} /><span className="val" /></div>
                </div>
              </div>

              <div className="row3">
                <div className="tile"><div className="lab">分端占比</div><div className="donut" /></div>
                <div className="tile"><div className="lab">时段分布</div><div className="bars"><i style={{ height: "30%" }} /><i style={{ height: "46%" }} /><i style={{ height: "62%" }} /><i style={{ height: "88%" }} /><i style={{ height: "70%" }} /><i style={{ height: "52%" }} /><i style={{ height: "36%" }} /></div></div>
                <div className="tile"><div className="lab">地区分布</div><div className="bars"><i style={{ height: "82%" }} /><i style={{ height: "64%" }} /><i style={{ height: "56%" }} /><i style={{ height: "44%" }} /><i style={{ height: "38%" }} /><i style={{ height: "28%" }} /><i style={{ height: "22%" }} /></div></div>
                <div className="tile"><div className="lab">版本分布</div><div className="donut" style={{ borderTopColor: "#c8c8cd", borderLeftColor: "#8a8a8a" }} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
