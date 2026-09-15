import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { kbsrcMap } from "./kbsrc.map.mjs";
import { derivePipeline, readManual, shotbookExcerpt } from "../scripts/pipeline_state.mjs";

// @kbsrc = 外部口播成片工程源码（本机经 workbench/kbsrc 符号链接接入，不进库）。
// 解析策略见 kbsrc.map.mjs：按真实路径接入（工程内 `../shots.json` 之类 src 之外的相对引用成立）、
// 契约模块逐个回退到 kbsrc-stub（接入工程缺哪个文件就只有那张卡降级，不再整页 500）；
// react / react-dom / remotion 用 resolve.dedupe 收到本工程 node_modules（避免双实例）。
// src/kbsrc.d.ts 让 tsc 不检查外部源码；导出形态差异由 src/kb/*.ts 适配层兜底。
const root = fileURLToPath(new URL(".", import.meta.url));
const kb = kbsrcMap(root);

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
      // 上一版导出完不删 props 文件，每次导出都在 exports/ 里永久留一份完整工程 JSON（评审 P2）：
      // 启动时清掉历史残留；本版每个任务结束（成功/失败/同步失败）都即时删除
      const exportsDir = path.join(root, "exports");
      if (existsSync(exportsDir)) {
        for (const f of readdirSync(exportsDir)) {
          if (/^\.props-[a-z0-9]+\.json$/.test(f)) rmSync(path.join(exportsDir, f), { force: true });
        }
      }
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
          // 先同步占位再读 body：两个 POST 几乎同时到达时第二个在上面就撞 409（原先都通过检查后各起一个渲染，评审 P2）
          const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
          const job: ExportJob = { status: "running", progress: 0, output: "", lastLine: "接收工程…", logTail: [] };
          jobs.set(id, job);
          let raw = "";
          req.on("data", (c) => (raw += c));
          req.on("end", () => {
            let project: { name?: string };
            let transparent = false;
            let format: "mp4" | "mov" | "webm" = "mp4";
            try {
              const body = JSON.parse(raw) as { project?: { name?: string }; transparent?: boolean; format?: string };
              if (!body.project) throw new Error("no project");
              project = body.project;
              transparent = !!body.transparent;
              // 透明通道只有两种容器：mov = ProRes 4444（剪辑软件通吃）/ webm = VP9 yuva420p（网页 / 小体积）
              if (transparent) format = body.format === "webm" ? "webm" : "mov";
            } catch {
              jobs.delete(id);
              send(400, { error: "缺少工程 JSON" });
              return;
            }
            const outDir = path.join(root, "exports");
            mkdirSync(outDir, { recursive: true });
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
            const safeName =
              (project.name ?? "工程").replace(/[^\w一-龥·-]+/g, "_").slice(0, 40) || "工程";
            const output = `exports/${safeName}-${stamp}${transparent ? "-alpha" : ""}.${format}`;
            const propsFile = path.join(outDir, `.props-${id}.json`);
            writeFileSync(propsFile, JSON.stringify({ project, renderExact: true, transparent }));
            // Remotion 官方透明渲染参数：png 中间帧 + 带 alpha 的像素格式 + 支持 alpha 的编码
            //（https://www.remotion.dev/docs/transparent-videos）；不透明导出沿用 h264 mp4 缺省
            // 透明片段是给别的剪辑软件当叠加层用的，不带音轨（--muted；否则 Remotion 会附一条空音轨）
            const codecArgs =
              format === "mov"
                ? ["--image-format=png", "--pixel-format=yuva444p10le", "--codec=prores", "--prores-profile=4444", "--muted"]
                : format === "webm"
                  ? ["--image-format=png", "--pixel-format=yuva420p", "--codec=vp9", "--muted"]
                  : [];
            const dropProps = () => rmSync(propsFile, { force: true });
            job.output = output;
            job.lastLine = "同步素材…";

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

            // Remotion 静态服务器默认拒绝服务符号链接（lstat 到 symlink 一律 404），
            // 而机器本地素材（dh/sfx/full.wav…）全是符号链接——渲染前先解引用同步成
            // 真实文件目录，再用 --public-dir 指过去。cardpreviews/cardthumbs 仅 UI 用，排除。
            const renderPublic = path.join(root, ".render-public");
            const rsync = spawn(
              "rsync",
              ["-aL", "--delete", "--exclude=cardpreviews", "--exclude=cardthumbs", "public/", `${renderPublic}/`],
              { cwd: root },
            );
            rsync.stderr.on("data", onChunk);
            rsync.on("close", (rc) => {
              if (rc !== 0) {
                dropProps();
                job.status = "error";
                job.lastLine = `素材同步失败（rsync 退出码 ${rc}）：${job.lastLine}`;
                return;
              }
              const bin = path.join(root, "node_modules", ".bin", "remotion");
              const child = spawn(
                bin,
                [
                  "render",
                  "src/remotion/index.ts",
                  "Main",
                  output,
                  `--props=${propsFile}`,
                  `--public-dir=${renderPublic}`,
                  ...codecArgs,
                ],
                { cwd: root },
              );
              child.stdout.on("data", onChunk);
              child.stderr.on("data", onChunk);
              child.on("close", (code) => {
                dropProps(); // Remotion CLI 启动时已读完 props，成功失败都不再需要
                job.status = code === 0 ? "done" : "error";
                if (code === 0) job.progress = 1;
                else {
                  // 把最有信息量的错误行顶到 UI（否则 lastLine 常是堆栈尾行）
                  const err = job.logTail.find((l) => l.includes("Error"));
                  if (err) job.lastLine = err;
                }
              });
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

/** 实时看板（docs/live-pipeline.md L1）：接入工程的制作进度 → 工作台。
 *  - GET  /api/pipeline            全量状态（服务端按盘上产物实时推导：scripts/pipeline_state.mjs 同一套代码 + pipeline.json 的手工字段）
 *  - GET  /api/pipeline/events     SSE：产物变化（shots.json / scenes/ / out/segments / review/ / pipeline.json…）→ 推新状态
 *  - GET  /api/pipeline/shotbook?shot=sNN   SHOTBOOK.md 里该镜的段落（纯文本）
 *  - GET  /api/pipeline/file?p=<相对工程根>  取工程文件（单镜预览 mp4 等，支持 Range），只放行工程根之内（按 realpath 判，指向外部的符号链接不放行）
 *  - POST /api/pipeline/refresh    强制重算并广播
 *  - POST /api/pipeline/reveal?p=  Finder 里显示该文件
 *  - GET/POST /api/pipeline/overrides  逐镜语境参数覆盖（skill 标准工程 <remotion>/overrides.json）：工作台属性面板改镜头参数 → 整表写回；
 *    agent 只改 tsx 默认值、永不写这个文件，两边不互相冲掉；render_shots / 导出读同一份
 *  文件监听借 Vite 自己的 chokidar（server.watcher.add），另加 4s 轮询兜底（out/ 等目录可能在渲染时才出现）；
 *  只在状态 JSON 变了才推。skill 是主控、这里只是看板：不提供触发制作步骤的接口（用户 2026-09-09 已否决机器闸式复杂度）。 */
const pipelinePlugin = (projectRoot: string | null, remotionDir: string | null): Plugin => ({
  name: "wb-pipeline",
  configureServer(server) {
    const overridesFile = remotionDir ? path.join(remotionDir, "overrides.json") : null;
    const clients = new Set<ServerResponse>();
    let lastJson = "";
    let cached: { at: number; json: string } | null = null;

    const compute = (): string => {
      if (!projectRoot) return JSON.stringify({ linked: false, state: null });
      if (cached && Date.now() - cached.at < 250) return cached.json;
      let json: string;
      try {
        json = JSON.stringify({ linked: true, state: derivePipeline(projectRoot, readManual(projectRoot)) });
      } catch (e) {
        json = JSON.stringify({ linked: true, state: null, error: e instanceof Error ? e.message : String(e) });
      }
      cached = { at: Date.now(), json };
      return json;
    };
    // updatedAt 每次都变，比较时去掉它
    const stable = (json: string) => json.replace(/"updatedAt":"[^"]*",?/, "");
    const broadcast = (force = false) => {
      if (!clients.size) return;
      const json = compute();
      if (!force && stable(json) === stable(lastJson)) return;
      lastJson = json;
      for (const res of clients) res.write(`data: ${json}\n\n`);
    };
    let timer: NodeJS.Timeout | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => broadcast(), 300);
    };

    if (projectRoot) {
      const remotion = path.join(projectRoot, "remotion");
      const watch = [
        "pipeline.json", "SHOTBOOK.md", "delivery.mp4", "audio", "review", "qa",
        path.join("remotion", "shots.json"), path.join("remotion", "src"), path.join("remotion", "out"),
      ].map((p) => path.join(projectRoot, p)).filter((p) => existsSync(p));
      server.watcher.add(watch);
      server.watcher.on("all", (_ev, file) => {
        if (file.startsWith(projectRoot + path.sep) && !file.includes(`${path.sep}node_modules${path.sep}`)) schedule();
      });
      // 兜底轮询：只在有人看着（SSE 已连）时跑，且只有状态变了才推
      const poll = setInterval(() => {
        if (clients.size) broadcast();
        // 后来才出现的目录（首次渲染建 out/）补进监听
        for (const p of [path.join(remotion, "out"), path.join(projectRoot, "review"), path.join(projectRoot, "qa"), path.join(projectRoot, "audio")]) {
          if (existsSync(p) && !watch.includes(p)) { watch.push(p); server.watcher.add(p); }
        }
      }, 4000);
      server.httpServer?.on("close", () => clearInterval(poll));
    }

    const send = (res: ServerResponse, code: number, body: unknown) => {
      res.statusCode = code;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    };
    // 工程根之内：按 realpath 判——`..` 与绝对路径被 resolve 挡住，但工程内一个指向外部的符号链接逻辑路径合法、真实路径在外（2026-09-13 审计）
    const rootReal = (() => { try { return projectRoot ? realpathSync(projectRoot) : null; } catch { return projectRoot; } })();
    const insideRoot = (rel: string): string | null => {
      if (!projectRoot || !rootReal) return null;
      let real: string;
      try { real = realpathSync(path.resolve(projectRoot, rel)); } catch { return null; } // 不存在 → 交给调用方 404
      return real === rootReal || real.startsWith(rootReal + path.sep) ? real : null;
    };

    server.middlewares.use("/api/pipeline", (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", "http://x");
      const sub = url.pathname.replace(/\/$/, "");

      if (sub === "" && req.method === "GET") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(compute());
        return;
      }
      if (sub === "/events") {
        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
        res.write(": hello\n\n");
        clients.add(res);
        const json = compute();
        lastJson = json;
        res.write(`data: ${json}\n\n`);
        const hb = setInterval(() => res.write(": ping\n\n"), 25000);
        req.on("close", () => { clearInterval(hb); clients.delete(res); });
        return;
      }
      if (sub === "/refresh" && req.method === "POST") {
        cached = null;
        broadcast(true);
        send(res, 200, { ok: true });
        return;
      }
      if (sub === "/shotbook") {
        const shot = url.searchParams.get("shot") ?? "";
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(projectRoot && /^[\w-]+$/.test(shot) ? shotbookExcerpt(projectRoot, shot) : "");
        return;
      }
      if (sub === "/overrides") {
        if (!overridesFile) { send(res, 404, { error: "未接入工程" }); return; }
        if (req.method === "GET") {
          let cur: unknown = {};
          try { cur = existsSync(overridesFile) ? JSON.parse(readFileSync(overridesFile, "utf8")) : {}; } catch { cur = {}; }
          send(res, 200, cur);
          return;
        }
        if (req.method === "POST") {
          let raw = "";
          req.on("data", (c) => (raw += c));
          req.on("end", () => {
            let body: unknown;
            try { body = JSON.parse(raw || "{}"); } catch { send(res, 400, { error: "bad json" }); return; }
            if (!body || typeof body !== "object" || Array.isArray(body)) { send(res, 400, { error: "expect { [shotId]: { [key]: value } }" }); return; }
            // 只收 { 镜头 id → { 参数 → 标量 } }；其余形态一律拒收，别把整份工程写进 overrides
            const clean: Record<string, Record<string, unknown>> = {};
            for (const [shot, vals] of Object.entries(body as Record<string, unknown>)) {
              if (!/^[\w-]+$/.test(shot) || !vals || typeof vals !== "object" || Array.isArray(vals)) continue;
              const o: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(vals as Record<string, unknown>)) {
                if (/^[\w-]+$/.test(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) o[k] = v;
              }
              if (Object.keys(o).length) clean[shot] = o;
            }
            const next = `${JSON.stringify(clean, null, 2)}\n`;
            let prev = "";
            try { prev = existsSync(overridesFile) ? readFileSync(overridesFile, "utf8") : ""; } catch { prev = ""; }
            if (prev !== next) writeFileSync(overridesFile, next);
            send(res, 200, { ok: true, shots: Object.keys(clean).length, changed: prev !== next });
          });
          return;
        }
        send(res, 405, { error: "GET / POST only" });
        return;
      }
      if (sub === "/reveal" && req.method === "POST") {
        const abs = insideRoot(url.searchParams.get("p") ?? "");
        if (abs && process.platform === "darwin") spawn("open", ["-R", abs]);
        send(res, abs ? 200 : 400, { ok: !!abs });
        return;
      }
      if (sub === "/file") {
        const abs = insideRoot(url.searchParams.get("p") ?? "");
        if (!abs || !existsSync(abs) || !statSync(abs).isFile()) { send(res, 404, { error: "not found" }); return; }
        const size = statSync(abs).size;
        const type = /\.mp4$/i.test(abs) ? "video/mp4" : /\.webm$/i.test(abs) ? "video/webm" : /\.(wav)$/i.test(abs) ? "audio/wav" : /\.mp3$/i.test(abs) ? "audio/mpeg" : /\.png$/i.test(abs) ? "image/png" : /\.jpe?g$/i.test(abs) ? "image/jpeg" : /\.(md|txt|json)$/i.test(abs) ? "text/plain; charset=utf-8" : "application/octet-stream";
        const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
        if (range && size > 0 && (range[1] !== "" || range[2] !== "")) {
          // bytes=a-b / bytes=a- / bytes=-n（后缀 n 字节）；越界或倒序 → 416（段文件正在被 ffmpeg 写入时浏览器按旧 size 发的请求会踩到）
          let start: number, end: number;
          if (range[1] === "") { start = Math.max(0, size - Math.min(Number(range[2]), size)); end = size - 1; }
          else { start = Number(range[1]); end = range[2] === "" ? size - 1 : Math.min(Number(range[2]), size - 1); }
          if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
            res.writeHead(416, { "Content-Range": `bytes */${size}` });
            res.end();
            return;
          }
          res.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
          createReadStream(abs, { start, end }).pipe(res);
        } else {
          res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": size });
          createReadStream(abs).pipe(res);
        }
        return;
      }
      send(res, 404, { error: "unknown pipeline route" });
    });
  },
});

export default defineConfig({
  plugins: [react(), renderExportPlugin(), pipelinePlugin(kb.projectRoot, kb.remotionDir)],
  server: {
    port: 5199,
    // 实时看板：agent 半成品代码常态化，报错不盖整页（角落提示 + 上一版继续显示；见 src/pipeline/store.ts）
    hmr: { overlay: false },
    // 接入工程按真实路径解析后位于本目录之外：显式放行其工程根（默认只放行 workspace root，
    // 而 Vite 不把 .git 当 workspace 标记，仓库根也要显式列上——tplcards → ../template/cards）
    fs: { allow: [root, path.resolve(root, ".."), ...(kb.projectRoot ? [kb.projectRoot] : [])] },
  },
  resolve: {
    // tplcards（→ ../template/cards）仍按虚拟路径解析：模板正主源码的裸导入落回本工程 node_modules
    preserveSymlinks: true,
    dedupe: ["react", "react-dom", "remotion"],
    alias: [...kb.viteAlias, { find: "@tpl", replacement: path.join(root, "tplcards") }],
  },
});
