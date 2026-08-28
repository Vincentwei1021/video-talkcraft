import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// cursor-locked-zoom · 光标锁定跟拍 —— 自包含 Remotion 源码（与 demos/cursor-locked-zoom/index.html 同画面）
// 复制本文件进你的工程即可用。镜头锁在打字光标上，命令从右侧"喂"进来，打完拉回全景。
export const meta = { width: 960, height: 540, fps: 30, durationInFrames: 192 };

const FPS = meta.fps;

// ===== 可摘走的核心：CONFIG + apply()（一条反解公式 + 一道边界钳制就是全部） =====
// 三条决策构成"镜头锁在光标上"，缺一条就退化成"放大的终端在播打字"：
//  ① 镜头被打字驱动，不是独立关键帧：cursorX = 文本起点 + 已揭示字符数 × 字宽，
//     tx = W/2 − zoom·cursorX ⇒ 光标恒在画面正中，命令从右侧"喂"进来
//  ② transform-origin: 0 0 —— 反解式子成立的前提
//  ③ 打完 0.8s inOut 把 zoom 拉回 1 收在全景居中：先看细节再给全貌，不收尾等于没讲完
const CONFIG = {
  cmd: "ffmpeg -i raw.mov -vf scale=1080:-2 -crf 18 out.mp4",
  zoom: 2.65,        // 跟拍焦距：2.6~2.8。<2 起不到"小屏也看得清"的作用；>3.2 字重被放大到发虚
  rate: 15,          // 打字速率 char/s（人在敲命令，比日志输出慢一个量级）
  leadIn: 0.45,      // 起手静置：镜头先锁在行首等口播开口
  holdEnd: 0.75,     // 打完停留：让人读完整条命令（此时光标开始闪）
  pullDur: 0.80,     // 拉回全景时长：0.8s inOut——两端都要收，这是"结束"不是"运镜"
  tail: 0.60,
  fontSize: 20,      // 与 CSS .body 的 font-size 必须一致（字宽由它算）
  charW: 0.6,        // 等宽字体字宽系数：fontSize × 0.6（Menlo / SFMono 实测值）
  lineH: 32,         // 与 CSS .line 的 height 一致
  cmdRow: 2,         // 被跟拍的命令在第几行（0 起算）——上面两行是已有的会话记录
  cursorHz: 2,       // 停下后光标闪烁频率
  // 终端窗在世界坐标里的位置与内边距（既用来推算锚点，也当相机的可视边界）
  winL: 100, winT: 78, winW: 760, winH: 384, pad: 20, chromeH: 40, prGap: 8,
};

/* 时间表（demo 秒）
   0.00–0.45  起手静置：镜头锁在行首（zoom 2.65）
   0.45–3.85  打字段：51 字符 ÷ 15 char/s（linear），镜头每帧由 revealed 反解
   3.85–4.60  打完停留：画面静止，光标 2Hz 闪
   4.60–5.40  拉回全景：zoom 2.65→1（power2.inOut），位移由钳制自动跟出
   5.40–6.00  tail：全景静置，光标继续闪 */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const power2InOut = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2);

// —— 演示语境（不属于动效）：一扇灰阶终端窗 760×384 ——
const CSS = `
/* 与 demo 外壳一致的全局 reset（demo-shell.css）：不带它 UA 缺省 margin/content-box 会让版式整体走样 */
* { margin: 0; padding: 0; box-sizing: border-box; }
/* 相机层：铺满舞台的世界坐标层，是全卡唯一被 transform 的元素。
   transform-origin: 0 0 —— 反解公式 tx = W/2 − zoom·cursorX 的前提就是原点在左上角 */
.camera {
  position: absolute;
  left: 0; top: 0;
  width: 960px; height: 540px;
  transform-origin: 0 0;
}

.term {
  position: absolute;
  left: 100px; top: 78px;
  width: 760px; height: 384px;
  border-radius: 12px;
  overflow: hidden;
  background: #17171a;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.18);
}
.chrome {
  height: 40px;
  flex: 0 0 40px;
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px;
  background: #212126;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
/* 三交通灯：灰阶（这张卡没有语义色，颜色全留给素材本身） */
.chrome i { width: 11px; height: 11px; border-radius: 50%; background: #4b4b55; }
.chrome .path {
  flex: 1; text-align: center;
  font-size: 13px; color: #8b8b95; letter-spacing: 0.2px;
  margin-right: 41px;    /* 三灯占宽，抵掉才是真居中 */
}

/* 内容区：等宽字体是硬前提——光标 x 靠"字符数 × 字宽"算出来 */
.body {
  flex: 1;
  padding: 20px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 20px;
}
.line {
  height: 32px;          /* 行高固定：光标 y 靠"行序 × 行高"算出来 */
  display: flex; align-items: center;
  white-space: pre;
  color: #f2f2f4;
}
.line.old { color: #6f6f78; }              /* 上文（已有的会话记录），压暗不抢戏 */
.line.out { color: #9b9ba3; }
.line .pr { color: #6f6f78; }
.line .gap { width: 8px; flex: 0 0 8px; }  /* 提示符与命令之间的固定间隙 */
/* 竖条光标：跟拍的锚点。打字时实心不闪，停下后才 2Hz 闪 */
.line .cur {
  display: inline-block;
  width: 2px;
  height: 24px;
  margin-left: 1px;
  background: #f2f2f4;
}
`;

export default function CursorLockedZoom(_props: { hostSrc?: string }) {
  const t = useCurrentFrame() / FPS;
  const C = CONFIG;
  const W = 960, H = 540;
  const N = C.cmd.length;

  // —— 几何：光标锚点的世界坐标 ——
  const charW = C.fontSize * C.charW;
  // 文本起点 = 窗左 + 内边距 + 提示符宽（1 字符）+ 间隙
  const textX = C.winL + C.pad + charW + C.prGap;
  // 锚点 y = 窗顶 + 窗栏 + 内边距 + 行序 × 行高 + 半行高
  const cursorY = C.winT + C.chromeH + C.pad + C.cmdRow * C.lineH + C.lineH / 2;
  // 相机可视边界：素材（终端窗）的四边
  const bx0 = C.winL, bx1 = C.winL + C.winW;
  const by0 = C.winT, by1 = C.winT + C.winH;

  // —— 时间轴：打字 → 停留 → 拉回全景 → tail ——
  const tType0 = C.leadIn;
  const tType1 = C.leadIn + N / C.rate;
  const tPull0 = tType1 + C.holdEnd;
  const tPull1 = tPull0 + C.pullDur;

  // 打字段：线性揭示（人敲键盘是匀速的；加缓动会读作"机器在渐快渐慢"）
  const revealed = lerp(0, N, clamp01((t - tType0) / (N / C.rate)));
  const n = Math.floor(revealed);
  // 收尾：只 tween zoom → 1。位移与重新构图由钳制自动跟出来
  const z = t < tPull0 ? C.zoom
    : lerp(C.zoom, 1, power2InOut(clamp01((t - tPull0) / C.pullDur)));

  // ① 反解：相机中心＝光标锚点 ⇒ 光标恒在画面正中
  let cx = textX + n * charW;
  let cy = cursorY;
  // ② 边界钳制：把可视世界矩形关在素材四边之内。素材比可视区还小时退化为居中
  const hw = W / (2 * z), hh = H / (2 * z);
  cx = bx1 - bx0 > 2 * hw ? Math.min(Math.max(cx, bx0 + hw), bx1 - hw) : (bx0 + bx1) / 2;
  cy = by1 - by0 > 2 * hh ? Math.min(Math.max(cy, by0 + hh), by1 - hh) : (by0 + by1) / 2;

  // 光标：打字中实心不闪；打完才 2Hz 闪（收尾段唯一还在动的东西）
  const curOpacity = revealed < N ? 1 : (Math.floor(t * C.cursorHz) % 2 === 0 ? 1 : 0);

  return (
    <AbsoluteFill style={{
      background: "#ffffff", color: "#1d1d1f", overflow: "hidden",
      fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    }}>
      <style>{CSS}</style>
      <div className="camera" style={{
        transform: `translate(${W / 2 - z * cx}px, ${H / 2 - z * cy}px) scale(${z})`,
      }}>
        <div className="term">
          <div className="chrome">
            <i /><i /><i />
            <span className="path">~/code/koubo-demo</span>
          </div>
          <div className="body">
            <div className="line old"><span className="pr">$</span><span className="gap" />ls shots/</div>
            <div className="line out">raw.mov   logo.png   notes.md</div>
            <div className="line">
              <span className="pr">$</span><span className="gap" /><span className="txt">{C.cmd.slice(0, n)}</span><span className="cur" style={{ opacity: curOpacity }} />
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
