import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";

// error-retype · 打字改口 —— 自包含 Remotion 源码（与 demos/error-retype/index.html 同画面）
// 句干先在，后半句以打字机节奏打出"错的那半句"→ 停一拍、光标闪两下（犹豫）→ 更快地退掉 → 零犹豫重打"对的那半句"。
// 复制本文件进你的工程即可用；文案经 props 注入（prefix / first / second），不传 = demo 文案。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 177 };   // 5.51s 镜头 + 0.4s 收尾（4 字 → 4 字）

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 三档速度差必须可感（打 0.09 / 删 0.06 / 重打 0.06 s/字）——等速改口读作 bug 不是戏；
//      ② 光标三态：打删常亮 = 果断、停顿闪两下 = 犹豫、完稿闪两下后摘除（残留 0.05 opacity 都毁真静止）；
//      ③ 字符固定宽槽位左缘锚定（变宽字体整串测宽会逐帧重排抖动）；④ 字符出现是帧确定的硬切，任何缓动打字都读作加载动画。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  prefixIn: 0.1,    // 句干淡入起点 s（0.3s）
  typeAt: 0.7,      // 开始打错句的时刻 s
  type: 0.09,       // 打：每字 s（母本 2f，中文放慢让观众读得出字）
  pause: 0.55,      // 打完后的停顿 s（"犹豫"）：光标在这段里闪两下
  del: 0.06,        // 删：每字 s——比打快，是"果断退掉"
  gap: 0.12,        // 删完到重打之间的空档 s
  retype: 0.06,     // 重打：每字 s，与删同速、零犹豫
  settle: 0.3,      // 重打完到光标闪两下的间隔 s
  blink: 0.13,      // 光标闪烁半周期 s（4f）：闪两下 = 4 个半周期
  cursorOff: 0.55,  // 完稿闪两下起、多少秒后光标条件摘除
  holdEnd: 2.6,     // 完稿后静置 s（≥50f 真静止）
  exitDur: 0.4,     // 整句同收（power2.in）
  slotW: 44,        // 每字符槽宽 px
};

/* 时间表（demo 秒，4 字 → 4 字）
   0.10–0.40  句干淡入
   0.70 / 0.79 / 0.88 / 0.97  逐字打出"模型大小"（硬切，光标常亮）
   1.06–1.58  停顿：光标闪两下（0.13s 半周期）
   1.61 / 1.67 / 1.73 / 1.79  逐字退掉（更快）
   1.97 / 2.03 / 2.09 / 2.15  零犹豫重打"讲述方法"
   2.51–3.03  完稿闪两下；3.06 光标摘除
   5.11–5.51  整句同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2In = (x: number) => x * x * x;

// —— 演示语境（不属于动效）：样式照搬 demo（类名 ert- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.ert-tw { position: absolute; top: 240px; height: 60px; display: flex; align-items: center; font-size: 40px; font-weight: 700; letter-spacing: -.5px; color: #1d1d1f; white-space: nowrap; }
.ert-slot span { display: inline-block; width: 44px; text-align: center; }
.ert-cur { display: inline-block; width: 6px; height: 46px; margin-left: 4px; border-radius: 2px; }
.ert-meas { position: absolute; left: 0; top: 0; visibility: hidden; white-space: nowrap; font-size: 40px; font-weight: 700; letter-spacing: -.5px; }
`;

type Props = {
  /** 句干（先在，不动） */
  prefix?: string;
  /** 错的半句（打出后被退掉） */
  first?: string;
  /** 对的半句（零犹豫重打） */
  second?: string;
  /** 光标颜色（唯一强调色） */
  accent?: string;
};

export default function ErrorRetype({ prefix = "口播做得好，靠的是", first = "模型大小", second = "讲述方法", accent = "#0066cc" }: Props) {
  const t = useCurrentFrame() / FPS;
  const N = Math.max(first.length, second.length);

  // 静态几何只量一次：句干宽 → 整句按"句干 + N 槽位 + 光标"总宽居中
  const measRef = useRef<HTMLSpanElement>(null);
  const [prefixW, setPrefixW] = useState<number | null>(null);
  const [handle] = useState(() => delayRender("error-retype: measure prefix width"));
  useLayoutEffect(() => {
    setPrefixW(measRef.current?.offsetWidth ?? prefix.length * 40);
    continueRender(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const left = Math.round((960 - ((prefixW ?? prefix.length * 40) + N * CONFIG.slotW + 4 + 6)) / 2);

  // 时间表
  const tType = CONFIG.typeAt, tB1 = tType + first.length * CONFIG.type, tDel = tB1 + CONFIG.pause,
        tRe = tDel + first.length * CONFIG.del + CONFIG.gap, tB2 = tRe + second.length * CONFIG.retype + CONFIG.settle,
        tOff = tB2 + CONFIG.cursorOff, exitAt = tB2 + CONFIG.holdEnd;

  // 当前已打出的字数与用哪个词（帧确定的阶梯，无插值）
  let n = 0, word = first;
  if (t >= tRe) { word = second; n = Math.min(second.length, Math.floor((t - tRe) / CONFIG.retype) + 1); }
  else if (t >= tDel) { n = Math.max(0, first.length - 1 - Math.floor((t - tDel) / CONFIG.del)); }
  else if (t >= tType) { n = Math.min(first.length, Math.floor((t - tType) / CONFIG.type) + 1); }

  // 光标：默认常亮；两次"闪两下"窗口里按半周期方波；完稿后条件摘除
  const blinkOn = (t0: number) => { const k = Math.floor((t - t0) / CONFIG.blink); return k >= 4 ? 1 : (k % 2 === 0 ? 0 : 1); };
  let cursor = 1;
  if (t >= tOff) cursor = 0;
  else if (t >= tB2) cursor = blinkOn(tB2);
  else if (t >= tB1 && t < tB1 + 4 * CONFIG.blink) cursor = blinkOn(tB1);

  const prefixK = tw(t, CONFIG.prefixIn, 0.3, power1Out);
  const exitK = 1 - tw(t, exitAt, CONFIG.exitDur, power2In);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="ert-tw" style={{ left }}>
        <span style={{ opacity: prefixK * exitK }}>{prefix}</span>
        <span className="ert-slot" style={{ opacity: exitK }}>
          {Array.from({ length: N }, (_, k) => <span key={k}>{k < n ? word[k] : ""}</span>)}
        </span>
        {/* 光标钉在最后一字后：空槽仍占位，用 x 补偿 */}
        <span className="ert-cur" style={{ background: accent, opacity: cursor, transform: `translateX(${-(N - n) * CONFIG.slotW}px)` }} />
      </div>
      {/* 隐形尺子 */}
      <span className="ert-meas" ref={measRef}>{prefix}</span>
    </AbsoluteFill>
  );
}
