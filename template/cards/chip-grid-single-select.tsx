import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";

// chip-grid-single-select · 五选一反黑 —— 自包含 Remotion 源码（与 demos/chip-grid-single-select/index.html 同画面）
// N 个候选 chip 居中铺开让观众读题；选中帧先插 1 帧灰色按压，紧接 5 帧 linear 反黑 + 极轻正弦回弹，其余降到 18% 位置锁死；
// 停 1.5s 后余项归零、黑 chip 上移收窄回中线，下方算式行逐词加深。复制本文件进你的工程即可用；选项 / 选中项 / 算式经 props 注入。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 216 };   // 6.8s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 灰闪只能 1 帧（2 帧以上读作 hover 高亮，不是按下）；② 反黑 5 帧 linear 不加 ease（"变黑"这件事不该有过程感）；
//      ③ 余项降到 18% 但位置锁死（transform 恒为 none）——原位才读作"没被选中"而非"消失了"；④ 选中后 ≥1.5s 再收束；
//      ⑤ 收束时黑 chip 上移收窄要横向补偿 cx 回到中线，不补读作"被拖走"。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  FS: 2.0,             // 选中时刻 s（前半读题、后半看结果；<1.2 观众还没读完选项）
  flash: 0.033,        // 按压灰闪时长 s（就一帧）
  black: 0.17,         // 反黑时长 s（≈5 帧，linear）
  bounce: 0.34,        // 按压回弹窗 s：scale = 1 + sin(p·π)·0.04（正弦保证起止精确回 1）
  bounceAmp: 0.04,     // 回弹幅度（极轻；0.1 就成弹跳按钮）
  dim: 0.18,           // 余项降到的透明度（位置不动）
  lift: 1.5,           // 选中后多久收束 s（看清选中态的最短驻留）
  liftDur: 0.4,        // 收束时长 s（power2.inOut）
  liftY: -46,          // 黑 chip 上移 px
  liftScale: 0.82,     // 黑 chip 收窄倍率
  eqLag: 0.25,         // 算式行在收束起点之后多久浮现
  eqStagger: 0.16,     // 算式逐词加深间隔 s
  rowGap: 14,          // chip 间距 px；行距由容器的 66 定
  exitAt: 6.4,         // 整体退场起点（0.4s power2.in）
  end: 6.8,            // 镜头结束
};

/* 时间表（demo 秒）
   0.10 问题行淡入；0.50 起五枚 chip 每 0.1s 淡入
   2.00 灰闪 1 帧 → 2.03 起 5 帧 linear 反黑 + 0.34s 正弦回弹；余项 0.34s 降到 18%（位置锁死）
   3.50 余项 0.3s 归零；黑 chip 0.4s 上移 −46 / 收窄 0.82 / 横向回中线
   3.75 算式行浮现，3.80 起逐词加深（0.16s/词）
   6.40–6.80 整体退场（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const mix = (a: string, b: string, p: number) => {   // 颜色插值（#rrggbb），对应 GSAP 的 backgroundColor / color tween
  const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16)), pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], p))).join(",")})`;
};

// —— 演示语境（不属于动效）：样式照搬 demo（类名加 cgs- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.cgs-q { position: absolute; left: 0; right: 0; top: 116px; text-align: center; font-size: 30px; font-weight: 700; color: #1d1d1f; }
.cgs-chips { position: absolute; left: 0; right: 0; top: 200px; height: 130px; }
.cgs-chip { position: absolute; height: 48px; line-height: 46px; padding: 0 22px; border-radius: 24px; border: 1.5px solid #d6d6dc; background: #ffffff; color: #1d1d1f; font-size: 20px; font-weight: 600; white-space: nowrap; transform-origin: 50% 50%; }
.cgs-chip .cgs-fl { position: absolute; inset: 0; border-radius: 24px; background: rgba(120,120,120,.5); }
.cgs-eq { position: absolute; left: 0; right: 0; top: 300px; text-align: center; font-size: 30px; font-weight: 600; color: #1d1d1f; font-variant-numeric: tabular-nums; }
.cgs-eq span { display: inline-block; margin: 0 4px; }
.cgs-eq .cgs-acc { color: #0066cc; font-weight: 700; }
`;

/** 算式的一个词：text + 是否强调色 */
export type EqWord = { text: string; accent?: boolean };

const DEMO_OPTIONS = ["方案 A · 全手动", "方案 B · 半自动", "方案 C · 全自动", "方案 D · 外包", "方案 E · 先不做"];
const DEMO_EQ: EqWord[] = [{ text: "每期" }, { text: "省 6 小时", accent: true }, { text: "×" }, { text: "每周 3 期" }, { text: "=" }, { text: "每月 72 小时", accent: true }];

type Props = {
  /** 问题行（画面文字） */
  question?: string;
  /** 候选项（≤6，每行最多 3 枚：前 3 上排、其余下排） */
  options?: string[];
  /** 选中项索引 */
  selected?: number;
  /** 算式行（逐词加深；accent 的词用强调色） */
  equation?: EqWord[];
};

export default function ChipGridSingleSelect({ question = "五个方案，我选哪个？", options = DEMO_OPTIONS, selected = 2, equation = DEMO_EQ }: Props) {
  const t = useCurrentFrame() / FPS;
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [pos, setPos] = useState<{ x: number; y: number; w: number }[] | null>(null);
  const [handle] = useState(() => delayRender("chip-grid-single-select: 量 chip 宽度"));
  const continued = useRef(false);
  const done = () => { if (!continued.current) { continueRender(handle); continued.current = true; } };   // 同一 handle 只 continue 一次；文案 props 变了重测不再挂起

  // 静态几何测量：量每枚 chip 宽度后按 3+N 居中排布（选项文案变了重测；动画全部由 t 推出）
  useLayoutEffect(() => {
    const ws = refs.current.map((el) => el?.offsetWidth ?? 0);
    const out: { x: number; y: number; w: number }[] = [];
    const layout = (idx: number[], y: number) => {
      const tot = idx.reduce((a, i) => a + ws[i], 0) + (idx.length - 1) * CONFIG.rowGap;
      let x = 480 - tot / 2;
      idx.forEach((i) => { out[i] = { x, y, w: ws[i] }; x += ws[i] + CONFIG.rowGap; });
    };
    const all = options.map((_, i) => i);
    layout(all.slice(0, 3), 0); if (all.length > 3) layout(all.slice(3), 66);
    setPos(out); done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.join("\u0001")]);

  const FS = CONFIG.FS, LIFT = FS + CONFIG.lift;
  const qP = tw(t, 0.1, 0.4, power3Out);
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.end - CONFIG.exitAt, power2In);
  // 选中 chip 各阶段
  const flashOn = t >= FS && t < FS + CONFIG.flash;
  const blackP = tw(t, FS + CONFIG.flash, CONFIG.black, linear);
  const pr = tw(t, FS + CONFIG.flash, CONFIG.bounce, linear);
  const bounce = 1 + Math.sin(pr * Math.PI) * CONFIG.bounceAmp;
  const dimP = tw(t, FS + CONFIG.flash, CONFIG.bounce, power2Out);
  const goneP = tw(t, LIFT, 0.3, power1Out);
  const liftP = tw(t, LIFT, CONFIG.liftDur, power2InOut);
  const eqP = tw(t, LIFT + CONFIG.eqLag, 0.3, power1Out);
  const selPos = pos?.[selected];
  const cx = selPos ? 480 - (selPos.x + selPos.w / 2) : 0;   // 上移时横向补偿回中线

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="cgs-q" style={{ opacity: qP * exitK, transform: `translateY(${lerp(8, 0, qP)}px)` }}>{question}</div>
      <div className="cgs-chips">
        {options.map((op, i) => {
          const isSel = i === selected;
          const inP = tw(t, 0.5 + i * 0.1, 0.25, power1Out);
          const p = pos?.[i];
          let opacity = inP, transform = "none", bg = "#ffffff", color = "#1d1d1f", border = "#d6d6dc";
          if (isSel) {
            bg = mix("#ffffff", "#1d1d1f", blackP); color = mix("#1d1d1f", "#ffffff", blackP); border = mix("#d6d6dc", "#1d1d1f", blackP);
            transform = `translate(${cx * liftP}px, ${CONFIG.liftY * liftP}px) scale(${lerp(bounce, CONFIG.liftScale, liftP)})`;
            opacity = inP * exitK;
          } else {
            opacity = inP * lerp(1, CONFIG.dim, dimP) * (1 - goneP);   // 余项：降到 18%，位置锁死（transform 恒为 none），收束时归零
          }
          return (
            <div key={i} ref={(el) => { refs.current[i] = el; }} className="cgs-chip"
              style={{ left: p?.x ?? 0, top: p?.y ?? 0, visibility: p ? "visible" : "hidden", opacity, transform, backgroundColor: bg, color, borderColor: border }}>
              {op}
              {isSel ? <i className="cgs-fl" style={{ opacity: flashOn ? 1 : 0 }} /> : null}
            </div>
          );
        })}
      </div>
      <div className="cgs-eq" style={{ opacity: eqP * exitK }}>
        {equation.map((w, i) => {
          const wp = tw(t, LIFT + CONFIG.eqLag + 0.05 + i * CONFIG.eqStagger, 0.25, linear);
          return <span key={i} className={w.accent ? "cgs-acc" : ""} style={{ opacity: lerp(0.25, 1, wp) }}>{w.text}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
}
