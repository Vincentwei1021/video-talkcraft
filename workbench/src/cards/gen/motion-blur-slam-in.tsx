import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power2Out, power4Out, tw } from "../shared";

// motion-blur-slam-in · 模糊甩入急停 —— 参数化版（源出 tplcards/motion-blur-slam-in.tsx）
// 命门：甩入急停曲线整套 FIXED——power4.out 飞入 + σ∝(1-p)^0.75 方向模糊 + 3px 过冲回正；
// 改任何一项都会退化成"平移滑入"或"弹跳入场"。本卡无可见文案（占位截图是灰阶线框），
// 开放的只有强调灰色、两张卡的落位与语境级节奏（起手静置/连发间隔）。
const FPS = 30;

const FIXED = {
  fromX: 560,        // 屏外起始距离 px：≥ 半屏才有速度累积，模糊才有地方发生
  slam: 0.2,         // 飞入耗时 s：0.15~0.25，>0.35 就变成平移滑入
  // slamEase = power4.out：急停的命——快起 + 强减速；power2.out 读作"滑进来"
  blurMax: 18,       // 起点横向 σ（240px 宽卡）：>25 糊成云雾，<8 等于没做
  blurFalloff: 0.75, // σ ∝ (1-p)^0.75 —— power4.out 的速度衰减律，停住那帧自动归零
  overshoot: 3,      // 到位沿运动方向多冲 px：>8 就变回弹入场（那是 media-pop-in）
  settle: 0.1,       // 过冲回正耗时 s：>0.2 会被看成第二段运动
};

// —— 演示语境（不属于动效）：灰阶假截图卡的静态版式（类名加 mbsi- 前缀防串卡）——
const CSS = `
.mbsi-shot { position: absolute; background: #fff;
  border-width: 1px; border-style: solid; border-color: #e6e6e6;
  border-radius: 5px; box-shadow: 0 10px 24px rgba(0, 0, 0, .14); overflow: hidden; }
.mbsi-bar { height: 24px; background: #f2f2f4;
  border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #ececee;
  display: flex; align-items: center; gap: 5px; padding: 0 9px; }
.mbsi-bar i { width: 8px; height: 8px; border-radius: 50%; background: #cfcfd4; }
.mbsi-l { height: 8px; background: #d9d9de; border-radius: 3px; margin: 8px 15px; }
.mbsi-l.mbsi-s { width: 48%; }
.mbsi-bars { display: flex; align-items: flex-end; gap: 10px; height: 92px; margin: 20px 16px 0; }
.mbsi-bars b { flex: 1; background: #d9d9de; border-radius: 2px 2px 0 0; }
.mbsi-cap { height: 8px; width: 44%; background: #d9d9de; border-radius: 3px; margin: 12px 16px; }
`;

// 单卡在 t 时刻的位移与方向模糊 σ
function slamState(t: number, at: number) {
  const flyEnd = at + FIXED.slam;
  if (t < flyEnd) {
    // 飞入：位移终点多冲 overshoot px；σ 取同一条 tween 的已缓动进度 p，
    // σ = blurMax·(1-p)^0.75 —— 等价于"σ 跟着速度走"，p→1 时 σ 自动归零
    const p = tw(t, at, FIXED.slam, power4Out);
    return {
      x: lerp(FIXED.fromX, -FIXED.overshoot, p),
      sigma: FIXED.blurMax * Math.pow(1 - p, FIXED.blurFalloff),
    };
  }
  // 到位过冲回正：一帧级的"顶到底"回弹，不是弹跳入场。归零后 filter 整个摘掉
  return { x: lerp(-FIXED.overshoot, 0, tw(t, flyEnd, FIXED.settle, power2Out)), sigma: 0 };
}

interface Props {
  hiColor?: string;
  aPosX?: number;
  aPosY?: number;
  bPosX?: number;
  bPosY?: number;
  lead?: number;
  burst?: number;
}

const MotionBlurSlamIn: React.FC<Props> = ({
  hiColor = "#8a8a8a",
  aPosX = 60,
  aPosY = 150,
  bPosX = 200,
  bPosY = 236,
  lead = 0.4,
  burst = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  const a = slamState(t, lead);
  const b = slamState(t, lead + burst);

  // 静止画面绝不允许还挂着拖影：σ 归零时把 filter 整个摘掉
  const filterOf = (sigma: number, id: string) =>
    sigma < 0.05 ? undefined : `url(#${id})`;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      {/* 方向模糊滤镜：stdDeviation="σ 0" = 只糊横向，才读作速度而不是失焦。
          filter 区域必须放宽（x/width），否则拖影会被裁出硬边；sRGB 防白底上发灰的脏边 */}
      <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden>
        <defs>
          <filter id="mbsi-a" x="-60%" y="-20%" width="220%" height="140%"
                  colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${a.sigma.toFixed(2)} 0`} />
          </filter>
          <filter id="mbsi-b" x="-60%" y="-20%" width="220%" height="140%"
                  colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${b.sigma.toFixed(2)} 0`} />
          </filter>
        </defs>
      </svg>

      {/* 演示语境：左侧人物列 + 右侧净白素材区，卡从右外侧飞进来 */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "46%", overflow: "hidden" }}>
        <HostSilhouette />
      </div>

      <div style={{ position: "absolute", left: "46%", right: 0, top: 0, bottom: 0 }}>
        {/* 落位相对素材区：后到的 B 压前者一角——同方向连发 + 层级递增才读作"一沓一沓怼上来" */}
        <div
          className="mbsi-shot"
          style={{
            width: 240, height: 158, left: aPosX, top: aPosY, zIndex: 2,
            transform: `translateX(${a.x}px)`, filter: filterOf(a.sigma, "mbsi-a"),
          }}
        >
          <div className="mbsi-bar"><i /><i /><i /></div>
          <div style={{ height: 14, width: "62%", background: hiColor, borderRadius: 3, margin: "16px 15px 10px" }} />
          <div className="mbsi-l" /><div className="mbsi-l" /><div className="mbsi-l mbsi-s" />
        </div>
        <div
          className="mbsi-shot"
          style={{
            width: 230, height: 150, left: bPosX, top: bPosY, zIndex: 3,
            transform: `translateX(${b.x}px)`, filter: filterOf(b.sigma, "mbsi-b"),
          }}
        >
          <div className="mbsi-bars">
            <b style={{ height: "34%" }} /><b style={{ height: "52%" }} />
            <b style={{ height: "78%", background: hiColor }} /><b style={{ height: "46%" }} />
            <b style={{ height: "96%", background: hiColor }} /><b style={{ height: "62%" }} />
          </div>
          <div className="mbsi-cap" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "motion-blur-slam-in",
  name: "模糊甩入急停",
  category: "素材呈现",
  durationInFrames: 45,
  accent: "#8a8a8a",
  component: MotionBlurSlamIn as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "color", key: "hiColor", label: "强调灰（标题条/高亮柱）", default: "#8a8a8a" },
    { type: "number", key: "aPosX", label: "卡 A 左缘 X（素材区内）", default: 60, step: 1, unit: "px" },
    { type: "number", key: "aPosY", label: "卡 A 上缘 Y", default: 150, step: 1, unit: "px" },
    { type: "number", key: "bPosX", label: "卡 B 左缘 X（素材区内）", default: 200, step: 1, unit: "px" },
    { type: "number", key: "bPosY", label: "卡 B 上缘 Y", default: 236, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "burst", label: "连发间隔", default: 0.4, min: 0.2, max: 1, step: 0.05, unit: "s" },
  ],
};
