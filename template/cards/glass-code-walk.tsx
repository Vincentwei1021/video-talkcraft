import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// glass-code-walk · 玻璃代码走读 —— 自包含 Remotion 源码（与 demos/glass-code-walk/index.html 同画面）
// 本卡无主持人占位；复制本文件进你的工程即可用。

// ===== 可摘走的核心：CONFIG + trackedRow() + apply() =====
// 三条决策构成"走读"，缺一条就退化成"代码块在播淡入动画"：
//  ① linePosition 是**浮点行号**，相机与高亮带同源于它 ⇒ 行间是滑过去的，不是跳格
//  ② 每行"停一下再滑走"（dwell + stepDur），不是匀速传送带 —— 人读代码是停顿式的
//  ③ 读完拉回 zoom=1 收全景 ⇒ 观众拿回整体结构；不收这一拍等于没讲完
const CONFIG = {
  // 源码 DEFAULT_CODE（registry/remocn/glass-code-walk/index.tsx），1:1
  code: [
    'import { AbsoluteFill } from "remotion";',
    'import { Typewriter } from "@/components/remocn";',
    '',
    'export function Intro() {',
    '  return (',
    '    <AbsoluteFill>',
    '      <Typewriter text="Ship it" />',
    '    </AbsoluteFill>',
    '  );',
    '}',
  ].join("\n"),
  zoom: 1.68,        // 走读焦距：1.5~1.8。整行必须完整在画幅内（这是"走读"与 deep-zoom 的分界）
  lineIn: 0.08,      // 逐行入场间隔
  leadIn: 0.32,      // 块弹入后到逐行入场
  pushDur: 0.55,     // 全景 → 走读焦距的推近
  dwell: 0.32,       // 每行停留（读这一行的时间）
  stepDur: 0.26,     // 行间滑动耗时（inOut：两端都收，一次"跳行"是有始有终的事件）
  holdEnd: 0.30,     // 最后一行读完的停留
  pullDur: 0.85,     // 拉回全景（同时解除压暗，回到读整体）
  tail: 0.50,
  dimFloor: 0.30,    // 非当前行的压暗底（0=只剩一行可见，太狠；>0.55 看不出在走读）
  // 代码块在世界坐标里的四边（既推行心，也当相机的钳制边界）
  blkL: 180, blkT: 50, blkW: 600, blkH: 440,
};

// —— 几何：行高/行距由 CSS 写死（26/14 + 4 gap），行心可静态算出（不量 DOM）——
const RAW = CONFIG.code.split("\n");
const ROW_H = RAW.map((l) => (l.trim() === "" ? 14 : 26));
const ROW_TOP: number[] = [];
{
  let y = 20;                       // .body padding-top
  RAW.forEach((_, i) => { ROW_TOP.push(y); y += ROW_H[i] + 4; });   // margin-bottom: 4
}
const BODY_TOP = CONFIG.blkT + 1 + 41;   // ring 1px 描边 + block 内 chrome 40（与 demo 同一算法）
const CENTERS = RAW.map((_, i) => BODY_TOP + ROW_TOP[i] + ROW_H[i] / 2);
// 走读只停在有内容的行上（空行是排版，不是一句话）
const STOPS = RAW.map((l, i) => (l.trim() === "" ? -1 : i)).filter((i) => i >= 0);

// —— 时刻表（与 demo 时间轴同构）——
const AFTER_IN = CONFIG.leadIn + (RAW.length - 1) * CONFIG.lineIn + 0.26;   // 1.30
const PUSH_AT = AFTER_IN + 0.10;                                            // 1.40
const WALK_START = PUSH_AT + CONFIG.pushDur + CONFIG.dwell;                 // 2.27
const WALK_END = WALK_START + (STOPS.length - 1) * (CONFIG.stepDur + CONFIG.dwell);  // 6.91
const PULL_AT = WALK_END - CONFIG.dwell + CONFIG.holdEnd;                   // 6.89
const TOTAL = PULL_AT + CONFIG.pullDur + CONFIG.tail;                       // 8.24

export const meta = { width: 960, height: 540, fps: 30, durationInFrames: Math.round((TOTAL + 0.4) * 30) };

const FPS = meta.fps;

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const backOut = (s: number) => (x: number) => {
  const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u;
};

// 极简正则分词：不是真高亮器，只给眼睛几个锚点（顺序要紧：整行注释 → 字符串 → 数字 → 关键字）
// 源码 glass-code-block 的 KEYWORDS 集合与正则，1:1
const KEYWORDS = new Set(["import", "from", "export", "function", "const", "let", "var",
  "return", "if", "else", "for", "while", "new", "class", "extends", "default", "true", "false", "null", "undefined"]);
function tokenize(line: string): [string, string][] {
  if (line.trimStart().startsWith("//")) return [["c", line]];
  const out: [string, string][] = [];
  const re = /("[^"]*"|'[^']*'|`[^`]*`|\b\d+\b|\b[A-Za-z_$][\w$]*\b|[^\w"'`]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const tk = m[0], f = tk[0];
    if (f === '"' || f === "'" || f === "`") out.push(["s", tk]);
    else if (/^\d+$/.test(tk)) out.push(["n", tk]);
    else if (KEYWORDS.has(tk)) out.push(["k", tk]);
    else out.push(["", tk]);
  }
  return out;
}
const TOKENS = RAW.map(tokenize);

/* —— 源码原始视觉（2026-08-25 用户定版：放弃改编，按 remocn 源码原样实现）——
      视觉 1:1 照抄 registry/remocn/glass-code-block/index.tsx + glass-code-walk/index.tsx：
        glassColor rgba(10,10,10,0.6) / backdropFilter blur(16px) / radius 16(内 15)
        1px 渐变描边 linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 100%)
        boxShadow 0 50px 120px rgba(0,0,0,.55) / inset 0 1px 0 rgba(255,255,255,.06)
        chrome 40px + 三交通灯真色 opacity .6 + 标题 #a1a1aa 12px letterSpacing .02em
        行号槽 28px #3f3f46；token 色 code #e4e4e7 / comment #52525b /
        string #86efac / keyword #c4b5fd / number #fcd34d
      舞台底：源码 previewBackdrop 是照片 /bg.jpg（暖褐 → 墨绿的暗调）。用 CSS 渐变复刻——
      玻璃背后必须有可糊的东西，这是"玻璃"读得出来的唯一证据。 —— */
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */

/* 相机层：铺满舞台的世界坐标层，全卡唯一被 transform 的元素。
   transform-origin: 0 0 —— 反解 tx = W/2 − zoom·cx 的前提。 */
.camera {
  position: absolute;
  left: 0; top: 0;
  width: 960px; height: 540px;
  transform-origin: 0 0;
}

/* 1px 渐变描边（源码那圈 microborder）*/
.ring {
  position: absolute;
  left: 180px; top: 50px;
  width: 600px; height: 440px;
  padding: 1px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 100%);
  box-shadow: 0 50px 120px rgba(0, 0, 0, 0.55);
}
/* 玻璃块：源码 glassColor rgba(10,10,10,0.6) + blur(16px) */
.block {
  width: 100%; height: 100%;
  border-radius: 15px;
  background: rgba(10, 10, 10, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.chrome {
  flex: 0 0 40px;
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
/* 三交通灯：源码 Light 用 macOS 真色 + opacity .6 */
.chrome i { width: 12px; height: 12px; border-radius: 50%; display: block; opacity: 0.6; }
.chrome .l1 { background: #ff5f57; }
.chrome .l2 { background: #febc2e; }
.chrome .l3 { background: #28c840; }
.chrome .name {
  flex: 1; text-align: center;
  font-size: 12px; letter-spacing: 0.02em;
  color: #a1a1aa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  margin-right: 44px;   /* 抵掉三灯 + gap 占宽才是真居中 */
}

.body {
  position: relative;
  flex: 1;
  padding: 20px 24px;   /* 源码 padding: "20px 24px" */
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  /* 字号由**块宽**反推：可用文本宽 = 600 − 2×24 padding − 28 行号槽 = 524px。
     源码最长行 49 字符 × 0.6em ⇒ fs ≤ 17.8。取 17px。 */
  font-size: 17px;
}
/* 行必须是 block 而不是 flex：flex 容器会丢掉纯空白的匿名子项 */
.line {
  position: relative;
  height: 26px;              /* = round(fontSize × 1.55)，源码 lineHeight 1.55 */
  line-height: 26px;
  margin-bottom: 4px;        /* 源码 gap: 4 */
  white-space: pre;
  color: #e4e4e7;            /* 源码 TOKEN_COLORS.code */
  z-index: 1;
}
.line.blank { height: 14px; line-height: 14px; }  /* 源码空行 = fontSize × 0.8 */
/* 行号槽：源码 width 28 / color #3f3f46 / padStart(2, " ") */
.line .ln { display: inline-block; width: 28px; color: #3f3f46; }
/* 源码 TOKEN_COLORS 五色，1:1 */
.k { color: #c4b5fd; }   /* keyword */
.s { color: #86efac; }   /* string */
.n { color: #fcd34d; }   /* number */
.c { color: #52525b; }   /* comment */

/* 走读高亮带：当前行的"读到这儿了"。位置与相机同源——都由 linePosition 算出来 */
.band {
  position: absolute;
  left: 8px; right: 8px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.7);
  z-index: 0;
  pointer-events: none;
}
`;

// 浮点行号 → 行心 y（在相邻行之间线性插值）
function trackedRow(p: number) {
  const lo = Math.max(0, Math.min(RAW.length - 1, Math.floor(p)));
  const hi = Math.min(RAW.length - 1, lo + 1);
  const f = p - lo;
  return {
    y: CENTERS[lo] + (CENTERS[hi] - CENTERS[lo]) * f,
    top: ROW_TOP[lo] + (ROW_TOP[hi] - ROW_TOP[lo]) * f,
    h: ROW_H[lo] + (ROW_H[hi] - ROW_H[lo]) * f,
  };
}

export default function GlassCodeWalk(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const W = 960, H = 540;
  const C = CONFIG;

  // 1. 玻璃块弹入（位移先动、淡入独立窗——remocn 全系入场的写法）
  const rp = tw(t, 0, 0.55, backOut(1.3));
  const ringY = lerp(16, 0, rp);
  const ringS = lerp(0.965, 1, rp);
  const ringO = tw(t, 0.06, 0.34, power2Out);

  // 3/5. 推近到走读焦距 → 收尾拉回全景（zoom 与 dimAmt 同一条 tween）
  const zoom = t < PULL_AT
    ? lerp(1, C.zoom, tw(t, PUSH_AT, C.pushDur, power2InOut))
    : lerp(C.zoom, 1, tw(t, PULL_AT, C.pullDur, power2InOut));
  const dimAmt = t < PULL_AT
    ? tw(t, PUSH_AT, C.pushDur, power2InOut)
    : 1 - tw(t, PULL_AT, C.pullDur, power2InOut);

  // 4. 走读：每行停一下（dwell）再滑到下一行（stepDur, inOut）
  let linePos: number = STOPS[0];
  for (let k = 1; k < STOPS.length; k++) {
    const tk = WALK_START + (k - 1) * (C.stepDur + C.dwell);
    if (t <= tk) break;
    linePos = lerp(STOPS[k - 1], STOPS[k], tw(t, tk, C.stepDur, power2InOut));
  }

  // ① 反解：把锚点搬到画面正中。x 恒取块心 —— 读代码是**整行读**，横向不跟字符
  const trk = trackedRow(linePos);
  let cx = C.blkL + C.blkW / 2;
  let cy = trk.y;
  // ② 边界钳制：可视世界矩形关在代码块四边内。素材比可视区小时退化为居中
  const hw = W / (2 * zoom), hh = H / (2 * zoom);
  const x0 = C.blkL, x1 = C.blkL + C.blkW, y0 = C.blkT, y1 = C.blkT + C.blkH;
  cx = x1 - x0 > 2 * hw ? Math.min(Math.max(cx, x0 + hw), x1 - hw) : (x0 + x1) / 2;
  cy = y1 - y0 > 2 * hh ? Math.min(Math.max(cy, y0 + hh), y1 - hh) : (y0 + y1) / 2;

  return (
    <AbsoluteFill style={{
      color: "#1d1d1f", overflow: "hidden",
      // 舞台底：复刻源码 previewBackdrop（/bg.jpg）的色调。玻璃拟态需要背景有内容可折射。
      background:
        "radial-gradient(ellipse 55% 45% at 18% 12%, rgba(186, 127, 90, 0.95) 0%, rgba(129, 94, 69, 0.5) 45%, transparent 72%)," +
        "radial-gradient(ellipse 45% 40% at 8% 42%, rgba(147, 95, 64, 0.75) 0%, transparent 68%)," +
        "radial-gradient(ellipse 60% 55% at 88% 78%, rgba(9, 20, 22, 0.9) 0%, transparent 70%)," +
        "linear-gradient(135deg, #6d4c37 0%, #2a2019 34%, #131a1b 62%, #0a0e0f 100%)",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="camera" style={{
        transform: `translate(${W / 2 - zoom * cx}px, ${H / 2 - zoom * cy}px) scale(${zoom})`,
      }}>
        <div className="ring" style={{
          opacity: ringO,
          transform: `translateY(${ringY}px) scale(${ringS})`,
          transformOrigin: "50% 50%",
        }}>
          <div className="block">
            <div className="chrome">
              <i className="l1"></i><i className="l2"></i><i className="l3"></i>
              <span className="name">scene.tsx</span>
            </div>
            <div className="body">
              {/* ③ 高亮带与相机同源：同一个 linePos 推出来，所以两者不可能失步 */}
              <div className="band" style={{
                top: trk.top - 4,
                height: trk.h + 8,
                opacity: dimAmt,
              }}></div>
              {RAW.map((line, i) => {
                // 2. 逐行入场：y 6→0 + 淡入，行距 0.08s
                const ep = tw(t, C.leadIn + i * C.lineIn, 0.26, power2Out);
                // 压暗：离当前行越远越暗（连续量 ⇒ 带子滑到两行之间时两行同时半亮）
                const near = Math.max(0, 1 - Math.abs(i - linePos));
                const lvl = C.dimFloor + (1 - C.dimFloor) * near;
                const dimO = 1 - dimAmt * (1 - lvl);
                return (
                  <div key={i} className={"line" + (line.trim() === "" ? " blank" : "")}
                       style={{ opacity: ep * dimO, transform: `translateY(${6 * (1 - ep)}px)` }}>
                    <span className="ln">{String(i + 1).padStart(2, " ")}</span>
                    {TOKENS[i].map(([k, tk], j) =>
                      k ? <span key={j} className={k}>{tk}</span> : <React.Fragment key={j}>{tk}</React.Fragment>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
