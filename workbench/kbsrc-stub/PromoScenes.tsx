// stub：镜头场景占位（真实场景来自口播成片工程）
import React from "react";
import { AbsoluteFill } from "remotion";
export const PromoScene: React.FC<Record<string, unknown>> = () => (
  <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7", color: "#6e6e73", fontSize: 28 }}>
    该镜头需链接口播成片工程（见 workbench/README）
  </AbsoluteFill>
);
