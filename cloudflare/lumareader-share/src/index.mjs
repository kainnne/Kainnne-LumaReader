const ALLOWED_ORIGIN = "https://lumareader.kainnne.com";
const READER_ORIGIN = "https://lumareader.kainnne.com";
const READER_PATH = "/web/";
const SHARE_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_TARGET_URL_LENGTH = 100_000;
const MAX_REQUEST_BYTES = 128 * 1024;
const SHARE_ID_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;
const SHARE_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const SOCIAL_IMAGE = "https://lumareader.kainnne.com/icon.png";
const DOWNLOADS = Object.freeze({
  macos: "https://github.com/kainnne/Kainnne-LumaReader/releases/download/v1.1.0/Kainnne-LumaReader-1.1.0-macOS-universal.dmg",
  windows: "https://github.com/kainnne/Kainnne-LumaReader/releases/download/v1.1.0/Kainnne-LumaReader-1.1.0-Windows-x64-Setup.exe",
});

function corsHeaders(origin) {
  if (origin !== ALLOWED_ORIGIN) return {};
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compactText(value, fallback, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim() || fallback;
  return text.slice(0, limit);
}

function validReaderTarget(value) {
  if (typeof value !== "string" || value.length > MAX_TARGET_URL_LENGTH) return null;
  try {
    const url = new URL(value);
    if (url.origin !== READER_ORIGIN || url.pathname !== READER_PATH || !url.hash.startsWith("#share=")) return null;
    return url.href;
  } catch {
    return null;
  }
}

function randomShareId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => SHARE_ID_ALPHABET[byte % SHARE_ID_ALPHABET.length]).join("");
}

async function unusedShareId(store) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = randomShareId();
    if (!(await store.get(`share:${id}`))) return id;
  }
  throw new Error("Unable to allocate a share id");
}

function sharePage({ requestUrl, target, title, description }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeTarget = escapeHtml(target);
  const safeUrl = escapeHtml(requestUrl);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta property="og:title" content="${safeTitle} · LumaReader">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:site_name" content="LumaReader">
  <meta property="og:image" content="${SOCIAL_IMAGE}">
  <meta property="og:image:width" content="1254">
  <meta property="og:image:height" content="1254">
  <meta property="og:image:alt" content="LumaReader application icon">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${safeTitle} · LumaReader">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${SOCIAL_IMAGE}">
  <meta http-equiv="refresh" content="0;url=${safeTarget}">
  <title>${safeTitle} · LumaReader</title>
  <style>
    :root{color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#fff2f7;color:#452735}
    body{min-height:100vh;margin:0;display:grid;place-items:center;background:radial-gradient(circle at 25% 20%,#ffd9e8,transparent 38%),#fff2f7}
    main{width:min(430px,calc(100vw - 48px));padding:32px;border:1px solid #e9bfd0;border-radius:24px;background:#fffafd;box-shadow:0 24px 72px #9d315c26;text-align:center}
    img{width:64px;height:64px;border-radius:18px;box-shadow:0 12px 30px #9d315c33}h1{margin:18px 0 8px;font-family:Georgia,serif;font-size:1.55rem}p{margin:0 0 22px;color:#8c6677;line-height:1.6}
    a{display:inline-flex;padding:11px 18px;border-radius:12px;background:#a83d68;color:white;font-weight:750;text-decoration:none}
  </style>
</head>
<body><main><img src="${SOCIAL_IMAGE}" alt=""><h1>${safeTitle}</h1><p>${safeDescription}</p><a href="${safeTarget}">Open in LumaReader</a></main></body>
</html>`;
}

async function createShare(request, env) {
  const origin = request.headers.get("Origin") || "";
  const cors = corsHeaders(origin);
  if (origin !== ALLOWED_ORIGIN) return json({ ok: false, error: "Origin is not allowed" }, 403, cors);
  if (!env.SHARE_LINKS) return json({ ok: false, error: "Share storage is unavailable" }, 503, cors);
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) return json({ ok: false, error: "Share payload is too large" }, 413, cors);

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return json({ ok: false, error: "Share payload is too large" }, 413, cors);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400, cors);
  }

  const target = validReaderTarget(body?.target);
  if (!target) return json({ ok: false, error: "Invalid LumaReader share target" }, 400, cors);
  const title = compactText(body?.title, "Shared Markdown", 120);
  const description = compactText(body?.description, "Open this Markdown document in LumaReader Web.", 220);
  const id = await unusedShareId(env.SHARE_LINKS);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SHARE_TTL_SECONDS * 1000).toISOString();
  await env.SHARE_LINKS.put(`share:${id}`, JSON.stringify({ target, title, description, createdAt, expiresAt }), { expirationTtl: SHARE_TTL_SECONDS });
  const url = new URL(request.url);
  return json({ ok: true, url: `${url.origin}/s/${id}`, expiresAt }, 201, { ...cors, "Cache-Control": "no-store" });
}

async function openShare(request, env, id) {
  if (!SHARE_ID_PATTERN.test(id) || !env.SHARE_LINKS) return new Response("Not found", { status: 404 });
  const record = await env.SHARE_LINKS.get(`share:${id}`, "json");
  if (!record?.target) return new Response("This LumaReader share link has expired.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(sharePage({ requestUrl: request.url, ...record }), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": "default-src 'none'; img-src https://lumareader.kainnne.com; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function downloadCounts(request, env) {
  const origin = request.headers.get("Origin") || "";
  const cors = corsHeaders(origin);
  if (origin && origin !== ALLOWED_ORIGIN) return json({ ok: false, error: "Origin is not allowed" }, 403, cors);
  if (!env.DOWNLOADS_DB) return json({ ok: false, error: "Download counter is unavailable" }, 503, cors);
  try {
    const result = await env.DOWNLOADS_DB.prepare(
      "SELECT platform, count FROM download_counts WHERE platform IN ('macos', 'windows')",
    ).all();
    const platforms = { macos: 0, windows: 0 };
    for (const row of result.results || []) {
      if (Object.hasOwn(platforms, row.platform)) platforms[row.platform] = Number(row.count) || 0;
    }
    return json({ ok: true, total: platforms.macos + platforms.windows, platforms }, 200, {
      ...cors,
      "Cache-Control": "no-store",
    });
  } catch {
    return json({ ok: false, error: "Download counter is unavailable" }, 503, cors);
  }
}

async function recordDownload(platform, env) {
  if (!DOWNLOADS[platform] || !env.DOWNLOADS_DB) return new Response("Download counter is unavailable", { status: 503 });
  try {
    await env.DOWNLOADS_DB.prepare(
      `INSERT INTO download_counts (platform, count, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(platform) DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP`,
    ).bind(platform).run();
  } catch {
    return new Response("Download counter is unavailable", { status: 503 });
  }
  return new Response(null, {
    status: 302,
    headers: { Location: DOWNLOADS[platform], "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS" && ["/api/shares", "/api/downloads"].includes(url.pathname)) {
      const origin = request.headers.get("Origin") || "";
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method === "POST" && url.pathname === "/api/shares") return createShare(request, env);
    if (request.method === "GET" && url.pathname === "/api/downloads") return downloadCounts(request, env);
    if (request.method === "GET" && url.pathname === "/d/macos") return recordDownload("macos", env);
    if (request.method === "GET" && url.pathname === "/d/windows") return recordDownload("windows", env);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "lumareader-share" }, 200, { "Cache-Control": "no-store" });
    const match = request.method === "GET" ? /^\/s\/([^/]+)$/.exec(url.pathname) : null;
    if (match) return openShare(request, env, match[1]);
    return new Response("Not found", { status: 404 });
  },
};
