const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWebBridge(hash = "", remoteFetch = async () => new Response("Not found", { status: 404 })) {
  const storage = new Map();
  const location = { href: `https://example.test/web/${hash}`, origin: "https://example.test", pathname: "/web/", hash };
  const window = {
    addEventListener() {},
    fetch: remoteFetch,
  };
  const context = vm.createContext({
    Blob,
    CompressionStream,
    DecompressionStream,
    Request,
    Response,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    URL,
    URLSearchParams,
    atob,
    btoa,
    clearTimeout,
    console,
    location,
    navigator: { language: "en" },
    setTimeout,
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, String(value)); },
    },
    window,
  });
  const source = fs.readFileSync(path.join(__dirname, "../site/web/web-bridge.js"), "utf8");
  vm.runInContext(source, context);
  return window;
}

function markdownFile(name) {
  return { name, type: "text/markdown", text: async () => `# ${name}\n` };
}

test("web session keeps three documents and queues the rest", async () => {
  const window = loadWebBridge();
  const result = await window.lumaWeb.importFiles([
    markdownFile("One.md"),
    markdownFile("Two.md"),
    markdownFile("Three.md"),
    markdownFile("Four.md"),
  ]);

  assert.equal(result.count, 3);
  assert.equal(result.limit, 3);
  assert.equal(result.pendingFiles.length, 1);
  assert.equal(result.pendingFiles[0].name, "Four.md");
  assert.equal(result.files.some((file) => file.webSample), false);

  const removed = window.lumaWeb.removeDocument("One.md");
  assert.equal(removed.ok, true);
  assert.equal(removed.count, 2);

  const resumed = await window.lumaWeb.importFiles(result.pendingFiles);
  assert.equal(resumed.count, 3);
  assert.equal(resumed.pendingFiles.length, 0);
  assert.equal(resumed.files.some((file) => file.name === "Four.md"), true);
});

test("web save remains in the session instead of downloading a copy", async () => {
  const window = loadWebBridge();
  await window.lumaWeb.importFiles([markdownFile("Draft.md")]);
  const result = await window.lumaDesktop.saveDocument({ path: "Draft.md", text: "# Revised\n" });

  assert.equal(result.ok, true);
  assert.equal(result.sessionOnly, true);
  assert.equal(result.downloaded, undefined);
  assert.equal(result.document.text, "# Revised\n");
});

test("web share links carry the current Markdown into a new reader", async () => {
  const sourceWindow = loadWebBridge();
  await sourceWindow.lumaWeb.ready;
  const shared = await sourceWindow.lumaWeb.createShareUrl({ name: "分享測試.md", text: "# 給朋友看的內容\n\nHello!\n" });

  assert.equal(shared.ok, true);
  assert.match(shared.url, /^https:\/\/example\.test\/web\/#share=/);

  const targetWindow = loadWebBridge(new URL(shared.url).hash);
  const ready = await targetWindow.lumaWeb.ready;
  assert.equal(ready.imported, true);
  assert.equal(targetWindow.lumaWeb.sessionInfo().count, 1);

  const response = await targetWindow.fetch(`/api/file?path=${encodeURIComponent("分享測試.md")}`);
  const document = await response.json();
  assert.equal(document.name, "分享測試.md");
  assert.equal(document.text, "# 給朋友看的內容\n\nHello!\n");
});

test("web sharing prefers the temporary Cloudflare short link", async () => {
  const window = loadWebBridge("", async (url, options) => {
    assert.equal(url, "https://lumareader-share.chaos60649.workers.dev/api/shares");
    assert.equal(options.method, "POST");
    const body = JSON.parse(options.body);
    assert.match(body.target, /^https:\/\/example\.test\/web\/#share=/);
    assert.equal(body.title, "Release Notes");
    assert.equal(body.description, "A concise summary for the preview.");
    return new Response(JSON.stringify({
      ok: true,
      url: "https://lumareader-share.chaos60649.workers.dev/s/Ab3xK9pq",
      expiresAt: "2026-09-26T00:00:00.000Z",
    }), { status: 201, headers: { "Content-Type": "application/json" } });
  });
  const shared = await window.lumaWeb.createShareUrl({
    name: "Release Notes.md",
    text: "# Release Notes\n\nA concise summary for the preview.\n",
  });

  assert.equal(shared.shortened, true);
  assert.equal(shared.url, "https://lumareader-share.chaos60649.workers.dev/s/Ab3xK9pq");
});

test("the default web example promotes Desktop in English and Traditional Chinese", async () => {
  const window = loadWebBridge();
  await window.lumaWeb.ready;
  const response = await window.fetch(`/api/file?path=${encodeURIComponent("LumaReader Web.md")}`);
  const document = await response.json();

  assert.match(document.text, /^# LumaReader Web\n/);
  assert.match(document.text, /## Start with LumaReader Desktop \/ 建議先下載 LumaReader 桌面版/);
  assert.match(document.text, /Download LumaReader Desktop \/ 下載 LumaReader 桌面版/);
  assert.match(document.text, /## Read your way \/ 用喜歡的方式閱讀/);
  assert.match(document.text, /不必將文件上傳到伺服器/);
});

test("sharing the unchanged built-in example reuses the permanent Web address", async () => {
  const window = loadWebBridge();
  await window.lumaWeb.ready;
  const response = await window.fetch(`/api/file?path=${encodeURIComponent("LumaReader Web.md")}`);
  const document = await response.json();
  const shared = await window.lumaWeb.createShareUrl({ name: document.name, text: document.text });

  assert.equal(shared.ok, true);
  assert.equal(shared.canonical, true);
  assert.equal(shared.url, "https://example.test/web/");
});

test("the Desktop download action sits beside Share Markdown in the Web toolbar", () => {
  const html = fs.readFileSync(path.join(__dirname, "../site/web/index.html"), "utf8");
  const shareIndex = html.indexOf('id="share-document"');
  const desktopIndex = html.indexOf('id="desktop-download"');
  const sourceIndex = html.indexOf('id="source-view"');

  assert.ok(shareIndex >= 0);
  assert.ok(desktopIndex > shareIndex);
  assert.ok(sourceIndex > desktopIndex);
  assert.match(html.slice(desktopIndex, sourceIndex), /href="\.\.\/#download"/);
  assert.doesNotMatch(html.match(/<div class="brand-row">[\s\S]*?<\/div>/)?.[0] || "", /web-home-link/);
});
