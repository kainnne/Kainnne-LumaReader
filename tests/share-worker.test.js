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

class FakeD1 {
  constructor(values = { macos: 0, windows: 0 }) { this.values = { ...values }; }
  prepare(sql) {
    const database = this;
    return {
      platform: null,
      bind(platform) { this.platform = platform; return this; },
      async all() {
        assert.match(sql, /SELECT platform, count/);
        return { results: Object.entries(database.values).map(([platform, count]) => ({ platform, count })) };
      },
      async run() {
        assert.match(sql, /ON CONFLICT\(platform\)/);
        database.values[this.platform] = (database.values[this.platform] || 0) + 1;
        return { success: true };
      },
    };
  }
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

test("download counter returns the combined macOS and Windows total", async () => {
  const handler = await worker();
  const response = await handler.fetch(new Request("https://lumareader-share.example/api/downloads", {
    headers: { Origin: "https://lumareader.kainnne.com" },
  }), { DOWNLOADS_DB: new FakeD1({ macos: 41, windows: 23 }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://lumareader.kainnne.com");
  assert.deepEqual(await response.json(), {
    ok: true,
    total: 64,
    platforms: { macos: 41, windows: 23 },
  });
});

test("download redirects increment one platform atomically", async () => {
  const handler = await worker();
  const database = new FakeD1();
  const response = await handler.fetch(new Request("https://lumareader-share.example/d/macos"), { DOWNLOADS_DB: database });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "https://github.com/kainnne/Kainnne-LumaReader/releases/download/v1.1.0/Kainnne-LumaReader-1.1.0-macOS-universal.dmg");
  assert.equal(database.values.macos, 1);
  assert.equal(database.values.windows, 0);
});

test("download endpoints fail closed when durable storage is unavailable", async () => {
  const handler = await worker();
  const response = await handler.fetch(new Request("https://lumareader-share.example/d/windows"), {});
  assert.equal(response.status, 503);
});
