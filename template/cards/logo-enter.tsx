import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// logo-enter · Logo 登场 —— 自包含 Remotion 源码（与 demos/logo-enter/index.html 同画面）
// 三拍收尾：① 圆牌 spring 等价弹入（唯一带过冲的一拍）② 字标从圆牌一侧推出，
// 两档字重错峰 0.233s ③ 描环合拢一圈收尾（dashoffset 全长→0），画完静置。
// 收尾必须克制：全片唯一不许抢戏的一拍，所以只有第①拍有过冲，②③都是纯缓出。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 90 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数 ——
const CONFIG = {
  lead: 0.35,          // 起手静置：等口播说到"我是…"
  badgeDur: 0.60,      // 圆牌弹入时长 s（源码 spring 落定 ≈18 帧 ÷30）
  badgeFrom: 0.5,      // 起始缩放（源码 interpolate(s,[0,1],[0.5,1])）
  badgeRise: 22,       // 起始下沉 px（源码 offset 22→0）
  badgeBack: 1.1,      // back.out(1.1) = spring(13/130/0.8) 的过冲等价物（约 +4%）
  stagger: 0.233,      // 拍距 s（源码 stagger 7 帧 ÷30）
  wordDur: 0.45,       // 字标推出时长
  wordShift: 20,       // 字标横向推出距离 px
  ringDur: 0.70,       // 描环合拢时长
  hold: 1.30,          // 收尾定格：落定的 lockup 就是终帧
};

/* 时间表（demo 秒）
   0.350–0.950  ① 圆牌弹入：opacity 0→1 · scale 0.5→1 · y 22→0（back.out(1.1)）
   0.583–1.033  ② 品牌名推出：opacity 0→1 · x −20→0（power3.out）
   0.816–1.266     副行推出（错峰一拍）
   0.583–1.283  ③ 描环合拢：dashoffset 全长→0（power2.inOut）
   1.283–2.583  收尾定格 */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const backOut = (s = 1.70158) => (x: number) => {
  const u = x - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

// —— 演示语境（不属于动效）：整幕只有品牌标——收尾/片头的落幕画面。
// ★ logo 是灰阶几何占位标（CSS/SVG 画）：应用时替换成自己的 logo。 ——
const CSS = `
.lockup {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 26px;
}
/* 圆牌：源码的 badge 规格（直径 118 + 5px 描环 + 深投影）换算到本库白底：
   深底上的白环靠亮度分层，白底上要改成浅灰环 + 轻投影，否则环消失、投影糊成脏斑 */
.badge {
  width: 118px; height: 118px;
  border-radius: 50%;
  border: 5px solid #ececef;
  background: #f5f5f7;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.10);
  display: flex; align-items: center; justify-content: center;
}
.badge svg { width: 52%; height: 52%; display: block; }   /* 源码 diameter × 0.52 */

/* 字标：两档字重（品牌名重 + 副行轻），全灰阶 */
.wordmark { overflow: hidden; }
.wordmark .brand {
  font-size: 46px; font-weight: 800; letter-spacing: 2px;
  color: #1d1d1f; line-height: 1.15; white-space: nowrap;
}
.wordmark .tag {
  font-size: 17px; font-weight: 500; letter-spacing: 6px;
  color: #8a8a8a; margin-top: 8px; white-space: nowrap;
}
/* 描环：叠在圆牌之上的一圈，用 dashoffset 描出来（收尾那一拍的"合拢"） */
.ring {
  position: absolute;
  left: 50%; top: 50%;
  width: 128px; height: 128px;
  transform: translate(-50%, -50%) rotate(-90deg);   /* 12 点起笔 */
  pointer-events: none;
}
.ring circle { fill: none; stroke: #1d1d1f; stroke-width: 2; }
.badge-wrap { position: relative; display: flex; }
`;

export default function LogoEnter({ hostSrc }: { hostSrc?: string }) {
  void hostSrc;   // 本卡无主持人占位
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;

  // ① 圆牌：三件事同一条曲线（等价于源码的同一个 spring 值驱动三个属性）
  const badgeP = tw(t, C.lead, C.badgeDur, backOut(C.badgeBack));
  const badgeOpacity = clamp01(badgeP);   // opacity 不许过冲超 1

  // ② 字标：从圆牌一侧推出，两档字重错峰一拍。纯缓出——不给字加过冲
  const brandP = tw(t, C.lead + C.stagger, C.wordDur, power3Out);
  const tagP = tw(t, C.lead + C.stagger * 2, C.wordDur, power3Out);

  // ③ 描环合拢：起笔快、收笔缓（合拢那一下要"停住"，不是匀速转完）
  // dash 长度取周长 + 3px：恰等于周长时首尾在起笔点留一道亚像素白缝
  //   （1080p 下一眼可见）。多给 3px 让末端压过起笔点，缝就没了
  const ringLen = 2 * Math.PI * 62 + 3;
  const ringOffset = lerp(ringLen, 0, tw(t, C.lead + C.stagger, C.ringDur, power2InOut));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="lockup">
        <div className="badge-wrap">
          <div className="badge" style={{
            opacity: badgeOpacity,
            transform: `translate(0px, ${lerp(C.badgeRise, 0, badgeP)}px)` +
                       ` scale(${lerp(C.badgeFrom, 1, badgeP)})`,
          }}>
            {/* 灰阶几何占位标（三角 + 方 + 圆的组合）：应用时整段替换成自己的 logo */}
            <svg viewBox="0 0 100 100">
              <path d="M50 8 L92 78 L8 78 Z" fill="#1d1d1f" />
              <circle cx="50" cy="62" r="17" fill="#f5f5f7" />
            </svg>
          </div>
          <svg className="ring" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="62"
              strokeDasharray={ringLen} strokeDashoffset={ringOffset} />
          </svg>
        </div>
        <div className="wordmark">
          <div className="brand" style={{
            opacity: brandP, transform: `translate(${lerp(-C.wordShift, 0, brandP)}px, 0px)`,
          }}>知远研究所</div>
          <div className="tag" style={{
            opacity: tagP, transform: `translate(${lerp(-C.wordShift, 0, tagP)}px, 0px)`,
          }}>每周一期 · 独立商业观察</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
