import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { lerp, power2InOut, power2Out, tw } from "../shared";

// glass-code-walk · 玻璃代码走读 —— 参数化版（源出 tplcards/glass-code-walk.tsx）
// 命门：① 浮点行号——相机与高亮带同源 ② 每行"停一下再滑走" ③ 读完拉回全景。
// 几何/时刻表全部由代码行数推导（模板本身就是数据驱动），代码换行数节拍自适应。
// 玻璃暗底与背景渐变 FIXED（"玻璃"语义靠可糊的背景成立），开放代码/文件名/token 色/字号/位置/节奏。
const FPS = 30;

const FIXED = {
  lineIn: 0.08,      // 逐行入场间隔
  leadIn: 0.32,      // 块弹入后到逐行入场
  pushDur: 0.55,     // 全景 → 走读焦距的推近
  stepDur: 0.26,     // 行间滑动耗时（inOut：一次"跳行"是有始有终的事件）
  holdEnd: 0.30,     // 最后一行读完的停留
  pullDur: 0.85,     // 拉回全景（同时解除压暗，回到读整体）
  tail: 0.50,
  dimFloor: 0.30,    // 非当前行的压暗底
  blkW: 600, blkH: 440,   // 代码块宽高（世界坐标；也是相机钳制边界）
};

const DEFAULT_CODE = [
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
].join("\n");

// —— 缓动（shared 缺 backOut 曲线工厂，局部补）——
const backOut = (s: number) => (x: number) => {
  const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u;
};

// 极简正则分词（源码 glass-code-block 的 KEYWORDS 集合与正则，1:1）
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

// —— 几何与时刻表：全部由代码文本 + 字号 + 节奏参数推导 ——
function buildLayout(code: string, fontSize: number, blkT: number, dwell: number, zoomHold: number) {
  const raw = code.split("\n");
  const rowFull = Math.round(fontSize * 1.55);     // 默认 17 ⇒ 26（源码 lineHeight 1.55）
  const rowBlank = Math.round(fontSize * 0.8);     // 默认 17 ⇒ 14（源码空行 = fontSize × 0.8）
  const rowH = raw.map((l) => (l.trim() === "" ? rowBlank : rowFull));
  const rowTop: number[] = [];
  {
    let y = 20;                                    // .body padding-top
    raw.forEach((_, i) => { rowTop.push(y); y += rowH[i] + 4; });   // margin-bottom: 4
  }
  const bodyTop = blkT + 1 + 41;                   // ring 1px 描边 + block 内 chrome 40
  const centers = raw.map((_, i) => bodyTop + rowTop[i] + rowH[i] / 2);
  // 走读只停在有内容的行上（空行是排版，不是一句话）
  const stops = raw.map((l, i) => (l.trim() === "" ? -1 : i)).filter((i) => i >= 0);
  const afterIn = FIXED.leadIn + (raw.length - 1) * FIXED.lineIn + 0.26;
  const pushAt = afterIn + 0.10;
  const walkStart = pushAt + FIXED.pushDur + dwell;
  const walkEnd = walkStart + (Math.max(stops.length, 1) - 1) * (FIXED.stepDur + dwell);
  const pullAt = walkEnd - dwell + FIXED.holdEnd + zoomHold;
  const total = pullAt + FIXED.pullDur + FIXED.tail;
  return { raw, rowH, rowTop, centers, stops, pushAt, walkStart, pullAt, total };
}
const DEFAULT_TOTAL = buildLayout(DEFAULT_CODE, 17, 50, 0.32, 0).total;

/* —— 源码原始视觉 1:1（glassColor / 渐变描边 / chrome / token 五色）——
      动态项（块位置 / 行高 / token 色）改内联；类名加 gcw- 前缀。 —— */
const CSS = `
.gcw-camera {
  position: absolute;
  left: 0; top: 0;
  width: 960px; height: 540px;
  transform-origin: 0 0;
}
.gcw-ring {
  position: absolute;
  width: 600px; height: 440px;
  padding: 1px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 100%);
  box-shadow: 0 50px 120px rgba(0, 0, 0, 0.55);
  box-sizing: border-box;
}
.gcw-block {
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
.gcw-chrome {
  flex: 0 0 40px;
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  box-sizing: border-box;
}
.gcw-chrome i { width: 12px; height: 12px; border-radius: 50%; display: block; opacity: 0.6; }
.gcw-chrome .gcw-l1 { background: #ff5f57; }
.gcw-chrome .gcw-l2 { background: #febc2e; }
.gcw-chrome .gcw-l3 { background: #28c840; }
.gcw-chrome .gcw-name {
  flex: 1; text-align: center;
  font-size: 12px; letter-spacing: 0.02em;
  color: #a1a1aa;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  margin: 0 44px 0 0;   /* 抵掉三灯 + gap 占宽才是真居中 */
}
.gcw-body {
  position: relative;
  flex: 1;
  padding: 20px 24px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  box-sizing: border-box;
}
/* 行必须是 block 而不是 flex：flex 容器会丢掉纯空白的匿名子项 */
.gcw-line {
  position: relative;
  white-space: pre;
  color: #e4e4e7;            /* 源码 TOKEN_COLORS.code */
  z-index: 1;
  margin: 0 0 4px;           /* 源码 gap: 4 */
}
.gcw-line .gcw-ln { display: inline-block; width: 28px; color: #3f3f46; }
.gcw-c { color: #52525b; }   /* comment（固定，语义弱色） */
/* 走读高亮带：与相机同源（同一个 linePos 推出来） */
.gcw-band {
  position: absolute;
  left: 8px; right: 8px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.7);
  z-index: 0;
  pointer-events: none;
}
`;

interface Props {
  code?: string;
  fileName?: string;
  keywordColor?: string;
  stringColor?: string;
  numberColor?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  zoom?: number;
  dwell?: number;
  lead?: number;
}

const GlassCodeWalk: React.FC<Props> = ({
  code = DEFAULT_CODE,
  fileName = "scene.tsx",
  keywordColor = "#c4b5fd",
  stringColor = "#86efac",
  numberColor = "#fcd34d",
  fontSize = 17,
  posX = 180,
  posY = 50,
  zoom: zoomProp = 1.68,
  dwell = 0.32,
  lead = 0,
}) => {
  const t = useCurrentFrame() / FPS - lead;   // 整体延后：时间轴统一平移
  const W = 960, H = 540;
  const L = buildLayout(code, fontSize, posY, dwell, 0);
  const tokens = L.raw.map(tokenize);
  const rowFull = Math.round(fontSize * 1.55);
  const rowBlank = Math.round(fontSize * 0.8);
  const tokenColor: Record<string, string> = { k: keywordColor, s: stringColor, n: numberColor };

  // 1. 玻璃块弹入（位移先动、淡入独立窗）
  const rp = tw(t, 0, 0.55, backOut(1.3));
  const ringY = lerp(16, 0, rp);
  const ringS = lerp(0.965, 1, rp);
  const ringO = tw(t, 0.06, 0.34, power2Out);

  // 3/5. 推近到走读焦距 → 收尾拉回全景（zoom 与 dimAmt 同一条 tween）
  const zoom = t < L.pullAt
    ? lerp(1, zoomProp, tw(t, L.pushAt, FIXED.pushDur, power2InOut))
    : lerp(zoomProp, 1, tw(t, L.pullAt, FIXED.pullDur, power2InOut));
  const dimAmt = t < L.pullAt
    ? tw(t, L.pushAt, FIXED.pushDur, power2InOut)
    : 1 - tw(t, L.pullAt, FIXED.pullDur, power2InOut);

  // 4. 走读：每行停一下（dwell）再滑到下一行（stepDur, inOut）
  let linePos: number = L.stops[0] ?? 0;
  for (let k = 1; k < L.stops.length; k++) {
    const tk = L.walkStart + (k - 1) * (FIXED.stepDur + dwell);
    if (t <= tk) break;
    linePos = lerp(L.stops[k - 1], L.stops[k], tw(t, tk, FIXED.stepDur, power2InOut));
  }

  // 浮点行号 → 行心 y（在相邻行之间线性插值）
  const lo = Math.max(0, Math.min(L.raw.length - 1, Math.floor(linePos)));
  const hi = Math.min(L.raw.length - 1, lo + 1);
  const f = linePos - lo;
  const trk = {
    y: L.centers[lo] + (L.centers[hi] - L.centers[lo]) * f,
    top: L.rowTop[lo] + (L.rowTop[hi] - L.rowTop[lo]) * f,
    h: L.rowH[lo] + (L.rowH[hi] - L.rowH[lo]) * f,
  };

  // ① 反解：把锚点搬到画面正中。x 恒取块心——读代码是整行读，横向不跟字符
  let cx = posX + FIXED.blkW / 2;
  let cy = trk.y;
  // ② 边界钳制：可视世界矩形关在代码块四边内
  const hw = W / (2 * zoom), hh = H / (2 * zoom);
  const x0 = posX, x1 = posX + FIXED.blkW, y0 = posY, y1 = posY + FIXED.blkH;
  cx = x1 - x0 > 2 * hw ? Math.min(Math.max(cx, x0 + hw), x1 - hw) : (x0 + x1) / 2;
  cy = y1 - y0 > 2 * hh ? Math.min(Math.max(cy, y0 + hh), y1 - hh) : (y0 + y1) / 2;

  return (
    <AbsoluteFill style={{
      color: "#1d1d1f", overflow: "hidden",
      // 舞台底：复刻源码 previewBackdrop 的色调。玻璃拟态需要背景有内容可折射。
      background:
        "radial-gradient(ellipse 55% 45% at 18% 12%, rgba(186, 127, 90, 0.95) 0%, rgba(129, 94, 69, 0.5) 45%, transparent 72%)," +
        "radial-gradient(ellipse 45% 40% at 8% 42%, rgba(147, 95, 64, 0.75) 0%, transparent 68%)," +
        "radial-gradient(ellipse 60% 55% at 88% 78%, rgba(9, 20, 22, 0.9) 0%, transparent 70%)," +
        "linear-gradient(135deg, #6d4c37 0%, #2a2019 34%, #131a1b 62%, #0a0e0f 100%)",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="gcw-camera" style={{
        transform: `translate(${W / 2 - zoom * cx}px, ${H / 2 - zoom * cy}px) scale(${zoom})`,
      }}>
        <div className="gcw-ring" style={{
          left: posX, top: posY,
          opacity: ringO,
          transform: `translateY(${ringY}px) scale(${ringS})`,
          transformOrigin: "50% 50%",
        }}>
          <div className="gcw-block">
            <div className="gcw-chrome">
              <i className="gcw-l1"></i><i className="gcw-l2"></i><i className="gcw-l3"></i>
              <span className="gcw-name">{fileName}</span>
            </div>
            <div className="gcw-body" style={{ fontSize }}>
              {/* ③ 高亮带与相机同源：同一个 linePos 推出来，所以两者不可能失步 */}
              <div className="gcw-band" style={{
                top: trk.top - 4,
                height: trk.h + 8,
                opacity: dimAmt,
              }}></div>
              {L.raw.map((line, i) => {
                // 2. 逐行入场：y 6→0 + 淡入，行距 0.08s
                const ep = tw(t, FIXED.leadIn + i * FIXED.lineIn, 0.26, power2Out);
                // 压暗：离当前行越远越暗（连续量 ⇒ 带子滑到两行之间时两行同时半亮）
                const near = Math.max(0, 1 - Math.abs(i - linePos));
                const lvl = FIXED.dimFloor + (1 - FIXED.dimFloor) * near;
                const dimO = 1 - dimAmt * (1 - lvl);
                const blank = line.trim() === "";
                const h = blank ? rowBlank : rowFull;
                return (
                  <div key={i} className="gcw-line"
                       style={{ height: h, lineHeight: `${h}px`,
                                opacity: ep * dimO, transform: `translateY(${6 * (1 - ep)}px)` }}>
                    <span className="gcw-ln">{String(i + 1).padStart(2, " ")}</span>
                    {tokens[i].map(([k, tk], j) =>
                      k === "c" ? <span key={j} className="gcw-c">{tk}</span>
                        : k ? <span key={j} style={{ color: tokenColor[k] }}>{tk}</span>
                          : <React.Fragment key={j}>{tk}</React.Fragment>
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
};

export const card: CardDef = {
  id: "glass-code-walk",
  name: "玻璃代码走读",
  category: "素材呈现",
  durationInFrames: Math.round((DEFAULT_TOTAL + 0.4) * 30),
  accent: "#c4b5fd",
  component: GlassCodeWalk as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "textarea", key: "code", label: "代码（逐行；空行只排版不停留，节拍随行数自适应）", default: DEFAULT_CODE },
    { type: "text", key: "fileName", label: "窗栏文件名", default: "scene.tsx" },
    { type: "color", key: "keywordColor", label: "关键字色", default: "#c4b5fd" },
    { type: "color", key: "stringColor", label: "字符串色", default: "#86efac" },
    { type: "color", key: "numberColor", label: "数字色", default: "#fcd34d" },
    { type: "slider", key: "fontSize", label: "代码字号（行高/相机随动）", default: 17, min: 12, max: 22, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "代码块 X", default: 180, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "代码块 Y", default: 50, step: 1, unit: "px" },
    { type: "slider", key: "zoom", label: "走读焦距（1.5~1.8 整行完整在画幅内）", default: 1.68, min: 1.4, max: 1.9, step: 0.01 },
    { type: "slider", key: "dwell", label: "每行停留", default: 0.32, min: 0.15, max: 1, step: 0.01, unit: "s" },
    { type: "slider", key: "lead", label: "整体延后（对齐口播）", default: 0, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
