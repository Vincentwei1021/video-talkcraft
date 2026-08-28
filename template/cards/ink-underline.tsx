import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// ink-underline · 墨迹下划线 —— 自包含 Remotion 源码（与 demos/ink-underline/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 109 };

const FPS = meta.fps;

// ─────────────────────────────────────────────────────────────────────────
// 可摘走的核心动画：墨迹下划线（变宽缎带 + 沿脊线生长）
//   ① spine：一条三次贝塞尔脊线，两个控制点上下反向偏 wobble px —— 弧度就是手作感
//   ② ribbon：沿脊线逐点求法线，按 taper（起笔压 → 收笔提）向两侧撑出半宽，
//      左岸正走 + 右岸倒走闭合成一个填充路径。这就是"变宽"的全部来源
//   ③ 生长：每帧按 progress 截断脊线重算 ribbon —— 笔尖那一刻的宽度就是它的终宽，
//      所以看上去是"笔走过去"，不是"一条固定粗的线被擦出来"
//   ④ 画完静置：不做 line boil / 定格抖动（design-language.md §4）
//   ★ demo 里坐标是运行时量 DOM 得到的；tsx 是纯函数渲染，故把量出来的
//     「墨迹盒 + baseline」硬编码在 BOXES（demo 运行时实测，960×540 设计坐标）
// ─────────────────────────────────────────────────────────────────────────
const CONFIG = {
  startDelay: 0.55,      // 起手静置：等口播念到这个词
  gapBetween: 0.75,      // 两条线之间的间隔 s（口播逐个点名的节拍）
  color: "#6f7f35",      // 墨色（唯一语义色）
  inkOpacity: 0.85,      // 墨的透水度：1.0 读作矢量色块，<0.7 读作没蘸够墨
  samples: 40,           // 脊线采样点数（<20 会看出折线）
  grain: 0.5,            // 边缘颗粒强度（0 = 关掉滤镜切矢量光边；≥1 会把细的收笔端咬断）
  marks: [
    { target: "wrong", dur: 0.50, thickness: 10,
      pressure: 1, release: 0.15,   // 起笔压满、收笔提到 15% —— 笔离纸
      wobble: 1.1, baselineGap: 6, overhang: 8 },
    { target: "right", dur: 0.42, thickness: 10.5,
      pressure: 1, release: 0.15,
      wobble: -0.9, baselineGap: 6, overhang: 9 },
  ],
  hold: 1.0,             // 收尾定格：画完的两条线就是落点
};

// demo 运行时 baselineOf() 实测值（目标 <b> 的左右缘 + 文字真实 baseline）
const BOXES: Record<string, { x: number; right: number; baseline: number }> = {
  wrong: { x: 780, right: 900, baseline: 251.5 },   // 「成本上涨」
  right: { x: 660, right: 780, baseline: 310.0 },   // 「渠道结构」
};

/* 时间表（demo 秒）
   0.55–1.05  第一条墨线生长（power1.out），起点即整条 opacity 0.85
   1.80–2.22  第二条墨线生长（power1.out）
   2.22–3.22  hold 定格 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease

type Pt = [number, number];
type Mark = (typeof CONFIG.marks)[number];
const n = (v: number) => Math.round(v * 100) / 100;

// ② 脊线：三次贝塞尔，两个控制点上下反偏 wobble（30% 处上凸、70% 处下凹）
function sampleCubic(p0: Pt, c1: Pt, c2: Pt, p3: Pt, count: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1), u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    pts.push([a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
              a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]]);
  }
  return pts;
}
function spineOf(box: { x: number; right: number; baseline: number }, o: Mark): Pt[] {
  const x0 = box.x - o.overhang, x1 = box.right + o.overhang;
  const y = box.baseline + o.baselineGap, w = o.wobble;
  return sampleCubic([x0, y], [x0 + (x1 - x0) * 0.3, y + w],
                     [x0 + (x1 - x0) * 0.7, y - w], [x1, y + w * 0.6], CONFIG.samples);
}

// ③ 变宽缎带：半宽随 t 从 pressure 收到 release；左岸正走、右岸倒走闭合
const halfWidth = (o: Mark, t: number) =>
  (o.thickness / 2) * (o.pressure + (o.release - o.pressure) * t);
const normalAt = (pts: Pt[], i: number): Pt => {
  const a = pts[i - 1] || pts[i], b = pts[i + 1] || pts[i];
  const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1;
  return [-ty / len, tx / len];
};
// 采样点串成平滑段（Catmull-Rom → 三次贝塞尔）
const curveSegs = (pts: Pt[]) => pts.slice(0, -1).map((p1, i) => {
  const p0 = pts[i - 1] || p1, p2 = pts[i + 1], p3 = pts[i + 2] || p2;
  return `C ${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)}, ` +
         `${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)}, ${n(p2[0])} ${n(p2[1])}`;
}).join(" ");

function ribbon(spine: Pt[], o: Mark, progress: number): string {
  // 截断到已画部分；taper 的 t 仍按「整条脊线」算 —— 笔尖此刻的宽度就是它的终宽
  const drawn = Math.max(2, Math.round(progress * (spine.length - 1)) + 1);
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < drawn; i++) {
    const half = halfWidth(o, i / (spine.length - 1));
    const nm = normalAt(spine, i);
    left.push([spine[i][0] + nm[0] * half, spine[i][1] + nm[1] * half]);
    right.push([spine[i][0] - nm[0] * half, spine[i][1] - nm[1] * half]);
  }
  const back = right.reverse();
  return `M ${n(left[0][0])} ${n(left[0][1])} ${curveSegs(left)} ` +
         `L ${n(back[0][0])} ${n(back[0][1])} ${curveSegs(back)} Z`;
}

// 主持人占位：演示语境素材，不属于动效本体
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

// —— 演示语境（不属于动效）：主持人占左一列，右侧是口播正在念的一句话 ——
const CSS = `
.host-wrap { position: absolute; left: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.say {
  position: absolute;
  left: 420px; right: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #1d1d1f;
}
.say-line {
  font-size: 30px;
  line-height: 1.95;
  font-weight: 500;
  white-space: nowrap;
}
/* 被画线的关键词只加字重，不加颜色——颜色是墨迹的事（同屏只有一个语义色） */
.say-line b { font-weight: 700; }
/* 墨迹层（动效本体）盖在文字之上。ribbon 是填充路径不是描边路径 */
#inkLayer { position: absolute; inset: 0; pointer-events: none; }
#inkLayer path { stroke: none; }
`;

export default function InkUnderline({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // 每条墨线：t0 起 opacity 置 0.85，progress 0→1 每帧重算 ribbon
  let t0 = CONFIG.startDelay;
  const strokes = CONFIG.marks.map((m, idx) => {
    const at = t0;
    t0 += m.dur + CONFIG.gapBetween;
    const v = tw(t, at, m.dur, power1Out);
    return {
      d: ribbon(spineOf(BOXES[m.target], m), m, v),
      opacity: t >= at ? CONFIG.inkOpacity : 0,
      fid: `ink-grain-${idx}`,
      seed: 17 + idx * 61,
      scale: m.thickness * 0.5 * CONFIG.grain,
    };
  });

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <div className="say">
        <div className="say-line">很多人以为这轮涨价是因为<b>成本上涨</b>，</div>
        <div className="say-line">其实真正的变量是<b>渠道结构</b>。</div>
      </div>
      <svg id="inkLayer" viewBox="0 0 960 540">
        {/* ④ 边缘颗粒：静态 turbulence 位移（毛边是形状，不随时间变 —— 不是沸腾） */}
        <defs>
          {strokes.map((s) => (
            <filter key={s.fid} id={s.fid} x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3}
                            seed={s.seed} result="g" />
              <feDisplacementMap in="SourceGraphic" in2="g" scale={s.scale}
                                 xChannelSelector="R" yChannelSelector="G" />
            </filter>
          ))}
        </defs>
        {strokes.map((s) => (
          <path key={s.fid} d={s.d} fill={CONFIG.color} opacity={s.opacity}
                filter={CONFIG.grain > 0 ? `url(#${s.fid})` : undefined} />
        ))}
      </svg>
    </AbsoluteFill>
  );
}
