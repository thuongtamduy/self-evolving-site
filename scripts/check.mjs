// Checks the website before it may be deployed. Exits with code 1 on any problem.
import fs from "node:fs";
import path from "node:path";
import { SITE, startServer, launchBrowser, resolveFile } from "./serve.mjs";

const MAX_FILE = 150 * 1024;
const MAX_TOTAL = 3 * 1024 * 1024;
const errors = [];
const err = (m) => errors.push(m);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}
const rel = (p) => path.relative(process.cwd(), p);
const files = walk(SITE).filter((f) => !f.startsWith(path.join(SITE, "timelapse", "shots")));
const pages = files.filter((f) => f.endsWith(".html"));

// 1. Size
let total = 0;
for (const f of files) {
  const size = fs.statSync(f).size;
  total += size;
  if (size > MAX_FILE) err(`${rel(f)} is ${(size / 1024).toFixed(0)} KB (max 150 KB)`);
}
if (total > MAX_TOTAL) err(`Total size is ${(total / 1048576).toFixed(2)} MB (max 3 MB)`);

// 2. Static scan: external resources, inline scripts, onclick=...
const EXT = /^(https?:)?\/\//i;
for (const f of files) {
  const ext = path.extname(f);
  if (![".html", ".css", ".js", ".mjs", ".svg"].includes(ext)) continue;
  const s = fs.readFileSync(f, "utf8");
  if (ext === ".html" || ext === ".svg") {
    for (const m of s.matchAll(/<(script|link|img|iframe|source|video|audio|embed|object|use|image)\b[^>]*?\s(?:src|href|xlink:href|data)\s*=\s*["']?([^"'\s>]+)/gi)) {
      if (EXT.test(m[2])) err(`${rel(f)}: loads an external resource ${m[2]}`);
    }
    if (ext === ".html") {
      if (/<script\b(?![^>]*\bsrc\s*=)[^>]*>\s*\S/i.test(s)) err(`${rel(f)}: inline <script> (blocked by CSP, use a .js file)`);
      const on = s.match(/<[a-z][^>]*\son[a-z]+\s*=\s*["']/i);
      if (on) err(`${rel(f)}: inline event handler (${on[0].slice(0, 60)}…)`);
    }
  }
  for (const m of s.matchAll(/url\(\s*["']?([^"')\s]+)/gi)) if (EXT.test(m[1])) err(`${rel(f)}: external url() ${m[1]}`);
  for (const m of s.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)/gi)) if (EXT.test(m[1])) err(`${rel(f)}: external @import ${m[1]}`);
  if (ext === ".js" || ext === ".mjs") {
    for (const m of s.matchAll(/(?:fetch\(|import\s*\(|from\s+|new\s+(?:WebSocket|EventSource)\()\s*["'`]((?:https?|wss?):\/\/[^"'`]+)/gi)) err(`${rel(f)}: calls out to ${m[1]}`);
  }
}

// 3. Bilingual: every page loads the language system and has both titles
for (const f of pages) {
  const s = fs.readFileSync(f, "utf8");
  if (!/<script[^>]+src=["']\/i18n\.js["']/i.test(s)) err(`${rel(f)}: must load <script src="/i18n.js"> in <head>`);
  if (!/<link[^>]+href=["']\/i18n\.css["']/i.test(s)) err(`${rel(f)}: must load <link rel="stylesheet" href="/i18n.css">`);
  const html = s.match(/<html\b[^>]*>/i)?.[0] ?? "";
  if (!/data-title-en=["'][^"']+/.test(html) || !/data-title-vi=["'][^"']+/.test(html)) err(`${rel(f)}: <html> needs data-title-en and data-title-vi`);
  const en = (s.match(/data-l=["']en["']/g) || []).length, vi = (s.match(/data-l=["']vi["']/g) || []).length;
  if (en !== vi) err(`${rel(f)}: ${en} data-l="en" vs ${vi} data-l="vi" (every text needs both languages)`);
}

// 4. Journal is valid and bilingual
try {
  const entries = JSON.parse(fs.readFileSync(path.join(SITE, "journal", "entries.json"), "utf8"));
  if (!Array.isArray(entries) || !entries.length) err("entries.json must be a non-empty array");
  else entries.forEach((e, i) => {
    for (const k of ["title", "thought", "change"]) for (const l of ["en", "vi"]) {
      if (typeof e[k]?.[l] !== "string" || !e[k][l].trim()) err(`entries.json entry ${i}: missing "${k}.${l}"`);
    }
  });
} catch (e) { err(`entries.json cannot be read: ${e.message}`); }

// 5. Home page must link to the journal and the time-lapse
const home = fs.existsSync(path.join(SITE, "index.html")) ? fs.readFileSync(path.join(SITE, "index.html"), "utf8") : "";
if (!home) err("site/index.html is missing");
if (!/href=["']\/?journal\/?["']/.test(home)) err('The home page must link to "/journal/"');
if (!/href=["']\/?timelapse\/?["']/.test(home)) err('The home page must link to "/timelapse/"');

// 6. Open every page in a real browser: desktop in English, mobile in Vietnamese
const { server, url } = await startServer();
const browser = await launchBrowser();
const links = new Set();
const MODES = [
  ["desktop/en", { viewport: { width: 1280, height: 800 }, locale: "en-US" }],
  ["mobile/vi", { viewport: { width: 390, height: 844 }, locale: "vi-VN", isMobile: true, hasTouch: true }],
];
for (const f of pages) {
  const route = "/" + path.relative(SITE, f).split(path.sep).join("/").replace(/index\.html$/, "");
  for (const [name, opts] of MODES) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const where = `${route} (${name})`;
    page.on("pageerror", (e) => err(`${where}: JS error: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) err(`${where}: console.error: ${m.text()}`); });
    page.on("request", (r) => { if (!r.url().startsWith(url) && !/^(data|blob|about):/.test(r.url())) err(`${where}: calls out to ${r.url()}`); });
    page.on("response", (r) => { if (r.status() >= 400) err(`${where}: ${r.status()} ${r.url().replace(url, "")}`); });
    try {
      await page.goto(url + route, { waitUntil: "load", timeout: 15000 });
      await page.waitForTimeout(800);
      const lang = await page.evaluate(() => document.documentElement.getAttribute("data-lang"));
      const want = name.endsWith("vi") ? "vi" : "en";
      if (lang !== want) err(`${where}: language should be "${want}" but is "${lang}" (is /i18n.js loaded?)`);
      if (!(await page.$(".lang-switch"))) err(`${where}: language switch is missing`);
      if (name.startsWith("mobile")) {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 2) err(`${where}: page is ${overflow}px wider than a phone screen`);
      } else {
        for (const h of await page.$$eval("a[href]", (as) => as.map((a) => a.href))) {
          if (h.startsWith(url)) links.add(new URL(h).pathname);
        }
      }
    } catch (e) { err(`${where}: cannot open: ${e.message}`); }
    await ctx.close();
  }
}
for (const l of links) if (!resolveFile(l)) err(`Broken link: ${l}`);
await browser.close();
server.close();

const unique = [...new Set(errors)];
if (unique.length) {
  console.error(`\n✗ Check FAILED (${unique.length} problem${unique.length > 1 ? "s" : ""}):`);
  for (const e of unique) console.error("  - " + e);
  process.exit(1);
}
console.log(`✓ Check OK: ${pages.length} pages, ${files.length} files, ${(total / 1024).toFixed(0)} KB`);
