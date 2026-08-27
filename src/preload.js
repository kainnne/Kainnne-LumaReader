"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lumaDesktop", {
  isDesktop: true,
  platform: process.platform,
  chooseLibrary: () => ipcRenderer.invoke("library:choose"),
  chooseCreateDirectory: (payload) => ipcRenderer.invoke("document:choose-directory", payload),
  cancelCreateDocument: (destinationToken) => ipcRenderer.invoke("document:cancel-create", destinationToken),
  getLibrary: () => ipcRenderer.invoke("library:get"),
  getPreferences: () => ipcRenderer.invoke("preferences:get"),
  setPreferences: (patch) => ipcRenderer.invoke("preferences:set", patch),
  createDocument: (payload) => ipcRenderer.invoke("document:create", payload),
  saveDocument: (payload) => ipcRenderer.invoke("document:save", payload),
  exportPdf: (payload) => ipcRenderer.invoke("document:export-pdf", payload),
  onSaveRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("editor:save-requested", listener);
    return () => ipcRenderer.removeListener("editor:save-requested", listener);
  },
  onFontSizeRequested: (callback) => {
    const listener = (_event, change) => callback(change);
    ipcRenderer.on("reader:font-size-requested", listener);
    return () => ipcRenderer.removeListener("reader:font-size-requested", listener);
  },
  onExportPdfRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("document:export-pdf-requested", listener);
    return () => ipcRenderer.removeListener("document:export-pdf-requested", listener);
  },
  onLibraryChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("library:changed", listener);
    return () => ipcRenderer.removeListener("library:changed", listener);
  },
});
