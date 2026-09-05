import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";

// countdown-arc-scatter · 数字弧落标题 —— 自包含 Remotion 源码（与 demos/countdown-arc-scatter/index.html 同画面）
// 一串相邻递减的数字切向排在弧上，整盘 96° 扫回 0° 急停，选中数停在弧顶后平移到标题首字位并回正，
// 其余数字原地失焦散去，标题逐词解糊、末词染强调色。
// 复制本文件进你的工程即可用；文案经 props 注入（numbers / pick / words / accent），不传 = demo 文案。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 162 };   // 5.0s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 扫动 outCubic 的减速急停是"到位"的全部力道（改 inOut 就没有仪表的干脆）；② 数字用角度算透明度（±70° 外全透）——
//      是"转进视野"不是遮罩；③ 选中数落位窗紧接扫停、不留静置（留了就断成两个动作），落位与回正同一条曲线；
//      ④ 其余数字原地失焦散去不位移（位移会跟落位抢戏），且比落位早 0.02 起手先让路；⑤ 刻度 0.35 倍差速。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  step: 24,          // 相邻数字夹角 °
  R: 150,            // 数字弧半径 px（<100 挤成小圈，>220 弧近乎直线）
  sweepFrom: 96,     // 起始盘角 °：96° ≈ 扫过 4 格
  sweepAt: 0.3,      // 开始扫动的时刻 s
  sweep: 0.57,       // 扫动时长 s（power2.out 急停；≈17 帧）
  outAt: 0.85,       // 其余数字开始散去 s（比落位早 0.02，先让路）
  outDur: 0.3,       // 散去时长 s（power1.in：opacity→0 + blur 3px，不位移）
  handAt: 0.87,      // 选中数开始落位 s（紧接扫停）
  handDur: 0.3,      // 落位 + 回正 s（power2.inOut，同一条曲线）
  wordsAt: 0.95,     // 标题第一词开始解糊 s
  wordStagger: 0.15, // 逐词错峰 s（窗重叠约 0.2 才读作"一句话"）
  wordDur: 0.35,     // 每词解糊 s（blur 6→0 + 淡入，power2.out）
  accentAt: 1.75,    // 末词染强调色起点 s（全卡唯一颜色事件）
  accentDur: 0.25,   // 染色时长 s
  tickN: 15,         // 刻度数
  tickStep: 12,      // 刻度夹角 °
  tickRatio: 0.35,   // 刻度跟转比例（盘 vs 指针的层次来源；1.0 读作一整块贴图在转）
  visAngle: 70,      // 可视角窗 °（|位置角| > 70 全透，70→48 渐显）
  visFeather: 22,    // 渐变宽度 °
  exitAt: 4.6,       // 整幕同收起点 s
  exitDur: 0.4,      // 同收时长（power2.in）
};

/* 时间表（demo 秒）
   0.30–0.87  整盘 96°→0° 扫回（power2.out 急停），数字按位置角"转进视野"
   0.85–1.15  其余数字原地 opacity→0 + blur 3（power1.in）
   0.87–1.17  选中数平移到标题首字位并回正（power2.inOut）
   0.95 / 1.10 / 1.25  标题三词各 0.35s 解糊淡入
   1.75–2.00  末词染强调色
   4.60–5.00  整幕同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1In = (x: number) => x * x;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const mixHex = (a: string, b: string, p: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], p))).join(",")})`;
};

// —— 演示语境（不属于动效）：样式照搬 demo（类名 cas- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.cas-pivot { position: absolute; left: 480px; top: 318px; width: 0; height: 0; }
.cas-num { position: absolute; left: 0; top: 0; font-size: 52px; font-weight: 600; color: #1d1d1f; font-variant-numeric: tabular-nums; white-space: nowrap; letter-spacing: -1px; }
.cas-tick { position: absolute; left: -1.5px; top: 0; width: 3px; height: 22px; background: #c9c9cf; transform-origin: 50% 0; }
.cas-ttl { position: absolute; left: 50%; top: 250px; transform: translate(-50%, -50%); display: flex; align-items: baseline; gap: 16px; font-size: 52px; font-weight: 600; color: #1d1d1f; white-space: nowrap; letter-spacing: -1px; }
.cas-slot { display: inline-block; visibility: hidden; }
.cas-w { display: inline-block; }
`;

type Props = {
  /** 弧上的数字串（相邻递减），含被选中的那个 */
  numbers?: number[];
  /** 被选中、落成标题首字符的数 */
  pick?: number;
  /** 标题后续词（末词染强调色） */
  words?: string[];
  /** 末词颜色（唯一强调色） */
  accent?: string;
};

export default function CountdownArcScatter({ numbers = [11, 10, 9, 8, 7, 6, 5, 4, 3], pick = 5, words = ["分钟", "搭好", "创作系统"], accent = "#0066cc" }: Props) {
  const t = useCurrentFrame() / FPS;
  const pickIdx = Math.max(0, numbers.indexOf(pick));

  // 静态几何只量一次：标题总宽与首位隐形槽宽 → 选中数的落点（相对枢轴）
  const ttlRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const [geo, setGeo] = useState<{ ttlW: number; slotW: number } | null>(null);
  const [handle] = useState(() => delayRender("countdown-arc-scatter: measure title width"));
  const continued = useRef(false);
  const done = () => { if (!continued.current) { continueRender(handle); continued.current = true; } };   // 同一 handle 只 continue 一次；文案 props 变了重测不再挂起
  useLayoutEffect(() => {
    setGeo({ ttlW: ttlRef.current?.offsetWidth ?? 0, slotW: slotRef.current?.offsetWidth ?? 30 });
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, words.join("\u0001")]);   // 标题文案 / 选中数变了重测
  const target = { x: (geo?.slotW ?? 30) / 2 - (geo?.ttlW ?? 0) / 2, y: 250 - 318 };

  // 三条主曲线
  const rot = lerp(CONFIG.sweepFrom, 0, tw(t, CONFIG.sweepAt, CONFIG.sweep, power2Out));
  const out = tw(t, CONFIG.outAt, CONFIG.outDur, power1In);
  const hand = tw(t, CONFIG.handAt, CONFIG.handDur, power2InOut);
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.exitDur, power2In);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="cas-pivot" style={{ opacity: exitK }}>
        {numbers.map((n, i) => {
          const pa = (i - pickIdx) * CONFIG.step + rot, a = (pa * Math.PI) / 180;
          let x = Math.sin(a) * CONFIG.R, y = -Math.cos(a) * CONFIG.R, r = pa, op = clamp01((CONFIG.visAngle - Math.abs(pa)) / CONFIG.visFeather);   // 用角度算透明度
          let filter = "none";
          if (i === pickIdx) { x = lerp(x, target.x, hand); y = lerp(y, target.y, hand); r = r * (1 - hand); op = Math.max(op, hand); }
          else { op *= 1 - out; filter = `blur(${(out * 3).toFixed(2)}px)`; }
          return <div key={i} className="cas-num" style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${r}deg)`, opacity: op, filter }}>{n}</div>;
        })}
        {Array.from({ length: CONFIG.tickN }, (_, k) => {
          const pa = (k - Math.floor(CONFIG.tickN / 2)) * CONFIG.tickStep + rot * CONFIG.tickRatio, a = (pa * Math.PI) / 180, rr = CONFIG.R + 38;   // 刻度 0.35 倍差速
          return <div key={k} className="cas-tick" style={{ transform: `translate(${Math.sin(a) * rr}px, ${-Math.cos(a) * rr}px) rotate(${pa}deg)`, opacity: clamp01((80 - Math.abs(pa)) / 20) * 0.8 * (1 - out) }} />;
        })}
      </div>
      <div className="cas-ttl" ref={ttlRef} style={{ opacity: exitK }}>
        <span className="cas-slot" ref={slotRef}>{pick}</span>
        {words.map((w, i) => {
          const k = tw(t, CONFIG.wordsAt + i * CONFIG.wordStagger, CONFIG.wordDur, power2Out);
          const isLast = i === words.length - 1;
          const color = isLast ? mixHex("#1d1d1f", accent, tw(t, CONFIG.accentAt, CONFIG.accentDur, linear)) : "#1d1d1f";
          return <span key={i} className="cas-w" style={{ opacity: k, filter: `blur(${lerp(6, 0, k).toFixed(2)}px)`, color }}>{w}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
}
