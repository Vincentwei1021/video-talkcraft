import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { clamp01, lerp } from "../shared";

// slow-push-in · 缓推特写 —— 参数化版（源出 tplcards/slow-push-in.tsx）
// 命门：运镜曲线 camEase——起速 = 平均速、末速非零 ⇒ hold 期匀速续推、镜头永不停死
// （"缓推不能用 power2"的技术答案：power2.out 末速为 0，镜头会停死）。曲线与兴趣点 ORIGIN 保持 FIXED。
// 仅开放颜色 / 文案 / 幅度与时长等语境级参数（时长与本段口播等长，实拍取 8~15s）。
const FPS = 30;

const FIXED = {
  zoomFrom: 1.0,     // 起始缩放（1 = 素材原样满画幅）
  endRate: 0.6,      // 主推末速 / 平均速的比：1=全程匀速，0.6=极缓减速"到位"感；<0.35 像撒手
  // 兴趣点（引文块）中心：按默认版式实测定值，相机推进的落点
  ORIGIN: { x: 316, y: 424.87 },
};

// 运镜专用 ease（本库通用）：匀速 + 一点前载减速。
const camEase = (r: number) => (p: number) => p + (1 - r) * p * p * (1 - p);

const parseStats = (dsl: string) =>
  dsl.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const idx = l.indexOf("|");
    return idx >= 0
      ? { val: l.slice(0, idx).trim(), lab: l.slice(idx + 1).trim() }
      : { val: l, lab: "" };
  });

const DEFAULT_STATS = "3.1×|推理正确率\n-42%|单次成本";

// 演示语境（不属于动效）：灰阶线框「文章页截图」满画幅铺满舞台（类名加 spi- 前缀；
// 模板依赖 demo-shell 的全局 reset，此处收窄到 .spi-page 作用域内）
const CSS = `
.spi-page, .spi-page * { margin: 0; padding: 0; box-sizing: border-box; }
.spi-camera {                 /* 相机层：全卡唯一被 transform 的元素 */
  position: absolute;
  inset: 0;
  will-change: transform;
}
.spi-page { position: absolute; inset: 0; background: #ffffff; }

.spi-nav {
  height: 46px;
  display: flex; align-items: center; gap: 22px;
  padding: 0 40px;
  border-bottom: 1px solid #e0e0e0;
}
.spi-nav .spi-logo { width: 74px; height: 13px; border-radius: 3px; }
.spi-nav .spi-links { display: flex; gap: 18px; margin-left: 10px; }
.spi-nav .spi-links i { width: 40px; height: 8px; border-radius: 2px; background: #e0e0e0; }
.spi-nav .spi-links i.spi-on { background: #8a8a8a; }
.spi-nav .spi-btn { margin-left: auto; width: 66px; height: 22px; border-radius: 11px; border: 1px solid #d2d2d7; }

.spi-wrap { padding: 22px 40px 0; }
.spi-kicker { font-size: 11px; letter-spacing: 3px; color: #8a8a8a; margin-bottom: 9px; }
.spi-page h1 { font-weight: 700; line-height: 1.32; letter-spacing: -0.5px; }
.spi-byline { font-size: 11.5px; color: #8a8a8a; margin: 9px 0 16px; }
.spi-byline em { font-style: normal; }

.spi-cols { display: flex; gap: 30px; }
.spi-main { width: 552px; }
.spi-side { flex: 1; }

/* 插图：微型灰阶柱图——给缓推提供"越推越清"的细节 */
.spi-figure {
  height: 116px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  display: flex; align-items: flex-end; gap: 13px;
  padding: 0 18px 14px;
}
.spi-figure b { width: 34px; border-radius: 2px 2px 0 0; background: #ececef; }
.spi-cap { font-size: 10.5px; color: #8a8a8a; margin: 7px 0 14px; }

.spi-bar { height: 7px; border-radius: 2px; background: #e3e3e6; margin: 8px 0; }
.spi-bar.spi-lt { background: #ececef; }
.spi-w96 { width: 96%; } .spi-w88 { width: 88%; } .spi-w80 { width: 80%; }
.spi-w72 { width: 72%; } .spi-w58 { width: 58%; } .spi-w44 { width: 44%; }

/* 兴趣点：引文块——相机推进的落点（左描边颜色内联） */
.spi-quote {
  margin: 16px 0;
  padding: 12px 16px;
  border-left-width: 3px; border-left-style: solid;
  font-weight: 600;
  line-height: 1.62;
}
.spi-quote span { font-size: 10.5px; font-weight: 400; color: #8a8a8a; display: block; margin-top: 6px; }

.spi-side .spi-s-title { font-size: 11px; letter-spacing: 2px; color: #8a8a8a; margin-bottom: 12px; }
.spi-s-item { display: flex; gap: 10px; margin-bottom: 14px; }
.spi-s-item .spi-thumb { width: 58px; height: 40px; flex: 0 0 auto; border-radius: 4px; background: #ececef; }
.spi-s-item .spi-lines { flex: 1; padding-top: 3px; }
.spi-s-item .spi-lines i { display: block; height: 6px; border-radius: 2px; background: #e3e3e6; margin-bottom: 6px; }
.spi-s-item .spi-lines i.spi-short { width: 56%; background: #ececef; }
.spi-side .spi-stat { border-top: 1px solid #e0e0e0; padding-top: 12px; display: flex; gap: 18px; }
.spi-side .spi-stat div b { display: block; font-size: 19px; font-weight: 700; }
.spi-side .spi-stat div span { font-size: 10px; color: #8a8a8a; }
`;

interface Props {
  kicker?: string;
  headline?: string;
  bylineLead?: string;
  bylineName?: string;
  bylineRest?: string;
  figCap?: string;
  quoteText?: string;
  quoteSource?: string;
  sideTitle?: string;
  statsDsl?: string;
  ink?: string;
  hiBar?: string;
  titleSize?: number;
  quoteSize?: number;
  zoomTo?: number;
  pushDur?: number;
  holdDur?: number;
  driftX?: number;
  driftY?: number;
}

const SlowPushIn: React.FC<Props> = ({
  kicker = "深度报道 · 模型能力",
  headline = "推理时算力，正在重写模型能力的分水岭",
  bylineLead = "本刊记者",
  bylineName = "林越",
  bylineRest = "2026 年 8 月 12 日 · 全文约 6800 字",
  figCap = "图 1　三代模型在同一推理基准上的得分（灰=基线，深=本代）",
  quoteText = "同等参数规模下，把算力从训练挪到推理，正确率提升接近三倍。",
  quoteSource = "—— 摘自实验组第三次复现记录",
  sideTitle = "相关阅读",
  statsDsl = DEFAULT_STATS,
  ink = "#1d1d1f",
  hiBar = "#8a8a8a",
  titleSize = 27,
  quoteSize = 14.5,
  zoomTo = 1.10,
  pushDur = 4.2,
  holdDur = 1.6,
  driftX = -13,
  driftY = -7,
}) => {
  const t = useCurrentFrame() / FPS;

  // hold 期沿用主推的末速继续推（速度连续 ⇒ 看不出"段落切换"）
  const rate = ((zoomTo - FIXED.zoomFrom) / pushDur) * FIXED.endRate;
  const holdZoom = zoomTo + rate * holdDur;
  const kd = 1 + (holdZoom - zoomTo) / (zoomTo - FIXED.zoomFrom); // 漂移同比延长

  let scale: number, x: number, y: number;
  if (t < pushDur) {
    // 主推：极缓减速推进 + 焦点微移
    const p = camEase(FIXED.endRate)(clamp01(t / pushDur));
    scale = lerp(FIXED.zoomFrom, zoomTo, p);
    x = lerp(0, driftX, p);
    y = lerp(0, driftY, p);
  } else {
    // hold 期：匀速续推，绝不停在某一帧上
    const p = clamp01((t - pushDur) / holdDur);
    scale = lerp(zoomTo, holdZoom, p);
    x = lerp(driftX, driftX * kd, p);
    y = lerp(driftY, driftY * kd, p);
  }

  const stats = parseStats(statsDsl);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="spi-camera" style={{
        transformOrigin: `${FIXED.ORIGIN.x}px ${FIXED.ORIGIN.y}px`,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
      }}>
        <div className="spi-page" style={{ color: ink }}>
          <div className="spi-nav">
            <div className="spi-logo" style={{ background: ink }} />
            <div className="spi-links"><i className="spi-on" /><i /><i /><i /></div>
            <div className="spi-btn" />
          </div>

          <div className="spi-wrap">
            <div className="spi-kicker">{kicker}</div>
            <h1 style={{ fontSize: titleSize }}>{headline}</h1>
            <div className="spi-byline">
              {bylineLead} <em style={{ color: ink }}>{bylineName}</em> · {bylineRest}
            </div>

            <div className="spi-cols">
              <div className="spi-main">
                <div className="spi-figure">
                  <b style={{ height: 38 }} /><b style={{ height: 52 }} /><b style={{ height: 47 }} />
                  <b style={{ height: 69 }} /><b style={{ height: 61 }} /><b style={{ height: 88, background: hiBar }} />
                </div>
                <div className="spi-cap">{figCap}</div>

                <div className="spi-bar spi-w96" /><div className="spi-bar spi-lt spi-w88" /><div className="spi-bar spi-w80" />
                <div className="spi-bar spi-lt spi-w72" />

                {/* 兴趣点：引文块——相机推进的落点 */}
                <div className="spi-quote" style={{ fontSize: quoteSize, borderLeftColor: ink }}>
                  {quoteText}
                  <span>{quoteSource}</span>
                </div>

                <div className="spi-bar spi-w88" /><div className="spi-bar spi-lt spi-w96" /><div className="spi-bar spi-w58" />
                <div className="spi-bar spi-lt spi-w80" /><div className="spi-bar spi-w44" />
              </div>

              <div className="spi-side">
                <div className="spi-s-title">{sideTitle}</div>
                <div className="spi-s-item"><div className="spi-thumb" /><div className="spi-lines"><i /><i /><i className="spi-short" /></div></div>
                <div className="spi-s-item"><div className="spi-thumb" /><div className="spi-lines"><i /><i /><i className="spi-short" /></div></div>
                <div className="spi-s-item"><div className="spi-thumb" /><div className="spi-lines"><i /><i /><i className="spi-short" /></div></div>
                <div className="spi-stat">
                  {stats.map((s, i) => (
                    <div key={i}><b>{s.val}</b><span>{s.lab}</span></div>
                  ))}
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
  id: "slow-push-in",
  name: "缓推特写",
  category: "运镜",
  durationInFrames: 186,
  accent: "#1d1d1f",
  component: SlowPushIn as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "kicker", label: "眉题", default: "深度报道 · 模型能力" },
    { type: "text", key: "headline", label: "文章大标题", default: "推理时算力，正在重写模型能力的分水岭" },
    { type: "text", key: "bylineLead", label: "署名前缀", default: "本刊记者" },
    { type: "text", key: "bylineName", label: "记者名", default: "林越" },
    { type: "text", key: "bylineRest", label: "署名信息", default: "2026 年 8 月 12 日 · 全文约 6800 字" },
    { type: "text", key: "figCap", label: "插图图注", default: "图 1　三代模型在同一推理基准上的得分（灰=基线，深=本代）" },
    { type: "textarea", key: "quoteText", label: "引文（兴趣点·相机落点）", default: "同等参数规模下，把算力从训练挪到推理，正确率提升接近三倍。" },
    { type: "text", key: "quoteSource", label: "引文出处", default: "—— 摘自实验组第三次复现记录" },
    { type: "text", key: "sideTitle", label: "侧栏标题", default: "相关阅读" },
    { type: "textarea", key: "statsDsl", label: "侧栏数据（每行：数值|标签）", default: DEFAULT_STATS },
    { type: "color", key: "ink", label: "墨色", default: "#1d1d1f" },
    { type: "color", key: "hiBar", label: "插图深柱色", default: "#8a8a8a" },
    { type: "slider", key: "titleSize", label: "大标题字号", default: 27, min: 20, max: 36, step: 1, unit: "px" },
    { type: "slider", key: "quoteSize", label: "引文字号", default: 14.5, min: 11, max: 20, step: 0.5, unit: "px" },
    { type: "slider", key: "zoomTo", label: "主推终点倍数", default: 1.1, min: 1.04, max: 1.18, step: 0.01 },
    { type: "slider", key: "pushDur", label: "主推时长（与口播等长）", default: 4.2, min: 2, max: 15, step: 0.1, unit: "s" },
    { type: "slider", key: "holdDur", label: "收尾续推时长", default: 1.6, min: 0.5, max: 4, step: 0.1, unit: "s" },
    { type: "slider", key: "driftX", label: "焦点横漂", default: -13, min: -40, max: 40, step: 1, unit: "px" },
    { type: "slider", key: "driftY", label: "焦点纵漂", default: -7, min: -40, max: 40, step: 1, unit: "px" },
  ],
};
