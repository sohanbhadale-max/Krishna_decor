const { contextBridge, ipcRenderer } = require('electron')

let initialCloudUrl = ''
try {
  initialCloudUrl = ipcRenderer.sendSync('hub:get-cloud-url-sync') || ''
} catch {}

contextBridge.exposeInMainWorld('krishnaHub', {
  isDesktop: true,
  localUrl: 'http://127.0.0.1:8788/api',
  cloudUrl: initialCloudUrl,
  status: () => ipcRenderer.invoke('hub:status'),
  saveSettings: (values) => ipcRenderer.invoke('hub:save-settings', values),
  testCloud: (url) => ipcRenderer.invoke('hub:test-cloud', url),
  syncCloud: () => ipcRenderer.invoke('hub:sync-cloud'),
  openDataFolder: () => ipcRenderer.invoke('hub:open-data-folder'),
  exportBackup: () => ipcRenderer.invoke('hub:export-backup'),
  importBackup: () => ipcRenderer.invoke('hub:import-backup'),
  saveBackup: (payload) => ipcRenderer.invoke('hub:save-backup', payload),
  deleteStaff: (payload) => ipcRenderer.invoke('hub:delete-staff', payload),
  getBackupStatus: () => ipcRenderer.invoke('hub:get-backup-status'),
  selectBackupDirectory: () => ipcRenderer.invoke('hub:select-backup-dir'),
  getBackupDirectory: () => ipcRenderer.invoke('hub:get-backup-dir'),
  openBackupDirectory: () => ipcRenderer.invoke('hub:open-backup-dir'),
  openProjectFolder: (projectName, subfolder) => ipcRenderer.invoke('hub:open-project-folder', projectName, subfolder),
  syncProjectsBackup: (projects) => ipcRenderer.invoke('hub:sync-projects-backup', projects),
  saveDocumentPdf: (payload) => ipcRenderer.invoke('hub:save-document-pdf', payload),
  onBackupDirChanged: (listener) => {
    const callback = (_event, data) => listener(data)
    ipcRenderer.on('hub:backup-dir-changed', callback)
    return () => ipcRenderer.removeListener('hub:backup-dir-changed', callback)
  },
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


