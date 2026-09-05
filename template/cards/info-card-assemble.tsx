import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// info-card-assemble · 信息卡逐字段自建 —— 自包含 Remotion 源码（与 demos/info-card-assemble/index.html 同画面）
// 一张信息卡（书 / 工具 / 人物）像被结构化抽取一样自己长出来：图 → 标题 → 标签 pop → 价格行 → 要点逐行 + 马克底块刷过 → 色卡点亮，
// 相邻字段只隔 2 帧、单字段行程 0.5s，整卡极慢前推 6%。复制本文件进你的工程即可用；封面经 src 注入（不传 = 灰调占位），文案经 props 注入。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 216 };   // 6.8s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 字段时间表用"配方帧"写（60 分母折成秒），同类字段隔 2 帧、跨类隔 4~14 帧——间隔的疏密就是信息分组；
//      ② 单字段行程 0.5s 远大于间隔 → 同时有五六个字段在动，画面是"涌"不是"点"；③ 小件 pop（0.4→1 back.out）、大件 rise（6px 沉一下）；
//      ④ 马克底块 5 帧从左刷过（比字段落位还快，读作"笔一划"）；⑤ 整卡 1→1.06 极慢前推摊在前 75%，让密集小事件之间画面仍在推进。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  D: 5.0,              // 配方帧的时间基：F(f) = f / 60 × D（母本 60 分母）
  frames: { img: 0, title: 4, pills: [8, 10, 12], price: 16, lines: [30, 32, 34], hl: [34, 36], swatches: [40, 42, 44] },   // 字段配方帧
  fieldDur: 0.5,       // 单字段落位行程 s（远大于 2 帧间隔 → "涌"）
  riseY: 6,            // 大件 rise 位移 px（只沉一点点，>20 与前推方向打架）
  popFrom: 0.4,        // 小件 pop 起始缩放（明确的"从无到有"）
  hlDur: 0.17,         // 马克底块刷过时长 s（≈5 帧）
  push: 1.06,          // 整卡前推终值
  pushEnd: 0.75,       // 前推占全卡时间的比例（0→0.75·D）
  exitAt: 6.4,         // 整体退场起点（0.4s power2.in）
  end: 6.8,            // 镜头结束
};

/* 时间表（demo 秒，D = 5.0）
   0.00 图 rise → 0.33 标题 → 0.67 / 0.83 / 1.00 三枚标签 pop → 1.33 价格行
   2.50 / 2.67 / 2.83 三行要点 rise；2.83 / 3.00 两条马克底块 5 帧刷过
   3.33 / 3.50 / 3.67 三块色卡 pop；0→3.75 整卡 scale 1→1.06（power1.out）
   6.40–6.80 整体退场（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const backOut = (s = 1.70158) => (x: number) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 ica- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.ica-ph { position: absolute; overflow: hidden; }
.ica-ph::before { content: ""; position: absolute; inset: 0; background: linear-gradient(160deg, #c2b39a, #9c8f78); }
.ica-ph svg { position: absolute; left: 50%; top: 50%; width: 56px; height: 48px; transform: translate(-50%, -56%); opacity: .35; }
.ica-cap { position: absolute; left: 80px; top: 60px; width: 160px; font-size: 20px; color: #7a7a7a; line-height: 1.5; }
.ica-pc { position: absolute; left: 270px; top: 40px; width: 420px; height: 460px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 18px; padding: 18px; transform-origin: 50% 50%; }
.ica-pc .ica-img { position: relative; height: 150px; border-radius: 10px; overflow: hidden; }
.ica-pc .ica-img .ica-ph { inset: 0; }
.ica-pc h5 { font-size: 24px; font-weight: 700; color: #1d1d1f; margin-top: 14px; }
.ica-pc .ica-pills { display: flex; gap: 8px; margin-top: 10px; }
.ica-pc .ica-pill { font-size: 14px; font-weight: 600; padding: 4px 12px; border-radius: 999px; background: #f2f2f5; color: #1d1d1f; transform-origin: 50% 50%; }
.ica-pc .ica-price { display: flex; align-items: baseline; gap: 12px; margin-top: 14px; height: 34px; }
.ica-pc .ica-new { font-size: 28px; font-weight: 700; color: #0066cc; font-variant-numeric: tabular-nums; }
.ica-pc .ica-lines { margin-top: 12px; }
.ica-pc .ica-ln { position: relative; font-size: 17px; color: #1d1d1f; line-height: 1.5; margin-bottom: 4px; }
.ica-pc .ica-ln .ica-hl { position: absolute; left: -4px; right: -4px; top: 3px; bottom: 3px; background: #E8F0FF; border-radius: 4px; transform-origin: 0 50%; z-index: -1; }
.ica-pc .ica-ln span { position: relative; z-index: 1; }
.ica-pc .ica-sw { display: flex; gap: 8px; margin-top: 12px; }
.ica-pc .ica-sw i { display: block; width: 26px; height: 26px; border-radius: 8px; transform-origin: 50% 50%; }
`;

const GLYPH = (
  <svg viewBox="0 0 48 40" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
    <rect x="2" y="2" width="44" height="36" rx="4" /><circle cx="16" cy="14" r="4" /><path d="M4 34 L18 22 L27 30 L34 24 L44 34" />
  </svg>
);

type Props = {
  /** 封面 / 头像真图（object-fit cover）；不传 = 灰调占位 */
  src?: string;
  /** 左侧版面说明（画面文字） */
  caption?: string;
  /** 标题 */
  title?: string;
  /** 标签 pill（≤3 枚与配方帧一一对应，多出的按 2 帧续排） */
  pills?: string[];
  /** 价格 / 关键数字行（空字符串 = 不显示该行） */
  price?: string;
  /** 要点行（≤3 行与配方帧一一对应） */
  lines?: string[];
  /** 哪几行要点带马克底块（行索引） */
  highlightLines?: number[];
  /** 底部色卡颜色 */
  swatches?: string[];
};

export default function InfoCardAssemble({
  src,
  caption = "这期推荐的一本书",
  title = "《讲故事的科学》",
  pills = ["叙事", "心理学", "2024"],
  price = "¥ 39.9",
  lines = ["三幕结构的现代版：钩子、转折、回收", "为什么开头 3 秒必须有冲突", "怎么让数据有画面感"],
  highlightLines = [0, 1],
  swatches = ["#E8F0FF", "#FFE9F0", "#E6F7F2"],
}: Props) {
  const t = useCurrentFrame() / FPS;
  const F = (f: number) => (f / 60) * CONFIG.D;
  const at = (arr: number[], i: number) => (arr[i] ?? arr[arr.length - 1] + 2 * (i - arr.length + 1));   // 多出的字段按 2 帧续排

  // rise：opacity 0→1 + y 6→0（power2.out）；pop：opacity 0→1 + scale 0.4→1（back.out(1.7)）
  const rise = (t0: number) => { const p = tw(t, t0, CONFIG.fieldDur, power2Out); return { opacity: p, transform: `translateY(${lerp(CONFIG.riseY, 0, p)}px)` }; };
  const pop = (t0: number) => { const p = tw(t, t0, CONFIG.fieldDur, backOut(1.7)), o = tw(t, t0, CONFIG.fieldDur, power2Out); return { opacity: o, transform: `scale(${lerp(CONFIG.popFrom, 1, p)})` }; };

  const pushK = tw(t, 0, CONFIG.D * CONFIG.pushEnd, power1Out);
  const capOp = tw(t, 0.2, 0.4, power1Out);
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.end - CONFIG.exitAt, power2In);
  const hlIdx = (li: number) => highlightLines.indexOf(li);

  return (
    <AbsoluteFill style={{ background: "#f5f5f7", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="ica-cap" style={{ opacity: capOp * exitK }}>{caption}</div>
      <div className="ica-pc" style={{ opacity: exitK, transform: `scale(${lerp(1, CONFIG.push, pushK)})` }}>
        {/* 图 */}
        <div className="ica-img" style={rise(F(CONFIG.frames.img))}>
          <div className="ica-ph">{src ? <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : GLYPH}</div>
        </div>
        {/* 标题 */}
        <h5 style={rise(F(CONFIG.frames.title))}>{title}</h5>
        {/* 标签 pop */}
        <div className="ica-pills">
          {pills.map((p, i) => <span key={i} className="ica-pill" style={pop(F(at(CONFIG.frames.pills, i)))}>{p}</span>)}
        </div>
        {/* 价格行：普通落位 */}
        <div className="ica-price">{price ? <span className="ica-new" style={rise(F(CONFIG.frames.price))}>{price}</span> : null}</div>
        {/* 要点逐行 + 马克底块刷过 */}
        <div className="ica-lines">
          {lines.map((l, i) => {
            const k = hlIdx(i);
            const hlP = k >= 0 ? tw(t, F(at(CONFIG.frames.hl, k)), CONFIG.hlDur, power1Out) : 0;
            return (
              <div key={i} className="ica-ln" style={rise(F(at(CONFIG.frames.lines, i)))}>
                {k >= 0 ? <i className="ica-hl" style={{ transform: `scaleX(${hlP})` }} /> : null}
                <span>{l}</span>
              </div>
            );
          })}
        </div>
        {/* 色卡 pop */}
        <div className="ica-sw">
          {swatches.map((c, i) => <i key={i} style={{ background: c, ...pop(F(at(CONFIG.frames.swatches, i))) }} />)}
        </div>
      </div>
    </AbsoluteFill>
  );
}
