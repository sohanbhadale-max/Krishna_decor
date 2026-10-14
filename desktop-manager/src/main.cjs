const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, safeStorage, shell } = require('electron')
const { spawn } = require('node:child_process')
const { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } = require('node:fs')
const { dirname, join, resolve } = require('node:path')
const { pathToFileURL } = require('node:url')

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

let mainWindow
let settingsWindow
let apiServer
let tunnelProcess
let tunnelLog = ''
let quitting = false
let tray

function userDataPath(...parts) {
  return join(app.getPath('userData'), ...parts)
}

function configPath() {
  return userDataPath('hub-config.json')
}

function readConfig() {
  try {
    return JSON.parse(readFileSync(configPath(), 'utf8'))
  } catch {
    return { publicApiUrl: '', encryptedTunnelToken: '', startAtLogin: true }
  }
}

function writeConfig(config) {
  mkdirSync(dirname(configPath()), { recursive: true })
  writeFileSync(configPath(), JSON.stringify(config, null, 2) + '\n', { mode: 0o600 })
}

function tunnelToken(config = readConfig()) {
  if (!config.encryptedTunnelToken || !safeStorage.isEncryptionAvailable()) return ''
  try {
    return safeStorage.decryptString(Buffer.from(config.encryptedTunnelToken, 'base64'))
  } catch {
    return ''
  }
}

function normalizePublicApiUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const url = new URL(raw)
  if (url.protocol !== 'https:') throw new Error('The public sync address must use HTTPS.')
  const base = url.toString().replace(/\/$/, '')
  return base.endsWith('/api') ? base : base + '/api'
}

function cloudflaredPath() {
  return app.isPackaged
    ? join(process.resourcesPath, 'cloudflared.exe')
    : resolve(__dirname, '../resources/cloudflared.exe')
}

function appendTunnelLog(message) {
  tunnelLog = (tunnelLog + String(message || '')).slice(-2400)
  broadcastStatus()
}

function stopTunnel() {
  if (tunnelProcess && !tunnelProcess.killed) tunnelProcess.kill()
  tunnelProcess = undefined
}

function startTunnel() {
  stopTunnel()
  const token = tunnelToken()
  const executable = cloudflaredPath()
  if (!token) return
  if (!existsSync(executable)) {
    appendTunnelLog('cloudflared.exe is missing from this installation.')
    return
  }
  tunnelLog = 'Starting secure Cloudflare Tunnel…\n'
  tunnelProcess = spawn(executable, ['tunnel', 'run', '--token', token], { windowsHide: true })
  tunnelProcess.stdout.on('data', appendTunnelLog)
  tunnelProcess.stderr.on('data', appendTunnelLog)
  tunnelProcess.on('error', (error) => appendTunnelLog('Tunnel error: ' + error.message + '\n'))
  tunnelProcess.on('exit', (code) => {
    tunnelProcess = undefined
    appendTunnelLog('Tunnel stopped' + (code === null ? '' : ' (code ' + code + ')') + '.\n')
  })
  broadcastStatus()
}

function apiEntryPath() {
  return app.isPackaged
    ? join(process.resourcesPath, 'api', 'src', 'server.js')
    : resolve(__dirname, '../../api/src/server.js')
}

async function startHub() {
  const dataFolder = userDataPath('data')
  const dataFile = join(dataFolder, 'krishna-decor.json')
  if (!existsSync(dataFile)) {
    mkdirSync(dataFolder, { recursive: true })
    const localTemplate = resolve(__dirname, '../../api/data/krishna-decor.json')
    const packagedTemplate = join(process.resourcesPath || '', 'api', 'data', 'krishna-decor.json')
    if (existsSync(localTemplate)) {
      copyFileSync(localTemplate, dataFile)
    } else if (existsSync(packagedTemplate)) {
      copyFileSync(packagedTemplate, dataFile)
    }
  }

  const module = await import(pathToFileURL(apiEntryPath()).href)
  apiServer = await module.startLocalApiServer({
    port: 8788,
    host: '0.0.0.0',
    dataDirectory: dataFolder,
    allowedOrigins: ['null', 'https://localhost', 'http://localhost', 'capacitor://localhost']
  })
}

async function restartHub() {
  if (apiServer) await new Promise((resolveClose) => apiServer.close(resolveClose))
  await startHub()
  broadcastStatus()
}

function hubStatus() {
  const config = readConfig()
  const dataFolder = userDataPath('data')
  const backupFolder = join(dataFolder, 'backups')
  let backupFilesCount = 0
  try {
    if (existsSync(backupFolder)) {
      backupFilesCount = readdirSync(backupFolder).filter((f) => f.endsWith('.json')).length
    }
  } catch {}
  return {
    cloudApiUrl: config.cloudApiUrl || 'https://krishna-decor-api.onrender.com/api',
    localBackupActive: true,
    dataFolder,
    hasBackup: existsSync(join(dataFolder, 'krishna-decor.json')),
    lastBackupTime,
    backupCount: backupFilesCount,
    startAtLogin: config.startAtLogin !== false
  }
}

function broadcastStatus() {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send('hub:status-changed', hubStatus())
}

function showMainWindow() {
  if (!mainWindow) return createMainWindow()
  mainWindow.show()
  mainWindow.focus()
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1050,
    minHeight: 700,
    title: 'Krishna Decor Manager',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.cjs')
    }
  })
  const appRoot = app.isPackaged ? join(process.resourcesPath, 'manager-app') : resolve(__dirname, '../../manager-app/dist')
  mainWindow.loadFile(join(appRoot, 'index.html'))
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.on('closed', () => { mainWindow = undefined })
  mainWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
  return mainWindow
}

function createTray() {
  const icon = nativeImage.createFromDataURL('data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="6" fill="#173e73"/><path d="M10 7h4v8l6-8h5l-7 9 7 9h-5l-6-8v8h-4z" fill="white"/></svg>'))
  tray = new Tray(icon)
  tray.setToolTip('Krishna Decor Windows Hub')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show Manager', click: showMainWindow },
    { label: 'Windows Hub Sync Settings', click: openSettings },
    { type: 'separator' },
    { label: 'Quit Krishna Decor', click: () => { quitting = true; app.quit() } }
  ]))
  tray.on('double-click', showMainWindow)
}

function openSettings() {
  if (settingsWindow) {
    settingsWindow.show()
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 680,
    height: 730,
    resizable: false,
    title: 'Windows Hub Sync Settings',
    parent: mainWindow,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.cjs')
    }
  })
  settingsWindow.loadFile(join(__dirname, 'settings.html'))
  settingsWindow.on('closed', () => { settingsWindow = undefined })
}

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Krishna Decor',
      submenu: [
        { label: 'Show Manager', click: showMainWindow },
        { label: 'Windows Hub Sync Settings', click: openSettings },
        { label: 'Open Local Data Folder', click: () => shell.openPath(userDataPath('data')) },
        { type: 'separator' },
        { label: 'Quit', click: () => { quitting = true; app.quit() } }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]))
}

ipcMain.on('hub:get-cloud-url-sync', (event) => {
  const config = readConfig()
  event.returnValue = config.cloudApiUrl || 'https://krishna-decor-api.onrender.com/api'
})

ipcMain.handle('hub:get-cloud-url', () => {
  const config = readConfig()
  return config.cloudApiUrl || 'https://krishna-decor-api.onrender.com/api'
})

ipcMain.handle('hub:status', () => hubStatus())
ipcMain.handle('hub:save-settings', async (_event, values = {}) => {
  const current = readConfig()
  const next = {
    ...current,
    cloudApiUrl: values.cloudApiUrl ? String(values.cloudApiUrl).trim() : 'https://krishna-decor-api.onrender.com/api',
    startAtLogin: values.startAtLogin !== false
  }
  writeConfig(next)
  app.setLoginItemSettings({ openAtLogin: next.startAtLogin })
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('hub:cloud-url-changed', next.cloudApiUrl)
  }
  broadcastStatus()
  return hubStatus()
})

ipcMain.handle('hub:test-cloud', async (_event, targetUrl) => {
  const urlToTest = (targetUrl || 'https://krishna-decor-api.onrender.com/api').replace(/\/$/, '') + '/health'
  const startTime = Date.now()
  try {
    const res = await fetch(urlToTest, { signal: AbortSignal.timeout(9000) })
    const data = await res.json()
    const latency = Date.now() - startTime
    return { ok: res.ok && data.ok, latency, data }
  } catch (error) {
    return { ok: false, error: error.message }
  }
})

ipcMain.handle('hub:sync-cloud', async () => {
  const config = readConfig()
  const cloudUrl = (config.cloudApiUrl || 'https://krishna-decor-api.onrender.com/api').replace(/\/$/, '')
  const dataFolder = userDataPath('data')
  const dataFile = join(dataFolder, 'krishna-decor.json')

  try {
    const healthRes = await fetch(cloudUrl + '/health', { signal: AbortSignal.timeout(8000) })
    if (!healthRes.ok) throw new Error('Cloud health check failed.')
  } catch (error) {
    return { ok: false, error: 'Could not connect to 24/7 cloud: ' + (error.message || 'offline') }
  }

  // Trigger real-time sync inside the main manager window if active
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('hub:trigger-sync')
  }

  let syncedProjectsCount = 0
  if (existsSync(dataFile)) {
    try {
      const localData = JSON.parse(readFileSync(dataFile, 'utf8'))
      syncedProjectsCount = (localData.projects || []).length
    } catch {}
  }

  lastBackupTime = new Date().toISOString()
  broadcastStatus()
  return { ok: true, syncedProjects: syncedProjectsCount, timestamp: lastBackupTime }
})

ipcMain.handle('hub:open-data-folder', () => shell.openPath(userDataPath('data')))

ipcMain.handle('hub:export-backup', async () => {
  const dataFolder = userDataPath('data')
  const source = join(dataFolder, 'krishna-decor.json')
  if (!existsSync(source)) throw new Error('No local data file exists yet to export.')
  const selection = await dialog.showSaveDialog({
    title: 'Export Krishna Decor Data Backup',
    defaultPath: 'krishna-decor-backup-' + new Date().toISOString().slice(0, 10) + '.json',
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  })
  if (selection.canceled || !selection.filePath) return { cancelled: true }
  copyFileSync(source, selection.filePath)
  return { exported: true, path: selection.filePath }
})

ipcMain.handle('hub:import-backup', async () => {
  const selection = await dialog.showOpenDialog({
    title: 'Import Krishna Decor local data',
    properties: ['openFile'],
    filters: [{ name: 'Krishna Decor backup', extensions: ['json'] }]
  })
  if (selection.canceled || !selection.filePaths[0]) return { cancelled: true }
  let imported
  try {
    imported = JSON.parse(readFileSync(selection.filePaths[0], 'utf8'))
  } catch {
    throw new Error('That file is not valid Krishna Decor JSON data.')
  }
  if (!Array.isArray(imported.users) && !Array.isArray(imported.staff) && !Array.isArray(imported.projects)) {
    throw new Error('That file is not a Krishna Decor data backup.')
  }
  const dataFolder = userDataPath('data')
  mkdirSync(dataFolder, { recursive: true })
  const destination = join(dataFolder, 'krishna-decor.json')
  if (existsSync(destination)) {
    copyFileSync(destination, join(dataFolder, 'krishna-decor-before-import-' + Date.now() + '.json'))
  }
  writeFileSync(destination, JSON.stringify(imported, null, 2) + '\n', { mode: 0o600 })
  lastBackupTime = new Date().toISOString()
  return { imported: true }
})

const BASELINE_USERS = [
  {
    id: '3c8d7d36-7fa6-4b1c-8526-179be4456a93',
    name: 'sohan',
    email: 'sohanbhadale1234@gmail.com',
    role: 'manager',
    passwordHash: 'ca1e12c2e12072a2f5e68b801dee0e0e:19267edcfa42e320ee365168a67f67e5f27ecdf7528b805460e0dc687b25a83141080ee917040f8f0a5cb6a20d7501ec02cfeefbda8b6a6d8efee81d5dc1e573',
    createdAt: '2026-10-07T16:36:39.226Z'
  },
  {
    id: '137a7965-b105-40f7-9c37-d6e2e984f8d1',
    name: 'isra',
    email: 'isra@krishnadecor.local',
    role: 'staff',
    passwordHash: '0b585636702c3e6d4b5eccaf3a35ed75:fd47484b8ddfc6ad2f2f32875035bbec9cae3339e7dd532a4b3aa448a9a2bcf3058f02320a4545f4251e9970f27df9052ff12ecb820d965a435267ac3a409cdb',
    createdAt: '2026-10-14T07:32:32.442Z'
  }
]

let lastBackupTime = null

ipcMain.handle('hub:save-backup', async (_event, payload) => {
  if (!payload || typeof payload !== 'object') return { success: false }
  const dataFolder = userDataPath('data')
  mkdirSync(dataFolder, { recursive: true })
  const destination = join(dataFolder, 'krishna-decor.json')

  let existingData = { users: [], projects: [] }
  if (existsSync(destination)) {
    try {
      const parsed = JSON.parse(readFileSync(destination, 'utf8'))
      if (parsed && typeof parsed === 'object') {
        existingData = {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          projects: Array.isArray(parsed.projects) ? parsed.projects : []
        }
      }
    } catch {}
  }

  // Load template users if available
  let templateUsers = [...BASELINE_USERS]
  const localTemplate = resolve(__dirname, '../../api/data/krishna-decor.json')
  const packagedTemplate = join(process.resourcesPath || '', 'api', 'data', 'krishna-decor.json')
  const templateFile = existsSync(localTemplate) ? localTemplate : (existsSync(packagedTemplate) ? packagedTemplate : null)
  if (templateFile) {
    try {
      const tmpl = JSON.parse(readFileSync(templateFile, 'utf8'))
      if (Array.isArray(tmpl.users) && tmpl.users.length > 0) templateUsers = tmpl.users
    } catch {}
  }

  // Preserve users: NEVER allow a backup save to overwrite or strip passwordHash!
  let usersToSave = existingData.users.filter((u) => Boolean(u.passwordHash))
  if (usersToSave.length === 0) {
    usersToSave = [...templateUsers]
  }

  // If existing users had entries without passwordHash, heal them
  for (const existingUser of existingData.users) {
    if (!usersToSave.some((u) => u.id === existingUser.id || u.name?.toLowerCase() === existingUser.name?.toLowerCase())) {
      const match = templateUsers.find((t) => t.id === existingUser.id || t.name?.toLowerCase() === existingUser.name?.toLowerCase() || (t.role === existingUser.role && t.passwordHash))
      usersToSave.push({
        ...existingUser,
        passwordHash: existingUser.passwordHash || match?.passwordHash,
        email: existingUser.email || match?.email
      })
    }
  }

  // Ensure both manager and staff are present with passwordHash
  if (!usersToSave.some((u) => u.role === 'manager' && u.passwordHash)) {
    const mgr = templateUsers.find((t) => t.role === 'manager' && t.passwordHash) || BASELINE_USERS[0]
    usersToSave.unshift(mgr)
  }
  if (!usersToSave.some((u) => u.role === 'staff' && u.passwordHash)) {
    const stf = templateUsers.find((t) => t.role === 'staff' && t.passwordHash) || BASELINE_USERS[1]
    usersToSave.push(stf)
  }

  const projectsToSave = (Array.isArray(payload.projects) && payload.projects.length > 0)
    ? payload.projects
    : existingData.projects

  const dataToSave = {
    users: usersToSave,
    projects: projectsToSave,
    lastBackup: new Date().toISOString()
  }

  writeFileSync(destination, JSON.stringify(dataToSave, null, 2) + '\n', { mode: 0o600 })
  const backupFolder = join(dataFolder, 'backups')
  mkdirSync(backupFolder, { recursive: true })
  const todayStr = new Date().toISOString().slice(0, 10)
  const dailyBackup = join(backupFolder, 'krishna-decor-' + todayStr + '.json')
  writeFileSync(dailyBackup, JSON.stringify(dataToSave, null, 2) + '\n', { mode: 0o600 })
  lastBackupTime = new Date().toISOString()
  return { success: true, path: destination, lastBackupTime }
})

ipcMain.handle('hub:get-backup-status', () => {
  const dataFolder = userDataPath('data')
  const destination = join(dataFolder, 'krishna-decor.json')
  return {
    hasBackup: existsSync(destination),
    lastBackupTime,
    dataFolder
  }
})

app.whenReady().then(async () => {
  try {
    await startHub()
  } catch (error) {
    tunnelLog = 'The optional local backup hub could not start: ' + error.message + '\nThe cloud workspace remains available.\n'
  }
  const config = readConfig()
  app.setLoginItemSettings({ openAtLogin: config.startAtLogin !== false })
  installMenu()
  createTray()
  createMainWindow()
  if (tunnelToken(config)) startTunnel()
})

app.on('window-all-closed', () => {
  if (quitting) app.quit()
})

app.on('before-quit', async () => {
  quitting = true
  stopTunnel()
  if (apiServer) await new Promise((resolveClose) => apiServer.close(resolveClose))
})
