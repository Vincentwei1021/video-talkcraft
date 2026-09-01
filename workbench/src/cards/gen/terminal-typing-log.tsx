import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette } from "../shared";

// terminal-typing-log · 终端逐行推进 —— 参数化版（源出 tplcards/terminal-typing-log.tsx）
// 命门：三条决策构成"终端在跑"的手感，全部 FIXED，缺一条就退化成"文字慢慢出现"：
//  ① 分块突进：revealed = ceil(linear / chunk) * chunk —— 输出成小簇跳出，不是一字一滴
//  ② 滚动零插值：溢出的行开始那一帧，缓冲区**整跳一个行高**（加 ease 立刻假，终端不会滑行）
//  ③ 省略号悬停：以 ... 结尾的行打完自动冻结 hover 秒，画面完全静止，下一批日志才来
// 行序列走 textarea 逐行 DSL（类型|延迟|文本），节拍随行数/字符数自适应；
// 终端深底与命令/日志灰阶 FIXED（"命令行"语义靠深底成立），唯一开放的语义色是成功绿。
const FPS = 30;

const FIXED = {
  logRate: 68,      // 日志线性揭示速率 char/s（分块前的"底速"）
  logChunk: 4,      // 日志分块粒度：2~4；1 = 退化成逐字符
  cmdRate: 23,      // 命令行速率 char/s（人在敲，比日志慢一个量级）
  cmdChunk: 1,      // 命令行必须逐字符——手在敲键盘不会 4 个字一起蹦出来
  visibleLines: 8,  // 视口可见行数（硬约束）；第 9 行开始每行触发一次整跳
  cursorHz: 2,      // 方块光标闪烁频率
  tail: 0.6,        // 尾巴留白 s
};

// —— 行 DSL：每行 "类型|延迟s|文本"；类型 = cmd（命令，逐字符）/ log（日志，分块）/ ok（成功绿）
//    延迟留空则用"行间基础延迟"；文本里允许再出现 |；以 ... 结尾的行打完自动悬停 ——
type LineSpec = { k: string; d?: number; text: string };
function parseLines(dsl: string): LineSpec[] {
  return dsl
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const parts = l.split("|");
      if (parts.length === 1) return { k: "log", text: parts[0] };
      if (parts.length === 2) return { k: parts[0].trim(), text: parts[1] };
      const dRaw = parts[1].trim();
      const dNum = dRaw === "" ? NaN : Number(dRaw);
      return {
        k: parts[0].trim(),
        d: Number.isFinite(dNum) ? dNum : undefined,
        text: parts.slice(2).join("|"),
      };
    });
}

// —— 时刻表：一次算完每行的起点/速率/分块，运行时只查表 ——
// 揭示真正结束于 linear = len − chunk + 1（分块会把最后一簇提前填满），
// 用它当下一行的排期基准；按 len/(chunk·rate) 估时长在 chunk>1 时会让后一行压着前一行开打。
type Sched = { start: number; rate: number; chunk: number; len: number; text: string; k: string };
function buildSchedule(entries: LineSpec[], lead: number, lineDelay: number, hover: number) {
  const sched: Sched[] = [];
  let acc = lead;
  entries.forEach((l) => {
    const cmd = l.k === "cmd";
    const rate = cmd ? FIXED.cmdRate : FIXED.logRate;
    const chunk = cmd ? FIXED.cmdChunk : FIXED.logChunk;
    acc += l.d === undefined ? lineDelay : l.d;
    const start = acc;
    const dur = Math.max(l.text.length - chunk + 1, 1) / rate;
    const pause = l.text.trimEnd().endsWith("...") ? hover : 0;
    sched.push({ start, rate, chunk, len: l.text.length, text: l.text, k: l.k });
    acc = start + dur + pause;
  });
  return { sched, total: acc + FIXED.tail };
}

const DEFAULT_LINES = [
  "cmd|0|pnpm install",
  "log|0.20|Lockfile is up to date, resolving...",
  "log|0.27|Packages: +312, reused 298, added 14",
  "log|0.12|Done in 4.1s",
  "cmd|0.50|pnpm build",
  "log|0.20|> vite build --mode production",
  "log|0.24|transforming 1284 modules",
  "log|0.12|dist/assets/index-a7f2.js    214.6 kB",
  "log|0.10|dist/assets/vendor-3c91.js   482.3 kB",
  "log|0.12|12 routes prerendered · gzip 168.4 kB",
  "ok|0.34|✓ built in 6.42s",
].join("\n");

// 默认时长照抄模板 meta 的计算逻辑：round((total + 0.4) × 30)
const DEFAULT_TOTAL = buildSchedule(parseLines(DEFAULT_LINES), 0.32, 0.27, 0.6).total;

const MONO_STACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

interface Props {
  lines?: string;
  termPath?: string;
  okColor?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
  lineDelay?: number;
  hover?: number;
}

const TerminalTypingLog: React.FC<Props> = ({
  lines = DEFAULT_LINES,
  termPath = "~/projects/koubo-site",
  okColor = "#33d16b",
  fontSize = 21,
  posX = 62,
  posY = 66,
  lead = 0.32,
  lineDelay = 0.27,
  hover = 0.6,
}) => {
  const t = useCurrentFrame() / FPS;
  const { sched } = buildSchedule(parseLines(lines), lead, lineDelay, hover);
  const N = sched.length;

  // 行高/光标/窗高全部由字号推导（默认 21 ⇒ 行高 34、窗高 356，与模板逐像素一致）
  const lineHeight = Math.round(fontSize * 1.6);
  const termHeight = 40 + 22 * 2 + FIXED.visibleLines * lineHeight; // 窗栏 + 留白 + 可见行
  const cursorW = Math.floor(fontSize * 0.55);

  // ② 滚动零插值：第 visibleLines+1 行起，每有一行开打就整跳一个行高
  let steps = 0;
  for (let i = FIXED.visibleLines; i < N; i++) if (t >= sched[i].start) steps++;
  const ty = -steps * lineHeight;

  const blinkOn = Math.floor(t * FIXED.cursorHz) % 2 === 0;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      {/* 终端本体必须是深底——"命令行"语义靠深底成立，成功绿只有在深底上才读得出来；
          舞台仍是白底（深色只在这个窗口里） */}
      <div style={{
        position: "absolute", left: posX, top: posY,
        width: 836, height: termHeight, borderRadius: 12, overflow: "hidden",
        background: "#17171a", display: "flex", flexDirection: "column",
        boxShadow: "0 16px 44px rgba(0, 0, 0, 0.18)",
      }}>
        <div style={{
          height: 40, flex: "0 0 40px", display: "flex", alignItems: "center",
          gap: 8, padding: "0 16px", background: "#212126", boxSizing: "border-box",
          borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "rgba(255, 255, 255, 0.07)",
        }}>
          {/* 三交通灯：灰阶（颜色留给唯一的语义色——成功行） */}
          {[0, 1, 2].map((i) => (
            <i key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: "#4b4b55" }} />
          ))}
          <span style={{
            flex: 1, textAlign: "center", fontSize: 13, color: "#8b8b95",
            letterSpacing: 0.2, marginRight: 41, // 三灯占宽，抵掉才是真居中
          }}>
            {termPath}
          </span>
        </div>
        {/* 视口 → 裁切层 → 缓冲区三层。裁切必须发生在内边距框上（裁切层 inset = 内边距），
            否则滚上去的那一行会露在 22px 留白里显示半截 */}
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ position: "absolute", inset: 22, overflow: "hidden" }}>
            {/* 缓冲区：唯一被 transform 的元素 */}
            <div style={{
              position: "absolute", left: 0, right: 0, top: 0,
              fontFamily: MONO_STACK, fontSize,
              transform: `translateY(${ty}px)`,
            }}>
              {sched.map((s, i) => {
                const on = t >= s.start;
                // ① 分块突进：线性计数取整后再上取整到 chunk 的倍数 —— 文字是"蹦"出来的
                const linear = on ? Math.floor((t - s.start) * s.rate) : 0;
                const revealed = Math.min(s.len, Math.ceil(linear / s.chunk) * s.chunk);
                // 光标：2Hz 方波，且只在该行未打完时存在（打完即撤，冻结段画面全静）
                const co = on && revealed < s.len && blinkOn ? 1 : 0;
                const color = s.k === "cmd" ? "#f2f2f4" : s.k === "ok" ? okColor : "#9b9ba3";
                return (
                  <div key={i} style={{
                    height: lineHeight, display: "flex", alignItems: "center",
                    whiteSpace: "pre", color,
                    visibility: on ? "visible" : "hidden",
                  }}>
                    {s.k === "cmd" ? <span style={{ color: "#6f6f78", marginRight: 9 }}>$</span> : null}
                    <span>{s.text.slice(0, revealed)}</span>
                    <span style={{
                      display: "inline-block", width: cursorW, height: fontSize,
                      marginLeft: 2, background: "currentColor", opacity: co,
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 角标主播（演示语境，不属于动效本体） */}
      <div style={{
        position: "absolute", left: 44, top: 442, width: 84, height: 84,
        borderRadius: "50%", borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
        overflow: "hidden", background: "#fff", boxSizing: "border-box",
      }}>
        <HostSilhouette />
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "terminal-typing-log",
  name: "终端逐行推进",
  category: "素材呈现",
  durationInFrames: Math.round((DEFAULT_TOTAL + 0.4) * 30),
  accent: "#33d16b",
  component: TerminalTypingLog as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "textarea", key: "lines",
      label: "终端行（每行：类型|延迟s|文本；类型 cmd/log/ok，... 结尾自动悬停）",
      default: DEFAULT_LINES,
    },
    { type: "text", key: "termPath", label: "窗栏路径", default: "~/projects/koubo-site" },
    { type: "color", key: "okColor", label: "成功绿（唯一语义色）", default: "#33d16b" },
    { type: "slider", key: "fontSize", label: "终端字号（行高/窗高随动）", default: 21, min: 14, max: 28, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "终端窗 X", default: 62, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "终端窗 Y", default: 66, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.32, min: 0, max: 2, step: 0.01, unit: "s" },
    { type: "slider", key: "lineDelay", label: "行间基础延迟", default: 0.27, min: 0, max: 1, step: 0.01, unit: "s" },
    { type: "slider", key: "hover", label: "省略号悬停", default: 0.6, min: 0.2, max: 1.5, step: 0.05, unit: "s" },
  ],
};
