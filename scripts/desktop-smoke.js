"use strict";

const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { version } = require("../package.json");
const { checkEditorBehavior } = require("./editor-behavior-smoke");
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
  const nestedName = "01-還沒寄出的喜帖-比對基準.md";
  const nestedParts = ["深入", "喜帖資料夾", ...Array.from({ length: 10 }, (_, index) => `L${String(index + 1).padStart(2, "0")}`)];
  const nestedRelative = [...nestedParts, nestedName].join("/");
  const nested = path.join(root, "folder-a", ...nestedParts, nestedName);
  const addedName = "同步新增測試.md";
  const added = path.join(root, "folder-a", "重新整理資料夾", addedName);
  const longCjk = "這是一段沒有空格而且必須隨視窗寬度換行的中文內容".repeat(60);
  const longAscii = "UnbrokenAsciiMarkdownToken".repeat(100);
  const longUrl = "https://example.test/" + "long-url-segment".repeat(120);
  const text = `# Release smoke test\n\n${longCjk}\n\n${longAscii}\n\n${longUrl}\n\n![Image](assets/portable%20image.png)\n`;
  const imageBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=", "base64");
  let child, browser, output = "";
  const launchers = [];
  const startedAt = Date.now();
  const apiEvents = [];
  let currentStage = "starting application";
  async function writeFailureDiagnostics(error) {
    const name = `${process.platform}-${label}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100);
    const directory = path.resolve("dist", "smoke-diagnostics", `${name}-${startedAt}`);
    await fs.mkdir(directory, { recursive: true });
    const summary = { label, version, stage: currentStage, error: error.stack || String(error), apiEvents };
    const capture = async (operation) => {
      try { return await Promise.race([operation(), delay(4000).then(() => ({ diagnosticTimeout: true }))]); }
      catch (failure) { return { diagnosticError: failure.message }; }
    };
    const openPages = browser?.contexts().flatMap((context) => context.pages()) || [];
    summary.pages = [];
    for (let index = 0; index < openPages.length; index += 1) {
      const failedPage = openPages[index];
      const details = await capture(() => failedPage.evaluate(() => {
        const describe = (element) => {
          if (!element) return null;
          const bounds = element.getBoundingClientRect(), css = getComputedStyle(element);
          return { tag: element.tagName, id: element.id, className: String(element.className), text: element.textContent?.slice(0, 180),
            bounds: bounds.toJSON(), hidden: element.hidden, disabled: element.disabled, display: css.display,
            visibility: css.visibility, pointerEvents: css.pointerEvents, position: css.position, zIndex: css.zIndex };
        };
        const refresh = document.querySelector("#refresh"), box = refresh?.getBoundingClientRect();
        return {
          url: location.href, innerWidth, innerHeight, outerWidth, outerHeight, screenX, screenY, scrollX, scrollY,
          screen: { width: screen.width, height: screen.height, availWidth: screen.availWidth, availHeight: screen.availHeight },
          devicePixelRatio, visibilityState: document.visibilityState, hasFocus: document.hasFocus(),
          bodyClass: document.body.className, activeElement: describe(document.activeElement),
          palette: describe(document.querySelector("#palette-menu")),
          sourceCheckbox: describe(document.querySelector('[data-toolbar-visibility="source"]')),
          refresh: describe(refresh), refreshCenterHit: box ? describe(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) : null,
          overlays: [...document.querySelectorAll('dialog[open], #onboarding, #boot-loader, .library-index-status, #sidebar-scrim')].map(describe),
          search: document.querySelector("#search")?.value,
          documentTitle: document.querySelector("#file-name")?.textContent,
          files: [...document.querySelectorAll(".file-button")].slice(0, 20).map((element) => ({ title: element.title, text: element.textContent })),
        };
      }));
      const bounds = await capture(async () => {
        const session = await failedPage.context().newCDPSession(failedPage);
        try { return await session.send("Browser.getWindowForTarget"); } finally { await session.detach(); }
      });
      const screenshot = await capture(() => failedPage.screenshot({ path: path.join(directory, `page-${index}.png`), timeout: 3500 }).then(() => "saved"));
      const markup = await capture(() => failedPage.content());
      if (typeof markup === "string") await fs.writeFile(path.join(directory, `page-${index}.html`), markup);
      summary.pages.push({ index, details, nativeWindow: bounds, screenshot });
    }
    await fs.writeFile(path.join(directory, "diagnostics.json"), JSON.stringify(summary, null, 2) + "\n");
    await fs.writeFile(path.join(directory, "app-output.log"), output);
    console.error(`[smoke] failure diagnostics: ${directory}`);
  }
  try {
    await fs.mkdir(path.join(root, "folder-a", "assets"), { recursive: true });
    await fs.mkdir(path.dirname(second), { recursive: true });
    await fs.writeFile(first, text);
    await fs.writeFile(second, "# Second document\n\nKeep unchanged.\n");
    await fs.mkdir(path.dirname(nested), { recursive: true });
    await fs.writeFile(nested, "# 喜帖比對基準\n\n深層中文文件必須出現在搜尋結果。\n");
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
    // Start with one explicit viewport on every runner. Later checks resize it deliberately.
    await page.setViewportSize({ width: 1360, height: 880 });
    await page.bringToFront();
    page.on("request", (request) => {
      if (new URL(request.url()).pathname !== "/api/files") return;
      apiEvents.push({ event: "request", url: request.url(), at: Date.now() - startedAt });
      if (apiEvents.length > 50) apiEvents.shift();
    });
    page.on("requestfailed", (request) => {
      if (new URL(request.url()).pathname !== "/api/files") return;
      apiEvents.push({ event: "failed", url: request.url(), failure: request.failure(), at: Date.now() - startedAt });
      if (apiEvents.length > 50) apiEvents.shift();
    });
    page.on("response", (response) => {
      if (new URL(response.url()).pathname !== "/api/files") return;
      apiEvents.push({ event: "response", url: response.url(), status: response.status(), at: Date.now() - startedAt });
      if (apiEvents.length > 50) apiEvents.shift();
    });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    async function settleLayout() {
      await page.evaluate(async () => {
        await document.fonts?.ready;
        // The app restores its reading anchor 240ms after a layout change.
        // Two frames can finish before that restore scrolls and closes a menu.
        // Observe actual geometry and scrolling until they remain quiet past
        // that debounce, with a deadline instead of extending action timeouts.
        const started = performance.now();
        let stableSince = started, previous = "";
        await new Promise((resolve, reject) => {
          const sample = () => {
            const now = performance.now();
            const geometry = [innerWidth, innerHeight, scrollX, scrollY, document.documentElement.scrollHeight];
            for (const selector of [".reader-bar", "#content", "#raw-source", "#source-editor"]) {
              const element = document.querySelector(selector), rect = element.getBoundingClientRect();
              geometry.push(rect.x, rect.y, rect.width, rect.height, element.scrollTop, element.scrollLeft);
            }
            const current = geometry.map((number) => Math.round(number * 100) / 100).join(",");
            if (current !== previous) { previous = current; stableSince = now; }
            if (now - stableSince >= 300) { resolve(); return; }
            if (now - started >= 5000) { reject(new Error(`Layout did not settle: ${current}`)); return; }
            requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
      });
    }
    async function reloadDocument() {
      await page.reload();
      await page.waitForSelector("#edit-document:not([hidden])");
      await page.waitForFunction(() => !document.body.classList.contains("booting"));
      await page.evaluate(async () => {
        await window.LumaReaderUI.ready;
        if (!document.querySelector("#onboarding").hidden) document.querySelector("#onboarding-skip").click();
      });
      await settleLayout();
    }
    async function waitForLibraryScan() {
      await page.waitForFunction(async () => {
        const response = await fetch("/api/files", { cache: "no-store" });
        if (!response.ok) return false;
        const data = await response.json();
        return data.scan?.complete === true && !data.scan.hasMore;
      }, null, { timeout: 20000, polling: 250 });
      await page.waitForFunction(() => !document.querySelector(".library-index-status"));
    }
    async function refreshLibrary() {
      // Both promises must be handled immediately. Otherwise a response timeout
      // escapes the catch/finally while click is still reporting an obstruction.
      const [response, click] = await Promise.allSettled([
        page.waitForResponse((response) => {
          const url = new URL(response.url());
          return url.pathname === "/api/files" && url.searchParams.get("refresh") === "1";
        }),
        page.locator("#refresh").click(),
      ]);
      if (click.status === "rejected") throw click.reason;
      if (response.status === "rejected") throw response.reason;
      assert.equal(response.value.status(), 200);
      await waitForLibraryScan();
    }
    async function assertWrap(selectors, context) {
      await settleLayout();
      const sizes = await page.evaluate((selectors) => selectors.map((selector) => {
        const element = document.querySelector(selector), style = getComputedStyle(element);
        return { selector, width: element.clientWidth, scrollWidth: element.scrollWidth,
          whiteSpace: style.whiteSpace, overflowWrap: style.overflowWrap,
          wrap: element instanceof HTMLTextAreaElement ? element.wrap : null };
      }), selectors);
      for (const size of sizes) {
        assert.ok(size.width > 0 && size.scrollWidth <= size.width + 2, `${context}: ${JSON.stringify(sizes)}`);
        if (size.selector === "#source-editor" || size.selector === "#raw-source") {
          assert.equal(size.whiteSpace, "pre-wrap", `${context}: ${JSON.stringify(size)}`);
          assert.equal(size.overflowWrap, "anywhere", `${context}: ${JSON.stringify(size)}`);
        }
        if (size.selector === "#source-editor") assert.equal(size.wrap, "soft");
      }
    }
    async function setPreview(enabled) {
      // Click the label at desktop width: its text can overlap the checkbox at mobile widths.
      await page.setViewportSize({ width: 1360, height: 880 });
      const toggle = page.locator("#editor-preview-toggle");
      if (await toggle.isChecked() !== enabled) await page.locator("#editor-preview-control").click();
      await page.waitForFunction((value) => document.querySelector("#editor-preview-toggle").checked === value, enabled);
      await page.waitForFunction(async (value) => (await window.lumaDesktop.getPreferences()).editorPreview === value, enabled);
      await page.waitForFunction((value) => document.body.classList.contains("editor-preview-enabled") === value, enabled);
      await settleLayout();
    }

    await page.waitForSelector("#edit-document:not([hidden])");
    await page.evaluate(async () => { await window.LumaReaderUI.ready; window.LumaReaderUI.startTour({ step: 4 }); });
    assert.match(await page.locator("#onboarding-copy").textContent(), /default|預設/);
    assert.match(await page.locator("#onboarding-copy").textContent(), /Linux/);
    await page.evaluate(() => document.querySelector("#onboarding-skip").click());
    await waitForLibraryScan();
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
    assert.ok(baseline.files.files.some((file) => file.path === nestedRelative), "The complete scan omitted the deep Chinese filename");
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

    currentStage = "deep folders, filename search, and refresh";
    console.log(`[smoke] ${label}: ${currentStage}`);
    const search = page.locator("#search");
    const nestedRow = page.locator(".file-button").filter({ hasText: nestedName });
    for (const query of [nestedName, "喜帖資料夾"]) {
      await search.fill(query);
      await nestedRow.waitFor({ state: "visible" });
      assert.equal(await nestedRow.getAttribute("title"), nestedRelative);
      const folders = await nestedRow.evaluate((button) => {
        const ancestors = []; let folder = button.closest("details.folder");
        while (folder) { ancestors.push(folder.open); folder = folder.parentElement.closest("details.folder"); }
        return ancestors;
      });
      assert.equal(folders.length, nestedParts.length);
      assert.ok(folders.every(Boolean), "Search did not expand every ancestor of the matching document");
    }
    await search.fill(addedName);
    await page.locator(".library-empty-hint").waitFor({ state: "visible" });
    assert.match(await page.locator(".library-empty-hint").textContent(), /Refresh|重新整理|刷新/);
    await fs.mkdir(path.dirname(added), { recursive: true });
    await fs.writeFile(added, "# A file created after the first scan\n");
    currentStage = "refresh discovers added file";
    await refreshLibrary();
    const addedRow = page.locator(".file-button").filter({ hasText: addedName });
    await addedRow.waitFor({ state: "visible" });
    await fs.unlink(added);
    currentStage = "refresh removes deleted file";
    await refreshLibrary();
    await addedRow.waitFor({ state: "detached" });
    await page.locator(".library-empty-hint").waitFor({ state: "visible" });
    await search.fill("");
    await page.locator(".file-button.active").waitFor({ state: "visible" });

    currentStage = "toolbar and preview preference migrations";
    console.log(`[smoke] ${label}: ${currentStage}`);
    // A v1.2 preference record upgrades once; later explicit choices must survive.
    await page.evaluate(() => window.lumaDesktop.setPreferences({
      readerDefaultsVersion: 4, editorPreview: false, readingMode: "vertical",
      toolbarVisibility: { source: false, media: false, exportPdf: true },
    }));
    await reloadDocument();
    await page.waitForFunction(async () => {
      const saved = await window.lumaDesktop.getPreferences();
      return saved.readerDefaultsVersion === 6 && saved.editorPreview === true && saved.toolbarVisibility.exportPdf === false;
    });
    await page.waitForFunction(() => document.querySelector("#export-pdf").dataset.userHidden === "true");
    await page.locator("#palette-toggle").click();
    const pdfCheckbox = page.locator('[data-toolbar-visibility="exportPdf"]');
    assert.equal(await pdfCheckbox.isChecked(), false);
    await pdfCheckbox.check();
    await page.waitForFunction(async () => (await window.lumaDesktop.getPreferences()).toolbarVisibility.exportPdf === true);
    await reloadDocument();
    await page.waitForSelector("#export-pdf:not([data-user-hidden])", { state: "visible" });
    await page.locator("#palette-toggle").click();
    await page.locator("#toolbar-reset").click();
    await page.waitForFunction(() => document.querySelector("#export-pdf").dataset.userHidden === "true");
    await page.keyboard.press("Escape");

    currentStage = "PDF footer prompt and cancellation";
    console.log(`[smoke] ${label}: ${currentStage}`);
    const footerChoices = ["LumaReader", "時光設計公司", ""];
    for (const footer of footerChoices) {
      // The actual successful-export write is covered by main-process tests. Here
      // only read preferences and cancel, so CI never opens an OS save dialog.
      await page.evaluate((pdfFooterText) => window.lumaDesktop.setPreferences({ pdfFooterText, pdfIncludeFooter: true, pdfColorFrame: true }), footer);
      await reloadDocument();
      await page.evaluate(() => document.querySelector("#export-pdf").click());
      await page.waitForSelector("#pdf-options-dialog[open]");
      const input = page.locator("#pdf-footer-text");
      assert.equal(await input.inputValue(), footer);
      const selection = await input.evaluate((element) => ({ start: element.selectionStart, end: element.selectionEnd, focused: document.activeElement === element }));
      assert.deepEqual(selection, { start: 0, end: footer.length, focused: true });
      await input.fill("Cancelled footer must not be saved");
      await page.locator('#pdf-options-dialog [value="cancel"]').click();
      await page.waitForSelector("#pdf-options-dialog[open]", { state: "detached" });
      await settleLayout();
      assert.equal(await page.evaluate(async () => (await window.lumaDesktop.getPreferences()).pdfFooterText), footer);
    }

    await checkEditorBehavior(page);

    currentStage = "long Chinese, ASCII, and URL wrapping";
    console.log(`[smoke] ${label}: ${currentStage}`);
    const widths = [1360, 900, 480];
    const wrapModes = [];
    await page.setViewportSize({ width: 1360, height: 880 });
    await settleLayout();
    await page.locator("#palette-toggle").click();
    await page.locator('[data-toolbar-visibility="source"]').check();
    await page.keyboard.press("Escape");
    for (const mode of ["rendered", "raw-source"]) {
      if (mode === "raw-source") await page.locator("#source-view").click();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 880 });
        await assertWrap([mode === "rendered" ? "#content" : "#raw-source"], `${mode}/${width}`);
      }
      wrapModes.push(mode);
      await page.setViewportSize({ width: 1360, height: 880 });
    }
    await page.locator("#source-view").click();
    await page.locator("#edit-document").click();
    assert.equal(await page.locator("#editor-preview-toggle").isChecked(), true, "The migrated editing preference must show live preview by default");
    await setPreview(false);
    // Nothing has been edited yet, so reload safely exercises persistent opt-out.
    await reloadDocument();
    await page.locator("#edit-document").click();
    assert.equal(await page.locator("#editor-preview-toggle").isChecked(), false, "A later explicit preview opt-out must remain off");
    await setPreview(true);
    const edited = text + "\nSaved from window A.\n";
    await page.locator("#source-editor").fill(edited);
    await page.waitForFunction(() => document.querySelector("#content").textContent.includes("Saved from window A."));
    for (const enabled of [true, false]) {
      await setPreview(enabled);
      for (const width of widths) {
        await page.setViewportSize({ width, height: 880 });
        await assertWrap(enabled ? ["#source-editor", "#content"] : ["#source-editor"], `editor-preview-${enabled}/${width}`);
        assert.equal(await page.locator("#source-editor").inputValue(), edited, "Soft wrapping must not insert characters into the saved Markdown");
      }
      wrapModes.push(enabled ? "editor-with-preview" : "editor-without-preview");
    }
    await setPreview(true);
    async function forward(file) {
      const launcher = spawn(executable, [file], { stdio: "ignore" });
      launchers.push(launcher);
      launcher.on("error", () => {});
      for (let i = 0; i < 150 && launcher.exitCode === null; i += 1) await delay(100);
      assert.notEqual(launcher.exitCode, null, "Second process did not hand off within 15 seconds");
    }
    currentStage = "independent windows and exact save isolation";
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
    return {
      label, version, markdownScanned: true, markdownOpened: true, relativeImageOpened: true,
      loopbackAuthentication: true, independentEditableWindows: true, exactSaveIsolation: true, duplicateFocused: true,
      deepChineseFilenameSearch: true, folderNameSearchExpandsAncestors: true, indexedFolderDepth: nestedParts.length,
      refreshFindsAddedAndRemovesDeletedFiles: true, emptySearchSuggestsRefresh: true,
      pdfHiddenDefaultAndPreferencePersisted: true, editorPreviewDefaultMigrated: true, editorPreviewExplicitOptOutPersisted: true,
      pdfFooterDialogRestoresSavedChoice: true, pdfFooterInputSelected: true, pdfCancelPreservesPreference: true,
      pdfFooterChoices: footerChoices, manualDefaultAppGuidance: true,
      formattingUndoRedo: true, insertSelectionVisible: true, unequalPaneTypingStable: true,
      longChineseAsciiAndUrlWrap: true, softWrapPreservesExactText: true, wrappingWidths: widths, wrappingModes: wrapModes,
      elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
    };
  } catch (error) {
    try { await writeFailureDiagnostics(error); }
    catch (diagnosticError) { console.error("Unable to save smoke diagnostics:", diagnosticError.message); }
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
