// Guard that runs after Claude is done:
//  - reverts every change outside the allowed area
//  - the journal may only gain exactly one entry; day/date are filled in here
//  - fails if nothing real changed today
import { execSync } from "node:child_process";
import fs from "node:fs";

const sh = (c) => execSync(c, { encoding: "utf8" });
const ENTRIES = "site/journal/entries.json";
const PROTECTED = [
  "site/_headers",
  "site/i18n.js",
  "site/i18n.css",
  "site/timelapse/",
  "site/journal/index.html",
  "site/journal/journal.js",
  "site/journal/journal.css",
];
const BILINGUAL = ["title", "thought", "change"];
const isProtected = (p) => PROTECTED.some((x) => (x.endsWith("/") ? p.startsWith(x) : p === x));
const allowed = (p) => p.startsWith("site/") && !isProtected(p);
const fail = (m) => { console.error("✗ " + m); process.exit(1); };

function changes() {
  // -z: paths are not escaped; renames carry two paths
  const parts = sh("git status --porcelain=v1 -uall -z").split("\0").filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const code = parts[i].slice(0, 2), p = parts[i].slice(3);
    out.push({ code, path: p });
    if (code[0] === "R" || code[0] === "C") out.push({ code: "D ", path: parts[++i] }); // original path
  }
  return out;
}

let blocked = 0;
for (const c of changes()) {
  if (allowed(c.path)) continue;
  const tracked = sh(`git ls-tree --name-only HEAD -- "${c.path}"`).trim() !== "";
  if (tracked) {
    sh(`git checkout HEAD -- "${c.path}"`);
    console.warn(`⚠ Reverted out-of-scope change: ${c.path}`);
    blocked++;
  } else if (c.path.startsWith("site/")) {
    fs.rmSync(c.path, { force: true });
    console.warn(`⚠ Removed out-of-scope new file: ${c.path}`);
    blocked++;
  } // untracked files outside site/ are ignored: they never get committed
}

// Journal: exactly one new entry appended at the end
const oldEntries = JSON.parse(sh(`git show HEAD:${ENTRIES}`));
let newEntries;
try { newEntries = JSON.parse(fs.readFileSync(ENTRIES, "utf8")); }
catch (e) { fail(`${ENTRIES} is not valid JSON: ${e.message}`); }

if (!Array.isArray(newEntries) || newEntries.length !== oldEntries.length + 1) {
  fail(`The journal must gain exactly 1 entry (before: ${oldEntries.length}, after: ${Array.isArray(newEntries) ? newEntries.length : "?"})`);
}
oldEntries.forEach((e, i) => {
  if (JSON.stringify(e) !== JSON.stringify(newEntries[i])) {
    console.warn(`⚠ Old journal entry #${i} was edited, restored`);
    newEntries[i] = e;
    blocked++;
  }
});

const entry = newEntries[newEntries.length - 1];
for (const k of BILINGUAL) {
  for (const lang of ["en", "vi"]) {
    if (typeof entry[k]?.[lang] !== "string" || !entry[k][lang].trim()) fail(`New journal entry is missing "${k}.${lang}"`);
  }
}
const last = oldEntries[oldEntries.length - 1];
entry.day = (Number.isInteger(last?.day) ? last.day : -1) + 1;
entry.date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
entry.title.en = entry.title.en.trim().slice(0, 120);
entry.title.vi = entry.title.vi.trim().slice(0, 120);
if (!Array.isArray(entry.files)) entry.files = [];
if (typeof entry.next !== "object" || entry.next === null) entry.next = { en: "", vi: "" };
delete entry.guard;
if (blocked) {
  entry.guard = {
    en: `The system blocked ${blocked} change(s) outside the allowed area.`,
    vi: `Hệ thống đã chặn ${blocked} thay đổi ngoài phạm vi cho phép.`,
  };
}
fs.writeFileSync(ENTRIES, JSON.stringify(newEntries, null, 2) + "\n");

// There must be a real change besides the journal
const real = changes().filter((c) => allowed(c.path) && c.path !== ENTRIES);
if (!real.length) fail("The AI changed nothing today except the journal.");

console.log(`✓ Guard OK. Day ${entry.day}: ${entry.title.en}`);
console.log(real.map((c) => `  ${c.code} ${c.path}`).join("\n"));
