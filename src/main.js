"use strict";

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { LocalReaderService } = require("./local-server");

const PROTOCOL = "kainnne-lumareader";
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

let mainWindow = null;
let readerService = null;
let settingsPath = null;
let settings = { libraryRoot: null };
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

async function loadSettings() {
  settingsPath = path.join(app.getPath("userData"), "settings.json");
  try {
    const data = JSON.parse(await fsp.readFile(settingsPath, "utf8"));
    settings.libraryRoot = validDirectory(data.libraryRoot);
  } catch {
    settings = { libraryRoot: null };
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
    title: "Choose your Markdown library",
    message: "Kainnne LumaReader will remember this folder. You can change it later from the sidebar.",
    defaultPath: settings.libraryRoot || app.getPath("documents"),
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
        { label: "Change Library Folder…", accelerator: "CmdOrCtrl+Shift+O", click: () => chooseLibrary() },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "copy" },
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

function protectNavigation(window, readerOrigin) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && !url.startsWith(readerOrigin)) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(readerOrigin)) return;
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
    title: "Kainnne LumaReader",
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
  if (!settings.libraryRoot) setTimeout(() => chooseLibrary({ automatic: true }), 250);
}

ipcMain.handle("library:get", () => ({ selected: Boolean(settings.libraryRoot), root: settings.libraryRoot }));
ipcMain.handle("library:choose", () => chooseLibrary());

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
  app.setAppUserModelId("com.kainnne.lumareader");
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
  dialog.showErrorBox("Kainnne LumaReader could not start", error.stack || error.message || String(error));
  app.quit();
});

app.on("will-quit", (event) => {
  if (!readerService?.server?.listening || shutdownStarted) return;
  event.preventDefault();
  shutdownStarted = true;
  readerService.close().finally(() => app.exit(0));
});
