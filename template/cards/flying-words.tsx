import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// flying-words · 关键词隧道 —— 自包含 Remotion 源码（与 demos/flying-words/index.html 同画面）
// 背景层：22 个名词按黄金角铺在扁椭圆截面上，沿 z 轴从远处飞向相机并擦身而过，生命曲线前 1/4 猛亮、中段半透、末段拖尾；
// 越近越往画外散、冲到眼前时加运动模糊；跑满 2 整圈首尾无缝。深底专用（白底整套失效）。
// 复制本文件进你的工程即可用；词表经 props 注入（words），不传 = demo 词表。前景（人物 / 标题）由你的场景另叠一层。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 192 };   // 6.0s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 终点必须过 0（不过 0 只有"飞到脸前停住"，没有"擦身"）；② 生命曲线中段 0.5 是给前景让位的；
//      ③ CYCLES 必须整数，t=0 与 t=1 画面一致才能无缝 loop；④ 深底专用，白底整套失效。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  zFrom: -1750,     // 起点深度 px（更远词太小认不出）
  zTo: 800,         // 终点深度 px：正值 = 穿过相机平面（不过 0 没有"擦身"）
  cycles: 2,        // 整圈数（必须整数：非整数 t=1 与 t=0 不接，loop 一跳；圈数越多单词过镜越快）
  dur: 6.0,         // 一段时长 s（成片 = 镜头时长）
  perspective: 1100,// 透视距离 px
  rBase: 82, rVar: 165,   // 铺位半径 82~247 px（黄金角 + 随机半径，避开正中）
  yFlat: 0.6,       // 截面扁椭圆：y 半径 ×0.6
  drift0: 0.5, drift1: 1.35,   // 向外散开系数 = drift0 + u·drift1（远处收拢、越近越往画外甩）
  OP: [0, 1, 0.5, 0.2, 0], OT: [0, 0.25, 0.6, 0.85, 1],   // 生命曲线：前 1/4 猛亮、中段半透、末段拖尾
  blurAt: 0.86, blurK: 26,     // 近端糊化：u>0.86 起 blur (u−0.86)·26 px
  fontMin: 20, fontVar: 16,    // 字号 20~36（随机字号是层次感来源，全同号读作贴图）
  fadeIn: 0.6, fadeOut: 0.5,   // 整层起落 s
};

/* 时间表（demo 秒）
   0.00–0.60  整层淡入
   0.00–6.00  词沿 z 轴匀速推进两整圈（每词相位 i/N 均分；位置 / 透明度 / 模糊全由 t 算）
   5.50–6.00  整层淡出（power2.in） */

// —— 缓动与工具（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2In = (x: number) => x * x * x;
// 确定性随机（与 demo 同公式，保证双侧逐帧一致；不用 Math.random）
const srand = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const life = (u: number) => { for (let k = 1; k < CONFIG.OT.length; k++) if (u <= CONFIG.OT[k]) return lerp(CONFIG.OP[k - 1], CONFIG.OP[k], (u - CONFIG.OT[k - 1]) / (CONFIG.OT[k] - CONFIG.OT[k - 1])); return 0; };

// —— 演示语境（不属于动效）：样式照搬 demo（类名 fwd- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.fwd-scene { position: absolute; inset: 0; perspective: 1100px; perspective-origin: 50% 50%; overflow: hidden; }
.fwd-glow { position: absolute; left: 50%; top: 50%; width: 220px; height: 220px; margin: -110px 0 0 -110px; border-radius: 50%; background: radial-gradient(circle, rgba(120,150,255,.28), rgba(120,150,255,0) 70%); filter: blur(6px); }
.fwd-w { position: absolute; left: 50%; top: 50%; transform-style: preserve-3d; font-weight: 800; white-space: nowrap; color: #cfd8ff; will-change: transform, opacity, filter; }
`;

type Props = {
  /** 词表（12~30 个；<12 画面稀，>30 近处糊成一片） */
  words?: string[];
};

const DEFAULT_WORDS = ["大模型", "token", "提示词", "上下文", "RAG", "微调", "推理", "涌现", "对齐", "幻觉", "Agent", "多模态", "嵌入", "向量库", "思维链", "蒸馏", "MoE", "量化", "注意力", "预训练", "强化学习", "评测"];

export default function FlyingWords({ words = DEFAULT_WORDS }: Props) {
  const t = useCurrentFrame() / FPS;
  const N = Math.max(1, words.length);
  const layerK = tw(t, 0, CONFIG.fadeIn, power1Out) * (1 - tw(t, CONFIG.dur - CONFIG.fadeOut, CONFIG.fadeOut, power2In));

  return (
    <AbsoluteFill style={{ background: "#1d1d1f", color: "#f5f5f7", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="fwd-scene" style={{ opacity: layerK, perspective: CONFIG.perspective }}>
        <div className="fwd-glow" />
        {words.map((w, i) => {
          const u = ((Math.min(t, CONFIG.dur) / CONFIG.dur) * CONFIG.cycles + i / N) % 1;   // 相位 i/N 均分
          const a = i * 2.39996 + srand(i * 7 + 1) * 0.8, r = CONFIG.rBase + srand(i * 11) * CONFIG.rVar, drift = CONFIG.drift0 + u * CONFIG.drift1;
          const x = Math.cos(a) * r * drift, y = Math.sin(a) * r * CONFIG.yFlat * drift, z = lerp(CONFIG.zFrom, CONFIG.zTo, u);
          return (
            <div key={i} className="fwd-w" style={{
              fontSize: CONFIG.fontMin + srand(i * 3) * CONFIG.fontVar,
              color: `hsl(${200 + srand(i * 5 + 1) * 130}, 80%, 78%)`,
              transform: `translate3d(${x}px, ${y}px, ${z}px) translate(-50%, -50%)`,
              opacity: life(u),
              filter: u > CONFIG.blurAt ? `blur(${((u - CONFIG.blurAt) * CONFIG.blurK).toFixed(1)}px)` : "none",
            }}>{w}</div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
