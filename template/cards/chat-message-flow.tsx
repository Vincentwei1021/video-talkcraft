import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// chat-message-flow · 聊天记录自演 —— 自包含 Remotion 源码（与 demos/chat-message-flow/index.html 同画面）
// 复制本文件进你的工程即可用；主持人视频经 hostSrc prop 注入，不传则灰阶剪影占位。

// ===== 可摘走的核心：CONFIG + buildSchedule() + paint(t) =====
// 本卡的命门是**时刻表由文本长度自动生成**——只写消息数组，节奏自己算出来，
// 换文案不用重数一遍帧。两条链路各有自己的前戏：
//   我方：输入框逐字打出 → 停 0.33s → 上屏弹入（"这条消息是我刚打的"）
//   对方：先出"正在输入"三点气泡（时长按回复长度插值） → 才弹消息（"对方在想"）
// 反应表情在消息落定后再 0.27s 贴上（同帧贴＝读作气泡自带的图标，不是"有人点了个赞"）。
const CONFIG = {
  leadIn: 0.40,        // 起手静置 s（等口播开口）
  charDur: 0.12,       // 我方输入框每字耗时 s（中文 3~4 帧 @30fps；英文取其一半）
  typeMin: 0.60,       // 打字时长下限 / 上限 s（短消息不能一闪而过，长消息不能磨到观众走神）
  typeMax: 2.60,
  sendGap: 0.33,       // 打完到发送的停顿（"手指抬起再按发送"的那一下）
  reveal: 0.47,        // 气泡上屏弹入
  msgGap: 0.60,        // 消息间隔
  thinkPerChar: 0.115, // 对方"正在输入"时长 = 回复字数 × 这个值，再 clamp
  thinkMin: 1.10,
  thinkMax: 2.30,
  indIn: 0.27,         // 输入气泡淡入 / 淡出
  indOut: 0.20,
  reactDelay: 0.27,    // 反应表情比消息落定晚多少
  reactDur: 0.47,      // 反应弹出时长
  reactPop: 1.9,       // 反应回弹强度（≈ back.out(1.9)）
  pushLead: 0.07,      // 行占位比气泡弹入早多少（先顶上去，再落下来）
  sendWindow: 0.23,    // 发送键按压反馈的时间窗（前后各半）
  sendSquash: 0.16,    // 按压最深时缩到 1 - 0.16
  caretHz: 2,          // 输入框光标闪烁频率（打字中不闪、停手才闪）
  dotCps: 1.1,         // 三点跳动 周期/秒
  dotAmp: 5,           // 三点跳动幅度 px（相位差 = 周期/6，波从左往右推）
  tail: 0.90,          // 尾巴留白 s
  // 消息数组就是全部输入：from = me（我方，走输入框）/ them（对方，走输入气泡）
  messages: [
    { from: "me",   text: "筛选器默认收起吧？" },
    { from: "them", text: "同意，第一屏别摆五个下拉" },
    { from: "them", text: "默认值我改成近 7 天了", react: "👍" },
  ] as { from: "me" | "them"; text: string; react?: string }[],
};

type Item = {
  i: number; from: "me" | "them"; text: string; len: number; react?: string;
  typeStart?: number; typeDur?: number; sendAt?: number;
  thinkStart?: number; thinkDur?: number;
  revealAt: number; presenceStart: number; reactAt?: number;
};

// —— 时刻表：一遍算完每条消息的每个时刻点，运行时只查表 ——
function buildSchedule() {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const sched: Item[] = [];
  let cur = CONFIG.leadIn;
  CONFIG.messages.forEach((m, i) => {
    const len = m.text.length;
    const it = { i, from: m.from, text: m.text, len, react: m.react } as Item;
    if (m.from === "me") {
      it.typeStart = cur;
      it.typeDur = clamp(len * CONFIG.charDur, CONFIG.typeMin, CONFIG.typeMax);
      it.sendAt = it.typeStart + it.typeDur + CONFIG.sendGap;
      it.revealAt = it.sendAt;                       // 发送与上屏同帧（发送键按下＝消息出现）
      it.presenceStart = it.revealAt - CONFIG.pushLead;
    } else {
      it.thinkStart = cur;
      it.thinkDur = clamp(len * CONFIG.thinkPerChar, CONFIG.thinkMin, CONFIG.thinkMax);
      it.revealAt = it.thinkStart + it.thinkDur;
      it.presenceStart = it.thinkStart;              // 占位交给输入气泡：布局只跳这一次
    }
    it.reactAt = m.react ? it.revealAt + CONFIG.reveal + CONFIG.reactDelay : undefined;
    sched.push(it);
    cur = it.revealAt + CONFIG.reveal
        + (m.react ? CONFIG.reactDelay + CONFIG.reactDur : 0) + CONFIG.msgGap;
  });
  return { sched, total: cur - CONFIG.msgGap + CONFIG.tail };
}
const { sched: SCHED, total: TOTAL } = buildSchedule();

export const meta = { width: 960, height: 540, fps: 30, durationInFrames: Math.round((TOTAL + 0.4) * 30) };

const FPS = meta.fps;

// 缓动（手写版，对应 power2.out / power3.out / back.out）
const cl = (v: number) => Math.max(0, Math.min(1, v));
const out2 = (p: number) => 1 - (1 - p) * (1 - p);
const out3 = (p: number) => 1 - Math.pow(1 - p, 3);
const backOut = (p: number, s: number) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);

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

// —— 演示语境（不属于动效）：一块灰阶中性聊天面板（刻意不仿微信/iMessage：
//    没有绿色气泡、没有蓝色气泡、没有尖角小三角）+ 角标主播 ——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }   /* demo-shell 的全局 reset，布局依赖它 */
.chat {
  position: absolute;
  left: 250px; top: 46px;
  width: 460px; height: 448px;
  border: 1px solid #e0e0e0;
  border-radius: 18px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.head {
  flex: 0 0 auto;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid #ececef;
}
.head .av { width: 30px; height: 30px; }
.head .who { font-size: 14.5px; font-weight: 600; letter-spacing: 0.2px; }
.head .sub { font-size: 11.5px; color: #8a8a8a; margin-top: 1px; }

/* 头像：灰阶首字圆 */
.av {
  flex: 0 0 auto;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #ececef;
  color: #8a8a8a;
  font-size: 13px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}

/* 消息区：底部对齐 —— 新消息占位那一帧把上面的消息整体顶上去 */
.feed {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 16px;
  /* 下留白 ≥ 反应表情探出气泡的量（13px），否则最后一条的表情被 overflow 切掉半个 */
  padding: 16px 18px 17px;
  overflow: hidden;
}

.row { align-items: flex-end; gap: 8px; }
.row.me { justify-content: flex-end; }
.row .col { position: relative; max-width: 300px; }

/* 气泡：我方墨底白字 / 对方浅灰底墨字（灰阶对比就够分清"谁在说"，不需要品牌色） */
.bub {
  position: relative;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 16px;
  line-height: 1.45;
  letter-spacing: 0.2px;
}
.row.me .bub { background: #1d1d1f; color: #ffffff; border-bottom-right-radius: 6px; }
.row.them .bub { background: #f0f0f2; color: #1d1d1f; border-bottom-left-radius: 6px; }

/* "正在输入"气泡：绝对定位盖在消息气泡上 —— 不进流，所以换成消息时零重排 */
.ind {
  position: absolute;
  left: 0; bottom: 0;
  padding: 12px 15px;
  border-radius: 16px;
  border-bottom-left-radius: 6px;
  background: #f0f0f2;
  display: flex; align-items: center; gap: 5px;
  height: 40px;
}
.ind i { width: 8px; height: 8px; border-radius: 50%; background: #a0a0a8; display: block; }

/* 表情反应：贴在气泡下沿外，白环让它读作"叠在气泡上"而不是气泡的一部分 */
.react {
  position: absolute;
  bottom: -13px;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: #f0f0f2;
  box-shadow: 0 0 0 2.5px #ffffff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
}
.row.them .react { left: 14px; }
.row.me .react { right: 14px; }

/* 输入框（我方消息的"来源"——先在这里逐字打出，再上屏） */
.composer {
  flex: 0 0 auto;
  margin: 10px 14px 14px;
  padding: 12px 14px;
  border: 1px solid #e6e6e9;
  border-radius: 20px;
  background: #fafafa;
}
.field {
  display: flex; align-items: center;
  min-height: 22px;
  font-size: 15.5px;
  line-height: 1.4;
  color: #1d1d1f;
}
.field.ph { color: #a8a8b0; }
.caret {
  display: inline-block;
  width: 2px; height: 18px;
  margin-left: 2px;
  background: #1d1d1f;
}
.tools { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.plus {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  display: flex; align-items: center; justify-content: center;
}
.plus svg, .send svg { width: 17px; height: 17px; display: block; }
.plus svg { stroke: #a8a8b0; }
.send {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: #ececef;
  display: flex; align-items: center; justify-content: center;
}
.send svg { stroke: #a8a8b0; }
.send.on { background: #1d1d1f; }
.send.on svg { stroke: #ffffff; }

/* 角标主播（演示语境） */
.host-badge {
  position: absolute;
  left: 52px; top: 400px;
  width: 96px; height: 96px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  background: #fff;
}
`;

export default function ChatMessageFlow({ hostSrc }: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // —— 输入框：当前正在打的那条我方消息 ——
  let comp = "", caretOn = 0;
  for (const s of SCHED) {
    if (s.from !== "me" || t < s.typeStart! || t >= s.sendAt!) continue;
    const p = cl((t - s.typeStart!) / s.typeDur!);
    comp = s.text.slice(0, Math.floor(p * s.len));
    // 打字中光标实心不闪；打完（进入 sendGap）才开始闪——"停手了，正要发出去"
    caretOn = p < 1 ? 1 : (Math.floor(t * CONFIG.caretHz) % 2 === 0 ? 1 : 0);
  }
  const fieldTxt = comp || "发消息…";
  const ph = comp ? 0 : 1;

  // 发送键：有字就转激活；发送那一瞬按压回弹（时间窗内线性升降）
  let pulse = 0;
  for (const s of SCHED) {
    if (s.sendAt === undefined) continue;
    const d = Math.abs(t - s.sendAt);
    if (d <= CONFIG.sendWindow) pulse = Math.max(pulse, 1 - d / CONFIG.sendWindow);
  }

  // —— 三点跳动：正弦波，点间相位差 = 周期/6（点数 × 2）——
  const dotPhase = (i: number) => {
    const w = (Math.sin(Math.PI * 2 * (t * CONFIG.dotCps - i / 6)) + 1) / 2;
    return { y: -CONFIG.dotAmp * w, o: 0.45 + 0.55 * w };
  };

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="chat">
        <div className="head">
          <div className="av">林</div>
          <div>
            <div className="who">林工 · 设计评审</div>
            <div className="sub">在线</div>
          </div>
        </div>

        <div className="feed">
          {SCHED.map((s) => {
            // 行占位：display 硬切一帧（把上面的消息整体顶上去），全卡唯一的布局变化
            const present = t >= s.presenceStart;

            // 气泡弹入：y 12→0 + scale .94→1 + 淡入（origin 在下沿，"从下面浮起来"）
            const bp = cl((t - s.revealAt) / CONFIG.reveal);
            const e = out3(bp);

            // 输入气泡：淡入 → 一直跳 → 消息落地前淡出（两者时间窗不重叠，不会看见双层）
            const inP = s.from === "them" ? out2(cl((t - s.thinkStart!) / CONFIG.indIn)) : 0;
            const outP = s.from === "them" ? 1 - cl((t - (s.revealAt - CONFIG.indOut)) / CONFIG.indOut) : 0;
            const indO = inP * outP;

            // 反应表情：消息落定后 0.27s 贴出，回弹一下（全卡唯一允许过冲的动作）
            const rp = s.reactAt !== undefined ? cl((t - s.reactAt) / CONFIG.reactDur) : 0;

            return (
              <div key={s.i} className={"row " + s.from} style={{ display: present ? "flex" : "none" }}>
                {s.from === "them" ? <div className="av">林</div> : null}
                <div className="col">
                  <div className="bub" style={{
                    opacity: out2(bp),
                    transform: `translateY(${12 * (1 - e)}px) scale(${0.94 + 0.06 * e})`,
                    transformOrigin: s.from === "me" ? "100% 100%" : "0% 100%",
                  }}>{s.text}</div>
                  {s.from === "them" ? (
                    <div className="ind" style={{ opacity: indO, transform: `translateY(${10 * (1 - inP)}px)` }}>
                      {[0, 1, 2].map((i) => {
                        const { y, o } = dotPhase(i);
                        return <i key={i} style={indO > 0 ? { transform: `translateY(${y}px)`, opacity: o } : undefined}></i>;
                      })}
                    </div>
                  ) : null}
                  {s.react ? (
                    <div className="react" style={{
                      opacity: cl(rp / 0.35),
                      transform: `scale(${rp <= 0 ? 0 : backOut(rp, CONFIG.reactPop)})`,
                    }}>{s.react}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="composer">
          <div className={"field" + (ph ? " ph" : "")}>
            <span>{fieldTxt}</span>
            <span className="caret" style={{ opacity: caretOn }}></span>
          </div>
          <div className="tools">
            <div className="plus">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </div>
            <div className={"send" + (comp ? " on" : "")}
                 style={{ transform: `scale(${1 - CONFIG.sendSquash * pulse})` }}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-6 6M12 5l6 6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="host-badge"><Host src={hostSrc} /></div>
    </AbsoluteFill>
  );
}
