// kb 适配层 · Environment：环境层 + 三色扫（promo 工程；缺则空组件）。
import type React from "react";
import * as real from "@kbsrc/Environment";
import * as stub from "../../kbsrc-stub/Environment";
import { compOr } from "./pick";

export const Environment: React.FC = compOr(real.Environment, stub.Environment);
export const ShapeWipes: React.FC = compOr(real.ShapeWipes, stub.ShapeWipes);
/** skill 标准工程：幕级覆盖（黑震切帧 / 落幕压黑等），画在全部镜头之上、字幕之下 */
export const Overlays: React.FC = compOr(real.Overlays, stub.Overlays);
