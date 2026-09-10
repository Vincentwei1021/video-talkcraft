/** 与 scripts/pipeline_state.mjs 的 derivePipeline 输出同构（服务端实时推导，SSE 推过来） */
export type ShotStatus = "planned" | "placeholder" | "implemented" | "rendered" | "passed";
export type StageStatus = "todo" | "running" | "done";

export interface PipelineIssue {
  shot: string;
  level: "P0" | "P1" | "P2";
  text: string;
  source: string;
  at?: string;
}

export interface PipelineShot {
  id: string;
  start: number;
  end: number;
  status: ShotStatus;
  stale: boolean;
  sceneFile: string | null;
  renderedAt: string | null;
  segment: string | null;
  preview: string | null;
  issues: PipelineIssue[];
  mentions: PipelineIssue[];
}

export interface PipelineStage {
  id: string;
  label: string;
  status: StageStatus;
  artifacts: string[];
}

export interface PipelineState {
  version: number;
  updatedAt: string;
  project: string;
  root: string;
  fps: number;
  totalSec: number;
  totalFrames: number;
  stage: string;
  stageInferred: string;
  stages: PipelineStage[];
  voice: { raw: string | null; cleaned: string | null; timestamps: string | null; cuts: string | null; cutCount: number };
  shots: PipelineShot[];
  counts: {
    shots: number; planned: number; placeholder: number; implemented: number; rendered: number; passed: number;
    stale: number; issues: number; p0p1: number; mentions: number;
  };
  manual: { stage: string | null; verdicts: Record<string, string>; issues: PipelineIssue[]; notes: { text: string; at: string }[] };
}

export const STATUS_LABEL: Record<ShotStatus, string> = {
  planned: "仅规划",
  placeholder: "占位",
  implemented: "已实现",
  rendered: "已渲",
  passed: "已过闸",
};

/** 工程文件经 dev server 取用（预览 mp4 等）：/api/pipeline/file?p=<工程根相对路径> */
export const pipelineFileUrl = (rel: string) => `/api/pipeline/file?p=${encodeURIComponent(rel)}`;
