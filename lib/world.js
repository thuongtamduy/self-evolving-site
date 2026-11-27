// Shared pet ("the world"): one API used by everyone who visits.
// Used by the Cloudflare Pages Function (functions/api/world.js, backed by D1)
// and by the local test server (scripts/serve.mjs, backed by memory).
//
//   GET  /api/world                 -> { now, counters, last, recent, actions }
//   POST /api/world  {"action":"x"} -> { ok, now, counters, last, recent } | 429 { error, retryAfter }
//
// Allowed actions come from /shared/actions.json (editable by the AI), e.g.
//   { "actions": { "pet": { "cooldown": 10 }, "feed": { "cooldown": 300 } } }
// Everything is a counter: each successful action adds 1 to its counter and records the time.

const KEY = /^[a-z][a-z0-9_]{0,31}$/;
const MAX_ACTIONS = 64;
const MIN_COOLDOWN = 3;          // seconds, per visitor per action
const MAX_COOLDOWN = 7 * 86400;
const PER_MINUTE = 30;           // per visitor, across all actions
const RECENT = 20;

export function parseActions(json) {
  const out = {};
  const src = json && typeof json.actions === "object" ? json.actions : {};
  for (const [k, v] of Object.entries(src).slice(0, MAX_ACTIONS)) {
    if (!KEY.test(k)) continue;
    const cd = Math.round(Number(v?.cooldown ?? 10));
    out[k] = { cooldown: Math.min(MAX_COOLDOWN, Math.max(MIN_COOLDOWN, Number.isFinite(cd) ? cd : 10)) };
  }
  return out;
}

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function snapshot(store, actions, now) {
  const rows = await store.counters();
  const counters = {}, last = {};
  for (const k of Object.keys(actions)) { counters[k] = 0; last[k] = null; }
  for (const r of rows) if (r.key in actions) { counters[r.key] = r.value; last[r.key] = r.updated_at; }
  return { now, counters, last, recent: await store.recent(RECENT) };
}

/**
 * @param {Request} request
 * @param {object} store   adapter: counters(), recent(n), incr(key, now), addEvent(a, t, c),
 *                         getUntil(k), setUntil(k, until), getSalt(), cleanup(now)
 * @param {object} actions parsed actions
 * @param {{ ip: string, country?: string }} visitor
 */
export async function handleWorld(request, store, actions, visitor) {
  const now = Math.floor(Date.now() / 1000);

  if (request.method === "GET") {
    return json({ ...(await snapshot(store, actions, now)), actions: Object.keys(actions) });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405, { allow: "GET, POST" });

  // Same-origin only (browsers send Origin on POST)
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "forbidden" }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const action = typeof body?.action === "string" ? body.action : "";
  if (!(action in actions)) return json({ error: "unknown action" }, 400);

  // Visitors are identified only by a salted hash of their IP that changes daily
  const day = new Date().toISOString().slice(0, 10);
  const who = await sha256(`${await store.getSalt()}|${day}|${visitor.ip || "?"}`);

  const minuteKey = `${who}:m:${Math.floor(now / 60)}`;
  const perMinute = (await store.getUntil(minuteKey)) || 0;
  if (perMinute >= PER_MINUTE) return json({ error: "slow down", retryAfter: 60 - (now % 60) }, 429);

  const cdKey = `${who}:a:${action}`;
  const until = (await store.getUntil(cdKey)) || 0;
  if (until > now) return json({ error: "cooldown", retryAfter: until - now }, 429);

  await store.setUntil(cdKey, now + actions[action].cooldown);
  await store.setUntil(minuteKey, perMinute + 1);
  await store.incr(action, now);
  await store.addEvent(action, now, (visitor.country || "").slice(0, 2).toUpperCase());
  if (Math.random() < 0.05) await store.cleanup(now);

  return json({ ok: true, ...(await snapshot(store, actions, now)) });
}

// ---------- Storage adapters ----------

export const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0, updated_at INTEGER)",
  "CREATE TABLE IF NOT EXISTS limits (k TEXT PRIMARY KEY, v INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, a TEXT NOT NULL, t INTEGER NOT NULL, c TEXT)",
  "CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)",
];

export function d1Store(db) {
  return {
    async counters() { return (await db.prepare("SELECT key, value, updated_at FROM counters").all()).results; },
    async recent(n) {
      return (await db.prepare("SELECT a, t, c FROM events ORDER BY id DESC LIMIT ?").bind(n).all()).results;
    },
    async incr(key, now) {
      await db.prepare("INSERT INTO counters (key, value, updated_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET value = value + 1, updated_at = excluded.updated_at").bind(key, now).run();
    },
    async addEvent(a, t, c) { await db.prepare("INSERT INTO events (a, t, c) VALUES (?, ?, ?)").bind(a, t, c).run(); },
    async getUntil(k) { return (await db.prepare("SELECT v FROM limits WHERE k = ?").bind(k).first())?.v ?? 0; },
    async setUntil(k, v) {
      await db.prepare("INSERT INTO limits (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(k, v).run();
    },
    async getSalt() {
      const row = await db.prepare("SELECT v FROM meta WHERE k = 'salt'").first();
      if (row) return row.v;
      const salt = crypto.randomUUID();
      await db.prepare("INSERT OR IGNORE INTO meta (k, v) VALUES ('salt', ?)").bind(salt).run();
      return (await db.prepare("SELECT v FROM meta WHERE k = 'salt'").first()).v;
    },
    async cleanup(now) {
      await db.batch([
        db.prepare("DELETE FROM limits WHERE k LIKE '%:m:%' OR v < ?").bind(now - 86400),
        db.prepare("DELETE FROM events WHERE id <= (SELECT MAX(id) FROM events) - 500"),
      ]);
    },
  };
}

export function memoryStore() {
  const counters = new Map(), limits = new Map(), events = [];
  const salt = "local";
  return {
    async counters() { return [...counters].map(([key, v]) => ({ key, value: v.value, updated_at: v.updated_at })); },
    async recent(n) { return events.slice(-n).reverse(); },
    async incr(key, now) { const c = counters.get(key) || { value: 0 }; counters.set(key, { value: c.value + 1, updated_at: now }); },
    async addEvent(a, t, c) { events.push({ a, t, c }); },
    async getUntil(k) { return limits.get(k) || 0; },
    async setUntil(k, v) { limits.set(k, v); },
    async getSalt() { return salt; },
    async cleanup() {},
  };
}
