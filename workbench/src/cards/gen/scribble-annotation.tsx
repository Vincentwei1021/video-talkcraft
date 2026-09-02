import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, power2InOut, power2Out, tw } from "../shared";

// scribble-annotation · 手绘圈注箭头 —— 参数化版（源出 tplcards/scribble-annotation.tsx）
// 本卡无主持人（被圈注的假商品页截图占满版面）。
// 命门：各笔画时长与缓动保持 FIXED；画完的线干净静置（不做 line boil）。
// ★ 笔迹 path 是 demo 运行时量 DOM 固化的（960×540 设计坐标）：随 posX/posY 整体平移，
//   但不随字号/文案长度重排——改文案后如需对位请微调 posX/posY。
const FPS = 30;

// 各笔画：时长 / 缓动 / 长度 / path 为 FIXED（t0 由 startDelay + gapBetween 链式推导，
// 默认 0.50 / 1.60 / 2.55 / 2.90，与模板逐帧一致）
const STROKES: { d: string; len: number; dur: number; ease: (x: number) => number }[] = [
  { // 圈：绕价格墨迹画 1.6 圈的手绘椭圆，起笔快收笔缓
    dur: 0.55, ease: power2InOut, len: 534.56,
    d: "M 153.3 180.3 C 154.5 179.1 157.1 175.3 160.1 173 C 163.1 170.8 167.1 168.7 171.2 166.8 C 175.4 165 180.3 163.5 185.1 162.1 C 190 160.6 195 158.7 200.3 158 C 205.6 157.2 211.6 157.4 216.9 157.6 C 222.3 157.8 227.3 158.7 232.3 159.3 C 237.3 159.9 242.7 160.3 247.1 161.4 C 251.5 162.6 255.1 164.4 258.8 166.1 C 262.5 167.7 266 169.5 269.3 171.4 C 272.6 173.3 276.8 175.2 278.7 177.6 C 280.6 179.9 280.5 182.8 280.6 185.5 C 280.7 188.2 280.1 190.9 279.1 193.5 C 278 196.2 276.8 199 274.2 201.4 C 271.6 203.8 267 205.9 263.4 208 C 259.9 210.1 256.6 212.3 252.8 214.3 C 248.9 216.3 244.8 218.5 240.1 220 C 235.3 221.4 229.7 222.2 224.3 223.1 C 218.9 224 213.3 225.1 207.8 225.4 C 202.3 225.7 196.3 225.7 191.2 225 C 186.1 224.2 181.8 222.4 177.3 221.1 C 172.8 219.8 168.1 218.8 164.2 217.2 C 160.3 215.6 156.7 213.7 153.9 211.7 C 151 209.6 149.5 207.2 147.4 204.8 C 145.2 202.5 142 200.2 140.9 197.6 C 139.8 195.1 139.9 192.1 140.9 189.4 C 142 186.7 144.9 184 147.2 181.5 C 149.5 178.9 151.5 176.1 154.9 173.9 C 158.4 171.6 163.2 169.7 167.6 168 C 172.1 166.2 177 165 181.8 163.4 C 186.6 161.9 191.1 159.8 196.3 158.7 C 201.4 157.6 207.3 157.1 212.9 156.8 C 218.5 156.5 224.1 156.6 229.6 156.8 C 235.2 157.1 241.3 157.2 246.1 158.4 C 250.8 159.5 254.6 161.7 258.3 163.6 C 261.9 165.4 264.9 167.5 268 169.5 C 271 171.6 274.7 173.5 276.6 175.9 C 278.6 178.2 278.9 180.9 279.7 183.6 C 280.6 186.2 281.6 188.8 281.6 191.6 C 281.5 194.3 281.6 197.4 279.7 200 C 277.7 202.7 273.4 205.1 269.9 207.5 C 266.3 209.8 262.6 212.1 258.4 214.1 C 254.1 216.1 246.7 218.5 244.3 219.4" },
  { // 下划线：一笔略带弧度的粗线，压在小字 baseline 下方
    dur: 0.40, ease: power2Out, len: 318.25,
    d: "M 164.6 302.9 C 169.9 302.9 185.8 302.9 196.4 303.2 C 207 303.5 217.6 304.7 228.2 304.8 C 238.8 304.9 249.4 303.9 260 303.8 C 270.6 303.7 281.2 304 291.8 304.3 C 302.4 304.6 313 305.5 323.6 305.5 C 334.2 305.6 344.8 304.5 355.4 304.5 C 366 304.4 376.6 305 387.2 305.1 C 397.8 305.2 408.4 305.5 419 305 C 429.6 304.6 440.2 303.2 450.8 302.6 C 461.4 301.9 477.3 301.5 482.6 301.2" },
  { // 箭头杆：下凸的三次曲线，尖端咬住按钮左缘
    dur: 0.35, ease: power2InOut, len: 203.19,
    d: "M 435 452 C 497.7 478 564.4 432.3 631 418" },
  { // 箭头须：两根须按杆末端切线算，永远朝目标
    dur: 0.15, ease: power2Out, len: 61.0,
    d: "M 599.9 410.3 L 631 418 L 609.5 437.4" },
];

interface Props {
  title?: string;
  priceMain?: string;
  priceOld?: string;
  spec?: string;
  fineText?: string;
  btnText?: string;
  inkColor?: string;
  underlineColor?: string;
  strokeW?: number;
  titleFontSize?: number;
  priceFontSize?: number;
  posX?: number;
  posY?: number;
  startDelay?: number;
  gapBetween?: number;
}

const ScribbleAnnotation: React.FC<Props> = ({
  title = "「限时特惠」某品牌无线耳机",
  priceMain = "¥299",
  priceOld = "¥899",
  spec = "降噪深度 48dB · 续航 36 小时 · 蓝牙 5.4",
  fineText = "数据来自实验室理想环境，实际效果因人而异",
  btnText = "立即抢购",
  inkColor = "#ff4d4d",
  underlineColor = "#ffd23e",
  strokeW = 6,
  titleFontSize = 24,
  priceFontSize = 42,
  posX = 130,
  posY = 55,
  startDelay = 0.5,
  gapBetween = 0.55,
}) => {
  const t = useCurrentFrame() / FPS;

  // t0 链：圈 → (+间隔) 下划线 → (+间隔) 箭头杆 → 箭头须紧跟杆尾
  // 默认参数还原模板时间表 0.50 / 1.60 / 2.55 / 2.90
  const t0s: number[] = [startDelay];
  t0s.push(t0s[0] + STROKES[0].dur + gapBetween);
  t0s.push(t0s[1] + STROKES[1].dur + gapBetween);
  t0s.push(t0s[2] + STROKES[2].dur);
  const colors = [inkColor, underlineColor, inkColor, inkColor];

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      {/* 演示语境（不属于动效）：一张被现场圈注的假商品页截图。白底 + 灰阶线框 */}
      <div
        style={{
          position: "absolute", left: posX, top: posY,
          width: 700, height: 430, boxSizing: "border-box",
          borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
          borderRadius: 6, padding: "26px 30px", color: "#1d1d1f",
        }}
      >
        <div style={{ height: 14, background: "#ececec", borderRadius: 7, marginBottom: 14, width: "46%" }} />
        <h3 style={{ fontSize: titleFontSize, fontWeight: 700, margin: "0 0 18px" }}>{title}</h3>
        <div style={{ fontSize: priceFontSize, fontWeight: 800, margin: "10px 0 22px" }}>
          <span>{priceMain}</span>
          <small
            style={{
              fontSize: 20, fontWeight: 600, color: "#8a8a8a",
              textDecoration: "line-through", marginLeft: 26,
            }}
          >
            {priceOld}
          </small>
        </div>
        <p style={{ fontSize: 17, lineHeight: 1.8, color: "#8a8a8a", margin: 0 }}>{spec}</p>
        <p style={{ fontSize: 15, color: "#a6a6a6", margin: "10px 0 0" }}>* <span>{fineText}</span></p>
        <div
          style={{
            position: "absolute", right: 44, bottom: 40,
            padding: "12px 34px", borderRadius: 26,
            borderWidth: 1, borderStyle: "solid", borderColor: "#e0e0e0",
            color: "#8a8a8a", fontSize: 19, fontWeight: 700,
          }}
        >
          {btnText}
        </div>
      </div>
      {/* 标注层（动效本体）盖在截图之上；随截图平移 */}
      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} viewBox="0 0 960 540">
        <g transform={`translate(${posX - 130} ${posY - 55})`}>
          {/* 描画一笔：dashoffset 从全长到 0；画完保持静置 */}
          {STROKES.map((s, i) => (
            <path
              key={i} d={s.d} fill="none" stroke={colors[i]} strokeWidth={strokeW}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={s.len}
              strokeDashoffset={s.len * (1 - tw(t, t0s[i], s.dur, s.ease))}
            />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "scribble-annotation",
  name: "手绘圈注箭头",
  category: "强调标注",
  durationInFrames: 104,
  accent: "#ff4d4d",
  component: ScribbleAnnotation as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "title", label: "商品标题", default: "「限时特惠」某品牌无线耳机" },
    { type: "text", key: "priceMain", label: "现价（被圈）", default: "¥299" },
    { type: "text", key: "priceOld", label: "划线原价", default: "¥899" },
    { type: "text", key: "spec", label: "规格行", default: "降噪深度 48dB · 续航 36 小时 · 蓝牙 5.4" },
    { type: "text", key: "fineText", label: "小字免责（被划线）", default: "数据来自实验室理想环境，实际效果因人而异" },
    { type: "text", key: "btnText", label: "按钮文案（被指）", default: "立即抢购" },
    { type: "color", key: "inkColor", label: "圈/箭头色", default: "#ff4d4d" },
    { type: "color", key: "underlineColor", label: "下划线色", default: "#ffd23e" },
    { type: "slider", key: "strokeW", label: "笔画线宽", default: 6, min: 4, max: 10, step: 0.5, unit: "px" },
    { type: "slider", key: "titleFontSize", label: "标题字号", default: 24, min: 16, max: 32, step: 1, unit: "px" },
    { type: "slider", key: "priceFontSize", label: "价格字号", default: 42, min: 28, max: 56, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "截图 X", default: 130, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "截图 Y", default: 55, step: 1, unit: "px" },
    { type: "slider", key: "startDelay", label: "起手静置", default: 0.5, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "gapBetween", label: "标注间隔", default: 0.55, min: 0.2, max: 1.5, step: 0.05, unit: "s" },
  ],
};
