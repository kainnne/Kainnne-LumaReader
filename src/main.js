"use strict";

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const packageMetadata = require("../package.json");
const { LocalReaderService } = require("./local-server");
const { markdownSources, sourceFromFileArgument } = require("./open-target");
const { fileURLToPath, pathToFileURL } = require("node:url");
const { DocumentWindows } = require("./document-windows");
const { normalizeFooterText, pdfOptions } = require("./pdf-export");

const PREVIEW_BUILD = packageMetadata.lumareaderPreview === true || packageMetadata.lumareaderPreview === "true";
const PROTOCOL = PREVIEW_BUILD ? "kainnne-lumareader-preview" : "kainnne-lumareader";
const APP_ID = PREVIEW_BUILD ? "com.kainnne.lumareader.candidate" : "com.kainnne.lumareader";
const APP_TITLE = PREVIEW_BUILD ? "LumaReader Candidate" : "Kainnne LumaReader";
const PREFERENCE_KEYS = new Set([
  "appMode",
  "editorPreview",
  "pdfFooterText",
  "editorSplitRatio",
  "fontSize",
  "formatSelections",
  "language",
  "languagePromptSeen",
  "lastDocumentPath",
  "onboardingVersion",
  "palette",
  "pagedDirection",
  "readingMode",
  "readerDefaultsVersion",
  "rightPanelOpen",
  "rightPanelTab",
  "sidebarCollapsed",
  "sidebarWidth",
  "textFormatSelections",
  "theme",
  "toolbarVisibility",
]);

app.setName(APP_TITLE);
app.setPath("userData", path.join(app.getPath("appData"), APP_TITLE));

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

let settingsPath = null;
let settings = { libraryRoot: null, preferences: {} };
let settingsWrite = Promise.resolve();
let ready = false;
const pendingSources = [];
const contexts = new Map();
const closingServices = new Set();
const documents = new DocumentWindows({ maxWindows: 8 });
const CREATE_DESTINATION_TTL_MS = 10 * 60 * 1000;
let openQueue = Promise.resolve();

function focusedContext() {
  return contexts.get(BrowserWindow.getFocusedWindow()?.webContents.id) || contexts.values().next().value;
}
function contextFor(event) {
  const context = contexts.get(event.sender.id);
  if (!context || event.senderFrame !== event.sender.mainFrame) throw new Error("This request is not allowed.");
  const url = new URL(event.senderFrame.url);
  if (url.origin !== context.origin || !["/", "/index.html"].includes(url.pathname)) throw new Error("This request is not allowed.");
  return context;
}
function handle(channel, callback) {
  ipcMain.handle(channel, (event, ...args) => callback(contextFor(event), event, ...args));
}
function focusWindow(window) {
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

function sourceFromProtocol(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== `${PROTOCOL}:`) return null;
    return url.searchParams.get("source") || "";
  } catch {
    return null;
  }
}

// OS associations are declared by the release bundle. Never rewrite them at launch.
function openSource(source) {
  if (typeof source !== "string" || !source) return false;
  if (!ready) {
    if (!pendingSources.includes(source) && pendingSources.length < 8) pendingSources.push(source);
    return true;
  }
  openQueue = openQueue.then(() => openDocumentWindow(source)).catch((error) => {
    dialog.showErrorBox("Unable to open document", error.message || String(error));
  });
  return true;
}

function openEmptyWindow() {
  openQueue = openQueue.then(() => {
    const context = focusedContext();
    return context ? focusWindow(context.window) : createWindow();
  }).catch((error) => dialog.showErrorBox("Unable to open window", error.message));
}

async function openDocumentWindow(source) {
  const target = await documents.resolve(source);
  const existing = documents.find(target.key);
  if (existing) { focusWindow(existing.window); return existing; }
  if (contexts.size >= 8) throw new Error("Eight document windows are already open. Close a window before opening another document.");
  return createWindow(target);
}

async function chooseFiles(context = focusedContext()) {
  const result = await dialog.showOpenDialog(context?.window, {
    title: "Open Markdown", properties: ["openFile", "multiSelections"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "mkd", "mdx"] }],
  });
  if (!result.canceled) {
    if (result.filePaths.length > 8) throw new Error("Open up to eight Markdown files at a time.");
    for (const filePath of result.filePaths) openFile(filePath);
  }
  return { canceled: result.canceled };
}

function openProtocol(value) {
  const source = sourceFromProtocol(value);
  return source === null ? false : openSource(source);
}

function openFile(value) {
  const source = sourceFromFileArgument(value);
  return source ? openSource(source) : false;
}

for (const argument of process.argv) {
  if (openProtocol(argument)) break;
}
if (!pendingSources.length) for (const source of markdownSources(process.argv)) openSource(source);

app.on("open-url", (event, url) => {
  event.preventDefault();
  openProtocol(url);
});

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  openFile(filePath);
});

function validDirectory(candidate) {
  if (!candidate) return null;
  try {
    return fs.statSync(candidate).isDirectory() ? path.resolve(candidate) : null;
  } catch {
    return null;
  }
}

function isInsideDirectory(parent, candidate) {
  if (!parent || !candidate) return false;
  const relative = path.relative(parent, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function isPreferenceValue(value) {
  if (value === null) return true;
  return ["string", "number", "boolean", "object"].includes(typeof value);
}

function sanitizePreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const preferences = {};
  for (const [key, entry] of Object.entries(value)) {
    if (PREFERENCE_KEYS.has(key) && isPreferenceValue(entry)) preferences[key] = entry;
  }
  return preferences;
}

async function loadSettings() {
  settingsPath = path.join(app.getPath("userData"), "settings.json");
  try {
    const data = JSON.parse(await fsp.readFile(settingsPath, "utf8"));
    settings = {
      libraryRoot: validDirectory(data.libraryRoot),
      preferences: sanitizePreferences(data.preferences),
    };
  } catch {
    settings = { libraryRoot: null, preferences: {} };
  }
  const commandLineRoot = process.argv.find((argument) => argument.startsWith("--library="))?.slice("--library=".length);
  const environmentRoot = process.env.LUMAREADER_LIBRARY_ROOT;
  settings.libraryRoot = validDirectory(commandLineRoot) || validDirectory(environmentRoot) || settings.libraryRoot;
}

function saveSettings() {
  const snapshot = `${JSON.stringify(settings, null, 2)}\n`;
  const write = settingsWrite.catch(() => {}).then(async () => {
    await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
    const temporary = `${settingsPath}.tmp`;
    await fsp.writeFile(temporary, snapshot, "utf8");
    await fsp.rename(temporary, settingsPath);
  });
  settingsWrite = write;
  return write;
}

async function chooseLibrary(context = focusedContext(), { automatic = false } = {}) {
  const { window: mainWindow, service: readerService } = context;
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const result = await dialog.showOpenDialog(window, {
    title: "Choose your document library",
    message: `${APP_TITLE} will remember this folder. You can change it later from the sidebar.`,
    defaultPath: settings.libraryRoot || app.getPath("desktop"),
    buttonLabel: "Use This Folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) {
    return { selected: Boolean(settings.libraryRoot), root: settings.libraryRoot, canceled: true, automatic };
  }
  const selectedRoot = readerService.setLibraryRoot(result.filePaths[0]);
  settings.libraryRoot = selectedRoot;
  context.preferences.lastDocumentPath = null;
  context.documentPath = null;
  documents.update(context, null);
  await saveSettings();
  const payload = { selected: true, root: selectedRoot, canceled: false, automatic };
  mainWindow?.webContents.send("library:changed", payload);
  return payload;
}

async function chooseDocumentDirectory(context, { directory = "" } = {}) {
  const { window: mainWindow, service: readerService, pendingCreateDestinations } = context;
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const currentRoot = readerService.getLibraryRoot();
  let defaultPath = currentRoot || app.getPath("desktop");
  if (currentRoot && typeof directory === "string") {
    const candidate = path.resolve(currentRoot, directory.replace(/\\/g, "/"));
    if (isInsideDirectory(currentRoot, candidate) && validDirectory(candidate)) defaultPath = candidate;
  }
  const result = await dialog.showOpenDialog(window, {
    title: "Choose where to create the Markdown document",
    message: "Choose a folder first. If it is outside the current library, LumaReader will use it as the new library so the document appears in the sidebar.",
    defaultPath,
    buttonLabel: "Choose Folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) {
    return { selected: false, canceled: true, root: currentRoot, directory: "", displayPath: "", libraryChanged: false };
  }

  const selectedDirectory = fs.realpathSync.native(path.resolve(result.filePaths[0]));
  let root = currentRoot;
  let relativeDirectory = "";
  if (currentRoot && isInsideDirectory(currentRoot, selectedDirectory)) {
    relativeDirectory = path.relative(currentRoot, selectedDirectory).split(path.sep).join("/");
  } else {
    root = selectedDirectory;
  }
  pendingCreateDestinations.clear();
  const destinationToken = crypto.randomUUID();
  pendingCreateDestinations.set(destinationToken, { directory: selectedDirectory, createdAt: Date.now() });
  return {
    selected: true,
    canceled: false,
    root,
    directory: relativeDirectory,
    displayPath: selectedDirectory,
    libraryChanged: currentRoot !== root,
    destinationToken,
  };
}

function installMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        { label: "Open Markdown…", accelerator: "CmdOrCtrl+O", click: () => chooseFiles().catch((error) => dialog.showErrorBox("Unable to open document", error.message)) },
        { label: "Change Document Library…", click: () => chooseLibrary().catch((error) => dialog.showErrorBox("Unable to choose folder", error.message)) },
        { label: "Save Markdown", accelerator: "CmdOrCtrl+S", click: () => focusedContext()?.window.webContents.send("editor:save-requested") },
        { label: "Export as PDF…", accelerator: "CmdOrCtrl+Shift+E", click: () => focusedContext()?.window.webContents.send("document:export-pdf-requested") },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { type: "separator" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Larger Reader Text", accelerator: "CmdOrCtrl+Plus", click: () => focusedContext()?.window.webContents.send("reader:font-size-requested", 1) },
        { label: "Smaller Reader Text", accelerator: "CmdOrCtrl+-", click: () => focusedContext()?.window.webContents.send("reader:font-size-requested", -1) },
        { label: "Reset Reader Text", accelerator: "CmdOrCtrl+0", click: () => focusedContext()?.window.webContents.send("reader:font-size-requested", 0) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function pdfFileName(value) {
  const source = String(value || "LumaReader document");
  const base = path.basename(source, path.extname(source))
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 120);
  return `${base || "LumaReader document"}.pdf`;
}

function protectNavigation(window, origin) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && new URL(url).origin !== origin) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    const destination = new URL(url);
    if (destination.origin === origin && ["/", "/index.html"].includes(destination.pathname)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });
}

async function createWindow(target = null) {
  const accessToken = crypto.randomBytes(32).toString("hex");
  const readerService = new LocalReaderService({
    rendererRoot: path.join(__dirname, "..", "renderer"),
    libraryRoot: target?.root || settings.libraryRoot,
    accessToken,
  });
  await readerService.listen(0);
  const origin = `http://127.0.0.1:${readerService.port}`;
  let window;
  try {
    window = new BrowserWindow({
      width: 1360, height: 880, minWidth: 360, minHeight: 520, show: false,
      backgroundColor: "#fff2f7", icon: path.join(__dirname, "..", "build", "icon.png"), title: APP_TITLE,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"), contextIsolation: true,
        nodeIntegration: false, sandbox: true, webSecurity: true,
        partition: `lumareader-window-${crypto.randomUUID()}`,
      },
    });
    const context = { window, service: readerService, origin, documentPath: target?.key || null,
      pendingCreateDestinations: new Map(), preferences: { ...settings.preferences } };
    if (target) context.preferences.lastDocumentPath = null;
    contexts.set(window.webContents.id, context);
    documents.add(context, target?.key || null);
    const session = window.webContents.session;
    session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.setPermissionCheckHandler(() => false);
    session.webRequest.onBeforeSendHeaders({ urls: [`${origin}/*`] }, (details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, "X-LumaReader-Token": accessToken } });
    });
    protectNavigation(window, origin);
    window.webContents.on("page-title-updated", (event) => event.preventDefault());
    window.setTitle(target?.path ? `${target.path} — ${APP_TITLE}` : APP_TITLE);
    window.webContents.on("will-prevent-unload", async () => {
      const result = await dialog.showMessageBox(window, {
        type: "warning", message: "This document has unsaved changes.",
        detail: "Keep editing to save your changes, or close this window and discard them.",
        buttons: ["Keep editing", "Discard and close"], defaultId: 0, cancelId: 0, noLink: true,
      });
      if (result.response === 1 && !window.isDestroyed()) window.destroy();
    });
    window.once("ready-to-show", () => window.show());
    const contentsId = window.webContents.id;
    window.on("closed", () => {
      contexts.delete(contentsId);
      documents.remove(context);
      const closing = readerService.close().finally(() => closingServices.delete(closing));
      closingServices.add(closing);
    });
    const url = new URL(origin);
    if (target) url.searchParams.set("source", target.path || target.source);
    await window.loadURL(url.href);
    return context;
  } catch (error) {
    if (window && !window.isDestroyed()) window.destroy();
    await readerService.close();
    throw error;
  }
}

handle("library:get", (context) => ({ selected: Boolean(context.service.getLibraryRoot()), root: context.service.getLibraryRoot() }));
handle("library:choose", (context) => chooseLibrary(context));
handle("document:open", (context) => chooseFiles(context));
handle("document:activated", (context, _event, documentPath) => {
  try { documents.update(context, context.service.resolveProjectDocument(documentPath)); context.window.setTitle(`${path.basename(documentPath)} — ${APP_TITLE}`); } catch { documents.update(context, null); }
  return true;
});
handle("document:choose-directory", async (context, event, payload) => {
  const { window: mainWindow, service: readerService, pendingCreateDestinations } = context;
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    return { selected: false, canceled: true, code: "INVALID_SENDER" };
  }
  return chooseDocumentDirectory(context, payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {});
});
handle("document:cancel-create", (context, event, destinationToken) => {
  const { window: mainWindow, pendingCreateDestinations } = context;
  if (!mainWindow || event.sender !== mainWindow.webContents) return false;
  if (typeof destinationToken === "string") pendingCreateDestinations.delete(destinationToken);
  return true;
});
handle("preferences:get", (context) => ({ ...context.preferences, pdfFooterText: normalizeFooterText(settings.preferences.pdfFooterText) }));
handle("preferences:set", async (context, _event, patch) => {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { ...context.preferences };
  const serialized = JSON.stringify(patch);
  if (Buffer.byteLength(serialized, "utf8") > 16 * 1024) throw new Error("Preference update is too large");
  const safePatch = sanitizePreferences(patch);
  context.preferences = { ...context.preferences, ...safePatch };
  const sharedPatch = { ...safePatch };
  if (context.service.getLibraryRoot() !== settings.libraryRoot) delete sharedPatch.lastDocumentPath;
  settings.preferences = { ...settings.preferences, ...sharedPatch };
  await saveSettings();
  return { ...context.preferences };
});
handle("document:save", async (context, event, payload) => {
  const { window: mainWindow, service: readerService, pendingCreateDestinations } = context;
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    return { ok: false, code: "INVALID_SENDER", message: "This save request is not allowed." };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "INVALID_SAVE_REQUEST", message: "The save request is invalid." };
  }
  try {
    const document = await readerService.saveMarkdownDocument(payload.path, payload.text, payload.expectedModifiedNs, payload.expectedRevision);
    return { ok: true, document };
  } catch (error) {
    return {
      ok: false,
      code: error.code || "SAVE_FAILED",
      message: error.message || "Unable to save this document.",
    };
  }
});
handle("document:import-image", async (context, event, payload) => {
  const { window: mainWindow, service: readerService, pendingCreateDestinations } = context;
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    return { ok: false, code: "INVALID_SENDER", message: "This image import is not allowed." };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "INVALID_IMAGE_REQUEST", message: "The image import request is invalid." };
  }
  try {
    const bytes = payload.bytes instanceof Uint8Array ? payload.bytes : new Uint8Array(payload.bytes || []);
    const image = await readerService.importMarkdownImage(payload.path, payload.name, bytes);
    return { ok: true, image };
  } catch (error) {
    return { ok: false, code: error.code || "IMAGE_IMPORT_FAILED", message: error.message || "Unable to add this image." };
  }
});
handle("document:export-pdf", async (context, event, payload) => {
  const { window: mainWindow, service: readerService, pendingCreateDestinations } = context;
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    return { ok: false, code: "INVALID_SENDER", message: "This PDF export request is not allowed." };
  }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export PDF",
    defaultPath: path.join(app.getPath("downloads"), pdfFileName(payload?.name)),
    buttonLabel: "Export PDF",
    filters: [{ name: "PDF document", extensions: ["pdf"] }],
    properties: ["showOverwriteConfirmation"],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  try {
    const footerText = normalizeFooterText(typeof payload?.footerText === "string" ? payload.footerText : settings.preferences.pdfFooterText);
    const pdf = await mainWindow.webContents.printToPDF(pdfOptions(footerText));
    await fsp.writeFile(result.filePath, pdf);
    context.preferences.pdfFooterText = footerText;
    settings.preferences = { ...settings.preferences, pdfFooterText: footerText };
    await saveSettings();
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, code: "PDF_EXPORT_FAILED", message: error.message || "Unable to export this document as PDF." };
  }
});
handle("document:create", async (context, event, payload) => {
  const { window: mainWindow, service: readerService, pendingCreateDestinations } = context;
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    return { ok: false, code: "INVALID_SENDER", message: "This create request is not allowed." };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "INVALID_CREATE_REQUEST", message: "The create request is invalid." };
  }
  const destination = pendingCreateDestinations.get(payload.destinationToken);
  if (!destination || Date.now() - destination.createdAt > CREATE_DESTINATION_TTL_MS) {
    if (typeof payload.destinationToken === "string") pendingCreateDestinations.delete(payload.destinationToken);
    return { ok: false, code: "DESTINATION_SELECTION_EXPIRED", message: "Choose the destination folder again." };
  }
  const previousRoot = readerService.getLibraryRoot();
  const destinationInsideLibrary = previousRoot && isInsideDirectory(previousRoot, destination.directory);
  const nextRoot = destinationInsideLibrary ? previousRoot : destination.directory;
  const relativeDirectory = destinationInsideLibrary ? path.relative(previousRoot, destination.directory).split(path.sep).join("/") : "";
  let switchedLibrary = false;
  try {
    if (nextRoot !== previousRoot) {
      readerService.setLibraryRoot(nextRoot);
      switchedLibrary = true;
    }
    const document = await readerService.createMarkdownDocument(relativeDirectory, payload.name);
    if (switchedLibrary) {
      settings.libraryRoot = readerService.getLibraryRoot();
      try { await saveSettings(); } catch (error) { console.warn("Unable to persist the new library root", error); }
    }
    pendingCreateDestinations.delete(payload.destinationToken);
    return { ok: true, document, root: readerService.getLibraryRoot(), libraryChanged: switchedLibrary };
  } catch (error) {
    if (switchedLibrary) readerService.setLibraryRoot(previousRoot);
    return {
      ok: false,
      code: error.code || "CREATE_FAILED",
      message: error.message || "Unable to create this document.",
    };
  }
});

app.on("second-instance", (_event, commandLine) => {
  for (const argument of commandLine) { if (openProtocol(argument)) return; }
  const sources = markdownSources(commandLine);
  if (sources.length) { for (const source of sources) openSource(source); return; }
  const context = focusedContext();
  if (context) focusWindow(context.window);
  else if (ready) openEmptyWindow();
});

app.on("activate", () => {
  if (ready && !contexts.size) openEmptyWindow();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

app.whenReady().then(async () => {
  if (!singleInstance) return;
  app.setAppUserModelId(APP_ID);
  await loadSettings();
  installMenu();
  ready = true;
  if (pendingSources.length) {
    for (const source of pendingSources.splice(0)) openSource(source);
  } else openEmptyWindow();
}).catch((error) => {
  dialog.showErrorBox(`${APP_TITLE} could not start`, error.stack || error.message || String(error));
  app.quit();
});

let shutdownStarted = false;
app.on("will-quit", (event) => {
  if (shutdownStarted) return;
  event.preventDefault();
  shutdownStarted = true;
  Promise.allSettled([...closingServices, settingsWrite]).finally(() => app.exit(0));
});
