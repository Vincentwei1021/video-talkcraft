// stub：世界画布直通（真实长镜头来自口播成片工程）
import React from "react";
import { AbsoluteFill } from "remotion";
export const WorldRig: React.FC<Record<string, unknown> & { children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>{children}</AbsoluteFill>
);
export const WorldPlane: React.FC<Record<string, unknown> & { children?: React.ReactNode }> = ({ children }) => <>{children}</>;
export const WorldItem: React.FC<{ x?: number; y?: number; w?: number; children?: React.ReactNode }> = ({ x = 0, y = 0, w, children }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w }}>{children}</div>
);
export const useArrive = (_x?: number, _y?: number, _r?: number) => 1;
