"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lumaDesktop", {
  isDesktop: true,
  platform: process.platform,
  openDocuments: () => ipcRenderer.invoke("document:open"),
  documentActivated: (path) => ipcRenderer.invoke("document:activated", path),
  chooseLibrary: () => ipcRenderer.invoke("library:choose"),
  chooseCreateDirectory: (payload) => ipcRenderer.invoke("document:choose-directory", payload),
  cancelCreateDocument: (destinationToken) => ipcRenderer.invoke("document:cancel-create", destinationToken),
  getLibrary: () => ipcRenderer.invoke("library:get"),
  updateSettingsMenu: (snapshot) => ipcRenderer.invoke("settings:menu", snapshot),
  onSettingsRequested: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on("settings:requested", listener);
    return () => ipcRenderer.removeListener("settings:requested", listener);
  },
  getPreferences: () => ipcRenderer.invoke("preferences:get"),
  setPreferences: (patch) => ipcRenderer.invoke("preferences:set", patch),
  createDocument: (payload) => ipcRenderer.invoke("document:create", payload),
  getAnnotations:p=>ipcRenderer.invoke('annotations:get',p),
  saveAnnotations:p=>ipcRenderer.invoke('annotations:save',p),
  saveAnnotationAsset:p=>ipcRenderer.invoke('annotations:image',p),
  getAnnotationAsset:id=>ipcRenderer.invoke('annotations:get-image',id),
  saveDocument: (payload) => ipcRenderer.invoke("document:save", payload),
  chooseImages: payload=>ipcRenderer.invoke("document:choose-images",payload),
  setCodeEditing: payload=>ipcRenderer.invoke("document:code-edit",payload),
  saveCodeDocument: payload=>ipcRenderer.invoke("document:save-code",payload),
  importImage: (payload) => ipcRenderer.invoke("document:import-image", payload),
  previewPdf: (payload) => ipcRenderer.invoke("document:preview-pdf", payload),
  releasePdf: () => ipcRenderer.invoke("document:release-pdf"),
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
