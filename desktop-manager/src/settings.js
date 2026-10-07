const byId = (id) => document.getElementById(id)
const message = byId('message')

function showMessage(text, error = false) {
  message.textContent = text || ''
  message.className = error ? 'error' : ''
}

function render(status) {
  byId('hubRunning').textContent = status.running ? 'Running locally' : 'Stopped'
  byId('localApi').textContent = status.localApiUrl || ''
  byId('dataFolder').textContent = status.dataFolder || ''
  byId('tunnelState').textContent = !status.tunnelConfigured ? 'Not configured' : status.tunnelRunning ? 'Connected / starting' : 'Configured but stopped'
  byId('publicApiUrl').value = status.publicApiUrl || ''
  byId('startAtLogin').checked = status.startAtLogin !== false
  byId('tunnelLog').textContent = status.tunnelLog || 'No tunnel activity yet.'
}

async function refresh() {
  try { render(await window.krishnaHub.status()) } catch (error) { showMessage(error.message, true) }
}

byId('settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  const button = byId('save')
  button.disabled = true
  showMessage('Saving Windows Hub settings…')
  try {
    const status = await window.krishnaHub.saveSettings({
      publicApiUrl: byId('publicApiUrl').value,
      tunnelToken: byId('tunnelToken').value,
      removeTunnelToken: byId('removeTunnelToken').checked,
      startAtLogin: byId('startAtLogin').checked
    })
    byId('tunnelToken').value = ''
    byId('removeTunnelToken').checked = false
    render(status)
    showMessage('Settings saved. Enter the public API address in the Android apps.')
  } catch (error) {
    showMessage(error.message || 'Settings could not be saved.', true)
  } finally {
    button.disabled = false
  }
})

byId('restartTunnel').addEventListener('click', async () => {
  try { render(await window.krishnaHub.restartTunnel()); showMessage('Tunnel restart requested.') } catch (error) { showMessage(error.message, true) }
})
byId('openFolder').addEventListener('click', () => window.krishnaHub.openDataFolder())
byId('importBackup').addEventListener('click', async () => {
  try {
    const result = await window.krishnaHub.importBackup()
    if (result?.imported) { showMessage('Local data imported. Team members must sign in again.'); await refresh() }
  } catch (error) { showMessage(error.message || 'Import failed.', true) }
})

window.krishnaHub.onStatusChange(render)
refresh()
