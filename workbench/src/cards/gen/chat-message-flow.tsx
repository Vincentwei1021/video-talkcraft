import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, HostSilhouette, clamp01, power1Out, power2Out } from "../shared";

// chat-message-flow · 聊天记录自演 —— 参数化版（源出 tplcards/chat-message-flow.tsx）
// 命门：时刻表由文本长度自动生成——只改消息 DSL，节奏自己算出来。
//   我方：输入框逐字打出 → 停 0.33s → 上屏弹入；对方：先出"正在输入"三点气泡再弹消息。
// 打字速率/停顿/弹入/回弹等全部 FIXED；只开放起手静置与消息间隔两个语境节奏。
const FPS = 30;

const FIXED = {
  charDur: 0.12,       // 我方输入框每字耗时 s
  typeMin: 0.60,       // 打字时长下限 / 上限 s
  typeMax: 2.60,
  sendGap: 0.33,       // 打完到发送的停顿
  reveal: 0.47,        // 气泡上屏弹入
  thinkPerChar: 0.115, // 对方"正在输入"时长 = 回复字数 × 这个值，再 clamp
  thinkMin: 1.10,
  thinkMax: 2.30,
  indIn: 0.27,         // 输入气泡淡入 / 淡出
  indOut: 0.20,
  reactDelay: 0.27,    // 反应表情比消息落定晚多少
  reactDur: 0.47,      // 反应弹出时长
  reactPop: 1.9,       // 反应回弹强度（≈ back.out(1.9)）
  pushLead: 0.07,      // 行占位比气泡弹入早多少
  sendWindow: 0.23,    // 发送键按压反馈的时间窗
  sendSquash: 0.16,    // 按压最深时缩到 1 - 0.16
  caretHz: 2,          // 输入框光标闪烁频率
  dotCps: 1.1,         // 三点跳动 周期/秒
  dotAmp: 5,           // 三点跳动幅度 px
  tail: 0.90,          // 尾巴留白 s
};

// —— 消息 DSL：每行 "发送方|内容" 或 "发送方|内容|表情"；发送方 = me / them ——
type Msg = { from: "me" | "them"; text: string; react?: string };
function parseMessages(dsl: string): Msg[] {
  return dsl
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const parts = l.split("|");
      const from = parts[0].trim() === "me" ? "me" : "them";
      if (parts.length <= 2) return { from, text: (parts[1] ?? "").trim() } as Msg;
      return {
        from,
        text: parts.slice(1, -1).join("|").trim(),
        react: parts[parts.length - 1].trim() || undefined,
      } as Msg;
    });
}

type Item = {
  i: number; from: "me" | "them"; text: string; len: number; react?: string;
  typeStart?: number; typeDur?: number; sendAt?: number;
  thinkStart?: number; thinkDur?: number;
  revealAt: number; presenceStart: number; reactAt?: number;
};

// —— 时刻表：一遍算完每条消息的每个时刻点，运行时只查表 ——
function buildSchedule(messages: Msg[], leadIn: number, msgGap: number) {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const sched: Item[] = [];
  let cur = leadIn;
  messages.forEach((m, i) => {
    const len = m.text.length;
    const it = { i, from: m.from, text: m.text, len, react: m.react } as Item;
    if (m.from === "me") {
      it.typeStart = cur;
      it.typeDur = clamp(len * FIXED.charDur, FIXED.typeMin, FIXED.typeMax);
      it.sendAt = it.typeStart + it.typeDur + FIXED.sendGap;
      it.revealAt = it.sendAt;                        // 发送与上屏同帧
      it.presenceStart = it.revealAt - FIXED.pushLead;
    } else {
      it.thinkStart = cur;
      it.thinkDur = clamp(len * FIXED.thinkPerChar, FIXED.thinkMin, FIXED.thinkMax);
      it.revealAt = it.thinkStart + it.thinkDur;
      it.presenceStart = it.thinkStart;               // 占位交给输入气泡
    }
    it.reactAt = m.react ? it.revealAt + FIXED.reveal + FIXED.reactDelay : undefined;
    sched.push(it);
    cur = it.revealAt + FIXED.reveal
        + (m.react ? FIXED.reactDelay + FIXED.reactDur : 0) + msgGap;
  });
  return { sched, total: cur - msgGap + FIXED.tail };
}

const DEFAULT_MESSAGES = [
  "me|筛选器默认收起吧？",
  "them|同意，第一屏别摆五个下拉",
  "them|默认值我改成近 7 天了|👍",
].join("\n");

// 默认时长照抄模板 meta 的计算逻辑：round((total + 0.4) × 30)
const DEFAULT_TOTAL = buildSchedule(parseMessages(DEFAULT_MESSAGES), 0.4, 0.6).total;

const backOut = (p: number, s: number) =>
  1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);

// 静态版式（类名加 cmf- 前缀；reset 只作用于本卡子树，不外泄）
const CSS = `
.cmf-chat, .cmf-chat *, .cmf-badge, .cmf-badge * { margin: 0; padding: 0; box-sizing: border-box; }
.cmf-chat {
  position: absolute;
  width: 460px; height: 448px;
  border: 1px solid #e0e0e0;
  border-radius: 18px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cmf-head {
  flex: 0 0 auto;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid #ececef;
}
.cmf-head .cmf-who { font-size: 14.5px; font-weight: 600; letter-spacing: 0.2px; }
.cmf-head .cmf-sub { font-size: 11.5px; color: #8a8a8a; margin-top: 1px; }
.cmf-av {
  flex: 0 0 auto;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #ececef;
  color: #8a8a8a;
  font-size: 13px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.cmf-feed {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 16px;
  padding: 16px 18px 17px;
  overflow: hidden;
}
.cmf-row { align-items: flex-end; gap: 8px; }
.cmf-row.cmf-me { justify-content: flex-end; }
.cmf-row .cmf-col { position: relative; max-width: 300px; }
.cmf-bub {
  position: relative;
  padding: 10px 14px;
  border-radius: 16px;
  line-height: 1.45;
  letter-spacing: 0.2px;
}
.cmf-row.cmf-me .cmf-bub { border-bottom-right-radius: 6px; }
.cmf-row.cmf-them .cmf-bub { border-bottom-left-radius: 6px; }
.cmf-ind {
  position: absolute;
  left: 0; bottom: 0;
  padding: 12px 15px;
  border-radius: 16px;
  border-bottom-left-radius: 6px;
  display: flex; align-items: center; gap: 5px;
  height: 40px;
}
.cmf-ind i { width: 8px; height: 8px; border-radius: 50%; background: #a0a0a8; display: block; }
.cmf-react {
  position: absolute;
  bottom: -13px;
  width: 26px; height: 26px;
  border-radius: 50%;
  box-shadow: 0 0 0 2.5px #ffffff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
}
.cmf-row.cmf-them .cmf-react { left: 14px; }
.cmf-row.cmf-me .cmf-react { right: 14px; }
.cmf-composer {
  flex: 0 0 auto;
  margin: 10px 14px 14px;
  padding: 12px 14px;
  border: 1px solid #e6e6e9;
  border-radius: 20px;
  background: #fafafa;
}
.cmf-field {
  display: flex; align-items: center;
  min-height: 22px;
  font-size: 15.5px;
  line-height: 1.4;
}
.cmf-caret {
  display: inline-block;
  width: 2px; height: 18px;
  margin-left: 2px;
}
.cmf-tools { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.cmf-plus {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  display: flex; align-items: center; justify-content: center;
}
.cmf-plus svg, .cmf-send svg { width: 17px; height: 17px; display: block; }
.cmf-plus svg { stroke: #a8a8b0; }
.cmf-send {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.cmf-badge {
  position: absolute;
  left: 52px; top: 400px;
  width: 96px; height: 96px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
`;

interface Props {
  messages?: string;
  contactName?: string;
  contactSub?: string;
  avatarChar?: string;
  placeholder?: string;
  ink?: string;
  themBg?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  leadIn?: number;
  msgGap?: number;
}

const ChatMessageFlow: React.FC<Props> = ({
  messages = DEFAULT_MESSAGES,
  contactName = "林工 · 设计评审",
  contactSub = "在线",
  avatarChar = "林",
  placeholder = "发消息…",
  ink = "#1d1d1f",
  themBg = "#f0f0f2",
  fontSize = 16,
  posX = 250,
  posY = 46,
  leadIn = 0.4,
  msgGap = 0.6,
}) => {
  const t = useCurrentFrame() / FPS;
  const { sched } = buildSchedule(parseMessages(messages), leadIn, msgGap);

  // —— 输入框：当前正在打的那条我方消息 ——
  let comp = "", caretOn = 0;
  for (const s of sched) {
    if (s.from !== "me" || t < s.typeStart! || t >= s.sendAt!) continue;
    const p = clamp01((t - s.typeStart!) / s.typeDur!);
    comp = s.text.slice(0, Math.floor(p * s.len));
    // 打字中光标实心不闪；打完（进入 sendGap）才开始闪
    caretOn = p < 1 ? 1 : (Math.floor(t * FIXED.caretHz) % 2 === 0 ? 1 : 0);
  }
  const fieldTxt = comp || placeholder;
  const ph = comp ? 0 : 1;

  // 发送键：有字就转激活；发送那一瞬按压回弹
  let pulse = 0;
  for (const s of sched) {
    if (s.sendAt === undefined) continue;
    const d = Math.abs(t - s.sendAt);
    if (d <= FIXED.sendWindow) pulse = Math.max(pulse, 1 - d / FIXED.sendWindow);
  }

  // —— 三点跳动：正弦波，点间相位差 = 周期/6 ——
  const dotPhase = (i: number) => {
    const w = (Math.sin(Math.PI * 2 * (t * FIXED.dotCps - i / 6)) + 1) / 2;
    return { y: -FIXED.dotAmp * w, o: 0.45 + 0.55 * w };
  };

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK }}>
      <style>{CSS}</style>
      <div className="cmf-chat" style={{ left: posX, top: posY }}>
        <div className="cmf-head">
          <div className="cmf-av">{avatarChar}</div>
          <div>
            <div className="cmf-who">{contactName}</div>
            <div className="cmf-sub">{contactSub}</div>
          </div>
        </div>

        <div className="cmf-feed">
          {sched.map((s) => {
            // 行占位：display 硬切一帧，全卡唯一的布局变化
            const present = t >= s.presenceStart;

            // 气泡弹入：y 12→0 + scale .94→1 + 淡入（origin 在下沿）
            const bp = clamp01((t - s.revealAt) / FIXED.reveal);
            const e = power2Out(bp);

            // 输入气泡：淡入 → 一直跳 → 消息落地前淡出
            const inP = s.from === "them" ? power1Out(clamp01((t - s.thinkStart!) / FIXED.indIn)) : 0;
            const outP = s.from === "them" ? 1 - clamp01((t - (s.revealAt - FIXED.indOut)) / FIXED.indOut) : 0;
            const indO = inP * outP;

            // 反应表情：消息落定后再贴出，回弹一下（全卡唯一允许过冲的动作）
            const rp = s.reactAt !== undefined ? clamp01((t - s.reactAt) / FIXED.reactDur) : 0;

            return (
              <div key={s.i} className={"cmf-row cmf-" + s.from} style={{ display: present ? "flex" : "none" }}>
                {s.from === "them" ? <div className="cmf-av">{avatarChar}</div> : null}
                <div className="cmf-col">
                  <div className="cmf-bub" style={{
                    fontSize,
                    background: s.from === "me" ? ink : themBg,
                    color: s.from === "me" ? "#ffffff" : "#1d1d1f",
                    opacity: power1Out(bp),
                    transform: `translateY(${12 * (1 - e)}px) scale(${0.94 + 0.06 * e})`,
                    transformOrigin: s.from === "me" ? "100% 100%" : "0% 100%",
                  }}>{s.text}</div>
                  {s.from === "them" ? (
                    <div className="cmf-ind" style={{
                      background: themBg,
                      opacity: indO, transform: `translateY(${10 * (1 - inP)}px)`,
                    }}>
                      {[0, 1, 2].map((i) => {
                        const { y, o } = dotPhase(i);
                        return <i key={i} style={indO > 0 ? { transform: `translateY(${y}px)`, opacity: o } : undefined}></i>;
                      })}
                    </div>
                  ) : null}
                  {s.react ? (
                    <div className="cmf-react" style={{
                      background: themBg,
                      opacity: clamp01(rp / 0.35),
                      transform: `scale(${rp <= 0 ? 0 : backOut(rp, FIXED.reactPop)})`,
                    }}>{s.react}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="cmf-composer">
          <div className="cmf-field" style={{ color: ph ? "#a8a8b0" : "#1d1d1f" }}>
            <span>{fieldTxt}</span>
            <span className="cmf-caret" style={{ background: ink, opacity: caretOn }}></span>
          </div>
          <div className="cmf-tools">
            <div className="cmf-plus">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </div>
            <div className="cmf-send" style={{
              background: comp ? ink : "#ececef",
              transform: `scale(${1 - FIXED.sendSquash * pulse})`,
            }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ stroke: comp ? "#ffffff" : "#a8a8b0" }}>
                <path d="M12 19V5M12 5l-6 6M12 5l6 6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="cmf-badge"><HostSilhouette /></div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "chat-message-flow",
  name: "聊天记录自演",
  category: "素材呈现",
  durationInFrames: Math.round((DEFAULT_TOTAL + 0.4) * 30),
  accent: "#1d1d1f",
  component: ChatMessageFlow as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "textarea", key: "messages",
      label: "消息（每行：发送方|内容 或 发送方|内容|表情；发送方 me=我方 / them=对方）",
      default: DEFAULT_MESSAGES,
    },
    { type: "text", key: "contactName", label: "对话对象", default: "林工 · 设计评审" },
    { type: "text", key: "contactSub", label: "状态副题", default: "在线" },
    { type: "text", key: "avatarChar", label: "头像首字", default: "林" },
    { type: "text", key: "placeholder", label: "输入框占位文案", default: "发消息…" },
    { type: "color", key: "ink", label: "我方气泡墨色", default: "#1d1d1f" },
    { type: "color", key: "themBg", label: "对方气泡底色", default: "#f0f0f2" },
    { type: "slider", key: "fontSize", label: "气泡字号", default: 16, min: 12, max: 22, step: 0.5, unit: "px" },
    { type: "number", key: "posX", label: "聊天窗 X", default: 250, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "聊天窗 Y", default: 46, step: 1, unit: "px" },
    { type: "slider", key: "leadIn", label: "起手静置", default: 0.4, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "msgGap", label: "消息间隔", default: 0.6, min: 0.2, max: 2, step: 0.05, unit: "s" },
  ],
};
