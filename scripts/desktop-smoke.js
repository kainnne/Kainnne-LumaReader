"use strict";

const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { version } = require("../package.json");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function stopOwnedProcess(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
  } else {
    child.kill("SIGTERM");
    for (let i = 0; i < 25 && child.exitCode === null; i += 1) await delay(100);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

async function runPackagedSmoke(executable, label = "Packaged application") {
  // Release smoke tests belong on an isolated runner, never an installed daily-use app.
  if (process.env.CI !== "true") throw new Error("Run packaged smoke tests in an isolated CI runner.");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "lumareader-release-smoke-"));
  const first = path.join(root, "folder-a", "閱讀 筆記.md");
  const second = path.join(root, "folder-b", "閱讀 筆記.md");
  const text = "# Release smoke test\n\n" + "換行測試 Markdown text wraps with the window. ".repeat(160) + "\n\n![Image](assets/portable%20image.png)\n";
  const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=", "base64");
  let child, browser, output = "";
  const launchers = [];
  const startedAt = Date.now();
  try {
    await fs.mkdir(path.join(root, "folder-a", "assets"), { recursive: true });
    await fs.mkdir(path.dirname(second), { recursive: true });
    await fs.writeFile(first, text);
    await fs.writeFile(second, "# Second document\n\nKeep unchanged.\n");
    await fs.writeFile(path.join(root, "folder-a", "assets", "portable image.png"), imageBytes);
    const port = await reservePort();
    child = spawn(executable, [`--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1", first], { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (data) => { output = (output + data).slice(-12000); });
    child.stderr.on("data", (data) => { output = (output + data).slice(-12000); });
    child.on("error", (error) => { output += error.message; });
    const deadline = Date.now() + 75000;
    while (Date.now() < deadline) {
      try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 1200 }); break; }
      catch { await delay(400); }
    }
    assert.ok(browser, `App did not start: ${output}`);
    const pages = () => browser.contexts().flatMap((context) => context.pages());
    while (!pages().length && Date.now() < deadline) await delay(100);
    const page = pages()[0];
    assert.ok(page, "App has no document window");
    page.setDefaultTimeout(20000);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.waitForSelector("#edit-document:not([hidden])");
    await page.evaluate(async () => { await window.LumaReaderUI.ready; window.LumaReaderUI.startTour({ step: 4 }); });
    assert.match(await page.locator("#onboarding-copy").textContent(), /default|預設/);
    await page.evaluate(() => document.querySelector("#onboarding-skip").click());
    const baseline = await page.evaluate(async () => ({
      health: await (await fetch("/api/health")).json(),
      files: await (await fetch("/api/files")).json(),
      root: document.querySelector("#library-root").textContent,
      active: document.querySelector(".file-button.active")?.textContent,
      origin: location.origin,
      node: typeof window.require,
    }));
    assert.equal(baseline.health.version, version);
    assert.equal(baseline.health.selected, true);
    assert.ok(baseline.files.files.some((file) => file.path === path.basename(first)));
    assert.ok(baseline.root.includes("folder-a"));
    assert.equal(baseline.active, path.basename(first));
    assert.equal(baseline.node, "undefined");
    assert.equal((await fetch(`${baseline.origin}/api/health`)).status, 403);
    const media = await page.evaluate(async (name) => {
      const query = new URLSearchParams({ path: "assets/portable%20image.png", from: name });
      const response = await fetch(`/api/media?${query}`);
      return { status: response.status, type: response.headers.get("content-type"), bytes: [...new Uint8Array(await response.arrayBuffer())] };
    }, path.basename(first));
    assert.equal(media.status, 200); assert.equal(media.type, "image/png"); assert.deepEqual(Buffer.from(media.bytes), imageBytes);

    // Exercise the real upgrade path, then verify a later explicit preference survives reload.
    await page.evaluate(() => window.lumaDesktop.setPreferences({ readerDefaultsVersion: 4, toolbarVisibility: { exportPdf: true } }));
    await page.reload();
    await page.waitForSelector("#edit-document:not([hidden])");
    await page.waitForFunction(() => document.querySelector("#export-pdf").dataset.userHidden === "true");
    await page.locator("#palette-toggle").click();
    const pdfCheckbox = page.locator('[data-toolbar-visibility="exportPdf"]');
    assert.equal(await pdfCheckbox.isChecked(), false);
    await pdfCheckbox.check();
    await page.waitForFunction(async () => (await window.lumaDesktop.getPreferences()).toolbarVisibility.exportPdf === true);
    await page.reload();
    await page.waitForSelector("#export-pdf:not([data-user-hidden])", { state: "visible" });
    await page.locator("#palette-toggle").click();
    await page.locator("#toolbar-reset").click();
    await page.waitForFunction(() => document.querySelector("#export-pdf").dataset.userHidden === "true");
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.querySelector("#onboarding-skip").click());
    await page.locator("#edit-document").click();
    const edited = text + "\nSaved from window A.\n";
    await page.locator("#source-editor").fill(edited);
    const widths = [];
    for (const width of [1360, 900, 480]) {
      await page.setViewportSize({ width, height: 880 });
      await delay(250);
      const sizes = await page.evaluate(() => ["#source-editor", "#content"].map((selector) => {
        const element = document.querySelector(selector);
        return { width: element.clientWidth, scrollWidth: element.scrollWidth };
      }));
      for (const size of sizes) assert.ok(size.width > 0 && size.scrollWidth <= size.width + 2, JSON.stringify(sizes));
      widths.push(width);
    }
    async function forward(file) {
      const launcher = spawn(executable, [file], { stdio: "ignore" });
      launchers.push(launcher);
      launcher.on("error", () => {});
      for (let i = 0; i < 150 && launcher.exitCode === null; i += 1) await delay(100);
      assert.notEqual(launcher.exitCode, null, "Second process did not hand off within 15 seconds");
    }
    await forward(second);
    for (let i = 0; i < 100 && pages().length < 2; i += 1) await delay(100);
    const pageB = pages().find((item) => item !== page);
    assert.ok(pageB); await pageB.waitForSelector("#edit-document:not([hidden])");
    assert.ok((await pageB.locator("#library-root").textContent()).includes("folder-b"));
    assert.equal(await page.locator("#source-editor").inputValue(), edited);
    await page.bringToFront();
    await page.evaluate(() => document.querySelector("#onboarding-skip").click());
    await page.locator("#edit-document").click();
    for (let i = 0; i < 100 && await fs.readFile(first, "utf8") !== edited; i += 1) await delay(100);
    assert.equal(await fs.readFile(first, "utf8"), edited);
    assert.equal(await fs.readFile(second, "utf8"), "# Second document\n\nKeep unchanged.\n");
    await forward(first); await delay(400); assert.equal(pages().length, 2);
    assert.deepEqual(pageErrors, []);
    return { label, version, markdownScanned: true, markdownOpened: true, relativeImageOpened: true, loopbackAuthentication: true, independentEditableWindows: true, exactSaveIsolation: true, duplicateFocused: true, pdfHiddenDefaultAndPreferencePersisted: true, manualDefaultAppGuidance: true, wrappingWidths: widths, elapsedSeconds: Math.round((Date.now() - startedAt) / 1000) };
  } catch (error) {
    if (output) process.stderr.write(output + "\n");
    throw error;
  } finally {
    for (const launcher of launchers) await stopOwnedProcess(launcher);
    await stopOwnedProcess(child);
    if (browser) await Promise.race([browser.close().catch(() => {}), delay(3000)]);
    await fs.rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  }
}

if (require.main === module) {
  runPackagedSmoke(path.resolve(process.argv[2]), process.argv[3]).then(async (result) => {
    if (process.argv[4]) await fs.writeFile(process.argv[4], JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => { console.error(error); process.exitCode = 1; });
}
module.exports = { runPackagedSmoke };
