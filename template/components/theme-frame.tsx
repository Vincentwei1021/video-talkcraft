import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_MONO, prog} from './lib';

/**
 * 视频容器边框八式（theme-frame.tsx）—— design-language §1.3 的代码正主（2026-09-07 用户定版）。
 *
 * 镜头里的视频（录屏 / 单条 B-roll / 引用片段）不裸贴满幅、也不装假播放器（进度条 / 播放键 / 时间码一律不要——不是真播放器就是在撒谎），
 * 而是包一层"有出处的框"：每式都是一个可识别的物——复古浏览器窗口 / 杂志相框 / 35mm 胶片 / 拍立得 / 工程图纸 / 笔记本 / 邮票齿边 / 双发丝线。
 * 任何卡的视频区都能包一层：
 *   const box = frameBox('laptop', W, H);
 *   <div style={{position:'absolute', left: X - box.x, top: Y - box.y}}>           // 宿主定位 + 宿主自己的入场 / 退场 / 极缓推
 *     <ThemeFrame kind="laptop" width={W} height={H} at={enterFrame}><OffthreadVideo src=… style={{width:'100%',height:'100%',objectFit:'cover'}} /></ThemeFrame>
 *   </div>
 *
 * 分工：本组件只管**框的造型 + 框自己的装饰接力**（描线 / 淡入 / 展开，起笔后 ≤1.35s 全部画完静置）；
 *       整体的入场 / 退场 / 整框极缓推由宿主卡或镜头层（G1 相机 / 让位）负责——框跟着视频区一起动，不自己动。
 * 尺寸：width / height 是**视频区**尺寸，框在其外围长出；frameBox(kind, w, h) 给整体尺寸与视频区偏移。
 * 纪律：一片一式（design-language §0.4，选式写进 SHOTBOOK 蒙皮行）；框里画面零处理；装饰文字是装饰不是信息（可换可空）；
 *       静图不进框（框说"这是录像"，画面不动一眼假）；全部由 frame 驱动、零随机，seek-safe。
 */
export type FrameKind = 'browser-retro' | 'magazine' | 'film' | 'polaroid' | 'blueprint' | 'laptop' | 'stamp' | 'hairline';
export const FRAME_KINDS: FrameKind[] = ['browser-retro', 'magazine', 'film', 'polaroid', 'blueprint', 'laptop', 'stamp', 'hairline'];

/** 框在视频区四周长出的厚度（px）：整体 = 视频区 + 四边 */
const PAD: Record<FrameKind, {l: number; r: number; t: number; b: number}> = {
  'browser-retro': {l: 8, r: 8, t: 62, b: 24},   // 标题栏 22 + 导航栏 30 + 视频区上下各 8 白边 / 底部状态条 16
  magazine: {l: 0, r: 0, t: 32, b: 28},          // 上：图注 + 通栏细线；下：页码 + 短线
  film: {l: 48, r: 48, t: 54, b: 62},            // 上下齿孔带 + 片号行
  polaroid: {l: 24, r: 24, t: 24, b: 96},        // 厚底边
  blueprint: {l: 40, r: 40, t: 40, b: 40},       // 外线外扩 14 + 四角十字 + 顶部尺寸线 + 底部小字
  laptop: {l: 36, r: 36, t: 22, b: 46},          // 屏框 16 + 底座外扩 20；屏框上 22 / 下 16 + 底座 30
  stamp: {l: 28, r: 28, t: 28, b: 28},           // 白边 22 + 齿孔外扩 6
  hairline: {l: 14, r: 14, t: 14, b: 14},        // 外圈淡线外扩 14
};
/** 整体尺寸与视频区在整体里的偏移——宿主用它定位（把视频区放到设计坐标上时，整体 left = X − x, top = Y − y） */
export const frameBox = (kind: FrameKind, width: number, height: number) => {
  const p = PAD[kind];
  return {w: width + p.l + p.r, h: height + p.t + p.b, x: p.l, y: p.t};
};
/** 每式的装饰文字默认值 [label, sub]——是装饰不是信息，进片可换可空 */
export const FRAME_LABELS: Record<FrameKind, [string, string]> = {
  'browser-retro': ['Untitled', 'http://'],
  magazine: ['FIG. 01  —  SCREEN RECORDING', '024'],
  film: ['24', 'KODAK 400'],
  blueprint: ['768', 'SCALE 1 : 1 · FIG A'],
  polaroid: ['', ''], laptop: ['', ''], stamp: ['', ''], hairline: ['', ''],
};
/** 舞台底色建议：邮票的白边要靠极浅灰显形，其余白底；胶片 / 邮票的齿孔就是这个色 */
export const frameStageBg = (kind: FrameKind) => (kind === 'stamp' ? '#f0f0f2' : '#ffffff');
/** 视频区圆角（跟框走） */
const RADIUS: Record<FrameKind, number> = {'browser-retro': 0, magazine: 0, film: 3, polaroid: 0, blueprint: 0, laptop: 6, stamp: 0, hairline: 12};

const out3 = (x: number) => 1 - Math.pow(1 - x, 3);       // GSAP power2.out
const out4 = (x: number) => 1 - Math.pow(1 - x, 4);       // GSAP power3.out
const inOut3 = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);   // GSAP power2.inOut（机器一笔画）
const linear = (x: number) => x;
const dash = (p: number) => ({pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - p});
const bevel: React.CSSProperties = {position: 'absolute', background: '#dcdcdc', border: '1px solid #222', boxShadow: 'inset 1px 1px 0 #fff, inset -1px -1px 0 #888', boxSizing: 'border-box'};

export type ThemeFrameProps = {
  kind: FrameKind;
  /** 视频区尺寸（px） */
  width: number;
  height: number;
  /** 装饰接力起点（帧）；不传 = 已画完静置。宿主一般传"视频区落位开始的那一帧 + 0.5s" */
  at?: number;
  /** 装饰线 / 装饰字的墨色（进片换 theme ink；深底片换亮 hairline） */
  ink?: string;
  /** 舞台底色（胶片 / 邮票齿孔用），默认 frameStageBg(kind) */
  stageBg?: string;
  label?: string;
  sub?: string;
  /** 宿主定位样式（position / left / top 等），加在整体外层 */
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export const ThemeFrame: React.FC<ThemeFrameProps> = ({kind, width: w, height: h, at, ink = '#1d1d1f', stageBg, label, sub, style, children}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = PAD[kind];
  const box = frameBox(kind, w, h);
  const bg = stageBg ?? frameStageBg(kind);
  const L = label ?? FRAME_LABELS[kind][0];
  const S = sub ?? FRAME_LABELS[kind][1];
  // 装饰接力进度：offSec / durSec 相对 at（秒）；at 未传 = 1（静置）
  const d = (offSec: number, durSec: number, ease: (x: number) => number) => (at === undefined ? 1 : ease(prog(f, at + offSec * fps, Math.max(1, durSec * fps))));
  const content = (
    <div style={{position: 'absolute', left: p.l, top: p.t, width: w, height: h, overflow: 'hidden', background: '#111', borderRadius: RADIUS[kind]}}>
      {children}
    </div>
  );

  let chrome: React.ReactNode = null;
  switch (kind) {
    // I · 复古浏览器（Mac OS 9 铂金窗口）：条纹标题栏 + 三只方钮、斜面导航钮 + 白地址栏、状态条 + 右下拖拽纹；无装饰动作
    case 'browser-retro':
      chrome = (
        <div style={{position: 'absolute', inset: 0, background: '#dcdcdc', boxShadow: 'inset 1px 1px 0 #fff, inset -1px -1px 0 #7a7a7a, 0 0 0 1px #000, 0 14px 40px rgba(0,0,0,.25)', fontFamily: 'Charcoal, "Lucida Grande", Geneva, sans-serif'}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 22, background: 'repeating-linear-gradient(180deg,#ececec 0 1px,#c9c9c9 1px 2px)', borderBottom: '1px solid #000'}}>
            <div style={{...bevel, left: 6, top: 4, width: 12, height: 12}} />
            <div style={{...bevel, right: 24, top: 4, width: 12, height: 12}} />
            <div style={{...bevel, right: 6, top: 4, width: 12, height: 12}} />
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000'}}>
              {L && <span style={{background: '#dcdcdc', padding: '0 8px'}}>{L}</span>}
            </div>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 23, height: 30, borderBottom: '1px solid #8a8a8a', display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', boxSizing: 'border-box'}}>
            <span style={{...bevel, position: 'relative', display: 'inline-block', width: 22, height: 18}} />
            <span style={{...bevel, position: 'relative', display: 'inline-block', width: 22, height: 18}} />
            <div style={{flex: 1, height: 18, background: '#fff', border: '1px solid #555', boxShadow: 'inset 1px 1px 0 #999', fontSize: 11, lineHeight: '16px', padding: '0 6px', color: '#777', boxSizing: 'border-box'}}>{S}</div>
          </div>
          <div style={{position: 'absolute', left: p.l - 1, top: p.t - 1, width: w + 2, height: h + 2, border: '1px solid #555', boxShadow: 'inset 1px 1px 0 #333', boxSizing: 'border-box'}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 16, borderTop: '1px solid #8a8a8a'}}>
            <div style={{position: 'absolute', right: 3, bottom: 3, width: 11, height: 11, background: 'repeating-linear-gradient(135deg,#777 0 1px,transparent 1px 3px)'}} />
          </div>
        </div>
      );
      break;
    // J · 杂志相框：通栏细线 scaleX 0.4s → 图注 / 页码淡入 → 左下短线；纸面留白当边框，没有描边
    case 'magazine': {
      const rule = d(0, 0.4, out4), cap = d(0.15, 0.3, linear), rule2 = d(0.2, 0.3, out4);
      chrome = (
        <>
          <div style={{position: 'absolute', left: 0, top: 0, fontSize: 11, letterSpacing: 2.5, color: ink, opacity: cap, whiteSpace: 'pre'}}>{L}</div>
          <div style={{position: 'absolute', left: 0, width: w, top: 20, height: 1, background: ink, transform: `scaleX(${rule})`, transformOrigin: 'left'}} />
          <div style={{position: 'absolute', right: 0, bottom: 0, fontFamily: 'Georgia, "Songti SC", serif', fontSize: 12, letterSpacing: 1, color: ink, opacity: cap}}>{S}</div>
          <div style={{position: 'absolute', left: 0, bottom: 6, width: 36, height: 1, background: ink, transform: `scaleX(${rule2})`, transformOrigin: 'left'}} />
        </>
      );
      break;
    }
    // K · 35mm 胶片：深色胶片带 + 上下齿孔（孔 = 舞台底色）+ 琥珀色片号；无装饰动作（浅底上唯一的深 tile）
    case 'film': {
      const holes = Array.from({length: Math.ceil((box.w - 15) / 48)}, (_, i) => 15 + i * 48).filter((x) => x + 18 <= box.w);
      chrome = (
        <div style={{position: 'absolute', inset: 0, background: '#141414'}}>
          {[10, box.h - 36].map((top) => (
            <div key={top} style={{position: 'absolute', left: 0, right: 0, top, height: 26}}>
              {holes.map((x) => <span key={x} style={{position: 'absolute', left: x, top: 0, width: 18, height: 26, borderRadius: 3, background: bg}} />)}
            </div>
          ))}
          <div style={{position: 'absolute', left: p.l + 2, top: p.t + h + 6, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, color: '#e0a030'}}>{L}</div>
          <div style={{position: 'absolute', right: p.r + 2, top: p.t + h + 6, fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, color: '#e0a030'}}>{S}</div>
        </div>
      );
      break;
    }
    // L · 拍立得：白卡厚底边 + 软投影，整体固定倾斜 −1.5°（在内层，不与宿主 transform 打架）；无装饰动作
    case 'polaroid':
      chrome = <div style={{position: 'absolute', inset: 0, background: '#fff', boxShadow: '0 0 0 1px #e5e5ea, 0 18px 50px rgba(0,0,0,.22)'}} />;
      break;
    // M · 工程图纸：内外双线 + 四角十字 + 顶部尺寸线 + 96px 刻度 + 等宽小字；外线机器一笔画 → 十字 → 尺寸线 → 刻度 → 小字，错峰接力
    case 'blueprint': {
      const x0 = p.l, y0 = p.t, x1 = p.l + w, y1 = p.t + h;             // 视频区
      const ox0 = x0 - 14, oy0 = y0 - 14, ox1 = x1 + 14, oy1 = y1 + 14;  // 外线
      const outer = d(0, 0.6, inOut3), dim = d(0.65, 0.4, inOut3), ticks = d(0.85, 0.3, linear), lbl = d(1.05, 0.3, linear);
      const crosses = [[ox0, oy0], [ox1, oy0], [ox1, oy1], [ox0, oy1]].map(([cx, cy]) => `M ${cx} ${cy - 12} V ${cy + 12} M ${cx - 12} ${cy} H ${cx + 12}`);
      const tickXs: number[] = []; for (let x = x0 + 96; x < x1; x += 96) tickXs.push(x);
      const ticksD = tickXs.map((x) => `M ${x} ${oy0} V ${oy0 + 6}`).join(' ');
      chrome = (
        <>
          <div style={{position: 'absolute', left: x0, top: y0, width: w, height: h, boxShadow: `0 0 0 1px ${ink}`}} />
          <svg viewBox={`0 0 ${box.w} ${box.h}`} style={{position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, overflow: 'visible', fill: 'none', stroke: ink, strokeWidth: 1}}>
            <rect x={ox0} y={oy0} width={ox1 - ox0} height={oy1 - oy0} {...dash(outer)} />
            {crosses.map((dd, i) => <path key={i} d={dd} {...dash(d(0.45 + i * 0.06, 0.25, out3))} />)}
            <path d={`M ${x0} 10 H ${x1} M ${x0} 6 V 14 M ${x1} 6 V 14`} {...dash(dim)} />
            {ticksD && <path d={ticksD} {...dash(ticks)} />}
            <text x={(x0 + x1) / 2} y={7} fontFamily={FONT_MONO} fontSize={9} textAnchor="middle" fill={ink} stroke="none" opacity={lbl}>{L}</text>
            <text x={ox0} y={box.h - 4} fontFamily={FONT_MONO} fontSize={9} letterSpacing={1} fill={ink} stroke="none" opacity={lbl}>{S}</text>
          </svg>
        </>
      );
      break;
    }
    // N · 笔记本设备框：深色屏框圆角 18 + 摄像头点 + 更宽的机身底座带中央缺口；无装饰动作
    case 'laptop':
      chrome = (
        <>
          <div style={{position: 'absolute', left: 20, right: 20, top: 0, height: h + 38, background: '#1c1c1e', borderRadius: 18, boxShadow: '0 0 0 1px #3a3a3c, 0 16px 50px rgba(0,0,0,.28)'}}>
            <div style={{position: 'absolute', left: '50%', top: 9, width: 6, height: 6, marginLeft: -3, borderRadius: 3, background: '#050505', boxShadow: 'inset 0 0 0 1px #2c2c2e'}} />
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 8, height: 22, background: 'linear-gradient(180deg,#3a3a3c,#2a2a2c)', borderRadius: '0 0 14px 14px', boxShadow: '0 6px 20px rgba(0,0,0,.25)'}}>
            <div style={{position: 'absolute', left: '50%', top: 0, width: 120, height: 8, marginLeft: -60, background: '#1c1c1e', borderRadius: '0 0 8px 8px'}} />
          </div>
        </>
      );
      break;
    // O · 邮票齿边：白色厚边 22 + 四边半圆齿孔（孔 = 舞台底色，舞台用极浅灰）；无装饰动作
    case 'stamp': {
      const dot = `radial-gradient(circle, ${bg} 5px, transparent 5.5px)`;
      chrome = (
        <div style={{position: 'absolute', inset: 6, background: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,.14)'}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: -6, height: 12, background: `${dot} 6px 0 / 24px 12px repeat-x`}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: -6, height: 12, background: `${dot} 6px 0 / 24px 12px repeat-x`}} />
          <div style={{position: 'absolute', top: 0, bottom: 0, left: -6, width: 12, background: `${dot} 0 6px / 12px 24px repeat-y`}} />
          <div style={{position: 'absolute', top: 0, bottom: 0, right: -6, width: 12, background: `${dot} 0 6px / 12px 24px repeat-y`}} />
        </div>
      );
      break;
    }
    // B · 双发丝线 + 四角短标：视频区圆角 12 + 发丝线，外扩 14 一圈淡线淡入，四角短标依次描出
    case 'hairline': {
      const W = box.w, H = box.h;
      const ticks = [`M 0 30 V 24 Q 0 0 24 0 H 30`, `M ${W - 30} 0 H ${W - 24} Q ${W} 0 ${W} 24 V 30`, `M ${W} ${H - 30} V ${H - 24} Q ${W} ${H} ${W - 24} ${H} H ${W - 30}`, `M 30 ${H} H 24 Q 0 ${H} 0 ${H - 24} V ${H - 30}`];
      chrome = (
        <>
          <div style={{position: 'absolute', left: p.l, top: p.t, width: w, height: h, borderRadius: 12, boxShadow: '0 0 0 1px #d2d2d7'}} />
          <div style={{position: 'absolute', inset: 0, borderRadius: 24, boxShadow: '0 0 0 1px #e3e3e8', opacity: d(0, 0.3, linear)}} />
          <svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'visible', fill: 'none', stroke: ink, strokeWidth: 2, strokeLinecap: 'round'}}>
            {ticks.map((dd, i) => <path key={i} d={dd} {...dash(d(0.15 + i * 0.06, 0.25, out3))} />)}
          </svg>
        </>
      );
      break;
    }
  }

  return (
    <div style={{position: 'relative', width: box.w, height: box.h, ...style}}>
      <div style={{position: 'absolute', inset: 0, transform: kind === 'polaroid' ? 'rotate(-1.5deg)' : undefined, transformOrigin: '50% 50%'}}>
        {chrome}
        {content}
      </div>
    </div>
  );
};

export default ThemeFrame;
