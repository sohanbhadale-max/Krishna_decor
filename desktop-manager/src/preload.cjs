const { contextBridge, ipcRenderer } = require('electron')

let initialCloudUrl = ''
try {
  initialCloudUrl = ipcRenderer.sendSync('hub:get-cloud-url-sync') || ''
} catch {}

contextBridge.exposeInMainWorld('krishnaHub', {
  cloudUrl: initialCloudUrl,
  status: () => ipcRenderer.invoke('hub:status'),
  saveSettings: (values) => ipcRenderer.invoke('hub:save-settings', values),
  testCloud: (url) => ipcRenderer.invoke('hub:test-cloud', url),
  syncCloud: () => ipcRenderer.invoke('hub:sync-cloud'),
  openDataFolder: () => ipcRenderer.invoke('hub:open-data-folder'),
  exportBackup: () => ipcRenderer.invoke('hub:export-backup'),
  importBackup: () => ipcRenderer.invoke('hub:import-backup'),
  saveBackup: (payload) => ipcRenderer.invoke('hub:save-backup', payload),
  getBackupStatus: () => ipcRenderer.invoke('hub:get-backup-status'),
  onStatusChange: (listener) => {
    const callback = (_event, status) => listener(status)
    ipcRenderer.on('hub:status-changed', callback)
    return () => ipcRenderer.removeListener('hub:status-changed', callback)
  },
  onTriggerSync: (listener) => {
    const callback = () => listener()
    ipcRenderer.on('hub:trigger-sync', callback)
    return () => ipcRenderer.removeListener('hub:trigger-sync', callback)
  },
  onCloudUrlChanged: (listener) => {
    const callback = (_event, url) => listener(url)
    ipcRenderer.on('hub:cloud-url-changed', callback)
    return () => ipcRenderer.removeListener('hub:cloud-url-changed', callback)
  }
})

