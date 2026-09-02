import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { clamp01, lerp } from "../shared";

// slow-pull-reveal · 缓拉全貌 —— 参数化版（源出 tplcards/slow-pull-reveal.tsx）
// 命门：起点"咬在细节上的画幅"（偏移把兴趣点顶到画面中心）→ 终点回正为素材原样满画幅；
// 运镜曲线 camEase（末速非零 ⇒ hold 期无缝续走、镜头不停死）与兴趣点偏移 D 保持 FIXED。
// 仅开放颜色 / 文案 / 幅度与时长等语境级参数（时长与本段口播等长，实拍取 8~15s）。
const FPS = 30;

const FIXED = {
  zoomTo: 1.0,       // 终点＝素材原样满画幅（拉过 1.0 会露出素材外的空白）
  endRate: 0.55,     // 主拉末速 / 平均速的比：拉镜比推镜更该"收住"
  // 起手偏移：兴趣点（首个 KPI 卡）中心相对舞台中心的偏移（按默认版式实测定值）
  D: { x: -234.75, y: -156.5 },
};

// 运镜专用 ease（本库通用）：匀速 + 一点前载减速。
// 起速 = 平均速，末速 = r × 平均速（非零 ⇒ hold 期能无缝续走，镜头不停死）。
const camEase = (r: number) => (p: number) => p + (1 - r) * p * p * (1 - p);

// 每张 KPI 卡的 spark 柱高（演示语境，随卡固定）
const SPARKS: number[][] = [
  [36, 48, 42, 64, 58, 88],
  [52, 46, 60, 55, 68, 72],
  [78, 70, 66, 52, 47, 38],
  [40, 50, 47, 61, 66, 74],
];

const parseKpis = (dsl: string) =>
  dsl.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [lab = "", num = "", sub = ""] = l.split("|").map((s) => s.trim());
    return { lab, num, sub };
  });

const DEFAULT_KPIS = [
  "日活跃用户|1,284,900|较上周 +18.4%",
  "留存率|41.7%|较上周 +2.1pt",
  "单客成本|¥ 6.35|较上周 -12.0%",
  "付费转化|7.92%|较上周 +0.6pt",
].join("\n");

// 演示语境（不属于动效）：灰阶线框「数据看板截图」满画幅铺满舞台（类名加 spr- 前缀；
// 模板依赖 demo-shell 的全局 reset，此处收窄到 .spr-page 作用域内）
const CSS = `
.spr-page, .spr-page * { margin: 0; padding: 0; box-sizing: border-box; }
.spr-camera {                 /* 相机层：全卡唯一被 transform 的元素 */
  position: absolute;
  inset: 0;
  will-change: transform;
}
.spr-page { position: absolute; inset: 0; background: #ffffff; }

.spr-topbar {
  height: 44px;
  display: flex; align-items: center; gap: 14px;
  padding: 0 26px;
  border-bottom: 1px solid #e0e0e0;
}
.spr-topbar .spr-mark { width: 18px; height: 18px; border-radius: 5px; }
.spr-topbar .spr-title { font-size: 13px; font-weight: 600; letter-spacing: 0.5px; }
.spr-topbar .spr-seg { margin-left: auto; display: flex; border: 1px solid #d2d2d7; border-radius: 6px; overflow: hidden; }
.spr-topbar .spr-seg i { width: 46px; height: 20px; border-right: 1px solid #e0e0e0; }
.spr-topbar .spr-seg i:last-child { border-right: 0; }
.spr-topbar .spr-seg i.spr-on { background: #ececef; }

.spr-board { display: flex; height: 496px; }
.spr-rail { width: 132px; border-right: 1px solid #e0e0e0; padding: 16px 14px; }
.spr-rail .spr-grp { font-size: 9.5px; letter-spacing: 2px; color: #8a8a8a; margin: 0 0 9px 4px; }
.spr-rail .spr-item { display: flex; align-items: center; gap: 8px; height: 26px; padding: 0 4px; border-radius: 5px; }
.spr-rail .spr-item.spr-on { background: #f2f2f4; }
.spr-rail .spr-item i { width: 11px; height: 11px; border-radius: 3px; background: #d2d2d7; }
.spr-rail .spr-item.spr-on i { background: #8a8a8a; }
.spr-rail .spr-item b { flex: 1; height: 6px; border-radius: 2px; background: #e3e3e6; }
.spr-rail .spr-item.spr-on b { background: #c8c8cd; }
.spr-rail .spr-sep { height: 1px; background: #ececef; margin: 14px 4px; }

.spr-canvas { flex: 1; padding: 14px 20px; }
.spr-kpis { display: flex; gap: 14px; }
.spr-kpi {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 13px;
}
.spr-kpi .spr-lab { font-size: 10px; letter-spacing: 1.5px; color: #8a8a8a; }
.spr-kpi .spr-num { font-weight: 700; letter-spacing: -0.8px; margin: 4px 0 3px; }
.spr-kpi .spr-sub { font-size: 10px; color: #8a8a8a; }
.spr-kpi .spr-spark { height: 17px; margin-top: 7px; display: flex; align-items: flex-end; gap: 3px; }
.spr-kpi .spr-spark i { flex: 1; border-radius: 1px; background: #ececef; }
.spr-kpi.spr-lead { border-color: #c8c8cd; }
.spr-kpi.spr-lead .spr-spark i { background: #d8d8dd; }
.spr-kpi.spr-lead .spr-spark i:last-child { background: #8a8a8a; }

.spr-row2 { display: flex; gap: 14px; margin-top: 12px; }
.spr-panel { border: 1px solid #e0e0e0; border-radius: 8px; padding: 11px 13px; }
.spr-panel .spr-ptitle { font-size: 10.5px; letter-spacing: 1.5px; color: #8a8a8a; margin-bottom: 9px; }
.spr-chart { flex: 1.55; }
.spr-chart .spr-plot { position: relative; height: 152px; border-left: 1px solid #ececef; border-bottom: 1px solid #ececef; }
.spr-chart .spr-plot .spr-grid { position: absolute; left: 0; right: 0; height: 1px; background: #f4f4f6; }
.spr-chart .spr-plot svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.spr-chart .spr-xlab { display: flex; justify-content: space-between; margin-top: 7px; }
.spr-chart .spr-xlab i { width: 26px; height: 5px; border-radius: 2px; background: #ececef; }

.spr-list { flex: 1; }
.spr-lrow { display: flex; align-items: center; gap: 9px; height: 24px; }
.spr-lrow .spr-rank { font-size: 10px; color: #8a8a8a; width: 12px; }
.spr-lrow .spr-nm { flex: 1; height: 6px; border-radius: 2px; background: #e3e3e6; }
.spr-lrow .spr-val { width: 42px; height: 6px; border-radius: 2px; background: #ececef; }

.spr-row3 { display: flex; gap: 14px; margin-top: 12px; }
.spr-tile { flex: 1; border: 1px solid #e0e0e0; border-radius: 8px; height: 76px; padding: 10px 12px; }
.spr-tile .spr-lab { font-size: 9.5px; letter-spacing: 1.5px; color: #8a8a8a; }
.spr-tile .spr-bars { display: flex; align-items: flex-end; gap: 5px; height: 40px; margin-top: 8px; }
.spr-tile .spr-bars i { flex: 1; border-radius: 1px 1px 0 0; background: #ececef; }
.spr-tile .spr-donut {
  width: 40px; height: 40px; margin-top: 5px; border-radius: 50%;
  border: 6px solid #ececef; border-top-color: #8a8a8a; border-right-color: #8a8a8a;
}
`;

const LIST_WIDTHS = ["88%", "76%", "70%", "62%", "55%", "48%", "40%", "33%"];

interface Props {
  pageTitle?: string;
  kpisDsl?: string;
  chartTitle?: string;
  listTitle?: string;
  tileLabels?: string;
  ink?: string;
  chartLine?: string;
  numSize?: number;
  zoomFrom?: number;
  pullDur?: number;
  holdDur?: number;
}

const SlowPullReveal: React.FC<Props> = ({
  pageTitle = "增长看板 · 2026 Q3",
  kpisDsl = DEFAULT_KPIS,
  chartTitle = "近 12 周活跃趋势",
  listTitle = "渠道贡献 TOP 8",
  tileLabels = "分端占比 时段分布 地区分布 版本分布",
  ink = "#1d1d1f",
  chartLine = "#8a8a8a",
  numSize = 22,
  zoomFrom = 1.26,
  pullDur = 4.4,
  holdDur = 1.5,
}) => {
  const t = useCurrentFrame() / FPS;

  const z = zoomFrom;
  const D = FIXED.D;
  // 主拉只走全程的 k，余下留给 hold 期按主拉末速匀速续走 ⇒ 速度连续、看不出段落切换
  const total = z - FIXED.zoomTo;                       // 起手到原样要拉掉的总量
  const rate = (total / pullDur) * FIXED.endRate;       // 主拉末速（每秒拉掉多少 scale）
  const k = Math.max(0.1, 1 - (rate * holdDur) / total); // 下限防极端时长组合把曲线拉穿

  let scale: number, x: number, y: number;
  if (t < pullDur) {
    // 主拉：极缓减速拉远——画幅回正与缩放同步走
    const p = camEase(FIXED.endRate)(clamp01(t / pullDur));
    scale = lerp(z, z - total * k, p);
    x = lerp(-D.x, -D.x * (1 - k), p);
    y = lerp(-D.y, -D.y * (1 - k), p);
  } else {
    // hold 期：匀速拉完最后一点，停在素材原样满画幅——相机永不静止
    const p = clamp01((t - pullDur) / holdDur);
    scale = lerp(z - total * k, FIXED.zoomTo, p);
    x = lerp(-D.x * (1 - k), 0, p);
    y = lerp(-D.y * (1 - k), 0, p);
  }

  const kpis = parseKpis(kpisDsl);
  const tiles = tileLabels.trim().split(/\s+/);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="spr-camera" style={{
        transformOrigin: "50% 50%",
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
      }}>
        <div className="spr-page" style={{ color: ink }}>
          <div className="spr-topbar">
            <div className="spr-mark" style={{ background: ink }} />
            <div className="spr-title">{pageTitle}</div>
            <div className="spr-seg"><i /><i className="spr-on" /><i /></div>
          </div>

          <div className="spr-board">
            <div className="spr-rail">
              <div className="spr-grp">总览</div>
              <div className="spr-item spr-on"><i /><b /></div>
              <div className="spr-item"><i /><b /></div>
              <div className="spr-item"><i /><b /></div>
              <div className="spr-sep" />
              <div className="spr-grp">明细</div>
              <div className="spr-item"><i /><b /></div>
              <div className="spr-item"><i /><b /></div>
              <div className="spr-item"><i /><b /></div>
              <div className="spr-item"><i /><b /></div>
              <div className="spr-sep" />
              <div className="spr-grp">配置</div>
              <div className="spr-item"><i /><b /></div>
              <div className="spr-item"><i /><b /></div>
            </div>

            <div className="spr-canvas">
              <div className="spr-kpis">
                {/* 首张 = 起手咬住的细节（缓拉起点由它的中心反推，保持 4 行版式才与偏移 D 对位） */}
                {kpis.map((kpi, i) => (
                  <div key={i} className={i === 0 ? "spr-kpi spr-lead" : "spr-kpi"}>
                    <div className="spr-lab">{kpi.lab}</div>
                    <div className="spr-num" style={{ fontSize: numSize }}>{kpi.num}</div>
                    <div className="spr-sub">{kpi.sub}</div>
                    <div className="spr-spark">
                      {(SPARKS[i % SPARKS.length]).map((h, j) => (
                        <i key={j} style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="spr-row2">
                <div className="spr-panel spr-chart">
                  <div className="spr-ptitle">{chartTitle}</div>
                  <div className="spr-plot">
                    <div className="spr-grid" style={{ top: "25%" }} /><div className="spr-grid" style={{ top: "50%" }} /><div className="spr-grid" style={{ top: "75%" }} />
                    <svg viewBox="0 0 400 148" preserveAspectRatio="none">
                      <polyline points="0,124 36,116 72,104 108,110 144,92 180,80 216,84 252,62 288,52 324,44 360,30 396,18"
                        fill="none" stroke={chartLine} strokeWidth={2} />
                      <polyline points="0,134 36,131 72,126 108,127 144,120 180,116 216,117 252,110 288,106 324,103 360,98 396,93"
                        fill="none" stroke="#dcdce0" strokeWidth={2} strokeDasharray="5 4" />
                    </svg>
                  </div>
                  <div className="spr-xlab"><i /><i /><i /><i /><i /><i /></div>
                </div>
                <div className="spr-panel spr-list">
                  <div className="spr-ptitle">{listTitle}</div>
                  {LIST_WIDTHS.map((w, i) => (
                    <div key={i} className="spr-lrow">
                      <span className="spr-rank">{i + 1}</span>
                      <b className="spr-nm" style={{ width: w }} />
                      <span className="spr-val" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="spr-row3">
                <div className="spr-tile"><div className="spr-lab">{tiles[0] ?? ""}</div><div className="spr-donut" /></div>
                <div className="spr-tile"><div className="spr-lab">{tiles[1] ?? ""}</div><div className="spr-bars"><i style={{ height: "30%" }} /><i style={{ height: "46%" }} /><i style={{ height: "62%" }} /><i style={{ height: "88%" }} /><i style={{ height: "70%" }} /><i style={{ height: "52%" }} /><i style={{ height: "36%" }} /></div></div>
                <div className="spr-tile"><div className="spr-lab">{tiles[2] ?? ""}</div><div className="spr-bars"><i style={{ height: "82%" }} /><i style={{ height: "64%" }} /><i style={{ height: "56%" }} /><i style={{ height: "44%" }} /><i style={{ height: "38%" }} /><i style={{ height: "28%" }} /><i style={{ height: "22%" }} /></div></div>
                <div className="spr-tile"><div className="spr-lab">{tiles[3] ?? ""}</div><div className="spr-donut" style={{ borderTopColor: "#c8c8cd", borderLeftColor: "#8a8a8a" }} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "slow-pull-reveal",
  name: "缓拉全貌",
  category: "运镜",
  durationInFrames: 189,
  accent: "#8a8a8a",
  component: SlowPullReveal as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "pageTitle", label: "看板标题", default: "增长看板 · 2026 Q3" },
    { type: "textarea", key: "kpisDsl", label: "KPI 卡（每行：标签|数值|副注；首行=起手兴趣点，保持 4 行版式才对位）", default: DEFAULT_KPIS },
    { type: "text", key: "chartTitle", label: "折线面板标题", default: "近 12 周活跃趋势" },
    { type: "text", key: "listTitle", label: "榜单面板标题", default: "渠道贡献 TOP 8" },
    { type: "text", key: "tileLabels", label: "底部瓦片标签（空格分隔，4 个）", default: "分端占比 时段分布 地区分布 版本分布" },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "color", key: "chartLine", label: "折线主色", default: "#8a8a8a" },
    { type: "slider", key: "numSize", label: "KPI 数字字号", default: 22, min: 16, max: 30, step: 1, unit: "px" },
    { type: "slider", key: "zoomFrom", label: "起手特写倍数", default: 1.26, min: 1.12, max: 1.38, step: 0.01 },
    { type: "slider", key: "pullDur", label: "主拉时长（与口播等长）", default: 4.4, min: 2, max: 15, step: 0.1, unit: "s" },
    { type: "slider", key: "holdDur", label: "收尾续拉时长", default: 1.5, min: 0.5, max: 4, step: 0.1, unit: "s" },
  ],
};
