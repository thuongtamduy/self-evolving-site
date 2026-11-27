// Screenshots every page so the AI can LOOK at what it built (desktop/EN and mobile/VI).
// Output: .preview/<page>--desktop-en.png and .preview/<page>--mobile-vi.png (git-ignored)
import fs from "node:fs";
import path from "node:path";
import { SITE, startServer, launchBrowser } from "./serve.mjs";

const OUT = path.resolve(".preview");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}
// Only pass page paths as arguments to preview just those: npm run preview -- /garden/
const only = process.argv.slice(2);
const pages = walk(SITE)
  .filter((f) => f.endsWith(".html") && !f.includes(`${path.sep}timelapse${path.sep}shots`))
  .map((f) => "/" + path.relative(SITE, f).split(path.sep).join("/").replace(/index\.html$/, ""))
  .filter((r) => !only.length || only.includes(r));

const MODES = [
  ["desktop-en", { viewport: { width: 1280, height: 800 }, locale: "en-US" }],
  ["mobile-vi", { viewport: { width: 390, height: 844 }, locale: "vi-VN", isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
];

const { server, url } = await startServer();
const browser = await launchBrowser();
for (const route of pages) {
  const slug = route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/[/.]/g, "-");
  for (const [mode, opts] of MODES) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(url + route, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const file = path.join(OUT, `${slug}--${mode}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(path.relative(process.cwd(), file));
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log("\nOpen each image with the Read tool and look at it critically before finishing.");
