import React, {createContext, useContext} from 'react';
import overridesJson from '../overrides.json'; // 工程根 remotion/overrides.json，建成 {}；工作台写、agent 不改

/**
 * 逐镜语境参数（工作台可调层）——skill 标准工程的拆解契约之一。
 * - 每个场景 `export const PARAMS: ParamField[]`：只放**语境级**参数（文案 / 颜色 / 字号 / 位置 / 入场方向），
 *   节奏命门（词锚时刻、时长、缓动、几何比例、层级）不进表（design-language §0.4 蒙皮契约同一条线）。
 * - 取值优先级：工作台 Player 传入（ParamsProvider）> `remotion/overrides.json`（工作台写盘）> PARAMS 默认值。
 * - **overrides.json 归工作台写、agent 不改**：agent 改 tsx 默认值、用户在面板改 overrides，两边永不互相冲掉；
 *   渲染（render_shots / 工作台导出）读同一份 overrides.json，所见即所得。
 */
export type ParamField =
  | {type: 'text'; key: string; label: string; default: string}
  | {type: 'textarea'; key: string; label: string; default: string}
  | {type: 'number'; key: string; label: string; default: number; min?: number; max?: number; step?: number; unit?: string}
  | {type: 'slider'; key: string; label: string; default: number; min: number; max: number; step: number; unit?: string}
  | {type: 'color'; key: string; label: string; default: string}
  | {type: 'select'; key: string; label: string; default: string; options: {value: string; label: string}[]}
  | {type: 'boolean'; key: string; label: string; default: boolean};

export type ParamValues = Record<string, unknown>;

/** 字段表 → 取值对象类型（默认值的宽类型：string / number / boolean） */
export type ValuesOf<F extends readonly ParamField[]> = {
  [K in F[number] as K['key']]: K['default'] extends string ? string : K['default'] extends number ? number : boolean;
};

/** 工作台写盘的覆盖值：{ [shotId]: { [key]: value } }。默认空对象。 */
export const OVERRIDES: Record<string, ParamValues> = {...((overridesJson ?? {}) as Record<string, ParamValues>)};

// 工作台（Vite）里 overrides.json 一变就地更新，不让 HMR 往上传播到工作台的 store / 卡注册表（每次改参数都重建整棵模块树）；
// 成片渲染（Remotion webpack）没有 import.meta.hot，这段是空操作。
declare global {
  interface ImportMeta {
    hot?: {accept: (dep: string, cb: (mod: {default?: Record<string, ParamValues>} | undefined) => void) => void};
  }
}
if (import.meta.hot) {
  import.meta.hot.accept('../overrides.json', (mod) => {
    for (const k of Object.keys(OVERRIDES)) delete OVERRIDES[k];
    Object.assign(OVERRIDES, mod?.default ?? {});
  });
}

export const ParamsCtx = createContext<ParamValues | null>(null);

/** 工作台把片段 props 从这里注入；成片渲染里没有 Provider，走 overrides.json → 默认值 */
export const ParamsProvider: React.FC<{values: ParamValues; children: React.ReactNode}> = ({values, children}) =>
  React.createElement(ParamsCtx.Provider, {value: values}, children);

const pick = (field: ParamField, raw: unknown): unknown => {
  if (raw === undefined || raw === null) return undefined;
  switch (field.type) {
    case 'number':
    case 'slider': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'boolean':
      return typeof raw === 'boolean' ? raw : raw === 'true' ? true : raw === 'false' ? false : undefined;
    default:
      return typeof raw === 'string' ? raw : undefined;
  }
};

/** 场景内取参：`const p = useParams(shot.id, PARAMS)`。每帧重算（十来个键，不值得 memo；不 memo 才能看见 OVERRIDES 的就地更新） */
export const useParams = <F extends readonly ParamField[]>(shotId: string, fields: F): ValuesOf<F> => {
  const ctx = useContext(ParamsCtx);
  const ov = OVERRIDES[shotId] ?? {};
  const out: ParamValues = {};
  for (const f of fields) out[f.key] = pick(f, ctx?.[f.key]) ?? pick(f, ov[f.key]) ?? f.default;
  return out as ValuesOf<F>;
};
