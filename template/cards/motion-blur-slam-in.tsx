import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// motion-blur-slam-in · 模糊甩入急停 —— 自包含 Remotion 源码（与 demos/motion-blur-slam-in/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 45 };

const FPS = meta.fps;

// —— 可摘走的核心动画：屏外直线飞入 + 方向模糊随速度收敛 + 到位过冲回正 ——
const CONFIG = {
  startDelay: 0.4,          // 等口播说到"甩上来"再发
  fromX: 560,               // 屏外起始距离 px：≥ 半屏才有速度累积，模糊才有地方发生
  slam: 0.2,                // 飞入耗时 s：0.15~0.25，>0.35 就变成平移滑入
  // slamEase = power4.out：急停的命——快起 + 强减速；power2.out 读作"滑进来"
  blurMax: 18,              // 起点横向 σ（240px 宽卡）：>25 糊成云雾，<8 等于没做
  blurFalloff: 0.75,        // σ ∝ (1-p)^0.75 —— power4.out 的速度衰减律，停住那帧自动归零
  overshoot: 3,             // 到位沿运动方向多冲 px：>8 就变回弹入场（那是 media-pop-in）
  settle: 0.1,              // 过冲回正耗时 s：>0.2 会被看成第二段运动
  burst: 0.4,               // 多卡同方向连发间隔 s：0.3~0.5
};

/* 时间表（demo 秒）
   0.40–0.60  shot-a 飞入 x 560→-3（power4.out，σ=18·(1-p)^0.75 随速度归零）
   0.60–0.70  shot-a 过冲回正 x -3→0（power2.out）
   0.80–1.00  shot-b 飞入；1.00–1.10 回正 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);

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

// —— 演示语境（不属于动效）：左侧人物列 + 右侧净白素材区，卡从右外侧飞进来 ——
const CSS = `
.host-wrap { position: absolute; left: 0; top: 0; bottom: 0; width: 46%; overflow: hidden; }
.evidence { position: absolute; left: 46%; right: 0; top: 0; bottom: 0; }
/* 假截图卡（占位内容不属于动效；投影只是让拖影在白底上更可读） */
.shot {
  position: absolute;
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 5px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, .14);
  overflow: hidden;
}
.shot .bar { height: 24px; background: #f2f2f4; border-bottom: 1px solid #ececee;
             display: flex; align-items: center; gap: 5px; padding: 0 9px; }
.shot .bar i { width: 8px; height: 8px; border-radius: 50%; background: #cfcfd4; }
.shot .h { height: 14px; width: 62%; background: #8a8a8a; border-radius: 3px; margin: 16px 15px 10px; }
.shot .l { height: 8px; background: #d9d9de; border-radius: 3px; margin: 8px 15px; }
.shot .l.s { width: 48%; }
.shot .bars { display: flex; align-items: flex-end; gap: 10px; height: 92px; margin: 20px 16px 0; }
.shot .bars b { flex: 1; background: #d9d9de; border-radius: 2px 2px 0 0; }
.shot .bars b.hi { background: #8a8a8a; }
.shot .cap { height: 8px; width: 44%; background: #d9d9de; border-radius: 3px; margin: 12px 16px; }
/* 落位相对 .evidence：后到的 shot-b 压前者一角——同方向连发 + 层级递增才读作"一沓一沓怼上来" */
.shot-a { width: 240px; height: 158px; left: 60px;  top: 150px; z-index: 2; }
.shot-b { width: 230px; height: 150px; left: 200px; top: 236px; z-index: 3; }
`;

// 单卡在 t 时刻的位移与方向模糊 σ
function slamState(t: number, at: number) {
  const flyEnd = at + CONFIG.slam;
  if (t < flyEnd) {
    // 飞入：位移终点多冲 overshoot px；σ 取同一条 tween 的已缓动进度 p，
    // σ = blurMax·(1-p)^0.75 —— 等价于"σ 跟着速度走"，p→1 时 σ 自动归零
    const p = tw(t, at, CONFIG.slam, power4Out);
    return { x: lerp(CONFIG.fromX, -CONFIG.overshoot, p),
             sigma: CONFIG.blurMax * Math.pow(1 - p, CONFIG.blurFalloff) };
  }
  // 到位过冲回正：一帧级的"顶到底"回弹，不是弹跳入场。归零后 filter 整个摘掉
  return { x: lerp(-CONFIG.overshoot, 0, tw(t, flyEnd, CONFIG.settle, power2Out)), sigma: 0 };
}

export default function MotionBlurSlamIn({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  const a = slamState(t, CONFIG.startDelay);
  const b = slamState(t, CONFIG.startDelay + CONFIG.burst);

  // 静止画面绝不允许还挂着拖影：σ 归零时把 filter 整个摘掉
  const filterOf = (sigma: number, id: string) =>
    sigma < 0.05 ? undefined : `url(#${id})`;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      {/* 方向模糊滤镜：stdDeviation="σ 0" = 只糊横向，才读作速度而不是失焦。
          filter 区域必须放宽（x/width），否则拖影会被裁出硬边；sRGB 防白底上发灰的脏边 */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        <defs>
          <filter id="mbA" x="-60%" y="-20%" width="220%" height="140%"
                  colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${a.sigma.toFixed(2)} 0`} />
          </filter>
          <filter id="mbB" x="-60%" y="-20%" width="220%" height="140%"
                  colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${b.sigma.toFixed(2)} 0`} />
          </filter>
        </defs>
      </svg>

      <div className="host-wrap"><Host src={hostSrc} /></div>

      <div className="evidence">
        <div className="shot shot-a" style={{
          transform: `translateX(${a.x}px)`, filter: filterOf(a.sigma, "mbA"),
        }}>
          <div className="bar"><i /><i /><i /></div>
          <div className="h" /><div className="l" /><div className="l" /><div className="l s" />
        </div>
        <div className="shot shot-b" style={{
          transform: `translateX(${b.x}px)`, filter: filterOf(b.sigma, "mbB"),
        }}>
          <div className="bars">
            <b style={{ height: "34%" }} /><b style={{ height: "52%" }} />
            <b className="hi" style={{ height: "78%" }} /><b style={{ height: "46%" }} />
            <b className="hi" style={{ height: "96%" }} /><b style={{ height: "62%" }} />
          </div>
          <div className="cap" />
        </div>
      </div>
    </AbsoluteFill>
  );
}
