import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// multi-still-tour · 多图巡览停靠 —— 自包含 Remotion 源码（与 demos/multi-still-tour/index.html 同画面）
// 几张图挂在一个"世界"里，相机逐张停靠（移动 → 真静止停靠 → 下一张），最后拉回全景与字同收。两种版式一卡切换：
//   wall     照片墙推轨：三张 430×290 挂在 rotateY −12° 的 3D 墙上，全景 → 逐张推近（其余压暗 + 景深虚化）→ 拉回
//   timeline 时间线照片带：四张 240×160 沿一条时间线上下交替，相机横移逐站停靠（当前站 1.03 亮 / 其余 .7）→ 拉开看全条
// 复制本文件进你的工程即可用；真图经 srcs 注入（不传 = 灰调占位）。默认 layout="tour" 先演 wall 再硬切 timeline（= demo 画面）；
// 成片一镜只用一式：传 layout="wall" | "timeline"，时长用 durationFor(layout)。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 555 };   // wall 8.2s + timeline 9.9s + 0.4s 收尾

const FPS = meta.fps;

export type Layout = "wall" | "timeline";

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 运镜纪律：① 相机层是唯一被 transform 的元素，camTo(z, px, py) 反解到画心 ⇒ 每一站的缩放绕当前图发生
//          ② 停靠段相机真静止（停靠类例外，不续走），但当前图内部 1 → 1.03 微推防死；其余图压暗（wall 还加景深虚化）
//          ③ 巡完必拉回全景；全景停留结束与字同收
// ——————————————————————————————————————————————————————————
const CONFIG = {
  wall: {
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
    len: 8.2,         // 本式总长（含退场）
    centers: [355, 855, 1355], pivot: 850,   // 三张照片中心 x（y 均 270）/ 墙的旋转轴 x
  },
  timeline: {
    stopZ: 1.05,      // 停靠焦距：邻站出画 24px（1.0 时邻站与画幅边齐平、邻站 caption 离边 6px，读作贴边）；上排照片离顶 49.5
    wideZ: 0.62,      // 拉开看全条的焦距
    move: 0.9,        // 站间横移（power2.inOut）
    hold: 1.0,        // 每站停留
    lead: 0.4,        // 起手：第一站先停一拍再点亮
    pull: 1.1,        // 拉开
    tailHold: 1.2,    // 拉开后看全条的有意停留
    dim: 0.7,         // 非当前站 brightness
    focus: 1.03,      // 当前站放大 1.03（0.4s，从移动中段起）
    exit: 0.4,        // 退场：caption + 时间线 → 照片，错峰 0.04
    len: 9.9,         // 本式总长（含退场）
    centers: [240, 600, 960, 1320], stripCenter: [780, 300] as [number, number],   // 四站中心 x / 全条中心
  },
};
/* 时间表（demo 秒）
   wall     0–0.8 全景（z .61） · 0.8/2.7/4.6 依次推到三张（移 1.0 + 停 0.9，压暗从移动 0.5s 起、微推从 0.7s 起）
            · 6.5–7.7 拉回全景（压暗 6.8 起 0.6s 复原）· 7.7–8.18 照片退场 · 8.2 硬切
   timeline 8.2 起（式内 lt）：0 第一站居中 · 0.4 点亮 · 1.4/3.3/5.2 横移到二三四站（移 0.9 + 停 1.0，点亮从移动 0.5s 起）
            · 7.1–8.2 拉开看全条（7.4 起 0.5s 全部复原）· 8.2–9.4 停 · 9.4–9.84 退场 · 9.9 结束（总 18.1） */

/** 单式成片时长（帧）：本式总长 + 0.4s 收尾；"tour" = 两式巡演（= demo） */
export const durationFor = (layout: Layout | "tour"): number =>
  layout === "tour" ? meta.durationInFrames : Math.round((CONFIG[layout].len + 0.4) * FPS);

// 把世界坐标 (px, py) 以焦距 z 搬到画心的相机变换（transform-origin 0 0）。
// 相机层不是满铺素材、底是静态幕底，无"露边"问题，故不钳制（slow-push-in 那种满铺素材才需要 clamp）。
type Cam = { scale: number; x: number; y: number };
const camTo = (z: number, px: number, py: number): Cam => ({ scale: z, x: 480 - z * px, y: 270 - z * py });
// wall 的墙绕 x=850 转了 −12°：照片中心投影到相机层的 x 是旋转后的坐标（否则每站偏心 11~14px）
const wallX = (x: number) => CONFIG.wall.pivot + (x - CONFIG.wall.pivot) * Math.cos((CONFIG.wall.wallRy * Math.PI) / 180);

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

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 mst- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.mst-cam { position: absolute; inset: 0; transform-origin: 0 0; will-change: transform; }
.mst-photo { position: absolute; background: #ffffff; padding: 10px; border-radius: 12px; box-shadow: 0 12px 60px rgba(0,0,0,.22); }
.mst-photo .frame { position: absolute; inset: 10px; border-radius: 5px; overflow: hidden; }
.mst-ph { position: absolute; inset: 0; overflow: hidden; transform-origin: 50% 50%; }
.mst-ph::before { content: ""; position: absolute; inset: 0; }
.mst-ph.t1::before { background: linear-gradient(160deg, #a4b0c6, #7d8aa3); }
.mst-ph.t2::before { background: linear-gradient(160deg, #bfa5ae, #957c86); }
.mst-ph.t3::before { background: linear-gradient(160deg, #9fb9ae, #789389); }
.mst-ph.t4::before { background: linear-gradient(160deg, #c2b39a, #9c8f78); }
.mst-ph svg { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.mst-world { position: absolute; inset: 0; perspective: 1200px; perspective-origin: 50% 50%; overflow: hidden; background: radial-gradient(ellipse at 50% 40%, #26262e, #0f0f13 75%); }
.mst-world .mst-cam { transform-style: preserve-3d; }
.mst-wall { position: absolute; left: 0; top: 0; width: 1700px; height: 540px; transform-style: preserve-3d; transform: rotateY(-12deg); transform-origin: 850px 270px; }
.mst-floor { position: absolute; left: -400px; right: -400px; top: 430px; height: 300px; background: linear-gradient(180deg, rgba(255,255,255,.06), transparent 60%); transform: rotateX(80deg); transform-origin: top; }
.mst-wall .mst-photo { width: 430px; height: 290px; top: 125px; }
.mst-tag { position: absolute; left: 24px; bottom: 24px; background: rgba(255,255,255,.94); color: #1d1d1f; font-size: 20px; font-weight: 700; padding: 6px 14px; border-radius: 8px; white-space: nowrap; box-shadow: 0 4px 16px rgba(0,0,0,.18); }
.mst-tl .mst-cam { width: 1600px; }
.mst-line { position: absolute; left: 60px; top: 300px; width: 1500px; height: 3px; background: #1d1d1f; border-radius: 2px; }
.mst-tl .mst-photo { width: 240px; height: 160px; transform-origin: 50% 50%; }
.mst-cap { position: absolute; font-size: 22px; font-weight: 700; color: #1d1d1f; white-space: nowrap; }
.mst-pltag { position: absolute; left: 20px; bottom: 16px; z-index: 9; font-size: 12px; letter-spacing: 1px; color: #8a8a8a; background: rgba(255,255,255,.82); padding: 3px 10px; border-radius: 999px; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

/** 素材占位：灰调渐变 + 相框图标；传 src 则铺真图（object-fit cover）。scale = 停靠段内部微推 */
const Ph: React.FC<{ tone: number; src?: string; scale?: number }> = ({ tone, src, scale = 1 }) => (
  <div className={`mst-ph t${tone}`} style={{ transform: `scale(${scale})` }}>
    {src ? <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : GLYPH}
  </div>
);

const WALL_LABELS = ["案例一 · 品牌官网", "案例二 · 电商小程序", "案例三 · 数据看板"];
const TL_LABELS = ["2019 · 一台笔记本", "2021 · 有了工位", "2023 · 全套设备", "2026 · 自己的工作室"];
// timeline 几何：四站上下交替（上 top 90 / 下 top 330），caption 靠时间线一侧（上排在线下 318 / 下排在线上 266）
const TL_POS = [{ left: 120, top: 90, cap: 318 }, { left: 480, top: 330, cap: 266 }, { left: 840, top: 90, cap: 318 }, { left: 1200, top: 330, cap: 266 }];

type Props = {
  /** 单式 or 两式巡演（默认，与 demo 一致） */
  layout?: Layout | "tour";
  /** 真图（wall 用前 3 张、timeline 用前 4 张）；不传用灰调占位 */
  srcs?: string[];
  /** 图注（wall 的压图标签 / timeline 的日期 caption）；不传用默认文案 */
  labels?: string[];
};

export default function MultiStillTour({ layout = "tour", srcs, labels }: Props) {
  const t = useCurrentFrame() / FPS;
  const tour = layout === "tour";
  const cur: Layout = tour ? (t < CONFIG.wall.len ? "wall" : "timeline") : layout;
  const lt = tour && cur === "timeline" ? t - CONFIG.wall.len : t;   // 式内相对秒
  const src = (i: number) => (srcs && srcs[i]) || undefined;
  const label = (i: number, def: string[]) => (labels && labels[i]) || def[i];
  const len = CONFIG[cur].len;
  const tagOp = Math.min(tw(lt, 0.05, 0.2, power1Out), 1 - tw(lt, len - 0.25, 0.2, power1Out));

  let body: React.ReactNode;
  if (cur === "wall") {
    const C = CONFIG.wall;
    const wide = camTo(C.wideZ, C.wideAt, 270);
    // 相机：全景 → 三站 → 全景（链式求值）
    let cam = wide, tt = C.lead;
    const starts: number[] = [];
    C.centers.forEach((cx) => { starts.push(tt); cam = camSeg(cam, camTo(C.stopZ, wallX(cx), 270), lt, tt, C.move); tt += C.move + C.hold; });
    cam = camSeg(cam, wide, lt, tt, C.pull);
    const tPull = tt;
    body = (
      <div className="mst-world">
        <div className="mst-cam" style={camStyle(cam)}>
          <div className="mst-wall">
            <div className="mst-floor" />
            {C.centers.map((cx, j) => {
              // 其余照片压暗 + 景深虚化（每站从移动中段起 0.5s），拉回时 0.6s 复原
              let b = 1, bl = 0;
              starts.forEach((s, i) => { const p = tw(lt, s + C.move * 0.5, 0.5, power1Out); b = lerp(b, i === j ? 1 : C.dim, p); bl = lerp(bl, i === j ? 0 : C.blur, p); });
              const back = tw(lt, tPull + 0.3, 0.6, power1Out); b = lerp(b, 1, back); bl = lerp(bl, 0, back);
              const push = lerp(1, C.push, tw(lt, starts[j] + C.move * 0.7, C.hold + 0.3, linear));   // 停靠段内部微推防死
              const op = 1 - tw(lt, tPull + C.pull + j * 0.04, C.exit, power2In);                     // 字与画同收
              return (
                <div key={j} className="mst-photo" style={{ left: cx - 215, filter: `brightness(${b}) blur(${bl}px)`, opacity: op }}>
                  <div className="frame"><Ph tone={j + 1} src={src(j)} scale={push} /></div>
                  <div className="mst-tag">{label(j, WALL_LABELS)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  } else {
    const C = CONFIG.timeline;
    const wide = camTo(C.wideZ, C.stripCenter[0], C.stripCenter[1]);
    let cam = camTo(C.stopZ, C.centers[0], 270), tt = C.lead;
    const focusAt: number[] = [];
    C.centers.forEach((cx, i) => { if (i) cam = camSeg(cam, camTo(C.stopZ, cx, 270), lt, tt, C.move); focusAt.push(tt + (i ? C.move * 0.5 : 0)); tt += (i ? C.move : 0) + C.hold; });
    cam = camSeg(cam, wide, lt, tt, C.pull);
    const tPull = tt, tOut = tt + C.pull + C.tailHold;
    const opLine = 1 - tw(lt, tOut, C.exit, power2In), opPhoto = 1 - tw(lt, tOut + 0.04, C.exit, power2In);
    body = (
      <div className="mst-tl" style={{ position: "absolute", inset: 0 }}>
        <div className="mst-cam" style={camStyle(cam)}>
          <div className="mst-line" style={{ opacity: opLine }} />
          {C.centers.map((_, j) => {
            // 当前站亮 + 1.03，其余 .7（每站 0.4s）；拉开时 0.5s 全部复原
            let b = C.dim, s = 1;
            focusAt.forEach((f, i) => { const p = tw(lt, f, 0.4, power1Out); b = lerp(b, i === j ? 1 : C.dim, p); s = lerp(s, i === j ? C.focus : 1, p); });
            const back = tw(lt, tPull + 0.3, 0.5, power1Out); b = lerp(b, 1, back); s = lerp(s, 1, back);
            const P = TL_POS[j];
            return (
              <React.Fragment key={j}>
                <div className="mst-photo" style={{ left: P.left, top: P.top, filter: `brightness(${b})`, transform: `scale(${s})`, opacity: opPhoto }}>
                  <div className="frame"><Ph tone={j + 1} src={src(j)} /></div>
                </div>
                <div className="mst-cap" style={{ left: P.left + 6, top: P.cap, opacity: opLine }}>{label(j, TL_LABELS)}</div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      {body}
      {tour && <div className="mst-pltag" style={{ opacity: tagOp }}>{cur === "wall" ? "① 照片墙推轨 · wall" : "② 时间线照片带 · timeline"}</div>}
    </AbsoluteFill>
  );
}
