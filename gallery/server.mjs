#!/usr/bin/env node
// 可选：本地静态服务器（浏览器直接开 file:// 遇到 iframe 限制时使用）
// 用法：node gallery/server.mjs  →  http://127.0.0.1:4179/gallery/index.html
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".md": "text/plain; charset=utf-8" };

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let p = normalize(resolve(root, "." + url));
    if (!p.startsWith(root)) throw new Error("forbidden");
    if (url === "/" || url.endsWith("/")) p = resolve(p, "index.html");
    const body = await readFile(p);
    res.writeHead(200, { "Content-Type": mime[extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(4179, () => console.log("http://127.0.0.1:4179/gallery/index.html"));
