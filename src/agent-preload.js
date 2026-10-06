'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('lumaAgent',{
 getJob:()=>ipcRenderer.invoke('luma-agent:job'),
 complete:payload=>ipcRenderer.invoke('luma-agent:complete',payload),
});
