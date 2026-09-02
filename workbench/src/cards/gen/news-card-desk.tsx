import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { CardDef } from "../types";
import { FONT_STACK, lerp, linear, power2Out, power3Out, tw } from "../shared";

// news-card-desk · 新闻卡片划重点 —— 参数化版（源出 tplcards/news-card-desk.tsx）
// 命门：主卡从下方"摆上桌"（带歪度）→ 红线在关键词下扫出 → 次卡从右侧压上；
// 上桌时长/歪度语法/Ken Burns 幅度与时长全部 FIXED。卡序列走 textarea 逐行 DSL
// （报头|日期|标题|灰条数|左|上|宽|歪度），标题里 [关键词] 划红线、^ 换行；
// 第 1 行是主卡（大字号、下方上桌），其余为次卡（小字号、右侧滑入、依次压上）。
const FPS = 30;

const FIXED = {
  slideIn: 0.4,       // 卡片上桌耗时 s（power3.out）
  slideY: 60,         // 主卡上桌起始下沉 px
  cardBFrom: 320,     // 次卡从右侧进场的 x 位移 px
  cardBDropY: 20,     // 次卡进场附带的下沉 px
  redline: 0.3,       // 红线扫过耗时 s
  kenburns: 1.04,     // 全程极缓 Ken Burns 终点倍数
  kbDur: 8,           // Ken Burns 时长 s
  extraStagger: 0.5,  // 第 3 张起，次卡之间的间隔 s
};

// —— 卡 DSL：每行 "报头|日期|标题|灰条数|左|上|宽|歪度"；标题内 [关键词] 划红线、^ 换行 ——
type NewsCard = {
  paper: string; date: string; headline: string;
  bars: number; x: number; y: number; w: number; tilt: number;
};
function parseCards(dsl: string): NewsCard[] {
  return dsl
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => {
      const p = l.split("|").map((s) => s.trim());
      return {
        paper: p[0] || "",
        date: p[1] || "",
        headline: p[2] || "",
        bars: Number(p[3]) || 0,
        x: Number(p[4]) || 0,
        y: Number(p[5]) || 0,
        w: Number(p[6]) || 330,
        tilt: Number(p[7]) || 0,
      };
    });
}

// 标题解析：^ 切行，行内 [ ] 括起的段落划红线
type Seg = { text: string; kw: boolean };
const parseHeadline = (s: string): Seg[][] =>
  s.split("^").map((line) => {
    const segs: Seg[] = [];
    const re = /\[([^\]]*)\]/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) segs.push({ text: line.slice(last, m.index), kw: false });
      segs.push({ text: m[1], kw: true });
      last = m.index + m[0].length;
    }
    if (last < line.length) segs.push({ text: line.slice(last), kw: false });
    return segs;
  });

const DEFAULT_CARDS = [
  "财经日报|2026-08-17 · A1 版|央行宣布降准 0.5 个百分点，^释放长期资金[约 1 万亿元]|3|150|105|520|-1.5",
  "市场快讯|10:42|股债汇三市齐动，机构：宽松周期确认|2|520|235|330|2",
].join("\n");

// 静态版式（类名加 ncd- 前缀；reset 只作用于本卡子树，不外泄）
const CSS = `
.ncd-card, .ncd-card * { margin: 0; padding: 0; box-sizing: border-box; }
.ncd-card {
  position: absolute;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 14px 30px rgba(0, 0, 0, .14);
  color: #1d1d1f;
  overflow: hidden;
}
.ncd-card .ncd-masthead {
  display: flex; justify-content: space-between; align-items: baseline;
  border-bottom: 2px solid #1d1d1f;
  padding-bottom: 8px; margin-bottom: 14px;
}
.ncd-card .ncd-paper { font-weight: 800; letter-spacing: 2px; }
.ncd-card .ncd-date { font-size: 11px; color: #8a8a8a; }
.ncd-card h2 { line-height: 1.4; font-weight: bold; margin-top: 0; }
.ncd-card .ncd-kw { position: relative; display: inline-block; }
.ncd-card .ncd-redline {
  position: absolute; left: -2px; right: -2px; bottom: 1px;
  height: 5px; border-radius: 3px;
  transform-origin: left center;
}
.ncd-card .ncd-grayline {
  height: 10px; border-radius: 5px; background: #ececef; margin-bottom: 9px;
}
.ncd-kb { transform-origin: 50% 40%; }
`;

interface Props {
  cards?: string;
  lineColor?: string;
  fontSize?: number;
  posX?: number;
  posY?: number;
  leadIn?: number;
  redlineDelay?: number;
  cardBAt?: number;
}

const NewsCardDesk: React.FC<Props> = ({
  cards = DEFAULT_CARDS,
  lineColor = "#d8383a",
  fontSize = 26,
  posX = 0,
  posY = 0,
  leadIn = 0.1,
  redlineDelay = 0.9,
  cardBAt = 1.9,
}) => {
  const t = useCurrentFrame() / FPS;
  const cardList = parseCards(cards);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: FONT_STACK,
    }}>
      <style>{CSS}</style>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${posX}px, ${posY}px)` }}>
        {cardList.map((c, i) => {
          const main = i === 0;
          const at = main ? leadIn : cardBAt + (i - 1) * FIXED.extraStagger;
          // 上桌：opacity/位移同一条 power3.out；落位即开始极缓 Ken Burns
          const p = tw(t, at, FIXED.slideIn, power3Out);
          const kb = lerp(1, FIXED.kenburns, tw(t, at + FIXED.slideIn, FIXED.kbDur, linear));
          // 红线在标题关键词下扫出——与口播"重点是"同步
          const red = tw(t, at + redlineDelay, FIXED.redline, power2Out);
          const transform = main
            ? `translateY(${lerp(FIXED.slideY, 0, p)}px) rotate(${c.tilt}deg)`
            : `translate(${lerp(FIXED.cardBFrom, 0, p)}px, ${lerp(FIXED.cardBDropY, 0, p)}px) rotate(${c.tilt}deg)`;
          const lines = parseHeadline(c.headline);

          return (
            <div key={i} className="ncd-card" style={{
              left: c.x, top: c.y, width: c.w,
              padding: main ? "24px 30px 26px" : "18px 22px 20px",
              opacity: p, transform,
            }}>
              <div className="ncd-kb" style={{ transform: `scale(${kb})` }}>
                <div className="ncd-masthead">
                  <span className="ncd-paper" style={{ fontSize: main ? 20 : 15 }}>{c.paper}</span>
                  <span className="ncd-date">{c.date}</span>
                </div>
                <h2 style={{
                  fontSize: main ? fontSize : 18,
                  marginBottom: main ? 14 : 10,
                }}>
                  {lines.map((segs, li) => (
                    <React.Fragment key={li}>
                      {li > 0 ? <br /> : null}
                      {segs.map((seg, si) => seg.kw ? (
                        <span key={si} className="ncd-kw">
                          {seg.text}
                          <span className="ncd-redline" style={{
                            background: lineColor, transform: `scaleX(${red})`,
                          }} />
                        </span>
                      ) : (
                        <React.Fragment key={si}>{seg.text}</React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </h2>
                {Array.from({ length: c.bars }, (_, bi) => (
                  <div key={bi} className="ncd-grayline"
                       style={bi === c.bars - 1 ? { width: "62%" } : undefined} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const card: CardDef = {
  id: "news-card-desk",
  name: "新闻卡片划重点",
  category: "素材呈现",
  durationInFrames: 321,
  accent: "#d8383a",
  component: NewsCardDesk as React.ComponentType<Record<string, unknown>>,
  schema: [
    {
      type: "textarea", key: "cards",
      label: "新闻卡（每行：报头|日期|标题|灰条数|左|上|宽|歪度；标题内 [关键词] 划红线、^ 换行；第 1 行为主卡）",
      default: DEFAULT_CARDS,
    },
    { type: "color", key: "lineColor", label: "划重点红线色", default: "#d8383a" },
    { type: "slider", key: "fontSize", label: "主卡标题字号", default: 26, min: 18, max: 36, step: 1, unit: "px" },
    { type: "number", key: "posX", label: "桌面整体偏移 X", default: 0, step: 1, unit: "px" },
    { type: "number", key: "posY", label: "桌面整体偏移 Y", default: 0, step: 1, unit: "px" },
    { type: "slider", key: "leadIn", label: "主卡上桌时刻", default: 0.1, min: 0, max: 2, step: 0.05, unit: "s" },
    { type: "slider", key: "redlineDelay", label: "红线延迟（上桌后）", default: 0.9, min: 0.3, max: 3, step: 0.05, unit: "s" },
    { type: "slider", key: "cardBAt", label: "次卡入场时刻", default: 1.9, min: 0.5, max: 5, step: 0.05, unit: "s" },
  ],
};
