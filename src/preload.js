"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lumaDesktop", {
  isDesktop: true,
  platform: process.platform,
  chooseLibrary: () => ipcRenderer.invoke("library:choose"),
  getLibrary: () => ipcRenderer.invoke("library:get"),
  onLibraryChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("library:changed", listener);
    return () => ipcRenderer.removeListener("library:changed", listener);
  },
});
