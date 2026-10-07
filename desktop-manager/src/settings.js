const byId = (id) => document.getElementById(id)
const messageEl = byId('message')

function showMessage(text, type = '') {
  messageEl.textContent = text || ''
  messageEl.className = type
  if (text && type === 'success') {
    setTimeout(() => {
      if (messageEl.textContent === text) messageEl.textContent = ''
    }, 4000)
  }
}

let currentCloudUrl = 'https://krishna-decor-api.onrender.com/api'

async function checkCloudConnection(targetUrl) {
  const badge = byId('cloudStatusBadge')
  const latencyEl = byId('cloudLatency')
  const providerEl = byId('dbProvider')
  badge.className = 'badge checking'
  badge.textContent = 'Pinging cloud server…'
  latencyEl.textContent = '…'

  try {
    const result = await window.krishnaHub.testCloud(targetUrl || currentCloudUrl)
    if (result.ok) {
      badge.className = 'badge online'
      badge.textContent = 'Connected (24/7 Live)'
      latencyEl.textContent = result.latency + ' ms'
      if (result.data?.provider) {
        providerEl.textContent = result.data.provider
      }
    } else {
      badge.className = 'badge offline'
      badge.textContent = 'Cloud offline or waking up'
      latencyEl.textContent = 'No response'
      showMessage('Cloud health check: ' + (result.error || 'Server did not respond.'), 'error')
    }
  } catch (err) {
    badge.className = 'badge offline'
    badge.textContent = 'Connection failed'
    latencyEl.textContent = 'Error'
    showMessage(err.message, 'error')
  }
}

function render(status) {
  currentCloudUrl = status.cloudApiUrl || 'https://krishna-decor-api.onrender.com/api'
  byId('cloudAddress').textContent = currentCloudUrl
  byId('customCloudInput').value = currentCloudUrl
  byId('dataFolder').textContent = status.dataFolder || 'AppData\\Roaming\\krishna-decor-manager-desktop\\data'
  byId('backupCount').textContent = (status.backupCount || 0) + ' daily snapshot' + (status.backupCount === 1 ? '' : 's')
  byId('startAtLogin').checked = status.startAtLogin !== false

  if (status.lastBackupTime) {
    byId('lastBackupTime').textContent = 'Last backup: ' + new Date(status.lastBackupTime).toLocaleTimeString()
  } else if (status.hasBackup) {
    byId('lastBackupTime').textContent = 'Active (Local database intact)'
  }
}

async function init() {
  try {
    const status = await window.krishnaHub.status()
    render(status)
    await checkCloudConnection(status.cloudApiUrl)
  } catch (err) {
    showMessage(err.message, 'error')
  }
}

byId('testCloudBtn').addEventListener('click', async () => {
  showMessage('Pinging cloud server…')
  await checkCloudConnection(currentCloudUrl)
  showMessage('Cloud connection tested successfully.', 'success')
})

byId('toggleEditBtn').addEventListener('click', () => {
  const box = byId('cloudEditBox')
  box.classList.toggle('hidden')
})

byId('saveCloudBtn').addEventListener('click', async () => {
  const nextUrl = byId('customCloudInput').value.trim()
  if (!nextUrl) return
  showMessage('Saving custom cloud address…')
  try {
    const status = await window.krishnaHub.saveSettings({ cloudApiUrl: nextUrl })
    render(status)
    byId('cloudEditBox').classList.add('hidden')
    showMessage('Cloud address updated.', 'success')
    await checkCloudConnection(nextUrl)
  } catch (err) {
    showMessage(err.message, 'error')
  }
})

byId('resetCloudBtn').addEventListener('click', async () => {
  const defaultUrl = 'https://krishna-decor-api.onrender.com/api'
  byId('customCloudInput').value = defaultUrl
  showMessage('Restoring default 24/7 cloud address…')
  try {
    const status = await window.krishnaHub.saveSettings({ cloudApiUrl: defaultUrl })
    render(status)
    byId('cloudEditBox').classList.add('hidden')
    showMessage('Default cloud address restored.', 'success')
    await checkCloudConnection(defaultUrl)
  } catch (err) {
    showMessage(err.message, 'error')
  }
})

byId('openFolderBtn').addEventListener('click', () => {
  window.krishnaHub.openDataFolder()
})

byId('exportBackupBtn').addEventListener('click', async () => {
  try {
    const result = await window.krishnaHub.exportBackup()
    if (result?.exported) {
      showMessage('Data backup exported successfully.', 'success')
    }
  } catch (err) {
    showMessage(err.message || 'Export failed.', 'error')
  }
})

byId('importBackupBtn').addEventListener('click', async () => {
  try {
    const result = await window.krishnaHub.importBackup()
    if (result?.imported) {
      showMessage('Local backup imported successfully. Hub data updated.', 'success')
      const status = await window.krishnaHub.status()
      render(status)
    }
  } catch (err) {
    showMessage(err.message || 'Import failed.', 'error')
  }
})

byId('savePrefBtn').addEventListener('click', async () => {
  showMessage('Saving preferences…')
  try {
    const status = await window.krishnaHub.saveSettings({
      startAtLogin: byId('startAtLogin').checked
    })
    render(status)
    showMessage('Preferences saved successfully.', 'success')
  } catch (err) {
    showMessage(err.message, 'error')
  }
})

window.krishnaHub.onStatusChange(render)
init()
