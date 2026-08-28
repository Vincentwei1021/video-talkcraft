import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// x-follow-card · X 关注卡弹出 —— 自包含 Remotion 源码（与 demos/x-follow-card/index.html 同画面）
// 本卡无主持人占位；复制本文件进你的工程即可用。

// ===== 可摘走的核心：CONFIG + 四段编排（弹入 → 十层错峰 → 光标点击翻转 + 计数 +1）=====
// 三条决策构成"这张卡是可信的社会证明"，缺一条就退化成"一张图淡入"：
//  ① 卡整体 spring 弹入（欠阻尼微过冲）与十层**错峰 blur-in** 是两件事：壳先到位，内容再逐层落
//  ② 光标必须走过去再点，且**点击那一帧光标必须压在按钮上**
//  ③ 点击那一刻三件事同帧：按钮两态交叉 + 涟漪 + **粉丝数 +1 滚动**——最后这个才是社会证明的落点
const CONFIG = {
  cardIn: 0.62,        // 卡弹入：y 46→0 + scale 0.9→1（back.out ≈ 源码 spring damping 12/stiffness 120）
  layerStagger: 0.07,  // 十层错峰间隔（源码每组差 2 帧 ≈ 0.067s）
  layerDur: 0.24,      // 单层 blur-in 时长（源码 6 帧 = 0.2s）
  layerBlur: 8,        // 入场模糊起点 px（源码 8px）
  cursorStart: 1.55,   // 光标起手（卡与内容都已就位，给口播一句话的余量）
  cursorMove: 0.95,    // 光标弧线移入（源码 32 帧 ≈ 1.07s）；瞬移=没有"有人在点"的证据
  clickDip: 0.9,       // 点击帧按钮下压
  flipDur: 0.34,       // 两态交叉：退的缩 1→0.92、进的涨 0.86→1 带回弹
  rollDur: 0.42,       // 粉丝数滚动（旧数字上推出、新数字从下推入）
  hold: 0.85,          // 读结果的停留
  START: { x: 1000, y: 470 },   // 光标起手位：舞台右下外侧
  // 关注按钮几何中心的舞台设计坐标（demo 里由 DOM 现量；tsx 侧布局与 demo 逐像素同构，
  // 这里直接取量得的终态值：卡 600×549 @ scale .885 居中，btnrow right 24 / top 170）
  TARGET: { x: 672.05, y: 196.1 },
  // 光标 SVG 的箭头尖在 viewBox(14×21) 的 (1,1)，渲染尺寸 30×45
  // ⇒ 尖端相对元素左上角的像素偏移。设 x/y 时要减掉它，落点才是"尖压在按钮心上"
  TIP: { x: 1 / 14 * 30, y: 1 / 21 * 45 },
};

/* 时间表（demo 秒）
   0.00–0.62  卡弹入 y46→0 / scale .9→1（back.out 1.35），0.05–0.35 淡入
   0.34–1.21  十层错峰 blur-in（每层 0.24s，间隔 0.07s）
   1.55–2.50  光标弧线移入（x power2.inOut / y sine.inOut）
   2.58       点击帧 tc：光标下压 + 按钮下压 + 两态交叉 + 涟漪 + 计数 +1
   2.80–3.25  光标顺势右下滑出
   3.18–4.03  停留读结果 → 总 4.03s */
const TC = CONFIG.cursorStart + CONFIG.cursorMove + 0.08;   // 点击帧 2.58

const TOTAL = TC + 0.6 + CONFIG.hold;   // 4.03

export const meta = { width: 960, height: 540, fps: 30, durationInFrames: Math.round((TOTAL + 0.4) * 30) };

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

/* —— 产品皮 = 内容本身（2026-08-25 用户定版：完全还原产品样式）——
      本卡涉及真实产品界面（X / 原 Twitter 的资料卡），所以**不做中性化**：
      深色卡 #16181c / 描边 #2f3336 / 主文 #e7e9ea / 次文 #71767b / 分隔 #2f3336、
      品牌蓝 #1d9bf0（封面渐变 + 认证印章 + 关注按钮 + tab 指示条 + 站点链接）
      全部照抄 registry/remocn/x-follow-card/index.tsx 的 THEMES.dark + accentColor。
      头像用灰阶占位圆（无真头像素材，且 X 默认头像本身就是灰阶剪影）。 —— */
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */

/* 卡按源码的 600px 参考宽度 1:1 写死，再用 .scaler 整体缩放进 960×540 舞台 */
.scaler {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%) scale(0.885);
  transform-origin: 50% 50%;
}

.card {
  position: relative;
  width: 600px;
  background: #16181c;                 /* THEMES.dark.cardBg */
  border: 1px solid #2f3336;           /* THEMES.dark.cardBorder */
  border-radius: 24px;                 /* 源码 borderRadius: 24 */
  overflow: hidden;
  box-shadow: 0 24px 70px -18px rgba(0, 0, 0, 0.55);
  transform-origin: 50% 0%;
  font-family: "TwitterChirp", -apple-system, "Segoe UI", Roboto,
               "PingFang SC", "Hiragino Sans GB", sans-serif;
  color: #e7e9ea;                      /* THEMES.dark.fg */
}

/* 封面：源码 coverUrl="" 时的 tintGradient(accent) */
.cover {
  position: relative;
  height: 150px;                       /* 源码 coverHeight（horizontal） */
  background: linear-gradient(135deg, #1d9bf0 0%, rgba(29, 155, 240, 0.6) 55%, rgba(29, 155, 240, 0.33) 100%);
}
/* X 标：官方嵌入式关注卡在右上角带这枚标（simple-icons 的 x 路径，1:1） */
.cover .xmark {
  position: absolute;
  right: 20px; top: 18px;
  width: 26px; height: 26px;
  display: block;
  fill: #ffffff;
  opacity: 0.95;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.25));
}

.pad { padding: 0 24px 24px; }

/* 头像：源码 avatarSize 110、4px 卡底色描边圈、marginTop -avatarSize/2 压在封面下沿 */
.avatar-slot { margin-top: -55px; }
.avatar {
  width: 110px; height: 110px;
  border-radius: 100%;
  border: 4px solid #16181c;
  box-sizing: border-box;
  background: #5b6771;                 /* X 默认头像的灰阶底 */
  position: relative;
  overflow: hidden;
}
/* X 默认头像剪影：头 + 肩两团 */
.avatar::after {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 21% 21% at 50% 35%, #cfd9de 62%, transparent 63%),
              radial-gradient(ellipse 35% 31% at 50% 93%, #cfd9de 62%, transparent 63%);
}

/* 名字行：源码 fontSize 24 / weight 800 / letterSpacing -0.01em / lineHeight 1.2 / gap 6 */
.idblock { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; }
.idline { display: flex; align-items: center; gap: 6px; }
.name {
  font-size: 24px; font-weight: 800;
  color: #e7e9ea;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
/* 认证印章：源码 VerifiedBadge 的 22×22 路径，fill = accent */
.badge { display: block; width: 22px; height: 22px; fill: #1d9bf0; }
.handle { font-size: 16px; font-weight: 400; color: #71767b; line-height: 1.3; }
.bio { margin: 8px 0 0; font-size: 16px; font-weight: 400; color: #e7e9ea; line-height: 1.4; }

/* meta 行：源码 gap 16 / fontSize 15 / 图标 16px / 站点用 accent */
.meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; }
.meta span { display: flex; align-items: center; gap: 6px; font-size: 15px; color: #71767b; }
.meta svg { display: block; width: 16px; height: 16px; fill: #71767b; }
.meta .site { color: #1d9bf0; }

/* 计数行：X 真实资料页的「正在关注 / 关注者」——数字亮、标签暗 */
.stats { display: flex; gap: 20px; margin-top: 12px; font-size: 15px; }
.stats span { color: #71767b; }
.stats b { color: #e7e9ea; font-weight: 700; }
/* 数字滚动窗：窗口只露一行高（20px），里面一条上下两格的纸带在推（动的是纸带不是窗） */
.roll { display: inline-block; height: 20px; overflow: hidden; vertical-align: -4px; }
.roll .strip { display: block; }
.roll i { display: block; height: 20px; line-height: 20px; font-style: normal; font-weight: 700; color: #e7e9ea; }

/* 按钮行留位：源码 <div style={{height: layout.h - 8}} /> */
.btnspacer { height: 32px; }

/* tabs：源码 columnGap 32 / fontSize 15 / active weight 700 / 指示条 4×56 radius 2 accent */
.tabs { display: flex; column-gap: 32px; border-bottom: 1px solid #2f3336; }
.tabs div {
  position: relative;
  padding-bottom: 12px;
  font-size: 15px; font-weight: 500;
  color: #71767b;
}
.tabs div.on { font-weight: 700; color: #e7e9ea; }
.tabs div.on::after {
  content: ""; position: absolute; left: 0; bottom: -1px;
  width: 56px; height: 4px; border-radius: 2px; background: #1d9bf0;
}

/* 示例帖：源码 SamplePost（头像 44 / 名字 15-700 / "@handle · 2d" / 正文 15 / 互动数 13） */
.post { display: flex; gap: 12px; margin-top: 16px; }
.post .pav {
  flex: 0 0 auto;
  width: 44px; height: 44px;
  border-radius: 100%;
  border: 4px solid #16181c;
  box-sizing: border-box;
  background: #5b6771;
  position: relative; overflow: hidden;
}
.post .pav::after {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 21% 21% at 50% 35%, #cfd9de 62%, transparent 63%),
              radial-gradient(ellipse 35% 31% at 50% 93%, #cfd9de 62%, transparent 63%);
}
.post .pbody { flex: 1; min-width: 0; }
.post .phead { display: flex; align-items: center; gap: 6px; }
.post .phead b { font-size: 15px; font-weight: 700; color: #e7e9ea; }
.post .phead span { font-size: 15px; color: #71767b; }
.post .ptext { margin: 4px 0 0; font-size: 15px; color: #e7e9ea; line-height: 1.4; }
.post .pcounts { display: flex; gap: 40px; margin-top: 10px; font-size: 13px; color: #71767b; }

/* 按钮行：源码 BUTTON_LAYOUT.horizontal 换算到卡内坐标 = 距卡右 24px、距卡顶 170px */
.btnrow { position: absolute; right: 24px; top: 170px; display: flex; align-items: center; gap: 8px; }
/* 私信键：源码 MessageButton = 圆形、size = layout.h = 40、1px cardBorder 描边 */
.msg {
  width: 40px; height: 40px; border-radius: 100%;
  border: 1px solid #2f3336;
  background: #16181c;
  display: flex; align-items: center; justify-content: center;
}
.msg svg { display: block; width: 20px; height: 20px; fill: #e7e9ea; }

/* 关注按钮：源码 116×40 / radius h/2 / fontSize 16 / weight 700，两态叠在同一个盒子里交叉 */
.follow {
  position: relative;
  width: 116px; height: 40px;
  border-radius: 20px;
  transform-origin: 50% 50%;
}
.follow > div {
  position: absolute; inset: 0;
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700;
  box-sizing: border-box;
}
/* 未关注态：品牌蓝实底白字（源码 background: accent / color: #fff） */
.f-off { background: #1d9bf0; color: #ffffff; }
/* 已关注态：源码 background: cardBg / 1px 描边 / color: fg（深色皮下不反白，否则比卡还亮） */
.f-on  { background: #16181c; border: 1px solid #536471; color: #e7e9ea; }
/* 点击涟漪：胶囊形，源码 Cursor 的 rippleColor = accent */
.rip {
  position: absolute; inset: -6px;
  border: 2px solid #1d9bf0; border-radius: 999px;
  pointer-events: none;
}

/* 光标：挂在舞台上（不进 .scaler），坐标就是舞台设计坐标 */
.cursor {
  position: absolute; left: 0; top: 0;
  width: 30px; height: 45px;
  transform-origin: 0% 0%;
  z-index: 20;
  pointer-events: none;
}
`;

export default function XFollowCard(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const target = { x: C.TARGET.x - C.TIP.x, y: C.TARGET.y - C.TIP.y };

  // ① 卡弹入：位移/缩放先动，淡入是独立的时间窗（remocn 全系入场的写法）
  const cp = tw(t, 0, C.cardIn, backOut(1.35));
  const cardY = lerp(46, 0, cp);
  const cardS = lerp(0.9, 1, cp);
  const cardO = tw(t, 0.05, 0.3, power2Out);

  // ② 十层错峰 blur-in：壳到位后内容按阅读顺序逐层落
  const layer = (i: number) => {
    const p = tw(t, 0.34 + i * C.layerStagger, C.layerDur, power2Out);
    return {
      opacity: p,
      transform: `translateY(${lerp(8, 0, p)}px)`,
      filter: `blur(${lerp(C.layerBlur, 0, p)}px)`,
    } as React.CSSProperties;
  };

  // ③ 光标弧线移入：x 用 power2.inOut、y 用 sine.inOut 异速叠出弧线
  // ⑤ 点完顺势朝右下滑出并淡出（用完即走，不常驻挡内容）
  const outStart = TC + 0.22;
  const curX = t < outStart
    ? lerp(C.START.x, target.x, tw(t, C.cursorStart, C.cursorMove, power2InOut))
    : lerp(target.x, target.x + 92, tw(t, outStart, 0.45, power2In));
  const curY = t < outStart
    ? lerp(C.START.y, target.y, tw(t, C.cursorStart, C.cursorMove, sineInOut))
    : lerp(target.y, target.y + 56, tw(t, outStart, 0.45, power2In));
  const curO = t < C.cursorStart ? 0 : 1 - tw(t, outStart, 0.45, power2In);
  // 点击帧光标下压 / 抬起
  const curS = t < TC + 0.09
    ? lerp(1, 0.9, tw(t, TC, 0.09, power2Out))
    : lerp(0.9, 1, tw(t, TC + 0.09, 0.09, power2Out));

  // ④ 点击帧：按钮下压回弹 + 两态交叉 + 涟漪 + 计数 +1（全部同帧起）
  const followS = t < TC + 0.08
    ? lerp(1, C.clickDip, tw(t, TC, 0.08, power2In))
    : lerp(C.clickDip, 1, tw(t, TC + 0.08, 0.22, backOut(3)));
  // 两态交叉：退的缩、进的涨
  const offP = tw(t, TC, C.flipDur * 0.7, power2In);
  const onP = tw(t, TC, C.flipDur, backOut(1.7));
  // 涟漪（demo 用 immediateRender:false —— 未到点击帧前必须不可见）
  const ripP = tw(t, TC + 0.03, 0.5, power2Out);
  const ripO = t < TC + 0.03 ? 0 : lerp(0.55, 0, ripP);
  const ripS = t < TC + 0.03 ? 0.92 : lerp(0.92, 1.3, ripP);
  // 粉丝数 +1：纸带上推一行（旧值出上沿、新值从下沿进）——社会证明的落点
  const stripY = lerp(0, -20, tw(t, TC + 0.1, C.rollDur, power3Out));

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="scaler">
        <div className="card" style={{
          opacity: cardO,
          transform: `translateY(${cardY}px) scale(${cardS})`,
        }}>
          <div className="cover" style={layer(0)}>
            <svg className="xmark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
            </svg>
          </div>
          <div className="pad">
            <div className="avatar-slot" style={layer(1)}><div className="avatar"></div></div>

            <div className="idblock">
              <div className="idline" style={layer(2)}>
                <span className="name">陈叙白</span>
                {/* 源码 VerifiedBadge：X 认证印章 22×22，fill = accent */}
                <svg className="badge" viewBox="0 0 22 22" aria-hidden="true">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
              </div>
              <div className="handle" style={layer(3)}>@chenxubai</div>
            </div>
            <div className="bio" style={layer(4)}>十年产品设计，现在做独立开发。这里写用不完的方法论和踩过的坑。</div>

            <div className="meta" style={layer(5)}>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>
                杭州
              </span>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" /></svg>
                <span className="site">xubai.design</span>
              </span>
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" /></svg>
                2019 年 3 月加入
              </span>
            </div>

            <div className="stats" style={layer(6)}>
              <span><b>286</b> 正在关注</span>
              <span><span className="roll"><span className="strip" style={{ transform: `translateY(${stripY}px)` }}><i>12.4万</i><i>12.5万</i></span></span> 关注者</span>
            </div>

            <div className="btnspacer" aria-hidden="true"></div>

            <div className="tabs" style={layer(7)}>
              <div className="on">帖子</div><div>回复</div><div>媒体</div><div>喜欢</div>
            </div>

            <div className="post" style={layer(8)}>
              <div className="pav"></div>
              <div className="pbody">
                <div className="phead"><b>陈叙白</b><span>@chenxubai · 2天</span></div>
                <p className="ptext">今天上线了新东西，全靠一套自己攒的动效库和很多杯咖啡。</p>
                <div className="pcounts"><span>12</span><span>48</span><span>312</span></div>
              </div>
            </div>
          </div>

          <div className="btnrow" style={layer(9)}>
            <div className="msg">
              {/* 源码 MessageButton 的信封路径 */}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.638V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.638-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z" /></svg>
            </div>
            <div className="follow" style={{ transform: `scale(${followS})` }}>
              <div className="f-off" style={{ opacity: 1 - offP, transform: `scale(${lerp(1, 0.92, offP)})` }}>关注</div>
              <div className="f-on" style={{ opacity: Math.min(1, onP), transform: `scale(${lerp(0.86, 1, onP)})` }}>已关注</div>
              <div className="rip" style={{ opacity: ripO, transform: `scale(${ripS})` }}></div>
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
    </AbsoluteFill>
  );
}
