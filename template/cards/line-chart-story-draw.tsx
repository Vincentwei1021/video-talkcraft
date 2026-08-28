import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// line-chart-story-draw · 折线分段推演 —— 自包含 Remotion 源码（与 demos/line-chart-story-draw/index.html 同画面）
// 复制本文件进你的工程即可用；主播 PiP 小窗视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 156 };

const FPS = meta.fps;

type Pt = [number, number];

// ===== 可摘走的核心动画：CONFIG（点位表 + 每段时长 + 标签文案） =====
const CONFIG = {
  // —— 点位表（stage 像素坐标，x 向右 = 时间轴；改这里就换数据 —— 折线全部为直段） ——
  pivot: [480, 278] as Pt,            // 拐点：历史与推演的分界，所有新线段都从这里岔出
  history: [[200, 354], [256, 338], [312, 350], [368, 310], [424, 324], [480, 278]] as Pt[],

  // 主推演实线：逐段生长，语音讲到哪段才长哪段
  segments: [
    { pts: [[480, 278], [536, 268], [592, 262], [648, 248]] as Pt[], dur: 0.6,
      label: { text: "▲5%", color: "#d8383a", x: 666, y: 268,
               arc: { from: [676, 266] as Pt, c: [660, 264] as Pt, to: [654, 254] as Pt, marker: "arrow-hot" } } },
    { pts: [[648, 248], [704, 234], [760, 216], [816, 198]] as Pt[], dur: 0.6, label: null },
  ],

  // 对比虚线：从同一拐点以不同斜率岔出的第二种未来（涨幅正好是主线的两倍）
  alt: { pts: [[480, 278], [560, 240], [648, 196], [736, 152], [816, 118]] as Pt[], dur: 0.7,
         dash: "9 7",
         label: { text: "涨幅×2", color: "#1d1d1f", x: 826, y: 78 } },

  // 拐点标注：文字 + 弧线箭头，在生长之前弹出（"讲到假设"的那一拍）
  annot: { text: "这里买入", color: "#d8383a", x: 392, y: 342,
           arc: { from: [468, 338] as Pt, c: [480, 314] as Pt, to: [477, 289] as Pt, marker: "arrow-hot" } },

  // 区间罩显：竖向半透明色带逐个淡入罩住相关区间
  bands: [
    { x: 312, w: 112, text: "历史同期" },
    { x: 648, w: 200, text: "推演分歧" },
  ],
  bandTop: 112, bandBottom: 396,

  // —— 节奏 ——
  hold0: 0.6,        // 历史线静置一拍等语音（历史段一开始就在场，不生长）
  annotPop: 0.25,    // 标注/标签弹出时长
  annotHold: 0.35,   // 标注落定后再开始生长的停顿
  segGap: 0.35,      // 段间停顿：语音逐段触发的关键
  altGap: 0.4,       // 实线讲完 → 虚线岔出前的停顿
  bandFade: 0.3,     // 单条色带淡入时长
  bandStagger: 0.3,  // 色带之间错峰

  // —— 端点数值标签（跟随线端） ——
  chipDx: 12, chipDy: -30,
  scale: { yBase: 396, vBase: 3000, yStep: 71, vStep: 400 },  // y→数值的线性映射

  // —— 语义色（全灰阶 + 单一强调红） ——
  histColor: "#a8a8ad",
  hotColor: "#d8383a",
  altColor: "#1d1d1f",
  bandColor: "rgba(216, 56, 58, 0.07)",
};

/* 时间表（demo 秒）
   0.60        拐点亮起（back.out(2.4) 0.22s）+ 涟漪（0.5s）+「这里买入」标注/弧箭弹出
   1.20        端点数值 chip 淡入（0.2s）
   1.20–1.80   段① 从拐点向右生长（power2.out），chip 跟随线端
   1.80        段①标签「▲5%」+ 弧箭弹出
   2.15–2.75   段② 生长，chip 继续跟随
   3.15–3.85   对比虚线经 mask 岔出（power2.out）
   3.80        虚线端点 pop；3.85「涨幅×2」标签弹出
   4.20/4.50   两条区间色带错峰淡入（各 0.3s）→ 4.80 结束 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

const toPath = (pts: Pt[]) => pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
const valueAt = (y: number) => CONFIG.scale.vBase +
  ((CONFIG.scale.yBase - y) / CONFIG.scale.yStep) * CONFIG.scale.vStep;
const fmt = (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+$)/g, ",");

// 直段折线的总长与"沿线取点"（与 getTotalLength/getPointAtLength 等价）
const polyLen = (pts: Pt[]) => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
};
const pointAt = (pts: Pt[], p: number): Pt => {
  const total = polyLen(pts);
  let target = clamp01(p) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (target <= seg || i === pts.length - 1) {
      const k = seg ? Math.min(1, target / seg) : 1;
      return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)];
    }
    target -= seg;
  }
  return pts[pts.length - 1];
};

// 主播 PiP 小窗占位：演示语境素材，不属于动效本体
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

// —— 演示语境（不属于动效）：灰阶坐标系 + 主播小窗，零装饰 ——
const CSS = `
#chart { position: absolute; inset: 0; display: block; }
.chart-title {
  position: absolute; left: 56px; top: 30px;
  font-size: 21px; font-weight: 700; color: #1d1d1f; letter-spacing: 2px;
}
.chart-sub {
  position: absolute; left: 56px; top: 62px;
  font-size: 13px; color: #8a8a8a; letter-spacing: 1px;
}
/* 主播 PiP 小窗（真人出镜画中画占位） */
.host-pip {
  position: absolute;
  left: 22px; bottom: 34px;
  width: 118px; height: 118px;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  overflow: hidden;
  background: #fff;
  z-index: 6;
}
/* —— 动效本体 —— 线端 / 段末标签层：绝对定位，位置由 CONFIG 点位表给出 */
#labels { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
#labels .lbl {
  position: absolute; left: 0; top: 0;
  white-space: nowrap;
  font-size: 17px; font-weight: 800; line-height: 1;
  padding: 4px 10px;
  background: #ffffff;
  border: 1.5px solid currentColor;
  border-radius: 6px;
  transform-origin: 50% 100%;
}
/* 端点数值标签：跟着线端一起往右移，数字随高度实时变 */
#labels .tip-chip {
  position: absolute; left: 0; top: 0;
  padding: 4px 10px;
  background: #ffffff;
  border: 1.5px solid #d8383a;
  border-radius: 6px;
  color: #d8383a;
  font-size: 17px; font-weight: 800; line-height: 1;
  font-variant-numeric: tabular-nums;
}
`;

export default function LineChartStoryDraw({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ===== 时序摊平（与 demo 的 let t 游标一致）=====
  const annotAt = CONFIG.hold0;                                  // 0.60 拐点 + 标注
  const growAt0 = annotAt + CONFIG.annotPop + CONFIG.annotHold;  // 1.20 段①
  const seg0 = CONFIG.segments[0], seg1 = CONFIG.segments[1];
  const growAt1 = growAt0 + seg0.dur + CONFIG.segGap;            // 2.15 段②
  const altAt = growAt1 + seg1.dur + CONFIG.segGap + (CONFIG.altGap - CONFIG.segGap); // 3.15 虚线
  const altDotAt = altAt + CONFIG.alt.dur - 0.05;                // 3.80 虚线端点
  const altLblAt = altAt + CONFIG.alt.dur;                       // 3.85 ×2 标签
  const bandsAt = altAt + CONFIG.alt.dur + CONFIG.segGap;        // 4.20 色带

  // 拐点：小圆点 + 一圈涟漪
  const dotS = tw(t, annotAt, 0.22, backOut(2.4));
  const haloP = tw(t, annotAt, 0.5, power2Out);  // fromTo immediateRender：t=0 起就停在 scale.5/op.9
  const [pvx, pvy] = CONFIG.pivot;

  // 主实线两段：dashoffset 从拐点向右生长
  const segsP = [tw(t, growAt0, seg0.dur, power2Out), tw(t, growAt1, seg1.dur, power2Out)];

  // 端点数值 chip：贴着当前生长段的线端走
  const chipPt = t < growAt1
    ? pointAt(seg0.pts, segsP[0])
    : pointAt(seg1.pts, segsP[1]);
  const chipOp = tw(t, growAt0, 0.2, power2Out);

  // 对比虚线：mask 的 dashoffset 生长 + 端点 pop
  const altP = tw(t, altAt, CONFIG.alt.dur, power2Out);
  const altLen = polyLen(CONFIG.alt.pts);
  const maskL = Math.ceil(altLen) + 2;
  const altDotP = tw(t, altDotAt, 0.22, backOut(2.4));
  const altEnd = CONFIG.alt.pts[CONFIG.alt.pts.length - 1];

  // 标签弹出（0.25s back.out(2)）
  const popStyle = (at: number, x: number, y: number, color: string): React.CSSProperties => {
    const p = tw(t, at, CONFIG.annotPop, backOut(2));
    return {
      left: x, top: y, color,
      opacity: Math.min(1, p),
      transform: `translateY(${lerp(6, 0, p)}px) scale(${lerp(0.7, 1, p)})`,
    };
  };
  // 弧线箭头整组弹出（visibility 而非只靠 opacity：Chromium 下 marker 不吃父级 opacity）
  const arcAttrs = (at: number, origin: Pt) => {
    const op = tw(t, at, CONFIG.annotPop * 0.8, power2Out);
    const sc = lerp(0.55, 1, tw(t, at, CONFIG.annotPop, power3Out));
    return {
      opacity: op,
      visibility: (t >= at ? "visible" : "hidden") as "visible" | "hidden",
      transform: `translate(${origin[0]} ${origin[1]}) scale(${sc}) translate(${-origin[0]} ${-origin[1]})`,
    };
  };

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="chart-title">指数点位 · 五年推演</div>
      <div className="chart-sub">历史已发生 ｜ 右侧为假设</div>

      <svg id="chart" viewBox="0 0 960 540">
        <defs>
          {/* 标注弧线箭头（两种语义色各一个） */}
          <marker id="arrow-hot" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
            <path d="M 0,1 L 9,5 L 0,9 Z" fill="#d8383a" />
          </marker>
          <marker id="arrow-dark" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
            <path d="M 0,1 L 9,5 L 0,9 Z" fill="#1d1d1f" />
          </marker>
          {/* 虚线笔画无法直接用 dashoffset 生长 → 套一层实心 mask，动 mask 的 dashoffset */}
          <mask id="alt-reveal" maskUnits="userSpaceOnUse" x={0} y={0} width={960} height={540}>
            <path d={toPath(CONFIG.alt.pts)} fill="none" stroke="#fff" strokeWidth={16}
              strokeLinecap="butt" strokeLinejoin="round"
              strokeDasharray={maskL} strokeDashoffset={maskL * (1 - altP)} />
          </mask>
        </defs>

        {/* 演示语境：网格 / 今天分界 / 轴 / 刻度（全部静态灰阶） */}
        <g id="grid">
          <path d="M 200,325 H 880 M 200,254 H 880 M 200,183 H 880 M 200,112 H 880"
                stroke="#ececef" strokeWidth="1" fill="none" />
          <path d="M 480,112 V 396" stroke="#d8d8dc" strokeWidth="1.2" strokeDasharray="4 6" fill="none" />
          <path d="M 200,100 V 396 H 884" stroke="#c8c8cc" strokeWidth="1.6" fill="none" />
          <g fill="#8a8a8a" fontSize="13" textAnchor="end">
            <text x="188" y="401">3000</text>
            <text x="188" y="330">3400</text>
            <text x="188" y="259">3800</text>
            <text x="188" y="188">4200</text>
            <text x="188" y="117">4600</text>
          </g>
          <g fill="#8a8a8a" fontSize="13" textAnchor="middle">
            <text x="256" y="418">2020</text>
            <text x="368" y="418">2022</text>
            <text x="480" y="418">今年</text>
            <text x="648" y="418">+3 年</text>
            <text x="816" y="418">+5 年</text>
          </g>
        </g>

        {/* 动效本体（与 demo #draw 层同序）*/}
        <g id="draw">
          {/* 1) 区间色带（在最底层，罩在线下方） */}
          {CONFIG.bands.map((b, i) => (
            <g key={i} opacity={tw(t, bandsAt + i * CONFIG.bandStagger, CONFIG.bandFade, power2Out)}>
              <rect x={b.x} y={CONFIG.bandTop} width={b.w}
                height={CONFIG.bandBottom - CONFIG.bandTop} fill={CONFIG.bandColor} />
              <text x={b.x + b.w / 2} y={CONFIG.bandBottom - 16}
                fill="#8a8a8a" fontSize={13} textAnchor="middle">{b.text}</text>
            </g>
          ))}

          {/* 2) 历史段：一开始就在场（本卡的前提——不生长） */}
          <path d={toPath(CONFIG.history)} fill="none" stroke={CONFIG.histColor}
            strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="butt" />

          {/* 3) 主推演实线：每段一条独立 path，用 stroke-dashoffset 从拐点向右生长 */}
          {CONFIG.segments.map((s, i) => {
            const dashL = Math.ceil(polyLen(s.pts)) + 2;  // 整数长度：避免亚像素漏笔
            return (
              <path key={i} d={toPath(s.pts)} fill="none" stroke={CONFIG.hotColor}
                strokeWidth={3.4} strokeLinejoin="round" strokeLinecap="butt"
                strokeDasharray={dashL} strokeDashoffset={dashL * (1 - segsP[i])} />
            );
          })}

          {/* 4) 对比虚线（被 mask 揭出） */}
          <path d={toPath(CONFIG.alt.pts)} fill="none" stroke={CONFIG.altColor}
            strokeWidth={2.6} strokeDasharray={CONFIG.alt.dash}
            strokeLinejoin="round" mask="url(#alt-reveal)" />

          {/* 6) 拐点：小圆点 + 一圈涟漪（"就是这里"的落点）
              涟漪的缩放锚点复刻 demo 实测（GSAP fromTo 的 svgOrigin 落在 bbox 右下角 486,284
              且带 -6,-6 补偿 ⇒ 环心随放大往左上漂移，这是 demo 的真实画面） */}
          {(() => {
            const hs = lerp(0.5, 3.2, haloP);
            return (
              <circle cx={pvx} cy={pvy} r={6} fill="none" stroke={CONFIG.hotColor} strokeWidth={2}
                opacity={lerp(0.9, 0, haloP)}
                transform={`matrix(${hs},0,0,${hs},${(pvx + 6) * (1 - hs) - 6},${(pvy + 6) * (1 - hs) - 6})`} />
            );
          })()}
          <circle cx={pvx} cy={pvy} r={5.5} fill="#fff" stroke={CONFIG.hotColor} strokeWidth={3}
            transform={`translate(${pvx} ${pvy}) scale(${dotS}) translate(${-pvx} ${-pvy})`} />
          <circle cx={altEnd[0]} cy={altEnd[1]} r={5} fill="#fff" stroke={CONFIG.altColor} strokeWidth={2.6}
            opacity={Math.min(1, altDotP)}
            transform={`translate(${altEnd[0]} ${altEnd[1]}) scale(${lerp(0.3, 1, altDotP)}) translate(${-altEnd[0]} ${-altEnd[1]})`} />

          {/* 5) 弧线箭头（每条包一个 g，整组弹出） */}
          <g {...arcAttrs(annotAt, CONFIG.annot.arc.to)}>
            <path d={`M ${CONFIG.annot.arc.from[0]},${CONFIG.annot.arc.from[1]} Q ${CONFIG.annot.arc.c[0]},${CONFIG.annot.arc.c[1]} ${CONFIG.annot.arc.to[0]},${CONFIG.annot.arc.to[1]}`}
              fill="none" stroke={CONFIG.hotColor} strokeWidth={1.8}
              markerEnd={`url(#${CONFIG.annot.arc.marker})`} />
          </g>
          {seg0.label && (
            <g {...arcAttrs(growAt0 + seg0.dur, seg0.label.arc.to)}>
              <path d={`M ${seg0.label.arc.from[0]},${seg0.label.arc.from[1]} Q ${seg0.label.arc.c[0]},${seg0.label.arc.c[1]} ${seg0.label.arc.to[0]},${seg0.label.arc.to[1]}`}
                fill="none" stroke={CONFIG.hotColor} strokeWidth={1.8}
                markerEnd={`url(#${seg0.label.arc.marker})`} />
            </g>
          )}
        </g>
      </svg>

      {/* 7) 标签（HTML，位置来自点位表） */}
      <div id="labels">
        <div className="lbl" style={popStyle(annotAt, CONFIG.annot.x, CONFIG.annot.y, CONFIG.annot.color)}>
          {CONFIG.annot.text}
        </div>
        {seg0.label && (
          <div className="lbl" style={popStyle(growAt0 + seg0.dur, seg0.label.x, seg0.label.y, seg0.label.color)}>
            {seg0.label.text}
          </div>
        )}
        <div className="lbl" style={popStyle(altLblAt, CONFIG.alt.label.x, CONFIG.alt.label.y, CONFIG.alt.label.color)}>
          {CONFIG.alt.label.text}
        </div>
        <div className="tip-chip" style={{
          opacity: chipOp,
          transform: `translate(${chipPt[0] + CONFIG.chipDx}px, ${chipPt[1] + CONFIG.chipDy}px)`,
        }}>{fmt(valueAt(chipPt[1]))}</div>
      </div>

      {/* 演示语境：主播小窗 */}
      <div className="host-pip"><Host src={hostSrc} /></div>
    </AbsoluteFill>
  );
}
