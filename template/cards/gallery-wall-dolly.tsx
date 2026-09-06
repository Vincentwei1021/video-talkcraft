import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// gallery-wall-dolly · 照片墙推轨 —— 自包含 Remotion 源码（与 demos/gallery-wall-dolly/index.html 同画面）
// 三张 430×290 平级案例挂在 rotateY −12° 的 3D 墙上（深灰径向幕底 + 地面反光），相机全景 → 逐张推近停靠
// （其余压暗 + 景深虚化、当前图内部 1→1.03 微推）→ 拉回全景与字同收。
// 复制本文件进你的工程即可用；真图经 srcs 注入（不传 = 灰调占位）。2026-09-06 由 multi-still-tour 拆出；有先后的几站用 timeline-photo-strip。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 258 };   // 8.2s + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 运镜纪律：① 相机层是唯一被 transform 的元素，camTo(z, px, py) 反解到画心 ⇒ 每一站的缩放绕当前图发生
//          ② 停靠段相机真静止（停靠类例外，不续走），但当前图内部 1 → 1.03 微推防死；其余图压暗 + 景深虚化
//          ③ 巡完必拉回全景；全景停留结束与字同收
// ——————————————————————————————————————————————————————————
const CONFIG = {
  wallRy: -12,      // 墙的 rotateY（≤25° 才可读）
  wideZ: 0.61,      // 全景焦距（透视下近端更宽：.61 时三张投影两侧各留 53px；实验室 .72 会切掉第三张）
  wideAt: 942,      // 全景的相机目标 x（墙坐标）：三张投影包围盒居中解出，不是墙心 850
  stopZ: 1.15,      // 停靠焦距（放大 ≤1.2）
  move: 1.0,        // 站间移动（power2.inOut）
  hold: 0.9,        // 停靠（相机真静止）
  lead: 0.8,        // 起手全景停留
  pull: 1.2,        // 拉回全景
  dim: 0.5, blur: 3, // 停靠时其余照片：brightness .5 + blur 3px（0.5s，从移动中段起）
  push: 1.03,       // 停靠段当前照片内部微推（时长 hold + 0.3，从移动 70% 处起）
  exit: 0.4,        // 拉回后照片一起退场（错峰 0.04）
  end: 8.2,         // 动画结束秒（含退场）
  centers: [355, 855, 1355], pivot: 850,   // 三张照片中心 x（y 均 270）/ 墙的旋转轴 x
};
/* 时间表：0–0.8 全景（z .61） · 0.8 / 2.7 / 4.6 依次推到三张（移 1.0 + 停 0.9，压暗从移动 0.5s 起、微推从 0.7s 起）
   · 6.5–7.7 拉回全景（压暗 6.8 起 0.6s 复原）· 7.7–8.18 照片退场 · 8.2 结束 */
export const END = CONFIG.end;

type Cam = { scale: number; x: number; y: number };
// 把世界坐标 (px, py) 以焦距 z 搬到画心的相机变换（transform-origin 0 0）。相机层不是满铺素材、底是静态幕底，无"露边"问题，故不钳制。
const camTo = (z: number, px: number, py: number): Cam => ({ scale: z, x: 480 - z * px, y: 270 - z * py });
// 墙绕 x=850 转了 −12°：照片中心投影到相机层的 x 是旋转后的坐标（否则每站偏心 11~14px）
const wallX = (x: number) => CONFIG.pivot + (x - CONFIG.pivot) * Math.cos((CONFIG.wallRy * Math.PI) / 180);

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** 相机分段：从 from 到 to，t0 起 d 秒 power2.inOut——链式求值（段不重叠） */
const camSeg = (cam: Cam, to: Cam, t: number, t0: number, d: number): Cam => {
  const p = tw(t, t0, d, power2InOut);
  return { scale: lerp(cam.scale, to.scale, p), x: lerp(cam.x, to.x, p), y: lerp(cam.y, to.y, p) };
};
const camStyle = (c: Cam): React.CSSProperties => ({ transform: `translate(${c.x}px, ${c.y}px) scale(${c.scale})`, transformOrigin: "0 0" });

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 gwd- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.gwd-world { position: absolute; inset: 0; perspective: 1200px; perspective-origin: 50% 50%; overflow: hidden; background: radial-gradient(ellipse at 50% 40%, #26262e, #0f0f13 75%); }
.gwd-cam { position: absolute; inset: 0; transform-origin: 0 0; will-change: transform; transform-style: preserve-3d; }
.gwd-wall { position: absolute; left: 0; top: 0; width: 1700px; height: 540px; transform-style: preserve-3d; transform: rotateY(-12deg); transform-origin: 850px 270px; }
.gwd-floor { position: absolute; left: -400px; right: -400px; top: 430px; height: 300px; background: linear-gradient(180deg, rgba(255,255,255,.06), transparent 60%); transform: rotateX(80deg); transform-origin: top; }
.gwd-photo { position: absolute; background: #ffffff; padding: 10px; border-radius: 12px; box-shadow: 0 12px 60px rgba(0,0,0,.22); width: 430px; height: 290px; top: 125px; }
.gwd-photo .frame { position: absolute; inset: 10px; border-radius: 5px; overflow: hidden; }
.gwd-ph { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
.gwd-ph::before { content: ""; position: absolute; inset: 0; }
.gwd-ph.t1::before { background: linear-gradient(160deg, #a4b0c6, #7d8aa3); }
.gwd-ph.t2::before { background: linear-gradient(160deg, #bfa5ae, #957c86); }
.gwd-ph.t3::before { background: linear-gradient(160deg, #9fb9ae, #789389); }
.gwd-ph svg { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.gwd-tag { position: absolute; left: 24px; bottom: 24px; background: rgba(255,255,255,.94); color: #1d1d1f; font-size: 20px; font-weight: 700; padding: 6px 14px; border-radius: 8px; white-space: nowrap; box-shadow: 0 4px 16px rgba(0,0,0,.18); }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

/** 素材占位：灰调渐变 + 相框图标；传 src 则铺真图（object-fit cover）。scale = 停靠段内部微推 */
const Ph: React.FC<{ tone: number; src?: string; scale?: number }> = ({ tone, src, scale = 1 }) => (
  <div className={`gwd-ph t${tone}`} style={{ transform: `scale(${scale})` }}>
    {src ? <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : GLYPH}
  </div>
);

const LABELS = ["案例一 · 品牌官网", "案例二 · 电商小程序", "案例三 · 数据看板"];

type Props = {
  /** 真图（三张）；不传用灰调占位 */
  srcs?: string[];
  /** 压图标签；不传用默认文案 */
  labels?: string[];
};

export default function GalleryWallDolly({ srcs, labels }: Props) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const src = (i: number) => (srcs && srcs[i]) || undefined;
  const label = (i: number) => (labels && labels[i]) || LABELS[i];
  const wide = camTo(C.wideZ, C.wideAt, 270);
  // 相机：全景 → 三站 → 全景（链式求值）
  let cam = wide, tt = C.lead;
  const starts: number[] = [];
  C.centers.forEach((cx) => { starts.push(tt); cam = camSeg(cam, camTo(C.stopZ, wallX(cx), 270), t, tt, C.move); tt += C.move + C.hold; });
  cam = camSeg(cam, wide, t, tt, C.pull);
  const tPull = tt;

  return (
    <AbsoluteFill style={{ background: "#0f0f13", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="gwd-world">
        <div className="gwd-cam" style={camStyle(cam)}>
          <div className="gwd-wall">
            <div className="gwd-floor" />
            {C.centers.map((cx, j) => {
              // 其余照片压暗 + 景深虚化（每站从移动中段起 0.5s），拉回时 0.6s 复原
              let b = 1, bl = 0;
              starts.forEach((s, i) => { const p = tw(t, s + C.move * 0.5, 0.5, power1Out); b = lerp(b, i === j ? 1 : C.dim, p); bl = lerp(bl, i === j ? 0 : C.blur, p); });
              const back = tw(t, tPull + 0.3, 0.6, power1Out); b = lerp(b, 1, back); bl = lerp(bl, 0, back);
              const push = lerp(1, C.push, tw(t, starts[j] + C.move * 0.7, C.hold + 0.3, linear));   // 停靠段内部微推防死
              const op = 1 - tw(t, tPull + C.pull + j * 0.04, C.exit, power2In);                     // 字与画同收
              return (
                <div key={j} className="gwd-photo" style={{ left: cx - 215, filter: `brightness(${b}) blur(${bl}px)`, opacity: op }}>
                  <div className="frame"><Ph tone={j + 1} src={src(j)} scale={push} /></div>
                  <div className="gwd-tag">{label(j)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
