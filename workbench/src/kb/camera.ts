// kb 适配层 · camera：G1 相机（promo 工程 camera.tsx；skill 正式工程在 motion-systems/camera.tsx，文件级回退 stub 直通）。
import type React from "react";
import * as real from "@kbsrc/camera";
import * as stub from "../../kbsrc-stub/camera";
import { fnOr } from "./pick";

export type CamKey = unknown;
export type CamImpulse = unknown;
type Rig = React.FC<Record<string, unknown> & { children?: React.ReactNode }>;
export const CameraRig: Rig = fnOr(real.CameraRig, stub.CameraRig as Rig);
export const Plane: Rig = fnOr(real.Plane, stub.Plane as Rig);
