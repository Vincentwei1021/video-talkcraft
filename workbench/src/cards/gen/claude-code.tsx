import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { HostSilhouette, clamp01, power1Out } from "../shared";

// claude-code · 编码智能体终端 —— 参数化版（源出 tplcards/claude-code.tsx）
// 命门：窗体弹入 + 三段错峰淡入（顺序 = 阅读顺序）+ 日志分块突进/行占位不重排，
// 节奏参数全部 FIXED；日志行走 textarea 逐行 DSL，时刻表随行数/字符数自适应。
// 产品皮 = 内容本身（Claude Code 深色终端定版，不做中性化），开放内容 + 两支语义色。
const FPS = 30;

const FIXED = {
  introDur: 0.62,        // 窗体弹入时长（源码 spring）
  introY: 21,            // 窗体位移 px（源码 28 × 0.75 等比）
  boxFade: [0.20, 0.73] as [number, number],   // 欢迎框淡入窗（源码 fadeUpAt[6,22]）
  colRFade: [0.40, 1.00] as [number, number],  // What's new 栏（源码 [12,30]）
  promptFade: [0.60, 1.20] as [number, number],// 提示行（源码 [18,36]）
  fadeUpY: 9,            // 淡入自带的位移 px（源码 12 × 0.75）
  submitGap: 0.36,       // 打完到按回车的停顿
  cursorHz: 2,           // 方块光标闪烁（终端行业默认）
  logRate: 54,           // 日志线性揭示速率 char/s（分块前的底速）
  logChunk: 3,           // 日志分块粒度：文字成簇蹦出，不是一字一滴
  dotHz: 1.1,            // 工具调用中的状态点呼吸频率
  tail: 0.9,             // 尾巴留白 s
};

// —— 行 DSL：每行 "类型|延迟s|文本"；类型 = tool（工具调用，带状态点）/ res（结果，⎿ 折角）
//    / del（diff 删除，灰）/ add（diff 新增，语义绿）/ ok（结论，带 ✓）；文本保留前导空格 ——
type LineSpec = { k: string; d: number; text: string };
function parseLines(dsl: string): LineSpec[] {
  return dsl
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const parts = l.split("|");
      if (parts.length < 3) return { k: "res", d: 0.3, text: parts[parts.length - 1] ?? "" };
      const dNum = Number(parts[1].trim());
      return {
        k: parts[0].trim(),
        d: Number.isFinite(dNum) ? dNum : 0.3,
        text: parts.slice(2).join("|"),
      };
    });
}

// —— 时刻表：一遍算完所有时刻点，运行时只查表 ——
// 揭示真正结束于 linear = len − chunk + 1（分块会把最后一簇提前填满）
type Sched = { start: number; end: number; len: number; text: string; k: string };
function buildSchedule(prompt: string, entries: LineSpec[], typeStart: number, cps: number) {
  const typeDur = prompt.length / Math.max(0.1, cps);
  const typeEnd = typeStart + typeDur;
  const submitAt = typeEnd + FIXED.submitGap;
  let acc = submitAt;
  const lines: Sched[] = entries.map((l) => {
    acc += l.d;
    const start = acc;
    const dur = Math.max(l.text.length - FIXED.logChunk + 1, 1) / FIXED.logRate;
    acc = start + dur;
    return { start, end: start + dur, len: l.text.length, text: l.text, k: l.k };
  });
  return { typeStart, typeDur, typeEnd, submitAt, lines, total: acc + FIXED.tail };
}

const DEFAULT_PROMPT = "改 src/theme.ts，加一个深色模式开关";
const DEFAULT_LINES = [
  "tool|0.42|Read(src/theme.ts)",
  "res|0.50|⎿ 读取 142 行",
  "tool|0.28|Edit(src/theme.ts)",
  "del|0.34|  - const theme = lightTheme",
  "add|0.14|  + const theme = useColorScheme()",
  "res|0.32|⎿ 已改 1 处，新增 8 行",
  "ok|0.44|深色模式开关已接好，跑 pnpm dev 看效果",
].join("\n");
const DEFAULT_TOTAL = buildSchedule(DEFAULT_PROMPT, parseLines(DEFAULT_LINES), 1.6, 11).total;

// —— 缓动（对应 power2.out / back.out）——
const cl = clamp01;
const out2 = power1Out;
const backOut = (p: number, k: number) => 1 + (k + 1) * Math.pow(p - 1, 3) + k * Math.pow(p - 1, 2);
const fadeUp = (t: number, w: [number, number]) => {
  const p = cl((t - w[0]) / (w[1] - w[0]));
  return { o: p, y: FIXED.fadeUpY * (1 - p) };
};

/* —— 产品皮 = 内容本身（用户定版：完全还原产品样式）——
      取值照抄源码 THEMES.dark：windowBar #3A3633 / windowBody #1B1A18 /
      fg #E8E5DD / fgMuted #8A857C / fgDim #6B6660；窗饰三灯 macOS 真色。
      陶土橙与 diff 绿经 props 注入（动态改内联）；类名加 cc- 前缀 + 作用域 reset。 —— */
const CSS = `
.cc-root * { margin: 0; padding: 0; box-sizing: border-box; }
.cc-win {
  position: absolute;
  width: 800px; height: 456px;
  border-radius: 12px;
  overflow: hidden;
  background: #1B1A18;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.6);
}
.cc-bar {
  height: 32px;
  flex: 0 0 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  background: #3A3633;
}
.cc-bar i { width: 10px; height: 10px; border-radius: 50%; display: block; }
.cc-bar .cc-r { background: #FF5F57; }     /* macOS 真色（源码照抄） */
.cc-bar .cc-y { background: #FEBC2E; }
.cc-bar .cc-g { background: #28C840; }

.cc-body {
  flex: 1;
  padding: 18px;
  display: flex;
  flex-direction: column;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
}

/* 欢迎框：虚线框 + 骑在上边框的标题片（标题片用窗体底色盖住那一段虚线） */
.cc-welcome {
  position: relative;
  border-radius: 6px;
  padding: 18px 16px 15px;
}
.cc-welcome .cc-cap {
  position: absolute;
  top: -8px; left: 16px;
  padding: 0 8px;
  background: #1B1A18;
  font-size: 12px;
  font-weight: 700;
}
.cc-cols { display: flex; }
.cc-colL {
  width: 42%;
  padding-right: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  box-sizing: border-box;
}
.cc-hello { font-size: 14px; color: #E8E5DD; }
.cc-mark { align-self: center; }
.cc-mark svg { display: block; width: 68px; height: 68px; }
.cc-meta { display: flex; flex-direction: column; gap: 3px; }
.cc-meta div { font-size: 11.5px; color: #8A857C; }

.cc-colR {
  width: 58%;
  padding-left: 16px;
  box-sizing: border-box;
}
.cc-colR .cc-h { font-size: 11.5px; font-weight: 700; margin-bottom: 8px; }
.cc-colR ul { list-style: none; display: flex; flex-direction: column; gap: 5px; }
.cc-colR li { font-size: 11px; color: #E8E5DD; }
.cc-colR li.cc-dim { color: #6B6660; }

/* 提示行区：分隔线 + "> " + 打字 */
.cc-promptWrap { margin-top: 16px; }
.cc-rule { height: 1px; background: #6B6660; opacity: 0.4; margin-bottom: 11px; }
.cc-prow {
  display: flex;
  align-items: center;
  white-space: pre;
}
.cc-prow .cc-pr { color: #8A857C; }
.cc-prow .cc-txt { color: #E8E5DD; }
.cc-prow.cc-done .cc-txt { color: #8A857C; }   /* 已提交的那一行退成灰 */
.cc-cur {
  display: inline-block;
  width: 8px; height: 16px;
  margin-left: 2px;
  background: #E8E5DD;
  flex: 0 0 auto;
}
.cc-prow .cc-ph { color: #8A857C; }

/* 智能体工作日志：工具调用 → 结果 → diff → 结论 */
.cc-log { margin-top: 10px; display: flex; flex-direction: column; }
.cc-lg {
  display: flex;
  align-items: center;
  white-space: pre;
}
.cc-lg .cc-lcur {
  display: inline-block;
  width: 7px; height: 14px;
  margin-left: 2px;
  background: currentColor;
}
.cc-lg .cc-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-right: 8px;
  flex: 0 0 auto;
}
.cc-lg b { font-weight: 400; margin-right: 6px; }

/* 角标主播（演示语境） */
.cc-host-badge {
  position: absolute;
  left: 20px; top: 424px;
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
`;

// 源码 Mascot：Claude Code 像素兽路径（1:1）
const MASCOT_PATH = "M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z";

interface Props {
  logLines?: string;
  prompt?: string;
  capTitle?: string;
  hello?: string;
  metaDsl?: string;
  whatsNewTitle?: string;
  whatsNewDsl?: string;
  placeholder?: string;
  accent?: string;
  addColor?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  typeStart?: number;
  cps?: number;
}

const ClaudeCode: React.FC<Props> = ({
  logLines = DEFAULT_LINES,
  prompt = DEFAULT_PROMPT,
  capTitle = "Claude Code v2.0.0",
  hello = "欢迎回来，阿维！",
  metaDsl = "Opus 4.8 · Max 20x\n~/code/koubo-site",
  whatsNewTitle = "What's new",
  whatsNewDsl = "/agents 创建子智能体\n/security-review 调用审查智能体\nctrl+b 把命令挂到后台\ndim|… /help 查看更多",
  placeholder = "试试「修改 <文件> 让它…」",
  accent = "#D97757",
  addColor = "#33d16b",
  fontSize = 12.5,
  posX = 116,
  posY = 30,
  typeStart = 1.6,
  cps = 11,
}) => {
  const t = useCurrentFrame() / FPS;
  const S = buildSchedule(prompt, parseLines(logLines), typeStart, cps);
  const metas = metaDsl.split("\n").map((l) => l.trim()).filter(Boolean);
  const newsItems = whatsNewDsl.split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => (l.startsWith("dim|") ? { dim: true, text: l.slice(4) } : { dim: false, text: l }));
  const lgHeight = Math.round(fontSize * 1.76);   // 默认 12.5 ⇒ 22px，与模板逐像素一致

  // —— 窗体弹入（源码 spring 略欠阻尼 → back.out(1.05) 的微过冲）——
  const ip = cl(t / FIXED.introDur);
  const ie = ip <= 0 ? 0 : backOut(ip, 1.05);
  const winO = out2(cl(t / (FIXED.introDur * 0.55)));

  // —— 三段错峰淡入：框 → 右栏 → 提示行（顺序 = 阅读顺序）——
  const b = fadeUp(t, FIXED.boxFade);
  const r = fadeUp(t, FIXED.colRFade);
  const p = fadeUp(t, FIXED.promptFade);

  // —— 提示行：逐字揭示（人在敲命令 → 逐字符不分块）——
  const tp = cl((t - S.typeStart) / S.typeDur);
  const n = t < S.typeStart ? 0 : Math.floor(tp * prompt.length);
  const shown = prompt.slice(0, n);
  const showPh = n === 0;                       // 占位文案只在一个字都没打时出现
  const done = t >= S.submitAt;                 // 提交后整行退成灰
  const blink = Math.floor(t * FIXED.cursorHz) % 2 === 0;
  const typing = n > 0 && n < prompt.length;
  const pcurO = done ? 0 : (typing ? 1 : (blink ? 1 : 0));

  const logColor = (k: string) =>
    k === "tool" ? "#E8E5DD" : k === "res" ? "#8A857C" : k === "del" ? "#6B6660"
      : k === "add" ? addColor : k === "ok" ? "#E8E5DD" : "#8A857C";

  return (
    <AbsoluteFill className="cc-root" style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="cc-win" style={{
        left: posX, top: posY,
        opacity: winO,
        transform: `translateY(${FIXED.introY * (1 - ie)}px) scale(${0.97 + 0.03 * ie})`,
        transformOrigin: "center top",
      }}>
        <div className="cc-bar"><i className="cc-r"></i><i className="cc-y"></i><i className="cc-g"></i></div>
        <div className="cc-body">
          <div className="cc-welcome" style={{
            borderWidth: 1, borderStyle: "dashed", borderColor: accent,
            opacity: b.o, transform: `translateY(${b.y}px)`,
          }}>
            <span className="cc-cap" style={{ color: accent }}>{capTitle}</span>
            <div className="cc-cols">
              <div className="cc-colL">
                <div className="cc-hello">{hello}</div>
                <div className="cc-mark">
                  {/* 源码 Mascot：Claude Code 像素兽（1:1） */}
                  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: accent }}>
                    <path clipRule="evenodd" fillRule="evenodd" d={MASCOT_PATH} />
                  </svg>
                </div>
                <div className="cc-meta">
                  {metas.map((m, i) => <div key={i}>{m}</div>)}
                </div>
              </div>
              <div className="cc-colR" style={{
                borderLeftWidth: 1, borderLeftStyle: "dashed", borderLeftColor: accent,
                opacity: r.o, transform: `translateY(${r.y}px)`,
              }}>
                <div className="cc-h" style={{ color: accent }}>{whatsNewTitle}</div>
                <ul>
                  {newsItems.map((item, i) => (
                    <li key={i} className={item.dim ? "cc-dim" : undefined}>{item.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="cc-promptWrap" style={{ opacity: p.o, transform: `translateY(${p.y}px)` }}>
            <div className="cc-rule"></div>
            <div className={"cc-prow" + (done ? " cc-done" : "")} style={{ fontSize: fontSize + 0.5 }}>
              <span className="cc-pr">{"> "}</span>
              <span className="cc-txt">{shown}</span>
              <span className="cc-cur" style={{ opacity: pcurO }}></span>
              <span className="cc-ph" style={{ display: showPh ? "inline" : "none" }}>{placeholder}</span>
            </div>
            {/* —— 智能体日志：分块突进 + 行占位不重排 —— */}
            <div className="cc-log">
              {S.lines.map((s, i) => {
                const on = t >= s.start;
                const linear = on ? Math.floor((t - s.start) * FIXED.logRate) : 0;
                const rev = Math.min(s.len, Math.ceil(linear / FIXED.logChunk) * FIXED.logChunk);
                // 行光标：只在该行未打完时存在（打完即撤，所以停顿段画面真静）
                const co = on && rev < s.len && blink ? 1 : 0;
                // 工具调用的状态点：本次调用出结果之前呼吸，出结果即定亮
                let dotO = on ? 1 : 0;
                if (s.k === "tool") {
                  const nextRes = S.lines[i + 1];
                  const pending = t >= s.start && nextRes && t < nextRes.start;
                  if (pending) {
                    const w = (Math.sin(Math.PI * 2 * (t - s.start) * FIXED.dotHz) + 1) / 2;
                    dotO = 0.35 + 0.65 * w;
                  }
                }
                return (
                  <div key={i} className="cc-lg" style={{
                    height: lgHeight, fontSize, color: logColor(s.k),
                    visibility: on ? "visible" : "hidden",
                  }}>
                    {s.k === "tool" ? <span className="cc-dot" style={{ background: accent, opacity: dotO }}></span> : null}
                    {s.k === "ok" ? <b style={{ color: addColor }}>✓</b> : null}
                    <span>{s.text.slice(0, rev)}</span>
                    <span className="cc-lcur" style={{ opacity: co }}></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="cc-host-badge"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "claude-code",
  name: "编码智能体终端",
  category: "素材呈现",
  durationInFrames: Math.round((DEFAULT_TOTAL + 0.4) * 30),
  accent: "#D97757",
  component: ClaudeCode as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "textarea", key: "logLines",
      label: "智能体日志（每行：类型|延迟s|文本；类型 tool/res/del/add/ok）",
      default: DEFAULT_LINES,
    },
    { type: "text", key: "prompt", label: "命令行提示词（逐字敲出）", default: DEFAULT_PROMPT },
    { type: "text", key: "capTitle", label: "欢迎框标题片", default: "Claude Code v2.0.0" },
    { type: "text", key: "hello", label: "欢迎语", default: "欢迎回来，阿维！" },
    { type: "textarea", key: "metaDsl", label: "左栏信息（每行一条）", default: "Opus 4.8 · Max 20x\n~/code/koubo-site" },
    { type: "text", key: "whatsNewTitle", label: "右栏小标", default: "What's new" },
    { type: "textarea", key: "whatsNewDsl", label: "右栏条目（每行一条；dim| 前缀 = 弱化行）", default: "/agents 创建子智能体\n/security-review 调用审查智能体\nctrl+b 把命令挂到后台\ndim|… /help 查看更多" },
    { type: "text", key: "placeholder", label: "命令行占位文案", default: "试试「修改 <文件> 让它…」" },
    { type: "color", key: "accent", label: "品牌陶土橙（框/标题/状态点）", default: "#D97757" },
    { type: "color", key: "addColor", label: "diff 新增绿（唯一语义色）", default: "#33d16b" },
    { type: "slider", key: "fontSize", label: "日志字号（行高随动）", default: 12.5, min: 10, max: 18, step: 0.5, unit: "px" },
    { type: "number", key: "posX", label: "终端窗 X", default: 116, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "终端窗 Y", default: 30, step: 1, unit: "px" },
    { type: "slider", key: "typeStart", label: "起手静置（开始敲命令）", default: 1.6, min: 0.5, max: 3, step: 0.05, unit: "s" },
    { type: "slider", key: "cps", label: "命令打字速率", default: 11, min: 5, max: 20, step: 0.5, unit: "字/s" },
  ],
};
