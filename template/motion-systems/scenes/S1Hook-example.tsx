import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {Shot} from '../shots';
import {useParams, type ParamField} from '../params';

/**
 * 场景样例：PARAMS 只放语境级参数（文案 / 颜色 / 字号 / 位置 / 入场方向）——词锚时刻、时长、缓动、几何比例是命门，不进表。
 * 默认值 = 你在 SHOTBOOK 里定的版式；工作台面板改的值经 useParams 进来（Player 注入 > overrides.json > 默认值）。
 */
export const PARAMS = [
  {type: 'text', key: 'title', label: '标题', default: '有没有一个口播动效的 skill？'},
  {type: 'color', key: 'accent', label: '强调色', default: '#0066cc'},
  {type: 'slider', key: 'fontSize', label: '标题字号', default: 104, min: 60, max: 140, step: 1, unit: 'px'},
  {type: 'number', key: 'x', label: '标题 X', default: 160, step: 1, unit: 'px'},
  {type: 'number', key: 'y', label: '标题 Y', default: 300, step: 1, unit: 'px'},
  {type: 'select', key: 'from', label: '入场方向', default: 'bottom', options: [{value: 'bottom', label: '自下'}, {value: 'right', label: '自右'}]},
] as const satisfies readonly ParamField[];

export const S1Hook: React.FC<{shot: Shot}> = ({shot}) => {
  const p = useParams(shot.id, PARAMS);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: p.x, top: p.y, fontSize: p.fontSize, color: p.accent, fontWeight: 700}}>{p.title}</div>
      {/* 真实场景：卡 / 线稿 / 荧光笔… 词锚用 abs 秒，from={p.from as 'bottom' | 'right'} 之类只换皮不换命门 */}
    </AbsoluteFill>
  );
};
