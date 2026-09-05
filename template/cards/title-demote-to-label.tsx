import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// title-demote-to-label · 标题降格成标签 —— 自包含 Remotion 源码（与 demos/title-demote-to-label/index.html 同画面）
// 章节标题居中解糊显影、站稳 ≥18 帧，然后一条 inOut 曲线 20 帧完成"缩到 0.4 倍 + 飞到左上角"落成小节标签；
// 降格进行到 12 帧时内容块已开始在其下方错峰生长——标题不消失，变成常驻路标。
// 复制本文件进你的工程即可用；文案经 props 注入（title / items / itemBg），不传 = demo 文案。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 189 };   // 5.9s 镜头 + 0.4s 收尾（3 条）

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 降格是单次连续补间：scale 与位置同一条 inOut 曲线（分"先缩后飞"两段读作两个动作）；
//      ② 显影后必须站稳 ≥18 帧再降格（没站稳就缩，宣告拍被吃掉）；③ 居中修正量 translate(-(1-d)·50%) 随补间同步归零
//      （不归零终点偏一个半宽）；④ 内容在降格进行到 12 帧时就开始长——交接无空档。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  startAt: 0.20,      // 标题显影起点 s
  reveal: 0.40,       // 显影时长 s（blur 12→0 + 淡入，power3.out）
  stand: 0.70,        // 站稳静置 s（≥0.6；省掉这拍观众没读完标题它就跑了）
  demote: 0.67,       // 降格补间 s（≈20 帧 power2.inOut；<0.47 读作标题被弹走）
  endScale: 0.4,      // 标签终点缩放（56px → 22px，仍在 caption 档以上；>0.45 标签太大压内容）
  from: { x: 480, y: 270 },   // 标题居中位（画面中心）
  to: { x: 80, y: 72 },       // 标签落点（左边吸附栏线 x=80 = 内容块左边）
  growDelay: 0.40,    // 内容开始生长相对降格起点的延迟 s（≈12 帧：标题还在飞内容已在长；等标题落位才长会空 8 帧冷场）
  stagger: 0.55,      // 内容块错峰 s（按口播逐个出现；全部同时长出读作页面刷新）
  growDur: 0.50,      // 单块生长 s（power3.out：clip 从 35% 宽展开 + 上移 28px + 淡入）
  clipFrom: 65,       // 生长起点被裁掉的右侧百分比（宽 0.35→1）
  rise: 28,           // 生长起点上移量 px
  holdEnd: 2.70,      // 末块落定后静置 s
  exitDur: 0.40,      // 标签 + 内容同收（power2.in）
};

/* 时间表（demo 秒，3 条内容）
   0.20–0.60  标题显影（blur 12→0 + 淡入，power3.out）；0.60–1.30 站稳
   1.30–1.97  降格：scale 1→0.4、(480,270)→(80,72)、居中修正 −50%→0 同一条 power2.inOut
   1.70 / 2.25 / 2.80  内容块各 0.5s 生长（clip 65%→0 + y 28→0 + 淡入，power3.out）
   5.50–5.90  标签 + 内容同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2In = (x: number) => x * x * x;
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

// —— 演示语境（不属于动效）：样式照搬 demo（类名 tdl- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.tdl-ttl { position: absolute; font-size: 56px; font-weight: 700; color: #1d1d1f; white-space: nowrap; transform-origin: 0% 50%; will-change: transform, filter; }
.tdl-content { position: absolute; left: 80px; top: 150px; width: 800px; }
.tdl-blk { display: flex; align-items: center; gap: 18px; height: 64px; margin-bottom: 22px; font-size: 26px; color: #1d1d1f; will-change: transform, clip-path; }
.tdl-blk i { flex: none; width: 8px; height: 40px; border-radius: 4px; background: #0066cc; }
.tdl-blk span { border-radius: 12px; padding: 0 22px; height: 64px; line-height: 64px; white-space: nowrap; }
`;

type Props = {
  /** 章节 / 小节标题（先居中当主角，再降格成左上角标签） */
  title?: string;
  /** 内容条目（≤4 条，按口播逐条生长） */
  items?: string[];
  /** 条目底板（layout §7 淡色系：蓝 / 青 / 黄 / 粉 / 紫 / 灰，同组不重复） */
  itemBg?: string[];
  /** 条目左侧竖条颜色（唯一强调色） */
  accent?: string;
};

export default function TitleDemoteToLabel({ title = "第二步 · 拆解需求", items = ["把一句话需求拆成 3～5 个可验证的小目标", "每个小目标写清\"做完长什么样\"", "先做最不确定的那一个"], itemBg = ["#E8F0FF", "#E6F7F2", "#FFF4DC", "#FFE9F0"], accent = "#0066cc" }: Props) {
  const t = useCurrentFrame() / FPS;

  // 时间表：demoteAt = startAt + reveal + stand；growAt = demoteAt + growDelay；exitAt = growAt + (n-1)·stagger + holdEnd
  const demoteAt = CONFIG.startAt + CONFIG.reveal + CONFIG.stand;
  const growAt = demoteAt + CONFIG.growDelay;
  const exitAt = growAt + (items.length - 1) * CONFIG.stagger + CONFIG.holdEnd;
  const exitK = 1 - tw(t, exitAt, CONFIG.exitDur, power2In);

  // 显影 → 降格（位置、缩放、居中修正量同一条曲线）
  const rv = tw(t, CONFIG.startAt, CONFIG.reveal, power3Out);
  const d = tw(t, demoteAt, CONFIG.demote, power2InOut);
  const s = lerp(1, CONFIG.endScale, d);

  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="tdl-ttl" style={{ left: lerp(CONFIG.from.x, CONFIG.to.x, d), top: lerp(CONFIG.from.y, CONFIG.to.y, d), transform: `translate(${-(1 - d) * 50}%, -50%) scale(${s})`, opacity: rv * exitK, filter: `blur(${lerp(12, 0, rv)}px)` }}>{title}</div>
      <div className="tdl-content">
        {items.map((it, i) => {
          const p = tw(t, growAt + i * CONFIG.stagger, CONFIG.growDur, power3Out);   // 内容块错峰生长：clip 展开 + 上移 + 淡入
          return (
            <div key={i} className="tdl-blk" style={{ opacity: p * exitK, transform: `translateY(${lerp(CONFIG.rise, 0, p)}px)`, clipPath: `inset(0 ${lerp(CONFIG.clipFrom, 0, p)}% 0 0)` }}>
              <i style={{ background: accent }} /><span style={{ background: itemBg[i % itemBg.length] }}>{it}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
