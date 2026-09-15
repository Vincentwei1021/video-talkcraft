// kb 适配层 · params：skill 标准工程的逐镜参数契约（ParamsProvider 注入片段 props；OVERRIDES = remotion/overrides.json）。缺则直通 / 空表。
import type React from "react";
import * as real from "@kbsrc/params";
import * as stub from "../../kbsrc-stub/params";
import { compOr, objOr } from "./pick";

export type ParamValues = Record<string, unknown>;
type Provider = React.FC<{ values: ParamValues; children: React.ReactNode }>;
export const ParamsProvider: Provider = compOr(real.ParamsProvider, stub.ParamsProvider as Provider);
export const OVERRIDES: Record<string, ParamValues> = objOr<Record<string, ParamValues>>(real.OVERRIDES, {});
