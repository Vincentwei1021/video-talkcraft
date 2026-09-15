// stub：skill 标准工程的逐镜语境参数契约（remotion/src/params.ts）。
// 真实工程：ParamsProvider 把工作台片段 props 注入场景；OVERRIDES 来自 remotion/overrides.json（工作台写、agent 不改）。
import React from "react";
export type ParamValues = Record<string, unknown>;
export const OVERRIDES: Record<string, ParamValues> = {};
export const ParamsProvider: React.FC<{ values: ParamValues; children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const useParams = (_shotId: string, fields: readonly { key: string; default: unknown }[]): ParamValues =>
  Object.fromEntries(fields.map((f) => [f.key, f.default]));
