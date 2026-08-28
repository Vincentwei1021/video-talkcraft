import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// subscribe-cta · 多平台关注 CTA —— 自包含 Remotion 源码（与 demos/subscribe-cta/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。

// —— 可摘走的核心动画：三种平台式样共用一套机制 ——
//    ①控件弹入 → ②光标弧线移入做交互 → ③状态翻转 + 确认动效（铃铛摆 / 依次点亮 / 对勾划入）
const CONFIG = {
  accent: "#e62117",        // 唯一高亮色（订阅红=按钮语义色，兼作"点亮"态）
  idle:   "#8a8a8a",        // 未点亮的线框灰
  plateOff: "#ffffff",      // 三连图标底盘未点亮
  plateEdge: "#d2d2d7",
  segFade: 0.3,             // 段落淡入/淡出
  segGap: 0.15,             // 段与段之间留白
  segHold: 0.5,             // 每段做完后的停留（让观众读结果）
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
  START: { x: 1010, y: 205 },  // 光标起手位：舞台右外侧
  // 光标目标点（demo 里由 DOM 现量；此处取量得的终态值——控件 scale0 时 rect 塌缩到几何中心）
  P_SUB: { x: 433, y: 446.25 },   // 订阅按钮中心
  P_LIKE: { x: 374, y: 416 },     // "点赞"底盘中心
  P_FL: { x: 480, y: 451 },       // 关注胶囊中心
};

/* 时间表（demo 秒）——三段串行摊平：
   段 A（YouTube）b=0.10：0.25 按钮弹入 → 0.50–1.30 光标移入 → tc=1.40 点击
     1.48 变"已订阅" → 1.55 铃铛淡入 → 1.65–2.45 衰减摆 + 1.70 涟漪 → 2.95 段淡出
   段 B（B站）b=3.40：3.52/3.64/3.76 三盘弹入 → 3.85–4.65 光标移入 → tp=4.75 按住
     4.80–5.35 进度环走满 → 5.35/5.55/5.75 依次点亮 → 6.65 段淡出
   段 C（关注）b=7.10：7.25 胶囊弹入 → 7.50–8.30 光标移入 → tc=8.40 点击
     8.48 变"已关注" → 8.56–8.92 对勾划入 → 9.42–9.72 段淡出 → 总 9.72s */
const B_A = 0.1;
const TC_A = B_A + 0.4 + CONFIG.cursorMove + 0.1;                 // 1.40 段A点击帧
const END_A = TC_A + 0.25 + CONFIG.bellTime + CONFIG.segHold;     // 2.95
const B_B = END_A + CONFIG.segFade + CONFIG.segGap;               // 3.40
const TP_B = B_B + 0.45 + CONFIG.cursorMove + 0.1;                // 4.75 段B按住帧
const T_LIGHT = TP_B + 0.05 + CONFIG.holdPress;                   // 5.35 点亮起点
const END_B = T_LIGHT + 2 * CONFIG.triStep + 0.4 + CONFIG.segHold;// 6.65
const B_C = END_B + CONFIG.segFade + CONFIG.segGap;               // 7.10
const TC_C = B_C + 0.4 + CONFIG.cursorMove + 0.1;                 // 8.40 段C点击帧
const END_C = TC_C + 0.16 + CONFIG.checkDraw + CONFIG.segHold;    // 9.42
const TOTAL = END_C + CONFIG.segFade;                             // 9.72

export const meta = { width: 960, height: 540, fps: 30, durationInFrames: Math.round((TOTAL + 0.4) * 30) };

const FPS = meta.fps;

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);   // GSAP 缺省 ease
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const backOut = (s: number) => (x: number) => {
  const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u;
};

// 颜色插值（gsap 对 color 的补间是逐通道线性）
const hex2rgb = (h: string) => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16),
] as const;
const mix = (a: string, b: string, p: number) => {
  const ca = hex2rgb(a), cb = hex2rgb(b);
  return `rgb(${Math.round(lerp(ca[0], cb[0], p))}, ${Math.round(lerp(ca[1], cb[1], p))}, ${Math.round(lerp(ca[2], cb[2], p))})`;
};

// 控件弹入 keyframes：scale 0→1.06（power3.out）→1（power2.out）
const popIn = (t: number, at: number, dIn: number) => {
  const d1 = dIn * 0.65, d2 = dIn * 0.35;
  return t < at + d1
    ? lerp(0, 1.06, tw(t, at, d1, power3Out))
    : lerp(1.06, 1, tw(t, at + d1, d2, power2Out));
};

// 主持人占位：演示语境素材，不属于动效本体
const Host: React.FC<{ src?: string }> = ({ src }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex",
                alignItems: "flex-end", justifyContent: "center", background: "#fff" }}>
    {src ? (
      <Loop durationInFrames={13 * FPS}>
        <OffthreadVideo src={src} muted transparent style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)", height: "88%" }} />
      </Loop>
    ) : (
      <div style={{ width: "42%", height: "78%", background:
        "radial-gradient(ellipse 46% 26% at 50% 13%, #e3e3e6 60%, transparent 61%)," +
        "radial-gradient(ellipse 50% 62% at 50% 84%, #ececef 60%, transparent 61%)" }} />
    )}
  </div>
);

// —— 口播语境：主持人说"点个关注"，overlay 在下方把动作演一遍 ——
//    demo 依次演三种平台式样（订阅式 / 三连式 / 关注式）；落地时一条视频只出现其中一种、只出现一次。
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */
.cta-zone {
  position: absolute;
  left: 0; right: 0;
  bottom: 58px;
  height: 190px;
}
/* 一段 = 一种平台式样，段间淡出淡入切换 */
.seg {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
/* 平台标签：小字灰阶（说明"这是哪家的式样"，不是台词字幕） */
.plat {
  font-size: 14px;
  letter-spacing: 2px;
  color: #8a8a8a;
  background: #ffffff;
  border: 1px solid #e6e6e9;
  border-radius: 999px;
  padding: 4px 15px;
}
.row { display: flex; align-items: center; gap: 22px; }

/* ——— 式样 A：订阅 + 铃铛（YouTube）——— */
.sub-btn {
  padding: 14px 38px;
  border-radius: 10px;
  background: #e62117;
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 3px;
}
.sub-btn.done { background: #ececef; color: #8a8a8a; }
/* 铃铛坐在白色圆底盘上：overlay 压实拍时深色铃铛在深色背景上会糊掉 */
.bell {
  position: relative;
  width: 72px; height: 72px;
  border: 1.5px solid #d2d2d7;
  border-radius: 50%;
  background: #ffffff;
  display: flex; align-items: center; justify-content: center;
}
.bell svg { display: block; transform-origin: 50% 8%; }  /* 从铃铛顶部悬点摆 */
.bell .rip { inset: -9px; border-color: #1d1d1f; }

/* ——— 式样 B：一键三连（B站）——— */
.tri-row { display: flex; align-items: flex-start; gap: 34px; }
.tri-item { display: flex; flex-direction: column; align-items: center; }
.plate-wrap { position: relative; width: 72px; height: 72px; }
.plate {
  position: absolute; inset: 0;
  border: 1.5px solid #d2d2d7;
  border-radius: 50%;
  background: #ffffff;
  display: flex; align-items: center; justify-content: center;
}
.glyph { display: block; width: 44px; height: 44px; }
.glyph path, .glyph circle {
  fill: none; stroke: #8a8a8a; stroke-width: 2;
  stroke-linejoin: round; stroke-linecap: round;
}
/* 图标名走白底小胶囊：overlay 压在实拍上时，裸灰字会糊进人物衣服 */
.tri-label {
  font-size: 12px; color: #8a8a8a; letter-spacing: 1px;
  margin-top: 9px;
  background: #ffffff;
  border-radius: 999px;
  padding: 2px 10px;
}
/* 长按进度环：绕着"点赞"走一圈，走完才触发三连 */
.hold-ring {
  position: absolute; left: -11px; top: -11px;
  width: 94px; height: 94px;
  transform: rotate(-90deg);   /* 起点挪到 12 点方向 */
}
.hold-ring circle {
  fill: none; stroke: #e62117; stroke-width: 3; stroke-linecap: round;
  stroke-dasharray: 282.7;
}

/* ——— 式样 C：关注（小红书 / 抖音 / X）——— */
.follow-btn {
  position: relative;
  min-width: 196px;
  padding: 13px 40px;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 25px;
  font-weight: 700;
  letter-spacing: 4px;
  text-align: center;
  /* 白描边：黑胶囊压在深色衣服上会连成一片，描边让轮廓始终成立 */
  box-shadow: 0 0 0 3px #ffffff;
}
.follow-btn.done { background: #ececef; color: #8a8a8a; }
.tick {
  position: absolute;
  left: 15px; top: 50%;
  width: 26px; height: 26px;
  margin-top: -13px;
}
.tick path {
  fill: none; stroke: #1d1d1f; stroke-width: 3;
  stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 27;
}
.follow-btn .rip { inset: -8px; border-radius: 999px; border-color: #1d1d1f; }

/* 通用涟漪环（三式共用的点击确认） */
.rip {
  position: absolute;
  inset: -9px;
  border: 2px solid #e62117;
  border-radius: 50%;
  pointer-events: none;
}

/* 光标：三式共用的同一枚"演员"，尖端锚在元素左上角 */
.cursor {
  position: absolute; left: 0; top: 0;
  width: 30px; height: 45px;
  transform-origin: 0% 0%;
  z-index: 20;
  pointer-events: none;
}
`;

// 一段的光标行程：set 显形 → 弧线移入 → 按下/抬起 → 朝右下滑出
type CursorLeg = { setAt: number; target: { x: number; y: number }; downAt: number; upAt: number; outAt: number };
function cursorState(t: number, leg: CursorLeg) {
  const C = CONFIG;
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

export default function SubscribeCta({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;

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
    cursorState(t, { setAt: B_A + 0.4, target: C.P_SUB, downAt: TC_A, upAt: TC_A + 0.09, outAt: TC_A + 0.22 }) ??
    cursorState(t, { setAt: B_B + 0.45, target: C.P_LIKE, downAt: TP_B, upAt: T_LIGHT + 0.12, outAt: T_LIGHT + 0.3 }) ??
    cursorState(t, { setAt: B_C + 0.4, target: C.P_FL, downAt: TC_C, upAt: TC_C + 0.09, outAt: TC_C + 0.22 });

  const glyphStroke = (i: number) => mix(C.idle, "#ffffff", plateLight(i));
  const plateBg = (i: number) => mix(C.plateOff, C.accent, plateLight(i));
  const plateEdge = (i: number) => mix(C.plateEdge, C.accent, plateLight(i));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <Host src={hostSrc} />

      <div className="cta-zone">
        {/* 式样 A：订阅 + 铃铛 */}
        <div className="seg seg-yt" style={{ opacity: segAO }}>
          <div className="plat">YouTube · 订阅 + 铃铛</div>
          <div className="row">
            <div className={"sub-btn" + (subDone ? " done" : "")}
                 style={{ transform: `scale(${subS})`, transformOrigin: "50% 50%" }}>
              {subDone ? "已订阅" : "订阅"}
            </div>
            <div className="bell" style={{ opacity: bellO }}>
              <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: `rotate(${bellRot}deg)` }}>
                <path d="M22 4 a4 4 0 0 1 4 4 c6 2 8 8 8 14 v6 l4 5 H6 l4 -5 v-6 c0 -6 2 -12 8 -14 a4 4 0 0 1 4 -4 z" fill="#1d1d1f" />
                <circle cx="22" cy="38" r="4" fill="#1d1d1f" />
              </svg>
              <div className="rip" style={{
                opacity: bellRipOn ? lerp(0.7, 0, bellRipP) : 0,
                transform: `scale(${bellRipOn ? lerp(0.6, 1.9, bellRipP) : 0.6})`,
              }}></div>
            </div>
          </div>
        </div>

        {/* 式样 B：一键三连（长按点赞 → 三个图标依次点亮） */}
        <div className="seg seg-tri" style={{ opacity: segBO }}>
          <div className="plat">B站 · 一键三连（长按点赞）</div>
          <div className="tri-row">
            {[
              <svg key="like" className="glyph" viewBox="0 0 44 44" aria-hidden="true">
                <path d="M8 19.5 h8 v17 h-8 z" style={{ stroke: glyphStroke(0) }} />
                <path d="M18 36.5 H30 C32.2 36.5 34 34.9 34.3 32.8 L35.9 24.6 C36.3 22.3 34.7 20.4 32.5 20.4 H26.8 L27.8 14.3 C28.2 11.6 26.4 9.2 23.8 9 L21.6 15.7 L18 20.6 Z" style={{ stroke: glyphStroke(0) }} />
              </svg>,
              <svg key="coin" className="glyph" viewBox="0 0 44 44" aria-hidden="true">
                <circle cx="22" cy="22" r="14" style={{ stroke: glyphStroke(1) }} />
                <path d="M17.2 16.4 L22 22 L26.8 16.4" style={{ stroke: glyphStroke(1) }} />
                <path d="M22 22 V29.6" style={{ stroke: glyphStroke(1) }} />
                <path d="M17.6 24.6 H26.4" style={{ stroke: glyphStroke(1) }} />
              </svg>,
              <svg key="fav" className="glyph" viewBox="0 0 44 44" aria-hidden="true">
                <path d="M22 7 L26.2 16.2 L36.3 17.4 L28.8 24.2 L30.8 34.1 L22 29.2 L13.2 34.1 L15.2 24.2 L7.7 17.4 L17.8 16.2 Z" style={{ stroke: glyphStroke(2) }} />
              </svg>,
            ].map((glyph, i) => (
              <div key={i} className="tri-item">
                <div className="plate-wrap">
                  <div className="plate" style={{
                    transform: `scale(${plateS(i)})`,
                    transformOrigin: "50% 50%",
                    backgroundColor: plateBg(i),
                    borderColor: plateEdge(i),
                  }}>
                    {glyph}
                  </div>
                  <div className="rip" style={{
                    opacity: triRipOn(i) ? lerp(0.7, 0, triRipP(i)) : 0,
                    transform: `scale(${triRipOn(i) ? lerp(0.85, 1.75, triRipP(i)) : 0.85})`,
                  }}></div>
                  {i === 0 ? (
                    <svg className="hold-ring" viewBox="0 0 94 94" aria-hidden="true" style={{ opacity: ringO }}>
                      <circle cx="47" cy="47" r="45" style={{ strokeDashoffset: arcOffset }} />
                    </svg>
                  ) : null}
                </div>
                <div className="tri-label">{["点赞", "投币", "收藏"][i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 式样 C：关注（胶囊按钮 → 已关注 + 对勾划入） */}
        <div className="seg seg-fl" style={{ opacity: segCO }}>
          <div className="plat">小红书 / 抖音 / X · 关注</div>
          <div className="row">
            <div className={"follow-btn" + (flDone ? " done" : "")}
                 style={{ transform: `scale(${flS})`, transformOrigin: "50% 50%" }}>
              <svg className="tick" viewBox="0 0 26 26" aria-hidden="true" style={{ opacity: tickO }}>
                <path d="M4 14 L10.5 20 L22 6.5" style={{ strokeDashoffset: tickOffset }} />
              </svg>
              <span className="ftxt">{flDone ? "已关注" : "关注"}</span>
              <div className="rip" style={{
                opacity: flRipOn ? lerp(0.6, 0, flRipP) : 0,
                transform: `scale(${flRipOn ? lerp(0.9, 1.28, flRipP) : 0.9})`,
              }}></div>
            </div>
          </div>
        </div>
      </div>

      {cur ? (
        <svg className="cursor" viewBox="0 0 14 21" aria-hidden="true" style={{
          opacity: cur.o,
          transform: `translate(${cur.x}px, ${cur.y}px) scale(${cur.s})`,
        }}>
          <path d="M1 1 L1 17.2 L5.3 13.3 L8.1 19.9 L10.8 18.8 L8 12.3 L13.1 12.3 Z"
                fill="#ffffff" stroke="#1d1d1f" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
}
