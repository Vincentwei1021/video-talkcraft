// kb 适配层 · PromoScenes：promo 工程的逐镜场景总表（拆解契约核心；缺则占位提示）。
import type React from "react";
import * as real from "@kbsrc/PromoScenes";
import * as stub from "../../kbsrc-stub/PromoScenes";
import { fnOr } from "./pick";

export const PromoScene: React.FC<Record<string, unknown>> = fnOr(real.PromoScene, stub.PromoScene);
