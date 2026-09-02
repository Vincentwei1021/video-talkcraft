import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { HostSilhouette, clamp01, power1Out, power2Out } from "../shared";

// chat-gpt · ChatGPT 对话框 —— 参数化版（源出 tplcards/chat-gpt.tsx）
// 命门：三段错峰弹入的视差乘数、圆⇄圆 morph、chips 随 morph 退场、
// 问候↔会话同基线交接、流式分块吐出 —— 节奏参数全部 FIXED。
// 产品皮 = 内容本身（ChatGPT 浅色皮定版，不做中性化），开放的是内容与唯一强调色。
const FPS = 30;

const FIXED = {
  introDur: 0.62,        // 弹入时长（源码 spring）
  introY: 21,            // 位移基数 px（源码 28 × 0.75 等比）
  greetPar: 0.4,         // 标题的位移乘数（源码 intro.translateY × 0.4）
  pillPar: 0.6,          // 药丸的位移乘数（源码 × 0.6）——视差就是这两个数的差
  greetFade: [0.13, 0.67] as [number, number],  // 源码 fadeUpAt[4,20]
  pillFade: [0.33, 0.87] as [number, number],   // 源码 fadeUpAt[10,26]
  chipsFade: [0.53, 1.07] as [number, number],  // 源码 fadeUpAt[16,32]
  fadeUpY: 9,            // 淡入自带的位移 px（源码 12 × 0.75）
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
};

// —— 时刻表：随提示词/回答长度与打字节奏自适应 ——
function buildSchedule(prompt: string, reply: string, typeStart: number, cps: number) {
  const typeDur = prompt.length / Math.max(0.1, cps);
  const typeEnd = typeStart + typeDur;
  const morphStart = typeStart;   // 源码：文本一出现按钮就开始变形、chips 同时开始退
  const sendAt = typeEnd + FIXED.sendGap;
  const thinkStart = sendAt + FIXED.thinkLead;
  const streamStart = thinkStart + FIXED.thinkDur;
  const streamDur = Math.max(reply.length - FIXED.streamChunk + 1, 1) / FIXED.streamRate;
  const streamEnd = streamStart + streamDur;
  const total = streamEnd + FIXED.tail;
  return { typeStart, typeDur, typeEnd, morphStart, sendAt, thinkStart, streamStart, streamDur, streamEnd, total };
}

const DEFAULT_PROMPT = "帮我查这条数据的原始出处";
const DEFAULT_REPLY = "已核对：出自国家统计局 2025 年 12 月月报第 3 页表 2。";
const DEFAULT_SCHED = buildSchedule(DEFAULT_PROMPT, DEFAULT_REPLY, 1.4, 8.5);

// —— 缓动（对应 power2.out / power3.out / back.out）——
const cl = clamp01;
const out2 = power1Out;
const out3 = power2Out;
const backOut = (p: number, k: number) => 1 + (k + 1) * Math.pow(p - 1, 3) + k * Math.pow(p - 1, 2);
// 一段淡入 = 独立的 opacity 窗 + 自带 9px 位移（源码 fadeUpAt）
const fadeUp = (t: number, w: [number, number]) => {
  const p = cl((t - w[0]) / (w[1] - w[0]));
  return { o: p, y: FIXED.fadeUpY * (1 - p) };
};

/* —— 产品皮 = 内容本身（用户定版：完全还原产品样式）——
      全部取值照抄源码 THEMES.light + accentColor（页 #FFFFFF / 边 #E3E3E3 /
      fg #0D0D0D / fgMuted #9B9B9B / chipFg #5D5D5D / sendBg #0D0D0D）。
      类名加 cgpt- 前缀；reset 收进 .cgpt-root 作用域防串卡。 —— */
const CSS = `
.cgpt-root * { margin: 0; padding: 0; box-sizing: border-box; }

/* 首屏问候大标题：源码 top 196 / fontSize 40 / weight 700（等比 0.75 → 30px） */
.cgpt-greet {
  position: absolute;
  left: 0; top: 150px;
  width: 960px;
  text-align: center;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: #0D0D0D;
}

/* 会话区：与问候语同一条基线带——问候退场、对话占位（零布局动画交接） */
.cgpt-thread {
  position: absolute;
  left: 172px; top: 112px;
  width: 616px; height: 118px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 16px;
  overflow: hidden;
}
.cgpt-urow { display: flex; justify-content: flex-end; }
/* 用户气泡：ChatGPT 浅色皮是 #F4F4F4 灰底 + 圆角 18 */
.cgpt-ubox {
  max-width: 400px;
  padding: 9px 15px;
  border-radius: 18px;
  background: #F4F4F4;
  color: #0D0D0D;
  line-height: 1.5;
}
/* 回答：无气泡纯文本 + 左侧 OpenAI 标 */
.cgpt-arow { display: flex; align-items: flex-start; gap: 11px; }
.cgpt-amark { flex: 0 0 auto; width: 18px; height: 18px; margin-top: 2px; display: block; fill: #0D0D0D; }
.cgpt-atext { flex: 1; line-height: 1.6; color: #0D0D0D; }
.cgpt-acur {
  display: inline-block;
  width: 8px; height: 15px;
  margin-left: 3px;
  vertical-align: -2px;
  border-radius: 1px;
  background: #0D0D0D;
}
/* 思考标识：首 token 之前那颗黑色圆点在呼吸 */
.cgpt-think { width: 15px; height: 15px; margin-top: 3px; border-radius: 50%; background: #0D0D0D; }

/* 药丸输入条：源码 820×64 / radius 32 → 等比 616×48 / radius 24（单行，nowrap） */
.cgpt-pill {
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
.cgpt-plus { flex: 0 0 auto; }
.cgpt-plus svg { width: 18px; height: 18px; display: block; stroke: #0D0D0D; }
.cgpt-field {
  flex: 1;
  display: flex;
  align-items: center;
  margin-left: 11px;
  overflow: hidden;
  white-space: nowrap;
  color: #0D0D0D;
}
.cgpt-field.cgpt-ph { color: #9B9B9B; }   /* 源码 fgMuted */
/* 输入光标：有字时跟在文本尾，空态时在占位文案前 */
.cgpt-caret {
  display: inline-block;
  width: 2px; height: 17px;
  margin-left: 2px;
  background: #0D0D0D;
  flex: 0 0 auto;
}
.cgpt-field.cgpt-ph .cgpt-caret { order: -1; margin-left: 0; }
.cgpt-field.cgpt-ph .cgpt-ftext { margin-left: 5px; }

.cgpt-right { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.cgpt-mic { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
.cgpt-mic svg { width: 17px; height: 17px; display: block; stroke: #5D5D5D; }   /* 源码 iconColor */

/* morph 位：圆→圆（形态不变，只换图标与底色）——ChatGPT 的形态 */
.cgpt-morph { position: relative; width: 33px; height: 33px; flex: 0 0 auto; }
.cgpt-morph > div {
  position: absolute; inset: 0;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.cgpt-mwave svg { width: 17px; height: 17px; display: block; fill: #FFFFFF; }
.cgpt-msend { background: #0D0D0D; }  /* 源码 sendBg */
.cgpt-msend svg { width: 17px; height: 17px; display: block; stroke: #FFFFFF; }  /* 源码 sendArrow */

/* 建议 chips：源码 padding 10/16 / radius 20 / fontSize 15 / gap 12（等比 0.75） */
.cgpt-chips {
  position: absolute;
  left: 0; top: 316px;
  width: 960px;
  display: flex;
  justify-content: center;
  gap: 9px;
}
.cgpt-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 15px;
  border: 1px solid #E3E3E3;
  color: #5D5D5D;
  font-size: 12.5px;
}
.cgpt-chip svg { width: 14px; height: 14px; display: block; stroke: #5D5D5D; }

/* 角标主播（演示语境） */
.cgpt-host-badge {
  position: absolute;
  left: 34px; top: 412px;
  width: 84px; height: 84px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
`;

// chips 图标：三枚源码图标按序循环（图片 / 铅笔 / 地球）
const CHIP_ICONS: React.ReactNode[] = [
  <svg key="img" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="3" strokeWidth="1.7" /><circle cx="8.5" cy="9" r="1.6" strokeWidth="1.7" /><path d="M5 18l5-5 4 4 2-2 3 3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  <svg key="pen" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17v3z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 7l3 3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  <svg key="glb" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" strokeWidth="1.7" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
];

// OpenAI 标（simple-icons openai，1:1）
const OPENAI_PATH = "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z";

interface Props {
  greeting?: string;
  prompt?: string;
  reply?: string;
  placeholder?: string;
  chips?: string;
  accent?: string;
  msgSize?: number;
  greetSize?: number;
  posX?: number;
  posY?: number;
  typeStart?: number;
  cps?: number;
}

const ChatGpt: React.FC<Props> = ({
  greeting = "今天想聊点什么？",
  prompt = DEFAULT_PROMPT,
  reply = DEFAULT_REPLY,
  placeholder = "问点什么",
  chips = "生成图片\n写作润色\n联网查证",
  accent = "#2F6FED",
  msgSize = 15,
  greetSize = 30,
  posX = 0,
  posY = 0,
  typeStart = 1.4,
  cps = 8.5,
}) => {
  const t = useCurrentFrame() / FPS;
  const S = buildSchedule(prompt, reply, typeStart, cps);
  const chipList = chips.split("\n").map((c) => c.trim()).filter(Boolean);

  // —— 三段错峰弹入 + 视差：同一个 spring 位移乘上不同系数 ——
  const ip = cl(t / FIXED.introDur);
  const ie = ip <= 0 ? 0 : backOut(ip, 1.05);
  const introY = FIXED.introY * (1 - ie);

  // 首屏问候退场：发送那一帧起淡出，与用户消息弹入交叉（首屏让位给对话）
  const gF = fadeUp(t, FIXED.greetFade);
  const gOut = 1 - out2(cl((t - S.sendAt) / FIXED.greetOut));
  const greetO = gF.o * gOut;

  const pF = fadeUp(t, FIXED.pillFade);

  // —— 输入框：逐字揭示（人在打字 → 逐字符不分块）——
  const tp = cl((t - S.typeStart) / S.typeDur);
  const n = t < S.typeStart ? 0 : Math.floor(tp * prompt.length);
  const sent = t >= S.sendAt;
  const shown = sent ? "" : prompt.slice(0, n);
  const fieldTxt = shown || placeholder;
  const isPh = !shown;
  // 光标：打字中实心不闪；未开打 / 打完待发 才 1Hz 闪
  const typing = shown.length > 0 && shown.length < prompt.length;
  const caretO = typing ? 1 : (Math.floor(t * FIXED.caretHz) % 2 === 0 ? 1 : 0);

  // —— morph：语音圆 ⇄ 发送圆（两端都是圆），发出后按 revertDur 回退 ——
  const mRaw = cl((t - S.morphStart) / FIXED.morphDur);
  let m = out3(mRaw);
  let mPop = mRaw <= 0 ? 0 : backOut(mRaw, FIXED.morphPop);
  if (sent) {
    const r = out2(cl((t - S.sendAt) / FIXED.revertDur));
    m *= 1 - r;
    mPop *= 1 - r;
  }

  // 发送按压：以 sendAt 为中心的时间窗内线性升降
  const dAbs = Math.abs(t - S.sendAt);
  const pulse = dAbs <= FIXED.pressDur / 2 ? 1 - dAbs / (FIXED.pressDur / 2) : 0;

  // —— chips：淡入后随 morph 退场（退场跟的是不回退的 morph 正向进度 mFwd）——
  const mFwd = out3(mRaw);
  const cF = fadeUp(t, FIXED.chipsFade);
  const chipsO = cF.o * (1 - mFwd);

  // —— 用户消息块：发送同帧占位并弹入 ——
  const up = cl((t - S.sendAt) / FIXED.userIn);
  const ue = out3(up);

  // —— 思考标识：首 token 之前呼吸，流式一开始即撤 ——
  const thinking = t >= S.thinkStart && t < S.streamStart;
  const thinkW = (Math.sin(Math.PI * 2 * (t - S.thinkStart) * FIXED.thinkHz) + 1) / 2;

  // —— 流式回答：分块揭示，尾巴挂块光标，吐完即撤 ——
  const streamOn = t >= S.streamStart;
  const linCnt = Math.floor((t - S.streamStart) * FIXED.streamRate);
  const rev = streamOn
    ? Math.min(reply.length, Math.ceil(linCnt / FIXED.streamChunk) * FIXED.streamChunk)
    : 0;

  return (
    <AbsoluteFill className="cgpt-root" style={{
      background: "#FFFFFF", color: "#0D0D0D", overflow: "hidden",
      // ChatGPT 用的是 ui-sans-serif 系统栈（Söhne 是私有字体，不引外网）
      fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>

      {/* 关键区整体位移（默认 0,0 与模板逐像素一致） */}
      <div style={{ position: "absolute", inset: 0, transform: `translate(${posX}px, ${posY}px)` }}>
        <div className="cgpt-greet" style={{
          fontSize: greetSize,
          opacity: greetO,
          transform: `translateY(${gF.y + introY * FIXED.greetPar}px)`,
          display: greetO > 0.001 ? "block" : "none",
        }}>{greeting}</div>

        <div className="cgpt-thread">
          <div className="cgpt-urow" style={{ display: sent ? "flex" : "none" }}>
            <div className="cgpt-ubox" style={{
              fontSize: msgSize - 0.5,
              opacity: out2(up),
              transform: `translateY(${10 * (1 - ue)}px) scale(${0.95 + 0.05 * ue})`,
            }}>{prompt}</div>
          </div>
          <div className="cgpt-arow" style={{ display: streamOn ? "flex" : "none", opacity: 1 }}>
            <svg className="cgpt-amark" viewBox="0 0 24 24" aria-hidden="true">
              <path d={OPENAI_PATH} />
            </svg>
            <div className="cgpt-atext" style={{ fontSize: msgSize }}>
              <span>{reply.slice(0, rev)}</span>
              <span className="cgpt-acur" style={{ opacity: rev < reply.length ? 1 : 0 }}></span>
            </div>
          </div>
          <div className="cgpt-arow" style={{ display: thinking ? "flex" : "none", opacity: 1 }}>
            <div className="cgpt-think" style={{ opacity: thinking ? 0.35 + 0.65 * thinkW : 0 }}></div>
          </div>
        </div>

        <div className="cgpt-pill" style={{
          opacity: pF.o,
          transform: `translateY(${pF.y + introY * FIXED.pillPar}px) scale(${0.97 + 0.03 * ie})`,
          transformOrigin: "center top",
        }}>
          <div className="cgpt-plus">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" /></svg>
          </div>
          <div className={"cgpt-field" + (isPh ? " cgpt-ph" : "")} style={{ fontSize: msgSize - 0.5 }}>
            <span className="cgpt-ftext">{fieldTxt}</span><span className="cgpt-caret" style={{ opacity: caretO }}></span>
          </div>
          <div className="cgpt-right">
            <div className="cgpt-mic">
              <svg viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" strokeWidth="1.8" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M9 21h6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="cgpt-morph" style={{ transform: `scale(${1 - FIXED.pressSquash * pulse})` }}>
              <div className="cgpt-mwave" style={{
                backgroundColor: accent,
                opacity: 1 - m, transform: `scale(${1 - 0.1 * m})`,
              }}>
                <svg viewBox="0 0 24 24"><rect x="3" y="8" width="2.4" height="8" rx="1.2" /><rect x="8" y="4" width="2.4" height="16" rx="1.2" /><rect x="13" y="6" width="2.4" height="12" rx="1.2" /><rect x="18" y="2" width="2.4" height="20" rx="1.2" /></svg>
              </div>
              <div className="cgpt-msend" style={{ opacity: m, transform: `scale(${0.8 + 0.2 * cl(mPop)})` }}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 19V6M12 6l-6 6M12 6l6 6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="cgpt-chips" style={{
          opacity: chipsO,
          transform: `translateY(${cF.y + introY * FIXED.pillPar + FIXED.chipsOutY * mFwd}px)`,
          display: chipsO > 0.001 ? "flex" : "none",
        }}>
          {chipList.map((label, i) => (
            <div className="cgpt-chip" key={i}>
              {CHIP_ICONS[i % CHIP_ICONS.length]}
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cgpt-host-badge"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "chat-gpt",
  name: "ChatGPT 对话框",
  category: "素材呈现",
  durationInFrames: Math.round((DEFAULT_SCHED.total + 0.4) * 30),
  accent: "#2F6FED",
  component: ChatGpt as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "greeting", label: "首屏问候语", default: "今天想聊点什么？" },
    { type: "text", key: "prompt", label: "用户提示词（逐字打出）", default: DEFAULT_PROMPT },
    { type: "textarea", key: "reply", label: "助手回答（流式吐出，节拍随字数自适应）", default: DEFAULT_REPLY },
    { type: "text", key: "placeholder", label: "输入框占位文案", default: "问点什么" },
    { type: "textarea", key: "chips", label: "建议 chips（每行一个，图标按序循环）", default: "生成图片\n写作润色\n联网查证" },
    { type: "color", key: "accent", label: "强调色（语音圆）", default: "#2F6FED" },
    { type: "slider", key: "msgSize", label: "对话文字字号", default: 15, min: 12, max: 20, step: 0.5, unit: "px" },
    { type: "slider", key: "greetSize", label: "问候语字号", default: 30, min: 20, max: 44, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "界面整体偏移 X", default: 0, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "界面整体偏移 Y", default: 0, step: 1, unit: "px" },
    { type: "slider", key: "typeStart", label: "起手静置（开始打字）", default: 1.4, min: 0.4, max: 3, step: 0.05, unit: "s" },
    { type: "slider", key: "cps", label: "打字速率", default: 8.5, min: 4, max: 16, step: 0.5, unit: "字/s" },
  ],
};
