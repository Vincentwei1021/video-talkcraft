import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// number-counter · 数字滚动计数 —— 自包含 Remotion 源码（与 demos/number-counter/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 86 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数：a) tween 计数 + 落定弹一拍   b) odometer 逐位滚轮 ——
const CONFIG = {
  target: 3000000000,  // 模式 a 目标值
  countDur: 1.3,       // 计数时长 s：1~1.5 先快后慢；>2s 观众已经听完这句了
  landScale: 1.08,     // 落定瞬间的放大一拍
  odoTarget: "8219",   // 模式 b 目标值（字符串，保留位数）
  odoBase: 1.0,        // 最高位滚动时长 s
  odoStagger: 0.22,    // 每往低一位多滚的时长：高位先停低位后停
  odoDelay: 0.5,       // 模式 b 相对模式 a 的起始延迟 s
  spins: 2,            // 低位额外整圈数，营造"滚轮"感
  digitH: 64,          // 滚轮行高 px：必须与 .digit/.reel span 的高度一致
};

/* 时间表（demo 秒）
   0.30–1.60  模式 a 计数 0→target（power3.out）
   1.60–1.69  落定放大到 1.08（power2.out）
   1.69–1.87  回弹到 1（back.out(3)，会轻微下探）
   1.69–1.94  涨跌箭头淡入上移（power2.out）
   0.80–2.46  模式 b 逐位滚轮：第 i 位 t0=0.80，时长 1.0+i*0.22（power3.out） */

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

const fmt = (n: number) => "¥" + Math.floor(n).toLocaleString("en-US");

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

// —— 演示语境（不属于动效）：主持人在左，右侧数据区；白底 + 灰阶分栏线 ——
const CSS = `
.host-wrap { position: absolute; left: 0; top: 0; bottom: 0; width: 47%; overflow: hidden; }
.data-panel {
  position: absolute; left: 47%; right: 0; top: 0; bottom: 0;
  border-left: 1px solid #e0e0e0;
  display: flex; flex-direction: column; justify-content: center;
  padding: 0 24px; gap: 44px;
}
.metric .label { font-size: 17px; color: #8a8a8a; letter-spacing: 2px; margin-bottom: 10px; }
.big-num { display: flex; align-items: baseline; gap: 12px; white-space: nowrap;
           font-variant-numeric: tabular-nums; }
.big-num .value { font-size: 48px; font-weight: 800; color: #1d1d1f; letter-spacing: 1px;
                  transform-origin: 0% 80%; }
.big-num .delta { font-size: 24px; font-weight: 700; color: #d8383a; white-space: nowrap; }
.odometer { display: flex; align-items: center; font-variant-numeric: tabular-nums; }
.odometer .digit { width: 42px; height: 64px; overflow: hidden; position: relative;
                   background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;
                   margin-right: 6px; }
.odometer .reel { position: absolute; left: 0; right: 0; top: 0; display: flex; flex-direction: column; }
.odometer .reel span { height: 64px; line-height: 64px; text-align: center;
                       font-size: 44px; font-weight: 800; color: #1d1d1f; }
.odometer .comma { font-size: 44px; font-weight: 800; color: #1d1d1f;
                   margin-right: 6px; align-self: flex-end; line-height: 60px; }
.odometer .unit { font-size: 20px; color: #8a8a8a; margin-left: 10px; }
`;

export default function NumberCounter({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // 模式 a：0 → 目标，easeOut 先快后慢，千分位实时格式化
  const value = lerp(0, CONFIG.target, tw(t, 0.3, CONFIG.countDur, power3Out));
  // 落定瞬间：轻放大一拍 + 回弹（back.out 会轻微下探，属于动效本体）
  const scale = t < 1.69
    ? lerp(1, CONFIG.landScale, tw(t, 1.6, 0.09, power2Out))
    : lerp(CONFIG.landScale, 1, tw(t, 1.69, 0.18, backOut(3)));
  // 涨跌箭头淡入（落定奖励）
  const deltaP = tw(t, 1.69, 0.25, power2Out);

  // 模式 b：逐位滚轮，高位先停、低位后停
  const groups = Number(CONFIG.odoTarget).toLocaleString("en-US").split("");
  const digits = groups.filter((ch) => ch !== ",");
  const odoT0 = 0.3 + CONFIG.odoDelay;
  let digitIdx = -1;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <div className="data-panel">
        <div className="metric">
          <div className="label">2024 全年营销费用</div>
          <div className="big-num">
            <span className="value" style={{ transform: `scale(${scale})`, display: "inline-block" }}>
              {fmt(value)}
            </span>
            <span className="delta" style={{ opacity: deltaP, transform: `translateY(${lerp(6, 0, deltaP)}px)` }}>
              ↑ 45%
            </span>
          </div>
        </div>
        <div className="metric">
          <div className="label">平均每天烧掉（万元）</div>
          <div className="odometer">
            {groups.map((ch, gi) => {
              if (ch === ",") return <span key={gi} className="comma">,</span>;
              digitIdx++;
              const i = digitIdx;
              const n = Number(ch);
              // 低位多滚整圈（必须是整 10 的倍数，否则落错数字）
              const extraSpins = Math.round((CONFIG.spins * i) / Math.max(digits.length - 1, 1));
              const steps = extraSpins * 10 + n;
              const y = -steps * CONFIG.digitH *
                tw(t, odoT0, CONFIG.odoBase + i * CONFIG.odoStagger, power3Out);
              return (
                <div key={gi} className="digit">
                  <div className="reel" style={{ transform: `translateY(${y}px)` }}>
                    {Array.from({ length: (CONFIG.spins + 1) * 10 + 1 }, (_, k) => (
                      <span key={k}>{k % 10}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            <span className="unit">万 / 天</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
