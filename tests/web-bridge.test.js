const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWebBridge() {
  const storage = new Map();
  const location = { href: "https://example.test/web/", origin: "https://example.test", pathname: "/web/" };
  const window = {
    addEventListener() {},
    fetch: async () => new Response("Not found", { status: 404 }),
  };
  const context = vm.createContext({
    Blob,
    Request,
    Response,
    TextEncoder,
    URL,
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
