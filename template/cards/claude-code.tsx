import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// claude-code · Claude Code 终端自演 —— 自包含 Remotion 源码（与 demos/claude-code/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。

// ===== 可摘走的核心：CONFIG + buildSchedule() + paint(t) =====
// 搬运自 remocn registry/remocn/claude-code/index.tsx（30fps，帧 → 秒）：
//   窗体 spring(damping14/stiffness110/mass0.7) 弹入 → 0.62s，位移 28px、scale .97→1
//   三段错峰 fadeUpAt：欢迎框[6,22] / What's new 栏[12,30] / 提示行[18,36]
//     → 0.20 / 0.40 / 0.60s 起，各 0.53s，各带 9px 上移
//     （**错峰顺序 = 阅读顺序**：先框、再右栏、最后提示行；这是本卡入场的全部编排）
//   TYPING_START_FRAME 48 → 1.60s 起打；TYPING_CPS 18（ASCII）→ 中英混排命令用 11 字/s
// 源码止于"命令已打完"（160 帧 = 5.33s 定格）——它只演到人按下回车之前。
// 本卡往后补编码智能体真正的循环：**工具调用 → 结果 → diff → 结论**。
// 这一段的手感纪律与 terminal-typing-log 同源（分块突进 + 零插值 + 行占位不重排）。
const CONFIG = {
  introDur: 0.62,        // 窗体弹入时长（源码 spring）
  introY: 21,            // 窗体位移 px（源码 28 × 0.75 等比）
  boxFade: [0.20, 0.73] as [number, number],   // 欢迎框淡入窗（源码 fadeUpAt[6,22]）
  colRFade: [0.40, 1.00] as [number, number],  // What's new 栏（源码 [12,30]）
  promptFade: [0.60, 1.20] as [number, number],// 提示行（源码 [18,36]）
  fadeUpY: 9,            // 淡入自带的位移 px（源码 12 × 0.75）
  typeStart: 1.60,       // 起打（源码第 48 帧）
  cps: 11,               // 命令打字速率 字/s（中英混排；源码 18 是纯 ASCII 速率）
  submitGap: 0.36,       // 打完到按回车的停顿（手指抬起再敲那一下）
  cursorHz: 2,           // 方块光标闪烁（终端行业默认）
  logRate: 54,           // 日志线性揭示速率 char/s（分块前的底速）
  logChunk: 3,           // 日志分块粒度：文字成簇蹦出，不是一字一滴
  dotHz: 1.1,            // 工具调用中的状态点呼吸频率
  tail: 0.9,             // 尾巴留白 s
  prompt: "改 src/theme.ts，加一个深色模式开关",
  // 智能体工作日志：k = tool（工具调用，带状态点）/ res（结果，带 ⎿ 折角）
  //   / del（diff 删除，灰）/ add（diff 新增，唯一语义色）/ ok（结论）
  //   d = 行间延迟 s（**不等距**——工具调用前等得久（它在想调什么），
  //   diff 两行几乎连着出（同一次编辑的两半），结论前再顿一下）
  lines: [
    { k: "tool", t: "Read(src/theme.ts)",                  d: 0.42 },
    { k: "res",  t: "⎿ 读取 142 行",                        d: 0.50 },
    { k: "tool", t: "Edit(src/theme.ts)",                  d: 0.28 },
    { k: "del",  t: "  - const theme = lightTheme",        d: 0.34 },
    { k: "add",  t: "  + const theme = useColorScheme()",  d: 0.14 },
    { k: "res",  t: "⎿ 已改 1 处，新增 8 行",                d: 0.32 },
    { k: "ok",   t: "深色模式开关已接好，跑 pnpm dev 看效果",   d: 0.44 },
  ] as { k: string; t: string; d: number }[],
};

// —— 时刻表：一遍算完所有时刻点，运行时只查表 ——
// 揭示真正结束于 linear = len − chunk + 1（分块会把最后一簇提前填满），
// 用它当下一行的排期基准，否则 chunk>1 时后一行会压着前一行开打。
function buildSchedule() {
  const S = {} as { typeStart: number; typeDur: number; typeEnd: number; submitAt: number;
    lines: { start: number; end: number; len: number; text: string; k: string }[]; total: number };
  S.typeStart = CONFIG.typeStart;
  S.typeDur = CONFIG.prompt.length / CONFIG.cps;
  S.typeEnd = S.typeStart + S.typeDur;
  S.submitAt = S.typeEnd + CONFIG.submitGap;
  let acc = S.submitAt;
  S.lines = CONFIG.lines.map((l) => {
    acc += l.d;
    const start = acc;
    const dur = Math.max(l.t.length - CONFIG.logChunk + 1, 1) / CONFIG.logRate;
    acc = start + dur;
    return { start, end: start + dur, len: l.t.length, text: l.t, k: l.k };
  });
  S.total = acc + CONFIG.tail;
  return S;
}
const S = buildSchedule();

export const meta = { width: 960, height: 540, fps: 30, durationInFrames: Math.round((S.total + 0.4) * 30) };

const FPS = meta.fps;

// —— 缓动（手写版，对应 power2.out / back.out）——
const cl = (v: number) => Math.max(0, Math.min(1, v));
const out2 = (p: number) => 1 - (1 - p) * (1 - p);
const backOut = (p: number, k: number) => 1 + (k + 1) * Math.pow(p - 1, 3) + k * Math.pow(p - 1, 2);
// 一段淡入 = 独立的 opacity 窗 + 自带 9px 位移（源码 fadeUpAt）
const fadeUp = (t: number, w: [number, number]) => {
  const p = cl((t - w[0]) / (w[1] - w[0]));
  return { o: p, y: CONFIG.fadeUpY * (1 - p) };
};

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

/* —— 产品皮 = 内容本身（2026-08-25 用户定版：完全还原产品样式）——
      本卡涉及真实产品界面（Claude Code 终端），所以**不做中性化**：
      全部取值照抄 registry/remocn/claude-code/index.tsx 的 THEMES.dark + accentColor：
        page #2B2A28 / windowBar #3A3633 / windowBody #1B1A18
        fg #E8E5DD / fgMuted #8A857C / fgDim #6B6660 / boxBorder = accent #D97757
      陶土橙 #D97757 是 Claude 的品牌色，用在：虚线框、骑边标题、What's new 小标、吉祥物。
      窗饰三灯用 macOS 真色（源码 #FF5F57 / #FEBC2E / #28C840）。
      吉祥物用源码那枚 Claude Code 像素兽路径（1:1 照抄 index.tsx 的 Mascot）。 —— */
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */
.win {
  position: absolute;
  left: 116px; top: 30px;
  width: 800px; height: 456px;
  border-radius: 12px;              /* 源码 borderRadius: 12 */
  overflow: hidden;
  background: #1B1A18;              /* THEMES.dark.windowBody */
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.6);   /* 源码 boxShadow */
}
.bar {
  height: 32px;
  flex: 0 0 32px;
  display: flex;
  align-items: center;
  gap: 8px;                          /* 源码 gap: 8 */
  padding: 0 14px;
  background: #3A3633;               /* THEMES.dark.windowBar */
}
.bar i { width: 10px; height: 10px; border-radius: 50%; display: block; }
.bar .r { background: #FF5F57; }     /* macOS 真色（源码照抄） */
.bar .y { background: #FEBC2E; }
.bar .g { background: #28C840; }

.body {
  flex: 1;
  padding: 18px;
  display: flex;
  flex-direction: column;
  /* Claude Code 跑在等宽终端里（源码用 JetBrains Mono；这里走系统等宽栈，不引外网） */
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
}

/* 欢迎框：陶土橙虚线框 + 骑在上边框的标题片（标题片用窗体底色盖住那一段虚线，
   所以标题看着是"嵌"在边框上的——源码这处细节） */
.welcome {
  position: relative;
  border: 1px dashed #D97757;        /* 源码 boxBorder = accentColor */
  border-radius: 6px;                /* 源码 borderRadius: 6 */
  padding: 18px 16px 15px;
}
.welcome .cap {
  position: absolute;
  top: -8px; left: 16px;
  padding: 0 8px;
  background: #1B1A18;               /* 窗体底色盖虚线 */
  color: #D97757;                    /* 源码 color: accentColor */
  font-size: 12px;
  font-weight: 700;
}
.cols { display: flex; }
.colL {
  width: 42%;                        /* 源码 width: "42%" */
  padding-right: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  box-sizing: border-box;
}
.hello { font-size: 14px; color: #E8E5DD; }      /* 源码 fontSize 20 / fg（等比 0.72） */
/* 吉祥物：源码 Mascot 的像素兽路径，fill = accentColor（源码 size 96 → 等比 68） */
.mark { align-self: center; }
.mark svg { display: block; width: 68px; height: 68px; fill: #D97757; }
.meta { display: flex; flex-direction: column; gap: 3px; }
.meta div { font-size: 11.5px; color: #8A857C; }  /* 源码 fgMuted */

.colR {
  width: 58%;                        /* 源码 width: "58%" */
  padding-left: 16px;
  border-left: 1px dashed #D97757;   /* 源码 borderLeft: 1px dashed border */
  box-sizing: border-box;
}
.colR .h { font-size: 11.5px; font-weight: 700; color: #D97757; margin-bottom: 8px; }
.colR ul { list-style: none; display: flex; flex-direction: column; gap: 5px; }
.colR li { font-size: 11px; color: #E8E5DD; }     /* 源码 fg */
.colR li.dim { color: #6B6660; }                  /* 源码 fgDim */

/* 提示行区（源码第三段错峰）：分隔线 + "> " + 打字 */
.promptWrap { margin-top: 16px; }
.rule { height: 1px; background: #6B6660; opacity: 0.4; margin-bottom: 11px; }  /* 源码 fgDim / .4 */
.prow {
  display: flex;
  align-items: center;
  font-size: 13px;
  white-space: pre;
}
.prow .pr { color: #8A857C; }
.prow .txt { color: #E8E5DD; }
.prow.done .txt { color: #8A857C; }   /* 已提交的那一行退成灰——"这句已经交出去了" */
/* 方块光标：源码 Caret width 11 / height 22（等比 8×16），2Hz 闪 */
.cur {
  display: inline-block;
  width: 8px; height: 16px;
  margin-left: 2px;
  background: #E8E5DD;
  flex: 0 0 auto;
}
.prow .ph { color: #8A857C; }

/* 智能体工作日志：工具调用 → 结果 → diff → 结论 */
.log { margin-top: 10px; display: flex; flex-direction: column; }
.lg {
  height: 22px;
  display: flex;
  align-items: center;
  font-size: 12.5px;
  white-space: pre;
  color: #8A857C;
}
.lg.tool { color: #E8E5DD; }                           /* 工具调用行：亮 */
.lg.res  { color: #8A857C; }                           /* 结果行：暗（带 ⎿ 折角） */
.lg.del  { color: #6B6660; }                           /* diff 删除行：灰（不用红——语义色只留一支） */
.lg.add  { color: #33d16b; }                           /* diff 新增行：唯一语义色 */
.lg.ok   { color: #E8E5DD; }
.lg.ok b { color: #33d16b; font-weight: 400; margin-right: 6px; }
.lg .lcur {
  display: inline-block;
  width: 7px; height: 14px;
  margin-left: 2px;
  background: currentColor;
}
/* 工具调用行的状态点：Claude Code 真界面用陶土橙的 ⏺ 圆点；调用中呼吸、出结果即定亮（不做抖动） */
.lg .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #D97757;
  margin-right: 8px;
  flex: 0 0 auto;
}

/* 角标主播（演示语境） */
.host-badge {
  position: absolute;
  left: 20px; top: 424px;
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
`;

export default function ClaudeCode({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const N = S.lines.length;

  // —— 窗体弹入（源码 spring 略欠阻尼 → back.out(1.05) 的微过冲）——
  const ip = cl(t / CONFIG.introDur);
  const ie = ip <= 0 ? 0 : backOut(ip, 1.05);
  const winO = out2(cl(t / (CONFIG.introDur * 0.55)));

  // —— 三段错峰淡入：框 → 右栏 → 提示行（顺序 = 阅读顺序）——
  const b = fadeUp(t, CONFIG.boxFade);
  const r = fadeUp(t, CONFIG.colRFade);
  const p = fadeUp(t, CONFIG.promptFade);

  // —— 提示行：逐字揭示（人在敲命令 → 逐字符不分块）——
  const tp = cl((t - S.typeStart) / S.typeDur);
  const n = t < S.typeStart ? 0 : Math.floor(tp * CONFIG.prompt.length);
  const shown = CONFIG.prompt.slice(0, n);
  const showPh = n === 0;                       // 占位文案只在一个字都没打时出现
  // 提交后整行退成灰——"这句已经交出去了"，与下面的日志分出层次
  const done = t >= S.submitAt;
  // 光标：打字中实心不闪；未开打 / 打完待提交 才 2Hz 闪；提交后即撤（交给日志）
  const blink = Math.floor(t * CONFIG.cursorHz) % 2 === 0;
  const typing = n > 0 && n < CONFIG.prompt.length;
  const pcurO = done ? 0 : (typing ? 1 : (blink ? 1 : 0));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="win" style={{
        opacity: winO,
        transform: `translateY(${CONFIG.introY * (1 - ie)}px) scale(${0.97 + 0.03 * ie})`,
        transformOrigin: "center top",
      }}>
        <div className="bar"><i className="r"></i><i className="y"></i><i className="g"></i></div>
        <div className="body">
          <div className="welcome" style={{ opacity: b.o, transform: `translateY(${b.y}px)` }}>
            <span className="cap">Claude Code v2.0.0</span>
            <div className="cols">
              <div className="colL">
                <div className="hello">欢迎回来，阿维！</div>
                <div className="mark">
                  {/* 源码 Mascot：Claude Code 像素兽（1:1 照抄 index.tsx 的 path） */}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path clipRule="evenodd" fillRule="evenodd" d="M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z" />
                  </svg>
                </div>
                <div className="meta">
                  <div>Opus 4.8 · Max 20x</div>
                  <div>~/code/koubo-site</div>
                </div>
              </div>
              <div className="colR" style={{ opacity: r.o, transform: `translateY(${r.y}px)` }}>
                <div className="h">What's new</div>
                <ul>
                  <li>/agents 创建子智能体</li>
                  <li>/security-review 调用审查智能体</li>
                  <li>ctrl+b 把命令挂到后台</li>
                  <li className="dim">… /help 查看更多</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="promptWrap" style={{ opacity: p.o, transform: `translateY(${p.y}px)` }}>
            <div className="rule"></div>
            <div className={"prow" + (done ? " done" : "")}>
              <span className="pr">{"> "}</span>
              <span className="txt">{shown}</span>
              <span className="cur" style={{ opacity: pcurO }}></span>
              <span className="ph" style={{ display: showPh ? "inline" : "none" }}>试试「修改 &lt;文件&gt; 让它…」</span>
            </div>
            {/* —— 智能体日志：分块突进 + 行占位不重排（与 terminal-typing-log 同源的手感纪律）—— */}
            <div className="log">
              {S.lines.map((s, i) => {
                const on = t >= s.start;
                const linear = on ? Math.floor((t - s.start) * CONFIG.logRate) : 0;
                const rev = Math.min(s.len, Math.ceil(linear / CONFIG.logChunk) * CONFIG.logChunk);
                // 行光标：只在该行未打完时存在（打完即撤，所以停顿段画面真静）
                const co = on && rev < s.len && blink ? 1 : 0;
                // 工具调用的状态点：本次调用出结果之前呼吸，出结果即定亮
                let dotO = on ? 1 : 0;
                if (s.k === "tool") {
                  const nextRes = S.lines[i + 1];
                  const pending = t >= s.start && nextRes && t < nextRes.start;
                  if (pending) {
                    const w = (Math.sin(Math.PI * 2 * (t - s.start) * CONFIG.dotHz) + 1) / 2;
                    dotO = 0.35 + 0.65 * w;
                  }
                }
                return (
                  <div key={i} className={"lg " + s.k} style={{ visibility: on ? "visible" : "hidden" }}>
                    {s.k === "tool" ? <span className="dot" style={{ opacity: dotO }}></span> : null}
                    {s.k === "ok" ? <b>✓</b> : null}
                    <span>{s.text.slice(0, rev)}</span>
                    <span className="lcur" style={{ opacity: co }}></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="host-badge"><Host src={hostSrc} /></div>
    </AbsoluteFill>
  );
}
