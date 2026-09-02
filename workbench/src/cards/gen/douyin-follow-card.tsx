import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { lerp, power2Out, power2InOut, tw } from "../shared";

// douyin-follow-card · 抖音主页关注卡 —— 参数化版（源出 tplcards/douyin-follow-card.tsx，社区贡献 PR #6）
// 命门（缺一条就退化成"一张图淡入"）：①卡 spring 弹入与内容错峰 blur-in 分两拍；
// ②光标必须走过去再点、点击帧尖端压在按钮上；③点击一刻同帧：＋关注→已关注两态交叉 + 涟漪 + 副位图标→发私信
//（粉丝数静态，同原版 X：约数看不出 +1）。
// 产品皮 = 内容本身（2026-08-25 定版：完全还原抖音对外主页），颜色不开放；只开放内容/头像/头图/位置/语境节奏。
const FPS = 30;

const FIXED = {
  cardIn: 0.62,        // 卡弹入：y 46→0 + scale 0.9→1（back.out 1.35）
  layerStagger: 0.07,  // 内容错峰间隔（按阅读顺序）
  layerDur: 0.24,      // 单层 blur-in 时长
  layerBlur: 8,        // 入场模糊起点 px
  cursorMove: 0.95,    // 光标弧线移入；瞬移=没有"有人在点"的证据
  clickDip: 0.92,      // 点击帧按钮下压
  flipDur: 0.34,       // 两态交叉：退的缩 1→0.92、进的涨 0.86→1 带回弹
  hold: 0.85,          // 读结果的停留
  W: 900,              // 卡逻辑宽（模板按 900 写死）
  SCALE: 0.556,        // 整体缩放进 960×540 舞台（与 demo 同：900 → 500）
  COVER_H: 560, AVATAR: 200, BIO_LINE_H: 40, MAX_BIO_LINES: 5,
  BODY_PAD_T: 30, BODY_PAD_B: 34, BODY_PAD_X: 36, STATS_H: 40, GAP_BIO: 20, GAP_BTN: 34, BTN_H: 72,
  BTN_W: 486,          // 关注钮宽（左起 padX），中心用它量
  TIP: { x: 1 / 14 * 30, y: 1 / 21 * 45 },  // 光标箭头尖相对元素左上角的偏移
};

// —— shared 未含的缓动，本卡局部定义 ——
const power2In = (x: number) => x * x * x;
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const backOut = (s: number) => (x: number) => {
  const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u;
};

/* 静态产品皮留 <style>（类名加 dfc- 前缀，reset 收窄到 .dfc-scaler 作用域内）；
   背景默认蓝渐变（#BBD7EF→#75A4D0）；关注钮未关注红 #EB455B / 已关注浅灰 #F1F1F2 + 黑字；
   正文黑 #161823、次级灰 #9299A4、@ 蓝链 #1E9FFF——都是抖音皮，不开放。 */
const CSS = `
.dfc-scaler, .dfc-scaler * { margin: 0; padding: 0; box-sizing: border-box; }
.dfc-scaler { position: absolute; transform-origin: 0 0; overflow: hidden; }
.dfc-card {
  position: relative; width: ${FIXED.W}px; background: #ffffff; border-radius: 28px; overflow: hidden;
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.45); transform-origin: 50% 0%;
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; color: #161823;
  display: flex; flex-direction: column;
}
.dfc-cover { position: relative; height: ${FIXED.COVER_H}px; flex: 0 0 auto;
  background: linear-gradient(180deg, #bbd7ef 0%, #8fb7e8 46%, #75a4d0 100%); }
.dfc-cover img.dfc-bgimg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.dfc-topnav { position: absolute; left: 0; right: 0; top: 22px; display: flex; align-items: center; padding: 0 28px; }
.dfc-topnav .dfc-back, .dfc-topnav .dfc-ico { width: 44px; height: 44px; border-radius: 100%; background: rgba(0,0,0,0.22);
  display: flex; align-items: center; justify-content: center; }
.dfc-topnav .dfc-ico { margin-left: 14px; }
.dfc-topnav svg { width: 22px; height: 22px; fill: #fff; }
.dfc-topnav .dfc-spacer { flex: 1; }
.dfc-head { position: absolute; top: 216px; left: 56px; right: 40px; display: flex; align-items: flex-start; gap: 34px; }
.dfc-avatar { flex: 0 0 auto; width: ${FIXED.AVATAR}px; height: ${FIXED.AVATAR}px; border-radius: 100%;
  border: 6px solid rgba(255,255,255,0.9); overflow: hidden; background: #c7ccd3; position: relative; }
.dfc-avatar::after { content: ""; position: absolute; inset: 0;
  background: radial-gradient(ellipse 22% 22% at 50% 33%, #eef0f3 60%, transparent 61%),
              radial-gradient(ellipse 40% 36% at 50% 97%, #eef0f3 60%, transparent 61%); }
.dfc-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.dfc-avatar.dfc-has-img::after { content: none; }
.dfc-idcol { padding-top: 36px; min-width: 0; }
.dfc-nick { display: flex; align-items: center; gap: 12px; }
.dfc-nick .dfc-name { font-weight: 700; color: #fff; letter-spacing: 0.5px; }
.dfc-nick .dfc-vbadge { width: 34px; height: 34px; fill: #25f4ee; }
.dfc-dvid { display: flex; align-items: center; gap: 10px; margin-top: 18px; font-size: 26px; color: rgba(255,255,255,0.92); }
.dfc-dvid svg { width: 26px; height: 26px; fill: rgba(255,255,255,0.92); }
.dfc-body { position: relative; flex: 1 0 auto; background: #fff; border-radius: 30px 30px 0 0;
  padding: ${FIXED.BODY_PAD_T}px ${FIXED.BODY_PAD_X}px ${FIXED.BODY_PAD_B}px; }
.dfc-stats { display: flex; gap: 46px; font-size: 34px; color: #9299a4; }
.dfc-stats b { color: #161823; font-weight: 700; font-size: 38px; }
.dfc-bio { margin-top: ${FIXED.GAP_BIO}px; font-size: 27px; line-height: ${FIXED.BIO_LINE_H}px; color: #161823; }
.dfc-bio .dfc-at { color: #1e9fff; }
.dfc-btnrow { display: flex; gap: 18px; margin-top: ${FIXED.GAP_BTN}px; }
.dfc-follow { position: relative; flex: 1.35 0 0; height: ${FIXED.BTN_H}px; border-radius: ${FIXED.BTN_H / 2}px; transform-origin: 50% 50%; }
.dfc-follow > div { position: absolute; inset: 0; border-radius: ${FIXED.BTN_H / 2}px; display: flex; align-items: center;
  justify-content: center; gap: 10px; font-size: 30px; font-weight: 600; }
.dfc-f-off { background: #eb455b; color: #fff; }
.dfc-f-on  { background: #f1f1f2; color: #161823; }
.dfc-f-on svg { width: 26px; height: 26px; fill: #161823; }
.dfc-follow .dfc-rip { position: absolute; inset: -8px; border: 3px solid #eb455b; border-radius: 999px; pointer-events: none; }
.dfc-msgbtn { flex: 0 0 auto; height: ${FIXED.BTN_H}px; border-radius: 20px; background: #f1f1f2; color: #161823;
  display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 26px; font-weight: 600; overflow: hidden; white-space: nowrap; }
.dfc-msgbtn svg { width: 30px; height: 30px; fill: #161823; flex: 0 0 auto; }
.dfc-cursor { position: absolute; left: 0; top: 0; width: 36px; height: 54px; transform-origin: 0% 0%; z-index: 20; pointer-events: none; }
`;

interface Props {
  nickname?: string;
  douyinId?: string;
  verified?: boolean;
  likeCount?: string;
  followCount?: string;
  fansCount?: string;
  bio?: string;
  avatar?: string;
  bgImage?: string;
  topNav?: boolean;
  followText?: string;
  followDoneText?: string;
  msgText?: string;
  nameSize?: number;
  posX?: number;
  posY?: number;
  lead?: number;
  cursorStart?: number;
}

const DouyinFollowCard: React.FC<Props> = ({
  nickname = "Vincent",
  douyinId = "335248116",
  verified = false,
  likeCount = "3.2万",
  followCount = "238",
  fansCount = "6455",
  bio = "持续分享 AI 最前沿的应用场景\n宣传片 skill 已开源，入群获取",
  avatar = "",
  bgImage = "",
  topNav = true,
  followText = "＋关注",
  followDoneText = "已关注",
  msgText = "发私信",
  nameSize = 48,
  posX = 480,
  posY = 270,
  lead = 0,
  cursorStart = 1.55,
}) => {
  const t = useCurrentFrame() / FPS;
  const C = FIXED;

  // 几何：简介行数决定卡高（多行整块一层，行数只改卡高不改错峰节奏）
  const bioLines = bio.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, C.MAX_BIO_LINES);
  const nBio = Math.max(1, bioLines.length);
  const bodyH = C.BODY_PAD_T + C.STATS_H + C.GAP_BIO + nBio * C.BIO_LINE_H + C.GAP_BTN + C.BTN_H + C.BODY_PAD_B;
  const H = C.COVER_H + bodyH;
  // 关注钮中心（卡内坐标，终态位置）：落点必须在按钮终态上量，再减箭头尖偏移
  const btnCy = C.COVER_H + C.BODY_PAD_T + C.STATS_H + C.GAP_BIO + nBio * C.BIO_LINE_H + C.GAP_BTN + C.BTN_H / 2;
  const target = { x: C.BODY_PAD_X + C.BTN_W / 2 - C.TIP.x, y: btnCy - C.TIP.y };

  // 点击帧：光标起手（语境级，给口播余量）+ 弧线移入耗时
  const TC = lead + cursorStart + C.cursorMove + 0.08;

  // ① 卡弹入：位移/缩放先动，淡入是独立的时间窗
  const cp = tw(t, lead, C.cardIn, backOut(1.35));
  const cardY = lerp(46, 0, cp);
  const cardS = lerp(0.9, 1, cp);
  const cardO = tw(t, lead + 0.05, 0.3, power2Out);

  // ② 内容逐层错峰 blur-in（阅读顺序：背景→导航→头像/昵称→数据→简介→按钮行最后）
  const layer = (i: number): React.CSSProperties => {
    const p = tw(t, lead + 0.34 + i * C.layerStagger, C.layerDur, power2Out);
    return { opacity: p, transform: `translateY(${lerp(8, 0, p)}px)`, filter: `blur(${lerp(C.layerBlur, 0, p)}px)` };
  };

  // ③ 光标弧线移入（x power2.inOut / y sine.inOut 异速叠弧），点完顺势右下滑出淡出
  const outStart = TC + 0.22;
  const curX = t < outStart
    ? lerp(C.W + 60, target.x, tw(t, lead + cursorStart, C.cursorMove, power2InOut))
    : lerp(target.x, target.x + 90, tw(t, outStart, 0.45, power2In));
  const curY = t < outStart
    ? lerp(H + 60, target.y, tw(t, lead + cursorStart, C.cursorMove, sineInOut))
    : lerp(target.y, target.y + 54, tw(t, outStart, 0.45, power2In));
  const curO = t < lead + cursorStart ? 0 : 1 - tw(t, outStart, 0.45, power2In);
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

  const renderBio = (line: string) =>
    line.split(/(\[\[@[^\]]+\]\])/g).map((seg, si) => {
      const m = seg.match(/^\[\[(@[^\]]+)\]\]$/);
      return m ? <span key={si} className="dfc-at">{m[1]}</span> : <span key={si}>{seg}</span>;
    });

  const S = C.SCALE;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <style>{CSS}</style>
      <div
        className="dfc-scaler"
        style={{ left: posX - (C.W * S) / 2, top: posY - (H * S) / 2, width: C.W, height: H, transform: `scale(${S})` }}
      >
        <div className="dfc-card" style={{ height: H, opacity: cardO, transform: `translateY(${cardY}px) scale(${cardS})` }}>
          <div className="dfc-cover" style={layer(0)}>
            {bgImage ? <img className="dfc-bgimg" src={bgImage} alt="" /> : null}
            {topNav ? (
              <div className="dfc-topnav" style={layer(1)}>
                <div className="dfc-back">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 4.4 9 12l7.6 7.6-1.6 1.6L6 12l9-9z" /></svg>
                </div>
                <div className="dfc-spacer" />
                <div className="dfc-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 2a8.5 8.5 0 1 0 6.4 14.1l4.6 4.6 1.6-1.6-4.6-4.6A8.5 8.5 0 0 0 10.5 2zm0 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z" /></svg>
                </div>
                <div className="dfc-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-6a8 8 0 0 0-4.6 14.6c.3-1 .5-2.2.4-3.1l-.9-3.4a8 8 0 0 1-1.5-3.3 4 4 0 0 1 0-1.6A8 8 0 1 0 12 2zm0 2.4A5.6 5.6 0 0 1 12 16a5.6 5.6 0 0 1-2.9-.8c.4 1.6.7 3.3.6 5A8 8 0 1 1 12 4.4z" /></svg>
                </div>
              </div>
            ) : null}
            <div className="dfc-head" style={layer(2)}>
              <div className={avatar ? "dfc-avatar dfc-has-img" : "dfc-avatar"}>{avatar ? <img src={avatar} alt="" /> : null}</div>
              <div className="dfc-idcol">
                <div className="dfc-nick">
                  <span className="dfc-name" style={{ fontSize: nameSize }}>{nickname}</span>
                  {verified ? <svg className="dfc-vbadge" viewBox="0 0 24 24"><path d="M23 12l-2.4-2.8.5-3.7-3.7-.5L16 2.6 12 5 8 2.6 6.8 5.5l-3.7.5.5 3.7L1 12l2.4 2.8-.5 3.7 3.7.5L8 21.4 12 19l4 2.4 1.4-2.7 3.7-.5-.5-3.7z" /></svg> : null}
                </div>
                <div className="dfc-dvid">
                  {douyinId}
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3zm2 3a2 2 0 0 0-2 2v9h9v-2H9a2 2 0 0 1-2-2V9H6v9h9V9H8z" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="dfc-body">
            <div className="dfc-stats" style={layer(5)}>
              <span><b>{likeCount}</b> 获赞</span>
              <span><b>{followCount}</b> 关注</span>
              <span><b>{fansCount}</b> 粉丝</span>
            </div>
            <div className="dfc-bio" style={layer(6)}>
              {bioLines.map((line, li) => <div key={li}>{renderBio(line)}</div>)}
            </div>
            <div className="dfc-btnrow" style={layer(7)}>
              <div className="dfc-follow" style={{ transform: `scale(${followS})` }}>
                <div className="dfc-f-off" style={{ opacity: 1 - offP, transform: `scale(${lerp(1, 0.92, offP)})` }}>{followText}</div>
                <div className="dfc-f-on" style={{ opacity: Math.min(1, onP), transform: `scale(${lerp(0.86, 1, onP)})` }}>
                  {followDoneText}
                  <svg viewBox="0 0 24 24"><path d="M7 9l5 5 5-5z" /></svg>
                </div>
                <div className="dfc-rip" style={{ opacity: ripO, transform: `scale(${ripS})` }} />
              </div>
              <div className="dfc-msgbtn" style={{ width: lerp(72, 200, onP) }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                {onP > 0.5 ? <span>{msgText}</span> : null}
              </div>
            </div>
          </div>
        </div>
        <svg className="dfc-cursor" viewBox="0 0 14 21" aria-hidden="true"
          style={{ opacity: curO, transform: `translate(${curX}px, ${curY}px) scale(${curS})` }}>
          <path d="M1 1 L1 17.2 L5.3 13.3 L8.1 19.9 L10.8 18.8 L8 12.3 L13.1 12.3 Z"
            fill="#ffffff" stroke="#1d1d1f" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "douyin-follow-card",
  name: "抖音主页关注卡",
  category: "人物互动",
  durationInFrames: 133,
  accent: "#eb455b",
  component: DouyinFollowCard as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "nickname", label: "昵称", default: "Vincent" },
    { type: "text", key: "douyinId", label: "抖音号", default: "335248116" },
    { type: "boolean", key: "verified", label: "认证蓝 V", default: false },
    { type: "text", key: "likeCount", label: "获赞", default: "3.2万" },
    { type: "text", key: "followCount", label: "关注", default: "238" },
    { type: "text", key: "fansCount", label: "粉丝（静态，不做 +1）", default: "6455" },
    { type: "textarea", key: "bio", label: "简介（逐行；[[@某人]] 蓝链）", default: "持续分享 AI 最前沿的应用场景\n宣传片 skill 已开源，入群获取" },
    { type: "text", key: "avatar", label: "头像 URL（空=剪影占位）", default: "" },
    { type: "text", key: "bgImage", label: "头图 URL（空=抖音蓝渐变）", default: "" },
    { type: "boolean", key: "topNav", label: "顶部 app 导航", default: true },
    { type: "text", key: "followText", label: "关注键文案", default: "＋关注" },
    { type: "text", key: "followDoneText", label: "已关注文案", default: "已关注" },
    { type: "text", key: "msgText", label: "私信键文案", default: "发私信" },
    { type: "slider", key: "nameSize", label: "昵称字号（卡内 900 宽基准）", default: 48, min: 32, max: 64, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "卡中心 X", default: 480, min: 0, max: 960, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "卡中心 Y", default: 270, min: 0, max: 540, step: 1, unit: "px" },
    { type: "slider", key: "lead", label: "起手静置", default: 0, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "cursorStart", label: "光标起手（给口播余量）", default: 1.55, min: 0.6, max: 4, step: 0.05, unit: "s" },
  ],
};
