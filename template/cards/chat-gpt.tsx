import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// chat-gpt · ChatGPT 对话框自演 —— 自包含 Remotion 源码（与 demos/chat-gpt/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。

// ===== 可摘走的核心：CONFIG + buildSchedule() + paint(t) =====
// 搬运自 remocn registry/remocn/chat-gpt/index.tsx（30fps，帧 → 秒）：
//   三段错峰淡入 fadeUpAt 标题[4,22] / 药丸[10,26] / chips[16,32] → 0.13/0.33/0.53s 起，各 0.53s
//   intro spring(damping14/stiffness110/mass0.7) 位移 28px，标题 ×0.4、药丸 ×0.6（**视差**：
//     远的元素动得少，同一弹入里三层不齐步 —— 源码这个乘数是本卡最容易漏掉的一处）
//   TYPING_START_FRAME 42 → 1.40s；TYPING_CPS 22（英文）→ 中文 8.5 字/s
//   morphProgressAt 与打字同帧起 → 0.40s：语音圆 opacity1→0 / scale1→0.9，
//     发送圆 opacity0→1 / scale0.8→1（**两端都是圆**，不是圆→方角——后者是宽卡 composer 类产品的形态）
//   chips 随 morph 退场：opacity ×= (1 − morph)、下移 8px×morph —— 源码独有的一拍
// 源码止于"发送键已就位"（150 帧 = 5s 定格）。本卡往后补 ChatGPT 首屏真正的第二拍：
// **问候语退场 → 对话占位**（问候与会话区共用同一条基线带，一个淡出一个淡入，零布局动画），
// 然后回答分块流式吐出（chunk 2，token 成簇到达）。
const CONFIG = {
  introDur: 0.62,        // 弹入时长（源码 spring）
  introY: 21,            // 位移基数 px（源码 28 × 0.75 等比）
  greetPar: 0.4,         // 标题的位移乘数（源码 intro.translateY × 0.4）
  pillPar: 0.6,          // 药丸的位移乘数（源码 × 0.6）——视差就是这两个数的差
  greetFade: [0.13, 0.67] as [number, number],  // 源码 fadeUpAt[4,20]
  pillFade: [0.33, 0.87] as [number, number],   // 源码 fadeUpAt[10,26]
  chipsFade: [0.53, 1.07] as [number, number],  // 源码 fadeUpAt[16,32]
  fadeUpY: 9,            // 淡入自带的位移 px（源码 12 × 0.75）
  typeStart: 1.40,       // 起打（源码第 42 帧）
  cps: 8.5,              // 中文打字速率 字/s
  morphDur: 0.40,        // 语音圆 → 发送圆
  morphPop: 1.7,         // 发送圆出现的回弹强度
  chipsOutY: 6,          // chips 退场下移 px（源码 8 × 0.75）
  sendGap: 0.33,         // 打完到按下发送的停顿
  pressDur: 0.22,        // 发送键按压反馈时长
  pressSquash: 0.14,     // 按压最深缩到 1 − 0.14
  revertDur: 0.28,       // 发出后清空 → 发送圆回退成语音圆
  greetOut: 0.30,        // 问候语退场（首屏 → 对话屏）
  userIn: 0.42,          // 用户消息块弹入
  thinkLead: 0.30,       // 发送后多久出现思考标识
  thinkDur: 0.52,        // 首个 token 之前的思考时长
  streamRate: 22,        // 回答流式速率 字/s
  streamChunk: 2,        // 分块粒度（=1 退化成逐字匀速，读作打字机不是流式）
  caretHz: 1,            // 输入光标闪烁（源码 blinkPerSecond = 1）
  thinkHz: 1.2,          // 思考标识呼吸频率
  tail: 0.95,            // 尾巴留白 s
  prompt: "帮我查这条数据的原始出处",
  reply: "已核对：出自国家统计局 2025 年 12 月月报第 3 页表 2。",
  placeholder: "问点什么",
};

function buildSchedule() {
  const s = {} as { typeStart: number; typeDur: number; typeEnd: number; morphStart: number;
    sendAt: number; thinkStart: number; streamStart: number; streamDur: number; streamEnd: number; total: number };
  s.typeStart = CONFIG.typeStart;
  s.typeDur = CONFIG.prompt.length / CONFIG.cps;
  s.typeEnd = s.typeStart + s.typeDur;
  s.morphStart = s.typeStart;                 // 源码：文本一出现按钮就开始变形、chips 同时开始退
  s.sendAt = s.typeEnd + CONFIG.sendGap;
  s.thinkStart = s.sendAt + CONFIG.thinkLead;
  s.streamStart = s.thinkStart + CONFIG.thinkDur;
  s.streamDur = Math.max(CONFIG.reply.length - CONFIG.streamChunk + 1, 1) / CONFIG.streamRate;
  s.streamEnd = s.streamStart + s.streamDur;
  s.total = s.streamEnd + CONFIG.tail;
  return s;
}
const S = buildSchedule();

export const meta = { width: 960, height: 540, fps: 30, durationInFrames: Math.round((S.total + 0.4) * 30) };

const FPS = meta.fps;

// —— 缓动（手写版，对应 power2.out / power3.out / back.out）——
const cl = (v: number) => Math.max(0, Math.min(1, v));
const out2 = (p: number) => 1 - (1 - p) * (1 - p);
const out3 = (p: number) => 1 - Math.pow(1 - p, 3);
const backOut = (p: number, k: number) => 1 + (k + 1) * Math.pow(p - 1, 3) + k * Math.pow(p - 1, 2);
// 一段淡入 = 独立的 opacity 窗 + 自带 9px 位移（源码 fadeUpAt）
const fadeUp = (t: number, w: [number, number]) => {
  const p = cl((t - w[0]) / (w[1] - w[0]));
  return { o: p, y: CONFIG.fadeUpY * (1 - p) };
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

/* —— 产品皮 = 内容本身（2026-08-25 用户定版：完全还原产品样式）——
      本卡涉及真实产品界面（ChatGPT 浅色皮），所以**不做中性化**：
      全部取值照抄 registry/remocn/chat-gpt/index.tsx 的 THEMES.light + accentColor：
        page #FFFFFF / inputBg #FFFFFF / inputBorder #E3E3E3
        fg #0D0D0D / fgMuted #9B9B9B / chipBorder #E3E3E3 / chipFg #5D5D5D
        sendBg #0D0D0D / sendArrow #FFFFFF / iconColor #5D5D5D / accent #2F6FED
      可编辑的是内容（问候语/提示词/回答/chips 文案），外观必须一眼认出是 ChatGPT。
      助手标识用 OpenAI 那朵结（simple-icons 的 openai 路径，1:1）。 —— */
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */

/* 首屏问候大标题：源码 top 196 / fontSize 40 / weight 700（等比 0.75 → 30px） */
.greet {
  position: absolute;
  left: 0; top: 150px;
  width: 960px;
  text-align: center;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: #0D0D0D;
}

/* 会话区：与问候语同一条基线带——问候退场、对话占位（首屏 → 对话屏的交接靠这个错位完成，
   没有任何布局动画：一个淡出、一个淡入，位置本来就重合） */
.thread {
  position: absolute;
  left: 172px; top: 112px;
  width: 616px; height: 118px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 16px;
  overflow: hidden;
}
.urow { display: flex; justify-content: flex-end; }
/* 用户气泡：ChatGPT 浅色皮是 #F4F4F4 灰底 + 圆角 24（等比 18） */
.ubox {
  max-width: 400px;
  padding: 9px 15px;
  border-radius: 18px;
  background: #F4F4F4;
  color: #0D0D0D;
  font-size: 14.5px;
  line-height: 1.5;
}
/* 回答：无气泡纯文本 + 左侧 OpenAI 标（ChatGPT 的助手消息就是裸文本） */
.arow { display: flex; align-items: flex-start; gap: 11px; }
.amark { flex: 0 0 auto; width: 18px; height: 18px; margin-top: 2px; display: block; fill: #0D0D0D; }
.atext { flex: 1; font-size: 15px; line-height: 1.6; color: #0D0D0D; }
.acur {
  display: inline-block;
  width: 8px; height: 15px;
  margin-left: 3px;
  vertical-align: -2px;
  border-radius: 1px;
  background: #0D0D0D;
}
/* 思考标识：ChatGPT 首 token 之前是那颗黑色圆点在呼吸 */
.think { width: 15px; height: 15px; margin-top: 3px; border-radius: 50%; background: #0D0D0D; }

/* 药丸输入条：源码 820×64 / radius 32 → 等比 615×48 / radius 24（单行，nowrap） */
.pill {
  position: absolute;
  left: 172px; top: 250px;
  width: 616px; height: 48px;
  background: #FFFFFF;
  border: 1px solid #E3E3E3;
  border-radius: 24px;
  box-shadow: 0 6px 22px -10px rgba(13, 13, 13, 0.14);
  display: flex;
  align-items: center;
  padding: 0 9px 0 15px;
}
.pill .plus { flex: 0 0 auto; }
.pill .plus svg { width: 18px; height: 18px; display: block; stroke: #0D0D0D; }
.field {
  flex: 1;
  display: flex;
  align-items: center;
  margin-left: 11px;
  font-size: 14.5px;
  overflow: hidden;
  white-space: nowrap;
  color: #0D0D0D;
}
.field.ph { color: #9B9B9B; }   /* 源码 fgMuted */
/* 输入光标：有字时跟在文本尾（插入点），空态时在占位文案前 */
.caret {
  display: inline-block;
  width: 2px; height: 17px;
  margin-left: 2px;
  background: #0D0D0D;
  flex: 0 0 auto;
}
.field.ph .caret { order: -1; margin-left: 0; }
.field.ph .ftext { margin-left: 5px; }

.pill .right { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.mic { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
.mic svg { width: 17px; height: 17px; display: block; stroke: #5D5D5D; }   /* 源码 iconColor */

/* morph 位：源码 44px 两个**圆**交叉——ChatGPT 走圆→圆（形态不变，只换图标与底色），
   不是圆→方角（那是宽卡 composer 类产品的形态） */
.morph { position: relative; width: 33px; height: 33px; flex: 0 0 auto; }
.morph > div {
  position: absolute; inset: 0;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.m-wave { background: #2F6FED; }            /* 源码 accentColor，在 morph 的**起**端 */
.m-wave svg { width: 17px; height: 17px; display: block; fill: #FFFFFF; }
.m-send { background: #0D0D0D; }  /* 源码 sendBg */
.m-send svg { width: 17px; height: 17px; display: block; stroke: #FFFFFF; }  /* 源码 sendArrow */

/* 建议 chips：源码 padding 10/16 / radius 20 / fontSize 15 / gap 12（等比 0.75） */
.chips {
  position: absolute;
  left: 0; top: 316px;
  width: 960px;
  display: flex;
  justify-content: center;
  gap: 9px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 15px;
  border: 1px solid #E3E3E3;
  color: #5D5D5D;
  font-size: 12.5px;
}
.chip svg { width: 14px; height: 14px; display: block; stroke: #5D5D5D; }

/* 角标主播（演示语境） */
.host-badge {
  position: absolute;
  left: 34px; top: 412px;
  width: 84px; height: 84px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
`;

export default function ChatGpt({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // —— 三段错峰弹入 + 视差：同一个 spring 位移乘上不同系数 ——
  const ip = cl(t / CONFIG.introDur);
  const ie = ip <= 0 ? 0 : backOut(ip, 1.05);
  const introY = CONFIG.introY * (1 - ie);

  // 首屏问候退场：发送那一帧起淡出，与用户消息弹入**交叉**（首屏让位给对话）。
  const gF = fadeUp(t, CONFIG.greetFade);
  const gOut = 1 - out2(cl((t - S.sendAt) / CONFIG.greetOut));
  const greetO = gF.o * gOut;

  const pF = fadeUp(t, CONFIG.pillFade);

  // —— 输入框：逐字揭示（人在打字 → 逐字符不分块）——
  const tp = cl((t - S.typeStart) / S.typeDur);
  const n = t < S.typeStart ? 0 : Math.floor(tp * CONFIG.prompt.length);
  const sent = t >= S.sendAt;
  const shown = sent ? "" : CONFIG.prompt.slice(0, n);
  const fieldTxt = shown || CONFIG.placeholder;
  const isPh = !shown;
  // 光标：打字中实心不闪；未开打 / 打完待发 才 1Hz 闪
  const typing = shown.length > 0 && shown.length < CONFIG.prompt.length;
  const caretO = typing ? 1 : (Math.floor(t * CONFIG.caretHz) % 2 === 0 ? 1 : 0);

  // —— morph：语音圆 ⇄ 发送圆（两端都是圆），发出后按 revertDur 回退 ——
  const mRaw = cl((t - S.morphStart) / CONFIG.morphDur);
  let m = out3(mRaw);
  let mPop = mRaw <= 0 ? 0 : backOut(mRaw, CONFIG.morphPop);
  if (sent) {
    const r = out2(cl((t - S.sendAt) / CONFIG.revertDur));
    m *= 1 - r;
    mPop *= 1 - r;
  }

  // 发送按压：以 sendAt 为中心的时间窗内线性升降
  const dAbs = Math.abs(t - S.sendAt);
  const pulse = dAbs <= CONFIG.pressDur / 2 ? 1 - dAbs / (CONFIG.pressDur / 2) : 0;

  // —— chips：淡入后随 morph 退场（退场跟的是**不回退**的 morph 正向进度 mFwd）——
  const mFwd = out3(mRaw);
  const cF = fadeUp(t, CONFIG.chipsFade);
  const chipsO = cF.o * (1 - mFwd);

  // —— 用户消息块：发送同帧占位并弹入 ——
  const up = cl((t - S.sendAt) / CONFIG.userIn);
  const ue = out3(up);

  // —— 思考标识：首 token 之前呼吸，流式一开始即撤 ——
  const thinking = t >= S.thinkStart && t < S.streamStart;
  const thinkW = (Math.sin(Math.PI * 2 * (t - S.thinkStart) * CONFIG.thinkHz) + 1) / 2;

  // —— 流式回答：分块揭示，尾巴挂块光标，吐完即撤 ——
  const streamOn = t >= S.streamStart;
  const linCnt = Math.floor((t - S.streamStart) * CONFIG.streamRate);
  const rev = streamOn
    ? Math.min(CONFIG.reply.length, Math.ceil(linCnt / CONFIG.streamChunk) * CONFIG.streamChunk)
    : 0;

  return (
    <AbsoluteFill style={{
      background: "#FFFFFF", color: "#0D0D0D", overflow: "hidden",
      // ChatGPT 用的是 ui-sans-serif 系统栈（Söhne 是私有字体，不引外网）
      fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>

      <div className="greet" style={{
        opacity: greetO,
        transform: `translateY(${gF.y + introY * CONFIG.greetPar}px)`,
        display: greetO > 0.001 ? "block" : "none",
      }}>今天想聊点什么？</div>

      <div className="thread">
        <div className="urow" style={{ display: sent ? "flex" : "none" }}>
          <div className="ubox" style={{
            opacity: out2(up),
            transform: `translateY(${10 * (1 - ue)}px) scale(${0.95 + 0.05 * ue})`,
          }}>{CONFIG.prompt}</div>
        </div>
        <div className="arow" style={{ display: streamOn ? "flex" : "none", opacity: 1 }}>
          {/* OpenAI 标（simple-icons openai，1:1） */}
          <svg className="amark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
          </svg>
          <div className="atext">
            <span>{CONFIG.reply.slice(0, rev)}</span>
            <span className="acur" style={{ opacity: rev < CONFIG.reply.length ? 1 : 0 }}></span>
          </div>
        </div>
        <div className="arow" style={{ display: thinking ? "flex" : "none", opacity: 1 }}>
          <div className="think" style={{ opacity: thinking ? 0.35 + 0.65 * thinkW : 0 }}></div>
        </div>
      </div>

      <div className="pill" style={{
        opacity: pF.o,
        transform: `translateY(${pF.y + introY * CONFIG.pillPar}px) scale(${0.97 + 0.03 * ie})`,
        transformOrigin: "center top",
      }}>
        <div className="plus">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
        <div className={"field" + (isPh ? " ph" : "")}>
          <span className="ftext">{fieldTxt}</span><span className="caret" style={{ opacity: caretO }}></span>
        </div>
        <div className="right">
          <div className="mic">
            <svg viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" strokeWidth="1.8" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M9 21h6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="morph" style={{ transform: `scale(${1 - CONFIG.pressSquash * pulse})` }}>
            <div className="m-wave" style={{ opacity: 1 - m, transform: `scale(${1 - 0.1 * m})` }}>
              <svg viewBox="0 0 24 24"><rect x="3" y="8" width="2.4" height="8" rx="1.2" /><rect x="8" y="4" width="2.4" height="16" rx="1.2" /><rect x="13" y="6" width="2.4" height="12" rx="1.2" /><rect x="18" y="2" width="2.4" height="20" rx="1.2" /></svg>
            </div>
            <div className="m-send" style={{ opacity: m, transform: `scale(${0.8 + 0.2 * cl(mPop)})` }}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 19V6M12 6l-6 6M12 6l6 6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="chips" style={{
        opacity: chipsO,
        transform: `translateY(${cF.y + introY * CONFIG.pillPar + CONFIG.chipsOutY * mFwd}px)`,
        display: chipsO > 0.001 ? "flex" : "none",
      }}>
        <div className="chip">
          <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="3" strokeWidth="1.7" /><circle cx="8.5" cy="9" r="1.6" strokeWidth="1.7" /><path d="M5 18l5-5 4 4 2-2 3 3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>生成图片</span>
        </div>
        <div className="chip">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17v3z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 7l3 3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>写作润色</span>
        </div>
        <div className="chip">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" strokeWidth="1.7" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>联网查证</span>
        </div>
      </div>

      <div className="host-badge"><Host src={hostSrc} /></div>
    </AbsoluteFill>
  );
}
