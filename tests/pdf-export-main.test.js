"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");
const { createRequire } = require("node:module");
const { LocalReaderService } = require("../src/local-server");

const pdfBytes = Buffer.from("%PDF-1.7\nLumaReader export fixture\n%%EOF\n");

async function createHarness(t, preferences = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "luma-pdf-main-test-"));
  const settingsPath = path.join(root, "settings.json");
  fs.writeFileSync(settingsPath, JSON.stringify({ libraryRoot: null, preferences }));
  for (const folder of ["a", "b"]) {
    fs.mkdirSync(path.join(root, folder));
    fs.writeFileSync(path.join(root, folder, "document.md"), `# ${folder}\n`);
  }
  const app = new EventEmitter();
  let becomeReady;
  app.whenReady = () => new Promise((resolve) => { becomeReady = resolve; });
  app.setName = app.setPath = app.setAppUserModelId = app.quit = app.exit = () => {};
  app.getPath = () => root;
  app.requestSingleInstanceLock = () => true;
  app.setAsDefaultProtocolClient = () => { throw new Error("Default registration is outside PDF export."); };

  const windows = [];
  const handlers = new Map();
  const saveReplies = [];
  const saveRequests = [];
  const startupErrors = [];
  let nextPort = 17000;
  class Window extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.destroyed = false;
      this.printRequests = [];
      this.webContents = new EventEmitter();
      this.webContents.id = windows.length + 1;
      this.webContents.mainFrame = { url: "" };
      this.webContents.session = {
        setPermissionRequestHandler() {}, setPermissionCheckHandler() {},
        webRequest: { onBeforeSendHeaders() {} },
      };
      this.webContents.setWindowOpenHandler = this.webContents.send = () => {};
      this.webContents.printToPDF = async (options) => {
        this.printRequests.push(options);
        if (this.printError) throw this.printError;
        return pdfBytes;
      };
      windows.push(this);
    }
    async loadURL(url) { this.url = url; this.webContents.mainFrame.url = url; }
    isDestroyed() { return this.destroyed; }
    isMinimized() { return false; }
    restore() {}
    show() {}
    focus() {}
    setTitle() {}
    destroy() { if (!this.destroyed) { this.destroyed = true; this.emit("closed"); } }
    static getFocusedWindow() { return windows[0]; }
  }
  class Service extends LocalReaderService {
    async listen() { this.port = nextPort++; return this.port; }
    async close() {}
  }
  const electron = {
    app, BrowserWindow: Window,
    dialog: {
      showErrorBox(_title, message) { startupErrors.push(message); },
      async showSaveDialog(window, options) {
        saveRequests.push({ window, options });
        assert.ok(saveReplies.length, "The test must provide an explicit native save-dialog result.");
        return saveReplies.shift();
      },
    },
    ipcMain: { handle: (name, callback) => handlers.set(name, callback) },
    Menu: { buildFromTemplate: (template) => template, setApplicationMenu() {} },
    shell: { openExternal() {} },
  };
  const mainPath = path.resolve(__dirname, "../src/main.js");
  const requireMain = createRequire(mainPath);
  const context = vm.createContext({
    require: (name) => name === "electron" ? electron : name === "./local-server" ? { LocalReaderService: Service } : requireMain(name),
    __dirname: path.dirname(mainPath), process: { argv: ["electron"], platform: "darwin", env: {} },
    URL, Map, Set, Promise, Buffer, Uint8Array, console, setTimeout, clearTimeout,
  });
  t.after(async () => {
    windows.forEach((window) => window.destroy());
    await new Promise((resolve) => setImmediate(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });
  vm.runInContext(fs.readFileSync(mainPath, "utf8"), context, { filename: mainPath });
  for (const folder of ["a", "b"]) app.emit("open-file", { preventDefault() {} }, path.join(root, folder, "document.md"));
  becomeReady();
  for (let tries = 0; tries < 100 && !windows[1]?.url; tries++) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(startupErrors, []);
  assert.equal(windows.length, 2);
  assert.ok(windows[1].url);
  const event = (window) => ({ sender: window.webContents, senderFrame: window.webContents.mainFrame });
  const invoke = (name, index, payload) => handlers.get(name)(event(windows[index]), payload);
  return { root, windows, saveReplies, saveRequests, invoke, storedPreferences: () => JSON.parse(fs.readFileSync(settingsPath, "utf8")).preferences };
}

test("canceling native PDF save keeps the existing footer and does not print", async (t) => {
  const h = await createHarness(t, { pdfFooterText: "原有公司" });
  h.saveReplies.push({ canceled: true });
  const result = await h.invoke("document:export-pdf", 0, { name: "document.md", footerText: "未確認的公司" });
  assert.equal(result.canceled, true);
  assert.equal(h.windows[0].printRequests.length, 0);
  assert.equal(h.storedPreferences().pdfFooterText, "原有公司");
  assert.equal((await h.invoke("preferences:get", 1)).pdfFooterText, "原有公司");
});

test("successful PDF export escapes company names and shares custom and blank footers across open windows", async (t) => {
  const h = await createHarness(t, { pdfFooterText: "Previous company" });
  const firstOutput = path.join(h.root, "custom.pdf");
  h.saveReplies.push({ canceled: false, filePath: firstOutput });
  const custom = '可愛 & <公司> "Z"';
  const first = await h.invoke("document:export-pdf", 0, { name: "document.md", footerText: `  ${custom}  `, includeFooter: true });
  assert.equal(first.ok, true);
  assert.deepEqual(fs.readFileSync(firstOutput), pdfBytes);
  assert.equal(h.saveRequests[0].window, h.windows[0]);
  assert.equal(h.windows[1].printRequests.length, 0);
  const options = h.windows[0].printRequests[0];
  assert.equal(options.printBackground, true);
  assert.equal(options.displayHeaderFooter, true);
  assert.equal(options.preferCSSPageSize, true);
  assert.match(options.footerTemplate, /可愛 &amp; &lt;公司&gt;/);
  assert.ok(!options.footerTemplate.includes("<公司>"));
  assert.equal(h.storedPreferences().pdfFooterText, custom);
  assert.equal((await h.invoke("preferences:get", 1)).pdfFooterText, custom);

  const blankOutput = path.join(h.root, "blank.pdf");
  h.saveReplies.push({ canceled: false, filePath: blankOutput });
  const blank = await h.invoke("document:export-pdf", 1, { name: "document.md", footerText: "" });
  assert.equal(blank.ok, true);
  assert.deepEqual(fs.readFileSync(blankOutput), pdfBytes);
  assert.equal(h.storedPreferences().pdfFooterText, "");
  assert.equal((await h.invoke("preferences:get", 0)).pdfFooterText, "");
  assert.ok(!(h.windows[1].printRequests[0].footerTemplate || "").includes("LumaReader"));
  assert.ok(!(h.windows[1].printRequests[0].footerTemplate || "").includes("可愛"));

  // Window A existed before either change. An omitted footer must use the new
  // global blank choice, not A's stale initial copy or the brand default.
  h.saveReplies.push({ canceled: false, filePath: path.join(h.root, "blank-again.pdf") });
  assert.equal((await h.invoke("document:export-pdf", 0, { name: "document.md" })).ok, true);
  assert.ok(!(h.windows[0].printRequests[1].footerTemplate || "").includes("LumaReader"));
  assert.equal(h.storedPreferences().pdfFooterText, "");
});

test("failed PDF printing or writing does not replace the saved company preference", async (t) => {
  const h = await createHarness(t, { pdfFooterText: "Saved company" });
  h.windows[0].printError = new Error("Printing failed for this test");
  h.saveReplies.push({ canceled: false, filePath: path.join(h.root, "failed.pdf") });
  const failedPrint = await h.invoke("document:export-pdf", 0, { name: "document.md", footerText: "Unsaved" });
  assert.equal(failedPrint.ok, false);
  assert.equal(h.storedPreferences().pdfFooterText, "Saved company");
  assert.equal(fs.existsSync(path.join(h.root, "failed.pdf")), false);

  h.saveReplies.push({ canceled: false, filePath: h.root });
  const failedWrite = await h.invoke("document:export-pdf", 1, { name: "document.md", footerText: "Also unsaved" });
  assert.equal(failedWrite.ok, false);
  assert.equal(h.storedPreferences().pdfFooterText, "Saved company");
  assert.equal((await h.invoke("preferences:get", 0)).pdfFooterText, "Saved company");
});

test("the initial PDF footer is LumaReader and is remembered only after a successful export", async (t) => {
  const h = await createHarness(t);
  h.saveReplies.push({ canceled: false, filePath: path.join(h.root, "default.pdf") });
  const result = await h.invoke("document:export-pdf", 0, { name: "document.md" });
  assert.equal(result.ok, true);
  assert.match(h.windows[0].printRequests[0].footerTemplate, />LumaReader</);
  assert.equal(h.windows[0].printRequests[0].displayHeaderFooter, false);
  assert.equal(h.storedPreferences().pdfFooterText, "LumaReader");
  assert.equal((await h.invoke("preferences:get", 1)).pdfFooterText, "LumaReader");
});

test("PDF style options default to plain and persist independently without erasing the footer name", async (t) => {
  const h = await createHarness(t, {pdfFooterText:"原有公司"});
  const initial = await h.invoke("preferences:get",0);
  assert.equal(initial.pdfIncludeFooter,false);
  assert.equal(initial.pdfColorFrame,false);
  for(const [includeFooter,colorFrame] of [[false,false],[true,false],[false,true],[true,true]]){
    h.saveReplies.push({canceled:false,filePath:path.join(h.root,`style-${includeFooter}-${colorFrame}.pdf`)});
    const result=await h.invoke("document:export-pdf",0,{name:"document.md",footerText:"原有公司",includeFooter,colorFrame});
    assert.equal(result.ok,true);
    assert.equal(h.windows[0].printRequests.at(-1).displayHeaderFooter,includeFooter);
    const saved=await h.invoke("preferences:get",1);
    assert.equal(saved.pdfFooterText,"原有公司");
    assert.equal(saved.pdfIncludeFooter,includeFooter);
    assert.equal(saved.pdfColorFrame,colorFrame);
  }
  h.saveReplies.push({canceled:true});
  await h.invoke("document:export-pdf",1,{footerText:"Not saved",includeFooter:false,colorFrame:false});
  assert.equal(h.storedPreferences().pdfIncludeFooter,true);
  assert.equal(h.storedPreferences().pdfColorFrame,true);
  h.windows[1].printError=new Error("Failed print");
  h.saveReplies.push({canceled:false,filePath:path.join(h.root,"failed-style.pdf")});
  await h.invoke("document:export-pdf",1,{footerText:"Not saved",includeFooter:false,colorFrame:false});
  assert.equal(h.storedPreferences().pdfIncludeFooter,true);
  assert.equal(h.storedPreferences().pdfColorFrame,true);
});
