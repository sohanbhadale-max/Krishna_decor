const API_SETTING_KEY = 'krishna-decor-staff-api-url'
const builtApiUrl = String(import.meta.env.VITE_API_URL || '').trim()

function isLocalHost(hostname) {
  return ['localhost', '127.0.0.1'].includes(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)
}

function normalise(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Enter a complete sync address, for example http://192.168.29.18:8788/api.')
  }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('The sync address must use http or https.')
  const hostIsLocal = isLocalHost(url.hostname)
  if (url.protocol !== 'https:' && !hostIsLocal) throw new Error('Use an HTTPS address for a remote Windows hub or an HTTP address on local Wi-Fi.')
  const base = url.toString().replace(/\/$/, '')
  return base.endsWith('/api') ? base : base + '/api'
}

const DEFAULT_CLOUD_API_URL = 'https://krishna-decor-api.onrender.com/api'
const DEFAULT_LAN_API_URL = 'http://192.168.29.18:8788/api'
const DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:8788/api'

export function apiBase() {
  if (builtApiUrl) return normalise(builtApiUrl)
  const stored = localStorage.getItem(API_SETTING_KEY)
  if (stored) {
    return normalise(stored)
  }
  return DEFAULT_CLOUD_API_URL
}

export function isApiConfigured() {
  return Boolean(apiBase())
}

export function canConfigureApiBase() {
  return !builtApiUrl
}

export function setApiBase(value) {
  const base = normalise(value)
  localStorage.setItem(API_SETTING_KEY, base)
  return base
}

export function clearApiBase() {
  if (!builtApiUrl) localStorage.removeItem(API_SETTING_KEY)
}

export function apiUrl(path) {
  const base = apiBase()
  if (!base) throw new Error('The Krishna Decor sync address is not configured.')
  return base + path
}
