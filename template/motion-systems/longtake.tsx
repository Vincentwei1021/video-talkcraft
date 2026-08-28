import React, {createContext, useContext, useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CamImpulse} from './camera';

/**
 * 长镜头（one-take）系统：整段叙事发生在一张"世界画布"上，相机随讲述
 * 从一处运镜到另一处，新内容在镜头到达时才出现——没有 Sequence 切换，
 * 空间连续性本身就是转场。
 *
 * 与 CameraRig 的分工：CameraRig 是"每镜头一条曲线"（多镜头 + 转场承接）；
 * WorldRig 是"全片/全段一条曲线"（内容钉在世界坐标上，相机去找内容）。
 * 两者可以混用：长镜头做一整幕，幕与幕之间仍用 transitions.tsx 的六式衔接。
 *
 * 用法：
 *   const STOPS: WorldStop[] = [
 *     {t: 0,    x: 0,    y: 0,   zoom: 1},      // 开场：原点的标题
 *     {t: 6.2,  x: 1400, y: 120, zoom: 1.1},    // 讲到"数据"→ 相机右移到图表区
 *     {t: 13.8, x: 1400, y: 980, zoom: 0.92},   // 讲到"背后原因"→ 下移 + 微拉远
 *   ];   // t = 字级时间戳锚点（tSay），到点即"到站"
 *
 *   <WorldRig stops={STOPS} impulses={[{t: 6.2, scale: 0.03}]}>
 *     <WorldPlane depth={0.5}>
 *       // 世界网格自己铺一块盖满全部站点的超大 div（如 9000×4000）：
 *       // GridField 等 AbsoluteFill 屏幕空间件放进 0×0 的世界容器会塌为零，不可直用
 *       <div style={{position: 'absolute', left: -2500, top: -1500, width: 9000,
 *                    height: 4000, backgroundImage: '...grid...'}}/>
 *     </WorldPlane>
 *     <WorldPlane depth={1}>
 *       <WorldItem x={0} y={0} w={900}><Title/></WorldItem>
 *       <WorldItem x={1400} y={120} w={800}><Chart/></WorldItem>
 *     </WorldPlane>
 *   </WorldRig>
 *
 * 铁律：
 * - 相邻站点间的运镜速度 ≤ 1.5 屏宽/秒（再快就是 whip，应换 transitions 的甩镜）。
 * - 到站后相机仍有微漂（内置双正弦 drift），元素仍要 Live/idle——长镜头不豁免让位规则。
 * - 内容揭示用 useArrive() 挂在相机接近度上（提前 0.3~0.5 屏开始入场），
 *   不要等相机完全停稳才出现（那是"到站放 PPT"）。
 */

export type WorldStop = {
  /** 绝对/段内秒（与场景使用的时间基一致），到点=相机到站 */
  t: number;
  /** 世界坐标（px）：相机注视点 */
  x: number;
  y: number;
  zoom?: number;
  /** 度。dutch 用小值，保持不回零的规则同 CameraRig */
  rot?: number;
};

export type WorldCam = {
  x: number;
  y: number;
  zoom: number;
  rot: number;
  sec: number;
};

const WorldCtx = createContext<WorldCam>({x: 0, y: 0, zoom: 1, rot: 0, sec: 0});
export const useWorldCam = (): WorldCam => useContext(WorldCtx);

const track = (
  stops: WorldStop[],
  field: 'x' | 'y' | 'zoom' | 'rot',
  fallback: number,
  sec: number,
): number => {
  const pts = stops.filter((s) => s[field] !== undefined);
  if (pts.length === 0) return fallback;
  if (pts.length === 1) return pts[0][field] as number;
  return interpolate(
    sec,
    pts.map((p) => p.t),
    pts.map((p) => p[field] as number),
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.sin),
    },
  );
};

export const WorldRig: React.FC<{
  stops: WorldStop[];
  impulses?: CamImpulse[];
  /** Sequence 提前渲染的帧数（同 CameraRig 的 leadFrames） */
  leadFrames?: number;
  /** 到站后的微漂振幅 px；0 关闭（不建议——静止即 PPT） */
  drift?: number;
  children: React.ReactNode;
}> = ({stops, impulses = [], leadFrames = 0, drift = 5, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sec = (frame - leadFrames) / fps;

  const cam = useMemo<WorldCam>(() => {
    // 双不可通约频率正弦：相机在任何"到站"时刻都不完全静止
    let x = track(stops, 'x', 0, sec) + Math.sin(sec * 0.61 + 1.3) * drift;
    let y = track(stops, 'y', 0, sec) + Math.sin(sec * 0.47 + 4.1) * drift * 0.7;
    let zoom = track(stops, 'zoom', 1, sec);
    const rot = track(stops, 'rot', 0, sec);

    for (const imp of impulses) {
      const dur = imp.frames ?? 6;
      const df = frame - (Math.round(imp.t * fps) + leadFrames);
      if (df < 0 || df > dur) continue;
      const decay = 1 - df / dur;
      const env = decay * decay;
      if (imp.scale) zoom += imp.scale * env;
      if (imp.shake) x += imp.shake * env * Math.sin(df * 2.1);
    }
    return {x, y, zoom, rot, sec};
  }, [stops, impulses, sec, frame, fps, leadFrames, drift]);

  return (
    <WorldCtx.Provider value={cam}>
      <AbsoluteFill style={{overflow: 'hidden'}}>{children}</AbsoluteFill>
    </WorldCtx.Provider>
  );
};

/**
 * 一层世界平面。depth=1 完全跟随相机；depth<1 落后（远景）；>1 超前（前景）。
 * 屏幕坐标 = 旋转(缩放(世界坐标 − 相机注视点·depth)) + 屏幕中心。
 */
export const WorldPlane: React.FC<{
  depth?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({depth = 1, children, style}) => {
  const cam = useWorldCam();
  const {width, height} = useVideoConfig();
  const zoom = 1 + (cam.zoom - 1) * depth;
  return (
    <div
      style={{
        position: 'absolute',
        left: width / 2,
        top: height / 2,
        width: 0,
        height: 0,
        transform: `rotate(${cam.rot * depth}deg) scale(${zoom}) translate(${-cam.x * depth}px, ${-cam.y * depth}px)`,
        transformOrigin: '0 0',
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * 钉在世界坐标 (x, y) 的内容，锚点为自身盒中心。
 * 坑（实战验证）：锚点=盒中心只对有实际宽度的普通内容成立；站点内容用**绝对定位子元素**
 * 铺开时，视觉中心会漂离锚点（实测偏 460px），相机到站后构图偏移——
 * 站点内容必须自己保证以 (0,0) 为视觉中心（必要时手动包一层居中偏移层）。
 */
export const WorldItem: React.FC<{
  x: number;
  y: number;
  w?: number;
  rot?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({x, y, w, rot = 0, children, style}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      transform: `translate(-50%, -50%) rotate(${rot}deg)`,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * 相机接近度：0（远）→ 1（到达）。radius 单位 px（世界坐标）。
 * 典型用法：opacity/位移挂在 arrive 上，让内容在相机赶到前 0.3~0.5 屏就开始成形；
 * 已经讲完的区域也可以用 1-arrive 做"离场即退焦"。
 */
export const useArrive = (x: number, y: number, radius = 900): number => {
  const cam = useWorldCam();
  const dist = Math.hypot(cam.x - x, cam.y - y);
  return interpolate(dist, [radius * 0.4, radius], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
};
