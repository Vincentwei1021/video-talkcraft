import { create } from "zustand";
import type { ClipData, ProjectData } from "./types";
import { CARDS } from "./cards/registry";

/** 导出任务（顶栏「导出成片」与右键「导出透明通道」共用）：
 *  POST /api/export 提交，GET /api/export/:id 轮询；dev server 同时只跑一个渲染（409）。 */
export type ExportFormat = "mp4" | "mov" | "webm";

export interface ExportRequest {
  project: ProjectData;
  /** 透明通道：png 中间帧 + alpha 像素格式（mov = ProRes 4444，webm = VP9 yuva420p） */
  transparent?: boolean;
  format?: ExportFormat;
}

export interface ExportJobState {
  id: string;
  /** full = 顶栏整片导出（按钮上显示）；alpha = 右键单段透明导出（右下角浮层显示） */
  kind: "full" | "alpha";
  title: string;
  status: "running" | "done" | "error";
  progress: number;
  lastLine?: string;
  output?: string;
}

interface ExportStore {
  job: ExportJobState | null;
  setJob: (job: ExportJobState | null) => void;
}

export const useExportStore = create<ExportStore>((set) => ({
  job: null,
  setJob: (job) => set({ job }),
}));

let timer: number | undefined;

export const startExport = async (req: ExportRequest, kind: ExportJobState["kind"], title: string) => {
  const r = await fetch("/api/export", { method: "POST", body: JSON.stringify(req) });
  const j = await r.json();
  if (!r.ok) {
    window.alert(j.error ?? "导出启动失败");
    return;
  }
  const { setJob } = useExportStore.getState();
  setJob({ id: j.id, kind, title, status: "running", progress: 0 });
  window.clearInterval(timer);
  timer = window.setInterval(async () => {
    let rr: Response;
    try {
      rr = await fetch(`/api/export/${j.id}`);
    } catch {
      return; // 网络抖动：下一秒再问
    }
    if (rr.status === 404) {
      // 任务在服务端没了（dev server 重启会清空任务表）：不能永远停在 running——两个导出入口都会被互斥锁死
      window.clearInterval(timer);
      setJob({ id: j.id, kind, title, status: "error", progress: 0, lastLine: "任务在服务端丢失（dev server 重启？）——请重新导出" });
      return;
    }
    if (!rr.ok) return;
    const s = await rr.json();
    setJob({ id: j.id, kind, title, ...s });
    if (s.status !== "running") window.clearInterval(timer);
  }, 1000);
};

export const revealExport = (id: string) => fetch(`/api/export/${id}/reveal`, { method: "POST" });

/** 透明导出时置为 transparent 的底色参数：只认 `bgColor`（口播镜头卡 kscene-* 的幕底参数，全部 20 处都是幕底），
 *  其余卡若要清某个底色参数，在 CardDef.alphaClear 里显式列出。
 *  不再按名字猜（原 bg / background / baseColor / paper 一并清）：chart-grow 的 baseColor 是"普通柱色"、
 *  chapter-title-card 的 bg 是滑入色板——都是动效本体，清掉就是删内容（2026-09-13 评审 P1）。 */
const BG_PROP = /^bgColor$/;

/** 单段透明导出用的最小工程：只含这一段、起点归零、时长精确、底色参数置透明；
 *  图层透明度 / 缩放 / 位移保留（它们是这段的造型）。不改用户工程本身。 */
export const alphaProjectFor = (project: ProjectData, clip: ClipData, label: string): ProjectData => {
  const card = CARDS[clip.cardId];
  const props: Record<string, unknown> = { ...clip.props };
  const explicit = new Set(card?.alphaClear ?? []);
  for (const f of card?.schema ?? []) {
    if (f.type === "color" && (BG_PROP.test(f.key) || explicit.has(f.key))) props[f.key] = "transparent";
  }
  return {
    name: label,
    fps: project.fps,
    width: project.width,
    height: project.height,
    tracks: [{ id: "alpha", name: label, clips: [{ ...clip, start: 0, props }] }],
  };
};
