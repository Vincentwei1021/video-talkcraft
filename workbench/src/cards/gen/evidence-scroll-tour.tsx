import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, clamp01, lerp, linear, tw } from "../shared";

// evidence-scroll-tour · 证据长页慢滚 —— 参数化版（源出 tplcards/evidence-scroll-tour.tsx）
// 命门：一条速度曲线（缓入→匀速→减速停→再启动→滚完）+ 停留防死呼吸；加减速段
// 时长 = 2×距离/速度 保证与匀速段速度连续。长页内容走 textarea 逐行 DSL，
// 页高与红框停点由流式几何模型推导（常数按模板实测值校准，默认 DSL 逐像素还原原页）。
const FPS = 30;

const FIXED = {
  stopAlign: 0.5,    // 目标条目停在视口高度的比例位置（0.5 = 垂直中线）
  decelDist: 90,     // 减速提前量 px：太短像急刹
  accelDist: 45,     // 起滚/再启动的加速距离 px
  breathScale: 1.03, // 停留期红框呼吸幅度
  vh: 369,           // 视口高（窗高 404 − 窗栏 34 − 1px 边线）
};

// —— 长页 DSL：每行一条 ——
//   h|标题             条款小标题
//   bars|92,lt85,78    一串正文灰条（数字 = 宽度%；lt 前缀 = 浅色）
//   mark|标注文本|后续正文   带红框标注的条款
//   stop|标注文本|后续正文   同上，且滚动在此停留（红框呼吸）
type El =
  | { kind: "h"; text: string }
  | { kind: "bars"; widths: { w: number; lt: boolean }[] }
  | { kind: "mark" | "stop"; text: string; tail: string };

function parseDoc(dsl: string): El[] {
  const els: El[] = [];
  for (const line of dsl.split("\n")) {
    if (line.trim() === "") continue;
    const parts = line.split("|");
    const k = parts[0].trim();
    if (k === "h") els.push({ kind: "h", text: parts.slice(1).join("|").trim() });
    else if (k === "bars") {
      const widths = (parts[1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map((s) => {
          const lt = s.startsWith("lt");
          return { w: Number(lt ? s.slice(2) : s) || 0, lt };
        });
      els.push({ kind: "bars", widths });
    } else if (k === "mark" || k === "stop") {
      els.push({ kind: k, text: (parts[1] ?? "").trim(), tail: parts.slice(2).join("|").trim() });
    }
  }
  return els;
}

// —— 流式几何模型：与 CSS 完全同参地走一遍页面（含相邻外边距折叠）——
// R = 参考机 UA normal 行高比实测校准值：代回模板得 pageH 1162.0 / boxTop 629.9（实测 1162 / 629.94）
const R = 1.3852;
function layoutDoc(els: El[], clauseFont: number) {
  const C = clauseFont * 1.7;                 // 条款行高（line-height 1.7）
  let y = 26;                                 // 页顶内边距
  let prevMb = 0;
  const place = (h: number, mt: number, mb: number) => {
    y += Math.max(prevMb, mt);
    const top = y;
    y += h;
    prevMb = mb;
    return top;
  };
  place(21 * R, 0, 8);                        // h1
  place(12 * R, 0, 14);                       // meta
  place(1, 0, 16);                            // rule
  let stopTop: number | null = null;
  for (const el of els) {
    if (el.kind === "h") place(14.5 * R, 18, 10);
    else if (el.kind === "bars") el.widths.forEach(() => place(9, 12, 12));
    else {
      const top = place(C, 12, 12);
      if (el.kind === "stop") stopTop = top;
    }
  }
  place(54, 26, 0);                           // 签署区（两列灰条，装饰）
  y += 34;                                    // 页底内边距
  return {
    pageH: y,
    boxTop: stopTop === null ? y / 2 : stopTop - 4,
    boxH: stopTop === null ? 0 : C + 7,       // 红框上探 4 下探 3
  };
}

const DEFAULT_DOC = [
  "h|第一条　借款金额与期限",
  "bars|92,85,lt78,92,lt66,85,lt52,78",
  "h|第二条　利息与综合费用",
  "bars|92,lt85",
  "mark|综合年化费率以签约页面实际展示为准|，并可能包含服务费。",
  "bars|85,lt78,66,lt40",
  "h|第三条　逾期与违约责任",
  "bars|92,lt85,78,lt66",
  "stop|逾期费率按日 1%，且不设累计上限|，自逾期之日起计收。",
  "bars|85,lt52,66",
  "h|第四条　个人信息授权",
  "bars|92,lt85,78,lt92,66,lt52,85",
  "h|第五条　争议解决",
  "bars|92,lt78,85,lt66,40",
].join("\n");

const power2In = (x: number) => x * x * x;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// 静态版式（类名加 est- 前缀；reset 只作用于本卡子树，不外泄）
const CSS = `
.est-doc, .est-doc *, .est-badge, .est-badge * { margin: 0; padding: 0; box-sizing: border-box; }
.est-doc {
  position: absolute;
  width: 620px;
  height: 404px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
}
.est-titlebar {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-bottom: 1px solid #ececec;
  font-size: 12px;
  color: #8a8a8a;
}
.est-titlebar i { width: 9px; height: 9px; border-radius: 50%; background: #d2d2d7; }
.est-titlebar .est-fname { margin-left: 8px; letter-spacing: 1px; }
.est-viewport {
  position: relative;
  height: 369px;
  overflow: hidden;
}
.est-page {
  position: absolute;
  left: 0; right: 0; top: 0;
  padding: 26px 36px 34px;
  will-change: transform;
  color: #1d1d1f;
}
.est-page h1 { font-size: 21px; font-weight: 700; text-align: center; margin-bottom: 8px; }
.est-page .est-meta { font-size: 12px; color: #8a8a8a; text-align: center; margin-bottom: 14px; }
.est-page .est-rule { height: 1px; background: #ececec; margin: 0 0 16px; }
.est-page h2 { font-size: 14.5px; font-weight: 700; margin: 18px 0 10px; }
.est-page .est-bar { height: 9px; border-radius: 3px; background: #e3e3e6; margin: 12px 0; }
.est-page .est-bar.est-lt { background: #ececef; }
.est-page .est-clause { line-height: 1.7; margin: 12px 0; }
.est-page .est-sign { display: flex; gap: 60px; margin-top: 26px; }
.est-page .est-sign > div { flex: 1; }
.est-markwrap { position: relative; display: inline-block; font-weight: 700; }
.est-markbox {
  position: absolute;
  left: -9px; right: -9px; top: -4px; bottom: -3px;
  border-radius: 7px 4px 8px 5px / 5px 8px 4px 7px;
  pointer-events: none;
}
.est-badge {
  position: absolute;
  left: 28px; bottom: 26px;
  width: 100px; height: 100px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
`;

interface Props {
  docLines?: string;
  docTitle?: string;
  docMeta?: string;
  fileName?: string;
  markColor?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  startDelay?: number;
  stopHold?: number;
  scrollSpeed?: number;
}

const EvidenceScrollTour: React.FC<Props> = ({
  docLines = DEFAULT_DOC,
  docTitle = "个人借款服务协议",
  docMeta = "合同编号：2024-XJD-1107 · 甲方：某消费金融有限公司",
  fileName = "个人借款服务协议（2024 修订版）.pdf",
  markColor = "#e53935",
  fontSize = 13.5,
  posX = 170,
  posY = 62,
  startDelay = 0.6,
  stopHold = 1.5,
  scrollSpeed = 130,
}) => {
  const t = useCurrentFrame() / FPS;
  const els = parseDoc(docLines);
  const geo = layoutDoc(els, fontSize);

  // 停点：让红框中心停在视口 stopAlign 位置
  const maxScroll = Math.max(0, geo.pageH - FIXED.vh);
  let stopY = geo.boxTop + geo.boxH / 2 - FIXED.vh * FIXED.stopAlign;
  stopY = Math.max(0, Math.min(stopY, maxScroll));

  // 分段时长：加/减速段按 2×距离/速度（保证与匀速段速度连续，无阶跃）
  const v = Math.max(1, scrollSpeed);
  const tAccel = (2 * FIXED.accelDist) / v;
  const tDecel = (2 * FIXED.decelDist) / v;
  const u1 = Math.max(0, stopY - FIXED.decelDist - FIXED.accelDist);
  const u2 = Math.max(0, maxScroll - FIXED.decelDist - stopY - FIXED.accelDist);

  // 绝对时刻表
  const a0 = startDelay;              // 缓入起滚
  const a1 = a0 + tAccel;             // 匀速巡览
  const a2 = a1 + u1 / v;             // 提前减速
  const a3 = a2 + tDecel;             // 停留（呼吸）
  const a4 = a3 + stopHold;           // 再启动
  const a5 = a4 + tAccel;             // 匀速
  const a6 = a5 + u2 / v;             // 收尾减速

  let y: number;
  if (t < a1) y = lerp(0, -FIXED.accelDist, tw(t, a0, tAccel, power2In));
  else if (t < a2) y = lerp(-FIXED.accelDist, -(stopY - FIXED.decelDist), tw(t, a1, u1 / v, linear));
  else if (t < a4) y = lerp(-(stopY - FIXED.decelDist), -stopY, tw(t, a2, tDecel, power2Out));
  else if (t < a5) y = lerp(-stopY, -(stopY + FIXED.accelDist), tw(t, a4, tAccel, power2In));
  else if (t < a6) y = lerp(-(stopY + FIXED.accelDist), -(maxScroll - FIXED.decelDist), tw(t, a5, u2 / v, linear));
  else y = lerp(-(maxScroll - FIXED.decelDist), -maxScroll, tw(t, a6, tDecel, power2Out));

  // 停留期红框一次完整呼吸（sine.inOut yoyo repeat 1）
  let boxScale = 1;
  if (t > a3 && t < a4) {
    const half = stopHold / 2;
    const cyc = (t - a3) / half;
    const p = cyc < 1 ? cyc : 2 - cyc;
    boxScale = lerp(1, FIXED.breathScale, sineInOut(clamp01(p)));
  }

  const markBoxStyle = (breathing: boolean): React.CSSProperties => ({
    borderWidth: 2.5, borderStyle: "solid", borderColor: markColor,
    ...(breathing ? { transform: `scale(${boxScale})`, transformOrigin: "50% 50%" } : {}),
  });

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div className="est-doc" style={{ left: posX, top: posY }}>
        <div className="est-titlebar"><i /><i /><i /><span className="est-fname">{fileName}</span></div>
        <div className="est-viewport">
          <div className="est-page" style={{ transform: `translateY(${y}px)` }}>
            <h1>{docTitle}</h1>
            <div className="est-meta">{docMeta}</div>
            <div className="est-rule" />

            {els.map((el, i) => {
              if (el.kind === "h") return <h2 key={i}>{el.text}</h2>;
              if (el.kind === "bars") return (
                <React.Fragment key={i}>
                  {el.widths.map((b, j) => (
                    <div key={j} className={"est-bar" + (b.lt ? " est-lt" : "")} style={{ width: `${b.w}%` }} />
                  ))}
                </React.Fragment>
              );
              return (
                <div key={i} className="est-clause" style={{ fontSize }}>
                  <span className="est-markwrap">
                    <span className="est-markbox" style={markBoxStyle(el.kind === "stop")} />
                    {el.text}
                  </span>
                  {el.tail}
                </div>
              );
            })}

            <div className="est-sign">
              <div><div className="est-bar" style={{ width: "66%" }} /><div className="est-bar est-lt" style={{ width: "40%" }} /></div>
              <div><div className="est-bar" style={{ width: "66%" }} /><div className="est-bar est-lt" style={{ width: "40%" }} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="est-badge"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "evidence-scroll-tour",
  name: "证据长页慢滚",
  category: "素材呈现",
  durationInFrames: 320,
  accent: "#e53935",
  component: EvidenceScrollTour as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "textarea", key: "docLines",
      label: "长页内容（每行：h|标题 / bars|92,lt85,… 灰条宽% lt=浅色 / mark|标注文本|后续正文 / stop|标注文本|后续正文＝停留处）",
      default: DEFAULT_DOC,
    },
    { type: "text", key: "docTitle", label: "文档大标题", default: "个人借款服务协议" },
    { type: "text", key: "docMeta", label: "文档眉注", default: "合同编号：2024-XJD-1107 · 甲方：某消费金融有限公司" },
    { type: "text", key: "fileName", label: "窗栏文件名", default: "个人借款服务协议（2024 修订版）.pdf" },
    { type: "color", key: "markColor", label: "标注红框色", default: "#e53935" },
    { type: "slider", key: "fontSize", label: "条款字号（停点几何随动）", default: 13.5, min: 11, max: 18, step: 0.5, unit: "px" },
    { type: "number", key: "posX", label: "文档窗 X", default: 170, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "文档窗 Y", default: 62, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起滚前静置", default: 0.6, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "stopHold", label: "关键条目停留", default: 1.5, min: 0.5, max: 4, step: 0.1, unit: "s" },
    { type: "slider", key: "scrollSpeed", label: "匀速滚速", default: 130, min: 80, max: 220, step: 5, unit: "px/s" },
  ],
};
