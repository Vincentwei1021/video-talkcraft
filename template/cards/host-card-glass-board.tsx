import React from "react";
import { AbsoluteFill, Loop, OffthreadVideo, useCurrentFrame } from "remotion";

// host-card-glass-board · 人物竖卡玻璃台 —— 自包含 Remotion 源码（与 demos/host-card-glass-board/index.html 同画面）
// 左 1/3 口播人物装 9:16 竖卡常驻，右 2/3 一块带透视的玻璃道具台：先立标题，再按口播节奏接力摆道具（三步 tile → 连接线 → 结果胶囊）。
// "人一直在、板上换道具"：同一块板能连讲几个道具而不换镜。复制本文件进你的工程即可用；人物经 hostSrc 注入（alpha 视频），不传 = 灰阶剪影兜底。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 210 };   // 6.6s 镜头 + 0.4s 收尾

const FPS = meta.fps;

// ——————————————————————————————————————————————————————————
// 可摘走的核心参数（与 demo 的 CONFIG 同名同注释）
// 命门：① 人物竖卡先立住、全程在场；② 玻璃板以左缘为轴 −18° → −10° 显影，sheen 只扫一次之后不再动；
//      ③ 板上道具按口播接力（tile pop → 连接线长出 → 下一个 tile），一拍一主角、同一种入场；④ 全部落定后真静止，字与画同收。
// ——————————————————————————————————————————————————————————
const CONFIG = {
  rotFrom: -18,        // 玻璃板起始角（°）
  rot: -10,            // 玻璃板落定角（−8~−12：更斜板上文字变形不可读）
  boardAt: 0.2,        // 板显影起点 s（0.7s power3.out）
  boardIn: 0.7,
  hostAt: 0.3,         // 人物竖卡从左滑入（x −40→0，0.5s power3.out）
  hostIn: 0.5,
  sheenAt: 0.6,        // sheen 扫过一次（0.9s power1.inOut，x 0→900）
  sheenDur: 0.9,
  titleAt: 0.9,        // 期数小字；标题逐字 +0.1 起、stagger 0.06；英文行 +0.55
  charDur: 0.45,
  charStagger: 0.06,
  tileAt: [1.6, 2.5, 3.4],   // 三步 tile pop 时刻（按口播讲到每一步的词锚）
  tilePop: 0.5,        // back.out(1.6)：opacity 0→1、scale .8→1
  connDelay: 0.45,     // tile 落定后连接线才长（0.35s power2.out）
  connDur: 0.35,
  resultAt: 4.1,       // 结果胶囊落定（0.45s power3.out，y 8→0）
  exitAt: 6.1,         // 板、人、装饰同收（0.5s power2.in）
  exit: 0.5,
  end: 6.6,            // 镜头结束
};

/* 时间表（demo 秒）
   0.00–0.80  地面水印词淡入
   0.20–0.90  玻璃板 rotateY −18→−10 + opacity 0→1（power3.out）
   0.30–0.80  人物竖卡 x −40→0 + opacity 0→1（power3.out）
   0.60–1.50  sheen x 0→900 扫过一次（power1.inOut）
   0.90–1.30  期数小字；1.00 起标题 5 字逐字解糊（blur 8→0、y 8→0，stagger 0.06，各 0.45s）；1.45 英文行
   1.60 / 2.50 / 3.40  三步 tile pop（0.5s back.out(1.6)）；2.05 / 2.95 连接线 scaleX 0→1（0.35s），箭头在线到位前 0.1s 亮
   4.10–4.55  结果胶囊落定
   6.10–6.60  板、人、装饰同收（power2.in） */

// —— 缓动与 tween helper（对照 GSAP 名字）——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) => ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power1Out = (x: number) => 1 - Math.pow(1 - x, 2);
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power3Out = (x: number) => 1 - Math.pow(1 - x, 4);
const power2In = (x: number) => x * x * x;
const backOut = (s = 1.70158) => (x: number) => { const u = x - 1; return 1 + (s + 1) * u * u * u + s * u * u; };

// —— 演示语境与风格档皮：样式照搬 demo（类名加 hcg- 前缀）——
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
.hcg-bgtex { position: absolute; inset: 0;
  background: radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.05), transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(120,140,255,.06), transparent 50%),
    repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 1px, transparent 1px 28px); }
.hcg-floor { position: absolute; font-family: "Courier New", monospace; font-size: 22px; letter-spacing: 6px; color: rgba(255,255,255,.09); font-style: italic; }
.hcg-hostcard { position: absolute; left: 64px; top: 48px; width: 250px; height: 444px; border-radius: 22px; overflow: hidden;
  border: 2px solid rgba(255,255,255,.42); box-shadow: 0 20px 60px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.08);
  background: linear-gradient(180deg, #3a2a58 0%, #1d2140 55%, #12131a 100%); }
.hcg-hostcard::before { content: ""; position: absolute; left: 20px; right: 20px; top: 40px; height: 160px; border-radius: 50%; background: radial-gradient(ellipse, rgba(214,120,255,.35), transparent 70%); }
.hcg-persp { position: absolute; inset: 0; perspective: 1400px; perspective-origin: 30% 50%; }
.hcg-board { position: absolute; left: 340px; top: 58px; width: 570px; height: 408px; border-radius: 18px; overflow: hidden;
  background: linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.03) 45%, rgba(255,255,255,.07));
  border: 1.5px solid rgba(255,255,255,.3); box-shadow: 0 30px 80px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.25); }
.hcg-sheen { position: absolute; top: -40%; bottom: -40%; left: -220px; width: 160px; background: linear-gradient(100deg, transparent, rgba(255,255,255,.14), transparent); }
.hcg-yr { position: absolute; left: 0; right: 0; top: 18px; text-align: center; font-family: "Courier New", monospace; font-size: 13px; letter-spacing: 4px; color: rgba(255,255,255,.55); }
.hcg-bt { position: absolute; left: 0; right: 0; top: 42px; text-align: center; font-size: 46px; font-weight: 800; color: #fff; letter-spacing: 6px; text-shadow: 0 2px 18px rgba(255,255,255,.18); }
.hcg-bt span { display: inline-block; }
.hcg-be { position: absolute; left: 0; right: 0; top: 106px; text-align: center; font-family: "Courier New", monospace; font-size: 12px; letter-spacing: 5px; color: rgba(255,255,255,.62); }
.hcg-tiles { position: absolute; top: 170px; height: 130px; }
.hcg-tile { position: absolute; top: 0; width: 140px; height: 130px; border-radius: 14px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.3);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 10px 30px rgba(0,0,0,.35); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
.hcg-tile .hcg-ic { width: 44px; height: 44px; border-radius: 50%; background: #8ab4ff; color: #12131a; font-size: 22px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.hcg-tile .hcg-tl { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 2px; }
.hcg-tile .hcg-ts { font-family: "Courier New", monospace; font-size: 9px; letter-spacing: 2px; color: rgba(255,255,255,.6); }
.hcg-conn { position: absolute; top: 63px; width: 41px; height: 4px; }
.hcg-conn i { position: absolute; left: 0; top: 1px; width: 100%; height: 2px; background: #8ab4ff; transform-origin: 0 50%; box-shadow: 0 0 8px rgba(138,180,255,.8); }
.hcg-conn b { position: absolute; right: -2px; top: -4px; width: 12px; height: 12px; border-top: 2px solid #8ab4ff; border-right: 2px solid #8ab4ff; transform: rotate(45deg); }
.hcg-result { position: absolute; left: 50%; top: 328px; padding: 8px 22px; border-radius: 999px; background: rgba(138,180,255,.16); border: 1px solid rgba(138,180,255,.6);
  color: #cfe0ff; font-size: 17px; font-weight: 700; letter-spacing: 1px; white-space: nowrap; }
.hcg-glyph { position: absolute; font-family: "Courier New", monospace; font-size: 26px; color: rgba(255,255,255,.35); }
`;

const TILE_W = 140, CONN_W = 41, BOARD_W = 570;

/** 人物（演示语境素材）：hostSrc 传 alpha 视频，站竖卡底部、略大于卡（半身特写，卡即取景框）；不传 = 灰阶剪影兜底 */
const Host: React.FC<{ src?: string }> = ({ src }) =>
  src ? (
    <Loop durationInFrames={13 * FPS}>
      <OffthreadVideo src={src} muted transparent style={{ position: "absolute", bottom: "-6%", left: "50%", transform: "translateX(-50%)", height: "106%" }} />
    </Loop>
  ) : (
    <div style={{ position: "absolute", left: "-25%", right: "-25%", bottom: 0, height: "100%",
      background: "radial-gradient(ellipse 46% 26% at 50% 13%, rgba(227,227,230,.9) 60%, transparent 61%), radial-gradient(ellipse 50% 62% at 50% 84%, rgba(236,236,239,.9) 60%, transparent 61%)" }} />
  );

type Step = { icon: string; label: string; sub: string };

type Props = {
  /** 口播人物 alpha 视频（必需输入；不传 = 灰阶剪影兜底） */
  hostSrc?: string;
  /** 板头期数小字 */
  tag?: string;
  /** 大标题（逐字解糊） */
  title?: string;
  /** 英文字距行 */
  en?: string;
  /** 三步道具（2~4 步；每步 图标字符 / 标签 / 副标） */
  steps?: Step[];
  /** 结果胶囊文案 */
  result?: string;
};

const DEFAULT_STEPS: Step[] = [
  { icon: "✎", label: "文稿", sub: "SCRIPT · 13 句" },
  { icon: "◉", label: "配音", sub: "VOICE · 95 s" },
  { icon: "▶", label: "成片", sub: "RENDER · 1080p" },
];

export default function HostCardGlassBoard({ hostSrc, tag = "TALKCRAFT · 第 12 期", title = "口播工作流", en = "SCRIPT → VOICE → RENDER", steps = DEFAULT_STEPS, result = "一遍过 · 3 分 20 秒" }: Props) {
  const t = useCurrentFrame() / FPS;
  const n = Math.max(2, Math.min(steps.length, 4));
  const shown = steps.slice(0, n);
  const tilesW = n * TILE_W + (n - 1) * CONN_W;
  const tilesLeft = (BOARD_W - tilesW) / 2;
  const tileAt = (i: number) => CONFIG.tileAt[i] ?? CONFIG.tileAt[CONFIG.tileAt.length - 1] + (i - CONFIG.tileAt.length + 1) * 0.9;

  // 板与人：显影 / 滑入；同收
  const boardP = tw(t, CONFIG.boardAt, CONFIG.boardIn, power3Out);
  const hostP = tw(t, CONFIG.hostAt, CONFIG.hostIn, power3Out);
  const exitK = 1 - tw(t, CONFIG.exitAt, CONFIG.exit, power2In);
  const floorP = tw(t, 0, 0.8, power1Out);
  const sheenX = lerp(0, 900, tw(t, CONFIG.sheenAt, CONFIG.sheenDur, power1InOut));
  const glyphP = tw(t, 0.9, 0.4, power1Out);
  const yrP = tw(t, CONFIG.titleAt, 0.4, power1Out);
  const beP = tw(t, CONFIG.titleAt + 0.55, 0.4, power1Out);
  const resultP = tw(t, CONFIG.resultAt, 0.45, power3Out);

  return (
    <AbsoluteFill style={{ background: "#12131a", color: "#f5f5f7", overflow: "hidden", fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' }}>
      <style>{CSS}</style>
      <div className="hcg-bgtex" />
      {/* 地面淡水印词（装饰，随板人同收） */}
      {[["COPY", 330], ["19", 600], ["IDEA", 820]].map(([w, x]) => (
        <div key={String(w)} className="hcg-floor" style={{ left: Number(x), top: 498, opacity: floorP * exitK }}>{w}</div>
      ))}
      {/* 人物竖卡 250×444：刻意取景（半身特写），成片人脸安全区在卡内 */}
      <div className="hcg-hostcard" data-crop-ok style={{ opacity: hostP * exitK, transform: `translateX(${lerp(-40, 0, hostP)}px)` }}>
        <Host src={hostSrc} />
      </div>
      {/* 玻璃板：perspective 1400，以左缘为轴 rotateY −18 → −10 */}
      <div className="hcg-persp">
        <div className="hcg-board" style={{ opacity: boardP * exitK, transform: `rotateY(${lerp(CONFIG.rotFrom, CONFIG.rot, boardP)}deg)`, transformOrigin: "0% 50%" }}>
          <div className="hcg-sheen" style={{ transform: `translateX(${sheenX}px) skewX(-18deg)` }} />
          <div className="hcg-yr" style={{ opacity: yrP, transform: `translateY(${lerp(6, 0, yrP)}px)` }}>{tag}</div>
          <div className="hcg-bt">
            {[...title].map((ch, i) => {
              const p = tw(t, CONFIG.titleAt + 0.1 + i * CONFIG.charStagger, CONFIG.charDur, power2Out);
              return <span key={i} style={{ opacity: p, filter: `blur(${lerp(8, 0, p)}px)`, transform: `translateY(${lerp(8, 0, p)}px)` }}>{ch === " " ? " " : ch}</span>;
            })}
          </div>
          <div className="hcg-be" style={{ opacity: beP, transform: `translateY(${lerp(6, 0, beP)}px)` }}>{en}</div>
          {/* 板内道具接力：tile pop → 连接线长出带箭头 → 下一个 tile */}
          <div className="hcg-tiles" style={{ left: tilesLeft, width: tilesW }}>
            {shown.map((s, i) => {
              const p = tw(t, tileAt(i), CONFIG.tilePop, backOut(1.6));
              const connAt = tileAt(i) + CONFIG.connDelay;
              const lineP = tw(t, connAt, CONFIG.connDur, power2Out);
              const arrowP = tw(t, connAt + CONFIG.connDur - 0.1, 0.15, power1Out);
              return (
                <React.Fragment key={i}>
                  <div className="hcg-tile" style={{ left: i * (TILE_W + CONN_W), opacity: clamp01(p), transform: `scale(${lerp(0.8, 1, p)})`, transformOrigin: "50% 50%" }}>
                    <div className="hcg-ic">{s.icon}</div><div className="hcg-tl">{s.label}</div><div className="hcg-ts">{s.sub}</div>
                  </div>
                  {i < n - 1 && (
                    <div className="hcg-conn" style={{ left: i * (TILE_W + CONN_W) + TILE_W }}>
                      <i style={{ transform: `scaleX(${lineP})` }} /><b style={{ opacity: arrowP }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="hcg-result" style={{ opacity: resultP, transform: `translateX(-50%) translateY(${lerp(8, 0, resultP)}px)` }}>{result}</div>
          <div className="hcg-glyph" style={{ left: 16, bottom: 10, opacity: glyphP }}>∿</div>
          <div className="hcg-glyph" style={{ right: 16, bottom: 10, opacity: glyphP }}>∿</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
