import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// danmu-bubble-praise · 弹幕气泡 —— 自包含 Remotion 源码（与 demos/danmu-bubble-praise/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 131 };

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心动画：弹幕气泡（进—停—走，四枚进出交叠成"评论在滚"）
// 命门：每枚的"停留"必须短到让第 3 枚进场时第 1 枚正在走 —— 交叠是本卡的全部语义。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  startDelay: 0.40,   // 起手静置：等口播念到"评论都在说"
  stagger: 0.55,      // 枚与枚的进场错峰 s：本卡第一命门（配合 hold 决定交叠量）
  inDur: 0.30,        // 单枚进场耗时 s（power3.out）
  hold: 0.75,         // 单枚在屏停留 s：+inDur 后必须 ≤ 2×stagger，否则四枚挤成一墙
  outDur: 0.40,       // 单枚飘走耗时 s（power1.in，出场比入场轻）
  inX: 26,            // 进场横向位移 px（各自从最近的边缘外侧推入，左侧 −、右侧 +）
  inScale: 0.88,      // 进场起始缩放
  outY: -18,          // 飘走上移 px（弹幕是往上滚出去的）
  tailHold: 0.45,     // 末枚走后留白：读作"这一波评论过去了"
  tilt: [-1.5, 1.5, 1.2, -1.8],   // 各枚的静态倾斜（贴歪感靠形状，全程不抖）
};

/* 时间表（demo 秒）
   第 i 枚：tIn = 0.40 + i·0.55 进场 0.30s（power3.out）
            tOut = tIn + 0.30 + 0.75 飘走 0.40s（power1.in）
   末枚出完 3.50 + 0.45 留白 → 总 3.95s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power1In = (x: number) => x * x;

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

// —— 演示语境（不属于动效）：主持人占位铺满舞台，气泡绕在人物两侧 ——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */
.host-full { position: absolute; inset: 0; z-index: 1; }

/* —— 动效本体 —— 四枚评论气泡。
   只有一枚带强调色（红 #e0452c），其余走灰阶实色（不叠 opacity，design-language §1 红线）。
   气泡 = 纯圆角胶囊，无尾巴三角（用户 2026-08-25 定版）、无描边、无投影。 */
.db-b {
  position: absolute;
  z-index: 3;
  padding: 11px 20px;
  border-radius: 999px;              /* 单行评论 = 胶囊，一屏只用这一档圆角 */
  font-size: 21px;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
}
/* 四枚的落位与配色：一枚强调红，三枚灰阶（深/中/浅三级实色，靠明度分层） */
#b1 { left: 96px;  top: 92px;  background: #e8e8ec; color: #1d1d1f; }
#b2 { left: 700px; top: 158px; background: #e0452c; color: #ffffff; }   /* 唯一强调色 */
#b3 { left: 62px;  top: 296px; background: #f2f2f4; color: #6e6e73; }
#b4 { left: 686px; top: 372px; background: #e8e8ec; color: #545458; }
`;

// side-l / side-r 只决定**进场方向**（从最近的边缘外侧推入），不再画尾巴三角
const BUBBLES = [
  { id: "b1", dir: -1, text: "说得太对了" },
  { id: "b2", dir: 1, text: "干货满满 👍" },
  { id: "b3", dir: -1, text: "收藏了" },
  { id: "b4", dir: 1, text: "已经在用了" },
];

export default function DanmuBubblePraise({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-full"><Host src={hostSrc} /></div>

      {BUBBLES.map((b, i) => {
        const tIn = CONFIG.startDelay + i * CONFIG.stagger;
        const tOut = tIn + CONFIG.inDur + CONFIG.hold;
        // 进：飘入落定（opacity/x/scale 同一条 power3.out）
        const pIn = tw(t, tIn, CONFIG.inDur, power3Out);
        // 走：上移淡出（出场永远比入场轻——只走 opacity + y，不再动 scale）
        const pOut = tw(t, tOut, CONFIG.outDur, power1In);
        const opacity = t < tOut ? pIn : 1 - pOut;
        const x = lerp(b.dir * CONFIG.inX, 0, pIn);
        const y = lerp(0, CONFIG.outY, pOut);
        const scale = lerp(CONFIG.inScale, 1, pIn);
        return (
          <div key={b.id} id={b.id} className="db-b" style={{
            opacity,
            transform: `translate(${x}px, ${y}px) rotate(${CONFIG.tilt[i]}deg) scale(${scale})`,
            transformOrigin: "50% 50%",
          }}>
            {b.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
