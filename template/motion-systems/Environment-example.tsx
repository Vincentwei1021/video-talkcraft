import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Backdrop} from './backdrop';

/**
 * 拆解契约模块 Environment.tsx：
 *   Environment = 幕底画布（分幕幕底 / 底色），画在所有镜头 Sequence 之下——Main.tsx 只放一次，不在每镜里各画一张（交叠期两张不透明底会叠成平白）；
 *   Overlays    = 幕级覆盖（黑震切那 1 帧 / 落幕压黑 / 过曝亮心等按绝对秒发生的整帧事件），画在所有镜头之上、字幕之下。
 * 工作台拆解时「幕底」「幕级覆盖」两条轨直接用这两个组件，与成片同一份代码。
 */
export const Environment: React.FC = () => (
  <AbsoluteFill>
    <Backdrop kind="pastel-mesh-flow" speed={1.5} />
  </AbsoluteFill>
);

export const Overlays: React.FC = () => null; // 本片没有幕级事件就导出空组件（契约要有这个导出）
