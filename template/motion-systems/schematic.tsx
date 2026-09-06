/**
 * G5 · 线稿示意图系统（schematic.tsx）——纯文字镜的"第二层可看的东西"
 *
 * 来源：2026-09-07 用户反馈"没有图片素材的镜头只有文字动效往上堆，太单一"，对照参考片 rag_v4（275s、零素材却不单调）拆出的机制：
 * 它把每一句抽象话翻成一张线稿示意图——图标 + 方框 + 箭头 + 小标签，文字只做标签；文字从不裸放（都装在容器里）；
 * 每个字幕块起始 ±3 帧必有一个可见动作。规则与语义图形词典见 references/schematic.md。
 *
 * 规则（借自库内两张卡的命门）：
 *  - 描画 = 机器一笔画（outline-box-title）：pathLength 归一、dashoffset 1→0、power2.inOut 近匀速、精确闭合、恒定线宽；
 *    不做手绘抖动、不做粗细变化（design-language §4：画完干净静置）。
 *  - 顺序 = 线到哪亮哪（step-timeline-vertical）：连接线先画、端点节点被线"点亮"后才 pop；图标各段按 stagger 依次描。
 *  - 皮 = 本片风格档：ink 描边 3px + accent 做强调线 / 节点实心；磨砂白板托底；颜色全部经 props 传入（默认值是中性灰阶，进片必换）。
 *  - 一切以 abs（绝对秒）驱动，零 Math.random、零 ref 量测，seek-safe。
 *
 * 依赖：react、remotion、@remotion/paths（Traveller 用；`npm i @remotion/paths@<remotion 版本>`，与 components/pencil.tsx 同一依赖）。
 * 图标：./icons.ts（Iconify lucide 线稿，ISC 免署名）——增删图标跑 `python3 scripts/fetch_icons.py <slug,...>` 重生成。
 *
 * 用法：<Sketch>（一张 1920×1080 的透明 SVG 舞台）里放 DrawPath / DrawIcon / Connector / Node / Plate / Panel / Cross / Tick / Traveller / Label。
 * 竖屏或其他画幅：给 <Sketch width height> 传舞台尺寸即可（坐标随之按舞台像素写）。
 */
import React from 'react';
import {getLength, getPointAtLength} from '@remotion/paths';
import {ICONS} from './icons';

const FONT_CN = '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif';
const INK = '#1d1d1f', ACCENT = '#0066cc', STRIKE = '#d70015', HAIRLINE = '#e0e0e0';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const prog = (abs: number, at: number, dur: number) => clamp01((abs - at) / Math.max(dur, 1e-6));
/** = GSAP power2.inOut（三次），与 outline-box-title 的描边同一条曲线——近匀速、两端轻收 */
export const inOut2 = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const out3 = (x: number) => 1 - Math.pow(1 - x, 3);
export const backOut = (x: number, s = 1.6) => {
  const c1 = s, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/** 退场：out 起 outDur 内线性淡出（默认不退，由外层让位状态机管） */
const fadeOut = (abs: number, out?: number, outDur = 0.25) => (out === undefined ? 1 : 1 - prog(abs, out, outDur));

export const Sketch: React.FC<{children: React.ReactNode; width?: number; height?: number; opacity?: number; style?: React.CSSProperties}> = ({children, width = 1920, height = 1080, opacity = 1, style}) => (
  <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity, pointerEvents: 'none', ...style}} fill="none" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

type DrawProps = {abs: number; at: number; dur?: number; color?: string; width?: number; out?: number; outDur?: number; easing?: (x: number) => number};

/** 一笔画路径（可选虚线样式：用同形实线 mask 揭开虚线，map-route-pin 的做法） */
export const DrawPath: React.FC<DrawProps & {d: string; dashed?: number | false; fill?: string; fillDelay?: number}> = ({abs, at, dur = 0.5, d, color = INK, width = 3, dashed = false, fill, fillDelay = 0.1, out, outDur, easing = inOut2}) => {
  const id = React.useId().replace(/:/g, '');
  const p = easing(prog(abs, at, dur));
  if (p <= 0) return null;
  const op = fadeOut(abs, out, outDur);
  if (op <= 0) return null;
  const fillOp = fill ? out3(prog(abs, at + dur + fillDelay, 0.3)) : 0;
  if (!dashed) {
    return (
      <g opacity={op}>
        {fill && fillOp > 0 && <path d={d} fill={fill} fillOpacity={fillOp} stroke="none" />}
        <path d={d} stroke={color} strokeWidth={width} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
      </g>
    );
  }
  return (
    <g opacity={op}>
      <mask id={`m${id}`} maskUnits="userSpaceOnUse" x={-4000} y={-4000} width={8000} height={8000}>
        <path d={d} stroke="#fff" strokeWidth={width + 4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} strokeLinecap="butt" />
      </mask>
      <path d={d} stroke={color} strokeWidth={width} strokeDasharray={`${dashed} ${dashed}`} mask={`url(#m${id})`} />
    </g>
  );
};

/** 线稿图标（Iconify lucide 路径，24×24 → size），各段按 stagger 依次描画 */
export const DrawIcon: React.FC<DrawProps & {name: string; x: number; y: number; size?: number; stagger?: number; pop?: boolean}> = ({abs, at, dur = 0.45, name, x, y, size = 96, color = INK, width = 3, stagger = 0.08, out, outDur, pop = false}) => {
  const paths = ICONS[name];
  if (!paths) throw new Error(`schematic: 图标 ${name} 不在 icons.ts（scripts/fetch_icons.py 的清单里加上再生成）`);
  if (abs < at) return null;
  const op = fadeOut(abs, out, outDur);
  if (op <= 0) return null;
  const k = size / 24;
  const sc = pop ? 0.92 + 0.08 * backOut(prog(abs, at, 0.35)) : 1;
  return (
    <g opacity={op} transform={`translate(${x} ${y}) scale(${(k * sc).toFixed(4)}) translate(-12 -12)`}>
      {paths.map((d, i) => {
        const p = inOut2(prog(abs, at + i * stagger, dur));
        return p > 0 ? <path key={i} d={d} stroke={color} strokeWidth={width / k} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} /> : null;
      })}
    </g>
  );
};

/** 连接线：二次贝塞尔（bow = 弓高，正值向右手法向凸），可带箭头；箭头在线到 96% 时才出现（线先到、头后长） */
export const Connector: React.FC<DrawProps & {from: {x: number; y: number}; to: {x: number; y: number}; bow?: number; arrow?: boolean; dashed?: number | false}> = ({abs, at, dur = 0.5, from, to, bow = 0, arrow = false, dashed = false, color = INK, width = 3, out, outDur}) => {
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
  const dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const cx = mx + nx * bow, cy = my + ny * bow;
  const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  const p = inOut2(prog(abs, at, dur));
  const op = fadeOut(abs, out, outDur);
  if (p <= 0 || op <= 0) return null;
  const ax = to.x - cx, ay = to.y - cy, aL = Math.hypot(ax, ay) || 1;
  const ux = ax / aL, uy = ay / aL;
  const h = 14, wgt = 8;
  const hp = out3(prog(abs, at + dur * 0.96, 0.14));
  const b = {x: to.x - ux * h, y: to.y - uy * h};
  return (
    <g opacity={op}>
      <DrawPath abs={abs} at={at} dur={dur} d={d} color={color} width={width} dashed={dashed} />
      {arrow && hp > 0 && (
        <path d={`M ${b.x - uy * wgt * hp} ${b.y + ux * wgt * hp} L ${to.x} ${to.y} L ${b.x + uy * wgt * hp} ${b.y - ux * wgt * hp}`} stroke={color} strokeWidth={width} />
      )}
    </g>
  );
};

/** 圆节点：back.out pop（accent 实心 = 当前 / 白底 = 普通）；标签滞后 2 帧淡入 */
export const Node: React.FC<DrawProps & {x: number; y: number; r?: number; fill?: string; label?: string; labelPos?: 'below' | 'above' | 'right' | 'left'; labelSize?: number; labelColor?: string; ink?: string}> = ({abs, at, dur = 0.3, x, y, r = 14, color = INK, width = 3, fill = '#ffffff', label, labelPos = 'below', labelSize = 36, labelColor, ink = INK, out, outDur}) => {
  if (abs < at) return null;
  const op = fadeOut(abs, out, outDur);
  if (op <= 0) return null;
  const s = backOut(prog(abs, at, dur), 1.4);
  const lp = out3(prog(abs, at + 0.07, 0.26));
  const lx = labelPos === 'right' ? x + r + 14 : labelPos === 'left' ? x - r - 14 : x;
  const ly = labelPos === 'below' ? y + r + 12 + labelSize * 0.9 : labelPos === 'above' ? y - r - 14 : y + labelSize * 0.35;
  const anchor = labelPos === 'right' ? 'start' : labelPos === 'left' ? 'end' : 'middle';
  return (
    <g opacity={op}>
      <circle cx={x} cy={y} r={r * s} fill={fill} stroke={color} strokeWidth={width} />
      {label && lp > 0 && (
        <text x={lx + (labelPos === 'right' ? -8 * (1 - lp) : labelPos === 'left' ? 8 * (1 - lp) : 0)} y={ly + (labelPos === 'below' ? 6 * (1 - lp) : 0)} textAnchor={anchor} fontFamily={FONT_CN} fontSize={labelSize} fontWeight={600} fill={labelColor ?? ink} opacity={lp}>{label}</text>
      )}
    </g>
  );
};

/** 圆角矩形板：一笔从上边中偏左起顺时针画一圈（outline-box-title 的起笔规则），闭合后可填白 */
export const Plate: React.FC<DrawProps & {x: number; y: number; w: number; h: number; r?: number; fill?: string; fillDelay?: number}> = ({abs, at, dur = 0.45, x, y, w, h, r = 16, color = INK, width = 3, fill, fillDelay = 0.1, out, outDur}) => {
  const d = `M ${x + 34} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  return <DrawPath abs={abs} at={at} dur={dur} d={d} color={color} width={width} fill={fill} fillDelay={fillDelay} out={out} outDur={outDur} />;
};

/** 半透白板：不描画，0.3s 淡入；把线稿从模糊底床上托起来（"文字从不裸放"的容器规则，浅底版 = 磨砂白板 + hairline；深底传 dark） */
export const Panel: React.FC<{abs: number; at: number; x: number; y: number; w: number; h: number; r?: number; alpha?: number; dark?: boolean; out?: number; outDur?: number}> = ({abs, at, x, y, w, h, r = 24, alpha = 0.58, dark = false, out, outDur}) => {
  if (abs < at) return null;
  const op = out3(prog(abs, at, 0.3)) * fadeOut(abs, out, outDur);
  if (op <= 0) return null;
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={dark ? `rgba(15,22,42,${alpha})` : `rgba(255,255,255,${alpha})`} stroke={dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'} strokeWidth={1.5} opacity={op} />;
};

/** 叉：两笔（左上→右下 先，右上→左下 后 0.08s），语义 = 否定 / 划掉（语义色随本片 strike） */
export const Cross: React.FC<DrawProps & {x: number; y: number; size?: number}> = ({abs, at, dur = 0.22, x, y, size = 36, color = STRIKE, width = 4, out, outDur}) => {
  const h = size / 2;
  return (
    <g>
      <DrawPath abs={abs} at={at} dur={dur} d={`M ${x - h} ${y - h} L ${x + h} ${y + h}`} color={color} width={width} out={out} outDur={outDur} easing={out3} />
      <DrawPath abs={abs} at={at + 0.08} dur={dur} d={`M ${x + h} ${y - h} L ${x - h} ${y + h}`} color={color} width={width} out={out} outDur={outDur} easing={out3} />
    </g>
  );
};

/** 勾：一笔，短边快长边慢（out3），语义 = 确认（accent） */
export const Tick: React.FC<DrawProps & {x: number; y: number; size?: number}> = ({abs, at, dur = 0.3, x, y, size = 36, color = ACCENT, width = 4, out, outDur}) => {
  const h = size / 2;
  return <DrawPath abs={abs} at={at} dur={dur} d={`M ${x - h} ${y} L ${x - h * 0.25} ${y + h * 0.7} L ${x + h} ${y - h * 0.6}`} color={color} width={width} out={out} outDur={outDur} easing={out3} />;
};

/** 沿路径行进的小点（线头跟随物）：p 由 at/dur 驱动，走到终点 hold 后隐 */
export const Traveller: React.FC<DrawProps & {d: string; r?: number; fill?: string; hold?: number}> = ({abs, at, dur = 1, d, r = 7, fill = ACCENT, hold = 0.2, out, outDur}) => {
  const p = inOut2(prog(abs, at, dur));
  if (abs < at || abs > at + dur + hold) return null;
  const op = fadeOut(abs, out, outDur) * (abs > at + dur ? 1 - prog(abs, at + dur, hold) : 1);
  const L = getLength(d);
  const pt = getPointAtLength(d, L * Math.min(p, 0.999));
  if (!pt) return null;
  return <circle cx={pt.x} cy={pt.y} r={r} fill={fill} opacity={op} />;
};

/** 文字标签（SVG text）：淡入 + 上浮 6px；默认 36 = 390 宽手机上的可读下限（schematic.md §5），传 <36 即承认为装饰 */
export const Label: React.FC<{abs: number; at: number; x: number; y: number; text: string; size?: number; weight?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; out?: number; outDur?: number; letterSpacing?: number}> = ({abs, at, x, y, text, size = 36, weight = 600, color = INK, anchor = 'middle', out, outDur, letterSpacing = 0}) => {
  if (abs < at) return null;
  const p = out3(prog(abs, at, 0.3));
  const op = p * fadeOut(abs, out, outDur);
  if (op <= 0) return null;
  return <text x={x} y={y + 6 * (1 - p)} textAnchor={anchor} fontFamily={FONT_CN} fontSize={size} fontWeight={weight} fill={color} opacity={op} letterSpacing={letterSpacing}>{text}</text>;
};

/** 折线（多点）一笔画；smooth=1 时相邻点中点为锚、原点为控制点（Q 串）——"绕路"这类路线用 */
export const polyD = (pts: {x: number; y: number}[], smooth = 0) => {
  if (!smooth) return 'M ' + pts.map((p) => `${p.x} ${p.y}`).join(' L ');
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
};

/** 常用调色：进片时用本片 theme token 覆盖这些默认值 */
export const SCHEMATIC_DEFAULTS = {ink: INK, accent: ACCENT, strike: STRIKE, hairline: HAIRLINE};
