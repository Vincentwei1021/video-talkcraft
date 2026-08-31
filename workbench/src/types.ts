/** 工程数据模型：Project → Track → Clip。所有时间量以时间轴帧为单位（30fps）。 */

export interface ClipData {
  id: string;
  cardId: string;
  /** 时间轴上的起点（帧） */
  start: number;
  /** 时间轴上占据的长度（帧）——可短于/长于卡片原始时长（裁剪/定格延长） */
  duration: number;
  /** 裁入点：从卡片素材的第几帧开始播（源帧），控制动效的进场时机 */
  inOffset: number;
  /** 变速倍率：每走 1 时间轴帧，源时间前进 speed 帧 */
  speed: number;
  /** 图层不透明度 0–1 */
  opacity: number;
  /** 图层整体缩放 */
  scale: number;
  /** 图层位移（px，合成坐标系） */
  x: number;
  y: number;
  /** 卡片专属属性覆盖（缺省值来自卡片 schema） */
  props: Record<string, unknown>;
}

export interface TrackData {
  id: string;
  name: string;
  hidden?: boolean;
  clips: ClipData[];
}

export interface ProjectData {
  name: string;
  fps: number;
  width: number;
  height: number;
  tracks: TrackData[];
}

let seq = 0;
export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;
