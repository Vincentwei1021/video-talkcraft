import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// impact-open-title · 冲击开场 —— 自包含 Remotion 源码（与 demos/impact-open-title/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 97 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
//   ① 整句一次砸出（scale 1.08→1 + opacity，0.2s power4.out）；
//      末词延后 3 帧单独换色（黑→橙）并再 punch 一次（scale 1.15→1，5 帧）
//   ② 四角 L 角框**与①同帧**从外向内收 12px + 淡入（0.3s power2.out）
//   ③ 点阵网格在②之后错峰淡入 0.4s，opacity 只到 0.5
//   ④ 副题最后淡入上浮 8px
//   命门：砸只有一次。角框和点阵是**衬**，必须比标题更慢更淡；抢了就散。
const CONFIG = {
  lead: 0.40,          // 起手静置：等口播开口
  slamDur: 0.20,      // 整句砸出时长 s（power4.out —— 唯一一次"猛"）
  slamScale: 1.08,    // 整句起始倍数
  wordDelay: 0.10,    // 末词延后 3 帧（@30fps）才换色 + punch
  wordPunch: 0.167,   // 末词 punch 时长 s（5 帧）
  wordScale: 1.15,    // 末词 punch 起始倍数
  accent: "#e8720c",  // 末词落地色 = 全卡唯一强调色
  cornerDur: 0.30,    // 角框收入时长 s（比标题慢 ⇒ 它是衬）
  cornerIn: 12,       // 角框从外侧多少 px 收进来
  dotsGap: 0.10,      // 角框落定 → 点阵起淡的错峰 s
  dotsDur: 0.40,      // 点阵淡入时长 s（全卡最慢的一条 ⇒ 最轻）
  dotsOpacity: 0.50,  // 点阵最终不透明度上限（>0.6 就抢标题）
  subDur: 0.28,       // 副题淡入时长 s
  subRise: 8,         // 副题上浮 px
  hold: 1.60,         // 收尾定格：完整的开场版式就是落点
};

/* 时间表（demo 秒）
   0.40–0.60  ① 整句砸出（power4.out）
   0.40–0.70  ② 四角 L 角框收入（power2.out）
   0.70–0.867 ①续 末词换色 + punch（power3.out）
   0.80–1.20  ③ 点阵淡入到 0.5（power1.out）
   0.96–1.24  ④ 副题淡入上浮（power2.out）
   1.24–2.84  收尾定格 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power4Out = (x: number) => 1 - Math.pow(1 - x, 5);
/** GSAP 色彩插值：RGB 逐通道线性 */
const mixColor = (a: [number, number, number], b: [number, number, number], p: number) =>
  `rgb(${Math.round(lerp(a[0], b[0], p))},${Math.round(lerp(a[1], b[1], p))},${Math.round(lerp(a[2], b[2], p))})`;
const INK: [number, number, number] = [0x1d, 0x1d, 0x1f];
const ORANGE: [number, number, number] = [0xe8, 0x72, 0x0c];

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

// —— 演示语境（不属于动效）：主持人占右侧一列口播，开场标题落在左侧白区 ——
const CSS = `
.host-wrap { position: absolute; right: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.io-line {
  position: absolute;
  left: 78px; top: 214px;
  font-size: 72px;
  font-weight: 700;
  line-height: 1.08;
  color: #1d1d1f;
  white-space: nowrap;
  transform-origin: 0% 50%;
}
.io-last {
  display: inline-block;
  transform-origin: 0% 50%;
}
.io-sub {
  position: absolute;
  left: 80px; top: 320px;
  font-size: 25px;
  font-weight: 400;
  line-height: 1.4;
  color: #8a8a8a;
  white-space: nowrap;
}
.io-c {
  position: absolute;
  width: 46px; height: 46px;
  border: 4px solid #e8720c;      /* 本卡唯一强调色（参考图橙系） */
  z-index: 5;                     /* 取景框压在人物之上——它框的是整个画面，不是画面里的一层 */
}
.io-c.tl { left: 30px;  top: 30px;    border-right: 0; border-bottom: 0; }
.io-c.tr { right: 30px; top: 30px;    border-left: 0;  border-bottom: 0; }
.io-c.bl { left: 30px;  bottom: 30px; border-right: 0; border-top: 0; }
.io-c.br { right: 30px; bottom: 30px; border-left: 0;  border-top: 0; }
.io-dots {
  position: absolute;
  left: 394px; top: 84px;
  width: 116px; height: 92px;    /* 5×4 个 24px 网格 */
  background-image: radial-gradient(circle, #e8720c 3px, transparent 3.5px);
  background-size: 24px 24px;
  background-position: 4px 4px;
}
`;

export default function ImpactOpenTitle({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ① 整句砸出
  const slamP = tw(t, CONFIG.lead, CONFIG.slamDur, power4Out);
  const lineScale = lerp(CONFIG.slamScale, 1, slamP);

  // ① 续：末词延后 3 帧换色 + 再 punch 一次（punchAt 前 scale=1、墨色）
  const wordAt = CONFIG.lead + CONFIG.slamDur + CONFIG.wordDelay;
  const wordP = tw(t, wordAt, CONFIG.wordPunch, power3Out);
  const wordScale = t < wordAt ? 1 : lerp(CONFIG.wordScale, 1, wordP);
  const wordColor = t < wordAt ? "#1d1d1f" : mixColor(INK, ORANGE, wordP);

  // ② 四角 L 角框：与①同帧起，但走得更慢（衬）
  const cornerP = tw(t, CONFIG.lead, CONFIG.cornerDur, power2Out);
  const cornerOff = lerp(CONFIG.cornerIn, 0, cornerP);

  // ③ 点阵网格：角框落定后错峰淡入，只到 0.5
  const dotsAt = CONFIG.lead + CONFIG.cornerDur + CONFIG.dotsGap;
  const dotsOpacity = CONFIG.dotsOpacity * tw(t, dotsAt, CONFIG.dotsDur, power1Out);

  // ④ 副题最后淡入上浮
  const subP = tw(t, dotsAt + 0.16, CONFIG.subDur, power2Out);

  // 四角各自的"外侧方向"：对角单位向量 × cornerIn
  const corners: [string, number, number][] = [
    ["tl", -1, -1], ["tr", 1, -1], ["bl", -1, 1], ["br", 1, 1],
  ];

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>

      <div className="io-dots" style={{ opacity: dotsOpacity }} />
      {corners.map(([cls, dx, dy]) => (
        <div key={cls} className={`io-c ${cls}`} style={{
          opacity: cornerP,
          transform: `translate(${dx * cornerOff}px, ${dy * cornerOff}px)`,
        }} />
      ))}

      <div className="io-line" style={{ opacity: slamP, transform: `scale(${lineScale})` }}>
        三秒抓住
        <span className="io-last" style={{ color: wordColor, transform: `scale(${wordScale})` }}>
          重点
        </span>
      </div>
      <div className="io-sub" style={{
        opacity: subP, transform: `translateY(${lerp(CONFIG.subRise, 0, subP)}px)`,
      }}>接下来这三分钟，只讲清楚一件事</div>
    </AbsoluteFill>
  );
}
