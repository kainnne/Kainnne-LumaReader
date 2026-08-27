const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWebBridge(hash = "") {
  const storage = new Map();
  const location = { href: `https://example.test/web/${hash}`, origin: "https://example.test", pathname: "/web/", hash };
  const window = {
    addEventListener() {},
    fetch: async () => new Response("Not found", { status: 404 }),
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

test("the default web example is written in English", async () => {
  const window = loadWebBridge();
  await window.lumaWeb.ready;
  const response = await window.fetch(`/api/file?path=${encodeURIComponent("LumaReader Web.md")}`);
  const document = await response.json();

  assert.match(document.text, /^# LumaReader Web\n/);
  assert.match(document.text, /## Read your way/);
  assert.doesNotMatch(document.text, /[\u3400-\u9fff]/);
});
