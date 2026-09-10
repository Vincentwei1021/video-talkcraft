// kb 适配层 · Host：数字人层（promo 工程；缺则空组件）。
import type React from "react";
import * as real from "@kbsrc/Host";
import * as stub from "../../kbsrc-stub/Host";
import { fnOr } from "./pick";

export const Host: React.FC = fnOr(real.Host, stub.Host);
