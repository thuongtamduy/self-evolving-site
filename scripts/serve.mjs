// Tiny static server that serves site/ like Cloudflare Pages does (including the headers in site/_headers)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

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

export function startServer() {
  const headers = readHeaders();
  const server = http.createServer((req, res) => {
    const file = resolveFile(req.url);
    if (!file) { res.writeHead(404, { "content-type": "text/plain" }); res.end("404"); return; }
    res.writeHead(200, { ...headers, "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => {
    ok({ server, url: `http://127.0.0.1:${server.address().port}` });
  }));
}

export async function launchBrowser() {
  const { chromium } = await import("playwright");
  // CHROME_PATH (optional): use an installed Chrome when running locally
  return chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
}
