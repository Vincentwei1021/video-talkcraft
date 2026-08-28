import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// count-badge-title · 数字重音标题 —— 自包含 Remotion 源码（与 demos/count-badge-title/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 112 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
// 命门：三段严格分先后。数字必须**先到且单独到**——它是这句话的主语；
// 三段同时淡入就没有"3 个"这个重音，读作一个普通两行标题。
const CONFIG = {
  accent: "#7A5AF8",  // 唯一强调色（参考图②同色系紫）；只上在数字上
  ink: "#1d1d1f",     // 数字入场时的墨色——换色发生在落定那一刻，不在飞行途中
  startDelay: 0.40,   // 起手静置：等口播念出"三"这个音
  numScale: 1.6,      // 数字入场起始缩放：1.4~1.8；>2 读作"糊到镜头上"，<1.25 看不出重音
  numIn: 0.30,        // 数字入场耗时 s（power3.out）
  hueDur: 0.14,       // 落定换色耗时 s：短，读作"到位了才亮"
  restLag: 0.02,      // "个方法"相对数字落定的滞后 s：接近 0 才读作被数字带出来
  restIn: 0.22,       // "个方法"揭示耗时 s（clip 从左 + x 追赶）
  restX: -8,          // "个方法"起始横向偏移 px（负 = 从数字那侧被拖出来）
  l2Lag: 0.10,        // 第二行相对"个方法"的错峰 s：本卡第二命门，>0.25 读作两个动效
  l2In: 0.28,         // 第二行淡入上浮耗时 s
  l2Rise: 6,          // 第二行上浮 px
  punchGap: 0.35,     // 第二行落定到数字补拍的间隔 s（对齐口播重音）
  punchScale: 1.06,   // 补拍幅度：1.04~1.08；再大就成第二次入场
  hold: 1.70,         // 收尾定格 s：两行读完
};

/* 时间表（demo 秒）
   0.40–0.70  ① 数字单独入场 1.6→1 + opacity（power3.out）
   0.63–0.77  ② 落定换色 墨→紫（power1.out，跨"到位"帧）
   0.72–0.94  ③ "个方法" clip 从左揭示 + x -8→0（power3.out）
   0.82–1.10  ④ 第二行淡入上浮（power3.out）
   1.45–1.49  ⑤ 数字补拍 1→1.06（power2.out）
   1.49–1.62  ⑤续 回落 1.06→1（power3.out）
   1.62–3.32  收尾定格 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
/** GSAP 色彩插值：RGB 逐通道线性 */
const mixColor = (a: [number, number, number], b: [number, number, number], p: number) =>
  `rgb(${Math.round(lerp(a[0], b[0], p))},${Math.round(lerp(a[1], b[1], p))},${Math.round(lerp(a[2], b[2], p))})`;
const INK: [number, number, number] = [0x1d, 0x1d, 0x1f];
const ACCENT: [number, number, number] = [0x7a, 0x5a, 0xf8];

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

// —— 演示语境（不属于动效）：主持人占右侧一列，标题落在左侧白区 ——
const CSS = `
.cb-host { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.cb-text {
  position: absolute;
  left: 84px;
  top: 150px;
  color: #1d1d1f;
}
.cb-l1 {
  display: flex;
  align-items: baseline;              /* 数字与"个方法"共基线——数字再大也不许把行推歪 */
  white-space: nowrap;
}
.cb-num {
  font-size: 138px;
  font-weight: 700;                   /* 700 = 砸字档，全片只给这一个重音 */
  line-height: 0.92;
  font-variant-numeric: tabular-nums; /* 数字不跳宽 */
  letter-spacing: -0.02em;
  transform-origin: 50% 72%;          /* 重心偏下：缩到位时数字不往上飘 */
  display: inline-block;
}
.cb-rest {
  font-size: 62px;                    /* 与第二行同一字阶——一屏只留两级（数字 / 其余） */
  font-weight: 600;
  line-height: 1.1;
  margin-left: 14px;                  /* 数字右缘到"个方法"的间距——推出的起点 */
  display: inline-block;
  white-space: nowrap;
}
.cb-l2 {
  font-size: 62px;
  font-weight: 600;
  line-height: 1.2;
  margin-top: 10px;
  white-space: nowrap;
}
`;

export default function CountBadgeTitle({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  const tLand = CONFIG.startDelay + CONFIG.numIn;
  const tRest = tLand + CONFIG.restLag;
  const tL2 = tRest + CONFIG.l2Lag;
  const tPunch = tL2 + CONFIG.l2In + CONFIG.punchGap;
  const tPunchBack = tPunch + 0.04;   // 补拍顶点 → 回落起点

  // ① 数字单独入场：从 1.6 倍缩到位（只有 scale + opacity，不带位移）
  const numInP = tw(t, CONFIG.startDelay, CONFIG.numIn, power3Out);
  // ⑤ 收尾数字补一拍（5 帧 punch）
  let numScale: number;
  if (t < tPunch) numScale = lerp(CONFIG.numScale, 1, numInP);
  else if (t < tPunchBack) numScale = lerp(1, CONFIG.punchScale, tw(t, tPunch, 0.04, power2Out));
  else numScale = lerp(CONFIG.punchScale, 1, tw(t, tPunchBack, 0.13, power3Out));
  // ② 落定那一刻换强调色（提前 hueDur 的一半起，"到位"与"变色"读作同一帧）
  const hueP = tw(t, tLand - CONFIG.hueDur * 0.5, CONFIG.hueDur, power1Out);
  const numColor = mixColor(INK, ACCENT, hueP);

  // ③ "个方法"从数字右缘被推出：clip 从左揭示 + x 追赶（两条同曲线同时长 = 一件事）
  const restP = tw(t, tRest, CONFIG.restIn, power3Out);
  const restClip = lerp(100, 0, restP);
  const restX = lerp(CONFIG.restX, 0, restP);

  // ④ 第二行错峰跟上（普通淡入上浮）
  const l2P = tw(t, tL2, CONFIG.l2In, power3Out);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="cb-host"><Host src={hostSrc} /></div>

      <div className="cb-text">
        <div className="cb-l1">
          <span className="cb-num" style={{
            opacity: numInP, color: numColor, transform: `scale(${numScale})`,
          }}>3</span>
          <span className="cb-rest" style={{
            clipPath: `inset(0 ${restClip}% 0 0)`, transform: `translateX(${restX}px)`,
          }}>个方法</span>
        </div>
        <div className="cb-l2" style={{
          opacity: l2P, transform: `translateY(${lerp(CONFIG.l2Rise, 0, l2P)}px)`,
        }}>解决问题</div>
      </div>
    </AbsoluteFill>
  );
}
