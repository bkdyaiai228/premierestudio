const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('studio',{pickMedia:()=>ipcRenderer.invoke('pick-media'),saveProject:d=>ipcRenderer.invoke('save-project',d),openProject:()=>ipcRenderer.invoke('open-project'),exportVideo:p=>ipcRenderer.invoke('export-video',p)});
