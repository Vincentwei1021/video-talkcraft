import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// source-converge · 多源汇聚 —— 自包含 Remotion 源码（与 demos/source-converge/index.html 同画面）
// 四条细贝塞尔曲线逐路接通，来源胶囊沿各自真实曲线滑向汇聚点并三段式缩小（"被吸进去"），强调色数据包全程沿线滑行；
// 吞并瞬间汇聚胶囊脉冲，曲线从起点方向擦除，结果滑到画面正中静置。复制本文件进你的工程即可用；来源 / 汇聚点 / 说明文案经 props 注入。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 198 };   // 6.2s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 节点沿真实曲线走（不是两点插值）；② 三段式缩小——前 75% 慢慢瘦身、后 25% 掉光，拐点越靠后吞并越突然；
//      ③ 擦除必须在节点全部消失之后，且从起点方向退走（读作"通路收回"）；④ 汇聚完成后结果滑到画面正中再静置 ≥1.2s（2026-09-05 用户要求）。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  srcX: 200,                       // 来源胶囊中心 x = 曲线起点
  srcYs: [170, 230, 310, 390],     // 四路 y（曲率天然不同；>6 条中间几条几乎重合）
  hubX: 700, hubY: 290,            // 汇聚点 = 曲线终点
  ctrl: [380, 520],                // 三次贝塞尔两个控制点 x：c1 = (380, y)、c2 = (520, hubY)
  titleIn: 0.1,                    // 标题入场 s（0.4s power3.out）
  nodeIn: 0.3, nodeStagger: 0.08,  // 来源胶囊淡入（0.3s）
  drawAt: 0.5, drawStagger: 0.15, drawDur: 0.5,   // 逐路接通（power2.out）；错峰归零读作四条线一起刷出
  hubIn: 0.8,                      // 汇聚胶囊入场 s（0.4s power3.out，scale .7→1）
  pkFrom: 0.9, pkTo: 3.0,          // 数据包滑行窗：走两个整周期（否则末帧包停在半路）
  pkPhase: 0.13,                   // 各路相位偏移（0 会看到四个包整齐并进）
  convAt: 1.5, convDur: 1.5,       // 沿曲线汇入（power2.inOut：缓起是"启动"、缓收是"到位"）
  shrinkKnee: 0.75,                // 三段式缩小拐点：前 75% 1→.34，后 25% →0
  pulseAt: 2.85,                   // 吞并脉冲：+12% back.out(2) 0.25s，再 0.25s 回落
  eraseAt: 3.25, eraseDur: 0.4,    // 曲线从起点方向擦除（power2.out）
  capIn: 3.5,                      // 说明行浮出（0.4s）
  centerAt: 3.8, centerDur: 0.6,   // 结果居中：hubX → 480（power2.inOut），之后真静止
  exitAt: 5.8,                     // 标题 / 胶囊 / 说明行同收（0.4s power2.in）
  end: 6.2,                        // 镜头结束
};

/* 时间表（demo 秒）
   0.10–0.50  标题入场
   0.30–0.84  四个来源胶囊淡入（错峰 0.08）
   0.50–1.45  四条曲线逐路 draw-on（错峰 0.15，各 0.5s power2.out）
   0.80–1.20  汇聚胶囊入场（scale .7→1）
   0.90–3.00  数据包沿线滑行两个整周期（线性；0.9 起 0.3s 显、2.8 起 0.2s 隐）
   1.50–3.00  节点沿曲线汇入（power2.inOut），前 75% 尺寸 1→.34、后 25% →0
   2.85–3.35  汇聚胶囊脉冲 1→1.12→1
   3.25–3.65  曲线从起点方向擦除
   3.50–3.90  说明行浮出
   3.80–4.40  胶囊 + 说明行滑到 x=480 居中（power2.inOut），之后静止
   5.80–6.20  标题 / 胶囊 / 说明行同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const backOut = (s = 1.70158) => (x: number) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

// —— 三次贝塞尔的沿线取点（getPointAtLength 的纯函数版：采样 200 段建弧长表再按长度反查，渲染确定）——
type Pt = { x: number; y: number };
type Curve = { d: string; len: number; at: (L: number) => Pt };
const cubic = (p0: number, p1: number, p2: number, p3: number, u: number) => { const v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; };
function buildCurve(P: [Pt, Pt, Pt, Pt], N = 200): Curve {
  const pts: Pt[] = [], cum: number[] = [0];
  for (let k = 0; k <= N; k++) { const u = k / N; pts.push({ x: cubic(P[0].x, P[1].x, P[2].x, P[3].x, u), y: cubic(P[0].y, P[1].y, P[2].y, P[3].y, u) }); if (k) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y)); }
  const len = cum[N];
  const at = (L: number): Pt => {
    const q = Math.max(0, Math.min(len, L));
    let lo = 0, hi = N;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= q) lo = mid; else hi = mid; }
    const seg = cum[hi] - cum[lo] || 1, f = (q - cum[lo]) / seg;
    return { x: lerp(pts[lo].x, pts[hi].x, f), y: lerp(pts[lo].y, pts[hi].y, f) };
  };
  return { d: `M ${P[0].x},${P[0].y} C ${P[1].x},${P[1].y} ${P[2].x},${P[2].y} ${P[3].x},${P[3].y}`, len, at };
}
// n 路的 y：4 路用 CONFIG.srcYs；其他数量在 170~390 之间等分
const ysFor = (n: number) => (n === CONFIG.srcYs.length ? CONFIG.srcYs : n <= 1 ? [CONFIG.hubY] : Array.from({ length: n }, (_, i) => 170 + (i * 220) / (n - 1)));

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 scv- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.scv-ttl { position: absolute; left: 80px; top: 60px; font-size: 26px; font-weight: 700; color: #1d1d1f; }
.scv-svg { position: absolute; left: 0; top: 0; width: 960px; height: 540px; }
.scv-path { fill: none; stroke: #c9c9cf; stroke-width: 2; }
.scv-node rect { fill: #ffffff; stroke: #d6d6dc; stroke-width: 1.5; }
.scv-node text { font-size: 20px; font-weight: 600; fill: #1d1d1f; text-anchor: middle; }
.scv-pk { fill: #0066cc; }
.scv-hub rect { fill: #0066cc; }
.scv-hub text { font-size: 22px; font-weight: 700; fill: #ffffff; text-anchor: middle; }
.scv-cap { font-size: 22px; font-weight: 600; fill: #1d1d1f; text-anchor: middle; }
`;

type Props = {
  /** 标题（版面内容，不是旁白字幕） */
  title?: string;
  /** 来源名（每项一个胶囊；4 条是甜点，>6 条曲线几乎重合） */
  sources?: string[];
  /** 汇聚胶囊文案 */
  hub?: string;
  /** 汇聚完成后的说明行 */
  caption?: string;
};

export default function SourceConverge({ title = "四个平台的数据，怎么汇成一张表", sources = ["抖音", "小红书", "B 站", "公众号"], hub = "一张表", caption = "每天 8 点自动更新" }: Props) {
  const t = useCurrentFrame() / FPS;
  const ys = ysFor(sources.length);
  const curves = ys.map((y) => buildCurve([{ x: CONFIG.srcX, y }, { x: CONFIG.ctrl[0], y }, { x: CONFIG.ctrl[1], y: CONFIG.hubY }, { x: CONFIG.hubX, y: CONFIG.hubY }]));

  // 进度量
  const conv = tw(t, CONFIG.convAt, CONFIG.convDur, power2InOut);
  const pk = tw(t, CONFIG.pkFrom, CONFIG.pkTo - CONFIG.pkFrom, linear);
  const pkOn = tw(t, CONFIG.pkFrom, 0.3, power1Out) - tw(t, CONFIG.pkTo - 0.2, 0.2, power1Out);
  const erase = tw(t, CONFIG.eraseAt, CONFIG.eraseDur, power2Out);
  const size = Math.max(0, conv < CONFIG.shrinkKnee ? lerp(1, 0.34, conv / CONFIG.shrinkKnee) : lerp(0.34, 0, (conv - CONFIG.shrinkKnee) / (1 - CONFIG.shrinkKnee)));
  // 汇聚胶囊：入场 .7→1，吞并脉冲 1→1.12→1
  const hubIn = tw(t, CONFIG.hubIn, 0.4, power3Out);
  let hs = lerp(0.7, 1, hubIn);
  if (t >= CONFIG.pulseAt) hs = t < CONFIG.pulseAt + 0.25 ? lerp(1, 1.12, tw(t, CONFIG.pulseAt, 0.25, backOut(2))) : lerp(1.12, 1, tw(t, CONFIG.pulseAt + 0.25, 0.25, power2Out));
  const cx = lerp(CONFIG.hubX, 480, tw(t, CONFIG.centerAt, CONFIG.centerDur, power2InOut));   // 结果居中
  const ttlIn = tw(t, CONFIG.titleIn, 0.4, power3Out);
  const capIn = tw(t, CONFIG.capIn, 0.4, power1Out);
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.end - CONFIG.exitAt, power2In);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="scv-ttl" style={{ opacity: ttlIn * exitK, transform: `translateY(${lerp(10, 0, ttlIn)}px)` }}>{title}</div>
      <svg className="scv-svg" viewBox="0 0 960 540">
        {/* 曲线：draw-on 从起点长出，擦除从起点退走 */}
        {curves.map((c, i) => {
          const draw = tw(t, CONFIG.drawAt + i * CONFIG.drawStagger, CONFIG.drawDur, power2Out);
          return <path key={`p${i}`} className="scv-path" d={c.d} style={{ strokeDasharray: c.len, strokeDashoffset: c.len * (1 - draw) - erase * c.len }} />;
        })}
        {/* 数据包：两个整周期 + 相位偏移，中段最亮 */}
        {curves.map((c, i) => {
          const cyc = (pk * 2 + i * CONFIG.pkPhase) % 1; const p = c.at(cyc * c.len);
          return <circle key={`k${i}`} className="scv-pk" r={5} cx={p.x} cy={p.y} opacity={pkOn * (1 - Math.abs(cyc - 0.5) * 0.6)} />;
        })}
        {/* 来源胶囊：沿真实曲线滑向汇聚点，三段式缩小 */}
        {curves.map((c, i) => {
          const p = c.at(conv * c.len); const nodeIn = tw(t, CONFIG.nodeIn + i * CONFIG.nodeStagger, 0.3, power1Out);
          return (
            <g key={`n${i}`} className="scv-node" transform={`translate(${p.x} ${p.y}) scale(${size})`} opacity={nodeIn}>
              <rect x={-64} y={-22} width={128} height={44} rx={22} /><text y={7}>{sources[i]}</text>
            </g>
          );
        })}
        {/* 汇聚胶囊 + 说明行（擦线后一起滑到 x=480） */}
        <g className="scv-hub" transform={`translate(${cx} ${CONFIG.hubY}) scale(${hs})`} opacity={hubIn * exitK}>
          <rect x={-76} y={-30} width={152} height={60} rx={30} /><text y={8}>{hub}</text>
        </g>
        <text className="scv-cap" x={cx} y={372} opacity={capIn * exitK}>{caption}</text>
      </svg>
    </AbsoluteFill>
  );
}
