"use strict";

// Optional browser integration test. Pass a local Chromium executable as argv[2]
// or use Playwright's installed browser. No desktop application is launched.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");
const repository = path.resolve(__dirname, "..");
const mime = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml" };

async function main() {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      const web = url.pathname.startsWith("/web/");
      const root = path.join(repository, web ? "site/web" : "renderer");
      const relative = (web ? url.pathname.slice(5) : url.pathname.slice(1)) || "index.html";
      const file = path.resolve(root, relative);
      if (!file.startsWith(`${root}${path.sep}`)) throw new Error("Outside test root");
      let body = await fs.readFile(file);
      if (relative === "index.html") {
        let html = body.toString("utf8");
        if (!html.includes('src="library-search.js"')) html = html.replace('<script src="app.js"', '<script src="library-search.js"></script><script src="app.js"');
        if (!html.includes('href="library-ui.css"')) html = html.replace("</head>", '<link rel="stylesheet" href="library-ui.css"></head>');
        body = Buffer.from(html);
      }
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.argv[2] ? { executablePath: process.argv[2] } : {}) });
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem("lumareader-language", "zh-Hant");
      localStorage.setItem("lumareader-language-prompt-seen", "true");
      localStorage.setItem("lumareader-onboarding-version", "999");
    });
    const record = (filePath) => ({ path: filePath, name: filePath.split("/").pop(), extension: ".md", ext: ".md", kind: "markdown", size: 10 });
    const target = "婚禮/比對資料/01-還沒寄出的喜帖-比對基準.md";
    const first = record("起始文件.md");
    const files = [first, record(target), ...Array.from({ length: 320 }, (_, i) => record(`婚禮/比對資料/筆記-${i}.md`)), ...Array.from({ length: 3_000 }, (_, i) => record(`資料-${i % 60}/子資料夾/文件-${i}.md`))];
    let calls = 0, generation = 1, emptyStart = false;
    await page.route("**/api/files?**", async (route) => {
      const url = new URL(route.request().url());
      calls += 1;
      if (url.searchParams.get("refresh") === "1") generation += 1;
      const firstBatch = calls === 1;
      const status = generation === 2 ? "partial" : generation > 2 ? "complete" : firstBatch ? "scanning" : calls === 2 ? "waiting" : "complete";
      const records = generation > 2 ? [first] : generation === 2 ? [first] : firstBatch ? (emptyStart ? [] : [first]) : calls === 2 ? (emptyStart ? files : files.slice(1)) : [];
      await route.fulfill({ json: { root: "/test-library", files: records, types: [], nextCursor: generation > 1 ? 1 : firstBatch ? (emptyStart ? 0 : 1) : files.length, reset: firstBatch || generation > 1, scan: { id: `scan-${generation}`, status, complete: status === "complete", hasMore: status === "scanning" || status === "waiting", filesFound: generation > 1 ? 1 : firstBatch ? (emptyStart ? 0 : 1) : files.length, retryAfterMs: 500, issues: generation === 2 ? [{ path: "雲端資料", code: "EACCES" }] : [] } } });
    });
    await page.route("**/api/file?**", (route) => route.fulfill({ json: { ...first, sourceType: "project", text: "# Fixture", renderText: "# Fixture" } }));
    await page.route("**/api/meta?**", (route) => route.fulfill({ json: { modifiedNs: null } }));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForSelector('.library-index-status[data-status="waiting"]');
    assert.ok((await page.locator("#files-panel *").count()) < 1_000, "Closed folders must not construct thousands of descendants");
    await page.waitForSelector(".library-index-status", { state: "detached" });
    assert.equal(calls, 3, "The scan must stop polling when complete");
    await page.locator("#language").selectOption("zh-Hant", { force: true });
    await page.locator("#search").fill("婚禮");
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#files-panel .file-button").count(), 250);
    assert.equal(await page.locator("#files-panel details[open]").count(), 2);
    await page.locator(".library-search-more").click();
    assert.equal(await page.locator("#files-panel .file-button").count(), 321);
    await page.locator("#search").fill("還沒寄出的喜帖");
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#files-panel .file-button").count(), 1);
    assert.equal(await page.locator("#files-panel .file-button").getAttribute("title"), target);
    await page.locator("#search").fill("不存在的文件");
    await page.waitForTimeout(200);
    assert.match(await page.locator(".library-empty-hint").textContent(), /重新整理/);
    await page.locator("#refresh").click();
    await page.waitForSelector('.library-index-status[data-status="partial"]');
    assert.match(await page.locator(".library-index-status").textContent(), /尚未讀取成功/);
    await page.locator("#refresh").click();
    await page.waitForSelector(".library-index-status", { state: "detached" });
    await page.locator("#search").fill("婚禮");
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#files-panel .file-button").count(), 0, "Refresh must remove vanished records");
    await page.evaluate(() => localStorage.removeItem("lumareader-last-document"));
    emptyStart = true; calls = 0; generation = 1;
    await page.goto(`http://127.0.0.1:${server.address().port}/?empty-start=1`);
    await page.waitForSelector('.library-index-status[data-status="waiting"]');
    await page.waitForSelector(".library-index-status", { state: "detached" });
    assert.match(await page.locator("#content").textContent(), /Choose a document|文件已準備好/, "An initially empty batch must later invite the user to choose indexed files");
    await page.goto(`http://127.0.0.1:${server.address().port}/web/`);
    await page.waitForSelector("#files-panel .file-remove-button");
    assert.equal(await page.locator("#files-panel .file-button").count(), 1);
    assert.equal(await page.locator("#files-panel .file-remove-button").count(), 1, "Web session remove control must remain available");
    await page.locator("#search").fill("LumaReader Web");
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#files-panel .file-button").count(), 1);
    await page.locator("#search").fill("missing-session-file");
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#files-panel .file-button").count(), 0);
    assert.match(await page.locator(".library-empty-hint").textContent(), /session|目前已開啟/);
    await page.locator("#search").fill("");
    await page.locator("#new-markdown").click();
    await page.locator("#new-markdown-name").fill("新索引文件");
    await page.locator("#new-markdown-create").click();
    await page.waitForSelector("#new-markdown-dialog", { state: "hidden" });
    await page.locator("#search").fill("新索引文件");
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#files-panel .file-button").count(), 1, "New documents must immediately enter the index");
    await page.locator("#files-panel .file-remove-button").click();
    await page.locator("#session-dialog-confirm").click();
    await page.waitForSelector("#session-dialog", { state: "hidden" });
    assert.equal(await page.locator("#files-panel .file-button").count(), 0, "A removed document must disappear from search");
    await page.locator("#search").fill("");
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#files-panel .file-button").count(), 0, "An empty session must not retain old indexed records");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, fixtureDocuments: files.length, requests: calls, checked: ["incremental continuation", "waiting and partial status", "lazy folder DOM", "250-result paging", "folder expansion", "Chinese search", "refresh removal", "empty-state hint", "empty initial batch completion", "Web session create/remove/empty-index lifecycle"] }));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
