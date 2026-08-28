import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// tilt-3d-page · 3D 立面展示 —— 自包含 Remotion 源码（与 demos/tilt-3d-page/index.html 同画面）
// 复制本文件进你的工程即可用。静态页面从正视平面「立起来」成 3D 立面，hold 期保持微透视慢漂。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 162 };

const FPS = meta.fps;

// —— 动效本体（可整段摘走）——
// 命门：① 倾斜量 ≤25°（再多正文就读不了）；② 投影跟着倾斜一起变（否则页面像贴纸不像实体）；
//      ③ 立起后不静止——rotateY 极缓继续走一点点，相机永不静止。
const CONFIG = {
  rotYFrom: 0,       // 起手正视（0° = 平面，让观众先读清页面内容）
  rotYTo: -19,       // 立面角度：12~25°，负值＝右侧后仰（左近右远）
  rotXTo: 4.5,       // 配一点俯角，纯 rotateY 会像"门轴转"而不是"摆在展示墙上"
  scaleTo: 0.94,     // 立起时轻微后退：倾斜后对角线变长，不退会顶到画幅边
  tiltDur: 1.5,      // 立起时长：1.2~1.8s；<0.8s 读作"甩"，>2.5s 拖节奏
  holdDur: 3.0,      // 立面停留（讲述期）
  holdRotY: -22.5,   // hold 期极缓续转到的角度——相机永不静止
  holdRotX: 3.2,     // 同时俯角回一点，两轴不同步＝"活的镜头"而非机械转台
  startHold: 0.5,    // 起手正视静置：先让观众看懂"这是一张什么页"
  shadowFrom: 0.05,  // 正视时投影极淡（页面几乎贴在舞台上）
  shadowTo: 0.19,    // 立起后投影加深＝页面浮起来了
};

/* 时间表（demo 秒）
   0.0–0.5  起手正视静置
   0.5–2.0  立起（power2.out）：rotY 0→−19，rotX 0→4.5，scale 1→0.94；投影 0.05→0.19、(0,0)→(26,15)
   2.0–5.0  hold 慢漂（sine.inOut）：rotY→−22.5，rotX→3.2；投影 →(33,12) */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, ease: (x: number) => number) =>
  ease(clamp01((t - t0) / d));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const sineInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

// —— 演示语境（不属于动效）：灰阶线框「产品落地页」——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
/* 3D 舞台：perspective 装在父容器上（1000px ≈ 一个"正常镜头"的视距） */
.world {
  position: absolute;
  inset: 0;
  perspective: 1000px;
  perspective-origin: 50% 46%;
}
/* 相机层：全卡唯一被 transform 的元素；preserve-3d 让页面与投影层同处一个 3D 空间 */
.camera {
  position: absolute;
  left: 50%; top: 50%;
  width: 792px; height: 452px;
  margin: -226px 0 0 -396px;
  transform-style: preserve-3d;
  will-change: transform;
}
/* 投影层：跟着页面一起倾斜的"落在地上的影子"，倾斜后自然被透视压扁 */
.shadow {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: #000;
  filter: blur(26px);
}

.page {
  position: absolute;
  inset: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  color: #1d1d1f;
  backface-visibility: hidden;      /* 倾斜时避免边缘半透明发灰 */
}
.nav {
  height: 44px;
  display: flex; align-items: center; gap: 20px;
  padding: 0 26px;
  border-bottom: 1px solid #ececef;
}
.nav .logo { width: 20px; height: 20px; border-radius: 6px; background: #1d1d1f; }
.nav .wm { width: 58px; height: 9px; border-radius: 2px; background: #1d1d1f; }
.nav .links { display: flex; gap: 16px; margin-left: 12px; }
.nav .links i { width: 38px; height: 7px; border-radius: 2px; background: #e0e0e0; }
.nav .cta { margin-left: auto; width: 78px; height: 26px; border-radius: 13px; background: #1d1d1f; }

.hero { padding: 24px 46px 10px; display: flex; gap: 34px; align-items: center; }
.hero .copy { width: 348px; }
.hero .tag {
  display: inline-block; font-size: 10px; letter-spacing: 2.5px; color: #8a8a8a;
  border: 1px solid #e0e0e0; border-radius: 999px; padding: 4px 11px; margin-bottom: 13px;
}
.hero h1 { font-size: 28px; line-height: 1.26; font-weight: 700; letter-spacing: -0.8px; }
.hero p { font-size: 12.5px; line-height: 1.72; color: #8a8a8a; margin-top: 10px; }
.hero .btns { display: flex; gap: 10px; margin-top: 15px; }
.hero .btns .b1 { width: 104px; height: 31px; border-radius: 8px; background: #1d1d1f; }
.hero .btns .b2 { width: 88px; height: 31px; border-radius: 8px; border: 1px solid #d2d2d7; }

/* 主图占位：窗口套窗口的抽象产品截图 */
.shot {
  flex: 1; height: 166px;
  border: 1px solid #e0e0e0; border-radius: 9px;
  padding: 9px; display: flex; flex-direction: column; gap: 8px;
}
.shot .tb { display: flex; gap: 5px; }
.shot .tb i { width: 7px; height: 7px; border-radius: 50%; background: #e0e0e0; }
.shot .in { flex: 1; display: flex; gap: 8px; }
.shot .in .lft { width: 46px; border-radius: 5px; background: #f4f4f6; }
.shot .in .rgt { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.shot .in .rgt .blk { flex: 1; border-radius: 5px; background: #f4f4f6; }
.shot .in .rgt .row { display: flex; gap: 6px; height: 34px; }
.shot .in .rgt .row div { flex: 1; border-radius: 4px; background: #ececef; }

.feats { display: flex; gap: 14px; padding: 0 46px; }
.feat { flex: 1; border: 1px solid #ececef; border-radius: 9px; padding: 13px 15px; }
.feat .ico { width: 22px; height: 22px; border-radius: 6px; background: #ececef; margin-bottom: 10px; }
.feat b { display: block; font-size: 13px; font-weight: 600; margin-bottom: 7px; }
.feat i { display: block; height: 6px; border-radius: 2px; background: #ececef; margin-bottom: 5px; }
.feat i.s { width: 62%; }

.price {
  margin: 14px 46px 0; height: 44px;
  border-top: 1px solid #ececef;
  display: flex; align-items: center; gap: 12px;
}
.price b { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
.price span { font-size: 11px; color: #8a8a8a; }
.price .pill { margin-left: auto; width: 96px; height: 28px; border-radius: 999px; border: 1px solid #d2d2d7; }
`;

export default function Tilt3dPage(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const tTilt = C.startHold;             // 0.5
  const tHold = C.startHold + C.tiltDur; // 2.0

  let rotY: number, rotX: number, scale: number, shOp: number, shX: number, shY: number;
  if (t < tHold) {
    // 立起：两轴同时转 + 轻微后退。power2.out 到位（这是一个"摆放"动作，允许收住）
    const p = tw(t, tTilt, C.tiltDur, power2Out);
    rotY = lerp(C.rotYFrom, C.rotYTo, p);
    rotX = lerp(0, C.rotXTo, p);
    scale = lerp(1, C.scaleTo, p);
    // 投影同步变化：加深 + 往倾斜的反侧偏移（光源不动，物体转了 ⇒ 影子必须跟着挪）
    shOp = lerp(C.shadowFrom, C.shadowTo, p);
    shX = lerp(0, 26, p);
    shY = lerp(0, 15, p);
  } else {
    // hold 期：微透视慢漂——两轴极缓续走，投影跟着再挪一点点
    const p = tw(t, tHold, C.holdDur, sineInOut);
    rotY = lerp(C.rotYTo, C.holdRotY, p);
    rotX = lerp(C.rotXTo, C.holdRotX, p);
    scale = C.scaleTo;
    shOp = C.shadowTo;
    shX = lerp(26, 33, p);
    shY = lerp(15, 12, p);
  }

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="world">
        <div className="camera" style={{
          transform: `rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})`,
        }}>
          <div className="shadow" style={{
            opacity: shOp,
            transform: `translate3d(${shX}px, ${shY}px, -34px)`,   /* 沉在页面后方，倾斜时与页面产生位移差＝厚度感 */
          }} />
          <div className="page">
            <div className="nav">
              <div className="logo" /><div className="wm" />
              <div className="links"><i /><i /><i /></div>
              <div className="cta" />
            </div>

            <div className="hero">
              <div className="copy">
                <span className="tag">全新版本 2.0</span>
                <h1>把你的调研，变成一条能播的片子</h1>
                <p>从口播稿到成片，时间戳对齐、镜头分层、动效选型全部自动接管，导出即可发布。</p>
                <div className="btns"><div className="b1" /><div className="b2" /></div>
              </div>
              <div className="shot">
                <div className="tb"><i /><i /><i /></div>
                <div className="in">
                  <div className="lft" />
                  <div className="rgt">
                    <div className="blk" />
                    <div className="row"><div /><div /><div /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="feats">
              <div className="feat"><div className="ico" /><b>字级时间戳</b><i /><i className="s" /></div>
              <div className="feat"><div className="ico" /><b>镜头分层</b><i /><i className="s" /></div>
              <div className="feat"><div className="ico" /><b>动效配方卡</b><i /><i className="s" /></div>
            </div>

            <div className="price">
              <b>¥ 199</b><span>／月　含无限次渲染</span>
              <div className="pill" />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
