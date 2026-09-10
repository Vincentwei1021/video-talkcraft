// kb 适配层 · longtake：长镜头世界画布（promo 工程；缺则 stub 直通）。
import type React from "react";
import * as real from "@kbsrc/longtake";
import * as stub from "../../kbsrc-stub/longtake";
import { fnOr } from "./pick";

type Rig = React.FC<Record<string, unknown> & { children?: React.ReactNode }>;
export const WorldRig: Rig = fnOr(real.WorldRig, stub.WorldRig as Rig);
export const WorldPlane: Rig = fnOr(real.WorldPlane, stub.WorldPlane as Rig);
export const WorldItem: React.FC<{ x?: number; y?: number; w?: number; children?: React.ReactNode }> = fnOr(
  real.WorldItem,
  stub.WorldItem,
);
export const useArrive: (x?: number, y?: number, r?: number) => number = fnOr(real.useArrive, stub.useArrive);
