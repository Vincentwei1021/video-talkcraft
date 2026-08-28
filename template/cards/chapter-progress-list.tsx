import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// chapter-progress-list · 章节进度 —— 自包含 Remotion 源码（与 demos/chapter-progress-list/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
// 例外底色：本卡是全库唯一允许深底的列表卡——「章节转场」的语义就是幕间暗场。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 111 };

const FPS = meta.fps;

// —— 动效本体参数（照抄 demo 的 CONFIG）：四行错峰滑入 → 单行升级为"当前章节" → 角框收进来封场 ——
const CONFIG = {
  lead: 0.35,        // 起手静置 s：等口播念到"接下来这一节"
  rowIn: 0.24,       // 单行滑入耗时 s
  rowStagger: 0.10,  // 行错峰 s：>0.2 读作四个独立动效，<0.05 读作整块淡入
  rowShift: 24,      // 行从右侧进入的位移 px
  hlDelay: 0.06,     // 全部到位 → 高亮之间的呼吸 s（必须留，否则读作"最后一行特殊"）
  hlDur: 0.20,       // 高亮耗时 s：换色 + 圆点弹出 + 该行再前进
  hlAdvance: 6,      // 当前行额外前进 px（列表里"站出来一步"）
  cornerInset: 10,   // 角框向内收的距离 px
  cornerDur: 0.30,   // 角框入场耗时 s
  accent: "#e0452c", // 唯一强调色
  dim: "#a1a1a6",    // 未激活行的 dim 实色（深底模式 ink-muted）
  hold: 2.0,         // 收尾停留 s：章节表要让人读完四条
};

const ROWS = [
  { no: "01", name: "先说结论", current: false },
  { no: "02", name: "钱是怎么被拿走的", current: true },
  { no: "03", name: "三个最常见的坑", current: false },
  { no: "04", name: "你今天能做什么", current: false },
];

/* 时间表（demo 秒）
   0.35–0.57   CHAPTER 头淡入（power2.out）
   0.41+0.10i  第 i 行滑入 opacity/x 24→0，0.24s（power3.out）
   1.01–1.21   当前行高亮：换强调色（power2.out）+ 前进 6px（power3.out）+ 圆点弹出（back.out(2)）
   1.01–1.31   四角角框向内收 + 淡入（power2.out）
   1.31–3.31   收尾 hold 2.0s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};
// 颜色线性插值（GSAP 的 rgb 逐通道插值）：dim #a1a1a6 → accent #e0452c
const lerpColor = (a: [number, number, number], b: [number, number, number], p: number) =>
  `rgb(${Math.round(lerp(a[0], b[0], p))}, ${Math.round(lerp(a[1], b[1], p))}, ${Math.round(lerp(a[2], b[2], p))})`;
const DIM: [number, number, number] = [161, 161, 166];
const ACCENT: [number, number, number] = [224, 69, 44];

// 主持人占位：深底上把占位底改透明，让 alpha 数字人直接落在暗场里
const Host: React.FC<{ src?: string }> = ({ src }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex",
                alignItems: "flex-end", justifyContent: "center", background: "transparent" }}>
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

// 演示语境（不属于动效）：左侧人物列 + 右侧章节列表 + 四角电影角框
const CSS = `
.host-col { position: absolute; left: 36px; bottom: 0; width: 448px; height: 100%; }
/* —— 动效本体 —— 四角电影角框（深底模式的取景框，2px 实色，不发光） */
.cine-corner { position: absolute; width: 42px; height: 42px; border: 2px solid #d2d2d7; }
.cine-corner.tl { left: 26px;  top: 26px;    border-right: 0; border-bottom: 0; }
.cine-corner.tr { right: 26px; top: 26px;    border-left: 0;  border-bottom: 0; }
.cine-corner.bl { left: 26px;  bottom: 26px; border-right: 0; border-top: 0; }
.cine-corner.br { right: 26px; bottom: 26px; border-left: 0;  border-top: 0; }
/* —— 动效本体 —— 右侧章节列表 */
.ch-list {
  position: absolute; right: 74px; top: 50%;
  transform: translateY(-50%); width: 400px;
}
.ch-head {
  font-size: 13px; letter-spacing: 5px;
  color: #a1a1a6;            /* dim 实色，不叠 opacity */
  margin-bottom: 26px;
}
.ch-row { display: flex; align-items: baseline; gap: 14px; padding: 11px 0; }
.ch-mark { position: relative; width: 16px; flex: 0 0 16px; align-self: center; }
.ch-dot {
  position: absolute; left: 0; top: 50%;
  width: 10px; height: 10px; margin-top: -5px;
  border-radius: 50%;
  background: #e0452c;       /* 唯一强调色（取参考图①暖色系） */
}
.ch-no {
  font-size: 15px; font-weight: 600; letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
}
.ch-name {
  font-size: 23px; font-weight: 600; line-height: 1.3;
  white-space: nowrap;
}
`;

export default function ChapterProgressList({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // ① 章节表从右侧错峰滑入（未激活行一律 dim 实色，opacity 只出现在入场这一段）
  const headP = tw(t, CONFIG.lead, 0.22, power2Out);
  const rowsAt = CONFIG.lead + 0.06;

  // ② 全部到位后才高亮，且只高亮一条
  const hlAt = rowsAt + CONFIG.rowStagger * (ROWS.length - 1) + CONFIG.rowIn + CONFIG.hlDelay;
  const colorP = tw(t, hlAt, CONFIG.hlDur, power2Out);   // 换色
  const advP = tw(t, hlAt, CONFIG.hlDur, power3Out);     // 前进 6px
  const dotP = tw(t, hlAt, CONFIG.hlDur, backOut(2));    // 圆点弹出
  // ③ 同帧四角角框向内收 + 淡入——"衬"，比高亮慢（0.3s vs 0.2s）不抢戏
  const cornerP = tw(t, hlAt, CONFIG.cornerDur, power2Out);

  const hlColor = lerpColor(DIM, ACCENT, colorP);

  const cornerStyle = (isLeft: boolean, isTop: boolean): React.CSSProperties => ({
    opacity: cornerP,
    transform: `translate(${lerp(isLeft ? -CONFIG.cornerInset : CONFIG.cornerInset, 0, cornerP)}px, ${lerp(isTop ? -CONFIG.cornerInset : CONFIG.cornerInset, 0, cornerP)}px)`,
  });

  return (
    <AbsoluteFill style={{
      background: "#1d1d1f", color: "#f5f5f7", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-col"><Host src={hostSrc} /></div>

      <div className="cine-corner tl" style={cornerStyle(true, true)} />
      <div className="cine-corner tr" style={cornerStyle(false, true)} />
      <div className="cine-corner bl" style={cornerStyle(true, false)} />
      <div className="cine-corner br" style={cornerStyle(false, false)} />

      <div className="ch-list">
        <div className="ch-head" style={{ opacity: headP }}>CHAPTER</div>
        {ROWS.map((r, i) => {
          const inP = tw(t, rowsAt + i * CONFIG.rowStagger, CONFIG.rowIn, power3Out);
          // 入场 x 24→0；当前行随后再前进 0→6（两条 tween 顺序接力，不叠加）
          const x = r.current && t >= hlAt
            ? lerp(0, CONFIG.hlAdvance, advP)
            : lerp(CONFIG.rowShift, 0, inP);
          const color = r.current ? hlColor : CONFIG.dim;
          return (
            <div key={i} className="ch-row" style={{
              opacity: inP, transform: `translateX(${x}px)`,
            }}>
              <span className="ch-mark">
                {r.current && <span className="ch-dot" style={{ transform: `scale(${dotP})` }} />}
              </span>
              <span className="ch-no" style={{ color }}>{r.no}</span>
              <span className="ch-name" style={{ color }}>{r.name}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
