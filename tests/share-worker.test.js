const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const test = require("node:test");

class FakeKv {
  constructor() { this.values = new Map(); }
  async get(key, type) {
    const value = this.values.get(key) ?? null;
    return value && type === "json" ? JSON.parse(value) : value;
  }
  async put(key, value, options) { this.values.set(key, value); this.lastPut = { key, value, options }; }
}

async function worker() {
  const url = pathToFileURL(path.join(__dirname, "../cloudflare/lumareader-share/src/index.mjs"));
  return (await import(url.href)).default;
}

test("share worker creates a temporary short link with CORS", async () => {
  const handler = await worker();
  const store = new FakeKv();
  const target = "https://lumareader.kainnne.com/web/#share=g.example";
  const response = await handler.fetch(new Request("https://lumareader-share.example/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://lumareader.kainnne.com" },
    body: JSON.stringify({ target, title: "Release Notes", description: "What changed in this version." }),
  }), { SHARE_LINKS: store });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://lumareader.kainnne.com");
  const payload = await response.json();
  assert.match(payload.url, /^https:\/\/lumareader-share\.example\/s\/[A-Za-z2-9]{8}$/);
  assert.equal(store.lastPut.options.expirationTtl, 30 * 24 * 60 * 60);
});

test("share worker renders document-specific social metadata", async () => {
  const handler = await worker();
  const store = new FakeKv();
  store.values.set("share:Ab3xK9pq", JSON.stringify({
    target: "https://lumareader.kainnne.com/web/#share=g.example",
    title: "Release Notes",
    description: "What changed in this version.",
  }));
  const response = await handler.fetch(new Request("https://lumareader-share.example/s/Ab3xK9pq"), { SHARE_LINKS: store });
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /property="og:title" content="Release Notes · LumaReader"/);
  assert.match(html, /property="og:description" content="What changed in this version\."/);
  assert.match(html, /http-equiv="refresh" content="0;url=https:\/\/lumareader\.kainnne\.com\/web\/#share=g\.example"/);
});

test("share worker rejects foreign origins and open redirects", async () => {
  const handler = await worker();
  const store = new FakeKv();
  const foreignOrigin = await handler.fetch(new Request("https://lumareader-share.example/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ target: "https://lumareader.kainnne.com/web/#share=g.example" }),
  }), { SHARE_LINKS: store });
  assert.equal(foreignOrigin.status, 403);

  const redirect = await handler.fetch(new Request("https://lumareader-share.example/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://lumareader.kainnne.com" },
    body: JSON.stringify({ target: "https://example.com/phishing" }),
  }), { SHARE_LINKS: store });
  assert.equal(redirect.status, 400);
});
