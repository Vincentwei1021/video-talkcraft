import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// type-contrast-emphasis · 字体对比重音 —— 自包含 Remotion 源码（与 demos/type-contrast-emphasis/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 67 };

const FPS = meta.fps;

// —— 可摘走的核心动画参数（照抄 demo CONFIG）——
// 一句字幕逐词追加：普通词 0.1s 轻 pop（scale 0.95→1，无回弹）；
// 重音词换字体气质（衬线斜体放大 / 换强调色放大）+ 从基线下方上滑回落 0.15s。
// 强调量级全部来自"字体对比"，运动本身刻意做轻——不弹跳、不过冲。
const CONFIG = {
  startDelay: 0.15,      // 开场留一拍等语音起
  wordIn: 0.10,          // 普通词轻 pop 时长 s：>0.2s 跟不上语速
  wordFromScale: 0.95,   // 普通词起始倍数：只做"落笔"的一下，不做弹跳
  accentIn: 0.15,        // 重音词入场时长 s：字大所以给多 50ms，仍要轻
  accentFromScale: 0.92, // 重音词起始倍数（配合上滑，读作"顶上来"）
  accentRise: 14,        // 重音词从基线下方多少 px 上滑回落（约字号的 30%）
  obliqueDeg: -7,        // 衬线词倾斜角：中文无真斜体，显式 skewX 6~10° 才各端一致
  mode: "append",        // "append" 追加式（已说的词保留）/ "relay" 接力式（前词硬切消失）
  // 分词 + 词级语音时刻（相对第一词，秒）——必须抄真实语速，匀速一眼假
  // emph: "serif" = 字形通道 / "color" = 色彩通道 / 不填 = 普通词
  words: [
    { w: "能留住人的", beat: 0.00 },
    { w: "不是",       beat: 0.72 },
    { w: "流量",       beat: 1.02, emph: "serif" },
    { w: "是",         beat: 1.36 },
    { w: "信任",       beat: 1.52, emph: "color" },
  ] as { w: string; beat: number; emph?: "serif" | "color" }[],
};

/* 时间表（demo 秒）：词 i at = 0.15 + beat；普通词 0.10s pop（power2.out）；
   重音词 0.15s 上滑回落（power3.out）；末词止于 1.82s */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);

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

// —— 演示语境（不属于动效）：主持人占左侧一列，右侧纯白区排一句逐词追加的主字幕 ——
const CSS = `
.host-wrap {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 47%;
  overflow: hidden;
}
.tc-captions {
  position: absolute;
  left: 48%;
  right: 3%;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  /* 尺寸基准：普通词字号 + 重音词放大倍数，换尺寸只改这两个数 */
  --tc-base: 32px;
  --tc-serif-scale: 1.6;   /* 通道① 字形：衬线斜体放大 1.5~2 倍 */
  --tc-color-scale: 1.5;   /* 通道② 色彩：换强调色，放大量级可略收 */
}
/* 命门：所有词共一条基线（align-items: baseline），大字从基线往上长，基线一动就散 */
.tc-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: flex-start;
  gap: 10px 12px;
}
.tc-word {
  display: inline-block;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: var(--tc-base);
  font-weight: 600;                /* 中字：给重音词留出字重落差 */
  line-height: 1.3;
  color: #1d1d1f;
  transform-origin: 50% 100%;      /* 缩放锚在基线：轻 pop 不推基线 */
}
.tc-word.emph-serif {
  font-family: "Songti SC", "STSong", "Source Han Serif SC", "Noto Serif CJK SC",
               Georgia, "Playfair Display", serif;
  font-size: calc(var(--tc-base) * var(--tc-serif-scale));
  font-weight: 600;
  margin-right: 4px;               /* 倾斜后右上角外探，多留一点位防压相邻字 */
}
.tc-word.emph-color {
  font-size: calc(var(--tc-base) * var(--tc-color-scale));
  font-weight: 800;
  color: #0066cc;
}
`;

export default function TypeContrastEmphasis({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="host-wrap"><Host src={hostSrc} /></div>
      <div className="tc-captions">
        <div className="tc-line">
          {CONFIG.words.map((item, i) => {
            const at = CONFIG.startDelay + item.beat;   // 该词的语音时刻
            let style: React.CSSProperties;
            if (!item.emph) {
              // 普通词：极轻的 pop，无回弹——它的本分是把句子铺出来，不抢重音
              const p = tw(t, at, CONFIG.wordIn, power2Out);
              style = {
                opacity: p,
                transform: `scale(${lerp(CONFIG.wordFromScale, 1, p)})`,
              };
            } else {
              // 重音词：气质已由 CSS 换掉（衬线斜体放大 / 强调色放大），
              // 运动只做"从基线下方上滑回落 + 轻放大淡入"，power3.out 收得干净
              const skew = item.emph === "serif" ? CONFIG.obliqueDeg : 0;
              const p = tw(t, at, CONFIG.accentIn, power3Out);
              style = {
                opacity: p,
                transform: `translateY(${lerp(CONFIG.accentRise, 0, p)}px)` +
                           ` scale(${lerp(CONFIG.accentFromScale, 1, p)}) skewX(${skew}deg)`,
              };
            }
            return (
              <span key={i} className={"tc-word" + (item.emph ? " emph-" + item.emph : "")}
                    style={style}>{item.w}</span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
