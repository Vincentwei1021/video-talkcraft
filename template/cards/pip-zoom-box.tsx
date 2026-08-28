import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// pip-zoom-box · 画中画放大 —— 自包含 Remotion 源码（与 demos/pip-zoom-box/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 112 };

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心动画：画中画放大（取景框浮现 → 框带内容平移放大到侧边定居 → 箭头指出）
// 关键工程点：框的几何与框内画面的补偿由**同一个进度 t 单点写入**（setPip）——
// 拆成两条 tween 一定会因缓动不同步而"内容从框里滑出去"，读作空框飞过。
// t=0 时框内画面与框外严格连续（zoom=1，副本偏移正好抵消框位移）；
// t=1 时框内是同一画面的 zoom 倍放大，且脸部锚点锁在框心。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  zoom: 2.2,          // 放大倍数：2~2.5 是"看清脸/看清细节"的档；>3 数字人分辨率兜不住，<1.8 读不出放大
  boxW: 280,          // 定居后取景窗宽 px（不含 8px 白边）
  boxH: 280,          // 定居后取景窗高 px：与宽相等 = 方框（参考图的画中画是方的）
  targetX: 764,       // 定居中心 X（舞台坐标）：留出右边距 56px
  targetY: 270,       // 定居中心 Y：垂直居中
  faceX: 0.275,       // 脸部锚点 / 舞台宽——**换人物素材必须重校这两个值**
  faceY: 0.315,       // 脸部锚点 / 舞台高（校准法：把 t 锁在 0，看细框是否正好框住脸）
  radius0: 4,         // 取景框圆角 px（框小，圆角要小）
  radius1: 10,        // 定居后圆角 px
  startDelay: 0.40,   // 起手静置：等口播念到"注意看这里"
  showDur: 0.20,      // 取景框浮现耗时 s（scale 0.9→1 + 淡入）
  aimHold: 0.15,      // 浮现后停一拍再飞——"先框住，再拿走"，少了这拍读作框自己飞过来
  flyDur: 0.50,       // 平移放大耗时 s（power2.inOut：起收都要缓，相机曲线）
  arrowAt: 0.05,      // 箭头相对落位的延迟 s
  arrowDur: 0.18,     // 箭杆划出耗时 s
  hold: 1.80,         // 定居后 hold s：全程静置（"定居"语义，不做扫视/呼吸）
};

/* 时间表（demo 秒）：tFly = 0.40+0.20+0.15 = 0.75，tLand = 1.25
   0.40–0.60  取景框在脸部浮现（opacity 0→1 + scale 0.9→1，power2.out）
   0.75–1.25  框带内容平移放大到右侧定居（p.t 0→1，power2.inOut）
   1.05–1.27  细描边退场（power1.in）
   1.19–1.37  白边卡亮起（power2.out）
   1.30–1.48  箭杆划出；1.426–1.526 箭头划出（power2.out）
   1.526–3.326  定居 hold（完全静置） */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1In = (x: number) => x * x;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

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

// —— 层级：底层全景（z1） → 箭头（z4） → 画中画变换组（z5）——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
/* 底层全景（演示语境）：人物占左侧，右侧留白给画中画定居 */
.pz-scene {
  position: absolute;
  left: 0; top: 0;
  width: 960px; height: 540px;        /* 与舞台等尺寸——框内副本才能与框外像素一致 */
  background: #ffffff;
  z-index: 1;
}
.pz-scene .host-col {                 /* 人物列：占左 55%，人物落在这列中央 */
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 55%;
  overflow: hidden;
}

/* —— 动效本体 —— 画中画变换组：框（几何）+ 框内画面副本（反向补偿）+ 两层边饰 —— */
.pz-shell {
  position: absolute;
  z-index: 5;
  will-change: left, top, width, height;
}
.pz-win {                             /* 取景窗：唯一做 overflow hidden 的元素 */
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #ffffff;
}
.pz-win .pz-scene { z-index: 0; }     /* 框内的画面副本（与底层同结构、同像素） */

/* 边饰两层：起手细描边（取景框）→ 落位白边卡（证据素材） */
.pz-hair, .pz-card { position: absolute; inset: 0; pointer-events: none; }
.pz-hair { box-shadow: 0 0 0 1.5px #0066cc; }
.pz-card {
  box-shadow: 0 0 0 8px #ffffff,               /* 白边卡 */
              0 12px 60px rgba(0, 0, 0, 0.22); /* 全系统唯一投影：只给证据素材 */
}

/* 指向箭头：从人物指向定居后的画中画（单向，不是回指出处的连接线） */
#pz-arrow { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 4; pointer-events: none; }
#pz-arrow path { fill: none; stroke: #0066cc; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
`;

export default function PipZoomBox({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const SW = 960, SH = 540;
  const fx = SW * C.faceX, fy = SH * C.faceY;
  const w0 = C.boxW / C.zoom, h0 = C.boxH / C.zoom;

  const tFly = C.startDelay + C.showDur + C.aimHold;
  const tLand = tFly + C.flyDur;

  // ② 框带着内容平移放大到右侧定居（几何单点写入，框内画面全程锁在脸上）
  const pT = tw(t, tFly, C.flyDur, power2InOut);
  const zoom = lerp(1, C.zoom, pT);
  const w = lerp(w0, C.boxW, pT);
  const h = lerp(h0, C.boxH, pT);
  const cx = lerp(fx, C.targetX, pT);
  const cy = lerp(fy, C.targetY, pT);
  const r = lerp(C.radius0, C.radius1, pT);

  // ① 取景框在脸部浮现——"框住这里"（scale 作用在整个变换组上：框与内容一起）
  const showP = tw(t, C.startDelay, C.showDur, power2Out);
  const shellOpacity = showP;
  const shellScale = lerp(0.9, 1, showP);

  // ③ 交接边饰：细取景描边在后半程退场，白边卡 + 唯一投影在落位那一刻立住
  const hairOpacity = 1 - tw(t, tFly + C.flyDur * 0.6, 0.22, power1In);
  const cardOpacity = tw(t, tLand - 0.06, 0.18, power2Out);

  // ④ 箭头：落位后才从人物一侧划向画中画（单向指示，箭尖离框留 18px 不戳到）
  const shaftLen = 58;                                   // M540,270 L598,270
  const headLen = 2 * Math.hypot(13, 10);                // M585,260 L598,270 L585,280
  const shaftOff = shaftLen * (1 - tw(t, tLand + C.arrowAt, C.arrowDur, power2Out));
  const headOff = headLen * (1 - tw(t, tLand + C.arrowAt + C.arrowDur * 0.7, 0.1, power2Out));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      {/* 底层全景 */}
      <div className="pz-scene">
        <div className="host-col"><Host src={hostSrc} /></div>
      </div>

      <svg id="pz-arrow" viewBox="0 0 960 540">
        <path d="M 540 270 L 598 270"
          strokeDasharray={shaftLen} strokeDashoffset={shaftOff} />
        <path d="M 585 260 L 598 270 L 585 280"
          strokeDasharray={headLen} strokeDashoffset={headOff} />
      </svg>

      {/* 画中画变换组 */}
      <div className="pz-shell" style={{
        left: cx - w / 2, top: cy - h / 2, width: w, height: h,
        opacity: shellOpacity,
        transform: `scale(${shellScale})`, transformOrigin: "50% 50%",
      }}>
        <div className="pz-win" style={{ borderRadius: r }}>
          {/* 反向补偿：副本自身放大 zoom 倍，偏移让"脸部锚点"恒落在框心 —— 画面本身永不变形 */}
          <div className="pz-scene" style={{
            transformOrigin: "0 0",
            transform: `translate(${w / 2 - zoom * fx}px, ${h / 2 - zoom * fy}px) scale(${zoom})`,
          }}>
            <div className="host-col"><Host src={hostSrc} /></div>
          </div>
        </div>
        <div className="pz-hair" style={{ opacity: hairOpacity, borderRadius: r }} />
        <div className="pz-card" style={{ opacity: cardOpacity, borderRadius: r }} />
      </div>
    </AbsoluteFill>
  );
}
