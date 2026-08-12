"use strict";

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { LocalReaderService } = require("./local-server");

const PROTOCOL = "kainnne-lumareader";
const APP_ID = "com.kainnne.lumareader";
const APP_TITLE = "Kainnne LumaReader";
const PREFERENCE_KEYS = new Set([
  "appMode",
  "fontSize",
  "formatSelections",
  "language",
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
]);

app.setName(APP_TITLE);
app.setPath("userData", path.join(app.getPath("appData"), APP_TITLE));

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

let mainWindow = null;
let readerService = null;
let settingsPath = null;
let settings = { libraryRoot: null, preferences: {} };
let shutdownStarted = false;
let readerOrigin = null;
let pendingSource = null;

function sourceFromProtocol(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== `${PROTOCOL}:`) return null;
    return url.searchParams.get("source") || "";
  } catch {
    return null;
  }
}

function registerProtocol() {
  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

function openProtocol(value) {
  const source = sourceFromProtocol(value);
  if (source === null) return false;
  pendingSource = source || null;
  if (mainWindow && readerOrigin) {
    if (pendingSource) {
      const target = new URL(readerOrigin);
      target.searchParams.set("source", pendingSource);
      pendingSource = null;
      mainWindow.loadURL(target.href);
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
}

for (const argument of process.argv) {
  if (sourceFromProtocol(argument) !== null) openProtocol(argument);
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  openProtocol(url);
});

function validDirectory(candidate) {
  if (!candidate) return null;
  try {
    return fs.statSync(candidate).isDirectory() ? path.resolve(candidate) : null;
  } catch {
    return null;
  }
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

async function saveSettings() {
  await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
  await fsp.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

async function chooseLibrary({ automatic = false } = {}) {
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
  await saveSettings();
  const payload = { selected: true, root: selectedRoot, canceled: false, automatic };
  mainWindow?.webContents.send("library:changed", payload);
  return payload;
}

function installMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        { label: "Change Document Library…", click: () => chooseLibrary() },
        { label: "Save Markdown", accelerator: "CmdOrCtrl+S", click: () => mainWindow?.webContents.send("editor:save-requested") },
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
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function protectNavigation(window, origin) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && !url.startsWith(origin)) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(origin)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });
}

async function createWindow() {
  readerOrigin = `http://127.0.0.1:${readerService.port}`;
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 360,
    minHeight: 520,
    show: false,
    backgroundColor: "#fff2f7",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    title: APP_TITLE,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  protectNavigation(mainWindow, readerOrigin);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  const target = new URL(readerOrigin);
  if (pendingSource) {
    target.searchParams.set("source", pendingSource);
    pendingSource = null;
  }
  await mainWindow.loadURL(target.href);
}

ipcMain.handle("library:get", () => ({ selected: Boolean(settings.libraryRoot), root: settings.libraryRoot }));
ipcMain.handle("library:choose", () => chooseLibrary());
ipcMain.handle("preferences:get", () => ({ ...settings.preferences }));
ipcMain.handle("preferences:set", async (_event, patch) => {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { ...settings.preferences };
  const serialized = JSON.stringify(patch);
  if (Buffer.byteLength(serialized, "utf8") > 16 * 1024) throw new Error("Preference update is too large");
  const safePatch = sanitizePreferences(patch);
  settings.preferences = { ...settings.preferences, ...safePatch };
  await saveSettings();
  return { ...settings.preferences };
});
ipcMain.handle("document:save", async (event, payload) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    return { ok: false, code: "INVALID_SENDER", message: "This save request is not allowed." };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "INVALID_SAVE_REQUEST", message: "The save request is invalid." };
  }
  try {
    const document = await readerService.saveMarkdownDocument(payload.path, payload.text, payload.expectedModifiedNs);
    return { ok: true, document };
  } catch (error) {
    return {
      ok: false,
      code: error.code || "SAVE_FAILED",
      message: error.message || "Unable to save this document.",
    };
  }
});

app.on("second-instance", (_event, commandLine) => {
  for (const argument of commandLine) {
    if (openProtocol(argument)) return;
  }
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && readerService) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.whenReady().then(async () => {
  app.setAppUserModelId(APP_ID);
  registerProtocol();
  await loadSettings();
  readerService = new LocalReaderService({
    rendererRoot: path.join(__dirname, "..", "renderer"),
    libraryRoot: settings.libraryRoot,
  });
  const requestedPort = Number(process.argv.find((argument) => argument.startsWith("--reader-port="))?.slice("--reader-port=".length) || 0);
  await readerService.listen(Number.isInteger(requestedPort) && requestedPort >= 0 ? requestedPort : 0);
  installMenu();
  await createWindow();
}).catch((error) => {
  dialog.showErrorBox(`${APP_TITLE} could not start`, error.stack || error.message || String(error));
  app.quit();
});

app.on("will-quit", (event) => {
  if (!readerService?.server?.listening || shutdownStarted) return;
  event.preventDefault();
  shutdownStarted = true;
  readerService.close().finally(() => app.exit(0));
});
