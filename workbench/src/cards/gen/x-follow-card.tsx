import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { hexToRgb, lerp, power2Out, power3Out, power2InOut, tw } from "../shared";

// x-follow-card · 关注卡弹出 —— 参数化版（源出 tplcards/x-follow-card.tsx）
// 命门（缺一条就退化成"一张图淡入"）：①卡 spring 弹入与十层错峰 blur-in 是两件事；
// ②光标必须走过去再点、点击帧尖端压在按钮上；③点击一刻三件事同帧：两态交叉+涟漪+粉丝数 +1 滚动。
// 产品皮 = 内容本身（2026-08-25 定版：完全还原 X 深色资料卡），故深色皮仅开放 accent/cardBg 两色。
const FPS = 30;

const FIXED = {
  cardIn: 0.62,        // 卡弹入：y 46→0 + scale 0.9→1（back.out 1.35）
  layerStagger: 0.07,  // 十层错峰间隔
  layerDur: 0.24,      // 单层 blur-in 时长
  layerBlur: 8,        // 入场模糊起点 px
  cursorMove: 0.95,    // 光标弧线移入；瞬移=没有"有人在点"的证据
  clickDip: 0.9,       // 点击帧按钮下压
  flipDur: 0.34,       // 两态交叉：退的缩 1→0.92、进的涨 0.86→1 带回弹
  rollDur: 0.42,       // 粉丝数滚动（旧数字上推出、新数字从下推入）
  START: { x: 1000, y: 470 },     // 光标起手位：舞台右下外侧
  TARGET: { x: 672.05, y: 196.1 },// 关注按钮几何中心（卡居中 480,270 时量得）
  TIP: { x: 1 / 14 * 30, y: 1 / 21 * 45 },  // 光标箭头尖相对元素左上角的偏移
};

// —— shared 未含的缓动，本卡局部定义 ——
const power2In = (x: number) => x * x * x;
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const backOut = (s: number) => (x: number) => {
  const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u;
};

/* 静态产品皮留 <style>（类名加 xfc- 前缀）；accent/cardBg/字号等动态样式已改内联。
   模板依赖 demo-shell 的全局 reset，此处收窄到 .xfc-scaler 作用域内。 */
const CSS = `
.xfc-scaler, .xfc-scaler * { margin: 0; padding: 0; box-sizing: border-box; }

/* 卡按源码的 600px 参考宽度 1:1 写死，再用 .xfc-scaler 整体缩放进 960×540 舞台 */
.xfc-scaler {
  position: absolute;
  transform: translate(-50%, -50%) scale(0.885);
  transform-origin: 50% 50%;
}

.xfc-card {
  position: relative;
  width: 600px;
  border: 1px solid #2f3336;           /* THEMES.dark.cardBorder */
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 24px 70px -18px rgba(0, 0, 0, 0.55);
  transform-origin: 50% 0%;
  font-family: "TwitterChirp", -apple-system, "Segoe UI", Roboto,
               "PingFang SC", "Hiragino Sans GB", sans-serif;
  color: #e7e9ea;                      /* THEMES.dark.fg */
}

.xfc-cover { position: relative; height: 150px; }
/* X 标：官方嵌入式关注卡在右上角带这枚标 */
.xfc-cover .xfc-xmark {
  position: absolute;
  right: 20px; top: 18px;
  width: 26px; height: 26px;
  display: block;
  fill: #ffffff;
  opacity: 0.95;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.25));
}

.xfc-pad { padding: 0 24px 24px; }

/* 头像：110、4px 卡底色描边圈、上提压在封面下沿 */
.xfc-avatar-slot { margin-top: -55px; }
.xfc-avatar {
  width: 110px; height: 110px;
  border-radius: 100%;
  border-width: 4px; border-style: solid;
  box-sizing: border-box;
  background: #5b6771;                 /* X 默认头像的灰阶底 */
  position: relative;
  overflow: hidden;
}
/* X 默认头像剪影：头 + 肩两团 */
.xfc-avatar::after {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 21% 21% at 50% 35%, #cfd9de 62%, transparent 63%),
              radial-gradient(ellipse 35% 31% at 50% 93%, #cfd9de 62%, transparent 63%);
}

.xfc-idblock { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; }
.xfc-idline { display: flex; align-items: center; gap: 6px; }
.xfc-name {
  font-weight: 800;
  color: #e7e9ea;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
/* 认证印章：22×22，fill = accent（内联） */
.xfc-badge { display: block; width: 22px; height: 22px; }
.xfc-handle { font-size: 16px; font-weight: 400; color: #71767b; line-height: 1.3; }
.xfc-bio { margin: 8px 0 0; font-size: 16px; font-weight: 400; color: #e7e9ea; line-height: 1.4; }

.xfc-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; }
.xfc-meta span { display: flex; align-items: center; gap: 6px; font-size: 15px; color: #71767b; }
.xfc-meta svg { display: block; width: 16px; height: 16px; fill: #71767b; }

/* 计数行：数字亮、标签暗 */
.xfc-stats { display: flex; gap: 20px; margin-top: 12px; font-size: 15px; }
.xfc-stats span { color: #71767b; }
.xfc-stats b { color: #e7e9ea; font-weight: 700; }
/* 数字滚动窗：窗口只露一行高（20px），里面一条上下两格的纸带在推（动的是纸带不是窗） */
.xfc-roll { display: inline-block; height: 20px; overflow: hidden; vertical-align: -4px; }
.xfc-roll .xfc-strip { display: block; }
.xfc-roll i { display: block; height: 20px; line-height: 20px; font-style: normal; font-weight: 700; color: #e7e9ea; }

.xfc-btnspacer { height: 32px; }

/* tabs：active 指示条改为真实子元素（颜色内联） */
.xfc-tabs { display: flex; column-gap: 32px; border-bottom: 1px solid #2f3336; }
.xfc-tabs div {
  position: relative;
  padding-bottom: 12px;
  font-size: 15px; font-weight: 500;
  color: #71767b;
}
.xfc-tabs div.xfc-on { font-weight: 700; color: #e7e9ea; }

/* 示例帖 */
.xfc-post { display: flex; gap: 12px; margin-top: 16px; }
.xfc-post .xfc-pav {
  flex: 0 0 auto;
  width: 44px; height: 44px;
  border-radius: 100%;
  border-width: 4px; border-style: solid;
  box-sizing: border-box;
  background: #5b6771;
  position: relative; overflow: hidden;
}
.xfc-post .xfc-pav::after {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 21% 21% at 50% 35%, #cfd9de 62%, transparent 63%),
              radial-gradient(ellipse 35% 31% at 50% 93%, #cfd9de 62%, transparent 63%);
}
.xfc-post .xfc-pbody { flex: 1; min-width: 0; }
.xfc-post .xfc-phead { display: flex; align-items: center; gap: 6px; }
.xfc-post .xfc-phead b { font-size: 15px; font-weight: 700; color: #e7e9ea; }
.xfc-post .xfc-phead span { font-size: 15px; color: #71767b; }
.xfc-post .xfc-ptext { margin: 4px 0 0; font-size: 15px; color: #e7e9ea; line-height: 1.4; }
.xfc-post .xfc-pcounts { display: flex; gap: 40px; margin-top: 10px; font-size: 13px; color: #71767b; }

/* 按钮行：距卡右 24px、距卡顶 170px */
.xfc-btnrow { position: absolute; right: 24px; top: 170px; display: flex; align-items: center; gap: 8px; }
/* 私信键：圆形 40、1px cardBorder 描边 */
.xfc-msg {
  width: 40px; height: 40px; border-radius: 100%;
  border: 1px solid #2f3336;
  display: flex; align-items: center; justify-content: center;
}
.xfc-msg svg { display: block; width: 20px; height: 20px; fill: #e7e9ea; }

/* 关注按钮：116×40，两态叠在同一个盒子里交叉 */
.xfc-follow {
  position: relative;
  width: 116px; height: 40px;
  border-radius: 20px;
  transform-origin: 50% 50%;
}
.xfc-follow > div {
  position: absolute; inset: 0;
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700;
  box-sizing: border-box;
}
/* 已关注态：1px 描边（深色皮下不反白，否则比卡还亮） */
.xfc-f-on { border: 1px solid #536471; color: #e7e9ea; }
/* 点击涟漪：胶囊形（颜色内联） */
.xfc-rip {
  position: absolute; inset: -6px;
  border-width: 2px; border-style: solid; border-radius: 999px;
  pointer-events: none;
}
`;

interface Props {
  name?: string;
  handle?: string;
  bio?: string;
  metaLoc?: string;
  metaSite?: string;
  metaJoin?: string;
  followingCount?: string;
  followingLabel?: string;
  followersFrom?: string;
  followersTo?: string;
  followersLabel?: string;
  tabsDsl?: string;
  postMeta?: string;
  postText?: string;
  postCounts?: string;
  followText?: string;
  followDoneText?: string;
  accent?: string;
  cardBg?: string;
  nameSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
  cursorStart?: number;
}

const XFollowCard: React.FC<Props> = ({
  name = "陈叙白",
  handle = "@chenxubai",
  bio = "十年产品设计，现在做独立开发。这里写用不完的方法论和踩过的坑。",
  metaLoc = "杭州",
  metaSite = "xubai.design",
  metaJoin = "2019 年 3 月加入",
  followingCount = "286",
  followingLabel = "正在关注",
  followersFrom = "12.4万",
  followersTo = "12.5万",
  followersLabel = "关注者",
  tabsDsl = "帖子 回复 媒体 喜欢",
  postMeta = "@chenxubai · 2天",
  postText = "今天上线了新东西，全靠一套自己攒的动效库和很多杯咖啡。",
  postCounts = "12 48 312",
  followText = "关注",
  followDoneText = "已关注",
  accent = "#1d9bf0",
  cardBg = "#16181c",
  nameSize = 24,
  posX = 480,
  posY = 270,
  lead = 0,
  cursorStart = 1.55,
}) => {
  const t = useCurrentFrame() / FPS;
  const C = FIXED;

  // 点击帧：光标起手（语境级，给口播余量）+ 弧线移入耗时
  const TC = lead + cursorStart + C.cursorMove + 0.08;
  // 卡可整体挪位：光标目标点随卡中心平移（量得基准 480,270）
  const target = {
    x: C.TARGET.x + (posX - 480) - C.TIP.x,
    y: C.TARGET.y + (posY - 270) - C.TIP.y,
  };

  // ① 卡弹入：位移/缩放先动，淡入是独立的时间窗
  const cp = tw(t, lead, C.cardIn, backOut(1.35));
  const cardY = lerp(46, 0, cp);
  const cardS = lerp(0.9, 1, cp);
  const cardO = tw(t, lead + 0.05, 0.3, power2Out);

  // ② 十层错峰 blur-in：壳到位后内容按阅读顺序逐层落
  const layer = (i: number): React.CSSProperties => {
    const p = tw(t, lead + 0.34 + i * C.layerStagger, C.layerDur, power2Out);
    return {
      opacity: p,
      transform: `translateY(${lerp(8, 0, p)}px)`,
      filter: `blur(${lerp(C.layerBlur, 0, p)}px)`,
    };
  };

  // ③ 光标弧线移入：x 用 power2.inOut、y 用 sine.inOut 异速叠出弧线
  // ⑤ 点完顺势朝右下滑出并淡出（用完即走，不常驻挡内容）
  const moveAt = lead + cursorStart;
  const outStart = TC + 0.22;
  const curX = t < outStart
    ? lerp(C.START.x, target.x, tw(t, moveAt, C.cursorMove, power2InOut))
    : lerp(target.x, target.x + 92, tw(t, outStart, 0.45, power2In));
  const curY = t < outStart
    ? lerp(C.START.y, target.y, tw(t, moveAt, C.cursorMove, sineInOut))
    : lerp(target.y, target.y + 56, tw(t, outStart, 0.45, power2In));
  const curO = t < moveAt ? 0 : 1 - tw(t, outStart, 0.45, power2In);
  // 点击帧光标下压 / 抬起
  const curS = t < TC + 0.09
    ? lerp(1, 0.9, tw(t, TC, 0.09, power2Out))
    : lerp(0.9, 1, tw(t, TC + 0.09, 0.09, power2Out));

  // ④ 点击帧：按钮下压回弹 + 两态交叉 + 涟漪 + 计数 +1（全部同帧起）
  const followS = t < TC + 0.08
    ? lerp(1, C.clickDip, tw(t, TC, 0.08, power2In))
    : lerp(C.clickDip, 1, tw(t, TC + 0.08, 0.22, backOut(3)));
  const offP = tw(t, TC, C.flipDur * 0.7, power2In);
  const onP = tw(t, TC, C.flipDur, backOut(1.7));
  // 涟漪（未到点击帧前必须不可见）
  const ripP = tw(t, TC + 0.03, 0.5, power2Out);
  const ripO = t < TC + 0.03 ? 0 : lerp(0.55, 0, ripP);
  const ripS = t < TC + 0.03 ? 0.92 : lerp(0.92, 1.3, ripP);
  // 粉丝数 +1：纸带上推一行——社会证明的落点
  const stripY = lerp(0, -20, tw(t, TC + 0.1, C.rollDur, power3Out));

  // 封面：coverUrl="" 时的 tintGradient(accent)
  const [ar, ag, ab] = hexToRgb(accent);
  const coverBg = `linear-gradient(135deg, ${accent} 0%, rgba(${ar}, ${ag}, ${ab}, 0.6) 55%, rgba(${ar}, ${ag}, ${ab}, 0.33) 100%)`;
  const tabs = tabsDsl.trim().split(/\s+/);
  const counts = postCounts.trim().split(/\s+/);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="xfc-scaler" style={{ left: posX, top: posY }}>
        <div className="xfc-card" style={{
          background: cardBg,
          opacity: cardO,
          transform: `translateY(${cardY}px) scale(${cardS})`,
        }}>
          <div className="xfc-cover" style={{ ...layer(0), background: coverBg }}>
            <svg className="xfc-xmark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
            </svg>
          </div>
          <div className="xfc-pad">
            <div className="xfc-avatar-slot" style={layer(1)}>
              <div className="xfc-avatar" style={{ borderColor: cardBg }}></div>
            </div>

            <div className="xfc-idblock">
              <div className="xfc-idline" style={layer(2)}>
                <span className="xfc-name" style={{ fontSize: nameSize }}>{name}</span>
                {/* X 认证印章 22×22，fill = accent */}
                <svg className="xfc-badge" viewBox="0 0 22 22" aria-hidden="true" style={{ fill: accent }}>
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              </div>
              <div className="xfc-handle" style={layer(3)}>{handle}</div>
            </div>
            <div className="xfc-bio" style={layer(4)}>{bio}</div>

            <div className="xfc-meta" style={layer(5)}>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>
                {metaLoc}
              </span>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" /></svg>
                <span style={{ color: accent }}>{metaSite}</span>
              </span>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" /></svg>
                {metaJoin}
              </span>
            </div>

            <div className="xfc-stats" style={layer(6)}>
              <span><b>{followingCount}</b> {followingLabel}</span>
              <span>
                <span className="xfc-roll">
                  <span className="xfc-strip" style={{ transform: `translateY(${stripY}px)` }}>
                    <i>{followersFrom}</i><i>{followersTo}</i>
                  </span>
                </span>{" "}
                {followersLabel}
              </span>
            </div>

            <div className="xfc-btnspacer" aria-hidden="true"></div>

            <div className="xfc-tabs" style={layer(7)}>
              {tabs.map((tab, i) => (
                <div key={i} className={i === 0 ? "xfc-on" : undefined}>
                  {tab}
                  {i === 0 ? (
                    <span style={{
                      position: "absolute", left: 0, bottom: -1,
                      width: 56, height: 4, borderRadius: 2, background: accent,
                    }} />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="xfc-post" style={layer(8)}>
              <div className="xfc-pav" style={{ borderColor: cardBg }}></div>
              <div className="xfc-pbody">
                <div className="xfc-phead"><b>{name}</b><span>{postMeta}</span></div>
                <p className="xfc-ptext">{postText}</p>
                <div className="xfc-pcounts">{counts.map((c, i) => <span key={i}>{c}</span>)}</div>
              </div>
            </div>
          </div>

          <div className="xfc-btnrow" style={layer(9)}>
            <div className="xfc-msg" style={{ background: cardBg }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.638V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.638-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z" /></svg>
            </div>
            <div className="xfc-follow" style={{ transform: `scale(${followS})` }}>
              <div style={{ background: accent, color: "#ffffff", opacity: 1 - offP, transform: `scale(${lerp(1, 0.92, offP)})` }}>
                {followText}
              </div>
              <div className="xfc-f-on" style={{ background: cardBg, opacity: Math.min(1, onP), transform: `scale(${lerp(0.86, 1, onP)})` }}>
                {followDoneText}
              </div>
              <div className="xfc-rip" style={{ borderColor: accent, opacity: ripO, transform: `scale(${ripS})` }}></div>
            </div>
          </div>
        </div>
      </div>

      <svg viewBox="0 0 14 21" aria-hidden="true" style={{
        position: "absolute", left: 0, top: 0,
        width: 30, height: 45,
        transformOrigin: "0% 0%", zIndex: 20, pointerEvents: "none",
        opacity: curO,
        transform: `translate(${curX}px, ${curY}px) scale(${curS})`,
      }}>
        <path d="M1 1 L1 17.2 L5.3 13.3 L8.1 19.9 L10.8 18.8 L8 12.3 L13.1 12.3 Z"
              fill="#ffffff" stroke="#1d1d1f" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "x-follow-card",
  name: "关注卡弹出",
  category: "人物互动",
  durationInFrames: 133,
  accent: "#1d9bf0",
  component: XFollowCard as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "name", label: "昵称", default: "陈叙白" },
    { type: "text", key: "handle", label: "用户名（@handle）", default: "@chenxubai" },
    { type: "textarea", key: "bio", label: "简介", default: "十年产品设计，现在做独立开发。这里写用不完的方法论和踩过的坑。" },
    { type: "text", key: "metaLoc", label: "所在地", default: "杭州" },
    { type: "text", key: "metaSite", label: "站点链接", default: "xubai.design" },
    { type: "text", key: "metaJoin", label: "加入时间", default: "2019 年 3 月加入" },
    { type: "text", key: "followingCount", label: "正在关注数", default: "286" },
    { type: "text", key: "followingLabel", label: "正在关注标签", default: "正在关注" },
    { type: "text", key: "followersFrom", label: "粉丝数（点击前）", default: "12.4万" },
    { type: "text", key: "followersTo", label: "粉丝数（+1 后）", default: "12.5万" },
    { type: "text", key: "followersLabel", label: "关注者标签", default: "关注者" },
    { type: "text", key: "tabsDsl", label: "tab 标签（空格分隔，首个高亮）", default: "帖子 回复 媒体 喜欢" },
    { type: "text", key: "postMeta", label: "示例帖署名行", default: "@chenxubai · 2天" },
    { type: "textarea", key: "postText", label: "示例帖正文", default: "今天上线了新东西，全靠一套自己攒的动效库和很多杯咖啡。" },
    { type: "text", key: "postCounts", label: "示例帖互动数（空格分隔）", default: "12 48 312" },
    { type: "text", key: "followText", label: "关注键文案", default: "关注" },
    { type: "text", key: "followDoneText", label: "已关注文案", default: "已关注" },
    { type: "color", key: "accent", label: "品牌蓝（封面/印章/按钮）", default: "#1d9bf0" },
    { type: "color", key: "cardBg", label: "卡底色", default: "#16181c" },
    { type: "slider", key: "nameSize", label: "昵称字号", default: 24, min: 16, max: 32, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "卡中心 X", default: 480, min: 0, max: 960, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "卡中心 Y", default: 270, min: 0, max: 540, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "cursorStart", label: "光标起手（给口播余量）", default: 1.55, min: 0.6, max: 4, step: 0.05, unit: "s" },
  ],
};
