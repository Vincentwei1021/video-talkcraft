import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// stage-keyframe-tour · 长页兴趣点巡游 —— 自包含 Remotion 源码（与 demos/stage-keyframe-tour/index.html 同画面）
// 复制本文件进你的工程即可用。长页躺在影棚平面上，相机沿关键帧路径在兴趣点间巡游。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 275 };

const FPS = meta.fps;

// ===== 可摘走的核心：CONFIG（舞台姿态 + 关键帧路径）+ bez + apply =====
// 三条决策构成"讲到哪儿镜头停到哪儿"，缺一条就退化成"长图在滑动"：
//  ① 兴趣点即原点：每帧把目标点算成像素、设为 transform-origin 并把它平移到画面正中
//     ⇒ zoom 与 roll 都**绕当前兴趣点**发生，而不是绕 2200px 长页的几何中心
//  ② 重复同一姿态即为 hold：路径表里连着写两个相同姿态，中间那段就是"停下来讲"
//  ③ 段间缓动 cubic-bezier(0.16,1,0.3,1)：起步快、末段长距离减速 ⇒ 读作"相机找到了目标"
const CONFIG = {
  // 舞台基础姿态（长页躺在影棚平面上）
  rotX: 14,          // 俯角：长页必须有俯角才读作"躺着"，纯 rotateY 读作"立着的墙"
  rotY: -20,         // 右侧后仰
  scale: 0.86,       // 基础缩放（与 zoom 相乘）
  shake: 0,          // 手持抖动：demo 设 0；0.08~0.2 是"摄影师手持"档（见卡片）
  entry: 0.80,       // 入场沉降时长
  // 关键帧路径：d = 段时长（s），px/py = 兴趣点归一化坐标，zoom = 该点焦距，roll = 机身倾角
  // 第一行是入场落点；相邻两行 px/py/zoom 相同 ⇒ 那一段就是 hold
  moves: [
    { d: 0,    px: 0.50, py: 0.115, zoom: 0.66, roll: 0    },  // 落点：全貌（故意露出舞台地面与页顶边）
    { d: 0.90, px: 0.50, py: 0.115, zoom: 0.66, roll: 0    },  // hold：等入场沉降落定
    { d: 1.05, px: 0.50, py: 0.150, zoom: 1.34, roll: 0    },  // ① Hero 主张 + 主按钮
    { d: 0.85, px: 0.50, py: 0.150, zoom: 1.34, roll: 0    },  // hold ①
    { d: 1.20, px: 0.50, py: 0.545, zoom: 1.42, roll: -0.7 }, // ② 三个大数字（带一点机身倾角）
    { d: 0.90, px: 0.50, py: 0.545, zoom: 1.42, roll: -0.7 }, // hold ②
    { d: 1.25, px: 0.50, py: 0.845, zoom: 1.38, roll: 0.6 },  // ③ 价格卡
    { d: 0.90, px: 0.50, py: 0.845, zoom: 1.38, roll: 0.6 },  // hold ③
    { d: 1.40, px: 0.50, py: 0.60, zoom: 0.60, roll: 0    },  // 离开：拉开给全貌
  ],
  tail: 0.30,
};

/* 时间表（demo 秒）：入场沉降 0–0.8（power2.out）；关键帧段依次
   [0–0.9 hold] [0.9–1.95 →①] [1.95–2.8 hold] [2.8–4.0 →②] [4.0–4.9 hold]
   [4.9–6.15 →③] [6.15–7.05 hold] [7.05–8.45 拉开] + tail 0.3 ⇒ 结束 8.75 */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);

// cubic-bezier 求值（比拿 expo.out 近似更准）
function bez(x1: number, y1: number, x2: number, y2: number) {
  const cx = (t: number, a: number, b: number) =>
    ((1 - t) * 3 * a + t * 3 * b) * (1 - t) * t + t * t * t;
  return (x: number) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 22; i++) {           // 二分求 t 使 cx(t) ≈ x，22 次足够到 1e-6
      const v = cx(t, x1, x2);
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return cx(t, y1, y2);
  };
}
const EXPO = bez(0.16, 1, 0.3, 1);          // 段间默认缓动（Apple 那条）

// —— 演示语境（不属于动效）：一张 806×2200 的灰阶线框长落地页 ——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
/* 3D 舞台：perspective 900px（长页纵深跨度大，需要更明显的透视收缩来读出"躺着"） */
.world {
  position: absolute;
  inset: 0;
  perspective: 900px;
  perspective-origin: 50% 42%;
}
/* 相机层：全卡唯一被 transform 的元素。
   ⚠️ 这里**故意不写** will-change: transform —— 相机层持续分数缩放时，
   强制合成层会让 1px 边框在锐利/模糊之间脉动。提层只提文字容器（见 .sec）。 */
.camera {
  position: absolute;
  transform-style: preserve-3d;
}

/* 地面反光：跟着"舞台地面"而不是相机——它是影棚的一部分，相机飞它不动 */
.floor-glow {
  position: absolute;
  left: 24%; top: 71%;
  width: 52%; height: 26%;
  background: linear-gradient(to bottom, rgba(29, 29, 31, 0.055), rgba(29, 29, 31, 0.018) 35%, transparent 76%);
  clip-path: polygon(7% 0, 93% 0, 78% 100%, 22% 100%);   /* 上宽下窄＝地面往远处收 */
  filter: blur(26px);
  transform-origin: center top;
}
/* 接触阴影：长页压在地面上的那道暗——扁椭圆，是"贴地"唯一的证据 */
.contact {
  position: absolute;
  left: 16%; top: 70%;
  width: 68%; height: 11%;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.30);
  filter: blur(38px);
}

.page {
  position: absolute;
  inset: 0;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 13px;          /* = 画面宽 960 的 1.4% */
  overflow: hidden;
  color: #1d1d1f;
  backface-visibility: hidden;  /* 倾斜时边缘不发灰 */
}
/* 文字容器提层：分数缩放时字形被反复重采样会发抖，提层让每段缩放内的栅格稳定 */
.sec { will-change: transform; }

.nav {
  height: 58px;
  display: flex; align-items: center; gap: 22px;
  padding: 0 34px;
  border-bottom: 1px solid #ececef;
}
.nav .logo { width: 22px; height: 22px; border-radius: 7px; background: #1d1d1f; }
.nav .wm { width: 64px; height: 10px; border-radius: 2px; background: #1d1d1f; }
.nav .links { display: flex; gap: 18px; margin-left: 10px; }
.nav .links i { width: 44px; height: 8px; border-radius: 2px; background: #dededf; }
.nav .cta { margin-left: auto; width: 88px; height: 30px; border-radius: 15px; background: #1d1d1f; }

.hero { height: 610px; padding: 62px 56px 0; }
.hero .tag {
  display: inline-block; font-size: 11px; letter-spacing: 3px; color: #8a8a8a;
  border: 1px solid #e0e0e0; border-radius: 999px; padding: 6px 14px;
}
.hero h1 { font-size: 52px; line-height: 1.16; font-weight: 700; letter-spacing: -1.6px; margin-top: 26px; width: 620px; }
.hero p { font-size: 17px; line-height: 1.75; color: #8a8a8a; margin-top: 22px; width: 470px; }
.hero .btns { display: flex; gap: 14px; margin-top: 38px; }
.hero .btns .b1 { width: 152px; height: 46px; border-radius: 10px; background: #1d1d1f; }
.hero .btns .b2 { width: 128px; height: 46px; border-radius: 10px; border: 1px solid #d2d2d7; }
/* 主图占位：窗口套窗口的抽象截图，底边被 hero 裁掉一半＝"往下还有" */
.hero .shot {
  margin-top: 52px; height: 300px;
  border: 1px solid #e0e0e0; border-radius: 12px; background: #fbfbfc;
  padding: 14px; display: flex; flex-direction: column; gap: 12px;
}
.hero .shot .tb { display: flex; gap: 7px; }
.hero .shot .tb i { width: 9px; height: 9px; border-radius: 50%; background: #e0e0e0; }
.hero .shot .in { flex: 1; display: flex; gap: 12px; }
.hero .shot .in .lft { width: 132px; border-radius: 7px; background: #f1f1f3; }
.hero .shot .in .rgt { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.hero .shot .in .rgt .blk { flex: 1; border-radius: 7px; background: #f1f1f3; }
.hero .shot .in .rgt .row { display: flex; gap: 10px; height: 62px; }
.hero .shot .in .rgt .row div { flex: 1; border-radius: 6px; background: #ececef; }

.logos { height: 118px; display: flex; align-items: center; justify-content: center; gap: 46px; border-top: 1px solid #f2f2f4; border-bottom: 1px solid #f2f2f4; }
.logos i { width: 74px; height: 20px; border-radius: 4px; background: #e6e6e8; }

.feats { height: 302px; display: flex; gap: 20px; padding: 46px 56px; }
.feat { flex: 1; border: 1px solid #ececef; border-radius: 12px; padding: 24px 24px 0; }
.feat .ico { width: 34px; height: 34px; border-radius: 9px; background: #ececef; margin-bottom: 20px; }
.feat b { display: block; font-size: 19px; font-weight: 600; margin-bottom: 15px; }
.feat i { display: block; height: 8px; border-radius: 2px; background: #ececef; margin-bottom: 8px; }
.feat i.s { width: 58%; }

/* 兴趣点 ②：三个大数字 */
.metrics { height: 220px; display: flex; align-items: center; padding: 0 56px; gap: 26px; background: #fafafb; }
.met { flex: 1; }
.met b { display: block; font-size: 46px; font-weight: 700; letter-spacing: -1.6px; }
.met span { display: block; font-size: 14px; color: #8a8a8a; margin-top: 9px; }

.wide { height: 380px; padding: 44px 56px; }
.wide .frame { height: 100%; border: 1px solid #e0e0e0; border-radius: 12px; background: #fbfbfc; display: flex; }
.wide .frame .side { width: 156px; border-right: 1px solid #ececef; padding: 20px 16px; }
.wide .frame .side i { display: block; height: 9px; border-radius: 2px; background: #e8e8ea; margin-bottom: 14px; }
.wide .frame .body { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.wide .frame .body .bar { display: flex; align-items: flex-end; gap: 12px; flex: 1; }
.wide .frame .body .bar u { flex: 1; border-radius: 4px 4px 0 0; background: #e8e8ea; }
.wide .frame .body .cap { height: 9px; width: 40%; border-radius: 2px; background: #ececef; }

/* 兴趣点 ③：三张价格卡，中间那张是"被推荐的" */
.pricing { height: 348px; display: flex; gap: 20px; padding: 40px 56px; background: #fafafb; }
.pcard { flex: 1; border: 1px solid #e6e6e8; border-radius: 13px; background: #fff; padding: 26px 24px 0; }
.pcard.hot { border: 1px solid #1d1d1f; }
.pcard em { display: block; font-size: 12px; letter-spacing: 2px; color: #8a8a8a; font-style: normal; }
.pcard b { display: block; font-size: 38px; font-weight: 700; letter-spacing: -1.2px; margin: 14px 0 4px; }
.pcard span { font-size: 13px; color: #8a8a8a; }
.pcard i { display: block; height: 8px; border-radius: 2px; background: #ececef; margin-top: 14px; }
.pcard i.s { width: 62%; }
.pcard .go { height: 40px; border-radius: 9px; background: #f1f1f3; margin-top: 22px; }
.pcard.hot .go { background: #1d1d1f; }

.foot { height: 164px; display: flex; align-items: center; gap: 40px; padding: 0 56px; border-top: 1px solid #ececef; }
.foot .col { display: flex; flex-direction: column; gap: 11px; }
.foot .col i { width: 62px; height: 8px; border-radius: 2px; background: #ececef; }
.foot .col i:first-child { background: #d6d6d8; width: 42px; }
`;

export default function StageKeyframeTour(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const W = 960, H = 540;

  // 平面几何：长页按画面宽的 84% 定宽，高度按内容比例展开（本 demo 806×2200）
  const planeW = Math.round(W * 0.84);
  const planeH = 2200;
  const left = (W - planeW) / 2;
  const top = (H - planeH) / 2;              // 负值——长页上下都出画

  // 入场沉降：settle 0→1（power2.out）
  const settle = power2Out(clamp01(t / C.entry));

  // 相机段：逐个关键帧插值；相同姿态的段天然成为 hold
  let px = C.moves[0].px, py = C.moves[0].py, zoom = C.moves[0].zoom, roll = C.moves[0].roll;
  let at = 0;
  for (let i = 1; i < C.moves.length; i++) {
    const k = C.moves[i], prev = C.moves[i - 1];
    if (t >= at) {
      const p = EXPO(clamp01((t - at) / k.d));
      px = prev.px + (k.px - prev.px) * p;
      py = prev.py + (k.py - prev.py) * p;
      zoom = prev.zoom + (k.zoom - prev.zoom) * p;
      roll = prev.roll + (k.roll - prev.roll) * p;
    }
    at += k.d;
  }

  // 入场沉降姿态：scale×0.94 / rotateX+8° / rotateY−5° / y+64px → 到位
  const s = settle;
  const sc = C.scale * (0.94 + 0.06 * s);
  const rx = C.rotX + 8 * (1 - s);
  const ry = C.rotY - 5 * (1 - s);
  const ey = 64 * (1 - s);
  // ① 兴趣点寻址：目标点设为 transform-origin，再把它平移到画面正中
  const ox = px * planeW, oy = py * planeH;

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="floor-glow" style={{
        opacity: 0.9 * s,
        transform: `perspective(650px) rotateX(58deg) translateY(${ey * 0.28}px)`,
      }} />
      <div className="contact" style={{
        opacity: s,
        transform: `translateY(${ey * 0.35}px)`,
      }} />

      <div className="world" style={{ opacity: Math.min(1, s * 3.3) }}>
        <div className="camera" style={{
          left, top, width: planeW, height: planeH,
          transformOrigin: `${ox}px ${oy}px`,
          transform: `translate(${W / 2 - (left + ox)}px, ${H / 2 - (top + oy) + ey}px) ` +
                     `rotate(${-roll}deg) rotateY(${ry}deg) rotateX(${rx}deg) scale(${sc * zoom})`,
        }}>
          <div className="page" style={{ height: planeH }}>
            <div className="nav sec">
              <div className="logo" /><div className="wm" />
              <div className="links"><i /><i /><i /><i /></div>
              <div className="cta" />
            </div>

            <div className="hero sec">
              <span className="tag">全新版本 2.0</span>
              <h1>把你的调研，变成一条能播的片子</h1>
              <p>从口播稿到成片，时间戳对齐、镜头分层、动效选型全部自动接管，导出即可发布。</p>
              <div className="btns"><div className="b1" /><div className="b2" /></div>
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

            <div className="logos"><i /><i /><i /><i /><i /><i /></div>

            <div className="feats sec">
              <div className="feat"><div className="ico" /><b>字级时间戳</b><i /><i /><i className="s" /></div>
              <div className="feat"><div className="ico" /><b>镜头分层</b><i /><i /><i className="s" /></div>
              <div className="feat"><div className="ico" /><b>动效配方卡</b><i /><i /><i className="s" /></div>
            </div>

            <div className="metrics sec">
              <div className="met"><b>41</b><span>张动效配方卡</span></div>
              <div className="met"><b>6.4×</b><span>成片速度提升</span></div>
              <div className="met"><b>98%</b><span>时间戳对齐准确率</span></div>
            </div>

            <div className="wide sec">
              <div className="frame">
                <div className="side"><i /><i /><i /><i /><i /></div>
                <div className="body">
                  <div className="bar"><u style={{ height: "44%" }} /><u style={{ height: "71%" }} /><u style={{ height: "36%" }} /><u style={{ height: "88%" }} /><u style={{ height: "59%" }} /><u style={{ height: "76%" }} /><u style={{ height: "48%" }} /></div>
                  <div className="cap" />
                </div>
              </div>
            </div>

            <div className="pricing sec">
              <div className="pcard"><em>个人</em><b>¥ 59</b><span>／月</span><i /><i /><i className="s" /><div className="go" /></div>
              <div className="pcard hot"><em>专业</em><b>¥ 199</b><span>／月</span><i /><i /><i className="s" /><div className="go" /></div>
              <div className="pcard"><em>团队</em><b>¥ 699</b><span>／月</span><i /><i /><i className="s" /><div className="go" /></div>
            </div>

            <div className="foot sec">
              <div className="col"><i /><i /><i /></div>
              <div className="col"><i /><i /><i /></div>
              <div className="col"><i /><i /><i /></div>
              <div className="col"><i /><i /><i /></div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
