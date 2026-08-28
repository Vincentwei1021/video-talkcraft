import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// terminal-typing-log · 终端逐行推进 —— 自包含 Remotion 源码（与 demos/terminal-typing-log/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。

// ===== 可摘走的核心：CONFIG.lines 时刻表 + buildSchedule + render =====
// 三条决策构成"终端在跑"的手感，缺一条就退化成"文字慢慢出现"：
//  ① 分块突进：revealed = ceil(linear / chunk) * chunk —— 输出成小簇跳出，不是一字一滴
//  ② 滚动零插值：溢出的行开始那一帧，缓冲区**整跳一个行高**（加 ease 立刻假，终端不会滑行）
//  ③ 省略号悬停：以 ... 结尾的行打完自动冻结 0.6s，画面完全静止，下一批日志才来
const CONFIG = {
  leadIn: 0.32,        // 起手静置 s（等口播开口）
  lineDelay: 0.27,     // 行间基础延迟 s（可被单行 d 覆写——真实日志的段落长短不齐）
  logRate: 68,         // 日志线性揭示速率 char/s（分块前的"底速"）
  logChunk: 4,         // 日志分块粒度：2~4；1 = 退化成逐字符
  cmdRate: 23,         // 命令行速率 char/s（人在敲，比日志慢一个量级）
  cmdChunk: 1,         // 命令行必须逐字符——手在敲键盘不会 4 个字一起蹦出来
  hover: 0.60,         // 以 ... 结尾的行打完后的自动冻结（悬念）
  visibleLines: 8,     // 视口可见行数；第 9 行开始每行触发一次整跳
  lineHeight: 34,      // = round(fontSize × 1.6)；滚动步长
  cursorHz: 2,         // 方块光标闪烁频率
  tail: 0.6,           // 尾巴留白 s
  // 时刻表：k = cmd（命令，逐字符）/ log（日志，分块）/ ok（成功，唯一语义色）
  //          d = 覆写行间延迟；p = 覆写打完后的冻结（缺省时 ... 结尾行自动 hover）
  lines: [
    { k: "cmd", t: "pnpm install",                          d: 0    },
    { k: "log", t: "Lockfile is up to date, resolving...",  d: 0.20 },  // ← 自动悬停 0.6s
    { k: "log", t: "Packages: +312, reused 298, added 14",  d: 0.27 },
    { k: "log", t: "Done in 4.1s",                          d: 0.12 },
    { k: "cmd", t: "pnpm build",                            d: 0.50 },
    { k: "log", t: "> vite build --mode production",        d: 0.20 },
    { k: "log", t: "transforming 1284 modules",             d: 0.24 },
    { k: "log", t: "dist/assets/index-a7f2.js    214.6 kB", d: 0.12 },
    { k: "log", t: "dist/assets/vendor-3c91.js   482.3 kB", d: 0.10 },
    { k: "log", t: "12 routes prerendered · gzip 168.4 kB", d: 0.12 },
    { k: "ok",  t: "✓ built in 6.42s",                      d: 0.34 },
  ] as { k: string; t: string; d?: number; p?: number }[],
};

// —— 时刻表：一次算完每行的起点/速率/分块，运行时只查表 ——
// 揭示真正结束于 linear = len − chunk + 1（分块会把最后一簇提前填满），
// 用它当下一行的排期基准；按 len/(chunk·rate) 估时长在 chunk>1 时会让后一行压着前一行开打。
function buildSchedule() {
  const sched: { start: number; end: number; rate: number; chunk: number; len: number; text: string; k: string }[] = [];
  let acc = CONFIG.leadIn;
  CONFIG.lines.forEach((l) => {
    const cmd = l.k === "cmd";
    const rate = cmd ? CONFIG.cmdRate : CONFIG.logRate;
    const chunk = cmd ? CONFIG.cmdChunk : CONFIG.logChunk;
    acc += l.d === undefined ? CONFIG.lineDelay : l.d;
    const start = acc;
    const dur = Math.max(l.t.length - chunk + 1, 1) / rate;
    const pause = l.p !== undefined ? l.p
      : (l.t.trimEnd().endsWith("...") ? CONFIG.hover : 0);
    sched.push({ start, end: start + dur, rate, chunk, len: l.t.length, text: l.t, k: l.k });
    acc = start + dur + pause;
  });
  return { sched, total: acc + CONFIG.tail };
}
const { sched: SCHED, total: TOTAL } = buildSchedule();

export const meta = { width: 960, height: 540, fps: 30, durationInFrames: Math.round((TOTAL + 0.4) * 30) };

const FPS = meta.fps;

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

// —— 演示语境（不属于动效）：一扇灰阶终端窗 + 角标主播。
//    终端本体必须是深底——"命令行"这层语义靠深底成立，且成功行的绿色只有在深底上才读得出来；
//    舞台仍是白底（深色只在这个窗口里）。 ——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */
.term {
  position: absolute;
  left: 62px; top: 66px;
  width: 836px; height: 356px;   /* 356 = 40 窗栏 + 22×2 留白 + 8 行 × 34 行高（可见 8 行是硬约束） */
  border-radius: 12px;
  overflow: hidden;
  background: #17171a;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.18);
}
.chrome {
  height: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background: #212126;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
/* 三交通灯：灰阶（颜色留给唯一的语义色——成功行） */
.chrome i { width: 11px; height: 11px; border-radius: 50%; background: #4b4b55; }
.chrome .path {
  flex: 1;
  text-align: center;
  font-size: 13px;
  color: #8b8b95;
  letter-spacing: 0.2px;
  margin-right: 41px;   /* 三灯占宽，抵掉才是真居中 */
}

/* 视口 → 裁切层 → 缓冲区三层。
   裁切必须发生在**内边距框**上（裁切层 inset = 内边距），不能只给 .viewport 加
   overflow:hidden——那是边框框裁切，滚上去的那一行会露在 22px 留白里显示半截。 */
.viewport { flex: 1; position: relative; }
.clip { position: absolute; inset: 22px; overflow: hidden; }
/* 缓冲区：唯一被 transform 的元素 */
.buffer {
  position: absolute;
  left: 0; right: 0; top: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 21px;
}
.ln {
  height: 34px;                /* = round(fontSize × 1.6)，滚动步长就是这个值 */
  display: flex;
  align-items: center;
  white-space: pre;
  color: #9b9ba3;              /* 日志灰 */
}
.ln.cmd { color: #f2f2f4; }    /* 命令白 */
.ln.ok  { color: #33d16b; }    /* 成功绿——全卡唯一语义色 */
.ln .pr { color: #6f6f78; margin-right: 9px; }
/* 方块光标：2Hz 闪，只在该行还没打完时出现 */
.ln .cur {
  display: inline-block;
  width: 11px;                 /* ≈ fontSize × 0.55 */
  height: 21px;
  margin-left: 2px;
  background: currentColor;
}

/* 角标主播（演示语境） */
.host-badge {
  position: absolute;
  left: 44px; top: 442px;
  width: 84px; height: 84px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
`;

export default function TerminalTypingLog({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const N = SCHED.length;

  // ② 滚动零插值：第 visibleLines+1 行起，每有一行开打就整跳一个行高
  let steps = 0;
  for (let i = CONFIG.visibleLines; i < N; i++) if (t >= SCHED[i].start) steps++;
  const ty = -steps * CONFIG.lineHeight;

  const blinkOn = Math.floor(t * CONFIG.cursorHz) % 2 === 0;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="term">
        <div className="chrome">
          <i></i><i></i><i></i>
          <span className="path">~/projects/koubo-site</span>
        </div>
        <div className="viewport"><div className="clip">
          <div className="buffer" style={{ transform: `translateY(${ty}px)` }}>
            {SCHED.map((s, i) => {
              const on = t >= s.start;
              // ① 分块突进：线性计数取整后再上取整到 chunk 的倍数 —— 文字是"蹦"出来的
              const linear = on ? Math.floor((t - s.start) * s.rate) : 0;
              const revealed = Math.min(s.len, Math.ceil(linear / s.chunk) * s.chunk);
              // 光标：2Hz 方波，且只在该行未打完时存在（打完即撤，冻结段画面全静）
              const co = on && revealed < s.len && blinkOn ? 1 : 0;
              return (
                <div key={i} className={"ln" + (s.k === "cmd" ? " cmd" : s.k === "ok" ? " ok" : "")}
                     style={{ visibility: on ? "visible" : "hidden" }}>
                  {s.k === "cmd" ? <span className="pr">$</span> : null}
                  <span>{s.text.slice(0, revealed)}</span>
                  <span className="cur" style={{ opacity: co }}></span>
                </div>
              );
            })}
          </div>
        </div></div>
      </div>

      <div className="host-badge"><Host src={hostSrc} /></div>
    </AbsoluteFill>
  );
}
