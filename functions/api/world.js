// Cloudflare Pages Function: /api/world (the shared pet). Logic lives in lib/world.js.
import { handleWorld, d1Store, parseActions } from "../../lib/world.js";

async function loadActions(env, request) {
  try {
    const res = await env.ASSETS.fetch(new URL("/shared/actions.json", request.url));
    return parseActions(res.ok ? await res.json() : {});
  } catch {
    return {};
  }
}

export async function onRequest({ request, env }) {
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "shared world not configured" }), {
      status: 503, headers: { "content-type": "application/json" },
    });
  }
  const actions = await loadActions(env, request);
  return handleWorld(request, d1Store(env.DB), actions, {
    ip: request.headers.get("cf-connecting-ip") || "",
    country: request.cf?.country || "",
  });
}
