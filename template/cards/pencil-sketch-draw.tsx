import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// pencil-sketch-draw · 铅笔手绘揭示 —— 自包含 Remotion 源码（与 demos/pencil-sketch-draw/index.html 同画面）
// 三笔：卡片框 → 车身轮廓 → 下划线。每笔 = dashoffset 描画 + 铅笔骑在路径笔尖。
// 画完的线保持干净静置（不做 line boil / 定格抖动——用户偏好，见 design-language.md §4）。
// 笔具二选一：handSrc 传入手握铅笔实拍素材（demos/pencil-sketch-draw/hand-pencil.png）= 与 demo 同画面；
// 不传则退回纯矢量铅笔兜底——两者共用同一坐标契约（笔尖 = 局部原点 (0,0)，笔身朝 −Y）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 134 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数 ——
const CONFIG = {
  strokes: [
    { d: "M 40 30 L 600 30 Q 616 30 616 46 L 616 334 Q 616 350 600 350 L 40 350 Q 24 350 24 334 L 24 46 Q 24 30 40 30", dur: 1.1, width: 4 },
    { d: "M 140 250 L 200 250 Q 230 180 300 175 L 380 172 Q 450 172 480 245 L 520 250 L 520 285 L 150 288 L 140 250", dur: 1.3, width: 5 },
    { d: "M 200 316 L 460 320", dur: 0.45, width: 6 },
  ],
  stroke: "#1d1d1f",   // 笔迹墨色（迁移时换成自己的线色）
  // easePow: power2.inOut —— 起笔快收笔缓
  pencil: {
    scale: 0.5,    // 素材原生 640px 高 → 手+笔约占 960×540 舞台的 59%
    tilt: 42,      // 握笔角：笔身自笔尖向右上倾 42°（≈ 素材自然角，手落在笔迹右上方）
    follow: 5,     // 转弯跟随幅度（度）：手腕只跟一点点，合成角始终落在 +37°~+47°
    lift: 26,      // 画完沿笔身轴向抬离的距离
  },
};

// —— 手握铅笔素材的坐标契约：石墨尖 = 局部原点 (0,0)，笔身朝 −Y 生长 ——
//   tipX/tipY —— 石墨尖在图片像素坐标里的位置（把 image 平移过去，尖端就压在原点上）
//   axisDeg  —— 笔轴（尖 → 橡皮头）与竖直向上的夹角，顺时针为正（内层反向 rotate 掉它）
// 换手素材时这三个值必须在新图上重量（量法见 references/cards/pencil-sketch-draw.md 已知坑）。
const ASSET = {
  w: 817, h: 640,   // PNG 原生尺寸
  tipX: 1, tipY: 552, // 石墨尖像素坐标（PIL 取左下深色石墨簇的轴向极值点）
  axisDeg: 44.24,   // 笔杆黄色像素做 PCA 主轴，指向橡皮头一侧后取与 −Y 的夹角
};

/* 时间表（demo 秒）
   0.30–1.40  第一笔：卡片框（power2.inOut）；1.40–1.65 铅笔抬离+淡出
   1.65–2.95  第二笔：车身轮廓；2.95–3.20 抬离+淡出
   3.20–3.65  第三笔：下划线；3.65–3.90 抬离+淡出
   3.70–4.05  标签淡入上移（power2.out） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

// —— 纯函数版 getPointAtLength：解析 M/L/Q 路径 → 折线采样 + 累计弧长表 ——
// （Remotion 渲染是纯函数求值，不能量 DOM；对本卡的直线/二次贝塞尔，采样误差 < 0.1px）
type Pt = { x: number; y: number };
type PathGeom = { pts: Pt[]; cum: number[]; total: number };
function samplePath(d: string): PathGeom {
  const tokens = d.match(/[MLQ]|-?\d*\.?\d+/g) ?? [];
  const pts: Pt[] = [];
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === "M" || cmd === "L") {
      pts.push({ x: num(), y: num() });
    } else if (cmd === "Q") {
      const p0 = pts[pts.length - 1];
      const cx = num(), cy = num(), x = num(), y = num();
      for (let k = 1; k <= 32; k++) {           // 二次贝塞尔按 32 段折线采样
        const u = k / 32, v = 1 - u;
        pts.push({ x: v * v * p0.x + 2 * v * u * cx + u * u * x,
                   y: v * v * p0.y + 2 * v * u * cy + u * u * y });
      }
    }
  }
  const cum = [0];
  for (let k = 1; k < pts.length; k++) {
    cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  }
  return { pts, cum, total: cum[cum.length - 1] };
}
function pointAtLength(g: PathGeom, len: number): Pt {
  const L = Math.max(0, Math.min(g.total, len));
  let lo = 0, hi = g.cum.length - 1;
  while (lo < hi) {                              // 二分找所在折线段
    const mid = (lo + hi) >> 1;
    if (g.cum[mid] < L) lo = mid + 1; else hi = mid;
  }
  const k = Math.max(1, lo);
  const segLen = g.cum[k] - g.cum[k - 1] || 1;
  const p = (L - g.cum[k - 1]) / segLen;
  return { x: lerp(g.pts[k - 1].x, g.pts[k].x, p), y: lerp(g.pts[k - 1].y, g.pts[k].y, p) };
}
const GEOMS = CONFIG.strokes.map((s) => samplePath(s.d));

// 笔尖精确落在生长点上：translate 到路径上的点，笔尖就是局部 (0,0)，零偏移。
// 笔身角 = 固定握笔角 +42° + 跟随项（行进方向切线的竖直分量，手腕只跟一点点）。
// 抬笔沿笔身轴向（局部 −Y 经 ang 旋转后的世界方向），笔才像被"提起来"而不是平移。
function placePencil(g: PathGeom, p: number, extra = 0): { x: number; y: number; ang: number } {
  const at = Math.max(0.001, Math.min(g.total, g.total * p));
  const pt = pointAtLength(g, at);
  const back = pointAtLength(g, Math.max(0, at - 2.5));
  const vx = pt.x - back.x, vy = pt.y - back.y;
  const m = Math.hypot(vx, vy) || 1;
  const { tilt, follow } = CONFIG.pencil;
  const ang = tilt + follow * (vy / m);
  const r = (ang * Math.PI) / 180;
  return { x: pt.x + extra * Math.sin(r), y: pt.y - extra * Math.cos(r), ang };
}

// —— 笔具：handSrc = 手握铅笔实拍素材（与 demo 同画面）；不传 = 纯矢量铅笔兜底 ——
// 两者同一坐标契约：笔尖坐在局部 (0,0)，笔身朝 −Y，其余零件全部由这根轴推导。
const Pencil: React.FC<{ src?: string }> = ({ src }) =>
  src ? (
    // 外层由 placePencil 定位；内层固定 rotate(−axisDeg) 把素材里斜着的笔轴掰正到局部 −Y；
    // Img 用负偏移把 tip 像素挪到局部原点，于是旋转中心 = 笔尖
    <div style={{ position: "absolute", left: 0, top: 0,
                  transform: `rotate(${-ASSET.axisDeg}deg)`, transformOrigin: "0 0" }}>
      <Img src={src} style={{ position: "absolute", left: -ASSET.tipX, top: -ASSET.tipY,
                              width: ASSET.w, height: ASSET.h, maxWidth: "none" }} />
    </div>
  ) : (
    // 矢量铅笔兜底：石墨尖 + 木锥（两个色面）+ 六棱笔杆（三档黄）+ 金属箍 + 橡皮头
    // （金属箍与橡皮头是"读出这是铅笔"的辨识度来源，别省）
    <svg width={44} height={244} viewBox="-22 -240 44 244"
         style={{ position: "absolute", left: -22, top: -240, overflow: "visible", display: "block" }}>
      <polygon points="0,0 -3.4,-14 3.4,-14" fill="#3a3a3e" />                 {/* 石墨尖 */}
      <polygon points="0,0 -11,-36 0,-36" fill="#dcb488" />                    {/* 木锥左面 */}
      <polygon points="0,0 0,-36 11,-36" fill="#e8c39a" />                     {/* 木锥右面 */}
      <rect x={-11} y={-202} width={7} height={166} fill="#e3b800" />          {/* 笔杆左棱面 */}
      <rect x={-4} y={-202} width={8} height={166} fill="#FFD400" />           {/* 笔杆中面 */}
      <rect x={4} y={-202} width={7} height={166} fill="#ffdf4d" />            {/* 笔杆右棱面 */}
      <rect x={-11} y={-216} width={22} height={14} fill="#b9bdc4" />          {/* 金属箍 */}
      <rect x={-11} y={-211} width={22} height={1.6} fill="#9aa0a8" />
      <rect x={-11} y={-206} width={22} height={1.6} fill="#9aa0a8" />
      <rect x={-11} y={-238} width={22} height={24} rx={7} fill="#E79E96" />   {/* 橡皮头 */}
    </svg>
  );

// 三笔的绝对起笔秒（第一笔 0.3s 起，其后每笔接在上一笔抬笔之后）
const STARTS: number[] = (() => {
  const out: number[] = [];
  let end = 0.3;
  for (const s of CONFIG.strokes) { out.push(end); end += s.dur + 0.25; }
  return out;
})();
const LABEL_AT = STARTS[STARTS.length - 1] + CONFIG.strokes[CONFIG.strokes.length - 1].dur + 0.25 - 0.2;

// —— 演示语境 CSS（白底中性化契约：纸色属于风格不属于动效）——
const CSS = `
.paper-note {
  position: absolute; left: 50%; top: 44%; transform: translate(-50%, -50%);
  width: 640px; height: 380px;
}
/* 被"画出来"的卡片标签（动效本体的收尾，不是旁白字幕） */
.sketch-label {
  position: absolute; left: 50%; bottom: 84px;
  font-size: 26px; color: #1d1d1f; font-weight: 600; letter-spacing: 2px;
}
`;

export default function PencilSketchDraw({ hostSrc, handSrc }: { hostSrc?: string; handSrc?: string }) {
  void hostSrc;   // 本卡无主持人占位
  const t = useCurrentFrame() / FPS;

  const labelP = tw(t, LABEL_AT, 0.35, power2Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      {/* paper-note 是 640×380、viewBox 同尺寸 ⇒ SVG 坐标与 CSS px 一比一，
          铅笔作为 HTML 叠层用同一套 placePencil 坐标摆放 */}
      <div className="paper-note">
        <svg viewBox="0 0 640 380" style={{ overflow: "visible", width: "100%", height: "100%" }}>
          {CONFIG.strokes.map((s, i) => {
            const p = tw(t, STARTS[i], s.dur, power2InOut);
            return (
              /* p=0 时整条隐藏：round 线帽 + pathLength 缩放的浮点误差会在起笔点渲出一个圆点 */
              <path key={i} d={s.d} fill="none" stroke={CONFIG.stroke} strokeWidth={s.width}
                strokeLinecap="round" strokeLinejoin="round" strokeOpacity={p > 0 ? 1 : 0}
                pathLength={100} strokeDasharray={100} strokeDashoffset={100 * (1 - p)} />
            );
          })}
        </svg>
        {CONFIG.strokes.map((s, i) => {
          const t0 = STARTS[i];
          const drawEnd = t0 + s.dur;
          const p = tw(t, t0, s.dur, power2InOut);
          // 画完：铅笔沿笔身轴向抬离并淡出
          const liftD = CONFIG.pencil.lift * tw(t, drawEnd, 0.25, power2Out);
          const pencilOpacity = t < t0 ? 0 : 1 - tw(t, drawEnd, 0.25, power1Out);
          const pos = placePencil(GEOMS[i], p, liftD);
          return (
            <div key={i} style={{
              position: "absolute", left: 0, top: 0, width: 0, height: 0,
              opacity: pencilOpacity, willChange: "transform",
              transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.ang}deg) scale(${CONFIG.pencil.scale})`,
              transformOrigin: "0 0",
            }}>
              <Pencil src={handSrc} />
            </div>
          );
        })}
      </div>
      <div className="sketch-label" style={{
        opacity: labelP,
        transform: `translateX(-50%) translateY(${lerp(8, 0, labelP)}px)`,
      }}>
        Harness = 整辆车
      </div>
    </AbsoluteFill>
  );
}
