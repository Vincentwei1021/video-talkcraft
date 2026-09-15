import type React from 'react';
import type {Shot} from '../shots';
import type {ParamField} from '../params';
// 拆解契约：scenes/index.ts 同名导出 SCENES + SCENE_PARAMS（工作台按它们生成逐镜参数化卡）。
// 每个场景文件：export const PARAMS = [...] as const satisfies readonly ParamField[]; 场景内 const p = useParams(shot.id, PARAMS)。
// 下面用两个示例场景占位；真实工程按镜头表逐个填。
import {S1Hook, PARAMS as P1} from './S1Hook';
import {S2Event, PARAMS as P2} from './S2Event';

export const SCENES: Record<string, React.FC<{shot: Shot}>> = {
  s1_hook: S1Hook,
  s2_event: S2Event,
};

/** 每镜的语境参数表（工作台属性面板按它生成控件；值走 overrides.json） */
export const SCENE_PARAMS: Record<string, readonly ParamField[]> = {
  s1_hook: P1,
  s2_event: P2,
};
