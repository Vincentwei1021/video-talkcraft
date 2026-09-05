import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";

// doc-park-left-pill-deal · 文档驻留发牌 —— 自包含 Remotion 源码（与 demos/doc-park-left-pill-deal/index.html 同画面）
// 文档先满幅在场，然后不淡出而是以左边缘为锚驻留（translateX −55% + scale .92，只露约 35%），右侧按旁白节奏慢发牌三张药丸，
// 每张落定后其下说明行逐词加深并留住；文档全程极慢自动滚动"正在被读"。
// 复制本文件进你的工程即可用；文案经 props 注入（docTitle / pills / notes），真文档截图经 docSrc 注入（不传 = 灰条 mock）。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 222 };   // 7.0s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 驻留不是淡出——以左边缘为锚 translateX −55% + scale .92，"来源还在"；② 驻留窗必须在首张药丸之前收住；
//      ③ 药丸透明度窗（0.2s）短于位移窗（0.37s back.out）——先实后稳；④ 说明行落定后留住（用户定版），发牌间隔 = 一句旁白。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  parkAt: 0.9,        // 驻留起点 s（先满幅读 0.9s）
  parkDur: 0.8,       // 驻留时长 s（power2.inOut）
  parkX: -514,        // 驻留位移 px：文档 700 宽 × .92 后只露约 35%（右缘到 x≈260）
  parkScale: 0.92,    // 驻留缩放（transform-origin 0% 50%，以左边缘为锚）
  T0: [1.9, 3.2, 4.5],// 三张药丸落定起点 s：间隔 1.3 ≈ 一句短旁白（成片按口播念到每条结论的时刻摆）
  pillIn: 0.2,        // 药丸透明度窗 s（快，先实）
  pillLand: 0.37,     // 药丸位移窗 s（慢、back.out(1.7) 过冲，再稳）；y 14→0、scale .94→1
  noteDelay: 0.3,     // 说明行相对药丸起点的滞后 s（药丸落定后才起字）
  noteShare: 0.7,     // 说明行逐词加深占该句可见时长的比例（末 30% 静置阅读）
  scrollRate: -18.75, // 文档内容常驻自动滚动速率 px/s（≈0.6px/f："正在被读"的暗示级速度）
  exitAt: 6.6,        // 文档 + 药丸 + 说明同收起点 s
  exitDur: 0.4,       // 同收时长 s（power2.in）
};

/* 时间表（demo 秒）
   0.00–7.00  文档内容以 −18.75 px/s 匀速上滚（时长 = 镜头时长）
   0.90–1.70  驻留：x 0→−514、scale 1→.92（power2.inOut，锚左缘）；1.40 提示行淡入
   1.90 / 3.20 / 4.50  药丸：0.2s 淡入（power2.out）+ 0.37s y 14→0 / scale .94→1（back.out(1.7)）；+0.30 说明行逐词加深并留住
   6.60–7.00  文档 + 提示 + 药丸 + 说明同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const linear = (x: number) => x;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power2In = (x: number) => x * x * x;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);
const backOut = (s = 1.70158) => (x: number) => { const t = x - 1; return 1 + (s + 1) * t * t * t + s * t * t; };

// 说明行按词切分（中文以标点粗切，再每 ≤4 字一段，读作"逐词"）——与 demo 同规则
const splitWords = (s: string) => (s.match(/[^，。、；！？]+[，。、；！？]?/g) ?? [s]).flatMap((seg) => seg.match(/.{1,4}/g) ?? [seg]);

// —— 演示语境（不属于动效）：样式照搬 demo（类名 dpk- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.dpk-doc { position: absolute; left: 130px; top: 60px; width: 700px; height: 420px; background: #fff; border: 1px solid #e0e0e0; border-radius: 14px; overflow: hidden; transform-origin: 0% 50%; box-shadow: 0 12px 40px rgba(0,0,0,.08); will-change: transform; }
.dpk-doc .in { position: absolute; left: 0; top: 0; width: 100%; padding: 34px 40px; will-change: transform; }
.dpk-doc h5 { font-size: 26px; font-weight: 700; color: #1d1d1f; margin-bottom: 16px; }
.dpk-doc p { display: block; height: 12px; border-radius: 6px; background: #ececf0; margin-bottom: 14px; }
.dpk-doc p.h { background: #dcdce2; height: 16px; width: 60%; margin-top: 22px; }
.dpk-hint { position: absolute; left: 380px; top: 78px; font-size: 16px; color: #7a7a7a; letter-spacing: 1px; }
.dpk-pills { position: absolute; left: 380px; top: 130px; width: 500px; }
.dpk-pill { position: absolute; left: 0; height: 52px; padding: 0 22px; border-radius: 26px; background: #fff; border: 1.5px solid #d6d6dc; font-size: 22px; font-weight: 600; color: #1d1d1f; line-height: 50px; white-space: nowrap; will-change: transform; }
.dpk-pill i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #0066cc; margin-right: 12px; vertical-align: 2px; }
.dpk-ex { position: absolute; left: 4px; font-size: 18px; color: #7a7a7a; white-space: nowrap; }
.dpk-ex span { display: inline-block; margin-right: 2px; }
`;

// 文档 mock 的灰条宽度（演示语境）
const MOCK_ROWS: (number | "h")[] = [92, 84, 88, "h", 90, 76, 86, "h", 82, 90, 70, "h", 88, 80];

type Props = {
  /** 文档标题（mock 文档顶部；传 docSrc 时不显示） */
  docTitle?: string;
  /** 三条结论（药丸文案，按口播顺序） */
  pills?: string[];
  /** 每条结论下的一行说明（与 pills 同序） */
  notes?: string[];
  /** 提示行 */
  hint?: string;
  /** 真文档长截图（cover 铺进文档卡，随内容一起慢滚）；不传 = 灰条 mock */
  docSrc?: string;
  /** 药丸圆点颜色（唯一强调色） */
  accent?: string;
};

export default function DocParkLeftPillDeal({
  docTitle = "2026 中国短视频创作者调研报告",
  pills = ["开头 3 秒决定 70% 完播", "每周 2 更比日更留存高", "字幕素排的完播率最高"],
  notes = ["数据来自 1.2 万条样本，知识区更明显", "日更的三个月流失率反而高 12%", "花字越多，观众越看不进你在说什么"],
  hint = "读完 60 页，我记下三条",
  docSrc,
  accent = "#0066cc",
}: Props) {
  const t = useCurrentFrame() / FPS;
  const end = CONFIG.exitAt + CONFIG.exitDur;
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.exitDur, power2In);

  // 文档：常驻慢滚 + 驻留
  const scrollY = CONFIG.scrollRate * Math.min(t, end);
  const park = tw(t, CONFIG.parkAt, CONFIG.parkDur, power2InOut);
  const docX = lerp(0, CONFIG.parkX, park), docS = lerp(1, CONFIG.parkScale, park);
  const hintK = tw(t, CONFIG.parkAt + 0.5, 0.4, power1Out);

  return (
    <AbsoluteFill style={{ background: "#f5f5f7", color: "#1d1d1f", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      {/* 文档（以左边缘为锚驻留） */}
      <div className="dpk-doc" style={{ opacity: exitK, transform: `translateX(${docX}px) scale(${docS})` }}>
        {docSrc ? (
          <div style={{ position: "absolute", left: 0, top: 0, width: "100%", transform: `translateY(${scrollY}px)` }}>
            <Img src={docSrc} style={{ display: "block", width: "100%" }} />
          </div>
        ) : (
          <div className="in" style={{ transform: `translateY(${scrollY}px)` }}>
            <h5>{docTitle}</h5>
            {MOCK_ROWS.map((w, i) => (w === "h" ? <p key={i} className="h" /> : <p key={i} style={{ width: `${w}%` }} />))}
          </div>
        )}
      </div>
      <div className="dpk-hint" style={{ opacity: hintK * exitK }}>{hint}</div>
      {/* 慢发牌：每张先实后稳，落定后说明行逐词加深并留住 */}
      <div className="dpk-pills">
        {pills.map((p, k) => {
          const t0 = CONFIG.T0[k] ?? CONFIG.T0[CONFIG.T0.length - 1] + 1.3 * (k - CONFIG.T0.length + 1);
          const ce = (CONFIG.T0[k + 1] ?? CONFIG.exitAt - 0.4) - 0.1;
          const inA = tw(t, t0, CONFIG.pillIn, power2Out), land = backOut(1.7)(clamp01((t - t0) / CONFIG.pillLand));
          const ws = splitWords(notes[k] ?? "");
          const noteAt = t0 + CONFIG.noteDelay, st = ((ce - t0 - CONFIG.noteDelay) * CONFIG.noteShare) / Math.max(1, ws.length);
          const exK = tw(t, noteAt, 0.1, power1Out);
          return (
            <React.Fragment key={k}>
              <div className="dpk-pill" style={{ top: k * 100, opacity: inA * exitK, transform: `translateY(${lerp(14, 0, land)}px) scale(${lerp(0.94, 1, land)})` }}>
                <i style={{ background: accent }} />{p}
              </div>
              <div className="dpk-ex" style={{ top: k * 100 + 60, opacity: exK * exitK }}>
                {ws.map((w, j) => <span key={j} style={{ opacity: lerp(0.3, 1, tw(t, noteAt + j * st, 0.12, linear)) }}>{w}</span>)}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
