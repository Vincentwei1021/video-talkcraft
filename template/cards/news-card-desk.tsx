import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// news-card-desk · 新闻卡片划重点 —— 自包含 Remotion 源码（与 demos/news-card-desk/index.html 同画面）
// 本卡无主持人占位；复制本文件进你的工程即可用。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 321 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数 ——
const CONFIG = {
  slideIn: 0.4,       // 卡片上桌耗时 s（power3.out）
  slideY: 60,         // 上桌起始下沉 px
  tiltA: -1.5,        // 第一张卡的"摆上桌"歪度 °（直挺挺立在正中一眼假）
  tiltB: 2,           // 第二张卡歪向另一边
  redlineAt: 1.0,     // 红线开扫时刻 s（对齐朗读到关键词）
  redline: 0.3,       // 红线扫过耗时 s
  cardBAt: 1.9,       // 第二张卡入场时刻 s
  cardBFrom: 320,     // 第二张卡从右侧进场的 x 位移 px
  kenburns: 1.04,     // 全程极缓 Ken Burns 终点倍数
  kbDur: 8,           // Ken Burns 时长 s（快了像镜头晃）
};

/* 时间表（demo 秒）
   0.10–0.50  卡 A 从下方滑入摆上桌（power3.out）
   0.50–8.50  卡 A 内容极缓 Ken Burns 1→1.04（linear）
   1.00–1.30  红线在关键词下扫出（power2.out）
   1.90–2.30  卡 B 从右侧滑入压在前卡之上（power3.out）
   2.30–10.30 卡 B 内容 Ken Burns（linear）→ 总 10.30s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);

// —— 演示语境（不属于动效）：白底桌面上的灰阶假新闻卡 ——
//    白边 + 投影保留：它们是"素材被摆上桌"这层动效语义的一部分（卡片必须离开背景一层）
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */
.news-card {
  position: absolute;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, .14);
  color: #1d1d1f;
  overflow: hidden;
}
.card-a { left: 150px; top: 105px; width: 520px; padding: 24px 30px 26px; }
.card-b { left: 520px; top: 235px; width: 330px; padding: 18px 22px 20px; }

.news-card .masthead {
  display: flex; justify-content: space-between; align-items: baseline;
  border-bottom: 2px solid #1d1d1f;
  padding-bottom: 8px; margin-bottom: 14px;
}
.news-card .paper { font-size: 20px; font-weight: 800; letter-spacing: 2px; }
.news-card .date { font-size: 11px; color: #8a8a8a; }
.news-card h2 { font-size: 26px; line-height: 1.4; margin-bottom: 14px; font-weight: bold; margin-top: 0; }
.card-b h2 { font-size: 18px; margin-bottom: 10px; }
.news-card .kw { position: relative; display: inline-block; }
/* —— 动效本体 —— 划重点的下划线：语义色（"划"这个动作的唯一强调色） */
.news-card .kw .redline {
  position: absolute; left: -2px; right: -2px; bottom: 1px;
  height: 5px; background: #d8383a; border-radius: 3px;
  transform-origin: left center;
}
.news-card .gray-line {            /* 正文灰条（假排版占位） */
  height: 10px; border-radius: 5px; background: #ececef; margin-bottom: 9px;
}
.news-card .gray-line.short { width: 62%; }
.kb-inner { transform-origin: 50% 40%; }   /* Ken Burns 作用层 */
`;

export default function NewsCardDesk(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // 第一张卡：从下方滑入摆上桌（opacity/y 同一条 power3.out）
  const pA = tw(t, 0.1, CONFIG.slideIn, power3Out);
  // 落位即开始极缓 Ken Burns，卡片"活着"但不晃
  const kbA = lerp(1, CONFIG.kenburns, tw(t, 0.1 + CONFIG.slideIn, CONFIG.kbDur, linear));
  // 红线在标题关键词下扫出——与口播"重点是"同步
  const redline = tw(t, CONFIG.redlineAt, CONFIG.redline, power2Out);
  // 第二张卡：从右侧滑入，压在前卡之上（堆叠感）
  const pB = tw(t, CONFIG.cardBAt, CONFIG.slideIn, power3Out);
  const kbB = lerp(1, CONFIG.kenburns, tw(t, CONFIG.cardBAt + CONFIG.slideIn, CONFIG.kbDur, linear));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="news-card card-a" style={{
        opacity: pA,
        transform: `translateY(${lerp(CONFIG.slideY, 0, pA)}px) rotate(${CONFIG.tiltA}deg)`,
      }}>
        <div className="kb-inner" style={{ transform: `scale(${kbA})` }}>
          <div className="masthead"><span className="paper">财经日报</span><span className="date">2026-08-17 · A1 版</span></div>
          <h2>央行宣布降准 0.5 个百分点，<br />释放长期资金<span className="kw">约 1 万亿元<span className="redline" style={{ transform: `scaleX(${redline})` }}></span></span></h2>
          <div className="gray-line"></div>
          <div className="gray-line"></div>
          <div className="gray-line short"></div>
        </div>
      </div>
      <div className="news-card card-b" style={{
        opacity: pB,
        transform: `translate(${lerp(CONFIG.cardBFrom, 0, pB)}px, ${lerp(20, 0, pB)}px) rotate(${CONFIG.tiltB}deg)`,
      }}>
        <div className="kb-inner" style={{ transform: `scale(${kbB})` }}>
          <div className="masthead"><span className="paper" style={{ fontSize: 15 }}>市场快讯</span><span className="date">10:42</span></div>
          <h2>股债汇三市齐动，机构：宽松周期确认</h2>
          <div className="gray-line"></div>
          <div className="gray-line short"></div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
