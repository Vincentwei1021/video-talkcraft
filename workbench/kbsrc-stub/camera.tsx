// stub：相机骨架直通渲染（真实运镜来自口播成片工程）
import React from "react";
import { AbsoluteFill } from "remotion";
export type CamKey = unknown;
export type CamImpulse = unknown;
export const CameraRig: React.FC<Record<string, unknown> & { children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>{children}</AbsoluteFill>
);
export const Plane: React.FC<Record<string, unknown> & { children?: React.ReactNode }> = ({ children }) => <>{children}</>;
