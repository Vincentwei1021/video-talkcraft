import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// crash-zoom-punch · 急推特写 —— 自包含 Remotion 源码（与 demos/crash-zoom-punch/index.html 同画面）
// 全景静置 1s 让观众看清整页，然后 6 帧 ease-in 急推到目标文字块（zoom 1→2.3，中心同步收敛到目标），过冲后 5 帧回收 4.5% 到 2.2 落定；
// 急推那 6 帧叠一记短促 blur 当运动模糊。之后画面钉死——它是一次性的重音，不是 hold 期运动。
// 复制本文件进你的工程即可用；真截图经 src 注入、目标 bbox（舞台坐标）经 target 注入。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 144 };   // 4.4s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 急推 ≤8 帧（>10 帧读作普通推近，冲击感消失）；② 目标中心钉死——推进前后同一 origin，是一个镜头的一拍不是两个镜头；
//      ③ 过冲后回收 3~6%（过大读作弹簧玩具）；④ 落定即钉死不再动——它是一次性重音，与"相机只做极缓推拉"的 hold 期纪律不冲突。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  hold: 1.0,           // 全景静置 s：先让观众看清整页
  punch: 0.2,          // 急推时长 s（6 帧，power3.in 急加速）
  zoom: 2.3,           // 急推终点倍率（过冲峰值；终点构图以目标占画面 60~75% 为准）
  settle: 2.2,         // 回收落定倍率（过冲回收 4.5%）
  settleDur: 0.17,     // 回收时长 s（5 帧，power2.out）
  blur: 5,             // 急推段运动模糊峰值 px（只包急推段，落定段清晰）
  exitAt: 4.0,         // 退场起点（0.4s power2.in）
  end: 4.4,            // 镜头结束
  shot: { x: 80, y: 45, w: 800, h: 450 },   // 截图左上角与尺寸（舞台坐标）
};

/* 时间表（demo 秒）
   0.00–1.00  全景静置
   1.00–1.20  急推：scale 1→2.3、x/y 同步收敛到目标中心（power3.in）；blur 0→5（0.12s）→0（0.15s）
   1.20–1.37  过冲回收：2.3→2.2（power2.out），之后钉死
   4.00–4.40  退场（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const power3In = (x: number) => x * x * x * x;

/** 把舞台坐标 (px,py) 以 zoom z 搬到画面正中的相机变换（transform-origin 0 0），并钳制不露舞台边 */
function camTo(z: number, px: number, py: number, W = 960, H = 540) {
  let x = W / 2 - z * px, y = H / 2 - z * py;
  x = Math.min(0, Math.max(W - W * z, x)); y = Math.min(0, Math.max(H - H * z, y));
  return { scale: z, x, y };
}

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 czp- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.czp-cam { position: absolute; inset: 0; will-change: transform, filter; transform-origin: 0 0; }
.czp-shot { position: absolute; left: 80px; top: 45px; width: 800px; height: 450px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 14px; overflow: hidden; }
.czp-shot .czp-hd { height: 64px; border-bottom: 1px solid #ececf0; display: flex; align-items: center; padding: 0 28px; font-size: 22px; font-weight: 700; color: #1d1d1f; }
.czp-shot .czp-li { display: flex; align-items: center; justify-content: space-between; height: 64px; padding: 0 28px; border-bottom: 1px solid #f0f0f3; font-size: 18px; color: #1d1d1f; }
.czp-shot .czp-li .czp-g { display: block; height: 12px; width: 220px; border-radius: 6px; background: #ececf0; }
.czp-shot .czp-li .czp-g2 { width: 90px; }
.czp-shot .czp-sw { width: 46px; height: 26px; border-radius: 13px; background: #d9d9de; position: relative; }
.czp-shot .czp-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; }
.czp-shot .czp-sw.on { background: #248a3d; } .czp-shot .czp-sw.on::after { left: 23px; }
.czp-shot .czp-tg .czp-k { font-weight: 600; } .czp-shot .czp-tg .czp-k small { display: block; font-size: 13px; color: #7a7a7a; font-weight: 500; }
`;

/** 目标 bbox（舞台坐标，px）：demo 里假设置页"自动续费"文字块的实测值（row top 192 / k left 28 width 208） */
const DEMO_TARGET = { x: 108, y: 237, w: 208, h: 64 };

type Props = {
  /** 真截图（铺满 800×450 截图卡，object-fit cover）；不传 = CSS 假设置页 */
  src?: string;
  /** 目标 bbox（舞台坐标），急推中心 = 它的中心；不传 = demo 的"自动续费"文字块 */
  target?: { x: number; y: number; w: number; h: number };
  /** 假设置页的目标行文案（仅无 src 时用） */
  label?: string;
  sub?: string;
};

export default function CrashZoomPunch({ src, target = DEMO_TARGET, label = "自动续费", sub = "下次扣款 2026-10-05 · ¥ 199 / 月" }: Props) {
  const t = useCurrentFrame() / FPS;

  // 目标中心钉死：推进与回收共用同一 (px, py)
  const px = target.x + target.w / 2, py = target.y + target.h / 2;
  const a = camTo(CONFIG.zoom, px, py), b = camTo(CONFIG.settle, px, py);

  // 相机：全景 → 6 帧急推到过冲峰值 → 5 帧回收落定 → 钉死
  const pIn = tw(t, CONFIG.hold, CONFIG.punch, power3In);
  const pSettle = tw(t, CONFIG.hold + CONFIG.punch, CONFIG.settleDur, power2Out);
  const cam = {
    scale: lerp(lerp(1, a.scale, pIn), b.scale, pSettle),
    x: lerp(lerp(0, a.x, pIn), b.x, pSettle),
    y: lerp(lerp(0, a.y, pIn), b.y, pSettle),
  };
  // 运动模糊只包急推段：0.12s 升到峰值，再 0.15s 落回 0
  const blur = CONFIG.blur * (tw(t, CONFIG.hold, CONFIG.punch * 0.6, power2In) - tw(t, CONFIG.hold + CONFIG.punch * 0.6, 0.15, power1Out));
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.end - CONFIG.exitAt, power2In);

  return (
    <AbsoluteFill style={{ background: "#f5f5f7", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="czp-cam" style={{ opacity: exitK, transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`, filter: `blur(${Math.max(0, blur).toFixed(2)}px)` }}>
        <div className="czp-shot">
          {src ? (
            <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <>
              <div className="czp-hd">订阅与账单</div>
              <div className="czp-li"><span className="czp-g" /><span className="czp-sw" /></div>
              <div className="czp-li"><span className="czp-g" style={{ width: 160 }} /><span className="czp-sw on" /></div>
              <div className="czp-li czp-tg"><span className="czp-k">{label}<small>{sub}</small></span><span className="czp-sw on" /></div>
              <div className="czp-li"><span className="czp-g" style={{ width: 260 }} /><span className="czp-g czp-g2" /></div>
              <div className="czp-li"><span className="czp-g" style={{ width: 120 }} /><span className="czp-sw" /></div>
              <div className="czp-li"><span className="czp-g" style={{ width: 200 }} /><span className="czp-g czp-g2" /></div>
            </>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}
