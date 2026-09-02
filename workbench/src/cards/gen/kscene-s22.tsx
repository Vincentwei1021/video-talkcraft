import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { CardDef } from "../types";
import { shotTiming } from "../koubo-units";
import { CameraRig, Plane } from "@kbsrc/camera";
import { WorldRig, WorldPlane, WorldItem, useArrive } from "@kbsrc/longtake";
import { SHOTS } from "@kbsrc/shots";
import { atChar } from "@kbsrc/timing";
import { C, FONT, RADII } from "@kbsrc/theme";

// kscene-s22 · 一台相机 · 一镜到底 —— 口播成片 Scene22 的逐镜参数化卡（源出 kbsrc/PromoScenes.tsx）
// 长镜头世界画布：所有内容钉在一张大画布上，WorldRig 站点表驱动相机巡游，
// 外层 CameraRig 近乎静止（path 由 shots.ts 提供）。
// FIXED（不暴露）：全部世界画布站点/相机站点表（词锚驱动）、四张回收缩略卡的
//   位置与文案、干线路径几何与描线时长、途经点、到站闸（useArrive×时间闸）、双正弦微漂。
// 暴露：画布标题、四站文案（眉头|标题|注释）、主色（干线/站牌眉头/缩略卡强调）、
//   世界网格线色、标题/站牌标题字号。
const T22 = shotTiming(21); // idx 21 = s22

// —— PromoScenes 顶部共享 helpers（逐字复制，未导出故内联）——
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const tw = (t: number, t0: number, d: number, e: (x: number) => number) => e(cl01((t - t0) / d));
const power2Out = (x: number) => 1 - Math.pow(1 - x, 3);
const power1InOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const cardS: React.CSSProperties = { background: "#fff", border: `1px solid ${C.hairline}`, borderRadius: RADII.card };
const labelS: React.CSSProperties = { fontFamily: FONT.mono, fontSize: 22, letterSpacing: 0.6, color: C.accent, fontWeight: 600 };

// 取景框角括号：border 技法（各角只留两条边）——逐字复制
const Corner: React.FC<{ pos: "tl" | "tr" | "bl" | "br"; x: number; y: number; size: number; off: number; opacity: number; color?: string; width?: number }> =
  ({ pos, x, y, size, off, opacity, color = C.accent, width = 4 }) => {
    const dx = pos === "tl" || pos === "bl" ? -1 : 1, dy = pos === "tl" || pos === "tr" ? -1 : 1;
    const b = `${width}px solid ${color}`;
    return <div style={{
      position: "absolute", left: x, top: y, width: size, height: size, opacity,
      borderLeft: pos === "tl" || pos === "bl" ? b : undefined, borderRight: pos === "tr" || pos === "br" ? b : undefined,
      borderTop: pos === "tl" || pos === "tr" ? b : undefined, borderBottom: pos === "bl" || pos === "br" ? b : undefined,
      transform: `translate(${dx * off}px,${dy * off}px)`,
    }} />;
  };

// 词锚：字级时间戳 + 47.7ms 混音补偿 —— FIXED
const AV = 0.048;
const A = (si: number, q: string, occ = 0): number => atChar(si, q, occ) + AV;
const ST22: number = SHOTS[21].start;
const S22_LEAD = 8 / 30;
const s22t = (abs: number): number => abs - ST22 + S22_LEAD; // 绝对秒 → S22 序列内秒
const S22_PATH = "M130 450 C 200 560 240 680 310 690 S 700 300 890 210 S 1300 540 1490 630 S 1930 340 2070 270";

// 相机站点表（词锚驱动，FIXED）
const STOPS = [
  { t: S22_LEAD + 0.2, x: 700, y: 120, zoom: 1.02 },
  { t: s22t(A(33, "钉")), x: 1020, y: 420, zoom: 0.56 },
  { t: s22t(A(33, "不切")), x: 980, y: 440, zoom: 0.62 },
  { t: s22t(A(34, "稿子")), x: 250, y: 640, zoom: 1.30 },
  { t: s22t(A(34, "配音")), x: 830, y: 190, zoom: 1.30 },
  { t: s22t(A(35, "自己排")), x: 1430, y: 580, zoom: 1.26 },
  { t: s22t(A(36, "审片")), x: 2000, y: 250, zoom: 1.22 },
  { t: s22t(A(36, "打回去")) + 0.9, x: 1060, y: 430, zoom: 0.54 },
];
// 四大站牌：世界坐标 + 时间闸（FIXED）
const STATION_GEO = [
  { x: 240, y: 660, after: s22t(A(34, "稿子")) - 1.0, dark: false },
  { x: 820, y: 180, after: s22t(A(34, "配音")) - 1.0, dark: false },
  { x: 1420, y: 600, after: s22t(A(35, "自己排")) - 1.2, dark: false },
  { x: 2000, y: 240, after: s22t(A(36, "审片")) - 1.2, dark: true },
];

const DEF_STATIONS =
  "SCRIPT · 输入 1|一份稿子|口播文案原稿 · 每句一个信息点\n" +
  "AUDIO · 输入 2|一段配音|真人录音或 TTS 都行 · 一条整音轨\n" +
  "MATCH|Agent 自动排|哪句配哪张卡 · 动效落在哪个字\n" +
  "QA LOOP|排完自己审片|字压脸 · 画面不动 → 打回重做";
type StationText = { sub: string; title: string; note: string };
const parseStations = (s: string): StationText[] =>
  s.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split("|").map((x) => x.trim());
    return { sub: p[0] ?? "", title: p[1] ?? "", note: p[2] ?? "" };
  });
const DEF_PARSED = parseStations(DEF_STATIONS);

// —— KouboShot 包装范式（koubo-units 未导出 KScale/Envelope，逐字复制）——
const SCALE = 960 / 1920;
const KScale: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: "0 0" }}>
      {children}
    </div>
  </AbsoluteFill>
);
const Envelope: React.FC<{ lead: number; tail: number; total: number; children: React.ReactNode }> =
  ({ lead, tail, total, children }) => {
    const frame = useCurrentFrame();
    let opacity = 1;
    if (lead > 0) opacity *= interpolate(frame, [0, lead], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
    if (tail > 0) opacity *= interpolate(frame, [total - tail, total], [1, 0], { extrapolateLeft: "clamp", easing: Easing.inOut(Easing.quad) });
    return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
  };

// 站牌：原卡 .station .card 版式（居中大字）
const Station: React.FC<{ sub: string; title: string; note: string; accent: string; titleSize: number; dark?: boolean }> =
  ({ sub, title, note, accent, titleSize, dark }) => (
    <div style={{ ...cardS, padding: "46px 62px", textAlign: "center", background: dark ? C.dark : "#fff", color: dark ? "#fff" : C.ink, boxShadow: "0 14px 44px rgba(0,0,0,.10)", whiteSpace: "nowrap" }}>
      <div style={{ ...labelS, fontSize: 26, color: dark ? "#8cc7ff" : accent, marginBottom: 16 }}>{sub}</div>
      <div style={{ fontSize: titleSize, fontWeight: 600, lineHeight: 1.15 }}>{title}</div>
      <div style={{ fontSize: 30, color: dark ? "#a1a1a6" : C.dim, marginTop: 14 }}>{note}</div>
    </div>
  );
// after：站牌不早于叙事时刻成形（camera 接近度 × 时间闸并联）
const ArriveItem: React.FC<{ x: number; y: number; w?: number; after?: number; r?: number; children: React.ReactNode }> =
  ({ x, y, w, after, r = 880, children }) => {
    const frame = useCurrentFrame(); const { fps } = useVideoConfig();
    const gate = after === undefined ? 1 : tw(frame / fps, after, 0.35, power2Out);
    const p = useArrive(x, y, r) * gate;
    return <WorldItem x={x} y={y} w={w}><div style={{ opacity: p, transform: `translateY(${(1 - p) * 36}px) scale(${0.94 + 0.06 * p})` }}>{children}</div></WorldItem>;
  };

const Scene22Inner: React.FC<{ headText: string; headSize: number; stations: StationText[]; stationTitleSize: number; accent: string }> =
  ({ headText, headSize, stations, stationTitleSize, accent }) => {
    const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const t = frame / fps;
    const drawP = tw(t, 3.2, 16.5, power1InOut);
    return <WorldPlane depth={1}>
      <WorldItem x={700} y={40} w={1000}><div style={{ fontSize: headSize, fontWeight: 600, whiteSpace: "nowrap" }}>{headText}</div></WorldItem>
      {/* 刚才的内容缩略钉在画布上（回收道具，FIXED） */}
      <ArriveItem x={60} y={150} w={250} r={2400}><div style={{ position: "relative", width: 250, height: 150, ...cardS, padding: 18 }}><div style={{ fontSize: 24, fontWeight: 700 }}>有没有一个<br /><span style={{ color: accent }}>口播动效</span>的 skill?</div><Corner pos="tl" x={6} y={6} size={16} off={0} opacity={1} color={accent} width={2} /><Corner pos="br" x={226} y={126} size={16} off={0} opacity={1} color={accent} width={2} /></div></ArriveItem>
      <ArriveItem x={1310} y={50} w={250} r={2400}><div style={{ width: 250, ...cardS, padding: 18 }}><div style={{ fontSize: 26, fontWeight: 800 }}>Vincent</div><div style={{ height: 5, width: 130, background: C.ink, margin: "8px 0" }} /><div style={{ fontSize: 15, color: "#8a8a8a" }}>video-talkcraft 作者</div></div></ArriveItem>
      <ArriveItem x={1680} y={800} w={280} r={2400}><div style={{ width: 280, height: 150, borderRadius: 14, background: "#0c0c10", padding: 16, fontFamily: FONT.mono, fontSize: 15, lineHeight: 1.7 }}><span style={{ color: "#63dca5" }}>$ talkcraft render</span><br /><span style={{ color: "#8cc7ff" }}>✓ composition ready</span><br /><span style={{ color: "#63dca5" }}>+ motion cards</span></div></ArriveItem>
      <ArriveItem x={520} y={905} w={250} r={2400}><div style={{ width: 250, height: 140, border: "8px solid #fff", borderRadius: 4, boxShadow: "0 10px 26px rgba(0,0,0,.16)", overflow: "hidden" }}><Img src={staticFile("shots/github.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} /></div></ArriveItem>
      {/* 工作流干线：虚线底 + 实线随讲述描出（相机的巡游路书，几何 FIXED） */}
      <WorldItem x={1030} y={420} w={2200}><svg width="2200" height="900" viewBox="0 0 2200 900" style={{ overflow: "visible", display: "block" }}><path d={S22_PATH} fill="none" stroke={C.hairline} strokeWidth="6" strokeDasharray="12 18" /><path d={S22_PATH} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" pathLength={2600} strokeDasharray={2600} strokeDashoffset={2600 * (1 - drawP)} /></svg></WorldItem>
      {/* 途经点：原卡 .waypoint 白底描边圆点 */}
      {[[530, 430], [1150, 380], [1730, 430]].map(([wx, wy]) => <WorldItem key={wx} x={wx} y={wy}><div style={{ width: 20, height: 20, borderRadius: 20, background: "#fff", border: `3px solid ${C.ink}` }} /></WorldItem>)}
      {/* 四大站牌：原卡 station 版式，相机到站时吃满视野 */}
      {STATION_GEO.map((g, i) => {
        const st = stations[i] ?? DEF_PARSED[i];
        return <ArriveItem key={i} x={g.x} y={g.y} after={g.after}>
          <Station sub={st.sub} title={st.title} note={st.note} accent={accent} titleSize={stationTitleSize} dark={g.dark} />
        </ArriveItem>;
      })}
    </WorldPlane>;
  };

interface Props {
  headText?: string;
  headSize?: number;
  stations?: string;
  stationTitleSize?: number;
  accent?: string;
  gridColor?: string;
}

const KSceneS22: React.FC<Props> = ({
  headText = "所有内容钉在一张大画布上",
  headSize = 58,
  stations = DEF_STATIONS,
  stationTitleSize = 70,
  accent = "#0066cc",
  gridColor = "#e6e6ea",
}) => {
  const shot = T22.shot;
  const parsed = parseStations(stations);
  return (
    <KScale>
      <Envelope lead={T22.lead} tail={T22.tail} total={T22.total}>
        {/* 底色层：n=22 ∈ ACT_ALT → Shell bg = C.bgAlt */}
        <AbsoluteFill style={{ background: C.bgAlt }}>
          <CameraRig path={shot.path} impulses={shot.impulses} durationSec={shot.end - shot.start} leadFrames={T22.lead}>
            <AbsoluteFill style={{ background: C.bgAlt, color: C.ink, fontFamily: FONT.cn, overflow: "hidden" }}>
              <Plane depth={1}>
                <AbsoluteFill>
                  <WorldRig stops={STOPS}>
                    {/* 世界网格：原卡口径——让相机位移可被看见，不是装饰纹理，必须可见 */}
                    <WorldPlane depth={0.55}><div style={{ position: "absolute", left: -1800, top: -1300, width: 6400, height: 3400, backgroundImage: `linear-gradient(${gridColor} 1px,transparent 1px),linear-gradient(90deg,${gridColor} 1px,transparent 1px)`, backgroundSize: "130px 130px" }} /></WorldPlane>
                    <Scene22Inner headText={headText} headSize={headSize} stations={parsed} stationTitleSize={stationTitleSize} accent={accent} />
                  </WorldRig>
                </AbsoluteFill>
              </Plane>
            </AbsoluteFill>
          </CameraRig>
        </AbsoluteFill>
      </Envelope>
    </KScale>
  );
};

export const card: CardDef = {
  id: "kscene-s22",
  name: "一台相机 · 一镜到底",
  category: "口播镜头",
  durationInFrames: T22.total,
  accent: "#0066cc",
  component: KSceneS22 as React.ComponentType<Record<string, unknown>>,
  schema: [
    { type: "text", key: "headText", label: "画布标题", default: "所有内容钉在一张大画布上" },
    { type: "slider", key: "headSize", label: "画布标题字号", default: 58, min: 36, max: 90, step: 1, unit: "px" },
    { type: "textarea", key: "stations", label: "四站文案（每行：眉头|标题|注释）", default: DEF_STATIONS },
    { type: "slider", key: "stationTitleSize", label: "站牌标题字号", default: 70, min: 44, max: 100, step: 1, unit: "px" },
    { type: "color", key: "accent", label: "主色（干线/站牌眉头）", default: "#0066cc" },
    { type: "color", key: "gridColor", label: "世界网格线色", default: "#e6e6ea" },
  ],
};
