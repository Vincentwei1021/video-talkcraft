import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// slow-push-in · 缓推特写 —— 自包含 Remotion 源码（与 demos/slow-push-in/index.html 同画面）
// 复制本文件进你的工程即可用。静态页面上的一条推镜曲线，推向兴趣点、且永不停死。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 186 };

const FPS = meta.fps;

// —— 动效本体（可整段摘走）：静态页面上的一条推镜曲线，推向兴趣点、且永不停死 ——
const CONFIG = {
  zoomFrom: 1.0,     // 起始缩放（1 = 素材原样满画幅）
  zoomTo: 1.10,      // 主推终点：1.08~1.15，超过 1.2 截图开始发虚
  pushDur: 4.2,      // 主推时长（demo 秒；实拍取 8~15s，与本段口播等长）
  holdDur: 1.6,      // hold 期时长（讲述停在这一页上的那几秒）
  endRate: 0.6,      // 主推末速 / 平均速的比：1=全程匀速，0.6=极缓减速"到位"感；<0.35 像撒手
  driftX: -13,       // 焦点微移：主推期间横向漂移 px（负=画面往左让，兴趣点往右侧居中）
  driftY: -7,        // 纵向漂移 px
};

// 兴趣点（#poi 引文块）中心：demo 运行时读 DOM 反推，移植按同版式实测定值
const ORIGIN = { x: 316, y: 424.87 };

/* 时间表（demo 秒）
   0.00–4.20  主推：scale 1→1.10、drift (0,0)→(−13,−7)（camEase(0.6)）
   4.20–5.80  hold：匀速续推 scale→1.1229、drift→(−15.97,−8.60)（linear） */

// —— 缓动与 tween helper ——
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
// 运镜专用 ease（本库通用）：匀速 + 一点前载减速。
// 起速 = 平均速（接得上前一段匀速），末速 = r × 平均速（**非零** ⇒ hold 期能无缝续走）。
// 这是"缓推不能用 power2"的技术答案：power2.out 末速为 0，镜头会停死。
const camEase = (r: number) => (p: number) => p + (1 - r) * p * p * (1 - p);

// —— 演示语境（不属于动效）：一张灰阶线框「文章页截图」，满画幅铺满舞台 ——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
.camera {                     /* 相机层：全卡唯一被 transform 的元素 */
  position: absolute;
  inset: 0;
  will-change: transform;
}
.page { position: absolute; inset: 0; background: #ffffff; color: #1d1d1f; }

.nav {
  height: 46px;
  display: flex; align-items: center; gap: 22px;
  padding: 0 40px;
  border-bottom: 1px solid #e0e0e0;
}
.nav .logo { width: 74px; height: 13px; border-radius: 3px; background: #1d1d1f; }
.nav .links { display: flex; gap: 18px; margin-left: 10px; }
.nav .links i { width: 40px; height: 8px; border-radius: 2px; background: #e0e0e0; }
.nav .links i.on { background: #8a8a8a; }
.nav .btn { margin-left: auto; width: 66px; height: 22px; border-radius: 11px; border: 1px solid #d2d2d7; }

.wrap { padding: 22px 40px 0; }
.kicker { font-size: 11px; letter-spacing: 3px; color: #8a8a8a; margin-bottom: 9px; }
.page h1 { font-size: 27px; font-weight: 700; line-height: 1.32; letter-spacing: -0.5px; }
.byline { font-size: 11.5px; color: #8a8a8a; margin: 9px 0 16px; }
.byline em { font-style: normal; color: #1d1d1f; }

.cols { display: flex; gap: 30px; }
.main { width: 552px; }
.side { flex: 1; }

/* 插图：微型灰阶柱图——给缓推提供"越推越清"的细节 */
.figure {
  height: 116px;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  display: flex; align-items: flex-end; gap: 13px;
  padding: 0 18px 14px;
}
.figure b { width: 34px; border-radius: 2px 2px 0 0; background: #ececef; }
.figure b.hi { background: #8a8a8a; }
.cap { font-size: 10.5px; color: #8a8a8a; margin: 7px 0 14px; }

.bar { height: 7px; border-radius: 2px; background: #e3e3e6; margin: 8px 0; }
.bar.lt { background: #ececef; }
.w96 { width: 96%; } .w88 { width: 88%; } .w80 { width: 80%; }
.w72 { width: 72%; } .w58 { width: 58%; } .w44 { width: 44%; }

/* 兴趣点：引文块——相机推进的落点 */
.quote {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 3px solid #1d1d1f;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.62;
}
.quote span { font-size: 10.5px; font-weight: 400; color: #8a8a8a; display: block; margin-top: 6px; }

.side .s-title { font-size: 11px; letter-spacing: 2px; color: #8a8a8a; margin-bottom: 12px; }
.s-item { display: flex; gap: 10px; margin-bottom: 14px; }
.s-item .thumb { width: 58px; height: 40px; flex: 0 0 auto; border-radius: 4px; background: #ececef; }
.s-item .lines { flex: 1; padding-top: 3px; }
.s-item .lines i { display: block; height: 6px; border-radius: 2px; background: #e3e3e6; margin-bottom: 6px; }
.s-item .lines i.short { width: 56%; background: #ececef; }
.side .stat { border-top: 1px solid #e0e0e0; padding-top: 12px; display: flex; gap: 18px; }
.side .stat div b { display: block; font-size: 19px; font-weight: 700; }
.side .stat div span { font-size: 10px; color: #8a8a8a; }
`;

export default function SlowPushIn(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;

  // hold 期沿用主推的末速继续推（速度连续 ⇒ 看不出"段落切换"）
  const rate = ((CONFIG.zoomTo - CONFIG.zoomFrom) / CONFIG.pushDur) * CONFIG.endRate;
  const holdZoom = CONFIG.zoomTo + rate * CONFIG.holdDur;
  const kd = 1 + (holdZoom - CONFIG.zoomTo) / (CONFIG.zoomTo - CONFIG.zoomFrom); // 漂移同比延长

  let scale: number, x: number, y: number;
  if (t < CONFIG.pushDur) {
    // 主推：极缓减速推进 + 焦点微移
    const p = camEase(CONFIG.endRate)(clamp01(t / CONFIG.pushDur));
    scale = lerp(CONFIG.zoomFrom, CONFIG.zoomTo, p);
    x = lerp(0, CONFIG.driftX, p);
    y = lerp(0, CONFIG.driftY, p);
  } else {
    // hold 期：匀速续推，绝不停在某一帧上
    const p = clamp01((t - CONFIG.pushDur) / CONFIG.holdDur);
    scale = lerp(CONFIG.zoomTo, holdZoom, p);
    x = lerp(CONFIG.driftX, CONFIG.driftX * kd, p);
    y = lerp(CONFIG.driftY, CONFIG.driftY * kd, p);
  }

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="camera" style={{
        transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
      }}>
        <div className="page">
          <div className="nav">
            <div className="logo" />
            <div className="links"><i className="on" /><i /><i /><i /></div>
            <div className="btn" />
          </div>

          <div className="wrap">
            <div className="kicker">深度报道 · 模型能力</div>
            <h1>推理时算力，正在重写模型能力的分水岭</h1>
            <div className="byline">本刊记者 <em>林越</em> · 2026 年 8 月 12 日 · 全文约 6800 字</div>

            <div className="cols">
              <div className="main">
                <div className="figure">
                  <b style={{ height: 38 }} /><b style={{ height: 52 }} /><b style={{ height: 47 }} />
                  <b style={{ height: 69 }} /><b style={{ height: 61 }} /><b className="hi" style={{ height: 88 }} />
                </div>
                <div className="cap">图 1　三代模型在同一推理基准上的得分（灰=基线，深=本代）</div>

                <div className="bar w96" /><div className="bar lt w88" /><div className="bar w80" />
                <div className="bar lt w72" />

                <div className="quote" id="poi">
                  同等参数规模下，把算力从训练挪到推理，正确率提升接近三倍。
                  <span>—— 摘自实验组第三次复现记录</span>
                </div>

                <div className="bar w88" /><div className="bar lt w96" /><div className="bar w58" />
                <div className="bar lt w80" /><div className="bar w44" />
              </div>

              <div className="side">
                <div className="s-title">相关阅读</div>
                <div className="s-item"><div className="thumb" /><div className="lines"><i /><i /><i className="short" /></div></div>
                <div className="s-item"><div className="thumb" /><div className="lines"><i /><i /><i className="short" /></div></div>
                <div className="s-item"><div className="thumb" /><div className="lines"><i /><i /><i className="short" /></div></div>
                <div className="stat">
                  <div><b>3.1×</b><span>推理正确率</span></div>
                  <div><b>-42%</b><span>单次成本</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
