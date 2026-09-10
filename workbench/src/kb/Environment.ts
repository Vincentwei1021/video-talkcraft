// kb 适配层 · Environment：环境层 + 三色扫（promo 工程；缺则空组件）。
import type React from "react";
import * as real from "@kbsrc/Environment";
import * as stub from "../../kbsrc-stub/Environment";
import { fnOr } from "./pick";

export const Environment: React.FC = fnOr(real.Environment, stub.Environment);
export const ShapeWipes: React.FC = fnOr(real.ShapeWipes, stub.ShapeWipes);
