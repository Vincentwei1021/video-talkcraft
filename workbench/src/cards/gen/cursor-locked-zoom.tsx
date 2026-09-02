import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, clamp01, lerp, power2InOut } from "../shared";

// cursor-locked-zoom · 光标锁定跟拍 —— 参数化版（源出 tplcards/cursor-locked-zoom.tsx）
// 命门：① 镜头被打字驱动（cursorX 由已揭示字符数反解），不是独立关键帧；
//      ② transform-origin: 0 0 是反解公式成立的前提；③ 打完 0.8s inOut 拉回全景收尾。
// 反解公式、边界钳制、拉回时长与打字线性（匀速）保持 FIXED；开放文案/颜色/焦距/速率/停留。
const FPS = 30;

const FIXED = {
  pullDur: 0.80,     // 拉回全景时长：两端都要收，这是"结束"不是"运镜"
  charW: 0.6,        // 等宽字体字宽系数（Menlo / SFMono 实测值）
  lineH: 32,         // 行高：光标 y 靠"行序 × 行高"算出来
  cmdRow: 2,         // 被跟拍的命令在第几行（0 起算）
  cursorHz: 2,       // 停下后光标闪烁频率
  winL: 100, winT: 78, winW: 760, winH: 384, pad: 20, chromeH: 40, prGap: 8,
};

// —— 演示语境（不属于动效）：一扇灰阶终端窗 760×384（类名加 clz- 前缀防串卡） ——
// 动态部分（终端底色 / 字号 / 文字色 / 相机 transform）全部改内联。
const CSS = `
.clz-term, .clz-term * { margin: 0; padding: 0; box-sizing: border-box; }
.clz-camera {
  position: absolute;
  left: 0; top: 0;
  width: 960px; height: 540px;
  transform-origin: 0 0;
}
.clz-term {
  position: absolute;
  left: 100px; top: 78px;
  width: 760px; height: 384px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.18);
}
.clz-chrome {
  height: 40px;
  flex: 0 0 40px;
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px;
  background: #212126;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.clz-chrome i { width: 11px; height: 11px; border-radius: 50%; background: #4b4b55; }
.clz-path {
  flex: 1; text-align: center;
  font-size: 13px; color: #8b8b95; letter-spacing: 0.2px;
  margin-right: 41px;    /* 三灯占宽，抵掉才是真居中 */
}
.clz-body {
  flex: 1;
  padding: 20px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.clz-line {
  height: 32px;
  display: flex; align-items: center;
  white-space: pre;
}
.clz-line.clz-old { color: #6f6f78; }
.clz-line.clz-out { color: #9b9ba3; }
.clz-pr { color: #6f6f78; }
.clz-gap { width: 8px; flex: 0 0 8px; }
.clz-cur { display: inline-block; width: 2px; margin-left: 1px; }
`;

interface Props {
  cmd?: string;
  path?: string;
  prevCmd?: string;
  prevOut?: string;
  termBg?: string;
  termText?: string;
  fontSize?: number;
  zoom?: number;
  rate?: number;
  holdEnd?: number;
  lead?: number;
}

const CursorLockedZoom: React.FC<Props> = ({
  cmd = "ffmpeg -i raw.mov -vf scale=1080:-2 -crf 18 out.mp4",
  path = "~/code/koubo-demo",
  prevCmd = "ls shots/",
  prevOut = "raw.mov   logo.png   notes.md",
  termBg = "#17171a",
  termText = "#f2f2f4",
  fontSize = 20,
  zoom = 2.65,
  rate = 15,
  holdEnd = 0.75,
  lead = 0.45,
}) => {
  const t = useCurrentFrame() / FPS;
  const C = FIXED;
  const W = 960, H = 540;
  const N = cmd.length;

  // —— 几何：光标锚点的世界坐标 ——
  const charW = fontSize * C.charW;
  const textX = C.winL + C.pad + charW + C.prGap;
  const cursorY = C.winT + C.chromeH + C.pad + C.cmdRow * C.lineH + C.lineH / 2;
  const bx0 = C.winL, bx1 = C.winL + C.winW;
  const by0 = C.winT, by1 = C.winT + C.winH;

  // —— 时间轴：打字 → 停留 → 拉回全景 ——
  const typeDur = Math.max(1e-6, N / rate);
  const tType0 = lead;
  const tType1 = lead + typeDur;
  const tPull0 = tType1 + holdEnd;

  // 打字段：线性揭示（人敲键盘是匀速的；加缓动会读作"机器在渐快渐慢"）
  const revealed = lerp(0, N, clamp01((t - tType0) / typeDur));
  const n = Math.floor(revealed);
  // 收尾：只 tween zoom → 1，位移与重新构图由钳制自动跟出来
  const z = t < tPull0 ? zoom
    : lerp(zoom, 1, power2InOut(clamp01((t - tPull0) / C.pullDur)));

  // ① 反解：相机中心＝光标锚点 ⇒ 光标恒在画面正中
  let cx = textX + n * charW;
  let cy = cursorY;
  // ② 边界钳制：把可视世界矩形关在素材四边之内
  const hw = W / (2 * z), hh = H / (2 * z);
  cx = bx1 - bx0 > 2 * hw ? Math.min(Math.max(cx, bx0 + hw), bx1 - hw) : (bx0 + bx1) / 2;
  cy = by1 - by0 > 2 * hh ? Math.min(Math.max(cy, by0 + hh), by1 - hh) : (by0 + by1) / 2;

  // 光标：打字中实心不闪；打完才 2Hz 闪
  const curOpacity = revealed < N ? 1 : (Math.floor(t * C.cursorHz) % 2 === 0 ? 1 : 0);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div className="clz-camera" style={{
        transform: `translate(${W / 2 - z * cx}px, ${H / 2 - z * cy}px) scale(${z})`,
      }}>
        <div className="clz-term" style={{ background: termBg }}>
          <div className="clz-chrome">
            <i /><i /><i />
            <span className="clz-path">{path}</span>
          </div>
          <div className="clz-body" style={{ fontSize }}>
            <div className="clz-line clz-old"><span className="clz-pr">$</span><span className="clz-gap" />{prevCmd}</div>
            <div className="clz-line clz-out">{prevOut}</div>
            <div className="clz-line" style={{ color: termText }}>
              <span className="clz-pr">$</span><span className="clz-gap" /><span>{cmd.slice(0, n)}</span>
              <span className="clz-cur" style={{
                opacity: curOpacity, background: termText, height: Math.round(fontSize * 1.2),
              }} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "cursor-locked-zoom",
  name: "光标锁定跟拍",
  category: "运镜",
  durationInFrames: 192,
  accent: "#17171a",
  component: CursorLockedZoom as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "cmd", label: "被跟拍的命令", default: "ffmpeg -i raw.mov -vf scale=1080:-2 -crf 18 out.mp4" },
    { type: "text", key: "path", label: "窗标题路径", default: "~/code/koubo-demo" },
    { type: "text", key: "prevCmd", label: "上文命令行", default: "ls shots/" },
    { type: "text", key: "prevOut", label: "上文输出行", default: "raw.mov   logo.png   notes.md" },
    { type: "slider", key: "fontSize", label: "终端字号", default: 20, min: 14, max: 26, step: 1, unit: "px" },
    { type: "color", key: "termBg", label: "终端底色", default: "#17171a" },
    { type: "color", key: "termText", label: "命令文字色", default: "#f2f2f4" },
    { type: "slider", key: "zoom", label: "跟拍焦距", default: 2.65, min: 1.6, max: 3.2, step: 0.05 },
    { type: "slider", key: "rate", label: "打字速率", default: 15, min: 6, max: 30, step: 1, unit: "字/s" },
    { type: "slider", key: "holdEnd", label: "打完停留", default: 0.75, min: 0.2, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.45, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
