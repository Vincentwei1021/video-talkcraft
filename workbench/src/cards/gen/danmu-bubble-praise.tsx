import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, lerp, power3Out, tw } from "../shared";

// danmu-bubble-praise · 弹幕气泡 —— 参数化版（源出 tplcards/danmu-bubble-praise.tsx）
// 命门：进—停—走的交叠是本卡的全部语义——stagger（第一命门）与 hold 的配比保持 FIXED
// （hold + inDur 必须 ≤ 2×stagger，否则四枚挤成一墙）；各枚静态倾斜（贴歪感）同样 FIXED。
// 气泡 = 纯圆角胶囊，无尾巴/描边/投影；一屏只有一枚强调色，其余灰阶实色分层。
const FPS = 30;

const FIXED = {
  stagger: 0.55,      // 枚与枚的进场错峰 s：本卡第一命门（配合 hold 决定交叠量）
  inDur: 0.30,        // 单枚进场耗时 s（power3.out）
  hold: 0.75,         // 单枚在屏停留 s：+inDur 后必须 ≤ 2×stagger
  outDur: 0.40,       // 单枚飘走耗时 s（power1.in，出场比入场轻）
  inX: 26,            // 进场横向位移 px（从最近的边缘外侧推入，左半屏 −、右半屏 +）
  inScale: 0.88,      // 进场起始缩放
  outY: -18,          // 飘走上移 px（弹幕是往上滚出去的）
  tilt: [-1.5, 1.5, 1.2, -1.8], // 各枚静态倾斜 deg（贴歪感靠形状，全程不抖）
};

// shared 未含 power1In（飘走用缓入）——局部定义，对照 GSAP 名字
const power1In = (x: number) => x * x;

// 灰阶三级实色（不叠 opacity，靠明度分层）；"强调"一档吃 accent prop
const GRAY_ROLES: Record<string, { bg: string; fg: string }> = {
  灰深: { bg: "#e8e8ec", fg: "#1d1d1f" },
  灰中: { bg: "#e8e8ec", fg: "#545458" },
  灰浅: { bg: "#f2f2f4", fg: "#6e6e73" },
};

const DEFAULT_BUBBLES =
  "说得太对了|96,92|灰深\n干货满满 👍|700,158|强调\n收藏了|62,296|灰浅\n已经在用了|686,372|灰中";

const num = (s: string | undefined, fallback: number) => {
  const v = Number((s ?? "").trim());
  return (s ?? "").trim() !== "" && Number.isFinite(v) ? v : fallback;
};

interface Props {
  bubbles?: string;
  accent?: string;
  fontSize?: number;
  lead?: number;
}

const DanmuBubblePraise: React.FC<Props> = ({
  bubbles = DEFAULT_BUBBLES,
  accent = "#e0452c",
  fontSize = 21,
  lead = 0.4,
}) => {
  const t = useCurrentFrame() / FPS;

  // 逐行 DSL：文案|左,上|色（色 ∈ 强调/灰深/灰中/灰浅）
  const items = bubbles
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((line, i) => {
      const parts = line.split("|");
      const xy = (parts[1] ?? "").split(",");
      const x = num(xy[0], i % 2 === 0 ? 96 : 700);
      const y = num(xy[1], 92 + i * 92);
      const role = (parts[2] ?? "").trim();
      const color = role === "强调" ? { bg: accent, fg: "#ffffff" } : (GRAY_ROLES[role] ?? GRAY_ROLES["灰深"]);
      return { text: (parts[0] ?? "").trim(), x, y, color };
    });

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      {/* 演示语境：主持人占位铺满舞台，气泡绕在人物两侧（不属于动效本体） */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <HostSilhouette />
      </div>

      {items.map((b, i) => {
        const tIn = lead + i * FIXED.stagger;
        const tOut = tIn + FIXED.inDur + FIXED.hold;
        // 进：飘入落定（opacity/x/scale 同一条 power3.out）
        const pIn = tw(t, tIn, FIXED.inDur, power3Out);
        // 走：上移淡出（出场永远比入场轻——只走 opacity + y，不再动 scale）
        const pOut = tw(t, tOut, FIXED.outDur, power1In);
        const opacity = t < tOut ? pIn : 1 - pOut;
        const dir = b.x >= 480 ? 1 : -1; // 从最近的边缘外侧推入
        const x = lerp(dir * FIXED.inX, 0, pIn);
        const y = lerp(0, FIXED.outY, pOut);
        const scale = lerp(FIXED.inScale, 1, pIn);
        const tilt = FIXED.tilt[i % FIXED.tilt.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute", left: b.x, top: b.y, zIndex: 3,
              padding: "11px 20px",
              borderRadius: 999, // 单行评论 = 胶囊，一屏只用这一档圆角
              fontSize, fontWeight: 600, lineHeight: 1.25, whiteSpace: "nowrap",
              background: b.color.bg, color: b.color.fg,
              opacity,
              transform: `translate(${x}px, ${y}px) rotate(${tilt}deg) scale(${scale})`,
              transformOrigin: "50% 50%",
            }}
          >
            {b.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "danmu-bubble-praise",
  name: "弹幕气泡",
  category: "人物互动",
  durationInFrames: 131,
  accent: "#e0452c",
  component: DanmuBubblePraise as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "textarea",
      key: "bubbles",
      label: "气泡（每行：文案|左,上|色；色∈强调/灰深/灰中/灰浅，强调全场只用一枚）",
      default: DEFAULT_BUBBLES,
    },
    { type: "slider", key: "fontSize", label: "气泡字号", default: 21, min: 14, max: 32, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "强调色", default: "#e0452c" },
    { type: "slider", key: "lead", label: "起手静置（等口播点到评论）", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
  ],
};
