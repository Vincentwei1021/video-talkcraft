import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// @kbsrc = 外部口播成片工程源码（本机经 workbench/kbsrc 符号链接接入，不进库）。
// 未链接时自动落到 kbsrc-stub 降级实现：工程可构建可运行，口播拆解相关能力显示占位。
// preserveSymlinks 让 kbsrc 按虚拟路径解析，其 'react'/'remotion' 裸导入
// 落到本工程 node_modules（避免双实例）；src/kbsrc.d.ts 让 tsc 不检查外部源码。
const root = fileURLToPath(new URL(".", import.meta.url));
const kbsrc = existsSync(path.join(root, "kbsrc")) ? "kbsrc" : "kbsrc-stub";

/** 导出成片：dev server 内起 Remotion CLI 渲染（remotion.config.ts 已锁单并发），
 *  前端 POST /api/export 提交工程 JSON，轮询 GET /api/export/:id 取进度。 */
type ExportJob = {
  status: "running" | "done" | "error";
  progress: number; // 0..1
  output: string; // 相对 workbench 的输出路径
  lastLine: string;
  logTail: string[];
};

const renderExportPlugin = (): Plugin => {
  const jobs = new Map<string, ExportJob>();
  const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");

  return {
    name: "wb-render-export",
    configureServer(server) {
      server.middlewares.use("/api/export", (req, res) => {
        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };
        const sub = (req.url ?? "/").split("?")[0];

        // POST /api/export —— 提交渲染
        if (req.method === "POST" && (sub === "/" || sub === "")) {
          if ([...jobs.values()].some((j) => j.status === "running")) {
            send(409, { error: "已有渲染在进行中" });
            return;
          }
          let raw = "";
          req.on("data", (c) => (raw += c));
          req.on("end", () => {
            let project: { name?: string };
            try {
              project = JSON.parse(raw).project;
              if (!project) throw new Error("no project");
            } catch {
              send(400, { error: "缺少工程 JSON" });
              return;
            }
            const id = Date.now().toString(36);
            const outDir = path.join(root, "exports");
            mkdirSync(outDir, { recursive: true });
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
            const safeName =
              (project.name ?? "工程").replace(/[^\w一-龥·-]+/g, "_").slice(0, 40) || "工程";
            const output = `exports/${safeName}-${stamp}.mp4`;
            const propsFile = path.join(outDir, `.props-${id}.json`);
            writeFileSync(propsFile, JSON.stringify({ project, renderExact: true }));

            const job: ExportJob = {
              status: "running",
              progress: 0,
              output,
              lastLine: "启动渲染…",
              logTail: [],
            };
            jobs.set(id, job);

            const bin = path.join(root, "node_modules", ".bin", "remotion");
            const child = spawn(
              bin,
              ["render", "src/remotion/index.ts", "Main", output, `--props=${propsFile}`],
              { cwd: root },
            );
            const onChunk = (buf: Buffer) => {
              const lines = stripAnsi(buf.toString()).split(/[\r\n]+/).filter((l) => l.trim());
              for (const line of lines) {
                job.lastLine = line.trim();
                job.logTail = [...job.logTail, line.trim()].slice(-40);
                // Remotion CLI 进度形如 "Rendered 123/5544"，取最后一处 a/b
                const m = [...line.matchAll(/(\d+)\/(\d+)/g)].pop();
                if (m && Number(m[2]) > 0) job.progress = Number(m[1]) / Number(m[2]);
              }
            };
            child.stdout.on("data", onChunk);
            child.stderr.on("data", onChunk);
            child.on("close", (code) => {
              job.status = code === 0 ? "done" : "error";
              if (code === 0) job.progress = 1;
            });
            send(200, { id });
          });
          return;
        }

        // GET /api/export/:id —— 查进度
        const m = sub.match(/^\/([a-z0-9]+)(\/reveal)?$/);
        const job = m ? jobs.get(m[1]) : undefined;
        if (!job) {
          send(404, { error: "任务不存在" });
          return;
        }
        // POST /api/export/:id/reveal —— Finder 里显示成片
        if (req.method === "POST" && m![2]) {
          if (process.platform === "darwin") spawn("open", ["-R", path.join(root, job.output)]);
          send(200, { ok: true });
          return;
        }
        send(200, job);
      });
    },
  };
};

export default defineConfig({
  plugins: [react(), renderExportPlugin()],
  server: { port: 5199 },
  resolve: {
    preserveSymlinks: true,
    alias: { "@kbsrc": path.join(root, kbsrc), "@tpl": path.join(root, "tplcards") },
  },
});
