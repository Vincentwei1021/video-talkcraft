// stub：接入工程没有 MainVideo.tsx（或未链接）时的主合成占位
import React from "react";
import { AbsoluteFill } from "remotion";
export const MainVideo: React.FC<Record<string, unknown>> = () => (
  <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7", color: "#6e6e73", fontSize: 40, fontFamily: "-apple-system, PingFang SC, sans-serif" }}>
    接入工程没有 src/MainVideo.tsx（见 workbench/README「接入口播成片工程」）
  </AbsoluteFill>
);
export default MainVideo;
