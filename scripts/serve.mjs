// Tiny static server that serves site/ like Cloudflare Pages does (including the headers in site/_headers)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { handleWorld, memoryStore, parseActions } from "../lib/world.js";

export const SITE = path.resolve("site");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2", ".webmanifest": "application/manifest+json",
};

function readHeaders() {
  // Only the headers declared for "/*" in _headers
  const file = path.join(SITE, "_headers");
  const out = {};
  if (!fs.existsSync(file)) return out;
  let active = false;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) { active = line.trim() === "/*"; continue; }
    if (active) {
      const i = line.indexOf(":");
      if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return out;
}

export function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  let file = path.join(SITE, p);
  if (!file.startsWith(SITE)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  else if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file = file + ".html";
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

function readActions() {
  try { return parseActions(JSON.parse(fs.readFileSync(path.join(SITE, "shared", "actions.json"), "utf8"))); }
  catch { return {}; }
}

// Same API as the Cloudflare Pages Function, backed by memory (fresh for every server)
async function api(req, res, store, base) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(base + req.url, {
    method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  const response = await handleWorld(request, store, readActions(), { ip: req.socket.remoteAddress, country: "VN" });
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function startServer() {
  const headers = readHeaders();
  const store = memoryStore();
  let base = "";
  const server = http.createServer((req, res) => {
    if (req.url.split("?")[0] === "/api/world") {
      api(req, res, store, base).catch((e) => { res.writeHead(500); res.end(String(e)); });
      return;
    }
    const file = resolveFile(req.url);
    if (!file) { res.writeHead(404, { "content-type": "text/plain" }); res.end("404"); return; }
    res.writeHead(200, { ...headers, "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => {
    base = `http://127.0.0.1:${server.address().port}`;
    ok({ server, url: base });
  }));
}

export async function launchBrowser() {
  const { chromium } = await import("playwright");
  // CHROME_PATH (optional): use an installed Chrome when running locally
  return chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
}
