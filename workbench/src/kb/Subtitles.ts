// kb 适配层 · Subtitles：字幕层。promo / skill 正式工程都导出 Subtitles（后者 props 全可选，空调用可渲）。
import type React from "react";
import * as real from "@kbsrc/Subtitles";
import * as stub from "../../kbsrc-stub/Subtitles";
import { compOr } from "./pick";

export const Subtitles: React.FC<Record<string, unknown>> = compOr(real.Subtitles, stub.Subtitles);
