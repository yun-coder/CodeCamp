const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isAutoLaunchEnabled: () => ipcRenderer.invoke('is-auto-launch-enabled'),
  toggleAutoLaunch: (enabled) => ipcRenderer.invoke('toggle-auto-launch', enabled),
});
