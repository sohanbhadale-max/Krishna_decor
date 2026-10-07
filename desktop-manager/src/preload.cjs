const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('krishnaHub', {
  status: () => ipcRenderer.invoke('hub:status'),
  saveSettings: (values) => ipcRenderer.invoke('hub:save-settings', values),
  testCloud: (url) => ipcRenderer.invoke('hub:test-cloud', url),
  openDataFolder: () => ipcRenderer.invoke('hub:open-data-folder'),
  exportBackup: () => ipcRenderer.invoke('hub:export-backup'),
  importBackup: () => ipcRenderer.invoke('hub:import-backup'),
  saveBackup: (payload) => ipcRenderer.invoke('hub:save-backup', payload),
  getBackupStatus: () => ipcRenderer.invoke('hub:get-backup-status'),
  onStatusChange: (listener) => {
    const callback = (_event, status) => listener(status)
    ipcRenderer.on('hub:status-changed', callback)
    return () => ipcRenderer.removeListener('hub:status-changed', callback)
  }
})
