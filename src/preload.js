"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lumaDesktop", {
  isDesktop: true,
  platform: process.platform,
  chooseLibrary: () => ipcRenderer.invoke("library:choose"),
  getLibrary: () => ipcRenderer.invoke("library:get"),
  getPreferences: () => ipcRenderer.invoke("preferences:get"),
  setPreferences: (patch) => ipcRenderer.invoke("preferences:set", patch),
  createDocument: (payload) => ipcRenderer.invoke("document:create", payload),
  saveDocument: (payload) => ipcRenderer.invoke("document:save", payload),
  onSaveRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("editor:save-requested", listener);
    return () => ipcRenderer.removeListener("editor:save-requested", listener);
  },
  onLibraryChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("library:changed", listener);
    return () => ipcRenderer.removeListener("library:changed", listener);
  },
});
