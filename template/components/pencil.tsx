import React from 'react';
import {getLength, getPointAtLength} from '@remotion/paths';
import {useCurrentFrame} from 'remotion';
import {easeOut, prog} from './lib';

/**
 * Pencil draw-on (ann_nnng card-sketch technique):
 * stroke-dashoffset growth + a pencil that rides the path tip (@remotion/paths, pure fn).
 * 用户偏好：不做 line boil / 定格抖动——画完的线保持干净静置（design-language.md §4）。
 *
 * 铅笔模型：所有零件共用同一根轴——石墨尖在局部原点 (0,0)，笔身朝 -Y 生长。
 * 于是 translate 到 getPointAtLength 的点 = 笔尖零偏移落在笔迹生长点，倾角交给外层 rotate。
 * 比例按真铅笔 笔杆:锥面:笔尖 = 10 : 1.5 : 0.4（改 U 等比缩放）。
 * 木色/笔杆黄/箍灰/橡皮粉是"铅笔"这个语义物本身，不要灰阶化——灰铅笔读不出是笔。
 */
const U = 4.6;
const PW = 4.2, SL = -1.5, SR = 1.8;          // 笔杆半宽 + 两条棱线（把宽度切成三面）
const Y_G = -0.4 * U;                          // 石墨尖根部
const Y_C = Y_G - 1.5 * U;                     // 木锥面根部
const Y_B = Y_C - 10 * U;                      // 笔杆末端
const FW = 4.5, EW = 4.1;                      // 金属箍略粗 / 橡皮略细（轮廓看得出台阶）
const Y_F = Y_B - 2.2 * U, Y_T = Y_B - 4.15 * U;
const K = Math.abs(Y_G / Y_C);                 // 锥面收敛系数：石墨宽度由它推导，永远与锥面齐平
const GW = PW * K, GL = SL * K, GR = SR * K;

export const PencilBody: React.FC<{ink?: string}> = ({ink = '#1d1d1f'}) => {
  const seam = (x1: number, y1: number, x2: number, y2: number, o = 0.34, sw = 0.6) => (
    <path d={`M ${x1} ${y1} L ${x2} ${y2}`} stroke={ink} strokeWidth={sw} strokeOpacity={o} fill="none" />
  );
  return (
    <>
      {/* 笔杆三棱面：左暗 / 中亮 / 右中 */}
      <polygon points={`${-PW},${Y_C} ${SL},${Y_C} ${SL},${Y_B} ${-PW},${Y_B}`} fill="#DFA400" />
      <polygon points={`${SL},${Y_C} ${SR},${Y_C} ${SR},${Y_B} ${SL},${Y_B}`} fill="#FFDE47" />
      <polygon points={`${SR},${Y_C} ${PW},${Y_C} ${PW},${Y_B} ${SR},${Y_B}`} fill="#FFD400" />
      {/* 金属箍：同样三面 + 两道压纹 */}
      <polygon points={`${-FW},${Y_B} ${SL},${Y_B} ${SL},${Y_F} ${-FW},${Y_F}`} fill="#9BA1A9" />
      <polygon points={`${SL},${Y_B} ${SR},${Y_B} ${SR},${Y_F} ${SL},${Y_F}`} fill="#E2E5EA" />
      <polygon points={`${SR},${Y_B} ${FW},${Y_B} ${FW},${Y_F} ${SR},${Y_F}`} fill="#C8CBD1" />
      {seam(-FW, Y_B - 3, FW, Y_B - 3, 0.4, 0.7)}
      {seam(-FW, Y_F + 3, FW, Y_F + 3, 0.4, 0.7)}
      {/* 橡皮头：圆顶 + 一道暗面 */}
      <path d={`M ${-EW} ${Y_F} L ${-EW} ${Y_T + 2.5} Q ${-EW} ${Y_T} ${-EW + 2.5} ${Y_T} L ${EW - 2.5} ${Y_T} Q ${EW} ${Y_T} ${EW} ${Y_T + 2.5} L ${EW} ${Y_F} Z`} fill="#E79E96" />
      <path d={`M ${-EW} ${Y_F} L ${-EW} ${Y_T + 2.5} Q ${-EW} ${Y_T} ${-EW + 2.5} ${Y_T} L ${SL} ${Y_T} L ${SL} ${Y_F} Z`} fill="#CE7E77" />
      {/* 削出的木锥面：三个面收到石墨根部，棱线与笔杆对齐 */}
      <polygon points={`${-GW},${Y_G} ${GL},${Y_G} ${SL},${Y_C} ${-PW},${Y_C}`} fill="#CFA271" />
      <polygon points={`${GL},${Y_G} ${GR},${Y_G} ${SR},${Y_C} ${SL},${Y_C}`} fill="#F0D2AC" />
      <polygon points={`${GR},${Y_G} ${GW},${Y_G} ${PW},${Y_C} ${SR},${Y_C}`} fill="#E8C39A" />
      {/* 石墨笔尖（尖端 = 局部原点） */}
      <polygon points={`0,0 ${GL},${Y_G} ${-GW},${Y_G}`} fill="#2A2A31" />
      <polygon points={`0,0 ${GR},${Y_G} ${GL},${Y_G}`} fill="#4A4A55" />
      <polygon points={`0,0 ${GW},${Y_G} ${GR},${Y_G}`} fill="#35353D" />
      {/* 棱线与分界 */}
      {seam(0, 0, GL, Y_G)}{seam(GL, Y_G, SL, Y_C)}
      {seam(0, 0, GR, Y_G)}{seam(GR, Y_G, SR, Y_C)}
      {seam(SL, Y_C, SL, Y_B)}{seam(SR, Y_C, SR, Y_B)}
      {seam(-GW, Y_G, GW, Y_G, 0.35, 0.5)}
      {seam(-PW, Y_C, PW, Y_C, 0.5, 0.85)}
      {seam(-FW, Y_B, FW, Y_B, 0.5, 0.85)}
      {seam(-FW, Y_F, FW, Y_F, 0.5, 0.85)}
      {/* 整体外轮廓：一笔围出来，铅笔才读成"一个物件" */}
      <path
        d={`M 0 0 L ${-GW} ${Y_G} L ${-PW} ${Y_C} L ${-PW} ${Y_B} L ${-FW} ${Y_B} L ${-FW} ${Y_F} L ${-EW} ${Y_F}` +
          ` L ${-EW} ${Y_T + 2.5} Q ${-EW} ${Y_T} ${-EW + 2.5} ${Y_T} L ${EW - 2.5} ${Y_T} Q ${EW} ${Y_T} ${EW} ${Y_T + 2.5}` +
          ` L ${EW} ${Y_F} L ${FW} ${Y_F} L ${FW} ${Y_B} L ${PW} ${Y_B} L ${PW} ${Y_C} L ${GW} ${Y_G} Z`}
        fill="none" stroke={ink} strokeWidth={1.15} strokeLinejoin="round" strokeLinecap="round"
      />
    </>
  );
};

export const PencilDraw: React.FC<{
  d: string;
  at: number;
  dur?: number;
  stroke?: string;
  width?: number;
  viewBox: string;
  style?: React.CSSProperties;
  pencilScale?: number;
  keepPencil?: boolean; // keep pencil visible after finishing (default: lifts off)
  tilt?: number;   // 握笔角，定版 -35~-45
  follow?: number; // 转弯跟随幅度（度）：0=死板，>12 像风向标
}> = ({d, at, dur = 24, stroke = '#1a1a2e', width = 5, viewBox, style, pencilScale = 1, keepPencil = false, tilt = -40, follow = 5}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = easeOut(prog(f, at, dur));
  const len = getLength(d);
  const atLen = Math.max(0.001, len * p);
  const tip = getPointAtLength(d, atLen) ?? {x: 0, y: 0};
  // 切线：与前一点做差分 → 笔身角 = 固定握笔角 + follow × 方向的竖直分量（转向连续无跳变）
  const back = getPointAtLength(d, Math.max(0, atLen - 2.5)) ?? tip;
  const vx = tip.x - back.x, vy = tip.y - back.y;
  const mag = Math.hypot(vx, vy) || 1;
  const ang = tilt + follow * (vy / mag);

  const done = p >= 1;
  const lift = done ? Math.min((f - (at + dur)) * 3, 26) : 0;
  const showPencil = keepPencil || !done || lift < 26;
  // 抬笔沿笔身轴向（局部 -Y 经 ang 旋转后的世界方向），笔才像被"提起来"而不是平移
  const r = (ang * Math.PI) / 180;
  const ox = lift * Math.sin(r), oy = -lift * Math.cos(r);

  return (
    <svg viewBox={viewBox} style={{position: 'absolute', overflow: 'visible', ...style}}>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray={100}
        strokeDashoffset={100 - p * 100}
      />
      {showPencil ? (
        <g
          transform={`translate(${tip.x + ox} ${tip.y + oy}) rotate(${ang}) scale(${pencilScale})`}
          opacity={done && !keepPencil ? 1 - lift / 26 : 1}
        >
          <PencilBody />
        </g>
      ) : null}
    </svg>
  );
};
