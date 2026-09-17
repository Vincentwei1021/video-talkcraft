// kb 适配层 · scenes：skill 标准工程的场景总表 scenes/index.ts（SCENES + SCENE_PARAMS）。promo 工程没有此文件 → 空表（拆解走 PromoScenes）。
import type React from "react";
import * as real from "@kbsrc/scenes/index";
import * as stub from "../../kbsrc-stub/scenes/index";
import { compOr, objOr } from "./pick";

type Scene = React.FC<Record<string, unknown>>;
const rawScenes = objOr<Record<string, unknown>>(real.SCENES, {});
export const SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(rawScenes)
    .map(([id, c]) => [id, compOr<Scene | null>(c, null)] as const)
    .filter((e): e is readonly [string, Scene] => e[1] !== null),
);
export const SCENE_PARAMS: Record<string, readonly unknown[]> = objOr<Record<string, readonly unknown[]>>(real.SCENE_PARAMS, stub.SCENE_PARAMS);
