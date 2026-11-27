// Take a picture of the home page every day for the time-lapse (English version)
import fs from "node:fs";
import path from "node:path";
import { SITE, startServer, launchBrowser } from "./serve.mjs";

const entries = JSON.parse(fs.readFileSync(path.join(SITE, "journal", "entries.json"), "utf8"));
const e = entries[entries.length - 1];
const dir = path.join(SITE, "timelapse", "shots");
fs.mkdirSync(dir, { recursive: true });
const name = `day-${String(e.day).padStart(4, "0")}.jpg`;

const { server, url } = await startServer();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: "en-US" });
await page.goto(url + "/", { waitUntil: "load" });
await page.waitForTimeout(1500); // let animations settle
await page.screenshot({ path: path.join(dir, name), type: "jpeg", quality: 72 });
await browser.close();
server.close();

const listFile = path.join(SITE, "timelapse", "shots.json");
const list = JSON.parse(fs.readFileSync(listFile, "utf8")).filter((s) => s.day !== e.day);
list.push({ day: e.day, date: e.date, title: e.title, file: `shots/${name}` });
fs.writeFileSync(listFile, JSON.stringify(list, null, 2) + "\n");
console.log(`✓ Saved ${name}`);
