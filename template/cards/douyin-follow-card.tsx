import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// douyin-follow-card · 抖音主页关注卡 —— 自包含 Remotion 源码（与 demos/douyin-follow-card/index.html 同画面）
// 参考 x-follow-card 骨架；产品皮 = 抖音对外主页（产品皮 = 内容本身）。
// 本卡无主持人占位；复制本文件进你的工程即可用。

// ===== 可摘走的核心：CONFIG + 四段编排（弹入 → 内容错峰 → 光标点击翻转 + 副位→发私信；粉丝数静态）=====
// 三条决策构成"这张卡是可信的社会证明"，缺一条就退化成"一张图淡入"：
//  ① 卡整体 spring 弹入与内容**错峰 blur-in** 是两件事：壳先到位，内容再逐层落
//  ② 光标必须走过去再点，且**点击那一帧光标必须压在关注按钮上**
//  ③ 点击那一刻同帧：＋关注→已关注 两态交叉 + 涟漪 + 副位图标→发私信（粉丝数静态，同原版 X：约数看不出 +1）
const CONFIG = {
  cardIn: 0.62,        // 卡弹入：y 46→0 + scale 0.9→1（back.out，弹簧感）
  layerStagger: 0.07,  // 内容错峰间隔（垂直主列按阅读顺序；简介每行一档）
  layerDur: 0.24,      // 单层 blur-in 时长
  layerBlur: 8,        // 入场模糊起点 px
  cursorStart: 1.55,   // 光标起手（卡与内容都已就位，给口播一句话的余量）
  cursorMove: 0.95,    // 光标弧线移入（瞬移=没有"有人在点"的证据）
  clickDip: 0.92,      // 点击帧按钮下压
  flipDur: 0.34,       // 两态交叉：退的缩 1→0.92、进的涨 0.86→1 带回弹
  hold: 0.85,          // 读结果的停留
};

// ===== 内容（产品皮 = 内容本身，2026-08-25+ 用户定版：完全还原抖音对外主页样式）=====
// demo 样例 = 你提供的"界面3.jpg"（Vincent 号，已关注态）；未关注态由"＋关注→已关注"自动演绎。
// 换账号只改 CONTENT；时序在 CONFIG，改内容不碰任何时刻。
type Content = {
  bg: { type: "gradient" } | { type: "image"; src: string };
  topNav: boolean;
  nickname: string;
  verified: boolean;
  douyinId: string;
  stats: { like: string; follow: string; fans: string };
  bio: string[];
};
const CONTENT: Content = {
  bg: { type: "gradient" },                 // 默认：抖音蓝渐变；上传头图用 { type:"image", src }
  topNav: true,                              // 保留顶部 app 导航（返回/求更新/搜索/更多）
  nickname: "Vincent",
  verified: false,                           // 认证/蓝V 开关
  douyinId: "335248116",
  stats: { like: "3.2万", follow: "238", fans: "6455" },
  bio: [
    "持续分享 AI 最前沿的应用场景",
    "宣传片 skill 已开源，入群获取",
  ],
};

// —— 布局常量（逻辑宽 900；卡高随 bio 行数自适应，进度由 build 前按内容算）——
const W = 900;
const S = 500 / 900;       // 成片缩放：卡逻辑宽 900 → 500（更矮，简介更长也不易上下超屏）
const OUT_W = 500;         // 成片 meta 宽（= 500）
const COVER_H = 560;              // 背景渐变 + 顶部导航 + 头像 + 昵称 + 抖音号
const AVATAR = 200;               // 头像圆边长
const BIO_LINE_H = 40;            // 简介每行高（多行）
const MAX_BIO_LINES = 5;          // 简介行数上限（超出截断，避免卡过高顶到竖屏字幕位）
const BODY_PAD_T = 30, BODY_PAD_B = 34, BODY_PAD_X = 36;
const STATS_H = 40, GAP_BIO = 20, GAP_BTN = 34, BTN_H = 72;
// 关注按钮中心（卡内坐标）：左起 padX + 关注钮半宽（关注占左约 486 宽）
const BIO_LINES = Math.min(CONTENT.bio.length, MAX_BIO_LINES);
const BODY_H = BODY_PAD_T + STATS_H + GAP_BIO + BIO_LINES * BIO_LINE_H + GAP_BTN + BTN_H + BODY_PAD_B;
const H = COVER_H + BODY_H;       // 卡总高（demo 内容算得）

// 关注按钮中心：按钮行起点 y = COVER_H + BODY_PAD_T + STATS_H + GAP_BIO + bio*BIO_LINE_H + GAP_BTN
const BTN_ROW_Y = COVER_H + BODY_PAD_T + STATS_H + GAP_BIO + BIO_LINES * BIO_LINE_H + GAP_BTN;
const BTN_CX = BODY_PAD_X + 486 / 2;      // 关注钮中心 x（关注钮宽 486，左起 36）
const BTN_CY = BTN_ROW_Y + BTN_H / 2;
const TARGET = { x: BTN_CX, y: BTN_CY };
const TIP = { x: 1 / 14 * 30, y: 1 / 21 * 45 };   // 光标箭头尖相对元素左上角偏移

// —— 时间表（demo 秒）——
//   0.00–0.62  卡弹入 y46→0 / scale .9→1（back.out 1.35），0.05–0.35 淡入
//   0.34–0.34+stagger*(n-1)+0.24  内容/简介逐层错峰 blur-in
//   1.55–2.50  光标弧线移入（x power2.inOut / y sine.inOut）
//   2.58       点击帧 tc：光标下压 + 按钮下压 + 两态交叉 + 涟漪 + 副位图标→发私信
//   2.80–3.25  光标顺势右下滑出
//   3.18–4.03  停留读结果 → 总 4.03s
const TC = CONFIG.cursorStart + CONFIG.cursorMove + 0.08;
const TOTAL = TC + 0.6 + CONFIG.hold;

export const meta = { width: OUT_W, height: Math.round(H * S), fps: 30, durationInFrames: Math.round((TOTAL + 0.4) * 30) };

const FPS = meta.fps;

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const backOut = (s: number) => (x: number) => {
  const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u;
};

/* —— 产品皮 = 内容本身（抖音对外主页）——
      背景默认蓝渐变（从界面3.jpg 取样：#BBD7EF → #75A4D0）；上传头图则用 img。
      关注钮未关注红 #EB455B（从 JZ 未关注.png 取样）；已关注钮浅灰 #F1F1F2 + 黑字。
      数据/简介正文黑 #161823，次级灰 #9299A4；@ 蓝链用品牌蓝 #1E9FFF。 —— */
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

.scaler {
  position: absolute;
  left: 0; top: 0;
  width: ${W}px; height: ${H}px;
  transform: scale(${S});           /* 卡逻辑宽 900 → 成片 500（更矮，简介更长也不易超屏） */
  transform-origin: 0 0;
  overflow: hidden;
}

.card {
  position: relative;
  width: ${W}px;
  height: ${H}px;
  background: #ffffff;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.45);
  transform-origin: 50% 0%;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: #161823;
  display: flex;
  flex-direction: column;
}

/* 背景渐变（默认）或用户头图；顶部导航 / 头像 / 昵称 / 抖音号都压在这层上 */
.cover {
  position: relative;
  height: ${COVER_H}px;
  flex: 0 0 auto;
  background: linear-gradient(180deg, #bbd7ef 0%, #8fb7e8 46%, #75a4d0 100%);
}
.cover img.bgimg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
}

/* 顶部 app 导航（返回 / 求更新 / 搜索 / 更多）——半透明深底 + 白色 */
.topnav {
  position: absolute; left: 0; right: 0; top: 22px;
  display: flex; align-items: center;
  padding: 0 28px;
}
.topnav .back {
  width: 44px; height: 44px; border-radius: 100%;
  background: rgba(0, 0, 0, 0.22);
  display: flex; align-items: center; justify-content: center;
}
.topnav .back svg { width: 22px; height: 22px; fill: #fff; }
.topnav .spacer { flex: 1; }
.topnav .pill {
  display: flex; align-items: center; gap: 8px;
  height: 42px; padding: 0 18px; border-radius: 22px;
  background: rgba(0, 0, 0, 0.22);
  color: #fff; font-size: 20px; font-weight: 600;
}
.topnav .pill svg { width: 24px; height: 24px; fill: #fff; }
.topnav .ico {
  width: 44px; height: 44px; border-radius: 100%;
  background: rgba(0, 0, 0, 0.22);
  margin-left: 14px;
  display: flex; align-items: center; justify-content: center;
}
.topnav .ico svg { width: 22px; height: 22px; fill: #fff; }

/* 头像（左） + 昵称/抖音号（右） */
.head {
  position: absolute; top: 216px; left: 56px; right: 40px;
  display: flex; align-items: flex-start; gap: 34px;
}
.avatar {
  flex: 0 0 auto;
  width: ${AVATAR}px; height: ${AVATAR}px;
  border-radius: 100%;
  border: 6px solid rgba(255, 255, 255, 0.9);
  overflow: hidden;
  box-sizing: border-box;
  background: #c7ccd3;
  position: relative;
}
.avatar::after {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(ellipse 22% 22% at 50% 33%, #eef0f3 60%, transparent 61%),
              radial-gradient(ellipse 40% 36% at 50% 97%, #eef0f3 60%, transparent 61%);
}
/* 传了 avatar prop：真头像铺满，剪影占位不再叠在上面 */
.avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.avatar.has-img::after { content: none; }
.idcol { padding-top: 36px; min-width: 0; }
.nick { display: flex; align-items: center; gap: 12px; }
.nick .name { font-size: 48px; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
.nick .vbadge { width: 34px; height: 34px; fill: #25f4ee; }
.dvid { display: flex; align-items: center; gap: 10px; margin-top: 18px; font-size: 26px; color: rgba(255,255,255,0.92); }
.dvid .copy { width: 26px; height: 26px; fill: rgba(255,255,255,0.92); }

/* 白卡区：数据 + 简介 + 按钮（圆角顶，红/灰关注钮在此） */
.body {
  position: relative;
  flex: 1 0 auto;
  background: #ffffff;
  border-radius: 30px 30px 0 0;
  padding: ${BODY_PAD_T}px ${BODY_PAD_X}px ${BODY_PAD_B}px;
}
.stats { display: flex; gap: 46px; font-size: 34px; color: #9299a4; }
.stats b { color: #161823; font-weight: 700; font-size: 38px; }
.bio { margin-top: ${GAP_BIO}px; font-size: 27px; line-height: ${BIO_LINE_H}px; color: #161823; }
.bio .at { color: #1e9fff; }

/* 按钮行：左＝关注（＋关注红 → 已关注浅灰），右＝私信（未关注只显图标） */
.btnrow { display: flex; gap: 18px; margin-top: ${GAP_BTN}px; }
.follow {
  position: relative;
  flex: 1.35 0 0;
  height: ${BTN_H}px;
  border-radius: ${BTN_H / 2}px;
  transform-origin: 50% 50%;
}
.follow > div {
  position: absolute; inset: 0;
  border-radius: ${BTN_H / 2}px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  font-size: 30px; font-weight: 600;
  box-sizing: border-box;
}
.f-off { background: #eb455b; color: #ffffff; }
.f-on  { background: #f1f1f2; color: #161823; }
.f-on .chev { width: 26px; height: 26px; fill: #161823; }
.follow .rip {
  position: absolute; inset: -8px;
  border: 3px solid #eb455b; border-radius: 999px;
  pointer-events: none;
}
/* 发私信：未关注＝只显纸飞机图标；已关注＝图标+文字 */
.msgbtn {
  flex: 0 0 auto; width: 72px; height: ${BTN_H}px;
  border-radius: 20px;
  background: #f1f1f2; color: #161823;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 26px; font-weight: 600; overflow: hidden; white-space: nowrap;
}
.msgbtn svg { width: 30px; height: 30px; fill: #161823; }

.cursor {
  position: absolute; left: 0; top: 0;
  width: 36px; height: 54px;
  transform-origin: 0% 0%;
  z-index: 20;
  pointer-events: none;
}
`;

export default function DouyinFollowCard({ avatar }: { avatar?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const content = CONTENT;
  const target = { x: TARGET.x - TIP.x, y: TARGET.y - TIP.y };

  // ① 卡整体 spring 弹入：位移/缩放先动，淡入是独立时间窗
  const cp = tw(t, 0, C.cardIn, backOut(1.35));
  const cardY = lerp(46, 0, cp);
  const cardS = lerp(0.9, 1, cp);
  const cardO = tw(t, 0.05, 0.3, power2Out);

  // ② 内容逐层错峰 blur-in（垂直主列 + 简介每行一档）
  const layer = (i: number) => {
    const p = tw(t, 0.34 + i * C.layerStagger, C.layerDur, power2Out);
    return {
      opacity: p,
      transform: `translateY(${lerp(8, 0, p)}px)`,
      filter: `blur(${lerp(C.layerBlur, 0, p)}px)`,
    } as React.CSSProperties;
  };

  // ③ 光标弧线移入（x power2.inOut / y sine.inOut 异速叠弧），点完顺势右下滑出淡出
  const outStart = TC + 0.22;
  const curX = t < outStart
    ? lerp(W + 60, target.x, tw(t, C.cursorStart, C.cursorMove, power2InOut))
    : lerp(target.x, target.x + 90, tw(t, outStart, 0.45, power2In));
  const curY = t < outStart
    ? lerp(H + 60, target.y, tw(t, C.cursorStart, C.cursorMove, sineInOut))
    : lerp(target.y, target.y + 54, tw(t, outStart, 0.45, power2In));
  const curO = t < C.cursorStart ? 0 : 1 - tw(t, outStart, 0.45, power2In);
  const curS = t < TC + 0.09
    ? lerp(1, 0.9, tw(t, TC, 0.09, power2Out))
    : lerp(0.9, 1, tw(t, TC + 0.09, 0.09, power2Out));

  // ④ 点击帧：按钮下压回弹 + 两态交叉 + 涟漪 + 副位图标→发私信（粉丝数静态）
  const followS = t < TC + 0.08
    ? lerp(1, C.clickDip, tw(t, TC, 0.08, power2In))
    : lerp(C.clickDip, 1, tw(t, TC + 0.08, 0.22, backOut(3)));
  const offP = tw(t, TC, C.flipDur * 0.7, power2In);
  const onP = tw(t, TC, C.flipDur, backOut(1.7));
  const ripP = tw(t, TC + 0.03, 0.5, power2Out);
  const ripO = t < TC + 0.03 ? 0 : lerp(0.55, 0, ripP);
  const ripS = t < TC + 0.03 ? 0.92 : lerp(0.92, 1.3, ripP);
  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#161823", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="scaler">
        <div className="card" style={{ opacity: cardO, transform: `translateY(${cardY}px) scale(${cardS})` }}>
          <div className="cover" style={layer(0)}>
            {content.bg.type === "image" ? <img className="bgimg" src={content.bg.src} /> : null}
            {content.topNav ? (
              <div className="topnav" style={layer(1)}>
                <div className="back">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 4.4 9 12l7.6 7.6-1.6 1.6L6 12l9-9z" /></svg>
                </div>
                <div className="spacer"></div>
                <div className="ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 2a8.5 8.5 0 1 0 6.4 14.1l4.6 4.6 1.6-1.6-4.6-4.6A8.5 8.5 0 0 0 10.5 2zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z" /></svg>
                </div>
                <div className="ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-6a8 8 0 0 0-4.6 14.6c.3-1 .5-2.2.4-3.1l-.9-3.4a8 8 0 0 1-1.5-3.3 4 4 0 0 1 0-1.6A8 8 0 1 0 12 2zm0 2.4A5.6 5.6 0 0 1 12 16a5.6 5.6 0 0 1-2.9-.8c.4 1.6.7 3.3.6 5A8 8 0 1 1 12 4.4z" /></svg>
                </div>
              </div>
            ) : null}
            <div className="head" style={layer(2)}>
              <div className={avatar ? "avatar has-img" : "avatar"}>{avatar ? <img src={avatar} alt="" /> : null}</div>
              <div className="idcol">
                <div className="nick">
                  <span className="name">{content.nickname}</span>
                  {content.verified ? <svg className="vbadge" viewBox="0 0 24 24"><path d="M23 12l-2.4-2.8.5-3.7-3.7-.5L16 2.6 12 5 8 2.6 6.8 5.5l-3.7.5.5 3.7L1 12l2.4 2.8-.5 3.7 3.7.5L8 21.4 12 19l4 2.4 1.4-2.7 3.7-.5-.5-3.7z" /></svg> : null}
                </div>
                <div className="dvid">
                  {content.douyinId}
                  <svg className="copy" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3zm2 3a2 2 0 0 0-2 2v9h9v-2H9a2 2 0 0 1-2-2V9H6v9h9V9H8z" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="body">
            <div className="stats" style={layer(5)}>
              <span><b>{content.stats.like}</b> 获赞</span>
              <span><b>{content.stats.follow}</b> 关注</span>
              <span><b>{content.stats.fans}</b> 粉丝</span>
            </div>
            <div className="bio" style={layer(6)}>
              {content.bio.slice(0, MAX_BIO_LINES).map((line, li) => (
                <div key={li}>{line.split(/(\[\[@[^\]]+\]\])/g).map((seg, si) => {
                  const m = seg.match(/^\[\[(@[^\]]+)\]\]$/);
                  return m ? <span key={si} className="at">{m[1]}</span> : <span key={si}>{seg}</span>;
                })}</div>
              ))}
            </div>
            <div className="btnrow" style={layer(7)}>
              <div className="follow" style={{ transform: `scale(${followS})` }}>
                <div className="f-off" style={{ opacity: 1 - offP, transform: `scale(${lerp(1, 0.92, offP)})` }}>＋关注</div>
                <div className="f-on" style={{ opacity: Math.min(1, onP), transform: `scale(${lerp(0.86, 1, onP)})` }}>
                  已关注
                  <svg className="chev" viewBox="0 0 24 24"><path d="M7 9l5 5 5-5z" /></svg>
                </div>
                <div className="rip" style={{ opacity: ripO, transform: `scale(${ripS})` }}></div>
              </div>
              <div className="msgbtn" style={{ width: lerp(72, 200, onP) }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                {onP > 0.5 && <span>发私信</span>}
              </div>
            </div>
          </div>
        </div>
        <svg className="cursor" viewBox="0 0 14 21" aria-hidden="true" style={{
          opacity: curO,
          transform: `translate(${curX}px, ${curY}px) scale(${curS})`,
        }}>
          <path d="M1 1 L1 17.2 L5.3 13.3 L8.1 19.9 L10.8 18.8 L8 12.3 L13.1 12.3 Z"
                fill="#ffffff" stroke="#1d1d1f" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
    </AbsoluteFill>
  );
}
