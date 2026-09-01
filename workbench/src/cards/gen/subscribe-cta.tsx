import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import {
  FONT_STACK, HostSilhouette, lerp, linear, mixHex,
  power1Out, power2InOut, power2Out, power3Out, tw,
} from "../shared";

// subscribe-cta · 多平台关注 CTA —— 参数化版（源出 tplcards/subscribe-cta.tsx）
// 命门：①控件弹入 → ②光标弧线移入做交互 → ③状态翻转 + 确认动效（铃铛衰减摆 / 依次点亮 / 对勾划入）。
// 光标行程 / 弹入曲线 / 铃铛摆角表全部 FIXED；光标落点按默认版式量得——改动文案长度可能让落点偏几像素。
const FPS = 30;

const FIXED = {
  idle: "#8a8a8a",          // 未点亮的线框灰
  plateOff: "#ffffff",      // 三连图标底盘未点亮
  plateEdge: "#d2d2d7",
  segFade: 0.3,             // 段落淡入/淡出
  segGap: 0.15,             // 段与段之间留白
  btnIn: 0.35,              // 按钮/胶囊弹入 scale 0→1.06→1
  cursorMove: 0.8,          // 光标从屏外弧线移到目标（瞬移=没有引导意义）
  clickDip: 0.94,           // 点击帧控件下压比例
  bellSwings: [16, -12, 8, -5, 2, 0],  // 铃铛衰减摆角 °（匀速=节拍器，必须衰减）
  bellTime: 0.8,
  triStagger: 0.12,         // 三个图标入场间隔
  holdPress: 0.55,          // 长按进度环走满耗时（三连的门槛感）
  triStep: 0.2,             // 点亮的依次间隔（<0.1 像同时亮，看不出"三连"）
  triPop: 1.22,             // 点亮弹跳峰值
  checkDraw: 0.36,          // 对勾划入耗时
  START: { x: 1010, y: 205 },      // 光标起手位：舞台右外侧
  // 光标目标点（按默认版式量得的终态值）
  P_SUB: { x: 433, y: 446.25 },    // 订阅按钮中心
  P_LIKE: { x: 374, y: 416 },      // "点赞"底盘中心
  P_FL: { x: 480, y: 451 },        // 关注胶囊中心
};

// —— shared 未含的缓动，本卡局部定义 ——
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const power2In = (x: number) => x * x * x;
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const backOut = (s: number) => (x: number) => {
  const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u;
};

// 控件弹入 keyframes：scale 0→1.06（power3.out）→1（power2.out）
const popIn = (t: number, at: number, dIn: number) => {
  const d1 = dIn * 0.65, d2 = dIn * 0.35;
  return t < at + d1
    ? lerp(0, 1.06, tw(t, at, d1, power3Out))
    : lerp(1.06, 1, tw(t, at + d1, d2, power2Out));
};

// 一段的光标行程：set 显形 → 弧线移入 → 按下/抬起 → 朝右下滑出
type CursorLeg = { setAt: number; target: { x: number; y: number }; downAt: number; upAt: number; outAt: number };
function cursorState(t: number, leg: CursorLeg) {
  const C = FIXED;
  if (t < leg.setAt || t >= leg.outAt + 0.45) return null;
  // 光标移动：x/y 用不同缓动同时插值 → 轨迹自然成弧线
  const x = t < leg.outAt
    ? lerp(C.START.x, leg.target.x, tw(t, leg.setAt, C.cursorMove, power2InOut))
    : lerp(leg.target.x, leg.target.x + 96, tw(t, leg.outAt, 0.45, power2In));
  const y = t < leg.outAt
    ? lerp(C.START.y, leg.target.y, tw(t, leg.setAt, C.cursorMove, sineInOut))
    : lerp(leg.target.y, leg.target.y + 58, tw(t, leg.outAt, 0.45, power2In));
  const o = 1 - tw(t, leg.outAt, 0.45, power2In);
  // 按下/抬起（锚在箭头尖，微缩不让尖端移位）
  const s = t < leg.upAt
    ? lerp(1, 0.9, tw(t, leg.downAt, 0.09, power2Out))
    : lerp(0.9, 1, tw(t, leg.upAt, 0.09, power2Out));
  return { x, y, o, s };
}

// —— 演示语境：静态样式留 <style>（类名加 scta- 前缀）；颜色/字号等动态样式已改内联 ——
//    模板依赖 demo-shell 的全局 reset，此处收窄到 .scta-zone 作用域内，不外溢到别的卡。
const CSS = `
.scta-zone, .scta-zone * { margin: 0; padding: 0; box-sizing: border-box; }
.scta-zone {
  position: absolute;
  left: 0; right: 0;
  height: 190px;
}
/* 一段 = 一种平台式样，段间淡出淡入切换 */
.scta-seg {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
/* 平台标签：小字灰阶（说明"这是哪家的式样"，不是台词字幕） */
.scta-plat {
  font-size: 14px;
  letter-spacing: 2px;
  color: #8a8a8a;
  background: #ffffff;
  border: 1px solid #e6e6e9;
  border-radius: 999px;
  padding: 4px 15px;
}
.scta-row { display: flex; align-items: center; gap: 22px; }

/* ——— 式样 A：订阅 + 铃铛 ——— */
.scta-sub-btn {
  padding: 14px 38px;
  border-radius: 10px;
  font-weight: 700;
  letter-spacing: 3px;
}
/* 铃铛坐在白色圆底盘上：overlay 压实拍时深色铃铛在深色背景上会糊掉 */
.scta-bell {
  position: relative;
  width: 72px; height: 72px;
  border: 1.5px solid #d2d2d7;
  border-radius: 50%;
  background: #ffffff;
  display: flex; align-items: center; justify-content: center;
}
.scta-bell svg { display: block; transform-origin: 50% 8%; }

/* ——— 式样 B：一键三连 ——— */
.scta-tri-row { display: flex; align-items: flex-start; gap: 34px; }
.scta-tri-item { display: flex; flex-direction: column; align-items: center; }
.scta-plate-wrap { position: relative; width: 72px; height: 72px; }
.scta-plate {
  position: absolute; inset: 0;
  border-width: 1.5px; border-style: solid;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.scta-glyph { display: block; width: 44px; height: 44px; }
.scta-glyph path, .scta-glyph circle {
  fill: none; stroke-width: 2;
  stroke-linejoin: round; stroke-linecap: round;
}
/* 图标名走白底小胶囊：overlay 压在实拍上时，裸灰字会糊进人物衣服 */
.scta-tri-label {
  font-size: 12px; color: #8a8a8a; letter-spacing: 1px;
  margin-top: 9px;
  background: #ffffff;
  border-radius: 999px;
  padding: 2px 10px;
}
/* 长按进度环：绕着"点赞"走一圈，走完才触发三连 */
.scta-hold-ring {
  position: absolute; left: -11px; top: -11px;
  width: 94px; height: 94px;
  transform: rotate(-90deg);   /* 起点挪到 12 点方向 */
}
.scta-hold-ring circle {
  fill: none; stroke-width: 3; stroke-linecap: round;
  stroke-dasharray: 282.7;
}

/* ——— 式样 C：关注 ——— */
.scta-follow-btn {
  position: relative;
  min-width: 196px;
  padding: 13px 40px;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 4px;
  text-align: center;
  /* 白描边：黑胶囊压在深色衣服上会连成一片，描边让轮廓始终成立 */
  box-shadow: 0 0 0 3px #ffffff;
}
.scta-tick {
  position: absolute;
  left: 15px; top: 50%;
  width: 26px; height: 26px;
  margin-top: -13px;
}
.scta-tick path {
  fill: none; stroke: #1d1d1f; stroke-width: 3;
  stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 27;
}

/* 通用涟漪环（三式共用的点击确认；border-color 按式样内联） */
.scta-rip {
  position: absolute;
  inset: -9px;
  border-width: 2px; border-style: solid;
  border-radius: 50%;
  pointer-events: none;
}
.scta-rip-fl { inset: -8px; border-radius: 999px; }
`;

interface Props {
  platA?: string;
  subText?: string;
  subDoneText?: string;
  platB?: string;
  triLabels?: string;
  platC?: string;
  followText?: string;
  followDoneText?: string;
  accent?: string;
  followBg?: string;
  subSize?: number;
  followSize?: number;
  posY?: number;
  lead?: number;
  segHold?: number;
}

const SubscribeCta: React.FC<Props> = ({
  platA = "YouTube · 订阅 + 铃铛",
  subText = "订阅",
  subDoneText = "已订阅",
  platB = "B站 · 一键三连（长按点赞）",
  triLabels = "点赞 投币 收藏",
  platC = "小红书 / 抖音 / X · 关注",
  followText = "关注",
  followDoneText = "已关注",
  accent = "#e62117",
  followBg = "#1d1d1f",
  subSize = 26,
  followSize = 25,
  posY = 58,
  lead = 0.1,
  segHold = 0.5,
}) => {
  const t = useCurrentFrame() / FPS;
  const C = FIXED;

  // ———— 时间表：三段串行摊平（lead / segHold 是语境级节奏，其余间隔 FIXED）————
  const B_A = lead;
  const TC_A = B_A + 0.4 + C.cursorMove + 0.1;                  // 段A点击帧
  const END_A = TC_A + 0.25 + C.bellTime + segHold;
  const B_B = END_A + C.segFade + C.segGap;
  const TP_B = B_B + 0.45 + C.cursorMove + 0.1;                 // 段B按住帧
  const T_LIGHT = TP_B + 0.05 + C.holdPress;                    // 点亮起点
  const END_B = T_LIGHT + 2 * C.triStep + 0.4 + segHold;
  const B_C = END_B + C.segFade + C.segGap;
  const TC_C = B_C + 0.4 + C.cursorMove + 0.1;                  // 段C点击帧
  const END_C = TC_C + 0.16 + C.checkDraw + segHold;

  // CTA 区距底边可调：目标点 y 随之平移（版式量得基准 58px）
  const yOff = posY - 58;

  // ———— 段落淡入 / 淡出 ————
  const segO = (b: number, end: number) =>
    t < end ? tw(t, b, C.segFade, power2Out) : 1 - tw(t, end, C.segFade, power2In);

  // ———— 式样 A：订阅 + 铃铛 ————
  const segAO = segO(B_A, END_A);
  // 按钮弹入 → 点击下压 → back 回弹
  const subDone = t >= TC_A + 0.08;
  const subS = t < TC_A
    ? popIn(t, B_A + 0.15, C.btnIn)
    : t < TC_A + 0.08
      ? lerp(1, C.clickDip, tw(t, TC_A, 0.08, power2In))
      : lerp(C.clickDip, 1, tw(t, TC_A + 0.08, 0.2, backOut(3)));
  // 铃铛淡入 + 衰减摇摆 + 一圈涟漪
  const bellO = tw(t, TC_A + 0.15, 0.15, power1Out);
  const step = C.bellTime / C.bellSwings.length;
  let bellRot = 0;
  for (let i = 0; i < C.bellSwings.length; i++) {
    const t0 = TC_A + 0.25 + step * i;
    if (t <= t0) break;
    const from = i === 0 ? 0 : C.bellSwings[i - 1];
    bellRot = lerp(from, C.bellSwings[i], tw(t, t0, step, power1InOut));
  }
  const bellRipP = tw(t, TC_A + 0.3, 0.6, power2Out);
  const bellRipOn = t >= TC_A + 0.3;   // immediateRender:false —— 未点之前不显形

  // ———— 式样 B：一键三连 ————
  const segBO = segO(B_B, END_B);
  // 三个图标依次弹入 →（点赞盘）按压 → 依次点亮弹跳
  const plateS = (i: number) => {
    const inS = popIn(t, B_B + 0.12 + i * C.triStagger, 0.32);
    const lightAt = T_LIGHT + i * C.triStep;
    let s = inS;
    if (i === 0 && t >= TP_B) s = lerp(1, 0.95, tw(t, TP_B, 0.09, power2Out));
    if (t >= lightAt) {
      s = t < lightAt + 0.14
        ? lerp(i === 0 ? 0.95 : 1, C.triPop, tw(t, lightAt, 0.14, power3Out))
        : lerp(C.triPop, 1, tw(t, lightAt + 0.14, 0.26, backOut(2.4)));
    }
    return s;
  };
  // 依次点亮：底盘转高亮 + 线框转白 + 一圈涟漪
  const plateLight = (i: number) => tw(t, T_LIGHT + i * C.triStep, 0.16, power2Out);
  const triRipP = (i: number) => tw(t, T_LIGHT + i * C.triStep + 0.04, 0.5, power2Out);
  const triRipOn = (i: number) => t >= T_LIGHT + i * C.triStep + 0.04;
  // 长按进度环走满（三连的门槛感：不是点一下，是按住）
  const ringO = t < T_LIGHT + 0.05
    ? tw(t, TP_B, 0.12, power1Out)
    : 1 - tw(t, T_LIGHT + 0.05, 0.22, power2Out);
  const arcOffset = lerp(282.7, 0, tw(t, TP_B + 0.05, C.holdPress, linear));

  // ———— 式样 C：关注 ————
  const segCO = segO(B_C, END_C);
  const flDone = t >= TC_C + 0.08;
  const flS = t < TC_C
    ? popIn(t, B_C + 0.15, C.btnIn)
    : t < TC_C + 0.08
      ? lerp(1, C.clickDip, tw(t, TC_C, 0.08, power2In))
      : lerp(C.clickDip, 1, tw(t, TC_C + 0.08, 0.2, backOut(3)));
  const flRipP = tw(t, TC_C + 0.05, 0.5, power2Out);
  const flRipOn = t >= TC_C + 0.05;
  // 确认动效：对勾按笔序划入
  const tickO = tw(t, TC_C + 0.14, 0.1, power1Out);
  const tickOffset = lerp(27, 0, tw(t, TC_C + 0.16, C.checkDraw, power2Out));

  // ———— 光标：三式共用的同一枚"演员" ————
  const cur =
    cursorState(t, { setAt: B_A + 0.4, target: { x: C.P_SUB.x, y: C.P_SUB.y - yOff }, downAt: TC_A, upAt: TC_A + 0.09, outAt: TC_A + 0.22 }) ??
    cursorState(t, { setAt: B_B + 0.45, target: { x: C.P_LIKE.x, y: C.P_LIKE.y - yOff }, downAt: TP_B, upAt: T_LIGHT + 0.12, outAt: T_LIGHT + 0.3 }) ??
    cursorState(t, { setAt: B_C + 0.4, target: { x: C.P_FL.x, y: C.P_FL.y - yOff }, downAt: TC_C, upAt: TC_C + 0.09, outAt: TC_C + 0.22 });

  const glyphStroke = (i: number) => mixHex(C.idle, "#ffffff", plateLight(i));
  const plateBgAt = (i: number) => mixHex(C.plateOff, accent, plateLight(i));
  const plateEdgeAt = (i: number) => mixHex(C.plateEdge, accent, plateLight(i));
  const triNames = triLabels.trim().split(/\s+/);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <HostSilhouette />

      <div className="scta-zone" style={{ bottom: posY }}>
        {/* 式样 A：订阅 + 铃铛 */}
        <div className="scta-seg" style={{ opacity: segAO }}>
          <div className="scta-plat">{platA}</div>
          <div className="scta-row">
            <div className="scta-sub-btn" style={{
              transform: `scale(${subS})`, transformOrigin: "50% 50%",
              fontSize: subSize,
              background: subDone ? "#ececef" : accent,
              color: subDone ? "#8a8a8a" : "#fff",
            }}>
              {subDone ? subDoneText : subText}
            </div>
            <div className="scta-bell" style={{ opacity: bellO }}>
              <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: `rotate(${bellRot}deg)` }}>
                <path d="M22 4 a4 4 0 0 1 4 4 c6 2 8 8 8 14 v6 l4 5 H6 l4 -5 v-6 c0 -6 2 -12 8 -14 a4 4 0 0 1 4 -4 z" fill="#1d1d1f" />
                <circle cx="22" cy="38" r="4" fill="#1d1d1f" />
              </svg>
              <div className="scta-rip" style={{
                borderColor: "#1d1d1f",
                opacity: bellRipOn ? lerp(0.7, 0, bellRipP) : 0,
                transform: `scale(${bellRipOn ? lerp(0.6, 1.9, bellRipP) : 0.6})`,
              }}></div>
            </div>
          </div>
        </div>

        {/* 式样 B：一键三连（长按点赞 → 三个图标依次点亮） */}
        <div className="scta-seg" style={{ opacity: segBO }}>
          <div className="scta-plat">{platB}</div>
          <div className="scta-tri-row">
            {[
              <svg key="like" className="scta-glyph" viewBox="0 0 44 44" aria-hidden="true">
                <path d="M8 19.5 h8 v17 h-8 z" style={{ stroke: glyphStroke(0) }} />
                <path d="M18 36.5 H30 C32.2 36.5 34 34.9 34.3 32.8 L35.9 24.6 C36.3 22.3 34.7 20.4 32.5 20.4 H26.8 L27.8 14.3 C28.2 11.6 26.4 9.2 23.8 9 L21.6 15.7 L18 20.6 Z" style={{ stroke: glyphStroke(0) }} />
              </svg>,
              <svg key="coin" className="scta-glyph" viewBox="0 0 44 44" aria-hidden="true">
                <circle cx="22" cy="22" r="14" style={{ stroke: glyphStroke(1) }} />
                <path d="M17.2 16.4 L22 22 L26.8 16.4" style={{ stroke: glyphStroke(1) }} />
                <path d="M22 22 V29.6" style={{ stroke: glyphStroke(1) }} />
                <path d="M17.6 24.6 H26.4" style={{ stroke: glyphStroke(1) }} />
              </svg>,
              <svg key="fav" className="scta-glyph" viewBox="0 0 44 44" aria-hidden="true">
                <path d="M22 7 L26.2 16.2 L36.3 17.4 L28.8 24.2 L30.8 34.1 L22 29.2 L13.2 34.1 L15.2 24.2 L7.7 17.4 L17.8 16.2 Z" style={{ stroke: glyphStroke(2) }} />
              </svg>,
            ].map((glyph, i) => (
              <div key={i} className="scta-tri-item">
                <div className="scta-plate-wrap">
                  <div className="scta-plate" style={{
                    transform: `scale(${plateS(i)})`,
                    transformOrigin: "50% 50%",
                    backgroundColor: plateBgAt(i),
                    borderColor: plateEdgeAt(i),
                  }}>
                    {glyph}
                  </div>
                  <div className="scta-rip" style={{
                    borderColor: accent,
                    opacity: triRipOn(i) ? lerp(0.7, 0, triRipP(i)) : 0,
                    transform: `scale(${triRipOn(i) ? lerp(0.85, 1.75, triRipP(i)) : 0.85})`,
                  }}></div>
                  {i === 0 ? (
                    <svg className="scta-hold-ring" viewBox="0 0 94 94" aria-hidden="true" style={{ opacity: ringO }}>
                      <circle cx="47" cy="47" r="45" style={{ stroke: accent, strokeDashoffset: arcOffset }} />
                    </svg>
                  ) : null}
                </div>
                <div className="scta-tri-label">{triNames[i] ?? ""}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 式样 C：关注（胶囊按钮 → 已关注 + 对勾划入） */}
        <div className="scta-seg" style={{ opacity: segCO }}>
          <div className="scta-plat">{platC}</div>
          <div className="scta-row">
            <div className="scta-follow-btn" style={{
              transform: `scale(${flS})`, transformOrigin: "50% 50%",
              fontSize: followSize,
              background: flDone ? "#ececef" : followBg,
              color: flDone ? "#8a8a8a" : "#fff",
            }}>
              <svg className="scta-tick" viewBox="0 0 26 26" aria-hidden="true" style={{ opacity: tickO }}>
                <path d="M4 14 L10.5 20 L22 6.5" style={{ strokeDashoffset: tickOffset }} />
              </svg>
              <span>{flDone ? followDoneText : followText}</span>
              <div className="scta-rip scta-rip-fl" style={{
                borderColor: "#1d1d1f",
                opacity: flRipOn ? lerp(0.6, 0, flRipP) : 0,
                transform: `scale(${flRipOn ? lerp(0.9, 1.28, flRipP) : 0.9})`,
              }}></div>
            </div>
          </div>
        </div>
      </div>

      {cur ? (
        <svg viewBox="0 0 14 21" aria-hidden="true" style={{
          position: "absolute", left: 0, top: 0,
          width: 30, height: 45,
          transformOrigin: "0% 0%", zIndex: 20, pointerEvents: "none",
          opacity: cur.o,
          transform: `translate(${cur.x}px, ${cur.y}px) scale(${cur.s})`,
        }}>
          <path d="M1 1 L1 17.2 L5.3 13.3 L8.1 19.9 L10.8 18.8 L8 12.3 L13.1 12.3 Z"
                fill="#ffffff" stroke="#1d1d1f" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "subscribe-cta",
  name: "多平台关注 CTA",
  category: "人物互动",
  durationInFrames: 304,
  accent: "#e62117",
  component: SubscribeCta as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "platA", label: "段A平台标签", default: "YouTube · 订阅 + 铃铛" },
    { type: "text", key: "subText", label: "订阅键文案", default: "订阅" },
    { type: "text", key: "subDoneText", label: "已订阅文案", default: "已订阅" },
    { type: "text", key: "platB", label: "段B平台标签", default: "B站 · 一键三连（长按点赞）" },
    { type: "text", key: "triLabels", label: "三连图标名（空格分隔）", default: "点赞 投币 收藏" },
    { type: "text", key: "platC", label: "段C平台标签", default: "小红书 / 抖音 / X · 关注" },
    { type: "text", key: "followText", label: "关注键文案", default: "关注" },
    { type: "text", key: "followDoneText", label: "已关注文案", default: "已关注" },
    { type: "color", key: "accent", label: "高亮色（订阅红/点亮态）", default: "#e62117" },
    { type: "color", key: "followBg", label: "关注胶囊底色", default: "#1d1d1f" },
    { type: "slider", key: "subSize", label: "订阅键字号", default: 26, min: 18, max: 34, step: 1, unit: "px" },
    { type: "slider", key: "followSize", label: "关注键字号", default: 25, min: 18, max: 34, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "CTA 区距底边", default: 58, min: 0, max: 300, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0.1, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "segHold", label: "每段做完后的停留", default: 0.5, min: 0.2, max: 1.5, step: 0.05, unit: "s" },
  ],
};
